// Round 97 tests (user): priority action "Conflagrate only when Immolate is about to expire" (conflagrateExpire) —
// Conflagrate consumes Immolate, so it waits until Immolate has at most 3 s left (4 of its 5 ticks done).
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    return c;
  }
  function tb(rot, t) { return { key: 't97', short: 't', name: 't', notes: '', talents: t || { conflagrate: 1 }, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  // For every Conflagrate cast: how long the Immolate it uses had been up.
  function ages(r) {
    var imm = r.log.filter(function (e) { return e.type === 'hit' && e.spell === 'immolate'; }).map(function (e) { return e.t; });
    return r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'conflagrate'; }).map(function (e) {
      var t0 = imm.filter(function (t) { return t <= e.t + 1e-6; }).pop();
      return e.t - t0;
    });
  }
  function n(r, type, spell) { return r.log.filter(function (e) { return e.type === type && e.spell === spell; }).length; }

  T.run('round 97: Conflagrate only when Immolate is about to expire', function () {
    T.group('the action');
    var A = WL.ACTIONS.conflagrateExpire;
    T.ok(A && !A.filler && /about to expire/.test(A.label), 'priority action "' + (A && A.label) + '"');
    T.eq(WL.CONFLAG_EXPIRE_S, 3, '"about to expire" = at most 3 s left (one Immolate tick interval)');
    T.ok(WL.editorActions().indexOf('conflagrateExpire') >= 0, 'offered in the build editor');
    var lb = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'sm_ruin_classic'; })[0]));
    lb.rotation.splice(lb.rotation.length - 1, 0, 'conflagrateExpire');
    T.ok(WL.validateBuild(lb).some(function (e) { return /Conflagrate/.test(e); }), 'the editor refuses it without the Conflagrate talent');
    var ok = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'destro_incin_imp'; })[0]));
    ok.rotation = ok.rotation.map(function (a) { return a === 'conflagrate' ? 'conflagrateExpire' : a; });
    T.eq(WL.validateBuild(ok).join(' | '), '', 'legal in Destro Incinerate Imp');
    T.eq(WL.decodeBuild(WL.encodeBuild(ok)).rotation.join(','), ok.rotation.join(','), 'survives a build-code round trip');

    T.group('timing (Conflagrate talent, no Shadow and Flame: every Conflagrate consumes Immolate)');
    [['immolate', 'conflagrateExpire', 'searingPain'], ['conflagrateExpire', 'immolate', 'searingPain']].forEach(function (rot) {
      var r = WL.simulateOnce(tb(rot), 'human', det(), { seed: 1, duration: 180, log: true }), a = ages(r);
      T.ok(a.length >= 8 && a.every(function (x) { return x >= 12 - 1e-6 && x < 15; }), rot[0] + ' first: every Conflagrate when Immolate has ≤ 3 s left (' + a.length + ' casts, Immolate ' +
        Math.min.apply(null, a).toFixed(1) + '–' + Math.max.apply(null, a).toFixed(1) + ' s old)');
      T.eq(n(r, 'consume', 'immolate'), n(r, 'hit', 'conflagrate'), rot[0] + ' first: each Conflagrate takes its Immolate, which is then recast (' + n(r, 'cast', 'immolate') + ' Immolates)');
    });
    var cd = WL.simulateOnce(tb(['immolate', 'conflagrate', 'searingPain']), 'human', det(), { seed: 1, duration: 180, log: true }), ac = ages(cd);
    T.ok(ac.some(function (x) { return x < 12 - 1e-6; }), '"on cooldown" cuts Immolate short (as early as ' + Math.min.apply(null, ac).toFixed(1) + ' s after it went up)');
    var ex = WL.simulateOnce(tb(['immolate', 'conflagrateExpire', 'searingPain']), 'human', det(), { seed: 1, duration: 180, log: true });
    T.ok(n(ex, 'tick', 'immolate') / n(ex, 'cast', 'immolate') > n(cd, 'tick', 'immolate') / n(cd, 'cast', 'immolate') + 0.5,
      'more Immolate ticks per cast (' + (n(ex, 'tick', 'immolate') / n(ex, 'cast', 'immolate')).toFixed(2) + ' vs ' + (n(cd, 'tick', 'immolate') / n(cd, 'cast', 'immolate')).toFixed(2) + ')');

    T.group('shipped builds unchanged');
    T.ok(WL.BUILDS.every(function (b) { return b.rotation.indexOf('conflagrateExpire') < 0; }), 'no built-in build uses it (with Shadow and Flame 5/5 Conflagrate never consumes Immolate, so waiting only costs casts)');
  });
})();
