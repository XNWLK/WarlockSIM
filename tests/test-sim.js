// Step 5 tests: simulation engine. Deterministic scenarios use 100% hit, 0% crit so results are exact.
(function () {
  function baseCfg() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100;
    c.gear.critPct = 0; c.gear.hitPct = 0; c.gear.weaponIsSword = false; c.gear.sp = 500;
    c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    return c;
  }
  function testBuild(rotation, talents, extra) {
    var b = { key: 'test', name: 'test', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rotation };
    if (extra) for (var k in extra) b[k] = extra[k];
    return b;
  }

  T.run('sim SB only', function () {
    T.group('sim: deterministic Shadow Bolt only (Human, no talents, SP 500, 30 s)');
    var c = baseCfg(); c.fight.duration = 30;
    var r = WL.simulateOnce(testBuild(['shadowBolt']), 'human', c, { log: true });
    T.eq(r.bySpell.shadowBolt.casts, 10, '10 casts started (0,3,…,27)');
    T.eq(r.bySpell.shadowBolt.hits, 10, '10 hits (cast finishing exactly at 30 s counts)');
    // Round 42: Shadow Bolt R9 = 251 + 0.857 × SP (Wowhead Effect Value 252 − 1, SPELLVALUES.md)
    T.near(r.total, 10 * (251 + 0.857 * 500), 1e-6, 'total = 10 × 679.5');
    T.near(r.dps, 226.5, 1e-6, 'DPS = 226.5');
    T.eq(r.lifeTaps, 0, 'no Life Tap needed');
  });

  T.run('sim corruption + SB', function () {
    T.group('sim: Corruption + Shadow Bolt filler (36 s)');
    var c = baseCfg(); c.fight.duration = 36;
    var r = WL.simulateOnce(testBuild(['corruption', 'shadowBolt']), 'human', c, { log: true });
    T.eq(r.bySpell.corruption.casts, 2, 'Corruption cast at 0 and re-cast at 20 (after expiry)');
    T.eq(r.bySpell.corruption.ticks, 10, 'ticks: 6 (5..20) + 4 (25..34)');
    T.near(r.bySpell.corruption.dmg, 10 * 157, 1e-6, 'Corruption dmg = 10 × (57 + 0.2×500) (R6, round 42)');
    T.eq(r.bySpell.shadowBolt.hits, 10, '10 Shadow Bolts landed (the one started at 34 s does not land)');
    T.near(r.total, 8365, 1e-6, 'total = 6795 + 1570');
    var casts = r.log.filter(function (e) { return e.type === 'cast'; }).map(function (e) { return e.t + ':' + e.spell; });
    T.eq(casts.slice(0, 8).join(' '), '0:corruption 2:shadowBolt 5:shadowBolt 8:shadowBolt 11:shadowBolt 14:shadowBolt 17:shadowBolt 20:corruption',
      'cast order and timing');
  });

  T.run('sim life tap', function () {
    T.group('sim: mana & Life Tap accounting');
    var c = baseCfg(); c.fight.duration = 60; c.gear.int = 0; c.gear.critPct = 0;
    var r = WL.simulateOnce(testBuild(['shadowBolt']), 'human', c, { log: true });
    var st = WL.computeStats(testBuild(['shadowBolt']), 'human', c);
    T.near(st.maxMana, 2743, 1e-9, 'max mana with 110 Int = 1373 + 20 + 15×90');
    T.ok(r.lifeTaps > 0, 'Life Tap used when mana runs low', 'taps=' + r.lifeTaps);
    T.ok(r.minMana >= -1e-9, 'mana never negative', 'min=' + r.minMana);
    var spent = r.bySpell.shadowBolt.casts * 370;                       // Shadow Bolt R9 (round 42)
    T.near(st.maxMana + r.manaFromTaps - spent, r.endMana, 1e-6, 'start + tapped − spent = end mana');
    var tapGain = r.log.filter(function (e) { return e.spell === 'lifeTap'; })[0].gain;
    T.eq(tapGain, 635, 'one tap = 430 + Spirit 204.75 ((115+80) × 1.05 Human Spirit), rounded in log');
  });

  T.run('sim rates', function () {
    T.group('sim: hit/crit rates (statistical)');
    var c = baseCfg(); c.fight.duration = 3000; c.combat.baseHitPct = 90; c.gear.critPct = 20;
    var r = WL.simulateOnce(testBuild(['shadowBolt']), 'human', c, { rng: WL.makeRng(7) });
    var sb = r.bySpell.shadowBolt, n = sb.landed + sb.misses;
    T.near(sb.misses / n, 0.10, 0.02, 'miss rate ≈ 10% (n=' + n + ')');
    T.near(sb.crits / sb.hits, 0.20, 0.025, 'crit rate ≈ 20%');
    T.near(r.bySpell.shadowBolt.dmg / sb.hits, 679.5 * (1 + 0.2 * 0.5), 679.5 * 0.02, 'avg hit ≈ 679.5 × 1.1 (crit ×1.5)');
  });

  T.run('sim BoA ramp', function () {
    T.group('sim: Bane of Agony ramp [A15]');
    var c = baseCfg(); c.fight.duration = 30;
    var r = WL.simulateOnce(testBuild(['bane', 'shadowBolt']), 'human', c, { log: true });
    var ticks = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfAgony'; }).map(function (e) { return e.dmg; });
    var avg = 46 + 0.133 * 500;                                         // Effect Value 47 − 1 (round 42)
    T.eq(ticks.length, 12, '12 ticks');
    T.eq(ticks.join(','), [0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5].map(function (m) { return Math.round(avg * m); }).join(','), 'tick pattern 50/100/150%');
    T.ok(!r.bySpell.baneOfDoom, 'Bane of Doom skipped when < 60 s remain', '');
  });

  T.run('sim BoD', function () {
    T.group('sim: Bane of Doom');
    var c = baseCfg(); c.fight.duration = 135;
    var r = WL.simulateOnce(testBuild(['bane', 'shadowBolt']), 'human', c, { log: true });
    // BoD at 0 → explodes at 60; Life Taps (55.5, 61.5) shift the timeline so the player is free at exactly 60 →
    // BoD re-cast at 60 (tick is processed before the decision) → explodes 120 → 15 s left → BoA.
    var bodCasts = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'baneOfDoom'; }).map(function (e) { return e.t; });
    T.eq(bodCasts.join(','), '0,60', 'BoD cast at 0 and 60 s (re-cast the moment it explodes)');
    T.near(r.bySpell.baneOfDoom.dmg, 2 * (1742 + 4 * 500), 1e-6, 'each explosion = 1742 + 4×SP (Value 1743 − 1, round 42)');
    T.eq(r.bySpell.baneOfAgony.casts, 1, 'BoA used once after the 2nd BoD explodes (15 s left, < 60)');
  });

  T.run('sim invariants', function () {
    T.group('sim: invariants on every real build × race (default config, 20 fights)');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.iterations = 20; c.combat.targetResist = { shadow: 0, fire: 0 }; c.gear.pierce = 15;
    WL.BUILDS.concat(WL.TEST_BUILDS).forEach(function (b) {
      WL.RACE_KEYS.forEach(function (rk) {
        var r = WL.simulate(b, rk, c);
        var sum = Object.keys(r.firstFight.bySpell).reduce(function (a, k) { return a + r.firstFight.bySpell[k].dmg; }, 0);
        var id = b.key + '/' + rk;
        T.near(sum, r.firstFight.total, 1e-6, id + ': per-spell damage sums to total');
        T.ok(r.dps > 0 && isFinite(r.dps), id + ': DPS positive & finite', r.dps);
        T.ok(r.minMana >= -1e-6, id + ': mana never negative', r.minMana);
        var prev = -1, bad = null;
        r.log.forEach(function (e) { if (e.t < prev - 1e-9) bad = e; prev = e.t; });
        T.ok(!bad, id + ': log is chronological', JSON.stringify(bad));
        var casts = r.log.filter(function (e) { return e.type === 'cast' || e.type === 'clip'; }), overlap = null;
        for (var i = 1; i < casts.length; i++) {
          var a = casts[i - 1], z = casts[i];
          if (a.type === 'cast' && z.type === 'cast' && a.castTime > 0 && WL.SPELLS[a.spell].kind !== 'channel' && z.t < a.t + a.castTime - 0.0025) overlap = [a, z]; // log rounds to ms
        }
        T.ok(!overlap, id + ': no cast starts before the previous cast finished', JSON.stringify(overlap));
        var used = b.rotation.map(function (a) { return a; });
        T.ok(r.firstFight.bySpell[b.rotation[b.rotation.length - 1]] || r.firstFight.bySpell.shadowBolt, id + ': filler was cast', used.join(','));
      });
    });
    var b0 = WL.TEST_BUILDS[0], r1 = WL.simulate(b0, 'orc', c), r2 = WL.simulate(b0, 'orc', c);
    T.eq(r1.dps, r2.dps, 'same seed → identical DPS (deterministic)');
  });
})();
