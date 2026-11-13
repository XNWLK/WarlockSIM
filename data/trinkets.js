// Trinket effects (round 166, user: "implement trinkets … the functionality of all the trinkets that people can use in the
// gear planner … check they are equipped in the gear planner as well as add use conditions for it"). [A105]
// Round 209 (user: "do 1 to 20 and put them in the gear builder"): 20 more, plus the boss type and zone they depend on. [A113]
// Keyed by game item id; the values are the Forever tooltips (Wowhead Forever, research/raw/forever-items.json →
// items[].tt) and their spell data. Only effects that change a Warlock's damage or mana are here; a trinket's plain
// "Equip:" stats (spell power, hit, crit, MP5 …) are its item stats and count always.
// The fight engine uses the trinkets in the gear builder's two trinket slots (while the gear builder is on).
//   use: an effect you press — { kind, cd (s), duration (s), … } kinds:
//     'sp'      + sp spell power for duration (school: only that school's spells; pierce: also lowers the target's
//               resistances by that much, like Spell Penetration)
//     'spDecay' + sp spell power, minus `per` after each of your damaging casts
//     'spStack' + `per` spell power for each damaging cast since it was used (stacks up to `max`); ends after `casts` casts
//     'crit'    + pct spell crit (tree: only that talent tree's spells; endsOnCrit: ends after a direct crit)
//     'hit'     + pct spell hit (up to the hit cap)
//     'petDmg'  your demon deals pct % more
//     'spi'     + spi Spirit for duration (more mana from Life Tap)
//     'stats'   + stat to every attribute for duration (Intellect → crit, Spirit → Life Tap)
//     'mana'    + amount mana, used when that much is missing (int: also − that much Intellect for intDuration s)
//     'costRed' your spells cost `amount` less mana for duration
//     'dmg'     a hit of min…max (school) — no spell power, your spell hit and crit (×1.5), Curse of the Elements on
//               Shadow / Fire / Arcane / Frost
//     'dmgOver' `shots` such hits, one every `every` s (a summoned helper)
//     'dmgAfter' a hit of min…max after `casts` landed damaging casts
//   proc: an effect that triggers by itself — { kind, chancePct, … }:
//     'spi' / 'sp'  + spi Spirit / + sp spell power for duration; chancePct per landed damaging cast (icd: not again for that long)
//     'dmg'     a hit of min…max (as 'dmg' above); per landed damaging cast, or onDamage: per damage event of yours (hits
//               and ticks) with an internal cooldown `icd`; selfPct: that share of the procs hits you instead
//   equip: always on while worn, when its condition holds — { sp, spellPen, mp5, petMp5 (pet: only that demon) }
//   stats: the trinket's own item stats, for the gear builder, where Wowhead's list counts a zone bonus always.
//   Conditions (round 209): vs { bossType: × } (fight.bossType, or the creature type it belongs to), zones { zone: × }
//   (fight.zone); on use / proc effects they multiply the amount, on equip effects the effect only counts there.
window.WL = window.WL || {};

// Boss types (round 209, user: "a boss type (dragonkin/human/etc) picker"): the creature types, then every kind of enemy
// that a trinket names. A kind counts as its creature type too (`is`). [A113]
WL.BOSS_TYPES = [
  { key: '', name: 'Not set' },
  { key: 'beast', name: 'Beast' }, { key: 'demon', name: 'Demon' }, { key: 'dragonkin', name: 'Dragonkin' },
  { key: 'elemental', name: 'Elemental' }, { key: 'giant', name: 'Giant' }, { key: 'humanoid', name: 'Humanoid' },
  { key: 'mechanical', name: 'Mechanical' }, { key: 'undead', name: 'Undead' },
  { key: 'dinosaur', name: 'Dinosaur', is: 'beast' }, { key: 'dwarf', name: 'Dwarf', is: 'humanoid' },
  { key: 'furbolg', name: 'Furbolg', is: 'humanoid' }, { key: 'gnome', name: 'Gnome', is: 'humanoid' },
  { key: 'murloc', name: 'Murloc', is: 'humanoid' }, { key: 'naga', name: 'Naga', is: 'humanoid' },
  { key: 'ogre', name: 'Ogre', is: 'humanoid' }, { key: 'orc', name: 'Orc', is: 'humanoid' },
  { key: 'plant', name: 'Plant' }, { key: 'qiraji', name: 'Qiraji' }, { key: 'satyr', name: 'Satyr', is: 'demon' },
  { key: 'silithid', name: 'Silithid' }, { key: 'swine', name: 'Swine' }, { key: 'troll', name: 'Troll', is: 'humanoid' },
  { key: 'worgen', name: 'Worgen', is: 'humanoid' },
];
// Zones (round 209): every kind of area a trinket names ("This effect is doubled in … areas").
WL.ZONE_TYPES = [
  { key: '', name: 'Not set' },
  { key: 'forest', name: 'Forest / Grassland' }, { key: 'marsh', name: 'Marsh / Swamp' }, { key: 'mountain', name: 'Mountainous' },
  { key: 'snowy', name: 'Snowy' }, { key: 'volcanic', name: 'Volcanic' }, { key: 'desert', name: 'Desert' },
  { key: 'wasteland', name: 'Wasteland' }, { key: 'haunted', name: 'Haunted' }, { key: 'city', name: 'Stronghold / City' },
];
// Is the boss of this type (its own key, or the creature type it belongs to)?
WL.bossIs = function (cfg, type) {
  var k = cfg && cfg.fight && cfg.fight.bossType; if (!k) return false;
  if (k === type) return true;
  var b = WL.BOSS_TYPES.filter(function (x) { return x.key === k; })[0];
  return !!(b && b.is === type);
};
// The multiplier of an effect's vs / zones conditions in this fight (1 = none apply).
WL.fxMult = function (cfg, o) {
  var m = 1, z = cfg && cfg.fight && cfg.fight.zone;
  if (o && o.vs) Object.keys(o.vs).forEach(function (k) { if (WL.bossIs(cfg, k)) m = Math.max(m, o.vs[k]); });
  if (o && o.zones && z && o.zones[z] != null) m *= o.zones[z];
  return m;
};
// Does an equip effect's condition hold (no condition = always)?
WL.fxHolds = function (cfg, o) {
  var z = cfg && cfg.fight && cfg.fight.zone;
  if (o.vs && !Object.keys(o.vs).some(function (k) { return WL.bossIs(cfg, k); })) return false;
  if (o.zones && !(z && o.zones[z])) return false;
  return true;
};

WL.TRINKET_FX = {
  18820:  { name: 'Talisman of Ephemeral Power',        use: { kind: 'sp', sp: 175, duration: 15, cd: 90 } },
  23046:  { name: 'The Restrained Essence of Sapphiron', use: { kind: 'sp', sp: 130, duration: 20, cd: 120 } },   // + 40 spell power always (item stats)
  21473:  { name: 'Eye of Moam',                        use: { kind: 'sp', sp: 50, pierce: 100, duration: 30, cd: 180 } },
  249469: { name: 'Frozen Heart of the Mountain',       use: { kind: 'sp', sp: 29, school: 'shadow', duration: 15, cd: 300, zones: { snowy: 2 } } },   // round 209: doubled in Snowy areas
  19950:  { name: 'Zandalarian Hero Charm',             use: { kind: 'spDecay', sp: 204, per: 17, duration: 20, cd: 120 } },
  22678:  { name: 'Talisman of Ascendance',             use: { kind: 'spStack', per: 40, max: 5, casts: 6, duration: 20, cd: 60 } },
  19957:  { name: "Hazza'rah's Charm of Destruction",   use: { kind: 'crit', pct: 10, tree: 'destruction', duration: 20, cd: 180 } },
  272438: { name: 'Weakness Analyzer',                  use: { kind: 'crit', pct: 5, endsOnCrit: true, duration: 20, cd: 90 } },   // + 22 spell power always
  19337:  { name: 'The Black Book',                     use: { kind: 'petDmg', pct: 100, duration: 30, cd: 300 } },
  272439: { name: 'Serenity Field',                     use: { kind: 'spi', spi: 72, duration: 15, cd: 90 } },
  23027:  { name: 'Warmth of Forgiveness',              use: { kind: 'mana', amount: 500, cd: 180 } },
  20525:  { name: 'Earthen Sigil',                      use: { kind: 'mana', amount: 400, cd: 180 } },   // "over 10 sec": counted at once
  21891:  { name: 'Shard of the Fallen Star',           use: { kind: 'dmg', min: 400, max: 442, school: 'fire', cd: 180 } },
  13171:  { name: "Smokey's Lighter",                   use: { kind: 'dmg', min: 210, max: 210, school: 'fire', cd: 90, vs: { plant: 2 } } },
  744:    { name: "Thunderbrew's Boot Flask",           use: { kind: 'dmg', min: 375, max: 375, school: 'fire', cd: 300, vs: { plant: 2 } } },   // 75 every 1 s for 5 s, counted as one hit
  10587:  { name: 'Goblin Bomb Dispenser',              use: { kind: 'dmg', min: 315, max: 385, school: 'fire', cd: 600 } },
  219345: { name: 'Infernal Lasso',                     use: { kind: 'dmg', min: 504, max: 504, school: 'fire', cd: 300 } },   // 504 over 12 s, counted as one hit
  274760: { name: 'Everlook Delivery Bot',              use: { kind: 'dmgAfter', min: 467, max: 467, school: 'fire', casts: 7, cd: 300, castsZones: { snowy: 0.5 } } },   // "after 6 to 8 spells": 7; halved in Snowy areas: 3 or 4
  19288:  { name: 'Darkmoon Card: Blue Dragon',         proc: { kind: 'spi', chancePct: 2, spi: 150, duration: 15 } },
  // Round 209 (user picked 1–20 of the list):
  13968:  { name: 'Eye of the Beast',                   use: { kind: 'hit', pct: 7, duration: 20, cd: 300 } },   // + 1% spell crit always
  274615: { name: 'Heart of the Primeval',              use: { kind: 'sp', sp: 19, duration: 30, cd: 360 } },
  13382:  { name: 'Cannonball Runner',                  use: { kind: 'dmgOver', min: 85, max: 139, school: 'holy', shots: 10, every: 1, cd: 300, vs: { undead: 2 } } },   // a cannon for 10 s, Cannon Fire = 1 s cast [A113]
  10577:  { name: 'Goblin Mortar',                      use: { kind: 'dmg', min: 393, max: 531, school: 'fire', cd: 600 } },
  260802: { name: 'EZ-Thro Bronze Mortar',              use: { kind: 'dmg', min: 85, max: 115, school: 'fire', cd: 600 } },
  22268:  { name: 'Draconic Infused Emblem',            proc: { kind: 'sp', chancePct: 100, icd: 60, sp: 35, duration: 10, vs: { dragonkin: 2 } } },   // Wowhead: proc chance 100% per harmful cast; 60 s internal cooldown (user) [A113]
  280032: { name: "Bolt's Charged Eyeball",             proc: { kind: 'dmg', onDamage: true, chancePct: 15, icd: 3, min: 60, max: 60, school: 'nature', selfPct: 50, vs: { dinosaur: 3 } } },   // "to you or your current target": half each [A113]
  273840: { name: 'Cursed Murloc Eye',                  proc: { kind: 'dmg', chancePct: 100, min: 2, max: 2, school: 'shadow', vs: { murloc: 4 } } },
  18371:  { name: 'Mindtap Talisman',                   use: { kind: 'mana', amount: 1250, int: 60, intDuration: 120, cd: 420 } },   // "over 10 sec": counted at once
  11832:  { name: 'Burst of Knowledge',                 use: { kind: 'costRed', amount: 150, duration: 10, cd: 360 } },
  11819:  { name: 'Second Wind',                        use: { kind: 'mana', amount: 630, cd: 900, zones: { mountain: 2 } } },   // 63 every 1 s for 10 s, counted at once
  270226: { name: 'Golden Banana',                      use: { kind: 'stats', stat: 16, duration: 15, cd: 300, zones: { forest: 2 }, durZones: { forest: 2 } } },
  18354:  { name: "Pimgib's Collar",                    equip: { petMp5: 9, pet: 'imp' } },   // + 14 Fire spell power always
  23207:  { name: 'Mark of the Champion',               equip: { sp: 85, vs: { demon: 1, undead: 1 } } },
  19812:  { name: 'Rune of the Dawn',                   equip: { sp: 46, vs: { undead: 1 } } },
  18467:  { name: "Royal Seal of Eldre'Thalas",         equip: { sp: 18, vs: { demon: 1 } } },   // + 18 spell power always
  12930:  { name: 'Briarwood Reed',                     equip: { sp: 15, zones: { marsh: 1 } }, stats: { sp: 15 } },
  270225: { name: 'Jewel of the Guard Captain',         equip: { sp: 16, zones: { forest: 1 } }, stats: { sp: 8, critPct: 0.5 } },
  270276: { name: 'Cleansed Vilebranch Icon',           equip: { sp: 16, zones: { forest: 1 } }, stats: { sp: 8, critPct: 0.5 } },
  21565:  { name: 'Rune of Perfection',                 equip: { spellPen: 7, zones: { forest: 1 } }, stats: { spellPen: 3, sta: 8 } },
  21566:  { name: 'Rune of Perfection',                 equip: { spellPen: 4, zones: { forest: 1 } }, stats: { spellPen: 2, sta: 4 } },
  271903: { name: 'Enriched Seal',                      equip: { mp5: 10, zones: { forest: 1 } }, stats: { mp5: 5, sta: 10 } },
  271905: { name: 'Enriched Seal',                      equip: { mp5: 6, zones: { forest: 1 } }, stats: { mp5: 3, sta: 7 } },
  272061: { name: 'Darkspear Voodoo Seal',              equip: { mp5: 10, zones: { forest: 1 } }, stats: { mp5: 5, sta: 10 } },
  272059: { name: 'Darkspear Voodoo Seal',              equip: { mp5: 6, zones: { forest: 1 } }, stats: { mp5: 3, sta: 7 } },
};
// Not here (no effect on a Warlock's damage in the sim): threat, defence, resistance, movement and utility trinkets, pets of
// their own (dragonlings, Vanquished Tentacle), melee-range or cone effects (Goblin Dragon Gun, Chained Essence of
// Eranikus), random ones (Six Demon Bag, Gnomish Death Ray).
// The worn trinkets' equip effects that hold in this fight: [{ name, sp, spellPen, mp5, petMp5, pet }].
WL.trinketEquipFx = function (cfg) {
  return WL.equippedTrinkets(cfg).filter(function (x) { return x.fx.equip && WL.fxHolds(cfg, x.fx.equip); })
    .map(function (x) { var e = x.fx.equip; return { name: x.fx.name, sp: e.sp || 0, spellPen: e.spellPen || 0, mp5: e.mp5 || 0, petMp5: e.petMp5 || 0, pet: e.pet || null }; });
};

// Weapon enchants with an effect of their own (round 166, user: "start implementing enchants as well (like revelation)"). [A106]
// Keyed by enchant id (WL.ENCHANTS); Wowhead Forever spell data, 2026-10-28. proc kinds:
//   'sp'     + sp spell power (and + mana) for duration — chancePct per landed damaging cast ('Aura proc chance')
//   'spiPct' Spirit × (1 + pct %) for duration — chancePct per landed damaging cast
//   'crit'   Revelation: a non-periodic spell that does not crit triggers it at chancePct × (1 − your crit %), the next
//            non-periodic spell gets + pct % crit (within duration). The real chance is a server-side script (unknown):
//            combat.revelationChancePct is a guess.
WL.ENCHANT_FX = {
  // about: its rough worth in spell power for sorting the list (measured on Demo Pact Shadow Bolt Succubus, default settings).
  7942: { name: 'Grand Sorcerer', about: 44, proc: { kind: 'sp', chancePct: 7, sp: 70, mana: 400, duration: 20 } },          // 1231163 → 1231162 Righteous Blasting
  7941: { name: 'Grand Arcanist', about: 73, proc: { kind: 'sp', chancePct: 7, sp: 140, mana: 400, duration: 20 } },         // 1231152 → 1231138 Righteous Fire (two-handed)
  8216: { name: 'Insight',        about: 30, proc: { kind: 'spiPct', chancePct: 35, pct: 100, duration: 10 } },              // 1248758 → 1299796
  8217: { name: 'Revelation',     about: 33, proc: { kind: 'crit', pct: 100, duration: 15 } },                               // 1248806 → 1248808 (+100% crit, 15 s)
};
// The weapon enchant of the gear builder with an effect here: [{ slot, id, fx }] (main hand; only while the builder is on).
WL.equippedEnchantFx = function (cfg) {
  var gb = cfg && cfg.gearBuilder; if (!gb || !gb.on || !gb.enchants) return [];
  return ['mainHand'].map(function (slot) {
    var e = gb.enchants[slot], id = e && e.id;
    return id != null && WL.ENCHANT_FX[id] && gb.slots && gb.slots[slot] ? { slot: slot, id: +id, fx: WL.ENCHANT_FX[id] } : null;
  }).filter(Boolean);
};

// The trinkets in the gear builder's trinket slots that have an effect here: [{ slot, id, fx }].
WL.equippedTrinkets = function (cfg) {
  var gb = cfg && cfg.gearBuilder; if (!gb || !gb.on || !gb.slots) return [];
  return ['trinket1', 'trinket2'].map(function (slot) {
    var e = gb.slots[slot], id = e && (e.id != null ? e.id : e.custom && e.custom.id);
    return id != null && WL.TRINKET_FX[id] ? { slot: slot, id: +id, fx: WL.TRINKET_FX[id] } : null;
  }).filter(Boolean);
};
// A rough spell-power worth of an effect (its spell power × the part of the time it is up), for sorting the item list.
// Round 209: with the fight's boss type and zone (cfg), an equip effect that holds counts in full, a proc of 100% too.
WL.trinketSpWorth = function (fx, cfg) {
  if (fx && fx.equip) return fx.equip.sp && WL.fxHolds(cfg, fx.equip) ? fx.equip.sp : 0;
  var p = fx && fx.proc; if (p && p.kind === 'sp') return p.sp * WL.fxMult(cfg, p) * (p.icd ? Math.min(1, p.duration / p.icd) : Math.min(1, p.chancePct / 100 * 4));   // about 4 casts per 10 s; with an internal cooldown: up duration / icd
  var u = fx && fx.use; if (!u || !u.cd) return 0;
  if (u.kind === 'sp') return u.sp * WL.fxMult(cfg, u) * u.duration / u.cd;
  if (u.kind === 'spDecay') return (u.sp - u.per * 4) * u.duration / u.cd;          // about 8 casts in 20 s
  if (u.kind === 'spStack') return u.per * 2.5 * 8 / u.cd;
  return 0;
};
