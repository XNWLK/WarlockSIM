// Round 59 tests: a Shadow Trance (Nightfall) proc is spent on the max-rank Shadow Bolt — Rank 9, or Rank 10 with the AQ20
// book option. (Until round 81 this also covered a Shadow Bolt Rank 2 filler; Rank 2 was gutted in Forever and removed.)
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't59', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function log(r, type, spell) { return r.log.filter(function (e) { return e.type === type && (!spell || e.spell === spell); }); }

  T.run('round 59: Nightfall uses the max-rank Shadow Bolt', function () {
    [false, true].forEach(function (book) {
      var tag = book ? 'book ranks on (Rank 10)' : 'trainer ranks (Rank 9)';
      T.group('Shadow Bolt filler, no Shadow Trance action — ' + tag);
      var c = det(function (x) { x.options.bookRanks = book; });
      var b = tb(['corruption', 'shadowBolt'], { nightfall: 2 });
      var st = WL.computeStats(b, 'human', c), tab = WL.buildSpellTable(b, st, c), maxHit = Math.round(tab.shadowBolt.directDmg);
      T.eq(WL.spellsFor(c).shadowBolt.base, book ? 268 : 251, 'max-rank Shadow Bolt base ' + (book ? 268 : 251) + ' (' + tag + ')');
      var r = WL.simulateOnce(b, 'human', c, { duration: 600, log: true, seed: 5 });
      var procs = log(r, 'proc', 'shadowTrance').length, tr = log(r, 'cast', 'shadowBolt').filter(function (e) { return e.trance; });
      T.ok(procs >= 5, 'enough Nightfall procs to test (' + procs + ')');
      T.ok(tr.length >= procs - 1 && tr.every(function (e) { return e.castTime === 0; }), 'every proc → an instant Shadow Bolt (' + tr.length + ' of ' + procs + ' procs)');
      var sbHits = log(r, 'hit', 'shadowBolt').map(function (e) { return e.dmg; });
      T.ok(sbHits.length > 0 && sbHits.every(function (d) { return d === maxHit; }), 'every bolt hits for the max-rank value ' + maxHit);
    });

    T.group('same with the Shadow Trance action');
    var c9 = det(), rA = WL.simulateOnce(tb(['shadowTrance', 'corruption', 'shadowBolt'], { nightfall: 2 }), 'human', c9, { duration: 600, log: true, seed: 5 });
    var tA = log(rA, 'cast', 'shadowBolt').filter(function (e) { return e.trance; });
    T.ok(tA.length > 0 && tA.every(function (e) { return e.castTime === 0; }), 'Shadow Trance action: ' + tA.length + ' instant bolts');

    T.group('label');
    T.ok(/max rank/.test(WL.ACTIONS.shadowTrance.label), 'priority action reads "' + WL.ACTIONS.shadowTrance.label + '"');
  });
})();
