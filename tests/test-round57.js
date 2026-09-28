// Round 57 tests: Shadow Bolt Rank 2 (spell 695) as a filler; talents that name Shadow Bolt apply to it (A70).
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't57', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function log(r, type, spell) { return r.log.filter(function (e) { return e.type === type && e.spell === spell; }); }

  T.run('round 57: Shadow Bolt Rank 2', function () {
    T.group('data: Wowhead Forever spell 695 (Effect Value 26 − 1, SP mod 0.629, 2.2 s, 40 mana)');
    var s = WL.SPELLS.shadowBoltR2;
    T.eq([s.id, s.rank, s.base, s.coef, s.cast, s.cost].join(','), '695,2,25,0.629,2.2,40', 'id 695, rank 2, base 25, coef 0.629, 2.2 s, 40 mana');
    T.ok(WL.isShadowBolt('shadowBoltR2') && WL.isShadowBolt('shadowBolt') && !WL.isShadowBolt('searingPain'), 'counts as a Shadow Bolt');

    T.group('damage and cast time (no talents; Bane 5/5 −0.5 s)');
    var c = det(), b = tb(['shadowBoltR2']), st = WL.computeStats(b, 'human', c), tab = WL.buildSpellTable(b, st, c);
    var dmg = 25 + 0.629 * tab.shadowBoltR2.sp;
    T.near(tab.shadowBoltR2.directDmg, dmg, 1e-9, 'hit = 25 + 0.629 × ' + tab.shadowBoltR2.sp + ' SP = ' + dmg.toFixed(1));
    var r = WL.simulateOnce(b, 'human', c, { duration: 60, log: true, seed: 1 });
    var hits = log(r, 'hit', 'shadowBoltR2');
    T.ok(hits.every(function (e) { return e.dmg === Math.round(dmg); }), 'every hit ' + Math.round(dmg) + ' (100% hit, 0% crit)');
    var casts = log(r, 'cast', 'shadowBoltR2');
    T.ok(casts.slice(1).every(function (e, i) { return Math.abs(e.t - casts[i].t - 2.2) < 1e-6 || e.t - casts[i].t > 2.2; }), 'casts 2.2 s apart (Life Taps in between excepted)');
    var tb5 = WL.buildSpellTable(tb(['shadowBoltR2'], { bane: 5 }), st, c);
    T.near(tb5.shadowBoltR2.cast, 1.7, 1e-9, 'Bane 5/5: 2.2 − 0.5 = 1.7 s (the talent names Shadow Bolt)');

    T.group('Improved Shadow Bolt, Shadow Trance and Decimation work on Rank 2');
    var ci = det(function (x) { x.gear.critPct = 50; });
    var ri = WL.simulateOnce(tb(['shadowBoltR2'], { improvedShadowBolt: 5 }), 'human', ci, { duration: 120, log: true, seed: 2 });
    var crits = ri.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBoltR2' && e.crit; }).length;
    T.ok(crits > 0 && log(ri, 'debuff', 'isb').length === crits, 'every Rank 2 crit applies ISB at 100% hit (' + crits + ' crits)');
    var rn = WL.simulateOnce(tb(['corruption', 'shadowBoltR2'], { nightfall: 2 }), 'human', c, { duration: 300, log: true, seed: 3 });
    // Round 59 (user): the proc is spent on the max-rank Shadow Bolt instead (was: the next Rank 2 became instant).
    var tr = log(rn, 'cast', 'shadowBolt').filter(function (e) { return e.trance; });
    T.ok(tr.length > 0 && tr.every(function (e) { return e.castTime === 0; }) && log(rn, 'cast', 'shadowBoltR2').every(function (e) { return !e.trance; }),
      'Shadow Trance with a Rank 2 filler → an instant max-rank Shadow Bolt, never Rank 2 (round 59; ' + tr.length + '×)');
    var rd = WL.simulateOnce(tb(['shadowBoltR2'], { decimation: 2 }), 'human', c, { duration: 60, log: true, seed: 4 });
    var cut = 60 * (1 - c.fight.executePct / 100), dec = log(rd, 'hit', 'shadowBoltR2');
    var pre = dec.filter(function (e) { return e.t < cut - 1e-6; })[0], ex = dec.filter(function (e) { return e.t > cut + 1e-6; })[0];
    T.ok(pre && ex && ex.dmg > pre.dmg, 'Decimation raises Rank 2 below the execute threshold (' + (pre && pre.dmg) + ' → ' + (ex && ex.dmg) + ')');

    T.group('rotation and editor');
    T.ok(WL.ACTIONS.shadowBoltR2 && WL.ACTIONS.shadowBoltR2.filler, 'filler action "Shadow Bolt Rank 2"');
    var legal = JSON.parse(JSON.stringify(WL.BUILDS[0])); legal.rotation = legal.rotation.map(function (a) { return a === 'shadowBolt' ? 'shadowBoltR2' : a; });
    T.eq(WL.validateBuild(legal).join(' | '), '', 'a real build with the Rank 2 filler is legal');
    T.eq(WL.decodeBuild(WL.encodeBuild(legal)).rotation.join(','), legal.rotation.join(','), 'survives a build code round trip');
  });
})();
