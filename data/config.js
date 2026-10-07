// Global simulation settings. Every value tagged [Axx] is documented in docs/02_ASSUMPTIONS.md.
// Change values here (or in the UI) — the engine reads everything from this object.
window.WL = window.WL || {};

WL.DEFAULT_CONFIG = {
  fight: {
    duration: 120,          // seconds (180 until round 82, user)
    durationVarPct: 10,     // each fight lasts duration ± up to 10% (uniform, seeded) - removes exact-length artifacts [A56]
    iterations: 1000,       // fights per build/race (user: 1000)
    weightIterations: 1000, // fights per stat-weight run
    seed: 12345,            // RNG seed (same seed = reproducible results)
    executePct: 35,         // Decimation threshold [A23]; target HP falls linearly [A24]
    // Encounter options (W11, A60): all off by default = one stationary target, no reaction delay.
    latencyMs: 0,           // reaction delay after each of your casts / GCDs
    travelMs: 0,            // travel time of projectiles (Shadow Bolt, Soul Fire, Incinerate, Death Coil, Firebolt); 0 = right in front of the boss (user, round 39) [A65]
    precast: '',            // round 127 (user): a spell with a cast bar that you start before the pull so that it completes as the fight timer starts ('' = none; one of WL.PRECAST_SPELLS) [A87]
    moveEvery: 0,           // every N s ...
    moveDuration: 0,        // ... you move for M s (only instants while moving). 0 = no movement
    hitEvery: 0,            // round 78 (user): you take a direct hit every N s (0 = never) → pushback on casts / channels [A76]
    lifeTapWhileMoving: false, // round 62 (user): Life Tap (instant) when nothing else can be cast because of movement [A71]
    targets: 1,             // 2-3 targets: Bane of Havoc (talent) on target 2 copies 15% of your damage to it
    multiDot: false,        // with 2-3 targets: keep your DoTs on the extra targets too (A61)
    // Healing you receive (round 119, user): healAmount health every healEvery seconds, first at healEvery. Your health pays
    // for Life Tap (430), Hellfire's damage to yourself, the Demonic Rune and the Goblin Sapper. 0 = nobody heals you. [A83]
    healAmount: 1000, healEvery: 10,
  },
  combat: {
    baseHitPct: 83,         // L63 boss: 17% miss [A01] (user-confirmed)
    maxHitPct: 100,         // round 48 (user): Forever removed the permanent 1% miss → 17% usable hit, 100% reachable (was 99 / 16%, Classic & SoD) [A01]
    baseCritPct: 1.7,       // [A03]
    critPerInt: 1 / 60,     // 60 Int = 1% crit (user-confirmed) [A03]
    // Your MELEE crit (round 75, user: it comes from Agility; the Succubus' melee inherits it, Lash of Pain your spell crit):
    // Classic L60 Warlock: 2.0% base + 1% per 20 Agility (round 17 values, A75). Gear crit % is spell crit only.
    meleeCritBasePct: 2.0, agiPerMeleeCrit: 20,
    ratingPerHitPct: 10,    // [A02]
    ratingPerCritPct: 14,   // [A04]
    ratingPerHastePct: 10,  // [A05]
    critMultiplier: 1.5,    // 150% unless a talent says otherwise (user-confirmed) [A06]
    gcd: 1.5,
    minGcd: 1.0,            // [A08]
    manaPerInt: 15,         // [A10]
    bossArmor: 3731,        // typical L63 raid boss armor (Classic); pet melee reduction = armor / (armor + 400 + 85 × 60) [A54]
    // Mana regen per 2 s from Spirit (Classic Warlock formula): 8 + Spirit / 4 [A55]. Used by Innervate and, since round 114,
    // by the 5-second rule: Spirit regeneration only runs while you have spent no mana for fsrSeconds (user, round 114;
    // Life Tap does not restart the 5 s). 0 = no Spirit regeneration in combat (rounds 1–113). [A82]
    spiritRegenBase: 8, spiritRegenPerSpi: 0.25, fsrSeconds: 5,
    // Resistance & Spell Pierce [A43][A44]
    targetResist: { shadow: 0, fire: 0 },   // boss resistance before reductions (rolled as partial resists since round 39)
    // Level-based resistance: +8 per level the boss is above you = +24 vs a level-63 boss. Round 118 (user): it exists in
    // Forever and Curse of the Elements can take it to 0 — so it is on, and counts as part of the resistance the curse
    // reduces (rounds 39–117: off by default, and added after the curse as in Classic). [A43]
    levelResist: { on: true, perLevel: 8, levelDiff: 3 },
    coeResistReduction: 75,                  // Curse of the Elements R4 (cannot go below 0)
    pierceAvgPerPoint: 0.75 / (5 * 60),      // mean vulnerable damage per point of negative resistance (Classic resist formula mirrored)
    vulnerableStepPct: 10,                   // vulnerable damage comes in 10% steps (user)
    vulnerableSpread: 0.2,                   // triangular spread (±20%) of the step distribution around the mean
    // Pet melee attack table vs a level-63 boss from behind (round 42, user: glancing blows + crit suppression; the pet
    // inherits your hit and crit) [A46]. Classic values for weapon skill 300 vs defense 315: one roll in the order
    // miss → dodge → glancing → crit → hit. Miss 8% minus your hit above the base (gear, Suppression, buffs), of which the
    // first 1% does not count (hit suppression vs +3); dodge 6.5%; glancing 40% of swings at 65% damage (never crit);
    // crit = the pet's own + your MELEE crit (round 75; your spell crit in rounds 32–74) − 4.8% (3% skill gap + 1.8% vs
    // a +3 boss). No parry / block from behind.
    petMelee: { missPct: 8, dodgePct: 6.5, hitSuppressionPct: 1, glancePct: 40, glanceDmgPct: 65, critSuppressionPct: 4.8 },
  },
  // Gear (user, 2026-09-23; round 13: SP 500). Percentages are character-sheet values BEFORE talents, racials and weapon oil. [A35][A42]
  // Int / Spi / Sta / MP5 = Classic pre-raid BiS gear (Wowhead Classic pre-raid BiS list, no-PvP set, items + enchants) [A58].
  gear: {
    name: '500 SP / 5% hit / 10% crit / Int 148 / Spi 54 / Sta 160 / MP5 0',
    sp: 500, shadowSp: 0, fireSp: 0,
    hitPct: 5,              // from gear
    critPct: 10,            // spell crit on the character sheet (user round 6: 10% = realistic starter gear)
    critIncludesAll: false, // user (round 4): critPct is the sheet BEFORE talents/racials/oil, so Malevolence, Sword Spec and Firestone are valued
    hastePct: 0,
    pierce: 0,              // Spell Pierce (new stat) [A44]
    // Round 37 (user): Int 148 / Spirit 54 (was 48 / 4 = Classic pre-raid BiS item sums, round 13).
    // Round 39 (user): Stamina 160 (was 92), MP5 0 (was 4).
    agi: 0,                 // Agility from gear (round 75): only feeds your melee crit, which the Succubus' melee inherits [A75]
    int: 148, spi: 54, sta: 160, mp5: 0,  // gear only (race base is added by the engine); Int drives mana, Spirit drives Life Tap [A58]
    weaponIsSword: true,    // [A30] Human Sword Specialization
  },
  // Added on top of gear by the stat-weight runs (normally all 0).
  // Gear in Forever lists percentages (e.g. 1.2% hit), not ratings, so weights are measured per 1%.
  extra: { sp: 0, hitPct: 0, critPct: 0, hastePct: 0, int: 0, pierce: 0 },
  weightDeltas: { sp: 100, hitPct: 2, critPct: 2, hastePct: 2, int: 120, pierce: 20 },   // weights = DPS per 1 SP, per 1% hit/crit/haste, per 1 Int, per 1 Spell Pierce
  // Raid buffs from other classes (values from the Forever tooltips in the archived Wowhead data). Round 60 (user): Arcane
  // Intellect, Mark of the Wild, Fortitude, Divine Spirit, Kings, Wisdom and Moonkin aura on by default; the rest off [A38].
  // Personal in Forever and therefore NOT available to us: Shadow Weaving, Improved Scorch, Winter's Chill,
  // Stormstrike, another Warlock's Improved Shadow Bolt (tooltips say "damage YOU deal" / "from YOUR attacks"). [A53]
  buffs: {
    arcaneIntellect:  { on: true, id: 10157, name: 'Arcane Intellect / Brilliance', cls: 'Mage',    desc: '+31 Intellect', int: 31 },
    markOfTheWild:    { on: true, id: 9885, name: 'Mark / Gift of the Wild',       cls: 'Druid',   desc: '+16 all attributes', int: 16, spi: 16, sta: 16, agi: 16 },
    fortitude:        { on: true, id: 10938, name: 'Power Word: Fortitude',         cls: 'Priest',  desc: '+70 Stamina (Touch of the Grave)', sta: 70 },
    divineSpirit:     { on: true, id: 27841, name: 'Divine Spirit / Prayer of Spirit', cls: 'Priest', desc: '+40 Spirit (Life Tap)', spi: 40 },
    blessingOfKings:  { on: true, id: 20217, name: 'Blessing of Kings',             cls: 'Paladin', desc: '+10% total stats', statPct: 10 },
    // Round 78 (user): pushback protection for the whole party; adds to Intensity / Fel Concentration, at most 100%.
    // Classic value (Concentration Aura, all ranks 35%), not checked in Forever [A76].
    concentrationAura: { on: false, id: 19746, name: 'Concentration Aura',          cls: 'Paladin', desc: '35% chance to ignore pushback from damage', pushbackResistPct: 35 },
    blessingOfWisdom: { on: true, id: 25290, name: 'Blessing of Wisdom',            cls: 'Paladin', desc: '40 mana every 5 s', mp5: 40 },
    manaSpring:       { on: false, id: 10497, name: 'Mana Spring Totem',             cls: 'Shaman',  desc: '10 mana every 2 s (25 MP5)', mp5: 25 },
    restorativeTotems:{ on: false, id: 16187, name: 'Restorative Totems (on Mana Spring)', cls: 'Shaman', desc: 'Mana Spring +25%', mp5: 6.25, requires: 'manaSpring' },
    // Round 75 (user): Agility for your melee crit (the Succubus' melee inherits it). [A75] Round 125 (user): Grace of Air Totem
    // gives 89 Agility — the archived Forever tooltip of Rank 3 (25359); it was 77, the Classic value. The scroll: Classic value.
    // Round 118 (user): Grace of Air and the Scroll of Agility do not stack — same `group`, only the bigger one counts.
    // Round 124 (user): Windfury Totem works for pets with a melee attack; it and Grace of Air are the same totem type in
    // Forever and do not stack (they did in Classic) — same `excl`: only the first listed one that is on counts, and the page
    // unticks the other. 20% / 246 attack power = Rank 3 in the archived Forever tooltip (Classic: 315). [A85]
    // Round 125 (user): Tranquil Air Totem is that totem type too — it stacks with neither Windfury nor Grace of Air.
    windfuryTotem:    { on: false, id: 10614, name: 'Windfury Totem',                cls: 'Shaman',  desc: 'Pet melee: 20% chance per hit of 1 extra attack with 246 extra attack power (not with Grace of Air or Tranquil Air Totem)', windfury: { procPct: 20, ap: 246 }, excl: 'airTotem' },
    // Round 128 (user): pets with a melee attack also benefit from Flametongue Totem, and it stacks with Windfury Totem. Rank 4
    // (16387), Forever tooltip: "Each main hand hit causes (1363 / 77 − 1) to (1363 / 25) additional Fire damage, based on the
    // speed of the weapon" = 1363 × attack speed / 100 (77 and 25 are 100 / 1.3 s and 100 / 4.0 s): 27.3 for a 2.0 s swing.
    // The triggered spell (16368 Flametongue Attack) has no spell power part. [A88] Both totem descriptions are kept short:
    // with longer ones the Buffs tab scrolls again at window widths around 1100 px (measured in round 128).
    flametongueTotem: { on: false, id: 16387, name: 'Flametongue Totem',             cls: 'Shaman',  desc: '+27 Fire damage per pet melee hit', flametongue: { per100: 1363 } },
    graceOfAir:       { on: false, id: 25359, name: 'Grace of Air Totem',            cls: 'Shaman',  desc: '+89 Agility (melee crit for the Succubus; does not stack with Windfury Totem, Tranquil Air Totem or the Scroll of Agility)', agi: 89, group: 'agility', excl: 'airTotem' },
    manaTide:         { on: false, id: 17359, name: 'Mana Tide Totem',               cls: 'Shaman',  desc: '290 mana every 3 s for 12 s, once, when you drop below 50% mana', tide: { amount: 290, every: 3, ticks: 4 } },
    innervate:        { on: false, id: 29166, name: 'Innervate',                     cls: 'Druid',   desc: '5× mana regen while casting for 20 s, once, when you drop below 50% mana', innervate: { mult: 5, duration: 20 } },
    moonkinAura:      { on: true, id: 24858, name: 'Moonkin Form aura',             cls: 'Druid',   desc: '+3% crit (party)', critPct: 3 },
    scrollOfAgility:  { on: true, id: 12174, name: 'Scroll of Agility IV',                  cls: 'Scroll',  desc: '+17 Agility (melee crit for the Succubus; does not stack with Grace of Air)', agi: 17, group: 'agility' },
    // Threat reduction (round 119, user). Classic values — neither tooltip is in the archived Forever data [A84].
    // Round 125 (user): the two do not stack — same `group`, only the bigger reduction counts.
    blessingOfSalvation: { on: false, id: 1038, name: 'Blessing of Salvation',       cls: 'Paladin', desc: '−30% threat (does not stack with Tranquil Air Totem)', threatPct: 30, group: 'threat' },
    tranquilAir:      { on: false, id: 25908, name: 'Tranquil Air Totem',            cls: 'Shaman',  desc: '−20% threat (does not stack with Blessing of Salvation, Windfury Totem or Grace of Air Totem)', threatPct: 20, group: 'threat', excl: 'airTotem' },
    powerInfusion:    { on: false, id: 10060, name: 'Power Infusion',                cls: 'Priest',  desc: '+20% spell damage for 15 s (3 min cooldown); cast on you when you pop your cooldowns', spellDmgPct: 20, duration: 15, cd: 180 },
  },
  // Consumables (data/consumables.js, loaded before this file). Only the per-build weapon oil is on by default. [A57]
  consumables: JSON.parse(JSON.stringify(WL.CONSUMABLES || {})),
  // Professions with a DPS effect in the sim (W14, A59). Only Engineering has one (explosives); researched on Wowhead
  // Forever 2026-09-24: Alchemy, Tailoring, Enchanting, Leatherworking, Blacksmithing, gathering skills have none for a caster.
  professions: { engineering: false },
  // Debuffs on the boss from other players. Armor only matters for Succubus melee. [A54] Round 60 (user): Curse of
  // Recklessness and Judgement of Wisdom on by default (with Sunder Armor and Faerie Fire); another Warlock's CoE stays off.
  // Round 68 (user): Faerie Fire and Curse of Recklessness do not stack in Forever (group 'minor', like Sunder / Expose =
  // 'major'); Curse of Recklessness off by default.
  debuffs: {
    sunderArmor:        { on: true, id: 11597,  name: 'Sunder Armor ×5',             cls: 'Warrior', desc: '−2250 armor (does not stack with Expose Armor)', armor: 2250, group: 'major' },
    exposeArmor:        { on: false, id: 11198, name: 'Expose Armor (5 points)',     cls: 'Rogue',   desc: '−2250 armor (does not stack with Sunder Armor)', armor: 2250, group: 'major' },
    faerieFire:         { on: true, id: 9907,  name: 'Faerie Fire',                 cls: 'Druid',   desc: '−505 armor (does not stack with Curse of Recklessness)', armor: 505, group: 'minor' },
    curseOfRecklessness:{ on: false, id: 11717, name: 'Curse of Recklessness',       cls: 'Warlock', desc: '−505 armor, from another Warlock (does not stack with Faerie Fire)', armor: 505, group: 'minor' },
    coeOther:           { on: false, id: 1311680, name: 'Curse of the Elements (another Warlock)', cls: 'Warlock', desc: 'Up all fight; you skip casting it', coe: true },
    // Judgement of Wisdom R3 (Paladin; Wowhead Forever 20355 / Seal of Wisdom 20357 tooltip, round 38): "attacks and
    // spells used against the judged enemy [have] a chance to restore 59 mana to the attacker" (Give Power 20353 = 60,
    // tooltip 59, A39). The chance is not in the data — 50% (Classic) is a GUESS [A64]. Kept up all fight by the
    // Paladin; procs on your landed spell casts (not DoT/channel ticks) and on your pet's landed attacks (mana to the pet).
    judgementOfWisdom:  { on: true, id: 20355, name: 'Judgement of Wisdom',         cls: 'Paladin', desc: '50% chance per landed spell or pet attack: +59 mana to the attacker', jow: { mana: 59, chancePct: 50 } },
  },
  options: {
    useCurseOfElements: true,  // [A34]
    includePetDamage: true,    // [A26]
    showWithinPct: 0,          // display cut-off: only rows within this % of the best DPS; 0 = all (default since round 66, user; 10 in rounds 17–65).
                               // Display only (changing it never reruns); pinned builds (📌, per browser) stay shown whatever the cut-off.
    // When to pop the short cooldowns for the first time (round 87, user): the racial cooldown (Blood Fury, Berserking,
    // Eureka!), the Spellblasting potion and Power Infusion. 'pull' = right before the first damaging spell (the rule until
    // round 86) · 'doom' = when the first Bane of Doom explodes (right before the cast it falls into; at the pull if the
    // build never casts Doom or Doom cannot explode in this fight) · 'execute' = when the boss drops below executePct.
    // After the first use each one is used again whenever it is ready. [A77]
    activesPolicy: 'doom',
    // 'custom' (round 92, user): a cooldown timeline — per cooldown a list of times (s from the pull) at which you use it:
    // { racial: [..], pi: [..], <consumable key>: [..] } — e.g. majorSpellblasting, majorManaPotion, demonicRune,
    // goblinSapper, denseDynamite (round 93: one list per item, so each keeps its own times; the round 92 slot names
    // potion / rune / sapper / explosive are still read, see WL.activesTimelineOf). A cooldown is held until its next
    // placed time and used at the first chance from then on; after its last placed use it is automatic again. Cooldowns
    // with no placed use behave as usual (buffs: the 'doom' rule; mana items: when the mana is missing; explosives: on
    // cooldown). Only read when activesPolicy is 'custom'. [A77]
    activesTimeline: {},
    // Racial cooldown on the timeline (round 95, user): false = one list of times for every race (slot 'racial');
    // true = each race has its own list (slots 'racial_orc', 'racial_troll', 'racial_gnome').
    activesRacialSplit: false,
    // AQ20 book ranks (round 42, user): Shadow Bolt R10, Immolate R8, Corruption R7 instead of the trainer ranks
    // R9 / R7 / R6. Off by default (the books drop in Ruins of Ahn'Qiraj). See WL.BOOK_RANKS / SPELLVALUES.md.
    bookRanks: false,
    // End-of-fight DoT check (round 53, user; A69): a DoT recast that cannot run its full duration before the boss dies is
    // only cast if the damage it still adds (expected ticks + what it enables) beats the filler in the same time.
    // false = the old rule (recast while at least 2 ticks fit; Bane of Agony with 12 s left).
    dotEndCheck: true,
    // The best build of each tree (at least 25 points in it) is always shown, however far behind, and tagged
    // "best Affliction" / "best Demonology" / "best Destruction" (user: Affliction in round 28, the other two in round 29).
    alwaysShowBestTrees: [
      { tree: 'affliction', minPoints: 25 },
      { tree: 'demonology', minPoints: 25 },
      { tree: 'destruction', minPoints: 25 },
    ],
  },
  // Demonic Brand (Wowhead 1293695, R3 tooltip): each pet attack on a branded target adds
  // ((60 − 26) × 1.5 + 14…17 + 0.078 × Shadow spell power) × (pet damage modifiers) Fire/Shadow damage. [A51]
  demonicBrand: { baseMin: 65, baseMax: 68, shadowSpCoef: 0.078, duration: 10 },
  // Demonic Sacrifice, the two sacrifices without a damage bonus (round 119, user: "make sure they work"; Forever tooltip:
  // Voidwalker restores 2% of your total mana every 4 s, Felhunter 3% of your total health every 4 s). Imp +15% Shadow and
  // Succubus +15% Fire are in engine/stats.js.
  demonicSacrifice: { every: 4, voidwalker: { manaPct: 2 }, felhunter: { healthPct: 3 } },
  // % of the Warlock's spell power that the pet gets as its OWN spell power; pet spells then apply their coefficient
  // (Firebolt 45 + 0.571 × pet SP). Round 31: **10**, measured in Forever by the user ("10 SP = 1 pet SP"; pet AP:
  // "6 SP = 1 pet AP", the Imp's tooltip says AP = 17% of the master's spell damage). History: 100 (rounds 2–15), 15
  // (rounds 16–30, Season of Discovery value for the hidden "Warlock Pet Scaling" 416189). Demonic Knowledge adds its bonus to
  // the pet's spell power directly (tooltip: "your spell damage and your Demon pet's spell damage"). [A26]
  petSpPct: 10,
  // Mid-fight pet swap (round 35, A63; Wowhead Forever spell pages, 2026-09-25): Summon Imp 688 = 80% of base mana,
  // Summon Succubus 712 = 100%, 10 s cast, 1.5 s GCD; Demonic Sacrifice 18788 and Fel Domination 18708 are instant and
  // off the GCD; Fel Domination: next summon −6 s cast, −50% mana, 5 min cooldown; Master Summoner: −2/−4 s, −20/−40%
  // mana. The two mana reductions are assumed to add up (−90% with 2/2 Master Summoner). Base mana = 1373 (A09).
  petSwap: { summonCast: 10, summonCostPctBase: { imp: 80, succubus: 100, felhunter: 80, voidwalker: 80 },
             felDom: { castRed: 6, costRedPct: 50, cd: 300 }, masterSummoner: { castRed: [2, 4], costRedPct: [20, 40] } },
  // Pets are simulated as their own actors [A26]. Spells from Wowhead Forever; melee/mana are informed assumptions.
  pets: {
    imp: {
      name: 'Imp', mana: 2000, manaRegen: 8,                       // [A45] mana pool / regen per second
      spell: { key: 'firebolt', name: 'Firebolt', id: 11763, school: 'fire', base: 44, coef: 0.571, cast: 2.0, cost: 115, range: 30, projectile: true },   // Effect Value 45 − 1 (round 42, SPELLVALUES.md)
    },
    succubus: {
      name: 'Succubus', mana: 2000, manaRegen: 8,                   // [A45]
      spell: { key: 'lashOfPain', name: 'Lash of Pain', id: 11780, school: 'shadow', base: 50, coef: 0.429, cast: 0, cd: 12, cost: 160, range: 5 },   // Effect Value 51 − 1 (round 42)
      // [A46] Base: Season of Discovery values (L60 Succubus base stats, identical in Classic and Season of Discovery):
      // weapon 95–131 per 2.0 s = 56.5 DPS + own AP (Str 129 × 2 − 20 = 238) / 14 = 17.0 → 73.5 DPS.
      // Pet AP from you: round 31 = 1/6 of your spell power (user, measured in Forever: "6 SP = 1 pet AP"; rounds 17–30:
      // 56.5%, Season of Discovery). Melee crit = her own 3.27% + 85 Agi × 0.05 = 7.52% (SoD base stats) + **your melee crit** (round 75, user:
      // 2.0% + Agility / 20; rounds 32–74 used your spell crit, rounds 17–31 a fixed 4.5% melee crit).
      // Rounds 17–31: own 7.52% + your *melee* crit 4.5% = 12% total. (Round 16: 100 / 0.57 / 5%.) [A46]
      // Round 42: miss / dodge / glancing / crit come from combat.petMelee (was a flat 85.5% land, no glancing).
      melee: { baseDps: 73.5, swing: 2.0, apPerSp: 0.1667, apPerDps: 14,
               critPct: 7.52, inheritMeleeCrit: true },   // round 75 (user): your MELEE crit (Agility), not your spell crit [A75]   // crit ×2; armor from boss armor − debuffs
    },
    felhunter: { name: 'Felhunter', mana: 2000, manaRegen: 8, melee: { baseDps: 40, swing: 2.0, apPerSp: 0.1667, apPerDps: 14, critPct: 5 } },
    voidwalker:{ name: 'Voidwalker',mana: 2000, manaRegen: 8, melee: { baseDps: 30, swing: 2.0, apPerSp: 0.1667, apPerDps: 14, critPct: 5 } },
  },
};
