// Round 87 tests (user): when the short cooldowns are popped for the first time — options.activesPolicy 'pull' / 'doom'
// (default: when the first Bane of Doom explodes) / 'execute' (boss below 35%). Covers the racial cooldown, the Major
// Spellblasting Potion and Power Infusion. [A77]
(function () {
  function det(pol, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = pol; c.consumables.majorSpellblasting.on = true; c.buffs.powerInfusion.on = true;
    if (f) f(c);
    return c;
  }
  function tb(rot) { return { key: 't87', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function pops(r) {
    var o = {};
    r.log.forEach(function (e) {
      if (e.type === 'racial' && o.racial == null) o.racial = e.t;
      if (e.type === 'consumable' && /Spellblasting/.test(e.spell) && o.potion == null) o.potion = e.t;
      if (e.type === 'buff' && /Power Infusion/.test(e.spell) && o.pi == null) o.pi = e.t;
    });
    return o;
  }
  var DOOM = ['bane', 'corruption', 'shadowBolt'];

  T.run('round 87: when the cooldowns are popped', function () {
    T.group('defaults');
    T.eq(WL.DEFAULT_CONFIG.options.activesPolicy, 'doom', "default: when the first Bane of Doom explodes (user)");

    T.group("'pull': everything right before the first damaging spell");
    var p = pops(WL.simulateOnce(tb(DOOM), 'orc', det('pull'), { seed: 1, duration: 120, log: true }));
    T.eq([p.racial, p.potion, p.pi].join(','), '0,0,0', 'Blood Fury, potion and Power Infusion at 0 s');

    T.group("'doom': held until the first Bane of Doom explosion");
    ['orc', 'troll'].forEach(function (race) {
      var r = WL.simulateOnce(tb(DOOM), race, det('doom'), { seed: 1, duration: 120, log: true }), q = pops(r);
      var boom = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0];
      T.ok(boom && q.racial === q.potion && q.potion === q.pi, race + ': all three popped together (' + q.racial + ' s)');
      T.ok(boom && q.racial <= boom.t + 1e-6 && boom.t - q.racial <= 3.0 + 1e-6, race + ': within one cast before the explosion (pop ' + q.racial + ' s, explosion ' + (boom && boom.t) + ' s)');
      T.ok(r.auras.powerInfusion.some(function (iv) { return boom.t >= iv[0] && boom.t <= iv[1]; }), race + ': the explosion is inside Power Infusion');
    });
    var c0 = det('doom', function (c) { c.consumables.majorSpellblasting.on = false; }), c1 = det('pull', function (c) { c.consumables.majorSpellblasting.on = false; });
    var bd = function (r) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom' && !e.crit; })[0].dmg; };
    var eD = bd(WL.simulateOnce(tb(DOOM), 'human', c0, { seed: 1, duration: 120, log: true })), eP = bd(WL.simulateOnce(tb(DOOM), 'human', c1, { seed: 1, duration: 120, log: true }));
    T.near(eD / eP, 1.2, 0.002, "'doom': the explosion gets Power Infusion's +20% (" + eD + ' vs ' + eP + " with 'pull')");

    T.group("'doom' falls back to the pull when there is no Doom explosion to wait for");
    var n = pops(WL.simulateOnce(tb(['baneOfAgony', 'corruption', 'shadowBolt']), 'orc', det('doom'), { seed: 1, duration: 120, log: true }));
    T.eq([n.racial, n.potion, n.pi].join(','), '0,0,0', 'a build that never casts Bane of Doom: at 0 s');
    var s = pops(WL.simulateOnce(tb(DOOM), 'orc', det('doom'), { seed: 1, duration: 50, log: true }));
    T.ok(s.racial != null && s.racial < 5, 'a 50 s fight (Bane of Agony instead of Doom): right after the Bane goes up (' + s.racial + ' s)');

    T.group("'execute': held until the boss is below 35%");
    var x = pops(WL.simulateOnce(tb(DOOM), 'orc', det('execute'), { seed: 1, duration: 120, log: true })), cut = 120 * 0.65;
    T.ok(x.racial === x.potion && x.potion === x.pi && x.racial > cut - 1e-6 && x.racial < cut + 4.6, 'all three at the first damaging cast below 35% (' + x.racial + ' s; 35% at ' + cut + ' s; at most one Shadow Bolt + one Life Tap later)');

    T.group('afterwards: again whenever ready');
    var l = WL.simulateOnce(tb(DOOM), 'orc', det('doom'), { seed: 1, duration: 300, log: true });
    var rac = l.log.filter(function (e) { return e.type === 'racial'; }).map(function (e) { return e.t; });
    var pot = l.log.filter(function (e) { return e.type === 'consumable'; }).map(function (e) { return e.t; });
    T.ok(rac.length === 2 && rac[1] - rac[0] >= 120 - 1e-6 && rac[1] - rac[0] < 124, 'Blood Fury again 2 min after the first use (' + rac.join(', ') + ')');
    T.ok(pot.length === 2 && pot[1] - pot[0] >= 120 - 1e-6 && pot[1] - pot[0] < 124, 'potion again 2 min after the first use (' + pot.join(', ') + ')');
    T.near(l.uptime.powerInfusion, 30, 1e-6, 'Power Infusion at ~60 s and again 3 min later (2 × 15 s)');

    T.group('races without a cooldown and no potion / Power Infusion: the setting changes nothing');
    var cA = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), cB = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); cA.fight.iterations = cB.fight.iterations = 50;
    cA.options.activesPolicy = 'pull'; cB.options.activesPolicy = 'execute';
    T.eq(WL.simulate(WL.BUILDS[0], 'human', cA).dps, WL.simulate(WL.BUILDS[0], 'human', cB).dps, 'Human, default consumables: identical DPS');
  });
})();
