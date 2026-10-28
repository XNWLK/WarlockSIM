// Trinket effects (round 166, user: "implement trinkets … the functionality of all the trinkets that people can use in the
// gear planner … check they are equipped in the gear planner as well as add use conditions for it"). [A105]
// Keyed by game item id; the values are the Forever tooltips (Wowhead Forever, collected 2026-10-28 by
// tools/items-collect.js, research/raw/forever-items.json → items[].tt). Only effects that change a Warlock's damage or mana
// are here; a trinket's plain "Equip:" stats (spell power, hit, crit, MP5 …) are its item stats and count as always.
// The fight engine uses the trinkets in the gear builder's two trinket slots (while the gear builder is on).
//   use: an effect you press — { kind, cd (s), duration (s), … } kinds:
//     'sp'      + sp spell power for duration (school: only that school's spells; pierce: also lowers the target's
//               resistances by that much, like Spell Penetration)
//     'spDecay' + sp spell power, minus `per` after each of your damaging casts
//     'spStack' + `per` spell power for each damaging cast since it was used (stacks up to `max`); ends after `casts` casts
//     'crit'    + pct spell crit (tree: only that talent tree's spells; endsOnCrit: ends after a direct crit)
//     'petDmg'  your demon deals pct % more
//     'spi'     + spi Spirit for duration (more mana from Life Tap)
//     'mana'    + amount mana, used when that much is missing
//     'dmg'     a hit of min…max (school) — no spell power, your spell hit and crit (×1.5), Curse of the Elements
//     'dmgAfter' a hit of min…max after `casts` landed damaging casts
//   proc: an effect that triggers by itself — { kind: 'spi', chancePct (per damaging cast), spi, duration }
window.WL = window.WL || {};

WL.TRINKET_FX = {
  18820:  { name: 'Talisman of Ephemeral Power',        use: { kind: 'sp', sp: 175, duration: 15, cd: 90 } },
  23046:  { name: 'The Restrained Essence of Sapphiron', use: { kind: 'sp', sp: 130, duration: 20, cd: 120 } },   // + 40 spell power always (item stats)
  21473:  { name: 'Eye of Moam',                        use: { kind: 'sp', sp: 50, pierce: 100, duration: 30, cd: 180 } },
  249469: { name: 'Frozen Heart of the Mountain',       use: { kind: 'sp', sp: 29, school: 'shadow', duration: 15, cd: 300 } },   // "doubled in Snowy areas": not counted
  19950:  { name: 'Zandalarian Hero Charm',             use: { kind: 'spDecay', sp: 204, per: 17, duration: 20, cd: 120 } },
  22678:  { name: 'Talisman of Ascendance',             use: { kind: 'spStack', per: 40, max: 5, casts: 6, duration: 20, cd: 60 } },
  19957:  { name: "Hazza'rah's Charm of Destruction",   use: { kind: 'crit', pct: 10, tree: 'destruction', duration: 20, cd: 180 } },
  272438: { name: 'Weakness Analyzer',                  use: { kind: 'crit', pct: 5, endsOnCrit: true, duration: 20, cd: 90 } },   // + 22 spell power always
  19337:  { name: 'The Black Book',                     use: { kind: 'petDmg', pct: 100, duration: 30, cd: 300 } },
  272439: { name: 'Serenity Field',                     use: { kind: 'spi', spi: 72, duration: 15, cd: 90 } },
  23027:  { name: 'Warmth of Forgiveness',              use: { kind: 'mana', amount: 500, cd: 180 } },
  20525:  { name: 'Earthen Sigil',                      use: { kind: 'mana', amount: 400, cd: 180 } },   // "over 10 sec": counted at once
  21891:  { name: 'Shard of the Fallen Star',           use: { kind: 'dmg', min: 400, max: 442, school: 'fire', cd: 180 } },
  13171:  { name: "Smokey's Lighter",                   use: { kind: 'dmg', min: 210, max: 210, school: 'fire', cd: 90 } },
  744:    { name: "Thunderbrew's Boot Flask",           use: { kind: 'dmg', min: 375, max: 375, school: 'fire', cd: 300 } },   // 75 every 1 s for 5 s, counted as one hit
  10587:  { name: 'Goblin Bomb Dispenser',              use: { kind: 'dmg', min: 315, max: 385, school: 'fire', cd: 600 } },
  219345: { name: 'Infernal Lasso',                     use: { kind: 'dmg', min: 504, max: 504, school: 'fire', cd: 300 } },   // 504 over 12 s, counted as one hit
  274760: { name: 'Everlook Delivery Bot',              use: { kind: 'dmgAfter', min: 467, max: 467, school: 'fire', casts: 7, cd: 300 } },   // "after 6 to 8 spells": 7
  19288:  { name: 'Darkmoon Card: Blue Dragon',         proc: { kind: 'spi', chancePct: 2, spi: 150, duration: 15 } },
};
// Not here (no effect on a Warlock's damage in the sim): Mark of the Champion (only against Demons / Undead), threat,
// defence, resistance, movement and utility trinkets, pets of their own (dragonlings, Vanquished Tentacle).

// The trinkets in the gear builder's trinket slots that have an effect here: [{ slot, id, fx }].
WL.equippedTrinkets = function (cfg) {
  var gb = cfg && cfg.gearBuilder; if (!gb || !gb.on || !gb.slots) return [];
  return ['trinket1', 'trinket2'].map(function (slot) {
    var e = gb.slots[slot], id = e && (e.id != null ? e.id : e.custom && e.custom.id);
    return id != null && WL.TRINKET_FX[id] ? { slot: slot, id: +id, fx: WL.TRINKET_FX[id] } : null;
  }).filter(Boolean);
};
// A rough spell-power worth of a use effect (its spell power × the part of the time it is up), for sorting the item list.
WL.trinketSpWorth = function (fx) {
  var u = fx && fx.use; if (!u || !u.cd) return 0;
  if (u.kind === 'sp') return u.sp * u.duration / u.cd;
  if (u.kind === 'spDecay') return (u.sp - u.per * 4) * u.duration / u.cd;          // about 8 casts in 20 s
  if (u.kind === 'spStack') return u.per * 2.5 * 8 / u.cd;
  return 0;
};
