// Round 82 tests (user): default fight length 180 → 120 s; the builds were re-optimised for it (tools/explore-builds.js).
(function () {
  T.run('round 82: 2-minute default fight', function () {
    T.group('defaults');
    T.eq(WL.DEFAULT_CONFIG.fight.duration, 120, 'default fight length 120 s (user, round 82; was 180)');
    T.eq(WL.DEFAULT_CONFIG.fight.durationVarPct, 10, 'still ± 10% per fight');
    T.eq(JSON.parse(WL.DEFAULT_RESULTS.settings).fight.duration, 120, 'the shipped default results are for 120 s fights');
    var r = WL.simulateOnce(WL.BUILDS[0], 'human', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { seed: 7, log: true });
    T.ok(r.duration >= 108 - 1e-9 && r.duration <= 132 + 1e-9, 'a default fight lasts 108 … 132 s (' + r.duration.toFixed(1) + ' s)');
  });
})();
