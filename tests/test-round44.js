// Round 44 tests: DPS above / below the execute threshold (engine side of the new details line).
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't44', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }

  T.run('round 44: execute split', function () {
    T.group('DPS above / below the execute threshold');
    var c = det(), r = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { duration: 60, log: true });
    var cut = 60 * (1 - c.fight.executePct / 100);
    var exHits = r.log.filter(function (e) { return e.type === 'hit' && e.t > cut + 1e-9; }).reduce(function (a, e) { return a + e.dmg; }, 0);
    T.near(r.exDmg, exHits, r.log.filter(function (e) { return e.type === 'hit'; }).length, 'execute damage = the hits after ' + cut + ' s (' + fmt0(exHits) + ', log rounds each hit)');
    T.near(r.preDmg + r.exDmg, r.total, 1e-6, 'damage above + below the threshold = total');
    T.near(r.exTime, 60 * c.fight.executePct / 100, 1e-9, 'execute time = executePct % of the fight (health falls linearly, A24)');
    var agg = WL.simulate(tb(['shadowBolt']), 'human', c, { iterations: 50, log: false });
    T.near(agg.dpsPre * (1 - c.fight.executePct / 100) + agg.dpsExec * c.fight.executePct / 100, agg.dps, 1e-6,
      'weighted by time, the two phases give the mean DPS (' + agg.dpsPre.toFixed(1) + ' / ' + agg.dpsExec.toFixed(1) + ' → ' + agg.dps.toFixed(1) + ')');
    // Without mana limits (the Life Taps of a mana-short build pile up late in the fight, which makes the execute
    // phase slower — real, but not what these two checks are about):
    var cm = det(function (x) { x.gear.mp5 = 100000; });
    var flat = WL.simulate(tb(['shadowBolt']), 'human', cm, { iterations: 50, log: false });
    T.eq(flat.lifeTaps, 0, 'unlimited mana: no Life Taps');
    T.near(flat.dpsExec / flat.dpsPre, 1, 0.03, 'no execute talents, no Life Taps → the two phases are within 3% of each other (' + flat.dpsPre.toFixed(1) + ' / ' + flat.dpsExec.toFixed(1) + ')');
    var dec = WL.simulate(tb(['shadowBolt'], { decimation: 2 }), 'human', cm, { iterations: 50, log: false });
    T.ok(dec.dpsExec > dec.dpsPre * 1.04, 'Decimation (+6% Shadow Bolt below 35%) raises only the execute phase (' + dec.dpsPre.toFixed(1) + ' → ' + dec.dpsExec.toFixed(1) + ')');
  });
  function fmt0(x) { return Math.round(x); }
})();
