// Round 28 tests: "No race" baseline (A62), best-Affliction display rule data, Touch of the Grave on extra targets (audit).
(function () {
  function cfgWith(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    if (f) f(c);
    return c;
  }

  T.run('no-race baseline, best Affliction build, audit fixes (round 28)', function () {
    T.group('"No race" baseline race');
    var base = WL.BASELINE_RACE, top = WL.BUILDS[0], cfg = cfgWith();
    T.ok(!!WL.RACES[base] && WL.RACES[base].racials.length === 0, 'baseline race exists and has no racials');
    T.ok(WL.RACE_KEYS.indexOf(base) < 0, 'baseline is not a playable race (not in RACE_KEYS)');
    T.eq(WL.SIM_RACE_KEYS.join(','), WL.RACE_KEYS.concat([base]).join(','), 'results page simulates the 5 races + baseline');
    var sN = WL.computeStats(top, base, cfg), sH = WL.computeStats(top, 'human', cfg);
    T.near(sN.int, sH.int, 1e-9, 'baseline Int = Human Int (Human has no stat offset)');
    T.near(sN.spi * 1.05, sH.spi, 1e-9, 'baseline Spirit = Human Spirit without The Human Spirit (+5%)');
    T.near(sN.critPct + 2, sH.critPct, 1e-9, 'baseline crit = Human crit without Sword Specialization (+2%)');
    T.near(sN.maxMana, sH.maxMana, 1e-9, 'baseline mana = Human mana (no Expansive Mind)');

    // Exactly "Human minus racials": a temporary race with Human's offsets and no racials gives the same fights.
    WL.RACES._humanNoRacials = { name: 'Human (no racials)', offset: WL.RACES.human.offset, racials: [] };
    var a = WL.simulateOnce(top, base, cfg, { seed: 31, duration: 150, log: true });
    var b = WL.simulateOnce(top, '_humanNoRacials', cfg, { seed: 31, duration: 150 });
    delete WL.RACES._humanNoRacials;
    T.near(a.dps, b.dps, 1e-9, 'baseline fight = Human without racials, same seed (' + a.dps.toFixed(2) + ')');
    T.ok(!a.log.some(function (e) { return e.type === 'racial'; }) && !a.bySpell.touchOfTheGrave, 'no racial events in a baseline fight');
    var g = WL.simulate(top, 'gnome', cfg, { iterations: 300, log: false }).dps, n = WL.simulate(top, base, cfg, { iterations: 300, log: false }).dps;
    T.ok(g > n, 'Gnome beats the baseline on the top build (' + g.toFixed(1) + ' vs ' + n.toFixed(1) + ', +' + (100 * (g / n - 1)).toFixed(2) + '%)');

    T.group('best Affliction build rule (data side; the display rule lives in app.js)');
    // round 29: the option became a list (one entry per tree); the Affliction entry is checked here
    var o = (WL.DEFAULT_CONFIG.options.alwaysShowBestTrees || []).filter(function (x) { return x.tree === 'affliction'; })[0];
    T.ok(o && o.tree === 'affliction' && o.minPoints === 25, 'option: always show the best build with >= 25 Affliction points');
    var pts = function (bld) { return Object.keys(bld.talents).reduce(function (s, k) { return s + (WL.TALENT_BY_KEY[k].tree === o.tree ? bld.talents[k] : 0); }, 0); };
    var aff = WL.BUILDS.filter(function (bld) { return pts(bld) >= o.minPoints; });
    T.ok(aff.length >= 1, 'the sheet has a build with >= 25 Affliction points (' + aff.map(function (x) { return x.key; }).join(', ') + ')');
    var code = WL.encodeSettings(cfg), c2 = cfgWith(function (c) { c.options.alwaysShowBestTrees = []; });
    WL.applySettings(c2, WL.decodeSettings(code));
    T.eq(JSON.stringify(c2.options.alwaysShowBestTrees), JSON.stringify(WL.DEFAULT_CONFIG.options.alwaysShowBestTrees), 'settings code carries the option');

    T.group('audit fix: Touch of the Grave also rolls on Immolate landing on an extra target');
    var md = cfgWith(function (c) { c.fight.targets = 3; c.fight.multiDot = true; });
    var found = false, seed;
    for (seed = 1; seed <= 40 && !found; seed++) {
      var r = WL.simulateOnce(top, 'undead', md, { seed: seed, duration: 150, log: true });
      for (var i = 1; i < r.log.length && !found; i++) {
        var e = r.log[i], p = r.log[i - 1];
        if (e.spell === 'touchOfTheGrave' && /^x\d:immolate$/.test(p.spell) && (p.type === 'apply' || p.type === 'hit') && Math.abs(e.t - p.t) < 1e-6) found = true;
      }
    }
    T.ok(found, 'a Touch of the Grave proc directly after an extra-target Immolate lands (seed ' + (seed - 1) + ')');
    var one = WL.simulateOnce(top, 'undead', cfgWith(), { seed: 31, duration: 150 });
    var one2 = WL.simulateOnce(top, 'undead', cfgWith(function (c) { c.fight.targets = 1; c.fight.multiDot = true; }), { seed: 31, duration: 150 });
    T.near(one.dps, one2.dps, 1e-9, 'single target: unchanged by the fix (Undead, same seed)');
  });
})();
