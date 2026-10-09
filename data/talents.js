// WoW: Forever Warlock talents.
// Source: research/raw/wowhead_forever_talents-classic_dv27.js (Wowhead talent data, patch 1.60.1).
// `wid` = Wowhead talent id; row/col/ranks/req must match the raw file (checked by tests/test-data.js).
// `v` = numeric effect values per rank (index 0 = rank 1) copied from the per-rank tooltip text;
//       tests verify every number appears in that rank's description.
window.WL = window.WL || {};

WL.TREES = {
  affliction:  { wowheadTree: 302, name: 'Affliction' },
  demonology:  { wowheadTree: 303, name: 'Demonology' },
  destruction: { wowheadTree: 301, name: 'Destruction' },
};

WL.TALENTS = [
  // ---------------- Affliction (Wowhead tree 302 "WarlockCurses") ----------------
  { key: 'improvedLifeTap',     tree: 'affliction', wid: 105921, name: 'Improved Life Tap',     row: 0, col: 0, ranks: 2, v: { manaPct: [10, 20] } },
  { key: 'suppression',         tree: 'affliction', wid: 105925, name: 'Suppression',           row: 0, col: 1, ranks: 5, v: { hitPct: [1, 2, 3, 4, 5], threatPct: [4, 8, 12, 16, 20] } },
  { key: 'improvedCorruption',  tree: 'affliction', wid: 105924, name: 'Improved Corruption',   row: 0, col: 2, ranks: 5, v: { castRed: [0.4, 0.8, 1.2, 1.6, 2], dmgPct: [2, 4, 6, 8, 10] } },
  { key: 'malediction',         tree: 'affliction', wid: 105923, name: 'Malediction',           row: 1, col: 0, ranks: 5, v: { periodicPct: [1, 2, 3, 4, 5] } },
  { key: 'soulHarvesting',      tree: 'affliction', wid: 105922, name: 'Soul Harvesting',       row: 1, col: 1, ranks: 2, v: {} },
  { key: 'improvedDrains',      tree: 'affliction', wid: 105920, name: 'Improved Drains',       row: 1, col: 2, ranks: 3, v: { dmgPct: [7, 13, 20] } },
  { key: 'improvedBaneOfAgony', tree: 'affliction', wid: 105919, name: 'Improved Bane of Agony',row: 2, col: 0, ranks: 2, v: { dmgPct: [5, 10] } },
  { key: 'felConcentration',    tree: 'affliction', wid: 105918, name: 'Fel Concentration',     row: 2, col: 1, ranks: 3, v: { resistPct: [23, 47, 70] } },   // pushback (round 78, A76)
  { key: 'amplifyCurse',        tree: 'affliction', wid: 105916, name: 'Amplify Curse',         row: 2, col: 2, ranks: 1, v: { boaPct: [50] } },
  { key: 'pandemic',            tree: 'affliction', wid: 105917, name: 'Pandemic',              row: 2, col: 3, ranks: 3, v: { critBonusPct: [33, 67, 100] } },
  { key: 'malevolence',         tree: 'affliction', wid: 110876, name: 'Malevolence',           row: 3, col: 0, ranks: 5, v: { shadowCritPct: [1, 2, 3, 4, 5] } },
  { key: 'nightfall',           tree: 'affliction', wid: 105914, name: 'Nightfall',             row: 3, col: 1, ranks: 2, v: { procPct: [2, 4] } },
  { key: 'curseOfExhaustion',   tree: 'affliction', wid: 105913, name: 'Curse of Exhaustion',   row: 3, col: 2, ranks: 1, req: 'amplifyCurse', reqQty: 1, v: {} },
  { key: 'siphonLife',          tree: 'affliction', wid: 105912, name: 'Siphon Life',           row: 4, col: 1, ranks: 1, v: {} },
  { key: 'soulSiphon',          tree: 'affliction', wid: 105911, name: 'Soul Siphon',           row: 4, col: 2, ranks: 3, v: { perEffectPct: [4, 8, 12], maxPct: [12, 24, 36] } },
  { key: 'shadowMastery',       tree: 'affliction', wid: 105910, name: 'Shadow Mastery',        row: 5, col: 2, ranks: 5, v: { shadowPct: [1, 2, 3, 4, 5] } },
  { key: 'wrack',               tree: 'affliction', wid: 105909, name: 'Wrack',                 row: 6, col: 1, ranks: 1, req: 'siphonLife', reqQty: 1, v: {} },

  // ---------------- Demonology (Wowhead tree 303 "WarlockSummoning") ----------------
  { key: 'improvedHealthFunnel',tree: 'demonology', wid: 105905, name: 'Improved Health Funnel',row: 0, col: 0, ranks: 2, v: {} },
  { key: 'improvedImp',         tree: 'demonology', wid: 105908, name: 'Improved Imp',          row: 0, col: 1, ranks: 3, v: { firebolt: [10, 20, 30] } },
  { key: 'demonicEmbrace',      tree: 'demonology', wid: 105907, name: 'Demonic Embrace',       row: 0, col: 2, ranks: 5, v: { staPct: [3, 6, 9, 12, 15] } },
  { key: 'unholyPower',         tree: 'demonology', wid: 105906, name: 'Unholy Power',          row: 0, col: 3, ranks: 5, v: { petDmgPct: [2, 4, 6, 8, 10] } },
  { key: 'demonicAegis',        tree: 'demonology', wid: 105902, name: 'Demonic Aegis',         row: 1, col: 0, ranks: 2, v: {} },
  { key: 'improvedVoidwalker',  tree: 'demonology', wid: 105904, name: 'Improved Voidwalker',   row: 1, col: 1, ranks: 3, v: {} },
  { key: 'felVitality',         tree: 'demonology', wid: 105903, name: 'Fel Vitality',          row: 1, col: 2, ranks: 3, v: { manaPct: [5, 10, 15] } },
  { key: 'demonicEnergies',     tree: 'demonology', wid: 105899, name: 'Demonic Energies',      row: 1, col: 3, ranks: 2, v: { healPct: [8, 15], tapPct: [50, 100] } },
  { key: 'improvedSayaad',      tree: 'demonology', wid: 105901, name: 'Improved Sayaad',       row: 2, col: 0, ranks: 3, v: { lashPct: [10, 20, 30] } },
  { key: 'demonicSacrifice',    tree: 'demonology', wid: 105900, name: 'Demonic Sacrifice',     row: 2, col: 1, ranks: 1, v: { schoolPct: [15] } },
  { key: 'masterSummoner',      tree: 'demonology', wid: 105898, name: 'Master Summoner',       row: 2, col: 2, ranks: 2, v: {} },
  { key: 'decimation',          tree: 'demonology', wid: 105897, name: 'Decimation',            row: 3, col: 0, ranks: 2, v: { sfCdRedPct: [45, 90], dmgPct: [3, 6], sfCastRedPct: [20, 40] } },
  { key: 'felDomination',       tree: 'demonology', wid: 105895, name: 'Fel Domination',        row: 3, col: 2, ranks: 1, req: 'masterSummoner', reqQty: 2, v: {} },
  { key: 'demonicBrand',        tree: 'demonology', wid: 105896, name: 'Demonic Brand',         row: 3, col: 3, ranks: 3, v: { threatRedPct: [17, 33, 50], charges: [2, 4, 6] } },
  { key: 'improvedFelhunter',   tree: 'demonology', wid: 105894, name: 'Improved Felhunter',    row: 4, col: 0, ranks: 3, v: {} },
  { key: 'soulLink',            tree: 'demonology', wid: 105892, name: 'Soul Link',             row: 4, col: 1, ranks: 1, req: 'demonicSacrifice', reqQty: 1, v: { dmgPct: [3], toPetPct: [30] } },   // toPetPct: share of the damage you take that goes to your demon (round 132: Hellfire's damage to yourself)
  { key: 'demonicKnowledge',    tree: 'demonology', wid: 105893, name: 'Demonic Knowledge',     row: 4, col: 2, ranks: 3, v: { levelPct: [33, 67, 100] } },
  { key: 'masterDemonologist',  tree: 'demonology', wid: 105891, name: 'Master Demonologist',   row: 5, col: 2, ranks: 5, v: { schoolPct: [2, 4, 6, 8, 10] } },
  { key: 'demonicPact',         tree: 'demonology', wid: 105890, name: 'Demonic Pact',          row: 6, col: 1, ranks: 1, req: 'soulLink', reqQty: 1, v: {} },

  // ---------------- Destruction (Wowhead tree 301) ----------------
  { key: 'destructiveReach',    tree: 'destruction', wid: 105881, name: 'Destructive Reach',    row: 0, col: 0, ranks: 2, v: { rangePct: [10, 20] } },   // range only, no damage effect (A78)
  { key: 'improvedShadowBolt',  tree: 'destruction', wid: 105889, name: 'Improved Shadow Bolt', row: 0, col: 1, ranks: 5, v: { debuffPct: [4, 8, 12, 16, 20] } },
  { key: 'bane',                tree: 'destruction', wid: 105888, name: 'Bane',                 row: 0, col: 2, ranks: 5, v: { castRed: [0.1, 0.2, 0.3, 0.4, 0.5], sfCastRed: [0.4, 0.8, 1.2, 1.6, 2] } },
  { key: 'moltenSkin',          tree: 'destruction', wid: 105885, name: 'Molten Skin',          row: 1, col: 0, ranks: 5, v: { dmgTakenPct: [2, 4, 6, 8, 10] } },   // round 132: Hellfire's damage to yourself
  { key: 'cataclysm',           tree: 'destruction', wid: 105887, name: 'Cataclysm',            row: 1, col: 1, ranks: 3, v: { costRedPct: [3, 6, 10] } },
  { key: 'aftermath',           tree: 'destruction', wid: 105886, name: 'Aftermath',            row: 1, col: 2, ranks: 5, v: { immoInitPct: [10, 20, 30, 40, 50] } },
  { key: 'ruin',                tree: 'destruction', wid: 105883, name: 'Ruin',                 row: 2, col: 1, ranks: 5, v: { critBonusPct: [20, 40, 60, 80, 100] } },
  { key: 'shadowburn',          tree: 'destruction', wid: 105884, name: 'Shadowburn',           row: 2, col: 2, ranks: 1, v: {} },
  { key: 'intensity',           tree: 'destruction', wid: 105882, name: 'Intensity',            row: 3, col: 0, ranks: 3, v: { resistPct: [23, 47, 70] } },   // pushback (round 78, A76)
  { key: 'agonizingFlames',     tree: 'destruction', wid: 105879, name: 'Agonizing Flames',     row: 3, col: 1, ranks: 3, v: { spCritPct: [3, 7, 10], dmgPct: [3, 7, 10] } },
  { key: 'conflagrate',         tree: 'destruction', wid: 105880, name: 'Conflagrate',          row: 3, col: 2, ranks: 1, v: {} },
  { key: 'pyroclasm',           tree: 'destruction', wid: 105878, name: 'Pyroclasm',            row: 4, col: 0, ranks: 2, req: 'intensity', reqQty: 3, v: {} },
  { key: 'baneOfHavoc',         tree: 'destruction', wid: 105876, name: 'Bane of Havoc',        row: 4, col: 1, ranks: 1, v: {} },
  { key: 'fireAndBrimstone',    tree: 'destruction', wid: 105877, name: 'Fire and Brimstone',   row: 4, col: 2, ranks: 3, req: 'conflagrate', reqQty: 1, v: { conflagCritPct: [8, 17, 25] } },
  { key: 'shadowAndFlame',      tree: 'destruction', wid: 105875, name: 'Shadow and Flame',     row: 5, col: 2, ranks: 5, v: { schoolPct: [2, 4, 6, 8, 10], procPct: [20, 40, 60, 80, 100] } },
  { key: 'incinerate',          tree: 'destruction', wid: 105874, name: 'Incinerate',           row: 6, col: 1, ranks: 1, req: 'baneOfHavoc', reqQty: 1, v: {} },
];

WL.TALENT_BY_KEY = {};
WL.TALENTS.forEach(function (t) { WL.TALENT_BY_KEY[t.key] = t; });
