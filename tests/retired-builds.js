// Builds that were on the sheet until round 110 (user: taken off the sheet). Kept here, exactly as they were, because
// tests of earlier rounds use them (drain filler, Demonic Brand upkeep, filler talents, Life Tap settings …).
// WL.findBuild(key): a build of the sheet, else one of these.
window.WL = window.WL || {};

WL.RETIRED_BUILDS = [
  {
    key: 'aff_pact_fire', short: 'Aff Pact Fire Imp',
    name: 'Affliction/Demonology – Pact, Imp out, Fire',
    notes: '15/31/5 (round 10). Suppression, Pandemic and Malediction with the Imp Pact tree. Searing Pain filler. Unchanged in round 16 (local optimum). Round 71: Death Coil as the finisher on top +0.22% (10,000 fights). Round 74 (user: apply Demonic Brand early): the Brand upkeep near the top of the priority +0.16% (10,000 fights).',
    talents: {
      suppression: 5, improvedCorruption: 2, improvedLifeTap: 2, malediction: 3, pandemic: 3,
      unholyPower: 5, improvedImp: 3, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, masterSummoner: 2,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      bane: 5,
    },
    pet: 'imp', sacrifice: 'succubus', oil: 'firestone',
    rotation: ['deathCoilFinisher', 'bane', 'searingPainBrand', 'curseOfElements', 'corruption', 'immolate', 'lifeTapPet', 'soulFire', 'lifeTapBelow', 'searingPain'],
    params: { lifeTapBelow: { pct: 80, sec: 45 } },   // round 105 (user): Life Tap below 80% mana with more than 45 s left, +0.93% (10,000 fights)
  },
  {
    key: 'demo_pact_succ_fire', short: 'Demo Pact Fire Succubus',
    name: 'Demonology – Pact, Succubus out, Searing Pain',
    notes: '2/31/18 (new in round 16; hill-climb −2 Improved Shadow Bolt +2 Aftermath, +0.7%). Same Succubus Pact tree with a Fire filler: Searing Pain keeps Demonic Brand up by itself, Firestone. Round 25: Soul Fire during Decimation added before the filler (+1.8%, 10,000 fights). Round 71: Death Coil as the finisher on top +0.18% (10,000 fights). Round 74 (user: apply Demonic Brand early): the Brand upkeep near the top of the priority +0.09% (10,000 fights).',
    talents: {
      suppression: 1, improvedCorruption: 1,
      unholyPower: 5, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, improvedSayaad: 3, masterSummoner: 2,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
      bane: 5, cataclysm: 3, aftermath: 2, ruin: 5, agonizingFlames: 3,
    },
    pet: 'succubus', sacrifice: 'imp', oil: 'firestone',
    rotation: ['deathCoilFinisher', 'bane', 'searingPainBrand', 'curseOfElements', 'immolate', 'corruption', 'soulFire', 'lifeTapBelow', 'searingPain'],   // round 25: + Soul Fire during Decimation (+1.8%)
    params: { lifeTapBelow: { pct: 70, sec: 45 } },   // round 105 (user): Life Tap early; round 109 (search redone after the cooldown fix): 70% / 45 s, +0.93% (was 80% / 60 s, +0.76%)
  },
  {
    key: 'aff_pact_succ_drain', short: 'Aff Pact Drain Life Succubus',
    name: 'Affliction/Demonology – Pact, Succubus out, Drain Life',
    notes: '20/31/0 (new in round 24, user: drain-filler builds). Improved Drains 3/3, Pandemic, Nightfall (instant Shadow Bolts via Shadow Trance), Malediction, Improved Life Tap with the Succubus Pact tree; Drain Life filler. Hill-climbed from a 20/31/0 start (−1 Improved Bane of Agony +1 Improved Corruption, −2 Malevolence +2 Improved Life Tap); rotation order within 0.1% of the best of 720. About 13% behind the Shadow Bolt builds: Drain Life does ~210 damage per cast-second vs ~490 for Shadow Bolt, even with Improved Drains. Deep-Affliction Wrack builds are 23–29% behind (04_EXPLORATION §13). Round 71: Death Coil as the finisher on top +0.17% (10,000 fights). Round 82 (2-minute default fight, user): Searing Pain in the execute phase above Soul Fire +1.35% (587.98 → 595.92 Human, 10,000 fights); best race now Undead.',
    talents: {
      suppression: 5, improvedCorruption: 1, improvedLifeTap: 2, improvedDrains: 3, malediction: 2, pandemic: 3, amplifyCurse: 1, nightfall: 2, malevolence: 1,
      unholyPower: 5, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, improvedSayaad: 3, masterSummoner: 2,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1,
    },
    pet: 'succubus', sacrifice: 'imp', oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'shadowTrance', 'searingPainBrand', 'corruption', 'immolate', 'searingPainExecute', 'soulFire', 'lifeTapBelow', 'drainLife'],   // round 25: + Soul Fire during Decimation (+1.1%); round 82: + Searing Pain at execute
    params: { lifeTapBelow: { pct: 60, sec: 10 } },   // round 105 (user): Life Tap below 60% mana with more than 10 s left, +0.60% (10,000 fights)
  },
  {
    key: 'aff_succ_sb', short: 'Aff Shadow Bolt Succubus',
    name: 'Affliction (25 points) – Succubus out, Shadow Bolt',
    notes: '25/24/2 (new in round 28, user: always show the best build with at least 25 Affliction points). Best of 24 starting builds (25/26/0, 30/21/0, 31/20/0 Wrack, 30/0/21, 40/11/0 families; Shadow Bolt / Wrack / Searing Pain fillers — Drain Life fillers lost in round 24; Succubus / Imp / sacrifice) after hill-climbs kept at >= 25 Affliction points (04_EXPLORATION §16): the climb from 30/21/0 moved Shadow Mastery out into Demonic Knowledge, Soul Link and Bane (moves >= +0.5% only). No Demonic Pact (needs 31 Demonology), so no sacrifice: the Succubus is out with Improved Sayaad, Demonic Brand, Soul Link and Demonic Knowledge. About 13% behind the best build. Every action pays (without Siphon Life -1.4%, Soul Fire -0.6%); best of 720 priority orders +0.37% (kept); Spellstone > Firestone. Round 29 (user checks, 10,000 fights): Master Summoner / Demonic Energies -> Demonic Embrace give identical DPS (none of the three adds damage; the Succubus never runs out of mana, so Demonic Energies does nothing here — the points are only row-gate fillers; Embrace is +0.01% per point for Undead via Touch of the Grave); Bane 2 -> Shadow Mastery 2 -0.74%, -> Soul Siphon 3/3 -1.74% (drains only). Round 30 (user): Master Summoner 1 -> Demonic Embrace, Demonic Energies 2 -> 1 (+1 Embrace) adopted anyway — same DPS, more Stamina (and slightly more Touch of the Grave for Undead). Round 61 (v52 defaults): -1 Soul Siphon (it only helps drains) -1 Improved Corruption +2 Malevolence (5/5): +0.51% Undead (598.60 -> 601.67), +0.49% Human, 10,000 fights (04_EXPLORATION §28). Round 71: Death Coil as the finisher on top +0.39% (10,000 fights). Round 82 (2-minute default fight, user): Searing Pain in the execute phase above the Shadow Bolt filler +0.53% (595.17 → 598.33 Undead, 10,000 fights).',
    talents: {
      suppression: 5, improvedCorruption: 4, improvedLifeTap: 2, malediction: 5, pandemic: 3, malevolence: 5, siphonLife: 1,   // round 61: -1 Soul Siphon -1 Improved Corruption +2 Malevolence
      unholyPower: 5, demonicEmbrace: 2, felVitality: 3, demonicEnergies: 1, improvedSayaad: 3, demonicSacrifice: 1,
      decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3,
      bane: 2,
    },
    pet: 'succubus', sacrifice: null, oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'bane', 'curseOfElements', 'searingPainBrand', 'corruption', 'siphonLife', 'immolate', 'soulFire', 'searingPainExecute', 'lifeTapBelow', 'shadowBolt'],   // round 82: + Searing Pain at execute
    params: { lifeTapBelow: { pct: 60, sec: 10 } },   // round 105 (user): Life Tap below 60% mana with more than 10 s left, +0.84% (10,000 fights)
  },
  {
    key: 'ds_ruin_classic', short: 'DS Ruin (classic)',
    name: 'DS Ruin (classic) – Demonic Sacrifice (Imp) / Destruction, Shadow Bolt',
    notes: '22/11/18; round 83 (user: adopt the round 82 search result −2 Improved Corruption +2 Improved Life Tap, +1.20% at 120 s, 565.60 → 572.37 Human, 10,000 fights). Round 65 (user): the classic Demonic Sacrifice / Ruin layout — Suppression, Improved Corruption, Malediction 2, Pandemic, Nightfall, Malevolence; Demonic Embrace, Fel Vitality, Demonic Aegis, Demonic Sacrifice; Bane, Improved Shadow Bolt, Ruin, Agonizing Flames. Imp sacrificed (+15% Shadow; Succubus sacrifice +15% Fire is -10%), no pet out, Spellstone; Human best. Priority = best of all 120 orders (+0.35%); without Bane -14.8%, Corruption -9.1%, Curse of the Elements -8.4%, Immolate -2.3%, Shadow Trance neutral; Searing Pain filler -17.5%. Shadow Bolt Rank 2 filler +1.1% if Forever had no low-rank penalty (A70) — not used; Rank 2 since gutted in Forever, removed round 81 (04_EXPLORATION §30). Round 71: Death Coil as the finisher on top +0.50% (10,000 fights).',
    talents: {
      suppression: 5, improvedCorruption: 3, improvedLifeTap: 2, malediction: 2, pandemic: 3, nightfall: 2, malevolence: 5,   // round 82/83: −2 Improved Corruption +2 Improved Life Tap
      demonicEmbrace: 5, felVitality: 3, demonicAegis: 2, demonicSacrifice: 1,
      bane: 5, improvedShadowBolt: 5, ruin: 5, agonizingFlames: 3,
    },
    pet: null, sacrifice: 'imp', oil: 'spellstone',
    rotation: ['deathCoilFinisher', 'bane', 'corruption', 'immolate', 'shadowTrance', 'curseOfElements', 'lifeTapBelow', 'shadowBolt'],
    params: { lifeTapBelow: { pct: 50, sec: 25 } },   // round 105 (user): Life Tap below 50% mana with more than 25 s left, +0.37% (10,000 fights)
  },
];

WL.findBuild = function (key) {
  return WL.BUILDS.concat(WL.RETIRED_BUILDS).filter(function (b) { return b.key === key; })[0];
};
