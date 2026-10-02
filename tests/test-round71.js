// Round 71 tests: Death Coil (damage only; on cooldown, and as the finisher) (A74). The round 71 Shadow Bolt Rank 2 actions
// (below 740 mana, ISB upkeep) were removed in round 81 (Rank 2 gutted in Forever).
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; }); c.debuffs.judgementOfWisdom.on = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't71', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }); }

  T.run('round 71: Death Coil', function () {
    T.group('Death Coil data (spell 17926 Rank 3, Effect Value 455 − 1)');
    var s = WL.SPELLS.deathCoil;
    T.eq([s.id, s.base, s.coef, s.cost, s.cd, s.cast, s.school].join(','), '17926,454,0.214,600,120,0,shadow', 'id 17926, 454 + 21.4% SP, 600 mana, 2 min cooldown, instant, Shadow');

    T.group('Death Coil on cooldown');
    var c = det(), b = tb(['deathCoil', 'shadowBolt']), sp = WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c).deathCoil.sp;
    var r = WL.simulateOnce(b, 'human', c, { duration: 300, log: true, seed: 1 });
    var dt = casts(r, 'deathCoil').map(function (e) { return e.t; }), sbc = WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c).shadowBolt.cast;
    T.ok(dt.length === 3 && dt[0] === 0 && dt.slice(1).every(function (x, i) { return x - dt[i] >= 120 - 1e-6 && x - dt[i] <= 120 + sbc + 1e-6; }),
      'cast at 0 s and again as soon as it is ready (120 s, at most one Shadow Bolt cast later): ' + dt.map(function (x) { return x.toFixed(1); }).join(', '));
    var hits = r.log.filter(function (e) { return e.type === 'hit' && e.spell === 'deathCoil'; });
    T.ok(hits.length === 3 && hits.every(function (e) { return e.dmg === Math.round(454 + 0.214 * sp); }), 'each hit = 454 + 0.214 × ' + sp + ' SP = ' + Math.round(454 + 0.214 * sp));

    T.group('Death Coil as the finisher');
    var rf = WL.simulateOnce(tb(['deathCoilFinisher', 'shadowBolt']), 'human', c, { duration: 60, log: true, seed: 2 });
    var dc = casts(rf, 'deathCoil'), sbCast = WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c).shadowBolt.cast;
    T.eq(dc.length, 1, 'exactly one Death Coil in the fight');
    T.ok(dc[0] && dc[0].t > 60 - sbCast - 1e-6, 'cast when less than one Shadow Bolt cast (' + sbCast.toFixed(2) + ' s) is left (at ' + (dc[0] && dc[0].t.toFixed(2)) + ' s)');
    T.ok(rf.log.some(function (e) { return e.type === 'hit' && e.spell === 'deathCoil'; }), 'and it lands before the boss dies');
    var ct = det(function (x) { x.fight.travelMs = 800; });
    var rt = WL.simulateOnce(tb(['deathCoilFinisher', 'shadowBolt']), 'human', ct, { duration: 60, log: true, seed: 2 });
    var dct = casts(rt, 'deathCoil');
    T.ok(dct.length === 0 || dct[0].t < 60 - 0.8 + 1e-6, 'with 800 ms travel time it is only cast while it can still land');
    var rb = WL.simulateOnce(tb(['deathCoilFinisher', 'deathCoil', 'shadowBolt']), 'human', c, { duration: 180, log: true, seed: 3 });
    T.eq(casts(rb, 'deathCoil').length, 2, 'with "on cooldown" too: 0 and 120 s, nothing left for the end (ready at 240 s)');

    T.group('editor');
    var ok = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'sm_ruin_classic'; })[0]));
    ok.rotation = ['deathCoilFinisher', 'deathCoil'].concat(ok.rotation.filter(function (a) { return a !== 'deathCoilFinisher'; }));
    T.eq(WL.validateBuild(ok).join(' | '), '', 'both Death Coil actions are legal in SM Ruin (classic)');
    T.eq(WL.decodeBuild(WL.encodeBuild(ok)).rotation.join(','), ok.rotation.join(','), 'and survive a build-code round trip');

    T.group('Adopted: every shipped build ends the fight with Death Coil (+0.13 … +0.50% at 10,000 fights)');
    var cd = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    WL.BUILDS.forEach(function (bb) {
      var fights = 0, bad = 0;
      for (var sd = 1; sd <= 10; sd++) {
        var d2 = casts(WL.simulateOnce(bb, 'human', cd, { duration: 180, log: true, seed: sd }), 'deathCoil');
        if (d2.length) fights++;
        if (d2.length > 1 || d2.some(function (e) { return e.t < 180 - 3.5; })) bad++;
      }
      T.ok(bb.rotation[0] === 'deathCoilFinisher' && fights > 0 && bad === 0,
        bb.short + ': finisher first; Death Coil at the very end of ' + fights + ' of 10 fights, never earlier or twice');
    });
  });
})();
