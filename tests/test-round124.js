// Round 124 tests (user): Windfury Totem as a raid buff. Pets with a melee attack get a 20% chance per landed swing of one
// extra attack with 246 extra attack power; the extra attack spends a Demonic Brand charge like any pet attack. Windfury
// Totem and Grace of Air Totem are one totem type in Forever and do not stack.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.weaponIsSword = false; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false;
    c.debuffs.judgementOfWisdom.on = false;                         // its pet-attack procs would move your mana and with it your casts
    if (f) f(c);
    return c;
  }
  function plain(c) { var m = c.combat.petMelee; m.missPct = 0; m.dodgePct = 0; m.glancePct = 0; m.critSuppressionPct = 100; }   // every swing is a normal hit
  function wfOn(c) { c.buffs.windfuryTotem.on = true; }
  function tb(pet, rot, talents) { return { key: 't124', short: 't', name: 't', notes: '', talents: talents || {}, pet: pet, sacrifice: null, oil: 'none', rotation: rot || ['shadowBolt'] }; }
  function sum(build, cfg, n, dur) {
    var a = { swings: 0, landed: 0, dmg: 0, x: 0, xLanded: 0, xMiss: 0, xGl: 0, xCrit: 0, xDmg: 0, total: 0, brand: 0, threat: 0 };
    for (var s = 1; s <= n; s++) {
      var r = WL.simulateOnce(build, 'human', cfg, { seed: s, duration: dur || 120 });
      var m = r.bySpell['pet:melee'] || {}, x = r.bySpell['pet:windfury'] || {}, b = r.bySpell['pet:brand'] || {};
      a.swings += m.casts || 0; a.landed += m.landed || 0; a.dmg += m.dmg || 0; a.total += r.total; a.brand += b.casts || 0; a.threat += r.threat || 0;
      a.x += x.casts || 0; a.xLanded += x.landed || 0; a.xMiss += x.misses || 0; a.xGl += x.glances || 0; a.xCrit += x.crits || 0; a.xDmg += x.dmg || 0;
    }
    return a;
  }

  T.run('round 124: Windfury Totem for pet melee; not together with Grace of Air', function () {
    T.group('the buff');
    var D = WL.DEFAULT_CONFIG.buffs.windfuryTotem;
    T.ok(!!D && D.on === false && D.id === 10614, 'Windfury Totem is in the buff list, off by default (Rank 3, spell 10614)');
    T.eq(D.windfury.procPct + ' / ' + D.windfury.ap, '20 / 246', '20% chance, 246 extra attack power');
    T.ok(/20% chance/.test((WL.SPELL_TEXT || {})[10614] || '') && !/\*/.test(WL.SPELL_TEXT[10614]), 'its tooltip text is there, without the raw formula');
    T.ok(D.excl === 'airTotem' && WL.DEFAULT_CONFIG.buffs.graceOfAir.excl === 'airTotem', 'Windfury and Grace of Air carry the same totem type');

    T.group('extra attacks: 20% of landed swings, on the attack table');
    var succ = tb('succubus'), off = sum(succ, det(), 60), on = sum(succ, det(wfOn), 60);
    T.eq(off.x, 0, 'totem off: no extra attacks');
    T.ok(on.x > 0, 'totem on: ' + on.x + ' extra attacks in 60 fights', on.x);
    T.eq(on.swings + '/' + on.landed + '/' + on.dmg.toFixed(3), off.swings + '/' + off.landed + '/' + off.dmg.toFixed(3), 'the normal swings are the same with and without the totem (own random stream)');
    T.near(100 * on.x / on.landed, 20, 2, 'extra attacks = ' + (100 * on.x / on.landed).toFixed(1) + '% of the landed swings');
    T.ok(on.xMiss > 0 && on.xGl > 0 && on.xCrit > 0, 'extra attacks can miss / be dodged (' + on.xMiss + '), glance (' + on.xGl + ') and crit (' + on.xCrit + ')');
    T.near(on.xLanded / on.x, on.landed / on.swings, 0.05, 'they land as often as normal swings (' + (100 * on.xLanded / on.x).toFixed(1) + '% vs ' + (100 * on.landed / on.swings).toFixed(1) + '%)');
    T.near(on.total - on.xDmg, off.total, 1e-6, 'everything else deals the same damage: total − extra attacks = total without the totem');
    T.near(on.threat, off.threat, 1e-6, 'pet damage is not your threat');

    T.group('extra attack power: 246 on top of the pet\'s own');
    var cp = det(function (c) { wfOn(c); plain(c); }), p = sum(succ, cp, 20);
    var sp = WL.computeStats(succ, 'human', cp).sp, m = cp.pets.succubus.melee;
    var want = (m.baseDps + (m.apPerSp * sp + 246) / m.apPerDps) / (m.baseDps + m.apPerSp * sp / m.apPerDps);
    T.near((p.xDmg / p.xLanded) / (p.dmg / p.landed), want, 1e-6, 'an extra attack hits ' + ((want - 1) * 100).toFixed(1) + '% harder than a normal swing (246 attack power = ' + (246 / m.apPerDps).toFixed(2) + ' DPS)');

    T.group('one extra attack per swing, never a chain');
    var call = det(function (c) { wfOn(c); plain(c); c.buffs.windfuryTotem.windfury.procPct = 100; }), a = sum(succ, call, 5);
    T.eq(a.x, a.landed, 'at a 100% chance: exactly one extra attack per swing (' + a.x + ' / ' + a.landed + ')');
    T.eq(a.xLanded, a.x, 'and each of them lands in this setup');

    T.group('the extra attack spends a Demonic Brand charge too');
    var bb = tb('succubus', ['searingPain'], { demonicBrand: 3 }), cb1 = det(function (c) { wfOn(c); plain(c); c.buffs.windfuryTotem.windfury.procPct = 100; });
    var r1 = WL.simulateOnce(bb, 'human', cb1, { seed: 3, duration: 60, log: true });
    var xs = r1.log.filter(function (e) { return e.type === 'pet' && e.spell === 'pet:windfury'; });
    var brandAt = function (t) { return r1.log.filter(function (e) { return e.spell === 'pet:brand' && Math.abs(e.t - t) < 1e-9; }).length; };
    var doubles = xs.filter(function (e) { return brandAt(e.t) >= 2; }).length;
    T.ok(xs.length > 10 && doubles > 0, doubles + ' of ' + xs.length + ' swings with an extra attack show two Brand hits at the same moment', doubles);
    var r0 = WL.simulateOnce(bb, 'human', det(plain), { seed: 3, duration: 60, log: true });
    var perApp = function (r) {                                      // Brand hits between two Searing Pain hits never exceed the charges
      var n = 0, mx = 0; r.log.forEach(function (e) { if (e.type === 'hit' && e.spell === 'searingPain') n = 0; else if (e.spell === 'pet:brand') { n++; mx = Math.max(mx, n); } }); return mx; };
    var charges = WL.TALENT_BY_KEY.demonicBrand.v.charges[2];
    T.ok(perApp(r1) <= charges && perApp(r0) <= charges, 'never more Brand hits per application than its ' + charges + ' charges (' + perApp(r0) + ' without, ' + perApp(r1) + ' with the totem)');
    var shipped = WL.findBuild('demo_pact_succ_sb'), s0 = sum(shipped, det(), 40), s1 = sum(shipped, det(wfOn), 40);
    T.ok(s1.brand > s0.brand, 'Demo Pact Shadow Bolt Succubus: more Brand hits with the totem (' + (s0.brand / 40).toFixed(1) + ' → ' + (s1.brand / 40).toFixed(1) + ' per fight)');
    T.ok(s1.total > s0.total * 1.015, 'and more damage (' + ((s1.total / s0.total - 1) * 100).toFixed(2) + '%)');

    T.group('which pets');
    var imp = tb('imp'), i0 = sum(imp, det(), 5), i1 = sum(imp, det(wfOn), 5);
    T.ok(i1.x === 0 && i1.total === i0.total, 'Imp (no melee attack): nothing changes');
    T.ok(sum(tb('felhunter'), det(wfOn), 20).x > 0 && sum(tb('voidwalker'), det(wfOn), 20).x > 0, 'Felhunter and Voidwalker get extra attacks as well');
    var none = sum(tb(null), det(wfOn), 3), none0 = sum(tb(null), det(), 3);
    T.ok(none.x === 0 && none.total === none0.total, 'no pet out: nothing changes');

    T.group('Windfury Totem and Grace of Air Totem do not stack');
    var both = det(function (c) { wfOn(c); c.buffs.graceOfAir.on = true; }), act = WL.activeBuffs(both).map(function (b) { return b.name; });
    T.ok(act.indexOf('Windfury Totem') >= 0 && act.indexOf('Grace of Air Totem') < 0, 'both switched on: only Windfury Totem counts');
    var agi = function (c) { return WL.computeStats(succ, 'human', c).agi; };
    T.eq(agi(both), agi(det(wfOn)), 'no Agility from Grace of Air then (' + agi(both) + ')');
    T.ok(agi(det(function (c) { c.buffs.graceOfAir.on = true; })) > agi(det()), 'Grace of Air alone still gives its Agility');
    T.ok(agi(det(wfOn)) === agi(det()), 'the Scroll of Agility is not touched by Windfury Totem');
    var tBoth = sum(succ, both, 10), tWf = sum(succ, det(wfOn), 10);
    T.eq(tBoth.total, tWf.total, 'both on = Windfury Totem alone, to the last point of damage');

    T.group('settings code');
    var c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); WL.applySettings(c2, WL.decodeSettings(WL.encodeSettings(det(wfOn))));
    T.ok(c2.buffs.windfuryTotem.on === true, 'Windfury Totem travels in a settings code');
  });
})();
