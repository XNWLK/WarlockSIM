// Round 56 tests: "Bane of Agony only" priority action — Agony all fight, never Bane of Doom (user).
(function () {
  function cfg(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  function tb(rot) { return { key: 't56', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }); }

  T.run('round 56: Bane of Agony only', function () {
    T.group('the action never casts Bane of Doom');
    var ag = WL.simulateOnce(tb(['baneOfAgony', 'shadowBolt']), 'human', cfg(), { seed: 4, duration: 180, log: true });
    var dm = WL.simulateOnce(tb(['bane', 'shadowBolt']), 'human', cfg(), { seed: 4, duration: 180, log: true });
    T.eq(casts(ag, 'baneOfDoom').length, 0, 'Agony-only: no Bane of Doom in 180 s');
    T.ok(casts(dm, 'baneOfDoom').length >= 2, 'the normal Bane action does cast Bane of Doom (' + casts(dm, 'baneOfDoom').length + '×)');
    // Applications (landed casts; a missed cast is recast right away): one every 24 s at most.
    var ac = ag.log.filter(function (e) { return e.type === 'apply' && e.spell === 'baneOfAgony'; });
    T.ok(ac.length >= 7, 'Bane of Agony applied all fight (' + ac.length + ' times, 24 s each)', ac.length);
    T.ok(ac.slice(1).every(function (e, i) { return e.t - ac[i].t >= 24 - 1e-6; }), 'never re-applied while the previous Agony is still up (one Bane per target)');
    T.ok(100 * ag.uptime['dot:baneOfAgony'] / 180 > 90, 'Agony up ' + (100 * ag.uptime['dot:baneOfAgony'] / 180).toFixed(1) + '% of the fight');

    T.group('end of the fight: same pay-off check as the other DoTs (A69)');
    var off = WL.simulateOnce(tb(['baneOfAgony', 'shadowBolt']), 'human', cfg(function (c) { c.options.dotEndCheck = false; }), { seed: 4, duration: 180, log: true });
    var lastOff = casts(off, 'baneOfAgony').pop();
    T.ok(180 - lastOff.t >= 12 - 1e-6, 'check off: the last Agony has ≥ 12 s left (' + (180 - lastOff.t).toFixed(1) + ' s)');
    var sk = ag.log.filter(function (e) { return e.type === 'skip' && e.spell === 'baneOfAgony'; });
    T.ok(sk.every(function (e) { return e.value < e.cost; }), 'check on: every Agony skip is worth less than the alternative (' + sk.length + ' skip)');

    T.group('build editor rules and build codes');
    var b = JSON.parse(JSON.stringify(WL.BUILDS[0])); b.rotation = b.rotation.map(function (a) { return a === 'bane' ? 'baneOfAgony' : a; });
    T.eq(WL.validateBuild(b).join(' | '), '', 'a priority list with "Bane of Agony only" is legal');
    T.ok(WL.validateBuild(tb(['bane', 'baneOfAgony', 'shadowBolt'])).some(function (e) { return /Keep one Bane action/.test(e); }), 'both Bane actions together are refused');
    T.ok(WL.editorActions().indexOf('baneOfAgony') >= 0, 'offered in the editor\'s action list');
    T.eq(WL.decodeBuild(WL.encodeBuild(b)).rotation.join(','), b.rotation.join(','), 'survives a build code round trip');
  });
})();
