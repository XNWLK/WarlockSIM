// Round 96 tests (user): in Forever every DoT is dynamic (unlike Classic) — a tick, including the Bane of Doom explosion,
// uses the spell power you have when it lands (Blood Fury, Spellblasting potion), not what you had at the cast. [A13]
(function () {
  function det(tl, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'custom'; c.options.activesTimeline = tl;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    if (f) f(c);
    return c;
  }
  function tb(rot) { return { key: 't96', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function ticks(r, k) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === k && !e.crit; }); }
  var DOOM = ['bane', 'corruption', 'shadowBolt'];

  T.run('round 96: DoTs use your spell power when the tick lands', function () {
    T.group('Bane of Doom explosion');
    var c0 = det({}, function (c) { c.options.activesPolicy = 'pull'; });
    var st = WL.computeStats(tb(DOOM), 'human', c0), sp = WL.buildSpellTable(tb(DOOM), st, c0).baneOfDoom.sp, base = Math.round(1742 + 4.0 * sp);
    var h0 = ticks(WL.simulateOnce(tb(DOOM), 'human', c0, { seed: 1, duration: 80, log: true }), 'baneOfDoom')[0];
    T.eq(h0.dmg, base, 'no cooldowns: 1742 + 4.0 × ' + sp + ' SP = ' + base);
    var cp = det({ majorSpellblasting: [55] }, function (c) { c.consumables.majorSpellblasting.on = true; });
    var hp = ticks(WL.simulateOnce(tb(DOOM), 'human', cp, { seed: 1, duration: 80, log: true }), 'baneOfDoom')[0];
    T.eq(hp.dmg, Math.round(1742 + 4.0 * (sp + 47)), 'Spellblasting potion popped at 55 s (Doom cast at 0 s): the explosion gets +47 SP → ' + Math.round(1742 + 4.0 * (sp + 47)));
    var co = det({ racial: [55] });
    var so = WL.buildSpellTable(tb(DOOM), WL.computeStats(tb(DOOM), 'orc', co), co).baneOfDoom.sp;
    var ho = ticks(WL.simulateOnce(tb(DOOM), 'orc', co, { seed: 1, duration: 80, log: true }), 'baneOfDoom')[0];
    T.eq(ho.dmg, Math.round(1742 + 4.0 * so * 1.10), 'Blood Fury popped at 55 s: the explosion uses spell power × 1.10 → ' + Math.round(1742 + 4.0 * so * 1.10));
    var ce = det({ racial: [0] });
    var he = ticks(WL.simulateOnce(tb(DOOM), 'orc', ce, { seed: 1, duration: 80, log: true }), 'baneOfDoom')[0];
    T.eq(he.dmg, Math.round(1742 + 4.0 * so), 'Blood Fury only at the cast (0 s): nothing is kept, the explosion is the plain one → ' + Math.round(1742 + 4.0 * so));

    T.group('Corruption ticks follow Blood Fury tick by tick');
    var r = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'orc', det({ racial: [20] }), { seed: 1, duration: 60, log: true });
    var pop = r.log.filter(function (e) { return e.type === 'racial'; })[0].t, ct = ticks(r, 'corruption');
    var inn = ct.filter(function (e) { return e.t > pop + 1e-6 && e.t < pop + 15 - 1e-6; }), out = ct.filter(function (e) { return e.t < pop - 1e-6 || e.t > pop + 15 + 1e-6; });
    var tsp = WL.buildSpellTable(tb(['corruption']), WL.computeStats(tb(['corruption']), 'orc', det({})), det({})).corruption.sp, S = WL.SPELLS.corruption;
    T.ok(inn.length >= 3 && out.length >= 3, 'ticks inside (' + inn.length + ') and outside (' + out.length + ') Blood Fury');
    T.ok(out.every(function (e) { return e.dmg === Math.round(S.tickBase + S.tickCoef * tsp); }), 'outside: ' + Math.round(S.tickBase + S.tickCoef * tsp) + ' per tick');
    T.ok(inn.every(function (e) { return e.dmg === Math.round(S.tickBase + S.tickCoef * tsp * 1.10); }), 'inside: ' + Math.round(S.tickBase + S.tickCoef * tsp * 1.10) + ' per tick — also for a Corruption cast before the pop');

    T.group('channels too');
    var d = WL.simulateOnce(tb(['drainLife']), 'orc', det({ racial: [20] }), { seed: 1, duration: 60, log: true });
    var dp = d.log.filter(function (e) { return e.type === 'racial'; })[0].t, dt = ticks(d, 'drainLife');
    var di = dt.filter(function (e) { return e.t > dp + 1e-6 && e.t < dp + 15 - 1e-6; }), dout = dt.filter(function (e) { return e.t < dp - 1e-6; });
    T.ok(di.length > 0 && dout.length > 0 && di.every(function (e) { return e.dmg > dout[0].dmg; }) && Math.abs(di[di.length - 1].dmg / dout[0].dmg - (WL.SPELLS.drainLife.tickBase + WL.SPELLS.drainLife.tickCoef * tsp * 1.1) / (WL.SPELLS.drainLife.tickBase + WL.SPELLS.drainLife.tickCoef * tsp)) < 0.01,
      'Drain Life ticks inside Blood Fury use spell power × 1.10 (' + (di[0] && di[0].dmg) + ' vs ' + (dout[0] && dout[0].dmg) + ')');
  });
})();
