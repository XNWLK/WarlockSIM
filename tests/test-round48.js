// Round 48 tests: hit cap 100% (user: Forever removed the permanent 1% miss → 17% hit above the 83% base is usable).
(function () {
  function cfg(hit) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.hitPct = hit; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false;
    return c;
  }
  function tb(rot, t, pet) { return { key: 't48', short: 't', name: 't', notes: '', talents: t || {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }; }
  function misses(r, k) { return r.bySpell[k] ? r.bySpell[k].misses : 0; }

  T.run('round 48: hit cap 100%', function () {
    T.group('hit cap: 17% usable hit, 100% reachable');
    var c = WL.DEFAULT_CONFIG.combat;
    T.eq(c.maxHitPct, 100, 'default cap = 100%');
    T.eq(c.maxHitPct - c.baseHitPct, 17, '17% hit above the 83% base is usable');
    var b = tb(['shadowBolt']);
    T.near(WL.computeStats(b, 'human', cfg(16)).hitPct, 99, 1e-9, '16% gear hit → 99% (no longer the cap)');
    T.near(WL.computeStats(b, 'human', cfg(17)).hitPct, 100, 1e-9, '17% gear hit → 100%');
    T.near(WL.computeStats(b, 'human', cfg(20)).hitPct, 100, 1e-9, '20% gear hit → still 100% (capped)');
    T.near(WL.computeStats(b, 'human', cfg(20)).hitPctUncapped, 103, 1e-9, 'uncapped hit still reported (83 + 20)');

    // At 100% nothing misses: your spells and your pet's spells (they use your hit chance). Pet melee has its own
    // table (A46): 8% miss − your hit above the base, first 1% ignored → 0% from 9% hit on, unchanged by the cap; its
    // row counts DODGES as misses too (6.5%, hit cannot remove them) — the first version of this test forgot that (B15).
    var bi = tb(['shadowBolt'], {}, 'imp'), bs = tb(['shadowBolt'], {}, 'succubus');
    var n = 0, m = 0, pm = 0, n99 = 0, m99 = 0, sw = 0, mm = 0;
    for (var s = 1; s <= 20; s++) {
      var ri = WL.simulateOnce(bi, 'human', cfg(17), { duration: 120, seed: s });
      var rs = WL.simulateOnce(bs, 'human', cfg(17), { duration: 120, seed: s });
      var r9 = WL.simulateOnce(bi, 'human', cfg(16), { duration: 120, seed: s });
      n += ri.bySpell.shadowBolt.casts; m += misses(ri, 'shadowBolt');
      pm += misses(ri, 'pet:firebolt') + misses(rs, 'pet:lashOfPain');
      sw += rs.bySpell['pet:melee'].casts; mm += misses(rs, 'pet:melee');
      n99 += r9.bySpell.shadowBolt.casts; m99 += misses(r9, 'shadowBolt') + misses(r9, 'pet:firebolt');
    }
    T.eq(m, 0, 'at 100% hit no Shadow Bolt misses (' + n + ' casts over 20 fights)');
    T.eq(pm, 0, 'at 100% hit no Firebolt / Lash of Pain misses');
    T.near(100 * mm / sw, WL.DEFAULT_CONFIG.combat.petMelee.dodgePct, 1.5, 'Succubus melee: only dodges left (' + mm + ' / ' + sw + ' swings = ' + (100 * mm / sw).toFixed(2) + '%, dodge 6.5%)');
    T.ok(m99 > 0, 'at 99% hit some casts still miss (the 17th % of hit has value)', m99 + ' misses / ' + n99 + ' Shadow Bolts');
  });
})();
