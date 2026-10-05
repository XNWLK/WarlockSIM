// Round 101 tests (user): Berserking (Troll) also shortens the global cooldown, so a 1.5 s cast like Searing Pain is
// not held back by the GCD while it is up. The engine has done this since haste was added (A08); this pins it.
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.gear.hastePct = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull';
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    return c;
  }
  function tb(rot) { return { key: 't101', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }); }
  function near(a, b) { return Math.abs(a - b) < 0.002; }

  T.run('round 101: Berserking shortens the global cooldown', function () {
    var hp = WL.RACES.troll.racials.filter(function (r) { return r.effect === 'cooldown'; })[0];
    T.eq([hp.name, hp.hastePct, hp.duration].join('/'), 'Berserking/10/10', 'Berserking: +10% haste for 10 s');
    var want = 1.5 / 1.1;

    T.group('Searing Pain (1.5 s cast)');
    var r = WL.simulateOnce(tb(['searingPain']), 'troll', det(), { seed: 1, duration: 40, log: true }), sp = casts(r, 'searingPain');
    var pop = r.log.filter(function (e) { return e.type === 'racial'; })[0];
    T.ok(pop && pop.t === 0, 'popped on the pull');
    var inn = sp.filter(function (e) { return e.t < 10 - 1e-6; }), out = sp.filter(function (e) { return e.t >= 10 + 1.5; });
    T.ok(inn.length >= 7 && inn.every(function (e) { return near(e.castTime, want) && near(e.gcd, want); }), 'during Berserking: cast ' + want.toFixed(3) + ' s and GCD ' + want.toFixed(3) + ' s (' + inn.length + ' casts)');
    T.ok(inn.slice(1).every(function (e, i) { return near(e.t - inn[i].t, want); }), 'one Searing Pain every ' + want.toFixed(3) + ' s — the GCD does not hold it back');
    T.ok(out.length >= 5 && out.every(function (e) { return near(e.castTime, 1.5) && near(e.gcd, 1.5); }), 'afterwards: 1.5 s cast, 1.5 s GCD');
    var h = WL.simulateOnce(tb(['searingPain']), 'human', det(), { seed: 1, duration: 40, log: true });
    var n10 = function (x) { return casts(x, 'searingPain').filter(function (e) { return e.t < 10 - 1e-6; }).length; };
    T.eq([n10(r), n10(h)].join(' vs '), '8 vs 7', 'Searing Pains started in the first 10 s: Troll 8, Human 7');

    T.group('instants and the floor');
    var i = WL.simulateOnce(tb(['corruption', 'baneOfAgony', 'searingPain']), 'troll', det(), { seed: 1, duration: 40, log: true });
    var boa = casts(i, 'baneOfAgony')[0];
    T.ok(boa && boa.t < 10 && near(boa.gcd, want), 'an instant (Bane of Agony) during Berserking: GCD ' + want.toFixed(3) + ' s');
    T.eq(WL.DEFAULT_CONFIG.combat.minGcd, 1, 'the GCD never goes below 1.0 s');
  });
})();
