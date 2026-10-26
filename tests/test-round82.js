// Round 82 tests (user): default fight length 180 → 120 s; the builds were re-optimised for it (tools/explore-builds.js).
// Round 162 (user: "i'm told fights will be longer than 2 minutes"): back to 180 s.
(function () {
  T.run('round 82 / 162: default fight length (180 s again since round 162)', function () {
    T.group('defaults');
    T.eq(WL.DEFAULT_CONFIG.fight.duration, 180, 'default fight length 180 s (user, round 162; 120 s in rounds 82–161)');
    T.eq(WL.DEFAULT_CONFIG.fight.durationVarPct, 10, 'still ± 10% per fight');
    T.eq(JSON.parse(WL.DEFAULT_RESULTS.settings).fight.duration, 180, 'the shipped default results are for 180 s fights');
    var r = WL.simulateOnce(WL.BUILDS[0], 'human', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { seed: 7, log: true });
    T.ok(r.duration >= 162 - 1e-9 && r.duration <= 198 + 1e-9, 'a default fight lasts 162 … 198 s (' + r.duration.toFixed(1) + ' s)');
  });
})();
