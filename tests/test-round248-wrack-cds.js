// Round 248 tests — the user: "also double check the amplify curse+racial+trinket timings for wrack. might be worth popping
// racials and trinkets towards the end of an amplified agony? i dont know try stuff." Every DoT is dynamic (A13), so under
// the default cooldown rule ('doom') a build that never casts Bane of Doom now pops its cooldowns right before its first
// filler cast (the opening DoTs and curse up) instead of on the pull, and Blood Fury and Power Infusion also wait until the
// Amplify Curse Bane of Agony has options.activesAmpLeft (17) s or less left (engine/sim.js ampHold). Berserking stays on the
// pull. Wrack DS, Pre-BiS page defaults, Orc, 4000 fights: +12.2 / +4.3 / +5.1 DPS at 60 / 120 / 180 s; Power Infusion on:
// +39 / +18 / +11. Weakness Analyzer stays at the first Wrack (the priority's Activate trinket); later was worse.
(function () {
  function bk(k) { return WL.BUILDS.filter(function (b) { return b.key === k; })[0]; }
  function cfgOf(f) {
    var c = WL.pageDefaultConfig(); c.buffs.powerInfusion.on = true;
    if (f) f(c);
    return WL.cfgFor(bk('wrack_ds'), c);
  }
  function fight(race, c, dur) { return WL.simulateOnce(bk('wrack_ds'), race, c, { seed: 4242, duration: dur || 180, log: true }); }
  function times(r, type, re) { return r.log.filter(function (e) { return e.type === type && (!re || re.test(e.spell)); }).map(function (e) { return e.t; }); }
  function firstCast(r, k) { return times(r, 'cast', new RegExp('^' + k + '$'))[0]; }

  T.run('round 248: Wrack DS cooldowns with the Amplify Curse Bane of Agony', function () {
    T.group('the setting');
    T.eq(WL.DEFAULT_CONFIG.options.activesPolicy, 'doom', 'the default cooldown rule is still "when the first Bane of Doom explodes"');
    T.eq(WL.DEFAULT_CONFIG.options.activesAmpLeft, 17, 'options.activesAmpLeft: 17 s (Blood Fury / Power Infusion wait for the amplified Bane\'s last 17 s)');

    T.group('Orc (Blood Fury), Power Infusion on, page defaults');
    var c = cfgOf(), r = fight('orc', c);
    var amp = times(r, 'buff', /^amplifyCurse$/)[0], bane = firstCast(r, 'baneOfAgony'), wr = firstCast(r, 'wrack');
    var bf = times(r, 'racial', /Blood Fury/), pot = times(r, 'consumable', /Spellblasting/), pi = times(r, 'buff', /Power Infusion/);
    T.ok(amp != null && amp === bane, 'Amplify Curse is taken by the first Bane of Agony (' + amp + ' s)');
    T.ok(pot[0] === wr && wr > bane, 'the potion: right before the first Wrack, once the DoTs are up (' + pot[0] + ' s; first Wrack ' + wr + ' s)');
    var left = bane + WL.SPELLS.baneOfAgony.duration - bf[0];
    T.ok(bf[0] > wr && left <= 17 + 1e-6 && left > 8, 'Blood Fury: once the amplified Bane of Agony has 17 s or less left (' + bf[0] + ' s, ' + left.toFixed(2) + ' s left)');
    T.ok(pi[0] === bf[0], 'Power Infusion together with Blood Fury (' + pi[0] + ' s)');
    var bfr = WL.RACES.orc.racials.filter(function (q) { return q.name === 'Blood Fury'; })[0];
    T.ok(bf.length >= 2 && bf[1] - bf[0] >= bfr.cd - 1e-6 && bf[1] - bf[0] < bfr.cd + 7, 'then again whenever ready (' + bf.join(', ') + ' s)');
    T.ok(times(r, 'trinket', /Weakness Analyzer/)[0] === wr, 'Weakness Analyzer (Activate trinket above Wrack) at the first Wrack, as before');

    T.group('other races and settings');
    var tr = fight('troll', cfgOf());
    T.eq(times(tr, 'racial', /Berserking/)[0], 0, 'Troll: Berserking still on the pull (at the first Wrack it lost 2–4 DPS)');
    T.ok(times(tr, 'buff', /Power Infusion/)[0] > firstCast(tr, 'wrack'), 'Troll: Power Infusion still waits for the amplified Bane');
    var z = fight('orc', cfgOf(function (x) { x.options.activesAmpLeft = 0; })), zw = firstCast(z, 'wrack');
    T.ok(times(z, 'racial', /Blood Fury/)[0] === zw && times(z, 'buff', /Power Infusion/)[0] === zw, 'activesAmpLeft 0: Blood Fury and Power Infusion with the potion at the first Wrack (' + zw + ' s)');
    var p = fight('orc', cfgOf(function (x) { x.options.activesPolicy = 'pull'; }));
    T.ok(times(p, 'racial', /Blood Fury/)[0] === 0 && times(p, 'consumable', /Spellblasting/)[0] === 0 && times(p, 'buff', /Power Infusion/)[0] === 0, '"on the pull": everything at 0 s, as before');
    var cu = fight('orc', cfgOf(function (x) { x.options.activesPolicy = 'custom'; x.options.activesTimeline = { racial: [2] }; }));
    T.ok(times(cu, 'racial', /Blood Fury/)[0] < 3.5, 'custom timeline: a placed Blood Fury (2 s) is not held for the Bane (' + times(cu, 'racial', /Blood Fury/)[0] + ' s)');
    T.ok(times(cu, 'buff', /Power Infusion/)[0] > firstCast(cu, 'wrack'), 'custom timeline: an unplaced Power Infusion follows the rule');
    var na = JSON.parse(JSON.stringify(bk('wrack_ds'))); delete na.talents.amplifyCurse;
    var nr = WL.simulateOnce(na, 'orc', cfgOf(), { seed: 4242, duration: 180, log: true }), nw = firstCast(nr, 'wrack');
    T.ok(times(nr, 'racial', /Blood Fury/)[0] === nw, 'without Amplify Curse: Blood Fury at the first Wrack (' + nw + ' s)');

    T.group('Bane of Doom builds are unchanged');
    var dc = WL.pageDefaultConfig(); dc.buffs.powerInfusion.on = true; dc = WL.cfgFor(bk('demo_pact_fire'), dc);
    var dr = WL.simulateOnce(bk('demo_pact_fire'), 'orc', dc, { seed: 4242, duration: 180, log: true });
    var boom = dr.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0], dbf = times(dr, 'racial', /Blood Fury/)[0];
    T.ok(boom && dbf <= boom.t + 1e-6 && boom.t - dbf <= 3.0 + 1e-6, 'Fire Demo: Blood Fury right before the first Doom explosion (' + dbf + ' s, explosion ' + (boom && boom.t) + ' s)');

    T.group('the gain (same fights)');
    var a = cfgOf(function (x) { x.fight.iterations = 300; x.fight.seed = 4242; x.buffs.powerInfusion.on = false; }), o = JSON.parse(JSON.stringify(a)); o.options.activesPolicy = 'pull';
    var ra = WL.simulate(bk('wrack_ds'), 'orc', a, { log: false }).dps, ro = WL.simulate(bk('wrack_ds'), 'orc', o, { log: false }).dps;
    T.ok(ra > ro + 3, 'Orc: the new rule beats popping on the pull (' + ra.toFixed(1) + ' vs ' + ro.toFixed(1) + ' DPS, 300 fights)');

    T.group('the texts');
    var ex = WL.explainSpell(bk('wrack_ds'), 'orc', cfgOf(), 'baneOfAgony');
    T.ok(ex.notes.some(function (n) { return /Blood Fury and Power Infusion wait until that Bane has 17 s or less left/.test(n); }), 'Show the maths (Bane of Agony): the Amplify Curse note says Blood Fury and Power Infusion wait for it');
    T.ok(/Blood Fury and Power Infusion wait until the amplified Bane of Agony has 17 s/.test(bk('wrack_ds').notes), 'Wrack DS\'s notes explain the cooldown timing');
  });
})();
