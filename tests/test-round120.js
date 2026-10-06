// Round 120 tests (user: "add the cooldown timeline, why not"): a placed use can follow the execute phase ('exec') or the
// first Bane of Doom explosion ('doom') instead of a fixed second; Amplify Curse and the pet swap have rows of their own.
(function () {
  function det(tl, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'custom'; c.options.activesTimeline = tl;
    c.buffs.powerInfusion.on = true; c.consumables.majorSpellblasting.on = true;
    if (f) f(c);
    return c;
  }
  function tb(rot, talents, extra) {
    var b = { key: 't120', short: 't', name: 't', notes: '', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot };
    Object.keys(extra || {}).forEach(function (k) { b[k] = extra[k]; });
    return b;
  }
  var DOOM = ['bane', 'corruption', 'shadowBolt'];
  function times(r, what) {
    return r.log.filter(function (e) {
      return what === 'racial' ? e.type === 'racial' : what === 'pi' ? e.type === 'buff' && /Power Infusion/.test(e.spell) :
        what === 'amp' ? e.type === 'buff' && e.spell === 'amplifyCurse' : e.type === 'consumable' && what.test(e.spell);
    }).map(function (e) { return e.t; });
  }
  function near(t, want, slack) { return t != null && t >= want - 1e-6 && t <= want + slack; }

  T.run('round 120: cooldown timeline — follow execute / Doom, Amplify Curse and pet swap rows', function () {
    T.group('the entries');
    var c0 = det({ racial: [90, 'exec', 10, 'doom', 'exec'], pi: ['doom'], bogus: ['later', -3] });
    var tl = WL.activesTimelineOf(c0);
    T.eq(JSON.stringify(tl.racial), '[10,"doom","exec",90]', 'sorted by where they fall (Doom ≈ 60 s, execute = 65% of 120 s = 78 s), doubles removed');
    T.eq(JSON.stringify(tl.pi), '["doom"]', 'a row with only an event entry is kept');
    T.ok(!tl.bogus, 'anything else is dropped');
    T.eq(WL.cdTime('exec', c0), 78, 'execute on the page: 78 s for a 120 s fight');
    T.eq(WL.cdTime('exec', c0, 200), 130, 'in a 200 s fight: 130 s');
    T.eq(WL.cdTime(42, c0), 42, 'a second stays a second');
    var c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); WL.applySettings(c2, WL.decodeSettings(WL.encodeSettings(c0)));
    T.eq(JSON.stringify(c2.options.activesTimeline.racial), JSON.stringify(c0.options.activesTimeline.racial), 'event entries travel in a settings code');

    T.group('execute: follows the fight length');
    [100, 200].forEach(function (D) {
      var r = WL.simulateOnce(tb(['shadowBolt']), 'orc', det({ racial: ['exec'] }), { seed: 1, duration: D, log: true }), t = times(r, 'racial')[0];
      T.ok(near(t, 0.65 * D, 3), D + ' s fight: Blood Fury at ' + (t == null ? 'never' : t.toFixed(1)) + ' s (execute from ' + (0.65 * D) + ' s)');
    });
    var rfix = WL.simulateOnce(tb(['shadowBolt']), 'orc', det({ racial: [78] }), { seed: 1, duration: 200, log: true });
    T.ok(near(times(rfix, 'racial')[0], 78, 3), 'a fixed 78 s stays at 78 s in the 200 s fight');

    T.group('Doom: right before the cast the explosion falls into');
    var rd = WL.simulateOnce(tb(DOOM), 'orc', det({ racial: ['doom'], pi: ['doom'], majorSpellblasting: ['doom'] }), { seed: 1, duration: 120, log: true });
    var boom = rd.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0];
    T.ok(!!boom, 'Bane of Doom explodes at ' + (boom ? boom.t.toFixed(1) : '?') + ' s');
    [['racial', 'Blood Fury'], ['pi', 'Power Infusion'], [/Spellblasting/, 'Spellblasting potion']].forEach(function (x) {
      var t = times(rd, x[0])[0];
      T.ok(t != null && t <= boom.t + 1e-6 && t >= boom.t - 3.1, x[1] + ' at ' + (t == null ? 'never' : t.toFixed(1)) + ' s: within one cast before the explosion');
    });
    var rauto = WL.simulateOnce(tb(DOOM), 'orc', det({ racial: ['doom'] }, function (c) { c.options.activesPolicy = 'doom'; c.options.activesTimeline = {}; }), { seed: 1, duration: 120, log: true });
    T.ok(Math.abs(times(rd, 'racial')[0] - times(rauto, 'racial')[0]) < 1e-6, 'the same moment as the "first Bane of Doom explodes" setting');
    var rnd = WL.simulateOnce(tb(['shadowBolt']), 'orc', det({ racial: ['doom'] }), { seed: 1, duration: 120, log: true });
    T.ok(near(times(rnd, 'racial')[0], 0, 0.01), 'a build that never casts Doom uses it at the pull');
    var rmix = WL.simulateOnce(tb(DOOM), 'orc', det({ racial: [5, 'doom'] }, function (c) { c.fight.duration = 240; }), { seed: 1, duration: 240, log: true }), tm = times(rmix, 'racial');
    T.ok(near(tm[0], 5, 3) && tm[1] != null && tm[1] > 60, 'a second and an event in one row: ' + tm.slice(0, 2).map(function (x) { return x.toFixed(1); }).join(' s, ') + ' s');

    T.group('Amplify Curse row');
    var AMP = ['baneOfAgony', 'shadowBolt'], at = { amplifyCurse: 1 };
    var ra0 = WL.simulateOnce(tb(AMP, at), 'human', det({}), { seed: 1, duration: 120, log: true });
    T.ok(near(times(ra0, 'amp')[0], 0, 0.01), 'nothing placed: with the first Bane of Agony, at the pull');
    var ra = WL.simulateOnce(tb(AMP, at), 'human', det({ amplifyCurse: [30] }), { seed: 1, duration: 120, log: true }), ta = times(ra, 'amp')[0];
    var boa = ra.log.filter(function (e) { return e.type === 'cast' && e.spell === 'baneOfAgony'; }).map(function (e) { return e.t; });
    var firstAfter = boa.filter(function (t) { return t >= 30 - 1e-6; })[0];
    T.ok(ta != null && Math.abs(ta - firstAfter) < 1e-6 && ta >= 30, 'placed at 30 s: held back, then used with the next Bane of Agony at ' + (ta == null ? '?' : ta.toFixed(1)) + ' s');
    var rae = WL.simulateOnce(tb(AMP, at), 'human', det({ amplifyCurse: ['exec'] }), { seed: 1, duration: 120, log: true });
    T.ok(times(rae, 'amp')[0] >= 78 - 1e-6, 'tied to execute: not before 78 s (' + times(rae, 'amp')[0].toFixed(1) + ' s)');

    T.group('pet swap row');
    var st = { demonicSacrifice: 1, demonicPact: 1, felDomination: 1, masterSummoner: 2 };
    var swapB = function () { return tb(['swapToImp', 'shadowBolt'], st, { pet: 'succubus', sacrifice: 'imp' }); };
    var pets = function (c) { c.options.includePetDamage = true; };
    var rs0 = WL.simulateOnce(swapB(), 'human', det({}, pets), { seed: 1, duration: 120, log: true });
    T.ok(near(rs0.swapAt, 78, 3), 'nothing placed: the swap happens at execute (' + (rs0.swapAt == null ? 'never' : rs0.swapAt.toFixed(1)) + ' s)');
    var rs = WL.simulateOnce(swapB(), 'human', det({ petSwap: [20] }, pets), { seed: 1, duration: 120, log: true });
    T.ok(near(rs.swapAt, 20, 3), 'placed at 20 s: the swap happens at ' + (rs.swapAt == null ? 'never' : rs.swapAt.toFixed(1)) + ' s');
    var rsl = WL.simulateOnce(swapB(), 'human', det({ petSwap: [100] }, pets), { seed: 1, duration: 120, log: true });
    T.ok(near(rsl.swapAt, 100, 3), 'placed at 100 s: held past the start of the execute phase (' + (rsl.swapAt == null ? 'never' : rsl.swapAt.toFixed(1)) + ' s)');
    var plain = WL.simulateOnce(tb(['shadowBolt']), 'human', det({ petSwap: [20], amplifyCurse: [10] }), { seed: 1, duration: 60, log: true });
    var plain0 = WL.simulateOnce(tb(['shadowBolt']), 'human', det({}), { seed: 1, duration: 60, log: true });
    T.eq(plain.total, plain0.total, 'builds without the talent / the swap action are not touched by these rows');
  });
})();
