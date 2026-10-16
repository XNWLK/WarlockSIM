// Warlock-eligible races in WoW: Forever and their DPS-relevant racials.
// Base stats: Classic L60 Warlock + race offsets. [A09]
// Racial text: research/raw/wowhead_forever_talents-classic_dv27.js (racials["9"]).
// `patch` = new or changed by a Forever patch after the archive was taken (the date of the patch notes): the archive's
// name or text no longer matches, so tests/test-data.js does not compare these with it. Ids and texts of those: live
// Wowhead Forever, 2026-10-16. [A93]
window.WL = window.WL || {};

WL.WARLOCK_BASE_60 = { int: 110, spi: 115, sta: 65, agi: 50, mana: 1373, health: 1414 }; // Human = no offset; Agi 50 (round 17 / 75, A75)

WL.RACES = {
  human: {
    name: 'Human', faction: 'Alliance', offset: { int: 0, spi: 0, sta: 0, agi: 0 },
    racials: [
      { id: 20598,   name: 'The Human Spirit',     effect: 'spiritPct', value: 5 },
      // Patch 2026-10-16: Sword Specialization (+2% crit with a sword) was replaced by Ruthless, +2% crit always. Spell crit
      // and your melee crit (the Succubus inherits it, user). [A93]
      { id: 20597,   name: 'Ruthless',             effect: 'critPct', value: 2, patch: '2026-10-16' },   // the old Sword Specialization id
    ],
  },
  gnome: {
    name: 'Gnome', faction: 'Alliance', offset: { int: 3, spi: 0, sta: -1, agi: 3 },
    racials: [
      { id: 20591,   name: 'Expansive Mind', effect: 'manaPct', value: 5 },
      // Mana cost -10% (was -50% until the beta build of 2026-09-24: dev notes + live Wowhead tooltip, S12), damage +10% unchanged.
      // Patch 2026-10-16: an 8 s buff with no charges (was 3 charges within 15 s). A cast gets it when it FINISHES while the
      // buff is up (user); cooldown still 2 min (user). [A31][A93]
      { id: 1259821, name: 'Eureka!', effect: 'cooldown', cd: 120, duration: 8, costRedPct: 10, dmgPct: 10, patch: '2026-10-16' },
    ],
  },
  orc: {
    name: 'Orc', faction: 'Horde', offset: { int: -3, spi: 3, sta: 2, agi: -3 },
    racials: [
      // Patch 2026-10-16: Axe Specialization was replaced by Savage, +1% crit (spell crit and your melee crit, user), and
      // Blood Fury's cooldown went from 2 to 3 minutes. [A93]
      { id: 20574,   name: 'Savage',     effect: 'critPct', value: 1, patch: '2026-10-16' },   // the old Axe Specialization id
      { id: 20572,   name: 'Blood Fury', effect: 'cooldown', cd: 180, duration: 15, spPct: 10, patch: '2026-10-16' },      // [A32]
    ],
  },
  undead: {
    name: 'Undead', faction: 'Horde', offset: { int: -2, spi: 5, sta: 1, agi: -2 },
    racials: [
      // Patch 2026-10-16: 30% chance for casters (was 10%) with a 25 s internal cooldown, and it no longer scales with Shadow
      // damage increases on you or the target — nothing multiplies it, Power Infusion neither (user). [A29][A93]
      { id: 1260201, name: 'Touch of the Grave', effect: 'proc', chancePct: 30, icd: 25, maxHealthPct: 5, patch: '2026-10-16' },
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
