// Improved Shadow Bolt application (A20). Round 54 gave the debuff its own spell-hit roll after a Shadow Bolt crit;
// round 123 (user): there is no second roll — a Shadow Bolt crit is guaranteed to apply it. These checks hold the new rule.
(function () {
  function cfg(gearHit, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.hitPct = gearHit; c.gear.critPct = 50; c.gear.weaponIsSword = false;     // many crits = many applications
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  var b = { key: 't54', short: 't', name: 't', notes: '', talents: { improvedShadowBolt: 5 }, pet: null, sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
  function count(r, pred) { return r.log.filter(pred).length; }

  T.run('round 123: a Shadow Bolt crit always applies Improved Shadow Bolt', function () {
    T.group('below the hit cap: every crit applies the debuff, no second roll');
    var crits = 0, applied = 0, missed = 0, boltMiss = 0, c = cfg(7);                 // 83 + 7 = 90% hit
    T.near(WL.computeStats(b, 'human', c).hitPct, 90, 1e-9, 'hit chance 90%');
    for (var s = 1; s <= 6; s++) {
      var r = WL.simulateOnce(b, 'human', c, { seed: s, duration: 600, log: true });
      crits += count(r, function (e) { return e.type === 'hit' && e.spell === 'shadowBolt' && e.crit; });
      applied += count(r, function (e) { return e.type === 'debuff' && e.spell === 'isb'; });
      missed += count(r, function (e) { return e.type === 'miss' && e.spell === 'isb'; });
      boltMiss += count(r, function (e) { return e.type === 'miss' && e.spell === 'shadowBolt'; });
      T.ok(!('isbMissed' in r), 'fight ' + s + ': the result no longer counts debuff misses');
    }
    T.ok(crits > 300, 'plenty of crits (' + crits + ')', crits);
    T.eq(applied, crits, 'debuff applications = Shadow Bolt crits (' + applied + ' of ' + crits + ') at 90% hit');
    T.eq(missed, 0, 'the debuff itself never misses');
    T.ok(boltMiss > 0, 'the Shadow Bolts themselves still miss (' + boltMiss + ') — only the second roll is gone', boltMiss);

    T.group('at 100% hit: unchanged');
    var r100 = WL.simulateOnce(b, 'human', cfg(17), { seed: 1, duration: 300, log: true });
    T.eq(count(r100, function (e) { return e.type === 'debuff' && e.spell === 'isb'; }),
      count(r100, function (e) { return e.type === 'hit' && e.spell === 'shadowBolt' && e.crit; }), 'debuff applications = Shadow Bolt crits');

    T.group('extra targets (Shadow Bolt spread): the same rule');
    var bm = JSON.parse(JSON.stringify(b)); bm.rotation = ['corruption', 'shadowBoltSpread', 'shadowBolt'];
    var cm = cfg(7, function (x) { x.fight.targets = 2; x.fight.multiDot = true; });
    var xc = 0, xa = 0, xm = 0;
    for (var s2 = 1; s2 <= 4; s2++) {
      var rm = WL.simulateOnce(bm, 'human', cm, { seed: s2, duration: 300, log: true });
      xc += count(rm, function (e) { return e.type === 'hit' && e.spell === 'x2:shadowBolt' && e.crit; });
      xa += count(rm, function (e) { return e.type === 'debuff' && e.spell === 'x2:isb'; });
      xm += count(rm, function (e) { return e.type === 'miss' && e.spell === 'x2:isb'; });
    }
    T.ok(xc > 0, 'Shadow Bolts crit on target 2 (' + xc + ')', xc);
    T.eq(xa, xc, 'target 2: ' + xa + ' applications = ' + xc + ' crits');
    T.eq(xm, 0, 'target 2: the debuff never misses');

    T.group('without the talent nothing is applied');
    var nb = JSON.parse(JSON.stringify(b)); nb.talents = {};
    var a1 = WL.simulateOnce(nb, 'human', cfg(7), { seed: 9, duration: 120, log: true });
    T.eq(count(a1, function (e) { return e.spell === 'isb'; }), 0, 'no Improved Shadow Bolt in the log');
  });
})();
