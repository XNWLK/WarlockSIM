// Talent builds to compare. Each must spend exactly 51 points (validated by tests/test-data.js).
//   short      nomenclature shown after the talent split: "<split> <short> (<race>)"
//   notes      shown in a build's details under "About this build": what the build is, in plain words. Round 112 (user):
//              no round numbers, assumption ids or file references in it — how each build was found is in
//              docs/03_BUILD_LOG.md and docs/04_EXPLORATION.md (and in the notes of versions/v103-before-round112).
//   pet        demon kept active during the fight (null = none)
//   sacrifice  demon sacrificed with Demonic Sacrifice before the pull ('imp' = +15% Shadow, 'succubus' = +15% Fire)
//   oil        weapon oil key from WL.OILS
//   rotation   ordered priority list; the engine casts the first action whose condition is met (engine/rotation.js).
//   params     numbers of priority actions that have their own (round 104): { actionKey: { paramKey: value } }
//
// Round 105 (user): every build got "Life Tap when mana is below _% and more than _ s remain" right above its filler, each
// with the best setting of the round-104 grid (04_EXPLORATION §41) — the user asked for all builds, also those under +0.5%.
// Round 109: grid redone with the cooldown rule of round 107 — the settings hold; only Demo Pact Fire Succubus moved.
// Round 110 (user): five builds taken off the sheet — Aff Pact Fire Imp, Demo Pact Fire Succubus, Aff Pact Drain Life
// Succubus, Aff Shadow Bolt Succubus and DS Ruin (classic). Eight builds remain. The five live on as test fixtures in
// tests/retired-builds.js (several tests use them); their history is in docs/03_BUILD_LOG.md.
// Round 122 (user): Demo Pact Shadow Bolt Imp taken off the sheet as well — seven builds remain; it joined the fixtures.
//
// Round 16 (2026-09-24): list re-derived after pet spell power 100% → 15% (A26/A49) and Succubus melee 40 → 100 DPS
// (A46). Full search + point-shift hill-climb + rotation search at the new defaults: docs/04_EXPLORATION.md section 8.
// Rule unchanged: keep every build within 20% of the best; adopt talent/rotation moves of at least +0.5%.
// Round 28 (user): the best build with at least 25 Affliction points is on the sheet and always shown, however far
// behind it is (aff_succ_sb until round 110, 04_EXPLORATION §16; SM Ruin since); round 29: the same for Demonology and Destruction
// (options.alwaysShowBestTrees — those two are already the top builds of their tree). Every build is also simulated with
// "No race" (A62) as a baseline for the racials.
// History of the earlier (Imp-first) list: rounds 3–13 in docs/03_BUILD_LOG.md.
window.WL = window.WL || {};

WL.BUILDS = [
  {
    key: 'demo_pact_succ_sb', short: 'Demo Pact Shadow Bolt Succubus',
    name: 'Demonology – Pact, Succubus out, Shadow Bolt',
    notes: '2/31/18. Imp sacrificed (+15% Shadow, kept by Demonic Pact) with the Succubus out: Master Demonologist gives +10% Shadow to you and to her, and she adds Lash of Pain, melee and the Demonic Brand bonus. Searing Pain keeps Demonic Brand up, Shadow Bolt is the filler with 5/5 Improved Shadow Bolt, Death Coil finishes the fight.',
    talents: {
      suppression: 1, improvedCorruption: 1,   // round 61: -1 Improved Life Tap +1 Suppression (round 30 had moved it the other way)
      unholyPower: 5, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, improvedSayaad: 3, masterSummoner: 2,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      improvedShadowBolt: 5, bane: 5, ruin: 5, agonizingFlames: 3,   // round 61: -3 Cataclysm +3 Improved Shadow Bolt
    },
    pet: 'succubus', sacrifice: 'imp', oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'searingPainBrand', 'immolate', 'corruption', 'lifeTapBelow', 'shadowBolt'],
    params: { lifeTapBelow: { pct: 80, sec: 45 } },   // round 105 (user): Life Tap below 80% mana with more than 45 s left, +0.59% (10,000 fights)
  },
  {
    key: 'aff_pact_succ_sb', short: 'Aff Pact Shadow Bolt Succubus',
    name: 'Affliction/Demonology – Pact, Succubus out, Shadow Bolt',
    notes: '13/31/7. The same Succubus Pact tree with an Affliction side instead of deep Destruction: Suppression 5/5, Improved Corruption, Improved Life Tap, Malediction and Pandemic. Imp sacrificed (+15% Shadow), Succubus out, Shadow Bolt filler, Searing Pain to keep Demonic Brand up.',
    talents: {
      suppression: 5, improvedCorruption: 2, improvedLifeTap: 2, malediction: 1, pandemic: 3,   // round 61: -2 Malediction +2 Improved Shadow Bolt
      unholyPower: 5, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, improvedSayaad: 3, masterSummoner: 2,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      improvedShadowBolt: 2, bane: 5,
    },
    pet: 'succubus', sacrifice: 'imp', oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'searingPainBrand', 'corruption', 'immolate', 'lifeTapBelow', 'shadowBolt'],
    params: { lifeTapBelow: { pct: 80, sec: 45 } },   // round 105 (user): Life Tap below 80% mana with more than 45 s left, +0.43% (10,000 fights)
  },
  {
    key: 'demo_pact_fire', short: 'Demo Pact Fire Imp',
    name: 'Demonology – Pact, Imp out, Fire',
    notes: '2/31/18. Succubus sacrificed (+15% Fire, kept by Demonic Pact) with the Imp out: Master Demonologist gives +10% Fire to you and to the Imp. Searing Pain is the filler and keeps Demonic Brand up by itself; Soul Fire is cast in the execute phase (Decimation). Aftermath and Agonizing Flames strengthen Immolate and Searing Pain, and Life Tap also refills the Imp (Demonic Energies).',
    talents: {
      suppression: 1, improvedCorruption: 1,
      unholyPower: 5, improvedImp: 3, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, masterSummoner: 2,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      bane: 5, aftermath: 5, ruin: 5, agonizingFlames: 3,
    },
    pet: 'imp', sacrifice: 'succubus', oil: 'firestone',
    rotation: ['deathCoilFinisher', 'searingPainBrand', 'lifeTapPet', 'bane', 'curseOfElements', 'immolate', 'soulFire', 'corruption', 'lifeTapBelow', 'searingPain'],
    params: { lifeTapBelow: { pct: 80, sec: 45 } },   // round 105 (user): Life Tap below 80% mana with more than 45 s left, +0.95% (10,000 fights)
  },
  {
    key: 'destro_incin_succ', short: 'Destro Incinerate Succubus',
    name: 'Destruction – Incinerate, Succubus out',
    notes: '18/0/33. Incinerate with Shadow and Flame, Conflagrate and Shadowburn; the Affliction points go to Suppression, Improved Corruption, Malediction, Pandemic and Improved Life Tap. No Demonology points: the Succubus fights on her own (melee and Lash of Pain). With a second target, Bane of Havoc copies part of your damage to it.',
    talents: {
      suppression: 5, improvedCorruption: 3, malediction: 5, pandemic: 3, improvedLifeTap: 2,   // round 30: -2 Improved Corruption +2 Pandemic (+0.55% Human)
      bane: 5, cataclysm: 3, aftermath: 5, ruin: 5, shadowburn: 1, agonizingFlames: 3, conflagrate: 1,
      baneOfHavoc: 1, fireAndBrimstone: 3, shadowAndFlame: 5, incinerate: 1,
    },
    pet: 'succubus', sacrifice: null, oil: 'firestone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'immolate', 'corruption', 'conflagrate', 'shadowburn', 'lifeTapBelow', 'incinerate'],
    params: { lifeTapBelow: { pct: 50, sec: 25 } },   // round 105 (user): Life Tap below 50% mana with more than 25 s left, +0.36% (10,000 fights)
  },
  {
    key: 'destro_incin_imp', short: 'Destro Incinerate Imp',
    name: 'Destruction – Incinerate, Imp out',
    notes: '14/6/31. Incinerate with Shadow and Flame, Conflagrate and Shadowburn, the Imp out with Improved Imp. The Affliction points go to Suppression, Improved Corruption, Improved Life Tap, Pandemic and Amplify Curse. With a second target, Bane of Havoc copies part of your damage to it.',
    talents: {
      suppression: 5, improvedCorruption: 3, improvedLifeTap: 2, pandemic: 3, amplifyCurse: 1,
      unholyPower: 2, improvedImp: 3, demonicEnergies: 1,
      bane: 5, cataclysm: 3, aftermath: 3, ruin: 5, shadowburn: 1, agonizingFlames: 3, conflagrate: 1,
      baneOfHavoc: 1, fireAndBrimstone: 3, shadowAndFlame: 5, incinerate: 1,
    },
    pet: 'imp', sacrifice: null, oil: 'firestone',
    rotation: ['deathCoilFinisher', 'bane', 'corruption', 'immolate', 'lifeTapPet', 'conflagrate', 'curseOfElements', 'shadowburn', 'lifeTapBelow', 'incinerate'],
    params: { lifeTapBelow: { pct: 40, sec: 60 } },   // round 105 (user): Life Tap below 40% mana with more than 60 s left, +0.32% (10,000 fights)
  },
  // ---- Reference builds (round 65, user): classic layouts. Round 66: every build is shown by default (no cut-off), so they
  //      need no special flag; anyone can pin any build (📌) to keep it shown when a cut-off is set. ----
  {
    key: 'sm_ruin_classic', short: 'SM Ruin (classic)',
    name: 'SM Ruin (classic) – Affliction / Destruction, Succubus out, Shadow Bolt',
    notes: '30/0/21. The classic Shadow Mastery / Ruin layout: Suppression, Improved Corruption, Improved Life Tap, Malediction, Pandemic, Malevolence, Nightfall, Siphon Life and Shadow Mastery with Bane, Improved Shadow Bolt, Cataclysm, Ruin and Agonizing Flames. No Demonology, so nothing is sacrificed: the Succubus is out. Shadow Bolt filler, instant Shadow Bolts on Shadow Trance.',
    talents: {
      suppression: 5, improvedCorruption: 2, improvedLifeTap: 2, malediction: 5, pandemic: 3, malevolence: 5, nightfall: 2,
      siphonLife: 1, shadowMastery: 5,
      bane: 5, improvedShadowBolt: 5, cataclysm: 3, ruin: 5, agonizingFlames: 3,   // round 82/83: −3 Improved Corruption +3 Cataclysm
    },
    pet: 'succubus', sacrifice: null, oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'bane', 'corruption', 'shadowTrance', 'siphonLife', 'curseOfElements', 'immolate', 'lifeTapBelow', 'shadowBolt'],
    params: { lifeTapBelow: { pct: 40, sec: 25 } },   // round 105 (user): Life Tap below 40% mana with more than 25 s left, +0.23% (10,000 fights)
  },
  {
    key: 'wrack_succubus', short: 'Wrack Succubus',
    name: 'Wrack Succubus – Affliction (Wrack) / Destruction (Improved Shadow Bolt), Succubus out',
    notes: '40/0/11. Deep Affliction with Wrack as the filler: while it channels, Corruption and Bane of Agony deal 10% more. Suppression, Improved Corruption, Malediction, Pandemic, Malevolence, Siphon Life, Nightfall, Shadow Mastery, Soul Siphon, Improved Bane of Agony and Improved Drains; a Shadow Bolt keeps Improved Shadow Bolt up whenever it is about to run out. Succubus out, Bane of Agony only (never Bane of Doom).',
    talents: {
      suppression: 5, improvedCorruption: 5, malediction: 5, pandemic: 3, malevolence: 5, siphonLife: 1, nightfall: 2,
      shadowMastery: 5, soulSiphon: 3, wrack: 1, improvedBaneOfAgony: 2, improvedDrains: 3,
      improvedShadowBolt: 5, bane: 5, ruin: 1,
    },
    pet: 'succubus', sacrifice: null, oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'baneOfAgony', 'corruption', 'siphonLife', 'curseOfElements', 'immolate', 'isbUpkeep', 'shadowTrance', 'lifeTapBelow', 'wrack'],   // round 82/83: + ISB upkeep
    params: { lifeTapBelow: { pct: 60, sec: 25 } },   // round 105 (user): Life Tap below 60% mana with more than 25 s left, +0.21% (10,000 fights)
  },
];
