// Talent builds to compare. Each must spend exactly 51 points (validated by tests/test-data.js).
//   short      nomenclature shown after the talent split: "<split> <short> (<race>)"
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
    notes: '2/31/18. Imp sacrificed (+15% Shadow, kept by Demonic Pact), Succubus out: Master Demonologist +10% Shadow for you and her, Improved Sayaad, Lash of Pain, melee, Demonic Brand upkeep with Searing Pain. Best build since round 16 (pets at 15% of your spell power); was the Succubus reference row before. Local optimum of the hill-climb; rotation order within noise of the best of 120 orders. Soul Fire during Decimation before Shadow Bolt is equal within noise (+0.03%, round 25), so it is left out. Improved Shadow Bolt 2 / Cataclysm 3 is best self-buffed (ISB up only ~16%, mana is short); with full raid buffs + consumables 5/5 ISB and no Cataclysm is +0.7% (04_EXPLORATION §11). Round 30 (Eureka! mana -50% -> -10%, beta 2026-09-24): -1 Suppression +1 Improved Life Tap is now +0.5% (mana got scarcer); Human and Gnome tie as best race (§18). Round 61 (raid buffs + Judgement of Wisdom on by default, v52): mana is no longer short, so -3 Cataclysm +3 Improved Shadow Bolt (5/5) and -1 Improved Life Tap +1 Suppression: +0.62% Human (701.73 -> 706.11), +0.48% Gnome, 10,000 fights (04_EXPLORATION §28). Round 71: Death Coil as the finisher on top +0.41% (10,000 fights).',
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
    notes: '15/31/5 (new in round 16). Affliction side (Suppression, Improved Corruption, Improved Life Tap, Malediction, Pandemic) with the Pact tree, Imp sacrificed, Succubus out, Shadow Bolt filler. Within 0.7% of the best; local optimum of the hill-climb. Round 61 (v52 defaults): -2 Malediction +2 Improved Shadow Bolt -> 13/31/7, +0.58% Undead (688.97 -> 692.99), +0.64% Gnome, 10,000 fights (04_EXPLORATION §28). Round 71: Death Coil as the finisher on top +0.45% (10,000 fights).',
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
    notes: '2/31/18 (round 10: −2 Cataclysm +2 Suppression; round 16: −1 Suppression +1 Improved Corruption, +0.6%). Succubus sacrificed (+15% Fire), Imp out (Master Demonologist +10% Fire for you and the Imp), Agonizing Flames. Searing Pain filler, Soul Fire during Decimation. Best build while pets were assumed to use 100% of your spell power (rounds 3–15), and best again since round 31 (pet scaling measured in Forever: 10% SP, and Demonic Knowledge now reaches the Imp). Round 71: Death Coil as the finisher on top +0.13% (10,000 fights). Round 74 (user: apply Demonic Brand early): the Brand upkeep near the top of the priority +0.12% (10,000 fights).',
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
    notes: '18/0/33 (new in round 16; hill-climb −2 Improved Bane of Agony +2 Improved Life Tap, +2.6%; rotation search: Bane > CoE > Immolate > Corruption > Conflagrate > Shadowburn > Incinerate, +0.9%). No Demonology: the Succubus fights on her own (base melee + Lash of Pain). Round 30: -2 Improved Corruption +2 Pandemic +0.55% on Human (now its best race; Corruption 0.8 s cast instead of instant) (§18). Round 71: Death Coil as the finisher on top +0.20% (10,000 fights).',
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
    key: 'demo_pact_imp_sb', short: 'Demo Pact Shadow Bolt Imp',
    name: 'Demonology – Pact, Imp out, Shadow Bolt',
    notes: '2/31/18 (round 13: −3 Improved Shadow Bolt +3 Cataclysm). Succubus sacrificed (+15% Fire for Immolate/Soul Fire), Imp out with Improved Imp and Demonic Energies. Shadow Bolt filler. Unchanged in round 16 (best move +0.46%). With full raid buffs + consumables 5/5 Improved Shadow Bolt and no Cataclysm is +1.2% (04_EXPLORATION §11). Round 61 (v52 defaults): -1 Demonic Brand +1 Improved Health Funnel, -1 Suppression +1 Improved Corruption: +0.54% Human (653.61 -> 657.12), +0.59% Undead, 10,000 fights. Brand 2/3 = 4 charges: the Imp spends them before the 10 s brand expires (3/3 lost charges to the timer), so more charges land (64.5 vs 61.8 per fight) and the extra Searing Pains out-damage the Shadow Bolts they replace; Improved Health Funnel itself does nothing (04_EXPLORATION §28). Round 71: Death Coil as the finisher on top +0.28% (10,000 fights). Round 74 (user: apply Demonic Brand early): the Brand upkeep near the top of the priority +0.03% (10,000 fights). Round 82 (2-minute default fight, user): Searing Pain in the execute phase above the Shadow Bolt filler +1.57% (665.82 → 676.25 Undead, 10,000 fights; talents unchanged — no 1–3 point move gains ≥ 0.5%).',
    talents: {
      suppression: 1, improvedCorruption: 1, improvedHealthFunnel: 1,   // round 61: -1 Suppression +1 Improved Corruption; Health Funnel = row-1 filler for the Brand point
      unholyPower: 5, improvedImp: 3, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, masterSummoner: 2,
      decimation: 2, demonicBrand: 2, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      improvedShadowBolt: 2, bane: 5, cataclysm: 3, ruin: 5, agonizingFlames: 3,
    },
    pet: 'imp', sacrifice: 'succubus', oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'searingPainBrand', 'lifeTapPet', 'bane', 'curseOfElements', 'immolate', 'corruption', 'soulFire', 'searingPainExecute', 'lifeTapBelow', 'shadowBolt'],   // round 82: + Searing Pain at execute
    params: { lifeTapBelow: { pct: 60, sec: 10 } },   // round 105 (user): Life Tap below 60% mana with more than 10 s left, +1.43% (10,000 fights)
  },
  {
    key: 'destro_incin_imp', short: 'Destro Incinerate Imp',
    name: 'Destruction – Incinerate, Imp out',
    notes: '14/6/31 (round 16 hill-climb: −3 Unholy Power +3 Pandemic, +0.8%; −1 Demonic Energies +1 Amplify Curse, +0.6%). Incinerate capstone + Shadow and Flame; Imp out with Improved Imp. Round 71: Death Coil as the finisher on top +0.20% (10,000 fights).',
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
    notes: '30/0/21 since round 83 (user: adopt the round 82 search result −3 Improved Corruption +3 Cataclysm, +0.67% at 120 s, 603.95 → 607.98 Human, 10,000 fights); was 33/0/18 (user, round 65): the classic Shadow Mastery / Ruin layout — Suppression, Improved Corruption, Improved Life Tap, Malediction, Pandemic, Malevolence, Nightfall, Siphon Life, Shadow Mastery; Bane, Improved Shadow Bolt, Ruin, Agonizing Flames. No Demonology, so no sacrifice: the Succubus is out (Imp -10%), Spellstone (Firestone -0.8%); Human best. Priority = best of all 720 orders (+0.30% over the starting order, the top 5 within 0.3%); every action pays (without Bane -12.5%, Corruption -7.7%, Curse of the Elements -7.5%, Immolate -3.0%, Siphon Life -1.0%; Shadow Trance action neutral), Shadow Bolt Rank 2 filler -0.3% (Rank 2 since gutted in Forever, removed round 81), Searing Pain -11% (04_EXPLORATION §30). Round 71: Death Coil as the finisher on top +0.47% (10,000 fights).',
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
    notes: '40/0/11 (user, round 77: replaces Wrack DS 1:1). Round 83 (user: adopt the round 82 search result): "Shadow Bolt (max rank) to keep Improved Shadow Bolt up" above Shadow Trance, +4.12% at 120 s (504.05 → 524.85 Human, 10,000 fights) — Wrack stays the filler. Talents: Suppression, Improved Corruption, Malediction, Pandemic, Malevolence, Siphon Life, Nightfall 2, Shadow Mastery, Soul Siphon, Wrack, Improved Bane of Agony 2, Improved Drains 3; Improved Shadow Bolt, Bane, Ruin. No Demonology points: the 11 Demonology points of Wrack DS moved to Improved Bane of Agony, Improved Drains, Bane and Ruin; Succubus out instead of the Imp sacrifice, Spellstone; Bane of Agony only (never Bane of Doom). At the v67 defaults (1,000 fights) Human 499.9 vs Wrack DS 464.2 (Undead), +7.7%. ' +
           'Previous build, Wrack DS — 35/11/5 (user, round 65): Suppression, Improved Corruption, Malediction, Pandemic, Malevolence, Siphon Life, Nightfall, Shadow Mastery, Soul Siphon, Wrack; Fel Vitality, Demonic Embrace, Demonic Aegis, Demonic Sacrifice; Improved Shadow Bolt. Imp sacrificed (+15% Shadow), no pet out, Spellstone; Undead best (Human within 0.2%). Wrack checked first: 36 + 14.3% SP per second for 6 s, 200 mana, +10% on Corruption and Bane of Agony while it channels (the spell data lists only those two; the tooltip says "other Shadow damage over time effects" — with Siphon Life +0.43%, with Bane of Doom too +1.21%). Priority = best of all 720 orders (+0.39%, top 5 within 0.1%); without Bane -19.2%, Corruption -15.9%, Curse of the Elements -8.7%, Shadow Trance -3.6%, Siphon Life -3.3%, Immolate -2.8%; Drain Life filler -5.6%. Wrack is the weakest filler of this build: Shadow Bolt instead +5.4%, Wrack with "keep ISB up" above it +4.4% (04_EXPLORATION §30). Round 71: Death Coil as the finisher on top +0.18% (10,000 fights).',
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
