// Round 62 tests: "Life Tap while moving" (fight.lifeTapWhileMoving, A71). When movement leaves nothing castable, Life Tap
// (instant) instead of waiting — while moving and in the short wait before a movement phase — whenever it restores mana.
(function () {
  function cfgM(every, dur, on) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.fight.moveEvery = every; c.fight.moveDuration = dur; c.fight.lifeTapWhileMoving = on;
    return c;
  }
  function tb(rot, t) { return { key: 't62', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function taps(r) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'lifeTap'; }); }

  T.run('round 62: Life Tap while moving', function () {
    T.group('off by default; no effect without movement');
    T.eq(WL.DEFAULT_CONFIG.fight.lifeTapWhileMoving, false, 'option off by default');
    var b = WL.BUILDS.filter(function (x) { return x.key === 'demo_pact_succ_sb'; })[0];
    var a0 = WL.simulateOnce(b, 'human', cfgM(0, 0, false), { log: true, seed: 11 }), a1 = WL.simulateOnce(b, 'human', cfgM(0, 0, true), { log: true, seed: 11 });
    T.eq(a1.dps, a0.dps, 'no movement: the option changes nothing (same fight, same DPS)');
    T.eq(taps(a1).filter(function (e) { return e.moving; }).length, 0, 'no movement: no "while moving" taps');

    T.group('3 s of movement every 20 s (180 s)');
    var off = WL.simulateOnce(b, 'human', cfgM(20, 3, false), { log: true, seed: 12 }), on = WL.simulateOnce(b, 'human', cfgM(20, 3, true), { log: true, seed: 12 });
    var mv = taps(on).filter(function (e) { return e.moving; });
    T.ok(mv.length >= 8, 'Life Taps while moving happen (' + mv.length + ' in the fight, 8 movement phases)');
    T.eq(taps(off).filter(function (e) { return e.moving; }).length, 0, 'option off: none');
    // every moving tap lies inside a movement phase [20k, 20k + 3) or in the wait just before it (no cast would finish; ≤ 3.0 s)
    var inWindow = mv.every(function (e) { var k = Math.round(e.t / 20), d = e.t - 20 * k; return k >= 1 && d > -3.0 - 1e-6 && d < 3 + 1e-6; });
    T.ok(inWindow, 'every such tap is during movement or in the wait right before it');
    T.ok(mv.every(function (e) { return e.gain > 0; }), 'each one restores mana (never at full mana)');
    T.ok(on.idle < off.idle - 1, 'idle time falls (' + off.idle.toFixed(1) + ' s → ' + on.idle.toFixed(1) + ' s)');
    var stillOff = taps(off).length, stillOn = taps(on).filter(function (e) { return !e.moving; }).length;
    T.ok(stillOn < stillOff, 'fewer Life Taps while standing (' + stillOff + ' → ' + stillOn + '), so more casting time');
    T.ok(on.dps > off.dps, 'more DPS in that fight (' + off.dps.toFixed(1) + ' → ' + on.dps.toFixed(1) + ')');

    T.group('instants in the priority still come first while moving');
    // Corruption is instant with Improved Corruption 5/5: during movement it is cast before any tap when it is missing
    var bi = tb(['corruption', 'shadowBolt'], { improvedCorruption: 5 });
    var ri = WL.simulateOnce(bi, 'human', cfgM(20, 3, true), { log: true, seed: 13, duration: 300 });
    var corrMoving = ri.log.filter(function (e) { var k = Math.floor(e.t / 20), d = e.t - 20 * k; return e.type === 'cast' && e.spell === 'corruption' && k >= 1 && d < 3 - 1e-6; });
    var ro = WL.simulateOnce(bi, 'human', cfgM(20, 3, false), { log: true, seed: 13, duration: 300 });
    var corrMovingOff = ro.log.filter(function (e) { var k = Math.floor(e.t / 20), d = e.t - 20 * k; return e.type === 'cast' && e.spell === 'corruption' && k >= 1 && d < 3 - 1e-6; });
    T.ok(corrMoving.length > 0 && corrMoving.length >= corrMovingOff.length - 1, 'Corruption (instant) is still cast while moving (' + corrMoving.length + ' vs ' + corrMovingOff.length + ' without the option)');

    T.group('settings code');
    var c = cfgM(20, 3, true), back = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    WL.applySettings(back, WL.decodeSettings(WL.encodeSettings(c)));
    T.eq(back.fight.lifeTapWhileMoving, true, 'survives a settings-code round trip');
  });
})();
