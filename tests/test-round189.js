// Round 189 tests (user: "make this setup the default so people see this when they go to the sim"): the Charts box is open
// on Build Scaling in the % view, with the chart shipped for the default settings (data/default-scaling.js).
(function () {
  T.async('round 189: Build Scaling is shown on a first visit', function (done) {
    var D = WL.DEFAULT_SCALING, html = '', app = '';
    try { var z = new XMLHttpRequest(); z.open('GET', '../index.html', false); z.send(); html = z.responseText; } catch (e) { /* file:// */ }
    try { var y = new XMLHttpRequest(); y.open('GET', '../app/app.js', false); y.send(); app = y.responseText; } catch (e) { /* file:// */ }
    T.group('the page');
    if (html && app) {
      T.ok(/<details class="card toolcard" id="charts" open>/.test(html), 'the Charts box is open');
      T.ok(/<option value="scale" selected>Build Scaling/.test(html), 'Build Scaling is the chart picked');
      T.ok(/<script src="data\/default-scaling\.js"><\/script>/.test(html), 'the shipped chart is loaded');
      T.ok(/sc: JSON\.parse\(JSON\.stringify\(D\.def\)\), you: scaleYou\(cfg\.gear, D\.def\), rel: true/.test(app), 'shown in the % of the best build view, with your gear line');
      T.ok(/function startUp\(\) \{ var sh = useShipped\(\); shippedScaling\(\);/.test(app), 'drawn at start-up');
      var m = /var CH_SCALE_DEF = (\{[^;]*\});/.exec(app), def = m ? JSON.parse(m[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":')) : null;
      T.eq(JSON.stringify(D && D.def), JSON.stringify(def), 'made with the chart\'s default top level');
    } else T.warn('index.html / app.js could not be read (file://)');

    T.group('data/default-scaling.js');
    if (!D) { T.ok(false, 'data/default-scaling.js is loaded'); done(); return; }
    var builtins = WL.BUILDS.filter(function (b) { return !b.custom; });
    T.eq(D.series.map(function (s) { return s.key; }).join(','), builtins.map(function (b) { return b.key; }).join(','), 'every built-in build');
    T.eq(JSON.stringify(D.xs), '[0,1,2,3,4,5,6,7]', 'gear levels 0 … 7');
    var R = WL.DEFAULT_RESULTS;
    D.series.forEach(function (s) {
      var best = R.results.filter(function (r, i) { return R.keys[i] === s.key && r.race !== WL.BASELINE_RACE; }).sort(function (a, z) { return z.dps - a.dps; })[0];
      T.eq(s.race, best.race, s.key + ': drawn with the race it is listed with (' + s.race + ')');
      T.ok(s.y.every(function (v, i) { return i === 0 || v > s.y[i - 1]; }), s.key + ': more DPS at every higher level');
    });
    T.eq(D.settings, R.settings, 'the same default settings as the shipped results');
    var hex = function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); };
    var files = Object.keys(D.src || {});
    Promise.all(files.map(function (f) {
      return fetch('../' + f).then(function (r) { return r.text(); }).then(function (t) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t.replace(/\r\n/g, '\n'))).then(function (h) { return { f: f, ok: hex(h) === D.src[f] }; });
      });
    })).then(function (hs) {
      T.ok(files.length >= 14, files.length + ' engine / data files recorded');
      hs.forEach(function (h) { T.ok(h.ok, h.f + ' unchanged since the chart was made (else run node tools/gen-scaling.js)'); });
      // One point re-simulated on a worker with a pristine default config (earlier tests may have changed the page's own copy).
      return fetch('../data/config.js').then(function (r) { return r.text(); }).then(function (txt) {
        var w = { WL: { CONSUMABLES: WL.CONSUMABLES } };
        new Function('window', 'WL', txt)(w, w.WL);
        var c = JSON.parse(JSON.stringify(w.WL.DEFAULT_CONFIG)), lv = 4, f = lv / D.def.levels;
        Object.keys(D.def.max).forEach(function (k) { if ((k === 'int' || k === 'spi') && !D.def.intSpi) return; c.gear[k] = +(D.def.max[k] * f).toFixed(k === 'hitPct' || k === 'critPct' || k === 'hastePct' ? 2 : 0); });
        var s = D.series[D.series.length - 1], b = builtins.filter(function (x) { return x.key === s.key; })[0], got = null, pool = WL.makeSimPool('../engine/worker.js', 1);
        pool.run([{ kind: 'weight', build: b, race: s.race, cfg: c, n: D.n, stat: null }], function (j, res) { got = res.dps; }, function () {
          T.near(got, s.y[lv], 1e-9, b.short + ', level ' + lv + ': re-simulated on a worker = shipped (' + s.y[lv].toFixed(1) + ')');
          done();
        });
      });
    }).catch(function (e) { T.ok(false, 'could not check: ' + e); done(); });
  });
})();
