// Round 59 tests: a Shadow Trance (Nightfall) proc is always spent on the max-rank Shadow Bolt — Rank 9, or Rank 10 with
// the AQ20 book option — also when the filler is Shadow Bolt Rank 2 (user). Before: the Rank 2 filler took the proc.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't59', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function log(r, type, spell) { return r.log.filter(function (e) { return e.type === type && (!spell || e.spell === spell); }); }

  T.run('round 59: Nightfall uses the max-rank Shadow Bolt', function () {
    [false, true].forEach(function (book) {
      var tag = book ? 'book ranks on (Rank 10)' : 'trainer ranks (Rank 9)';
      T.group('Rank 2 filler, no Shadow Trance action — ' + tag);
      var c = det(function (x) { x.options.bookRanks = book; });
      var b = tb(['corruption', 'shadowBoltR2'], { nightfall: 2 });
      var st = WL.computeStats(b, 'human', c), tab = WL.buildSpellTable(b, st, c);
      var maxHit = Math.round(tab.shadowBolt.directDmg), r2Hit = Math.round(tab.shadowBoltR2.directDmg);
      T.eq(WL.spellsFor(c).shadowBolt.base, book ? 268 : 251, 'max-rank Shadow Bolt base ' + (book ? 268 : 251) + ' (' + tag + ')');
      var r = WL.simulateOnce(b, 'human', c, { duration: 600, log: true, seed: 5 });
      var procs = log(r, 'proc', 'shadowTrance').length, tr = log(r, 'cast', 'shadowBolt').filter(function (e) { return e.trance; });
      T.ok(procs >= 5, 'enough Nightfall procs to test (' + procs + ')');
      T.ok(tr.length >= procs - 1 && tr.every(function (e) { return e.castTime === 0; }), 'every proc → an instant max-rank Shadow Bolt (' + tr.length + ' of ' + procs + ' procs)');
      T.eq(log(r, 'cast', 'shadowBoltR2').filter(function (e) { return e.trance; }).length, 0, 'no Rank 2 bolt ever takes the proc');
      T.eq(log(r, 'cast', 'shadowBolt').length, tr.length, 'max-rank bolts are cast only on procs (the filler stays Rank 2)');
      var sbHits = log(r, 'hit', 'shadowBolt').map(function (e) { return e.dmg; });
      T.ok(sbHits.length > 0 && sbHits.every(function (d) { return d === maxHit; }), 'those bolts hit for the max-rank value ' + maxHit + ' (Rank 2: ' + r2Hit + ')');
    });

    T.group('same with the Shadow Trance action; Rank 9 filler builds unchanged');
    var c9 = det(), rA = WL.simulateOnce(tb(['shadowTrance', 'corruption', 'shadowBoltR2'], { nightfall: 2 }), 'human', c9, { duration: 600, log: true, seed: 5 });
    var rB = WL.simulateOnce(tb(['corruption', 'shadowBoltR2'], { nightfall: 2 }), 'human', c9, { duration: 600, log: true, seed: 5 });
    T.eq(log(rA, 'cast', 'shadowBolt').filter(function (e) { return e.trance; }).length, log(rB, 'cast', 'shadowBolt').filter(function (e) { return e.trance; }).length,
      'with or without the Shadow Trance action: the same number of instant max-rank bolts');
    var r9 = WL.simulateOnce(tb(['corruption', 'shadowBolt'], { nightfall: 2 }), 'human', c9, { duration: 300, log: true, seed: 6 });
    T.ok(log(r9, 'cast', 'shadowBolt').filter(function (e) { return e.trance; }).length > 0 && log(r9, 'cast', 'shadowBoltR2').length === 0, 'a Rank 9 filler still takes its own procs, no Rank 2 appears');

    T.group('label');
    T.ok(/max rank/.test(WL.ACTIONS.shadowTrance.label), 'priority action reads "' + WL.ACTIONS.shadowTrance.label + '"');
  });
})();
