// Round 67 tests: "Conflagrate only to keep Shadow and Flame (Shadow +10%) up" (conflagrateSnF), the Conflagrate twin of
// shadowburnSnF: cast only when the Shadow buff is missing or has ≤ 3 s left, and only with Immolate on the target.
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.fight.durationVarPct = 0;
    c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    return c;
  }
  function tb(rot, t) { return { key: 't67', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }).map(function (e) { return e.t; }); }

  T.run('round 67: Conflagrate for Shadow and Flame', function () {
    T.group('cast only when the Shadow buff is missing or has ≤ 3 s left (100% hit, 300 s)');
    var c = det(), t = { conflagrate: 1, shadowAndFlame: 5 };
    var r = WL.simulateOnce(tb(['immolate', 'conflagrateSnF', 'searingPain'], t), 'human', c, { duration: 300, log: true, seed: 31 });
    var cf = casts(r, 'conflagrate'), gaps = cf.slice(1).map(function (x, i) { return x - cf[i]; });
    T.ok(cf.length >= 10, 'Conflagrates are cast (' + cf.length + ' in 300 s)');
    T.ok(gaps.every(function (g) { return g >= 17 - 1e-6; }), 'never earlier than 3 s before the 20 s buff runs out (shortest gap ' + Math.min.apply(null, gaps).toFixed(1) + ' s)');
    T.ok(gaps.every(function (g) { return g <= 20 + 1.5 + 1e-6; }), 'and at the latest one GCD after it ran out (longest gap ' + Math.max.apply(null, gaps).toFixed(1) + ' s)');
    var plain = WL.simulateOnce(tb(['immolate', 'conflagrate', 'searingPain'], t), 'human', c, { duration: 300, log: true, seed: 31 });
    T.ok(casts(plain, 'conflagrate').length > cf.length + 5, 'plain Conflagrate (on cooldown) casts clearly more (' + casts(plain, 'conflagrate').length + ' vs ' + cf.length + ')');
    T.eq(r.log.filter(function (e) { return e.type === 'consume'; }).length, 0, 'Shadow and Flame 5/5: Immolate is never consumed');

    T.group('rules');
    var noSnf = WL.simulateOnce(tb(['immolate', 'conflagrateSnF', 'searingPain'], { conflagrate: 1 }), 'human', c, { duration: 60, log: true, seed: 32 });
    T.eq(casts(noSnf, 'conflagrate').length, 0, 'without Shadow and Flame the action never casts');
    var noImmo = WL.simulateOnce(tb(['conflagrateSnF', 'searingPain'], t), 'human', c, { duration: 60, log: true, seed: 33 });
    T.eq(casts(noImmo, 'conflagrate').length, 0, 'without Immolate on the target it never casts');
    var bd = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === 'destro_incin_succ'; })[0]));
    bd.rotation = bd.rotation.map(function (a) { return a === 'conflagrate' ? 'conflagrateSnF' : a; });
    T.eq(WL.validateBuild(bd).join(' | '), '', 'legal in Destro Incinerate Succubus (Conflagrate + Shadow and Flame talented)');
    var nb = JSON.parse(JSON.stringify(bd)); delete nb.talents.shadowAndFlame;
    T.ok(WL.validateBuild(nb).some(function (e) { return /Shadow and Flame/.test(e); }), 'the editor refuses it without Shadow and Flame');
    T.eq(WL.decodeBuild(WL.encodeBuild(bd)).rotation.join(','), bd.rotation.join(','), 'survives a build code round trip');
  });
})();
