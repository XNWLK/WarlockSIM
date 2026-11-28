// Round 275 tests — the user, 2026-11-28: "yes do it and recheck decimation points". Public evidence notes of live-realm
// combat logs (Forever 1.60.1.70338–71139, 2026-10-10 … 11-25): Decimation's damage bonus for Shadow Bolt and Searing
// Pain applies at ANY target health (Searing Pain below 35% vs at 40%+: ratio 0.996 [0.990, 1.003] over 6 warlocks; a
// 35% gate would read 1.06). Size kept at the talent's 3 / 6%, added to the direct (op0) talent group as before (round 43).
// The 10 s buff (Soul Fire −40% cast, no shard) is not covered by the notes and stays gated at fight.executePct. [A23]
(function () {
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.critPct -= 2;
    c.gear.pierce = 0; c.gear.hastePct = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull';
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't275', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function hits(r, k) { return r.log.filter(function (e) { return e.type === 'hit' && e.spell === k; }); }
  function bld(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }

  T.run('round 275: Decimation\'s damage at any boss health', function () {
    var c = det(), cut = 60 * (1 - c.fight.executePct / 100);

    T.group('Searing Pain and Shadow Bolt at 100% boss health');
    var sp2 = WL.simulateOnce(tb(['searingPain'], { decimation: 2 }), 'human', c, { seed: 1, duration: 60, log: true });
    var sp0 = WL.simulateOnce(tb(['searingPain']), 'human', c, { seed: 1, duration: 60, log: true });
    var a = hits(sp2, 'searingPain'), b = hits(sp0, 'searingPain');
    T.ok(a.length > 5 && a[0].t < cut && b[0].t < cut, 'the first Searing Pain lands at ' + (a[0] && a[0].t.toFixed(2)) + ' s, long before the execute phase (' + cut + ' s)');
    T.near(a[0].dmg / b[0].dmg, 1.06, 0.002, 'Decimation 2/2: the first Searing Pain deals ×' + (a[0].dmg / b[0].dmg).toFixed(4) + ' (+6%, no other talent in its group)');
    var sp1 = WL.simulateOnce(tb(['searingPain'], { decimation: 1 }), 'human', c, { seed: 1, duration: 60, log: true });
    T.near(hits(sp1, 'searingPain')[0].dmg / b[0].dmg, 1.03, 0.002, 'Decimation 1/2: +3%');
    var sb2 = WL.simulateOnce(tb(['shadowBolt'], { shadowMastery: 5, decimation: 2 }), 'human', c, { seed: 1, duration: 60, log: true });
    var sb0 = WL.simulateOnce(tb(['shadowBolt'], { shadowMastery: 5 }), 'human', c, { seed: 1, duration: 60, log: true });
    var s2 = hits(sb2, 'shadowBolt'), s0 = hits(sb0, 'shadowBolt');
    T.near(s2[0].dmg / s0[0].dmg, 1.16 / 1.10, 0.002, 'Shadow Bolt with Shadow Mastery 10%: ×' + (s2[0].dmg / s0[0].dmg).toFixed(4) + ' = (1 + 10% + 6%) / 1.10 (added to the group, round 43)');
    T.near(s2[s2.length - 1].dmg / s2[0].dmg, s0[s0.length - 1].dmg / s0[0].dmg, 0.002, 'the execute-phase bolt gains nothing more than the first one');
    var dps2 = WL.simulate(tb(['searingPain'], { decimation: 2 }), 'human', c, { iterations: 30, log: false }), dps0 = WL.simulate(tb(['searingPain']), 'human', c, { iterations: 30, log: false });
    T.near(dps2.dpsPre / dps0.dpsPre, 1.06, 0.01, 'above 35% the DPS rises ×' + (dps2.dpsPre / dps0.dpsPre).toFixed(3) + ' (was ×1.00 before this round)');

    T.group('the Soul Fire buff only below the execute threshold');
    var sf = WL.simulateOnce(tb(['soulFire', 'searingPain'], { decimation: 2 }), 'human', c, { seed: 1, duration: 60, log: true });
    var iv = (sf.auras && sf.auras.decimation) || [];
    T.ok(iv.length > 0, iv.length + ' Decimation buff interval(s) in a 60 s fight');
    T.ok(iv.every(function (v) { return v[0] >= cut - 1e-6; }), 'every one starts in the execute phase (first at ' + (iv[0] && iv[0][0].toFixed(2)) + ' s, threshold ' + cut + ' s)');
    var sfc = sf.log.filter(function (e) { return e.type === 'cast' && e.spell === 'soulFire'; });
    T.ok(sfc.length > 0 && sfc.every(function (e) { return e.t >= cut - 1e-6; }), sfc.length + ' Soul Fires, all in the execute phase (no shards outside Decimation with this action)');

    T.group('builds without Decimation: unchanged');
    var D = WL.TALENT_BY_KEY.decimation.v, keep = D.dmgPct;
    WL.BUILDS.filter(function (x) { return !x.custom && !x.talents.decimation; }).forEach(function (x) {
      var cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), r1, r2;
      try { D.dmgPct = [50, 50]; r1 = WL.simulateOnce(bld(x.key), 'orc', cfg, { seed: 3, duration: 120 }).dps; } finally { D.dmgPct = keep; }
      r2 = WL.simulateOnce(bld(x.key), 'orc', cfg, { seed: 3, duration: 120 }).dps;
      T.eq(r1.toFixed(6), r2.toFixed(6), x.short + ': same fight whatever Decimation\'s damage value (' + r2.toFixed(1) + ' DPS)');
    });

    T.group('the damage estimate and the explanation');
    var bs = tb(['searingPain'], { decimation: 2 }), st = WL.computeStats(bs, 'human', c), tab = WL.buildSpellTable(bs, st, c);
    var ex = WL.explainSpell(bs, 'human', c, 'searingPain', st, tab), notes = ex ? ex.notes.join(' ') : '';
    T.ok(/Decimation adds 6% to the talent group of every hit, at any boss health/.test(notes) && !/below \d+% boss health Decimation adds/.test(notes), 'Searing Pain\'s explanation: Decimation at any boss health');

    T.group('the source');
    var s = src('../engine/sim.js');
    if (s) {
      T.eq((s.match(/if \(execute\) S\.buffs\.decimation = S\.t \+ 10;/g) || []).length, 2, 'engine/sim.js: the buff is gated on execute (main and extra targets)');
      T.ok(!/execute && tv\('decimation'\)/.test(s) && !/S\.targetHpPct < cfg\.fight\.executePct && tv\('decimation'\)/.test(s), 'no execute gate left on the damage (the land paths and the damage estimate)');
    }
  });
})();
