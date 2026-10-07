// Round 128 tests (user): Flametongue Totem as a raid buff. Pets with a melee attack get a Fire hit on every landed swing:
// 1363 × attack speed / 100 (Rank 4) = 27.26 for a 2.0 s swing, no spell power part. It stacks with Windfury Totem, whose
// extra attacks trigger it too. It is not an attack itself: no Demonic Brand charge, no Judgement of Wisdom.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.weaponIsSword = false; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false;
    c.debuffs.judgementOfWisdom.on = false;                         // its pet-attack procs would move your mana and with it your casts
    if (f) f(c);
    return c;
  }
  function plain(c) { var m = c.combat.petMelee; m.missPct = 0; m.dodgePct = 0; m.glancePct = 0; m.critSuppressionPct = 100; }   // every swing is a normal hit
  function sure(c) { c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = -100; }              // spells always hit, never crit
  function ftOn(c) { c.buffs.flametongueTotem.on = true; }
  function wfOn(c) { c.buffs.windfuryTotem.on = true; }
  function tb(pet, rot, talents) { return { key: 't128', short: 't', name: 't', notes: '', talents: talents || {}, pet: pet, sacrifice: null, oil: 'none', rotation: rot || ['shadowBolt'] }; }
  function sum(build, cfg, n, dur) {
    var a = { swings: 0, landed: 0, glances: 0, dmg: 0, wf: 0, wfLanded: 0, ft: 0, ftLanded: 0, ftMiss: 0, ftCrit: 0, ftDmg: 0, total: 0, brand: 0, threat: 0, petJow: 0 };
    for (var s = 1; s <= n; s++) {
      var r = WL.simulateOnce(build, 'human', cfg, { seed: s, duration: dur || 120 });
      var m = r.bySpell['pet:melee'] || {}, x = r.bySpell['pet:windfury'] || {}, f = r.bySpell['pet:flametongue'] || {}, b = r.bySpell['pet:brand'] || {};
      a.swings += m.casts || 0; a.landed += m.landed || 0; a.glances += m.glances || 0; a.dmg += m.dmg || 0; a.total += r.total; a.brand += b.casts || 0; a.threat += r.threat || 0;
      a.wf += x.casts || 0; a.wfLanded += x.landed || 0; a.petJow += r.petManaFromJow || 0;
      a.ft += f.casts || 0; a.ftLanded += f.landed || 0; a.ftMiss += f.misses || 0; a.ftCrit += f.crits || 0; a.ftDmg += f.dmg || 0;
    }
    return a;
  }

  T.run('round 128: Flametongue Totem for pet melee; stacks with Windfury Totem', function () {
    T.group('the buff');
    var D = WL.DEFAULT_CONFIG.buffs.flametongueTotem;
    T.ok(!!D && D.on === false && D.id === 16387, 'Flametongue Totem is in the buff list, off by default (Rank 4, spell 16387)');
    T.eq(D.flametongue.per100, 1363, 'tooltip value 1363: 13.63 Fire damage per second of attack speed');
    T.ok(!D.excl && !D.group, 'it shares no totem type or group with another buff (stacks with Windfury Totem)');
    T.ok(/17 to 55 additional Fire damage/.test((WL.SPELL_TEXT || {})[16387] || '') && !/\*|\//.test(WL.SPELL_TEXT[16387]), 'its tooltip text is there, without the raw formula');
    var both = WL.activeBuffs(det(function (c) { ftOn(c); wfOn(c); })).map(function (b) { return b.name; });
    T.ok(both.indexOf('Flametongue Totem') >= 0 && both.indexOf('Windfury Totem') >= 0, 'Windfury Totem and Flametongue Totem can be on together');

    T.group('one Fire hit per landed swing');
    var succ = tb('succubus'), off = sum(succ, det(), 40), on = sum(succ, det(ftOn), 40);
    T.eq(off.ft, 0, 'totem off: no Flametongue hits');
    T.ok(on.glances > 0 && on.landed < on.swings, 'test setup: swings miss, are dodged and glance (' + on.landed + ' of ' + on.swings + ' land, ' + on.glances + ' glancing)');
    T.eq(on.ft, on.landed, 'totem on: exactly one Flametongue hit per landed swing, glancing blows included (' + on.ft + ')');
    T.eq(on.swings + '/' + on.landed + '/' + on.dmg.toFixed(3), off.swings + '/' + off.landed + '/' + off.dmg.toFixed(3), 'the swings themselves are the same with and without the totem (own random stream)');
    T.near(on.total - on.ftDmg, off.total, 1e-6, 'everything else deals the same damage: total − Flametongue = total without the totem');
    T.near(on.threat, off.threat, 1e-6, 'pet damage is not your threat');
    T.eq(sum(tb('imp'), det(ftOn), 5).ft, 0, 'the Imp has no melee attack: nothing for it');
    T.ok(sum(tb('voidwalker'), det(ftOn), 5).ft > 0 && sum(tb('felhunter'), det(ftOn), 5).ft > 0, 'Voidwalker and Felhunter have one: they get Flametongue hits too');

    T.group('damage: 1363 × attack speed / 100, no spell power');
    var cs = det(function (c) { ftOn(c); plain(c); sure(c); }), p = sum(succ, cs, 10);
    T.eq(p.ftLanded + '/' + p.ftCrit, p.ft + '/0', 'test setup: every Flametongue hit lands and none crits');
    T.near(p.ftDmg / p.ftLanded, 27.26, 1e-9, 'a Flametongue hit on a 2.0 s swing = 1363 × 2.0 / 100 = 27.26 Fire damage');
    var hi = sum(succ, det(function (c) { ftOn(c); plain(c); sure(c); c.gear.sp = 2000; }), 10);
    T.near(hi.ftDmg / hi.ftLanded, 27.26, 1e-9, 'the same at 2,000 spell power: no spell power part');
    var slow = sum(succ, det(function (c) { ftOn(c); plain(c); sure(c); c.pets.succubus.melee.swing = 3; }), 10);
    T.near(slow.ftDmg / slow.ftLanded, 40.89, 1e-9, 'a 3.0 s attack speed: 40.89 per hit (slower weapons, more damage per swing)');
    var up = tb('succubus', ['shadowBolt'], { unholyPower: 5, masterDemonologist: 5 }), UP = WL.TALENT_BY_KEY.unholyPower.v.petDmgPct[4];
    var q = sum(up, det(function (c) { ftOn(c); plain(c); sure(c); c.debuffs.coeOther.on = true; }), 10);
    var all = WL.computeStats(up, 'human', cs).mult.all;
    T.near(q.ftDmg / q.ftLanded, 27.26 * (1 + UP / 100) * all * 1.1, 1e-9, 'pet damage modifiers apply: Unholy Power +' + UP + '% and Curse of the Elements +10% (Master Demonologist gives a Succubus Shadow, not Fire)');

    T.group('it is a spell of the pet: your hit chance and your crit');
    var st = WL.computeStats(succ, 'human', det(ftOn)), big = sum(succ, det(ftOn), 150);
    T.near(100 * big.ftMiss / big.ft, 100 - st.hitPct, 1.5, (100 * big.ftMiss / big.ft).toFixed(1) + '% of ' + big.ft + ' Flametongue hits miss (your miss chance ' + (100 - st.hitPct).toFixed(1) + '%)');
    T.near(100 * big.ftCrit / big.ftLanded, st.critPct, 1.5, (100 * big.ftCrit / big.ftLanded).toFixed(1) + '% of the landed ones crit (your crit ' + st.critPct.toFixed(1) + '%)');
    T.eq(big.ftLanded + big.ftMiss, big.ft, 'every Flametongue hit either lands or misses');
    var one = WL.simulateOnce(succ, 'human', det(function (c) { ftOn(c); plain(c); }), { seed: 2, duration: 120, log: true });
    var hits = one.log.filter(function (e) { return e.type === 'pet' && e.spell === 'pet:flametongue'; });
    var cr = hits.filter(function (e) { return e.crit; })[0], no = hits.filter(function (e) { return !e.crit; })[0];
    T.ok(cr && no && cr.dmg === Math.round(27.26 * 1.5) && no.dmg === 27, 'in the log: 27 for a hit, 41 for a crit (× 1.5)', cr && cr.dmg);

    T.group('not an attack: no Demonic Brand charge, no Judgement of Wisdom');
    var bb = tb('succubus', ['searingPain'], { demonicBrand: 3 }), b0 = sum(bb, det(plain), 20), b1 = sum(bb, det(function (c) { ftOn(c); plain(c); }), 20);
    T.ok(b0.brand > 100 && b1.brand === b0.brand, 'the same number of Brand hits with and without the totem (' + b0.brand + ')', b1.brand);
    var j0 = sum(succ, det(function (c) { c.debuffs.judgementOfWisdom.on = true; }), 20), j1 = sum(succ, det(function (c) { ftOn(c); c.debuffs.judgementOfWisdom.on = true; }), 20);
    T.ok(j0.petJow > 0 && j1.petJow === j0.petJow, 'the pet gains the same mana from Judgement of Wisdom with and without the totem (' + Math.round(j0.petJow) + ')', j1.petJow);

    T.group('with Windfury Totem: the extra attacks trigger it too');
    var w0 = sum(succ, det(wfOn), 40), w1 = sum(succ, det(function (c) { wfOn(c); ftOn(c); }), 40);
    T.ok(w1.wfLanded > 50, 'test setup: ' + w1.wfLanded + ' Windfury extra attacks land', w1.wfLanded);
    T.eq(w1.ft, w1.landed + w1.wfLanded, 'Flametongue hits = landed swings + landed Windfury extra attacks (' + w1.landed + ' + ' + w1.wfLanded + ')');
    T.eq(w1.wf + '/' + w1.wfLanded, w0.wf + '/' + w0.wfLanded, 'Windfury procs exactly as without Flametongue');
    T.near(w1.total - w1.ftDmg, w0.total, 1e-6, 'and the two add up: total with both − Flametongue = total with Windfury alone');

    T.group('settings code and a shipped build');
    var back = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), unknown = WL.applySettings(back, WL.decodeSettings(WL.encodeSettings(det(ftOn))));
    T.eq(back.buffs.flametongueTotem.on + ' / ' + unknown.length, 'true / 0', 'the totem travels in a settings code');
    var shipped = WL.findBuild('demo_pact_succ_sb'), s0 = sum(shipped, det(), 40), s1 = sum(shipped, det(ftOn), 40);
    T.ok(s1.total > s0.total * 1.01, 'Demo Pact Shadow Bolt Succubus: ' + ((s1.total / s0.total - 1) * 100).toFixed(2) + '% more damage with the totem', s1.total / s0.total);
  });
})();
