// Round 53 tests: end-of-fight DoT check (A69). Deterministic: 100% hit, 0% crit, no resists, no CoE, no pets, fixed length.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't53', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function table(b, c) { return WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c); }
  function skips(r) { return r.log.filter(function (e) { return e.type === 'skip'; }); }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }); }

  T.run('round 53: end-of-fight DoT check', function () {
    T.group('Corruption vs Shadow Bolt: value = ticks that land in time, cost = cast time × Shadow Bolt rate');
    var b = tb(['corruption', 'shadowBolt']), c = det(), tab = table(b, c);
    var tick = tab.corruption.tickDmg, sb = tab.shadowBolt.directDmg, sbRate = sb / 3.0;       // no talents: SB 3 s, Corruption 2 s cast
    var cost = 2.0 * sbRate, need = Math.ceil(cost / tick - 1e-9);
    T.ok(need >= 2, 'break-even: ' + need + ' ticks (' + tick.toFixed(1) + ' each) needed to beat ' + cost.toFixed(1) + ' of Shadow Bolt', need);
    // Find a fight length where the old rule (≥ 2 ticks) recasts Corruption with fewer ticks than the break-even.
    var found = null;
    for (var d = 40; d <= 90 && !found; d += 0.5) {
      var off = WL.simulateOnce(b, 'human', det(function (x) { x.options.dotEndCheck = false; }), { duration: d, log: true, seed: 3 });
      var last = casts(off, 'corruption').pop(), n = last ? Math.floor((d - (last.t + 2.0)) / 3 + 1e-9) : 0;
      if (last && last.t + 2.0 + 18 > d + 1e-9 && n >= 2 && n < need) found = { d: d, t: last.t, n: n };
    }
    T.ok(!!found, 'a fight where the old rule recasts Corruption for too few ticks (' + (found ? found.n + ' ticks at ' + found.t + ' s of ' + found.d + ' s' : 'none') + ')', found);
    if (found) {
      var on = WL.simulateOnce(b, 'human', c, { duration: found.d, log: true, seed: 3 });
      var sk = skips(on).filter(function (e) { return e.spell === 'corruption'; })[0];
      T.ok(!!sk && Math.abs(sk.t - found.t) < 1e-6, 'check on: the same recast is skipped at ' + (sk && sk.t) + ' s');
      if (sk) {
        T.near(sk.value, found.n * tick, 1, 'skip value = ' + found.n + ' ticks × ' + tick.toFixed(1) + ' (log rounds)');
        T.near(sk.cost, cost, 1, 'skip cost = 2.0 s × Shadow Bolt ' + sb.toFixed(1) + ' / 3.0 s');
        T.eq(sk.filler, 'shadowBolt', 'the alternative is the Shadow Bolt filler');
      }
      T.ok(on.dps > WL.simulateOnce(b, 'human', det(function (x) { x.options.dotEndCheck = false; }), { duration: found.d, seed: 3 }).dps,
        'skipping it gives more damage in that fight (no crits: deterministic)');
      T.ok(casts(on, 'corruption').every(function (e) { return e.t + 2.0 + 18 <= found.d + 1e-9 || Math.floor((found.d - e.t - 2.0) / 3 + 1e-9) >= need; }),
        'every Corruption cast with the check on either runs fully or has ≥ ' + need + ' ticks left');
    }

    T.group('Bane of Agony: the ramp counts (first 4 ticks at 50%)');
    var ba = tb(['bane', 'shadowBolt']), tA = table(ba, c), agTick = tA.baneOfAgony.tickDmg;   // < 60 s: no Bane of Doom
    // 30 s: Agony at 0 s runs out at 24 s → the recast would have 6 s = 3 ticks at 50%.
    var ra = WL.simulateOnce(ba, 'human', c, { duration: 30, log: true, seed: 5 });
    var ska = skips(ra).filter(function (e) { return e.spell === 'baneOfAgony'; })[0];
    T.ok(!!ska, 'Bane of Agony skipped near the end of a 30 s fight (' + (ska ? ska.left + ' s left' : 'none') + ')', ska);
    if (ska) {
      var nA = Math.floor(ska.left / 2 + 1e-9), ramp = WL.SPELLS.baneOfAgony.ramp.slice(0, nA).reduce(function (a, x) { return a + x; }, 0);
      T.near(ska.value, ramp * agTick, 1, nA + ' ticks with ramp sum ' + ramp + ' × ' + agTick.toFixed(1));
      T.near(ska.cost, 1.5 * tA.shadowBolt.directDmg / 3.0, 1, 'instant: cost = one GCD (1.5 s) of Shadow Bolt');
    }

    T.group('the alternative is the next damaging action, not always the filler');
    var bx = tb(['corruption', 'searingPainExecute', 'shadowBolt']), tX = table(bx, c);
    var rx = WL.simulateOnce(bx, 'human', c, { duration: 40, log: true, seed: 7 });   // the end of the fight is in the execute phase
    var skx = skips(rx).filter(function (e) { return e.spell === 'corruption'; })[0];
    T.ok(!!skx && skx.filler === 'searingPain', 'in the execute phase Corruption is weighed against Searing Pain (' + (skx && skx.filler) + ')');
    if (skx) T.near(skx.cost, 2.0 * tX.searingPain.directDmg / 1.5, 1, 'cost = 2.0 s × Searing Pain ' + tX.searingPain.directDmg.toFixed(1) + ' / 1.5 s');

    T.group('Immolate: its direct hit counts too');
    var bi = tb(['immolate', 'shadowBolt']), tI = table(bi, c);
    // Look for a fight whose skipped Immolate would still have ticked (so both parts of the value are checked).
    var ski = null;
    for (var di = 40; di <= 80 && !ski; di += 0.5) {
      var ri = WL.simulateOnce(bi, 'human', c, { duration: di, log: true, seed: 9 });
      var s0 = skips(ri).filter(function (e) { return e.spell === 'immolate'; })[0];
      if (s0 && Math.floor((s0.left - 2.0) / 3 + 1e-9) >= 1) ski = s0;
    }
    T.ok(!!ski, 'an Immolate skipped with at least one tick still to come', ski);
    if (ski) {
      var nI = Math.floor((ski.left - 2.0) / 3 + 1e-9);
      T.near(ski.value, tI.immolate.directDmg + nI * tI.immolate.tickDmg, 1, 'value = direct ' + tI.immolate.directDmg.toFixed(1) + ' + ' + nI + ' tick(s) × ' + tI.immolate.tickDmg.toFixed(1) + ' (' + ski.left + ' s left)');
      T.ok(ski.value < ski.cost && tI.immolate.directDmg + (nI + 1) * tI.immolate.tickDmg >= 2.0 * tI.shadowBolt.directDmg / 3.0,
        'skipped because it is short of the Shadow Bolt time by less than one more tick (break-even is ' + (nI + 1) + ' ticks)');
    }

    T.group('switched off / whole DoT fits');
    var ro = WL.simulateOnce(b, 'human', det(function (x) { x.options.dotEndCheck = false; }), { duration: 60, log: true, seed: 3 });
    T.eq(skips(ro).length + Object.keys(ro.dotSkips).length, 0, 'check off: no skips at all');
    var long = WL.simulateOnce(b, 'human', c, { duration: 60, log: true, seed: 3 });
    T.ok(skips(long).every(function (e) { return e.left + 1e-6 < 2.0 + 18; }), 'nothing is skipped while the whole DoT still fits');
    var agg = WL.simulate(b, 'human', c, { iterations: 30, log: false });
    var a = agg.dotSkips.corruption;
    T.ok(!!a && a.fightsPct > 0 && a.fightsPct <= 100 && a.value < a.cost, 'simulate() reports the skips (' + (a ? a.fightsPct.toFixed(0) + '% of fights, ' + a.left.toFixed(1) + ' s left' : '–') + ')');
  });
})();
