// Round 182 tests (user: "for the racial comparison, add a drop down for targets. 1 (default), 2 and 3"): the fight-length sheet
// for 2 and 3 targets (multi-DoT on; Havoc as usual), shipped in data/length-table.js as targets[2] / targets[3].
(function () {
  T.async('round 182: Racials by fight length for 2 and 3 targets', function (done) {
    var L = WL.LENGTH_TABLE;
    T.group('data/length-table.js: targets');
    if (!L || !L.targets) { T.ok(false, 'the table has 2- and 3-target rows'); done(); return; }
    var builtins = WL.BUILDS.filter(function (b) { return !b.custom; }), n = builtins.length * WL.SIM_RACE_KEYS.length;
    [2, 3].forEach(function (t) {
      var rows = L.targets[t] || [];
      T.eq(rows.length, n, t + ' targets: one row per built-in build × race');
      T.ok(rows.every(function (r, i) { return r.build === L.rows[i].build && r.race === L.rows[i].race && r.dps.length === 5; }), t + ' targets: the same rows and lengths as 1 target');
    });
    var best = function (rows, k) { return Math.max.apply(null, rows.filter(function (r) { return r.build === k && r.race !== WL.BASELINE_RACE; }).map(function (r) { return r.dps[2]; })); };
    T.ok(builtins.every(function (b) { return best(L.targets[2], b.key) > best(L.rows, b.key); }), 'every build does more with a second target (its DoTs there)');
    // Two cells re-simulated on a worker with a pristine default config (earlier tests may have changed the page's own copy)
    fetch('../data/config.js').then(function (r) { return r.text(); }).then(function (txt) {
      var w = { WL: { CONSUMABLES: WL.CONSUMABLES } };
      new Function('window', 'WL', txt)(w, w.WL);
      var mk = function (t) { var c = JSON.parse(JSON.stringify(w.WL.DEFAULT_CONFIG)); c.fight.targets = t; c.fight.multiDot = true; return c; };
      var b0 = builtins[0], b1 = builtins[builtins.length - 1], jobs = [{ kind: 'combo', build: b0, race: 'human', cfg: mk(2), t: 2 }, { kind: 'combo', build: b1, race: 'undead', cfg: mk(3), t: 3 }];
      var pool = WL.makeSimPool('../engine/worker.js', 2), got = {};
      pool.run(jobs, function (j, res) { got[j.t] = res.r.dps; }, function () {
        jobs.forEach(function (j) {
          var want = L.targets[j.t].filter(function (r) { return r.build === j.build.key && r.race === j.race; })[0].dps[2];
          T.near(got[j.t], want, 0.051, j.build.short + ', ' + j.race + ', ' + j.t + ' targets, 180 s: re-simulated on a worker = shipped (' + want + ')');
        });
        done();
      });
    }).catch(function (e) { T.ok(false, 'config.js could not be read: ' + e); done(); });
  });
  T.run('round 182: the targets drop-down', function () {
    var get = function (p) { try { var x = new XMLHttpRequest(); x.open('GET', p, false); x.send(); return x.responseText; } catch (e) { return ''; } };
    var src = get('../index.html'), app = get('../app/app.js');
    if (!src || !app) { T.warn('index.html / app.js could not be read (file://)'); return; }
    T.ok(/<select id="lenTargets"><option value="1">1<\/option><option value="2">2<\/option><option value="3">3<\/option><\/select>/.test(src), 'Targets: 1 (default), 2, 3');
    T.ok(app.indexOf('c0.fight.targets = nT; c0.fight.multiDot = nT > 1;') >= 0 && app.indexOf('lenData[nT] = {') >= 0, '"Redo with my settings" runs the chosen target count (multi-DoT on for 2-3)');
  });
})();
