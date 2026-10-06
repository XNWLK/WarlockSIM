// Round 63 tests: "Shadow Bolt (max rank) to keep Improved Shadow Bolt up on the boss" (isbUpkeep, A72) — for Fire builds
// whose Shadow damage (Corruption, Banes, Shadowburn) should get ISB's +20%.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.weaponIsSword = false;
    c.fight.durationVarPct = 0; c.options.includePetDamage = false; c.options.useCurseOfElements = false; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't63', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function log(r, type, spell) { return r.log.filter(function (e) { return e.type === type && e.spell === spell; }); }

  T.run('round 63: keep Improved Shadow Bolt up', function () {
    T.group('Shadow Bolt only while ISB is down (Incinerate filler, 30% crit, 100% hit)');
    var c = det(function (x) { x.gear.critPct = 30; });
    var t = { improvedShadowBolt: 5, incinerate: 1, bane: 5 };
    var r = WL.simulateOnce(tb(['corruption', 'isbUpkeep', 'searingPain'], t), 'human', c, { duration: 300, log: true, seed: 21 });
    var sb = log(r, 'cast', 'shadowBolt'), crits = r.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt' && e.crit; });
    var isb = log(r, 'debuff', 'isb');
    T.ok(sb.length > 5 && crits.length > 1, 'Shadow Bolts are cast (' + sb.length + ') and crit (' + crits.length + ')');
    T.eq(isb.length, crits.length, 'every crit applies ISB at 100% hit (' + isb.length + ')');
    // each Shadow Bolt starts while ISB is missing or has at most one cast time left
    var castT = WL.buildSpellTable(tb(['shadowBolt'], t), WL.computeStats(tb(['shadowBolt'], t), 'human', c), c).shadowBolt.cast;
    var ok = sb.every(function (e) {
      var last = isb.filter(function (d) { return d.t <= e.t + 1e-6; }).pop();
      return !last || last.t + 12 - e.t <= castT + 1e-6;
    });
    T.ok(ok, 'no Shadow Bolt is cast while ISB has more than one cast (' + castT.toFixed(2) + ' s) left');
    var fill = log(r, 'cast', 'searingPain');
    T.ok(fill.length > 10, 'the rest of the time the filler is cast (' + fill.length + ' Searing Pains)');
    T.ok(fill.some(function (e) { var last = isb.filter(function (d) { return d.t <= e.t; }).pop(); return last && e.t - last.t < 12 - castT; }), 'fillers are cast while ISB is up');

    T.group('rules');
    var n = WL.simulateOnce(tb(['corruption', 'isbUpkeep', 'searingPain'], { incinerate: 1 }), 'human', c, { duration: 60, log: true, seed: 21 });
    T.eq(log(n, 'cast', 'shadowBolt').length, 0, 'without the Improved Shadow Bolt talent the action never casts');
    var legal = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === 'destro_incin_succ'; })[0]));
    legal.rotation.splice(legal.rotation.indexOf('incinerate'), 0, 'isbUpkeep');
    T.ok(WL.validateBuild(legal).some(function (e) { return /Improved Shadow Bolt/.test(e); }), 'the editor refuses it without the talent');
    legal.talents.aftermath -= 2; legal.talents.improvedShadowBolt = 2;
    T.eq(WL.validateBuild(legal).join(' | '), '', 'legal with the talent (Destro Incinerate Succubus −2 Aftermath +2 ISB)');
    T.eq(WL.decodeBuild(WL.encodeBuild(legal)).rotation.join(','), legal.rotation.join(','), 'survives a build code round trip');
    var bk = det(function (x) { x.options.bookRanks = true; x.gear.critPct = 30; });
    var rb = WL.simulateOnce(tb(['isbUpkeep', 'searingPain'], t), 'human', bk, { duration: 60, log: true, seed: 22 });
    var st = WL.buildSpellTable(tb(['shadowBolt'], t), WL.computeStats(tb(['shadowBolt'], t), 'human', bk), bk);
    var nc = rb.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt' && !e.crit; });
    T.eq(WL.spellsFor(bk).shadowBolt.base, 268, 'book ranks: the max-rank bolt is Rank 10 (268)');
    T.ok(nc.length > 0 && nc.every(function (e) { return e.dmg === Math.round(st.shadowBolt.directDmg); }), 'every non-crit bolt hits for the Rank 10 value ' + Math.round(st.shadowBolt.directDmg) + ' (' + nc.length + ' hits)');
  });
})();
