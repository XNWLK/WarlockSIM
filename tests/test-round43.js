// Round 43 tests: talent spell modifiers add up within their modifier group (Wowhead Forever effect types, A68):
// op0 "Modifies Damage/Healing Done" (direct hits) and op22 "Modifies Periodic Damage/Healing Done" (ticks); the groups
// and the auras (Demonic Sacrifice, Master Demonologist, Soul Link, CoE, Power Infusion, ISB, …) multiply.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t, extra) {
    var b = { key: 't43', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot };
    if (extra) for (var k in extra) b[k] = extra[k];
    return b;
  }

  T.run('round 43: additive talent spell modifiers', function () {
    T.group('spell table: same modifier group adds, auras multiply');
    var c = det();
    var b = tb(['shadowBolt'], { shadowMastery: 5, agonizingFlames: 3, malediction: 5, improvedCorruption: 5, aftermath: 5 });
    var st = WL.computeStats(b, 'human', c), t = WL.buildSpellTable(b, st, c);
    T.near(st.mult.shadow, 1, 1e-12, 'stats.mult.shadow holds only auras (no Shadow Mastery) → 1 without Demonic Sacrifice / Master Demonologist');
    T.near(t.shadowBolt.directMult, 1 + 0.05 + 0.10, 1e-12, 'Shadow Bolt: 1 + Shadow Mastery 5% + Agonizing Flames 10% = 1.15 (was 1.05 × 1.10 = 1.155)');
    T.near(t.corruption.periodicMult, 1 + 0.05 + 0.05 + 0.10, 1e-12, 'Corruption ticks: 1 + SM 5% + Malediction 5% + Improved Corruption 10% = 1.20 (was 1.2128)');
    T.near(t.immolate.directMult, 1 + 0.10 + 0.50, 1e-12, 'Immolate hit: 1 + Agonizing Flames 10% + Aftermath 50% = 1.60 (was 1.65)');
    T.near(t.immolate.periodicMult, 1 + 0.10 + 0.05, 1e-12, 'Immolate ticks: 1 + Agonizing Flames 10% + Malediction 5% (no Aftermath on ticks)');
    T.near(t.searingPain.directMult, 1.10, 1e-12, 'Searing Pain: Agonizing Flames only (no Shadow Mastery on Fire)');
    var bd = tb(['shadowBolt'], { shadowMastery: 5, demonicSacrifice: 1 }, { sacrifice: 'imp' });
    var td = WL.buildSpellTable(bd, WL.computeStats(bd, 'human', c), c);
    T.near(td.shadowBolt.directMult, 1.15 * 1.05, 1e-12, 'Demonic Sacrifice (aura, "Mod Damage Done %") still multiplies: 1.15 × (1 + SM 5%)');

    T.group('Decimation adds to the direct group (Shadow Bolt / Searing Pain below 35%)');
    // SM 5% + Agonizing Flames 10% so the old rule (× 1.06) and the new one (× 1.0522) are far enough apart to tell.
    var dec = WL.simulateOnce(tb(['shadowBolt'], { shadowMastery: 5, agonizingFlames: 3, decimation: 2 }), 'human', det(), { duration: 60, log: true });
    var hits = dec.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; });
    var pre = hits.filter(function (e) { return e.t < 60 * 0.65 - 3; })[0].dmg, post = hits[hits.length - 1].dmg;
    T.near(post / pre, (1 + 0.15 + 0.06) / 1.15, 0.003, 'execute Shadow Bolt ×' + (post / pre).toFixed(4) + ' = (1 + SM 5% + AgF 10% + Decimation 6%) / 1.15 = 1.0522 (old rule 1.06)');

    T.group('Eureka! adds to the group of each hit / tick');
    var g = det(function (x) { x.options.eurekaPolicy = 'any'; });
    var bg = tb(['corruption', 'shadowBolt'], { shadowMastery: 5, malediction: 5, improvedCorruption: 5, agonizingFlames: 3 });
    var eg = WL.simulateOnce(bg, 'gnome', g, { duration: 60, log: true });
    var ivs = (eg.auras && eg.auras.eureka) || [];
    var inE = function (tt) { return ivs.some(function (v) { return tt > v[0] + 1e-6 && tt < v[1] - 1e-6; }); };
    var outE = function (tt) { return !ivs.some(function (v) { return tt >= v[0] - 1e-6 && tt <= v[1] + 1e-6; }); };
    var ticks = eg.log.filter(function (e) { return e.type === 'tick' && e.spell === 'corruption'; });
    var ti = ticks.filter(function (e) { return inE(e.t); }), to = ticks.filter(function (e) { return outE(e.t); });
    T.ok(ti.length > 0 && to.length > 0, 'Corruption ticks inside (' + ti.length + ') and outside (' + to.length + ') the Eureka! aura');
    T.near(ti[0].dmg / to[0].dmg, 1, 0.006, 'tick × ' + (ti[0].dmg / to[0].dmg).toFixed(4) + ' = 1: DoT ticks get no Eureka! since round 80 (rounds 43–79: (1 + 20% + 10%) / 1.20)');
    var sb = eg.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; });
    var si = sb.filter(function (e) { return inE(e.t - 1e-3) || ivs.some(function (v) { return Math.abs(e.t - v[1]) < 1e-6; }); }), so = sb.filter(function (e) { return outE(e.t); });
    T.ok(si.length > 0 && so.length > 0, 'Shadow Bolts inside (' + si.length + ') and outside (' + so.length + ') the aura');
    T.near(si[0].dmg / so[0].dmg, (1 + 0.15 + 0.10) / 1.15, 0.004, 'Shadow Bolt × ' + (si[0].dmg / so[0].dmg).toFixed(4) + ' = (1 + SM 5% + AgF 10% + Eureka! 10%) / 1.15 = 1.0870 (old rule 1.10)');
    var hb = WL.simulateOnce(tb(['corruption', 'shadowBolt'], {}), 'gnome', g, { duration: 60, log: true });
    var hv = (hb.auras && hb.auras.eureka) || [], htk = hb.log.filter(function (e) { return e.type === 'tick' && e.spell === 'corruption'; });
    var a1 = htk.filter(function (e) { return hv.some(function (v) { return e.t > v[0] + 1e-6 && e.t < v[1] - 1e-6; }); })[0];
    var a0 = htk.filter(function (e) { return !hv.some(function (v) { return e.t >= v[0] - 1e-6 && e.t <= v[1] + 1e-6; }); })[0];
    T.near(a1.dmg / a0.dmg, 1, 0.006, 'without other modifiers: a DoT tick is unchanged too (round 80)');
  });
})();
