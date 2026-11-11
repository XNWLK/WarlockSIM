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
// Round 160 (user): Aff Pact Shadow Bolt Succubus taken off too (Demo Pact Shadow Bolt Succubus does the same job) — six builds
// remain; it joined the fixtures. "SM Ruin (classic)" is now "SM Ruin" (key unchanged).
// Round 166 (user: "delete destro incinerate imp because it performs worse than succubus"): five builds remain; it joined the fixtures.
// Round 186 (user): SM Ruin deleted; Wrack Succubus replaced by Wrack DS (the user's code, Imp sacrificed); Incinerate DS added
// (the user's code, Succubus sacrificed). Five builds; SM Ruin and Wrack Succubus joined the fixtures.
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
    key: 'demo_pact_succ_sb', short: 'Shadow Demo',   // round 191 (user): was 'Demo Pact Shadow Bolt Succubus'; the key stays
    name: 'Demonology – Pact, Succubus out, Shadow Bolt',
    notes: '2/31/18. Imp sacrificed (+15% Shadow, kept by Demonic Pact) with the Succubus out: Master Demonologist gives +10% Shadow to you and to her, and she adds Lash of Pain, melee and the Demonic Brand bonus. Searing Pain keeps Demonic Brand up, Shadow Bolt is the filler with 5/5 Improved Shadow Bolt, Death Coil finishes the fight.',
    talents: {
      suppression: 1, improvedCorruption: 1,   // round 61: -1 Improved Life Tap +1 Suppression (round 30 had moved it the other way)
      demonicEmbrace: 3,   // round 197 (user): −2 Master Summoner +2 Demonic Embrace (+6% Stamina; Master Summoner does nothing in a fight); round 198 (user): −1 Demonic Energies +1 Demonic Embrace (no DPS change). Demonic Brand stays 3: at 2 (4 charges) the Succubus spends the brand sooner, −1.4%
      unholyPower: 5, felVitality: 3, demonicEnergies: 1, demonicSacrifice: 1, improvedSayaad: 3,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      improvedShadowBolt: 5, bane: 5, ruin: 5, agonizingFlames: 3,   // round 61: -3 Cataclysm +3 Improved Shadow Bolt
    },
    pet: 'succubus', sacrifice: 'imp', oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'searingPainBrand', 'immolate', 'corruption', 'lifeTapNeed', 'shadowBolt'],
    params: { lifeTapNeed: { pct: 80, sec: 45 } },   // round 168 (user): Life Tap only when the rest of the fight needs it and no free mana is ready, same numbers (default settings ±0.00%, max buffs +0.1 … +5.9%). Round 105 (user): Life Tap below 80% mana with more than 45 s left, +0.59% (10,000 fights)
  },
  {
    key: 'demo_pact_fire', short: 'Fire Demo',   // round 191 (user): was 'Demo Pact Fire Imp'; the key stays
    name: 'Demonology – Pact, Imp out, Fire',
    notes: '2/31/18. Succubus sacrificed (+15% Fire, kept by Demonic Pact) with the Imp out: Master Demonologist gives +10% Fire to you and to the Imp. Searing Pain is the filler and keeps Demonic Brand up by itself; Soul Fire is cast in the execute phase (Decimation). Aftermath and Agonizing Flames strengthen Immolate and Searing Pain, and Life Tap also refills the Imp (Demonic Energies).',
    talents: {
      suppression: 1, improvedCorruption: 1,
      demonicEmbrace: 4,   // round 197 (user): −2 Master Summoner +2 Demonic Embrace; round 198 (user): −1 Demonic Brand −1 Demonic Energies +2 Demonic Embrace
      unholyPower: 5, improvedImp: 3, felVitality: 3, demonicEnergies: 1, demonicSacrifice: 1,
      decimation: 2, demonicBrand: 2, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      bane: 5, aftermath: 5, ruin: 5, agonizingFlames: 3,
    },
    pet: 'imp', sacrifice: 'succubus', oil: 'firestone',
    rotation: ['deathCoilFinisher', 'searingPainBrand', 'lifeTapPet', 'bane', 'curseOfElements', 'immolate', 'soulFire', 'corruption', 'lifeTapNeed', 'searingPain'],
    params: { lifeTapNeed: { pct: 80, sec: 45 } },   // round 168 (user): Life Tap only when the rest of the fight needs it and no free mana is ready, same numbers (default settings ±0.00%, max buffs +0.1 … +5.9%). Round 105 (user): Life Tap below 80% mana with more than 45 s left, +0.95% (10,000 fights)
  },
  {
    key: 'destro_incin_succ', short: 'Incinerate Pandemic',   // round 191 (user): was 'Destro Incinerate Succubus'; the key stays
    name: 'Destruction – Incinerate, Succubus out',
    notes: '14/4/33. Incinerate with Shadow and Flame, Conflagrate and Shadowburn; the Affliction points go to Suppression, Improved Corruption, Pandemic, Improved Life Tap and Amplify Curse. Four points in Unholy Power make the Succubus hit harder; she fights on her own (melee and Lash of Pain). With a second target, Bane of Havoc copies part of your damage to it.',
    talents: {
      suppression: 5, improvedCorruption: 3, pandemic: 3, improvedLifeTap: 2, amplifyCurse: 1, unholyPower: 4,   // round 149 (user; patch 2026-10-16: Malediction gone): −5 Malediction +1 Amplify Curse +4 Unholy Power
      bane: 5, cataclysm: 3, aftermath: 5, ruin: 5, shadowburn: 1, agonizingFlames: 3, conflagrate: 1,
      baneOfHavoc: 1, fireAndBrimstone: 3, shadowAndFlame: 5, incinerate: 1,
    },
    pet: 'succubus', sacrifice: null, oil: 'firestone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'immolate', 'corruption', 'conflagrate', 'shadowburn', 'lifeTapNeed', 'incinerate'],
    params: { lifeTapNeed: { pct: 50, sec: 25 } },   // round 168 (user): Life Tap only when the rest of the fight needs it and no free mana is ready, same numbers (default settings ±0.00%, max buffs +0.1 … +5.9%). Round 105 (user): Life Tap below 50% mana with more than 25 s left, +0.36% (10,000 fights)
  },
  {
    key: 'destro_incin_ds', short: 'Incinerate DS',
    name: 'Destruction – Incinerate, Succubus sacrificed',
    notes: '7/11/33. Incinerate with Shadow and Flame, Conflagrate and Shadowburn, and the Succubus sacrificed for +15% Fire (Demonic Sacrifice): no demon in the fight. Demonic Embrace, Fel Vitality and Demonic Aegis lead to Demonic Sacrifice; Suppression and Improved Corruption on the Affliction side. With a second target, Bane of Havoc copies part of your damage to it.',
    talents: {
      suppression: 5, improvedCorruption: 2,
      demonicEmbrace: 5, felVitality: 3, demonicAegis: 2, demonicSacrifice: 1,
      bane: 5, cataclysm: 3, aftermath: 5, ruin: 5, shadowburn: 1, agonizingFlames: 3, conflagrate: 1,
      baneOfHavoc: 1, fireAndBrimstone: 3, shadowAndFlame: 5, incinerate: 1,
    },
    pet: null, sacrifice: 'succubus', oil: 'firestone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'immolate', 'corruption', 'conflagrate', 'shadowburn', 'lifeTapNeed', 'incinerate'],
    params: { lifeTapNeed: { pct: 50, sec: 25 } },
  },
  {
    key: 'wrack_ds', short: 'Wrack DS',
    name: 'Wrack DS – Affliction (Wrack), Imp sacrificed',
    notes: '35/11/5. Deep Affliction with Wrack as the filler and the Imp sacrificed for +15% Shadow (Demonic Sacrifice): no demon in the fight. While Wrack channels, Corruption, Bane of Agony and Siphon Life tick twice as often, and those three are what Soul Siphon counts, so all three are kept up (Bane of Agony, never Bane of Doom). A Nightfall proc is held for 2 seconds so it does not cut a Wrack short. Life Tap comes right after a full Wrack, when the 5-second rule is already over, and only when the rest of the fight needs the mana. Suppression, Improved Corruption, Improved Life Tap, Pandemic, Amplify Curse, Malevolence, Siphon Life, Nightfall, Shadow Mastery, Soul Siphon and Improved Bane of Agony; Demonic Embrace, Fel Vitality and Demonic Aegis lead to Demonic Sacrifice; Improved Shadow Bolt for the Shadow Trance bolts.',
    talents: {
      suppression: 5, improvedCorruption: 5, improvedLifeTap: 2, pandemic: 3, amplifyCurse: 1, malevolence: 5, siphonLife: 1, nightfall: 2,
      shadowMastery: 5, soulSiphon: 3, wrack: 1, improvedBaneOfAgony: 2,
      demonicEmbrace: 5, felVitality: 3, demonicAegis: 2, demonicSacrifice: 1,
      improvedShadowBolt: 5,
    },
    pet: null, sacrifice: 'imp', oil: 'spellstone',
    // Round 186 (user: find the best rotation global by global): the user's order + Siphon Life after Corruption (+0.3%), Life Tap
    // below 40% (was 60%) and only right after a full Wrack — 6 s after the last mana spent, when Spirit regeneration starts at
    // once (+0.7%); 664.9 → 672.8 Undead, 10,000 fights. The decision search found nothing else that repeats (04_EXPLORATION §63).
    // Round 187 (user: "remove siphon life from wrack DS. it might be good at the default values but becomes worse very quickly"):
    // Siphon Life taken out of the priority (talent kept: Wrack needs it). Measured: +3.6% at gear level 0, +0.6% at the default
    // gear, +0.3% at levels 4–7 (Build Scaling levels, 10,000 fights) — its share shrinks with gear; the user's call.
    // Patch of 2026-11-10 (Soul Siphon counts only Corruption, Bane of Agony and Siphon Life; Wrack makes them tick twice as fast):
    // Bane of Agony instead of Bane of Doom and Siphon Life back in: +16.6% over the old priority at the default gear,
    // +17 to +21% at Build Scaling levels 0-7 (3,000 fights, Undead).
    // Round 200 (user chose it; +0.27 … +0.39% on 4 test sets of 10,000 fights: default gear, a second seed, 250 SP, 1000 SP):
    // a Shadow Trance proc is used only once it has 8 s or less left, so a proc during Wrack does not cut the channel at once
    // (the DoTs tick twice as fast only while Wrack channels), and Corruption comes before Bane of Agony.
    rotation: ['deathCoilFinisher', 'corruption', 'baneOfAgony', 'shadowTrance', 'siphonLife', 'curseOfElements', 'lifeTapNeed', 'wrack'],
    actWhen: { lifeTapNeed: { t: 'fsr', op: '>=', v: 6 }, shadowTrance: { t: 'aura', aura: 'shadowTrance', op: '<=', v: 8 } },
    params: { lifeTapNeed: { pct: 40, sec: 25 } },
  },
];
