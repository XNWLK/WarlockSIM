// Round 38 tests: Eureka! (Gnome) as a live +10% damage aura (user; round 149: an 8 s buff, a cast counts when it finishes
// inside it — rounds 38–148: until 3 spells had been cast), and its pop timing: right before a long cast. (Rounds 38–87 had options.eurekaPolicy 'any' / 'long' / 'doom'; removed in round 88.)
(function () {
  function det() {                                    // 100% hit, no crit, no curse, no pierce → exact damage
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.critPct -= 2;
    c.gear.pierce = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.fight.durationVarPct = 0;
    c.options.activesPolicy = 'pull';                       // cooldowns on the pull (round 87 default: first Doom explosion)
    return c;
  }
  function tb(rot) { return { key: 't38', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  // Inclusive: at equal times ticks are processed before cast completions and decisions, so a tick at the very instant the
  // aura ends (3rd empowered cast lands / last charge spent) still gets the bonus.
  function inAura(r, t) { return (r.auras.eureka || []).some(function (iv) { return t >= iv[0] - 1e-6 && t <= iv[1] + 1e-6; }); }

  T.run('Eureka! live aura (round 38)', function () {
    T.group('a DoT gets nothing from the aura (round 80, Forever patch: Eureka! no longer benefits periodic effects; rounds 38–79: +10%)');
    var r = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'gnome', det(), { seed: 1, duration: 60, log: true });
    var pop = r.log.filter(function (e) { return e.type === 'racial'; })[0];
    var firstCast = r.log.filter(function (e) { return e.type === 'cast'; })[0];
    T.ok(firstCast.spell === 'corruption' && !firstCast.eureka && pop && pop.t > firstCast.t, "Corruption goes out first, Eureka! is popped afterwards, before the first long cast (at " + (pop && pop.t) + ' s)');
    var ticks = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'corruption'; });
    var inT = ticks.filter(function (e) { return inAura(r, e.t); }), outT = ticks.filter(function (e) { return !inAura(r, e.t); });
    T.ok(inT.length >= 2 && outT.length >= 2, 'Corruption ticks inside (' + inT.length + ') and outside (' + outT.length + ') the aura');
    var base = outT[outT.length - 1].dmg;
    T.ok(inT.every(function (e) { return Math.abs(e.dmg - base) <= 1; }), 'ticks during the aura = the normal tick (' + inT.map(function (e) { return e.dmg; }).join(', ') + ' vs ' + base + ')');
    T.ok(outT.every(function (e) { return Math.abs(e.dmg - base) <= 1; }), 'ticks outside the aura are normal — nothing is snapshotted');

    T.group('the empowered casts, and when the aura ends');
    var sb = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; });
    var emp = sb.filter(function (e) { return e.eureka; }), iv = r.auras.eureka[0];
    T.ok(emp.length >= 2 && emp.every(function (e) { return e.t + e.castTime < iv[1] + 1e-6; }), emp.length + ' empowered Shadow Bolts, all finished inside the 8 s');
    var hits = r.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; });
    var normal = hits[hits.length - 1].dmg;
    T.ok(hits.slice(0, emp.length).every(function (e) { return Math.abs(e.dmg / normal - 1.10) < 0.01; }), 'the empowered Shadow Bolts hit for 1.10 × (' + hits.slice(0, emp.length).map(function (e) { return e.dmg; }).join(', ') + ' vs ' + normal + ')');
    T.near(iv[1] - iv[0], 8, 1e-6, 'the aura lasts 8 s (' + iv[0].toFixed(2) + ' – ' + iv[1].toFixed(2) + ')');

    T.group('pop timing: never before a DoT or an instant; no option of its own (round 88)');
    T.ok(!('eurekaPolicy' in WL.DEFAULT_CONFIG.options), 'options.eurekaPolicy is gone');
    var old = det(); old.options.eurekaPolicy = 'any';
    var a = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'gnome', old, { seed: 1, duration: 60, log: true });
    T.eq(JSON.stringify(a.auras.eureka), JSON.stringify(r.auras.eureka), 'a config that still carries the old setting behaves the same');
    var d = WL.simulateOnce(tb(['bane', 'corruption', 'immolate', 'shadowBolt']), 'gnome', det(), { seed: 1, duration: 100, log: true });
    var emp2 = d.log.filter(function (e) { return e.type === 'cast' && e.eureka; });
    T.ok(emp2.length >= 2 && emp2[0].spell === 'shadowBolt' && emp2.every(function (e) { return WL.SPELLS[e.spell].kind !== 'dot' && WL.SPELLS[e.spell].kind !== 'utility'; }), 'popped right before a Shadow Bolt; never a Bane, Corruption or a curse (' + emp2.map(function (e) { return e.spell; }).join(', ') + ')');
    var dc = det(); dc.options.activesPolicy = 'doom';
    var dd = WL.simulateOnce(tb(['bane', 'corruption', 'shadowBolt']), 'gnome', dc, { seed: 1, duration: 100, log: true });
    var boom = dd.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0], dpop = dd.log.filter(function (e) { return e.type === 'racial'; })[0];
    T.ok(boom && dpop && dpop.t > boom.t - 3.1 && dpop.t < boom.t + 6.1, "with the cooldown setting on 'Doom explodes' Eureka! waits for it (explosion " + (boom && boom.t) + ' s, pop ' + (dpop && dpop.t) + ' s)');

    T.group('other races unaffected');
    var h1 = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'human', det(), { seed: 1, duration: 60 });
    var h2 = WL.simulateOnce(tb(['corruption', 'shadowBolt']), 'human', old, { seed: 1, duration: 60 });
    T.near(h1.dps, h2.dps, 1e-9, 'Human: identical with or without the old setting');
  });
})();
