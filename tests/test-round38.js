// Round 38 tests: Eureka! (Gnome) as a live +10% damage aura until 3 spells have been cast (user), and its pop timing
// (options.eurekaPolicy: 'any' / 'long' / 'doom').
(function () {
  function det(policy) {                                    // 100% hit, no crit, no curse, no pierce → exact damage
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.options.useCurseOfElements = false; c.fight.durationVarPct = 0; c.options.eurekaPolicy = policy;
    return c;
  }
  function tb(rot) { return { key: 't38', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  // Inclusive: at equal times ticks are processed before cast completions and decisions, so a tick at the very instant the
  // aura ends (3rd empowered cast lands / last charge spent) still gets the bonus.
  function inAura(r, t) { return (r.auras.eureka || []).some(function (iv) { return t >= iv[0] - 1e-6 && t <= iv[1] + 1e-6; }); }

  T.run('Eureka! live aura (round 38)', function () {
    T.group('a DoT gets nothing from the aura (round 80, Forever patch: Eureka! no longer benefits periodic effects; rounds 38–79: +10%)');
    var r = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'gnome', det('long'), { seed: 1, duration: 60, log: true });
    var pop = r.log.filter(function (e) { return e.type === 'racial'; })[0];
    var firstCast = r.log.filter(function (e) { return e.type === 'cast'; })[0];
    T.ok(firstCast.spell === 'corruption' && !firstCast.eureka && pop && pop.t > firstCast.t, "'long': Corruption goes out first, Eureka! is popped afterwards (at " + (pop && pop.t) + ' s)');
    var ticks = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'corruption'; });
    var inT = ticks.filter(function (e) { return inAura(r, e.t); }), outT = ticks.filter(function (e) { return !inAura(r, e.t); });
    T.ok(inT.length >= 2 && outT.length >= 2, 'Corruption ticks inside (' + inT.length + ') and outside (' + outT.length + ') the aura');
    var base = outT[outT.length - 1].dmg;
    T.ok(inT.every(function (e) { return Math.abs(e.dmg - base) <= 1; }), 'ticks during the aura = the normal tick (' + inT.map(function (e) { return e.dmg; }).join(', ') + ' vs ' + base + ')');
    T.ok(outT.every(function (e) { return Math.abs(e.dmg - base) <= 1; }), 'ticks outside the aura are normal — nothing is snapshotted');

    T.group('the 3 empowered casts, and when the aura ends');
    var sb = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; });
    var emp = sb.filter(function (e) { return e.eureka; });
    T.eq(emp.length, 3, 'exactly 3 empowered Shadow Bolts');
    var hits = r.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; });
    var normal = hits[hits.length - 1].dmg;
    T.ok(hits.slice(0, 3).every(function (e) { return Math.abs(e.dmg / normal - 1.10) < 0.01; }), 'the 3 empowered Shadow Bolts hit for 1.10 × (' + hits.slice(0, 3).map(function (e) { return e.dmg; }).join(', ') + ' vs ' + normal + ')');
    var iv = r.auras.eureka[0];
    T.near(iv[1], emp[2].t + emp[2].castTime, 0.002, 'aura ends when the 3rd empowered Shadow Bolt lands (' + iv[1].toFixed(2) + ' s)');

    T.group("pop timing: 'any' vs 'long'");
    var a = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'gnome', det('any'), { seed: 1, duration: 60, log: true });
    var ac = a.log.filter(function (e) { return e.type === 'cast'; })[0];
    T.ok(ac.spell === 'corruption' && ac.eureka, "'any': popped before the first damaging spell (Corruption spends a charge)");
    T.ok(a.auras.eureka[0][1] - a.auras.eureka[0][0] < iv[1] - iv[0], "'long' keeps the aura up longer (" + (iv[1] - iv[0]).toFixed(2) + ' s vs ' + (a.auras.eureka[0][1] - a.auras.eureka[0][0]).toFixed(2) + ' s)');

    T.group("pop timing: 'doom' holds Eureka! for the Bane of Doom explosion");
    var d = WL.simulateOnce(tb(['bane', 'corruption', 'shadowBolt']), 'gnome', det('doom'), { seed: 1, duration: 100, log: true });
    var doomCast = d.log.filter(function (e) { return e.type === 'cast' && e.spell === 'baneOfDoom'; })[0];
    var boom = d.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0];
    var dpop = d.log.filter(function (e) { return e.type === 'racial'; })[0];
    T.ok(doomCast && boom && dpop && dpop.t > doomCast.t + 30, 'Eureka! held while Doom ticks (Doom at ' + (doomCast && doomCast.t) + ' s, pop at ' + (dpop && dpop.t) + ' s)');
    T.ok(boom && inAura(d, boom.t), 'the Bane of Doom explosion (' + (boom && boom.t) + ' s) lands inside the aura');
    var dAny = WL.simulateOnce(tb(['bane', 'corruption', 'shadowBolt']), 'gnome', det('any'), { seed: 1, duration: 100, log: true });
    var boomAny = dAny.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0];
    T.near(boom.dmg / boomAny.dmg, 1, 0.005, "…but since round 80 it hits no harder than with 'any' (a periodic effect: " + boom.dmg + ' vs ' + boomAny.dmg + ')');

    T.group('other races unaffected');
    var h1 = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'human', det('any'), { seed: 1, duration: 60 });
    var h2 = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'human', det('doom'), { seed: 1, duration: 60 });
    T.near(h1.dps, h2.dps, 1e-9, 'Human: the Eureka! setting changes nothing');
  });
})();
