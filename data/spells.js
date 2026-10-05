// WoW: Forever Warlock spells (level-60 ranks). Every number and its source is listed in SPELLVALUES.md.
// Round 42 (user): damage = the Wowhead Forever "Effect … Value" minus 1 (the in-game Shadow Bolt R9 hits for 237–265 =
// 251 average = Value 252 − 1; the tooltip text on the same page, 246–274, is wrong). The defaults are the highest
// TRAINER ranks; the AQ20 book ranks of Shadow Bolt / Immolate / Corruption are in WL.BOOK_RANKS and used only with
// options.bookRanks (Fight & pets → Options). Direct damage is simulated at its average (no min–max roll).
// Fields:
//   school   'shadow' | 'fire'
//   tree     spell family used by talents ("Destruction spells" = Ruin/Agonizing Flames/Cataclysm; "Affliction" = Soul Siphon counting)
//   kind     'direct' | 'dot' | 'channel' | 'hybrid' (direct part + dot) | 'utility'
//   base/coef            direct damage: base + coef * SP
//   tickBase/tickCoef    per-tick periodic damage: tickBase + tickCoef * SP
//   tickEvery/duration   seconds (ticks = duration / tickEvery)
//   cast     base cast time in seconds (0 = instant). Channels: cast = 0, duration = channel length
//   cost     mana; cd = cooldown seconds; shards = soul shard cost
//   range    yards to the target (0 = cast on yourself); Destructive Reach raises it (spell table `range`). Not used by
//            the fight engine — the boss is always in range (round 99, A78)
//   talent   talent key required to have the spell
//   rank     spell rank (shown in the tooltip)
//   projectile  travels to the target: lands fight.travelMs after the cast (round 39, A65)
window.WL = window.WL || {};

WL.SPELLS = {
  shadowBolt:   { id: 11661,   name: 'Shadow Bolt',    school: 'shadow', tree: 'destruction', kind: 'direct', rank: 9,
                  base: 251, coef: 0.857, cast: 3.0, cost: 370, range: 30, projectile: true },
  immolate:     { id: 11668,   name: 'Immolate',       school: 'fire',   tree: 'destruction', kind: 'hybrid', rank: 7,
                  base: 146, coef: 0.20, tickBase: 52, tickCoef: 0.13, tickEvery: 3, duration: 15, cast: 2.0, cost: 370, range: 30 },
  incinerate:   { id: 1293813, name: 'Incinerate',     school: 'fire',   tree: 'destruction', kind: 'direct',
                  base: 217, coef: 0.714, cast: 2.5, cost: 325, range: 30, immolateBonusPct: 25, talent: 'incinerate', projectile: true },
  searingPain:  { id: 17923,   name: 'Searing Pain',   school: 'fire',   tree: 'destruction', kind: 'direct',
                  base: 114, coef: 0.429, cast: 1.5, cost: 168, range: 30 },
  conflagrate:  { id: 18932,   name: 'Conflagrate',    school: 'fire',   tree: 'destruction', kind: 'direct',
                  base: 282, coef: 0.429, cast: 0, cost: 255, range: 30, cd: 10, talent: 'conflagrate' },
  shadowburn:   { id: 18871,   name: 'Shadowburn',     school: 'shadow', tree: 'destruction', kind: 'direct',
                  base: 266, coef: 0.429, cast: 0, cost: 365, range: 30, cd: 15, shards: 1, talent: 'shadowburn' },
  soulFire:     { id: 17924,   name: 'Soul Fire',      school: 'fire',   tree: 'destruction', kind: 'direct',
                  base: 431, coef: 1.0, cast: 6.0, cost: 335, range: 30, cd: 60, shards: 1, projectile: true },
  corruption:   { id: 11672,   name: 'Corruption',     school: 'shadow', tree: 'affliction',  kind: 'dot', rank: 6,
                  tickBase: 57, tickCoef: 0.20, tickEvery: 3, duration: 18, cast: 2.0, cost: 290, range: 30 },
  baneOfAgony:  { id: 11713,   name: 'Bane of Agony',  school: 'shadow', tree: 'affliction',  kind: 'dot', bane: true,
                  tickBase: 46, tickCoef: 0.133, tickEvery: 2, duration: 24, cast: 0, cost: 215, range: 30,
                  ramp: [0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5] },   // [A15]
  baneOfDoom:   { id: 603,     name: 'Bane of Doom',   school: 'shadow', tree: 'affliction',  kind: 'dot', bane: true,
                  tickBase: 1742, tickCoef: 4.0, tickEvery: 60, duration: 60, cast: 0, cost: 300, range: 30, cd: 60 },
  // Bane of Havoc (talent 105876, spell 1225228): instant, off the GCD, 5% of base mana, 5 min. 15% of the Warlock's
  // damage to other targets is also dealt to the Havoc target (Wowhead value 16 = tooltip 15, A39). Used only in
  // 2-target encounters (W11, A60).
  baneOfHavoc:  { id: 1225228, name: 'Bane of Havoc',  school: 'shadow', tree: 'affliction',  kind: 'utility',
                  cast: 0, cost: 69, range: 30, duration: 300, havocPct: 15, talent: 'baneOfHavoc' },
  siphonLife:   { id: 18881,   name: 'Siphon Life',    school: 'shadow', tree: 'affliction',  kind: 'dot',
                  tickBase: 41, tickCoef: 0.05, tickEvery: 3, duration: 30, cast: 0, cost: 365, range: 30, talent: 'siphonLife' },
  drainLife:    { id: 11700,   name: 'Drain Life',     school: 'shadow', tree: 'affliction',  kind: 'channel', drain: true,
                  tickBase: 51, tickCoef: 0.10, tickEvery: 1, duration: 5, cast: 0, cost: 300, range: 20 },
  drainSoul:    { id: 11675,   name: 'Drain Soul',     school: 'shadow', tree: 'affliction',  kind: 'channel', drain: true,
                  tickBase: 84, tickCoef: 0.10, tickEvery: 3, duration: 15, cast: 0, cost: 290, range: 30 },
  wrack:        { id: 1316697, name: 'Wrack',          school: 'shadow', tree: 'affliction',  kind: 'channel', drain: true,
                  tickBase: 36, tickCoef: 0.143, tickEvery: 1, duration: 6, cast: 0, cost: 200, range: 30, talent: 'wrack',
                  debuffPct: 10, debuffSpells: ['corruption', 'baneOfAgony'] },   // [A18]
  deathCoil:    { id: 17926,   name: 'Death Coil',     school: 'shadow', tree: 'affliction',  kind: 'direct',
                  base: 454, coef: 0.214, cast: 0, cost: 600, range: 30, cd: 120, projectile: true },
  curseOfElements: { id: 1311680, name: 'Curse of the Elements', school: 'shadow', tree: 'affliction', kind: 'utility',
                  cast: 0, cost: 200, range: 30, duration: 300, dmgTakenPct: 10 },            // [A34]
  lifeTap:      { id: 11689,   name: 'Life Tap',       school: 'shadow', tree: 'affliction',  kind: 'utility',
                  cast: 0, cost: 0, range: 0, manaBase: 430 },                                  // [A12] mana = (430 + Spirit) * (1 + ImpLT)
};

// AQ20 book ranks (round 42, user): taught only by Grimoire items that drop in Ruins of Ahn'Qiraj (Wowhead Forever:
// "Used by Item"; Grimoire of Shadow Bolt X = item 21281). Off by default; options.bookRanks swaps these fields in.
WL.BOOK_RANKS = {
  shadowBolt: { id: 25307, rank: 10, base: 268, cost: 380, book: 21281 },
  immolate:   { id: 25309, rank: 8,  base: 158, tickBase: 55, cost: 380 },
  corruption: { id: 25311, rank: 7,  tickBase: 73, cost: 340 },
};

// The spell table a fight uses: WL.SPELLS, or WL.SPELLS with the book ranks merged in (cached, never mutates WL.SPELLS).
WL.spellsFor = function (cfg) {
  if (!(cfg && cfg.options && cfg.options.bookRanks)) return WL.SPELLS;
  if (!WL._bookSpells) {
    var s = {};
    Object.keys(WL.SPELLS).forEach(function (k) { s[k] = WL.SPELLS[k]; });
    Object.keys(WL.BOOK_RANKS).forEach(function (k) {
      var o = {}, a = WL.SPELLS[k], b = WL.BOOK_RANKS[k];
      Object.keys(a).forEach(function (f) { o[f] = a[f]; });
      Object.keys(b).forEach(function (f) { o[f] = b[f]; });
      s[k] = o;
    });
    WL._bookSpells = s;
  }
  return WL._bookSpells;
};

// Any rank of Shadow Bolt (round 57): talents and effects that name Shadow Bolt apply to every rank.
var SB_CACHE = {};
WL.isShadowBolt = function (k) { var v = SB_CACHE[k]; if (v === undefined) v = SB_CACHE[k] = k === 'shadowBolt'; return v; };   // only Rank 9 since round 81 (Rank 2 gutted)

// Spells whose crit bonus is raised by Pandemic (talent text).
WL.PANDEMIC_SPELLS = ['corruption', 'baneOfAgony', 'baneOfDoom', 'drainSoul', 'drainLife', 'siphonLife', 'wrack'];
// Spells that proc Nightfall (talent text).
WL.NIGHTFALL_SPELLS = ['corruption', 'drainSoul', 'drainLife', 'wrack'];
// Affliction effects counted by Soul Siphon (other than the drain itself). [A19]
WL.SOUL_SIPHON_EFFECTS = ['corruption', 'baneOfAgony', 'baneOfDoom', 'siphonLife', 'curseOfElements'];

// Weapon stones (Create Spellstone R3 / Create Firestone R4): a build's `oil` key (the name is from when they were
// taken to share the weapon-oil slot). Since round 86 they stack with a weapon oil from the consumables. [A33]
WL.OILS = {
  none:       { name: 'None' },
  spellstone: { name: 'Major Spellstone', id: 17728, hastePct: 2, schoolSp: { shadow: 21 } },
  firestone:  { name: 'Major Firestone',  id: 17953, critPct: 2,  schoolSp: { fire: 21 } },
};
