// Round 187 tests (user): the Build Scaling chart — DPS by gear level, every build on the sheet in one chart. Level 0 = no
// spell power, hit, crit, haste or Spell Pierce on the sheet; level 7 = 2000 SP, 17% hit, 30% crit, 20% haste; even steps.
(function () {
  T.run('round 187: Build Scaling chart', function () {
    var app = '', html = '';
    try { var y = new XMLHttpRequest(); y.open('GET', '../app/app.js', false); y.send(); app = y.responseText; } catch (e) { /* file:// */ }
    try { var z = new XMLHttpRequest(); z.open('GET', '../index.html', false); z.send(); html = z.responseText; } catch (e) { /* file:// */ }
    if (!app || !html) { T.warn('app.js / index.html could not be read (file://)'); return; }
    T.group('the chart');
    T.ok(/<option value="scale"(?: selected)?>Build Scaling \(DPS by gear level\)<\/option>/.test(html), 'a chart type "Build Scaling" in the Chart list');
    T.ok(/Build Scaling · what each buff is worth<\/summary>/.test(html), 'named in the folded Charts title');
    var m = /var CH_SCALE_DEF = (\{[^;]*\});/.exec(app), S = m ? JSON.parse(m[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":')) : null;   // round 188: the defaults
    T.ok(!!S && S.levels === 7 && S.max.sp === 2000 && S.max.hitPct === 17 && S.max.critPct === 30 && S.max.hastePct === 20 && S.max.pierce === 0 && S.max.int === 600 && S.max.spi === 200 && S.intSpi === true && S.race === 'listed',
      'levels 0 … 7, top level 2000 SP / 17% hit / 30% crit / 20% haste / no Spell Pierce; Intellect 600 and Spirit 200 grow too (round 188); listed races');
    T.ok(/else if \(scale\) Object\.assign\(c\.gear, scaleGear\(x, SC\)\)/.test(app), 'each level sets those sheet values; everything else stays as set');
    T.ok(/var n = scale \? cfg\.fight\.iterations : /.test(app), 'the full number of fights per point (the lines lie close together)');

    T.group('round 188: the five ideas');
    ['scSp', 'scHit', 'scCrit', 'scHaste', 'scPierce', 'scIntSpi', 'scInt', 'scSpi', 'scRace', 'scDef'].forEach(function (id) { T.ok(html.indexOf('id="' + id + '"') >= 0, 'a box for the top level: #' + id); });
    T.ok(/localStorage\.setItem\('wfs\.scale'/.test(app), 'the top level is kept in this browser');
    T.ok(/if \(races\) races\.forEach\(function \(rk\)/.test(app) && /s\.raceAt\[xi\] = bk/.test(app), 'best race at each level: every race simulated, the highest kept');
    T.ok(/you: scale \? scaleYou\(cfg\.gear, SC\)/.test(app) && /'your gear ≈ level '/.test(app), 'a dashed line at your gear\'s level');
    T.ok(/data-chrel="1"/.test(app) && /100 \* v \/ topAt\[i\]/.test(app), 'DPS or % of the best build at each level');

    T.group('in the engine: the same build at higher gear levels does more damage');
    var b = WL.BUILDS.filter(function (x) { return x.key === 'wrack_ds'; })[0] || WL.BUILDS[0], c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), prev = -1, ok = true, ys = [];
    [0, 3, 7].forEach(function (lv) {
      var cc = JSON.parse(JSON.stringify(c)), f = lv / 7;
      cc.gear.sp = 2000 * f; cc.gear.hitPct = 17 * f; cc.gear.critPct = 30 * f; cc.gear.hastePct = 20 * f; cc.gear.pierce = 0;
      var d = WL.statWeightRun(b, 'undead', cc, 60, null); ys.push(d.toFixed(0)); if (!(d > prev)) ok = false; prev = d;
    });
    T.ok(ok, b.short + ': level 0 < 3 < 7 (' + ys.join(' → ') + ' DPS)');
  });
})();
