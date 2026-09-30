// Round 76 tests (performance): Web Workers give exactly the numbers of a run on the page; results without fight #1's log
// rebuild it exactly (WL.hydrateResult); the pool falls back to the page when workers cannot start.
(function () {
  function cfg(n) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.iterations = n; c.fight.weightIterations = n; return c; }
  var b0 = WL.BUILDS[0], bs = WL.BUILDS.filter(function (b) { return b.key === 'demo_pact_fire'; })[0];

  T.run('round 76: fight #1 rebuilt exactly; stat weights split into runs', function () {
    T.group('WL.fightParams / WL.firstFight / WL.stripResult / WL.hydrateResult');
    var c = cfg(30), full = WL.simulate(b0, 'human', c), strip = WL.stripResult(full);
    T.ok(!('log' in strip) && !('firstFight' in strip) && !('stats' in strip) && !('build' in strip), 'stripped: no build, stats, table, log, fight #1 (' + (JSON.stringify(strip).length / 1024).toFixed(1) + ' KB instead of ' + (JSON.stringify(full).length / 1024).toFixed(0) + ' KB)');
    var h = WL.hydrateResult(JSON.parse(JSON.stringify(strip)), b0, c);
    T.eq(JSON.stringify(h.stats), JSON.stringify(full.stats), 'stats recomputed = the run\'s');
    T.eq(JSON.stringify(h.log), JSON.stringify(full.log), 'fight #1 log rebuilt from its seed = the run\'s (' + full.log.length + ' events)');
    T.ok(h.firstFight.dps === full.firstFight.dps && h.firstFight.duration === full.firstFight.duration, 'fight #1 DPS and length identical');
    T.ok(h.build === b0 && h.dps === full.dps, 'hydrated: the page\'s build object, same DPS');
    var fp = WL.fightParams(c, 0);
    T.ok(fp.seed === ((c.fight.seed * 7919) >>> 0) && Math.abs(fp.duration - c.fight.duration) <= c.fight.duration * c.fight.durationVarPct / 100, 'fight params: seed × 7919 + i, length within ±' + c.fight.durationVarPct + '%');
    var w = WL.statWeights(b0, 'human', c, 30), base = WL.statWeightRun(b0, 'human', c, 30, null), by = {};
    WL.STAT_WEIGHT_KEYS.forEach(function (k) { by[k] = WL.statWeightRun(b0, 'human', c, 30, k); });
    T.eq(JSON.stringify(WL.combineWeights(c, base, by)), JSON.stringify(w), 'the 7 separate runs combine to the same stat weights');
  });

  T.async('round 76: Web Workers', function (done) {
    var c = cfg(40), pool = WL.makeSimPool('../engine/worker.js', 2);
    var jobs = [{ kind: 'combo', build: b0, race: 'human', cfg: c }, { kind: 'combo', build: bs, race: 'undead', cfg: c },
                { kind: 'weight', build: b0, race: 'human', cfg: c, n: 40, stat: null }, { kind: 'weight', build: b0, race: 'human', cfg: c, n: 40, stat: 'critPct' }];
    var got = [];
    pool.run(jobs, function (j, res) { got.push({ j: j, res: res }); }, function () {
      T.group('Web Workers (2) = the page, exactly');
      T.eq(pool.mode(), 'workers (2)', 'the jobs ran on workers');
      got.forEach(function (g) {
        var j = g.j;
        if (j.kind === 'combo') {
          var here = WL.stripResult(WL.simulate(j.build, j.race, c));
          T.eq(JSON.stringify(g.res.r), JSON.stringify(here), j.build.short + ' (' + j.race + '): the worker\'s whole result = the page\'s (DPS ' + here.dps.toFixed(2) + ')');
        } else T.eq(g.res.dps, WL.statWeightRun(j.build, j.race, c, 40, j.stat), 'stat-weight run ' + (j.stat || 'baseline') + ': same DPS');
      });
      T.eq(got.length, jobs.length, 'every job answered once');
      var bad = WL.makeSimPool('../engine/no-such-worker.js', 2), got2 = [];
      bad.run(jobs.slice(0, 1), function (j, res) { got2.push(res); }, function () {
        T.group('No workers (file missing / blocked): the page runs the jobs itself');
        T.eq(bad.mode(), 'page', 'falls back to the page');
        T.eq(got2.length === 1 && got2[0].r.dps, WL.simulate(b0, 'human', c).dps, 'with the same result');
        done();
      });
    });
  });

  T.async('round 76: shipped default results are current', function (done) {
    var D = WL.DEFAULT_RESULTS, files = Object.keys((D && D.src) || {});
    if (!D) { T.group('shipped default results'); T.ok(false, 'data/default-results.js is loaded'); done(); return; }
    var hex = function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); };
    Promise.all(files.map(function (f) {
      return fetch('../' + f).then(function (r) { return r.text(); }).then(function (t) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t.replace(/\r\n/g, '\n'))).then(function (h) { return { f: f, ok: hex(h) === D.src[f] }; });
      });
    })).then(function (hs) {
      T.group('shipped default results: made from the current engine and data (else run node tools/gen-default-results.js)');
      T.eq(files.length, 13, 'hashes of the 13 engine / data files are recorded');
      hs.forEach(function (h) { T.ok(h.ok, h.f + ' unchanged since the results were generated (' + D.generated + ')'); });
      var builtins = WL.BUILDS.filter(function (b) { return !b.custom; });
      T.eq(D.keys.length, builtins.length * WL.SIM_RACE_KEYS.length, 'one result per built-in build × race (' + D.keys.length + ')');
      T.eq(JSON.stringify(builtins), D.builds, 'the built-in builds are the ones simulated');
      T.ok(D.probe && D.probe.length === D.keys.length && D.probe.every(function (x) { return x > 0; }), 'the page\'s self-check values: DPS of fight #1 of each of the ' + D.keys.length + ' rows');
      // Re-simulate a few rows and one build's stat weights on a worker with its own (shipped) default config.
      var pool = WL.makeSimPool('../engine/worker.js', 2), pick = [0, Math.floor(D.keys.length / 2) + 1, D.keys.length - 1], jobs = [];
      var byKey = {}; builtins.forEach(function (b) { byKey[b.key] = b; });
      pick.forEach(function (i) { jobs.push({ kind: 'combo', build: byKey[D.keys[i]], race: D.results[i].race, i: i }); });
      var wk = D.keys[0], wr = D.weights[wk];
      [null].concat(WL.STAT_WEIGHT_KEYS).forEach(function (s) { jobs.push({ kind: 'weight', build: byKey[wk], race: wr.race, stat: s }); });
      var by = {}, base = null;
      pool.run(jobs, function (j, res) {
        T.group('shipped default results: re-simulated on a worker (its own shipped config) = shipped'); 
        if (j.kind === 'combo') T.eq(JSON.stringify(res.r), JSON.stringify(D.results[j.i]), 'row ' + j.i + ' (' + j.build.short + ', ' + j.race + ') re-simulated = shipped (DPS ' + D.results[j.i].dps.toFixed(2) + ')');
        else if (j.stat) by[j.stat] = res.dps; else base = res.dps;
      }, function () {
        T.group('shipped default results: re-simulated on a worker (its own shipped config) = shipped'); 
        T.eq(JSON.stringify(WL.combineWeights(WL.DEFAULT_CONFIG, base, by)), JSON.stringify(wr.w), 'stat weights of ' + byKey[wk].short + ' re-simulated = shipped');
        done();
      });
    });
  });
})();
