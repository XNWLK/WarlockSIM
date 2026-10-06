// Round 107 tests (user): a cooldown starts when the cast is complete, not when it begins. Soul Fire is the only spell
// with both a cast time and a cooldown (6 s cast / 60 s; with Decimation 2/2: 6 s cooldown and a shorter cast).
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.gear.hastePct = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.fight.startingShards = 10;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (f) f(c);
    return c;
  }
  function tb(rot, t, tl) { var b = { key: 't107', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; if (tl) b.timeline = tl; return b; }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }); }
  function gaps(list) { return list.slice(1).map(function (e, i) { return e.t - (list[i].t + list[i].castTime); }); }   // end of one cast → start of the next

  T.run('round 107: a cooldown starts when the cast completes', function () {
    T.group('Soul Fire, no Decimation (6 s cast, 60 s cooldown)');
    var c = det(), b = tb(['soulFireShards', 'searingPain']);
    var tab = WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c);
    T.eq([tab.soulFire.cast, tab.soulFire.cd].join('/'), '6/60', 'spell table: 6 s cast, 60 s cooldown');
    var r = WL.simulateOnce(b, 'human', c, { seed: 1, duration: 150, log: true }), sf = casts(r, 'soulFire');
    T.eq(sf.length, 3, 'three Soul Fires in 150 s (at ' + sf.map(function (e) { return e.t.toFixed(1); }).join(', ') + ' s)');
    T.ok(gaps(sf).every(function (g) { return g >= 60 - 1e-6 && g < 60 + 1.6; }), 'the next one starts 60 s after the previous cast ENDED (' + gaps(sf).map(function (g) { return g.toFixed(2); }).join(', ') + ' s), i.e. 66 s after it began');
    T.ok(sf.slice(1).every(function (e, i) { return e.t - sf[i].t >= 66 - 1e-6; }), 'never 60 s after the previous one began');

    T.group('Soul Fire under Decimation 2/2 (6 s cooldown)');
    var bd = tb(['soulFire', 'searingPain'], { decimation: 2 }), td = WL.buildSpellTable(bd, WL.computeStats(bd, 'human', c), c);
    var rd = WL.simulateOnce(bd, 'human', c, { seed: 1, duration: 120, log: true }), sd = casts(rd, 'soulFire');
    T.ok(Math.abs(td.soulFire.cd - 6) < 1e-6 && sd.length >= 3 && sd.every(function (e) { return Math.abs(e.castTime - 3.6) < 1e-3; }), sd.length + ' Soul Fires in the execute phase, 3.6 s casts, 6 s cooldown');
    T.ok(gaps(sd).every(function (g) { return g >= 6 - 1e-6; }), 'each starts at least 6 s after the previous cast ended (' + gaps(sd).map(function (g) { return g.toFixed(2); }).join(', ') + ' s)');
    T.ok(sd.slice(1).every(function (e, i) { return e.t - sd[i].t >= 9.6 - 1e-6; }), 'so at least 9.6 s lie between two starts (6 s before this round)');

    T.group('instants are unchanged');
    var bc = tb(['immolate', 'conflagrate', 'searingPain'], { conflagrate: 1, shadowAndFlame: 5 });
    var rc = WL.simulateOnce(bc, 'human', c, { seed: 1, duration: 90, log: true }), cf = casts(rc, 'conflagrate');
    var cg = cf.slice(1).map(function (e, i) { return e.t - cf[i].t; });
    T.ok(cf.length >= 6 && cg.every(function (g) { return g >= 10 - 1e-6; }) && Math.min.apply(null, cg) < 10 + 1.6, 'Conflagrate: 10 s from cast to cast (' + cf.length + ' casts, shortest gap ' + Math.min.apply(null, cg).toFixed(2) + ' s)');

    T.group('pushback moves the cooldown with the cast');
    var cp = det(function (x) { x.fight.hitEvery = 1.5; });
    var rp = WL.simulateOnce(tb(['soulFireShards', 'searingPain']), 'human', cp, { seed: 1, duration: 150, log: true }), sp = casts(rp, 'soulFire');
    var land = rp.log.filter(function (e) { return e.type === 'hit' && e.spell === 'soulFire'; });
    T.ok(land.length >= 1 && land[0].t > sp[0].t + 6 + 0.5, 'the first Soul Fire is pushed back: it lands at ' + land[0].t.toFixed(2) + ' s instead of ' + (sp[0].t + 6).toFixed(2) + ' s');
    T.ok(sp.length >= 2 && sp[1].t >= land[0].t + 60 - 1e-6 && sp[1].t < land[0].t + 60 + 4, 'the second starts 60 s after the first really finished, once the cast in progress is done (' + (sp[1] && sp[1].t.toFixed(2)) + ' s; 66 s after the start would have been ' + (sp[0].t + 66).toFixed(2) + ' s)');

    T.group('timeline check in the build editor');
    var early = WL.checkTimeline(tb(['searingPain'], {}, [{ t: 0, k: 'soulFire' }, { t: 62, k: 'soulFire' }]), det());
    T.ok(early.some(function (x) { return /still on cooldown \(ready at 66\.0 s\)/.test(x.msg); }), 'a second Soul Fire at 62 s is flagged: ready at 66.0 s (was 60.0 s)');
    var fine = WL.checkTimeline(tb(['searingPain'], {}, [{ t: 0, k: 'soulFire' }, { t: 66, k: 'soulFire' }]), det());
    T.ok(!fine.some(function (x) { return /cooldown/.test(x.msg); }), 'at 66 s it is fine');
  });
})();
