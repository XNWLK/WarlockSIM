// Round 54 tests: Improved Shadow Bolt rolls its own spell-hit check after a Shadow Bolt crit (user; A20).
(function () {
  function cfg(gearHit, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.hitPct = gearHit; c.gear.critPct = 50; c.gear.weaponIsSword = false;     // many crits = many ISB rolls
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  var b = { key: 't54', short: 't', name: 't', notes: '', talents: { improvedShadowBolt: 5 }, pet: null, sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
  function count(r, pred) { return r.log.filter(pred).length; }

  T.run('round 54: Improved Shadow Bolt hit roll', function () {
    T.group('every Shadow Bolt crit rolls for the debuff with your spell hit');
    var crits = 0, applied = 0, missed = 0, c = cfg(7);                               // 83 + 7 = 90% hit
    T.near(WL.computeStats(b, 'human', c).hitPct, 90, 1e-9, 'hit chance 90%');
    for (var s = 1; s <= 6; s++) {
      var r = WL.simulateOnce(b, 'human', c, { seed: s, duration: 600, log: true });
      crits += count(r, function (e) { return e.type === 'hit' && e.spell === 'shadowBolt' && e.crit; });
      applied += count(r, function (e) { return e.type === 'debuff' && e.spell === 'isb'; });
      missed += count(r, function (e) { return e.type === 'miss' && e.spell === 'isb'; });
      T.eq(r.isbMissed || 0, count(r, function (e) { return e.type === 'miss' && e.spell === 'isb'; }), 'fight ' + s + ': res.isbMissed = the logged debuff misses');
    }
    T.eq(applied + missed, crits, 'each crit rolls once: ' + applied + ' applied + ' + missed + ' missed = ' + crits + ' crits');
    T.near(100 * missed / crits, 10, 3, 'the debuff misses ≈ 10% of crits (' + (100 * missed / crits).toFixed(1) + '%)');

    T.group('at 100% hit every crit applies it');
    var r100 = WL.simulateOnce(b, 'human', cfg(17), { seed: 1, duration: 300, log: true });
    T.eq(count(r100, function (e) { return e.type === 'miss' && e.spell === 'isb'; }), 0, 'no debuff misses at 100% hit');
    T.eq(count(r100, function (e) { return e.type === 'debuff' && e.spell === 'isb'; }),
      count(r100, function (e) { return e.type === 'hit' && e.spell === 'shadowBolt' && e.crit; }), 'debuff applications = Shadow Bolt crits');

    T.group('extra targets roll too (Shadow Bolt spread, round 39)');
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
    T.eq(xa + xm, xc, 'target 2: ' + xa + ' applied + ' + xm + ' missed = ' + xc + ' crits');

    T.group('own random stream: without the talent nothing changes');
    var nb = JSON.parse(JSON.stringify(b)); nb.talents = {};
    var a1 = WL.simulateOnce(nb, 'human', cfg(7), { seed: 9, duration: 120 });
    T.eq(a1.isbMissed || 0, 0, 'no ISB rolls without Improved Shadow Bolt');
  });
})();
