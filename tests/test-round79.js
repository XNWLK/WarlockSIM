// Round 79 tests (performance, user "do A, B, C"): results must not change.
// A: cached WL.isShadowBolt / talent values, a cheaper heap comparison, reused DoT aura keys (identical results).
// B: the worker pool uses every CPU thread (at most 32; was 1–8).
// C: the stat weights' unchanged "base" run is the best-race row itself when both use the same number of fights.
(function () {
  T.run('round 79: performance changes keep every number', function () {
    T.group('C: the base weight run equals the combo run (same build, race, settings, seeds)');
    var cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); cfg.fight.iterations = cfg.fight.weightIterations = 150;
    ['demo_pact_fire', 'aff_pact_succ_drain', 'wrack_succubus'].forEach(function (k) {
      var b = WL.BUILDS.filter(function (x) { return x.key === k; })[0];
      T.eq(WL.statWeightRun(b, 'undead', cfg, cfg.fight.weightIterations, null), WL.simulate(b, 'undead', cfg).dps, k + ': identical DPS');
    });
    var c2 = JSON.parse(JSON.stringify(cfg)); c2.fight.hitEvery = 2; c2.fight.targets = 2; c2.fight.multiDot = true;
    var bb = WL.BUILDS[0];
    T.eq(WL.statWeightRun(bb, 'gnome', c2, c2.fight.weightIterations, null), WL.simulate(bb, 'gnome', c2).dps, 'also with hits, 2 targets and multi-DoT');
    if (WL.DEFAULT_RESULTS) {
      var D = WL.DEFAULT_RESULTS, k0 = D.keys[0], best = null;
      D.keys.forEach(function (k, i) { var r = D.results[i]; if (k === k0 && r.race !== WL.BASELINE_RACE && (!best || r.dps > best.dps)) best = r; });
      T.eq(D.weights[k0].w.base, best.dps, 'shipped weights: base = the best-race row (' + k0 + ')');
    }

    T.group('A: cached lookups answer as before');
    T.ok(WL.isShadowBolt('shadowBolt') && WL.isShadowBolt('shadowBoltR2') && !WL.isShadowBolt('immolate') && !WL.isShadowBolt('nope'), 'isShadowBolt: both ranks yes, others no (twice: ' + WL.isShadowBolt('shadowBoltR2') + ')');

    T.group('B: worker pool size');
    var src = '';
    try { var x = new XMLHttpRequest(); x.open('GET', '../app/sim-pool.js', false); x.send(); src = x.responseText; } catch (e) { /* file:// */ }
    if (src) T.ok(/Math\.min\(32, navigator\.hardwareConcurrency/.test(src), 'default size = all CPU threads, at most 32');
  });
})();
