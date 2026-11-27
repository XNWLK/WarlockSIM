// Round 266 tests — found by the addon chat while porting v224: in the Web Workers (and Node) neither app/gear-builder.js
// nor the item list is loaded, so WL.equippedItemFx had no two-hander check and a Book of the Dead (13353) behind a
// two-hander (gear code, saved set, custom gear) still summoned its skeleton in the page's fights. Now the page sends its
// answer with every job (WL.workerCfg → gearBuilder.offHandBlocked) and engine/worker.js reads it (a custom main hand
// tells its own slot).
(function () {
  var BOOK = 13353, HC = 13937, BLADE = 17780;   // Headmaster's Charge (two-hander), Blade of Eternal Darkness (one-hander)
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function cfg(mh, oh, n) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), s = { mainHand: { id: mh } };
    if (oh) s.offHand = { id: oh };
    c.fight.iterations = n || 20;
    c.gearBuilder = { on: true, slots: s, manual: {}, enchants: {} };
    c.options.trinketUse = { offHand: 'ready' };
    return c;
  }
  var SB = WL.BUILDS.filter(function (b) { return b.key === 'demo_pact_succ_sb'; })[0];

  T.run('round 266: the two-hander rule goes to the workers', function () {
    T.group('WL.workerCfg (app/sim-pool.js)');
    var c = cfg(HC, BOOK), w = WL.workerCfg(c);
    T.ok(w.gearBuilder.offHandBlocked === true, 'a two-hander in the main hand: offHandBlocked true');
    T.ok(!('offHandBlocked' in c.gearBuilder) && w !== c && w.gearBuilder.slots === c.gearBuilder.slots, 'a copy: the page\'s own config is not changed');
    T.ok(WL.workerCfg(cfg(BLADE, BOOK)).gearBuilder.offHandBlocked === false, 'a one-hander: false');
    var off = cfg(HC, BOOK); off.gearBuilder.on = false;
    T.ok(WL.workerCfg(off) === off, 'gear builder off: the config as it is');
    T.ok(WL.workerCfg(null) === null, 'no config: as it is (the worker uses its own default)');

    T.group('the sources');
    var wk = src('../engine/worker.js'), sp = src('../app/sim-pool.js');
    T.ok(/WL\.gearOffHandBlocked = function/.test(wk) && /offHandBlocked/.test(wk) && /custom\.slot === 'twoHand'/.test(wk), 'engine/worker.js: its own WL.gearOffHandBlocked reads offHandBlocked and a custom main hand\'s slot');
    T.ok(/cfg: WL\.workerCfg\(j\.cfg\)/.test(sp), 'app/sim-pool.js: every job goes out through WL.workerCfg');
  });

  T.async('round 266: Book of the Dead behind a two-hander, on a worker', function (done) {
    var pool = WL.makeSimPool('../engine/worker.js', 1);
    var jobs = [{ kind: 'combo', build: SB, race: 'human', cfg: cfg(HC, BOOK), tag: 'hc+book' },
                { kind: 'combo', build: SB, race: 'human', cfg: cfg(HC, null), tag: 'hc' },
                { kind: 'combo', build: SB, race: 'human', cfg: cfg(BLADE, BOOK), tag: 'blade+book' }];
    var got = {};
    pool.run(jobs, function (j, res) { got[j.tag] = res.r; }, function () {
      T.group('a worker = the page');
      if (typeof Worker !== 'undefined') T.eq(pool.mode(), 'workers (1)', 'the jobs ran on a worker');   // Node has no workers: there the page's own run is checked
      jobs.forEach(function (j) {
        var here = WL.stripResult(WL.simulate(j.build, j.race, j.cfg));
        T.eq(got[j.tag] && got[j.tag].dps, here.dps, j.tag + ': the worker\'s DPS = the page\'s (' + here.dps.toFixed(2) + ')');
      });
      T.group('no skeleton behind Headmaster\'s Charge');
      T.eq(got['hc+book'] && got['hc+book'].dps, got.hc && got.hc.dps, 'Headmaster\'s Charge + Book of the Dead = Headmaster\'s Charge alone (the Book does nothing)');
      T.eq(WL.equippedItemFx(jobs[0].cfg).length, 0, 'and on the page: no item effect');
      T.ok(WL.equippedItemFx(jobs[2].cfg).some(function (x) { return x.id === BOOK; }), 'with a one-hander the Book still counts');
      done();
    });
  });
})();
