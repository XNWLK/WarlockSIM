// Warlock-eligible races in WoW: Forever and their DPS-relevant racials.
// Base stats: Classic L60 Warlock + race offsets. [A09]
// Racial text: research/raw/wowhead_forever_talents-classic_dv27.js (racials["9"]).
window.WL = window.WL || {};

WL.WARLOCK_BASE_60 = { int: 110, spi: 115, sta: 65, agi: 50, mana: 1373, health: 1414 }; // Human = no offset; Agi 50 (round 17 / 75, A75)

WL.RACES = {
  human: {
    name: 'Human', faction: 'Alliance', offset: { int: 0, spi: 0, sta: 0, agi: 0 },
    racials: [
      { id: 20598,   name: 'The Human Spirit',     effect: 'spiritPct', value: 5 },
      { id: 20597,   name: 'Sword Specialization', effect: 'critPctIfSword', value: 2 },   // [A30]
    ],
  },
  gnome: {
    name: 'Gnome', faction: 'Alliance', offset: { int: 3, spi: 0, sta: -1, agi: 3 },
    racials: [
      { id: 20591,   name: 'Expansive Mind', effect: 'manaPct', value: 5 },
      // Mana cost -10% (was -50% until the beta build of 2026-09-24: dev notes + live Wowhead tooltip, S12), damage +10% unchanged.
      { id: 1259821, name: 'Eureka!', effect: 'cooldown', cd: 120, duration: 15, charges: 3, costRedPct: 10, dmgPct: 10 },   // duration: 15 s cap (spell data, round 42) // [A31]
    ],
  },
  orc: {
    name: 'Orc', faction: 'Horde', offset: { int: -3, spi: 3, sta: 2, agi: -3 },
    racials: [
      { id: 20572,   name: 'Blood Fury', effect: 'cooldown', cd: 120, duration: 15, spPct: 10 },      // [A32]
    ],
  },
  undead: {
    name: 'Undead', faction: 'Horde', offset: { int: -2, spi: 5, sta: 1, agi: -2 },
    racials: [
      { id: 1260201, name: 'Touch of the Grave', effect: 'proc', chancePct: 10, maxHealthPct: 5 },   // [A29]
    ],
  },
  troll: {
    name: 'Troll', faction: 'Horde', offset: { int: -4, spi: 1, sta: 1, agi: 2 },
    racials: [
      { id: 20554,   name: 'Berserking', effect: 'cooldown', cd: 180, duration: 10, hastePct: 10 },  // [A32]
    ],
  },
};
WL.RACE_KEYS = ['human', 'gnome', 'orc', 'undead', 'troll'];

// Baseline without a race (user, round 28): Human base stats (= no offset) and no racials at all. Simulated as an extra
// row per build so the value of each race's racials + stat offsets can be read off directly. Not a playable race:
// it is not in WL.RACE_KEYS and never counts as a build's "best race". [A62]
WL.BASELINE_RACE = 'none';
WL.RACES.none = { name: 'No race', faction: '', offset: { int: 0, spi: 0, sta: 0, agi: 0 }, racials: [], baseline: true };
WL.SIM_RACE_KEYS = WL.RACE_KEYS.concat([WL.BASELINE_RACE]);   // every race row the results page simulates
