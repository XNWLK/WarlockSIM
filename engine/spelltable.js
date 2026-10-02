// Per-spell static values for one build + race: cast time, cost, crit chance, crit multiplier, damage multipliers.
// "Static" = does not change during the fight. Dynamic modifiers (CoE, ISB, Wrack, Shadow and Flame, Blood Fury,
// Berserking, Eureka, Decimation, Soul Siphon, Incinerate-vs-Immolate) are applied in engine/sim.js.
window.WL = window.WL || {};

WL.buildSpellTable = function (build, stats, cfg) {
  var tv = function (k, f) { return WL.talentValue(build, k, f); };
  var table = {}, SPELLS = WL.spellsFor(cfg);             // trainer ranks, or AQ20 book ranks (round 42)
  Object.keys(SPELLS).forEach(function (key) {
    var s = SPELLS[key];
    if (s.talent && !build.talents[s.talent]) return;       // untalented spell not available
    var e = { key: key, spell: s, notes: [] };

    // Cast time (before haste).
    var cast = s.cast || 0;
    if (WL.isShadowBolt(key) || key === 'immolate' || key === 'incinerate') cast -= tv('bane', 'castRed');   // Bane: Shadow Bolt, Immolate, Incinerate
    if (key === 'soulFire') cast -= tv('bane', 'sfCastRed');
    if (key === 'corruption') cast -= tv('improvedCorruption', 'castRed');
    e.cast = Math.max(0, +cast.toFixed(3));

    // Cooldown.
    e.cd = s.cd || 0;
    if (key === 'soulFire' && tv('decimation')) e.cd = s.cd * (1 - tv('decimation', 'sfCdRedPct') / 100);

    // Mana cost. Cataclysm: Destruction spells. [talent text]
    e.cost = s.cost || 0;
    if (s.tree === 'destruction' && tv('cataclysm')) e.cost *= 1 - tv('cataclysm', 'costRedPct') / 100;

    // Spell power for this spell's school.
    e.sp = stats.sp + (stats.schoolSp[s.school] || 0);

    // Crit chance.
    e.critPct = stats.critPct;
    if (s.school === 'shadow' && !cfg.gear.critIncludesAll) e.critPct += tv('malevolence', 'shadowCritPct');  // already in the sheet total otherwise
    if (key === 'searingPain') e.critPct += tv('agonizingFlames', 'spCritPct');
    if (key === 'conflagrate') e.critPct += tv('fireAndBrimstone', 'conflagCritPct');

    // Crit multiplier: base bonus 50% [A06], raised by Ruin (Destruction spells) and Pandemic (listed spells).
    var bonus = cfg.combat.critMultiplier - 1, bonusPct = 0;
    if (s.tree === 'destruction') bonusPct += tv('ruin', 'critBonusPct');
    if (WL.PANDEMIC_SPELLS.indexOf(key) >= 0) bonusPct += tv('pandemic', 'critBonusPct');
    e.critMult = 1 + bonus * (1 + bonusPct / 100);

    // Static damage multipliers (round 43, A16 / A68 — from the talents' effect types on Wowhead Forever):
    //  * auras ("Mod Damage Done %": Demonic Sacrifice, Master Demonologist, Soul Link) multiply;
    //  * talent spell modifiers ADD UP within their modifier group and the groups multiply with the auras:
    //    op0  "Modifies Damage/Healing Done" (direct hits):  Shadow Mastery (Shadow spells), Agonizing Flames
    //         (Destruction spells), Aftermath (Immolate); live in the sim: Decimation, Eureka!
    //    op22 "Modifies Periodic Damage/Healing Done" (ticks): Shadow Mastery, Agonizing Flames (Immolate), Malediction
    //         (all periodic), Improved Corruption, Improved Bane of Agony, Improved Drains; live: Eureka!
    //  Until round 42 every one of them multiplied.
    var aura = (stats.mult[s.school] || 1) * stats.mult.all;
    var sm = s.school === 'shadow' ? tv('shadowMastery', 'shadowPct') : 0;
    var agf = s.tree === 'destruction' ? tv('agonizingFlames', 'dmgPct') : 0;
    var op0 = sm + agf + (key === 'immolate' ? tv('aftermath', 'immoInitPct') : 0);
    var op22 = sm + agf + tv('malediction', 'periodicPct')                                   // Malediction [A41]
      + (key === 'corruption' ? tv('improvedCorruption', 'dmgPct') : 0)
      + (key === 'baneOfAgony' ? tv('improvedBaneOfAgony', 'dmgPct') : 0)
      + (s.drain ? tv('improvedDrains', 'dmgPct') : 0);
    e.op0 = op0 / 100; e.op22 = op22 / 100;                   // kept for the live additive effects (Decimation, Eureka!)
    e.directMult = aura * (1 + e.op0);
    e.periodicMult = aura * (1 + e.op22);

    // Pre-computed un-crit, un-buffed damage (for display and tests).
    if (s.base != null) e.directDmg = (s.base + s.coef * e.sp) * e.directMult;
    if (s.tickBase != null) {
      e.ticks = Math.round(s.duration / s.tickEvery);
      e.tickDmg = (s.tickBase + s.tickCoef * e.sp) * e.periodicMult;   // average tick (BoA ramp applied per tick in sim)
    }
    table[key] = e;
  });
  return table;
};
