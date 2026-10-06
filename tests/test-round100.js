// Round 100 tests (user): Hellfire and Rain of Fire — AoE channels whose every tick hits every target of the fight, the
// talents their spell data lists, and both as filler actions. Hellfire's damage to yourself is not modelled. [A79]
(function () {
  function det(n, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.combat.baseCritPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.fight.targets = n || 1;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't100', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function table(t, c) { c = c || det(); var b = tb(['hellfire'], t); return WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c); }
  function run(rot, t, c, race, dur) { return WL.simulateOnce(tb(rot, t), race || 'human', c, { seed: 1, duration: dur || 60, log: true }); }
  function ticks(r, k) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === k; }); }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }
  function shipped(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === k; })[0])); }

  T.run('round 100: Hellfire and Rain of Fire', function () {
    T.group('spell data');
    var H = WL.SPELLS.hellfire, F = WL.SPELLS.rainOfFire;
    T.ok(H && H.kind === 'channel' && H.aoe && H.school === 'fire' && H.tree === 'destruction', 'Hellfire: Fire, Destruction, area channel');
    T.eq([H.id, H.rank, H.tickBase, H.tickCoef, H.tickEvery, H.duration, H.cost, H.range, H.radius, H.effectSpell].join('/'), '11684/3/206/0.022/1/15/1300/0/10/11682',
      'Hellfire R3: 206 + 2.2% of spell power per second for 15 s, 1300 mana, 10 yd around you');
    T.ok(F && F.kind === 'channel' && F.aoe && F.school === 'fire' && F.tree === 'destruction', 'Rain of Fire: Fire, Destruction, area channel');
    T.eq([F.id, F.rank, F.tickBase, F.tickCoef, F.tickEvery, F.duration, F.cost, F.range, F.radius, F.effectSpell].join('/'), '11678/4/220/0.083/2/8/1185/30/8/1282385',
      'Rain of Fire R4: 220 + 8.3% of spell power every 2 s for 8 s, 1185 mana, 30 yd, 8 yd radius');
    T.ok(!H.talent && !F.talent, 'both are trained spells (no talent needed)');

    T.group('talents (from each talent\'s list of affected spells)');
    var t0 = table({});
    T.ok(near(t0.hellfire.periodicMult, 1) && near(t0.rainOfFire.periodicMult, 1), 'no talents: ×1');
    T.eq([t0.hellfire.ticks, t0.rainOfFire.ticks].join('/'), '15/4', '15 and 4 ticks');
    var tc = table({ cataclysm: 3 });
    T.ok(near(tc.hellfire.cost, 1170) && near(tc.rainOfFire.cost, 1066.5), 'Cataclysm 3/3: 1170 and 1066.5 mana');
    var tr = table({ ruin: 5 });
    T.eq([t0.hellfire.critMult, tr.hellfire.critMult, tr.rainOfFire.critMult].join('/'), '1.5/2/2', 'Ruin 5/5: crits ×2 (×1.5 without)');
    var tm = table({ malediction: 5 });
    T.ok(near(tm.hellfire.periodicMult, 1.05) && near(tm.rainOfFire.periodicMult, 1), 'Malediction 5/5: Hellfire +5%, Rain of Fire nothing');
    var ta = table({ agonizingFlames: 3 });
    T.ok(near(ta.hellfire.periodicMult, 1) && near(ta.rainOfFire.periodicMult, 1.10), 'Agonizing Flames 3/3: Rain of Fire +10%, Hellfire nothing');
    T.ok(near(ta.immolate.periodicMult, 1.10) && near(tm.corruption.periodicMult, 1.05), 'the other spells keep both talents (Immolate burn +10%, Corruption +5%)');
    var td = table({ destructiveReach: 2 });
    T.eq([td.rainOfFire.range, td.hellfire.range, td.rainOfFire.radius, td.hellfire.radius].join('/'), '36/0/8/10', 'Destructive Reach 2/2: Rain of Fire 36 yd; the radii stay 8 / 10 yd');
    T.ok(near(table({ shadowMastery: 5 }).hellfire.periodicMult, 1), 'Shadow talents do nothing for them');

    T.group('ticks, one target');
    var c1 = det(1), sp = table({}, c1).hellfire.sp;
    var h1 = run(['hellfire'], {}, c1), ht = ticks(h1, 'hellfire'), hv = Math.round(206 + 0.022 * sp);
    T.ok(ht.length >= 30 && ht.every(function (e) { return e.dmg === hv; }), 'Hellfire: every tick 206 + 0.022 × ' + sp + ' = ' + hv);
    T.eq(ht.slice(0, 15).map(function (e) { return e.t; }).join(','), '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15', 'one tick a second for 15 s');
    var f1 = run(['rainOfFire'], {}, c1), ft = ticks(f1, 'rainOfFire'), fv = Math.round(220 + 0.083 * sp);
    T.ok(ft.length >= 12 && ft.every(function (e) { return e.dmg === fv; }), 'Rain of Fire: every tick 220 + 0.083 × ' + sp + ' = ' + fv);
    T.eq(ft.slice(0, 4).map(function (e) { return e.t; }).join(','), '2,4,6,8', 'a tick every 2 s for 8 s');
    T.ok(!h1.bySpell['x2:hellfire'] && !f1.bySpell['x2:rainOfFire'], 'one target: nothing else is hit');
    var cc = det(1, function (c) { c.gear.critPct = 100; }), hc = ticks(run(['hellfire'], { ruin: 5 }, cc), 'hellfire');
    T.ok(hc.every(function (e) { return e.crit && e.dmg === Math.round((206 + 0.022 * sp) * 2); }), 'ticks can crit (100% crit, Ruin 5/5: ' + Math.round((206 + 0.022 * sp) * 2) + ')');

    T.group('several targets');
    [['hellfire', 2], ['hellfire', 3], ['rainOfFire', 3]].forEach(function (x) {
      var r = run([x[0]], {}, det(x[1])), a = r.bySpell[x[0]], ok = true, n = 0;
      for (var ti = 2; ti <= x[1]; ti++) { var b = r.bySpell['x' + ti + ':' + x[0]]; ok = ok && b && near(b.dmg, a.dmg) && b.ticks === a.ticks; n++; }
      T.ok(ok && !r.bySpell['x' + (x[1] + 1) + ':' + x[0]], WL.SPELLS[x[0]].name + ', ' + x[1] + ' targets: each target takes the same ' + a.ticks + ' ticks (' + Math.round(a.dmg) + ' each)');
      var one = run([x[0]], {}, det(1));
      T.ok(near(r.total, x[1] * one.total), x[1] + ' targets = ' + x[1] + ' × the damage of one (' + Math.round(r.total) + ')');
    });
    var cm = det(3, function (c) { c.combat.baseHitPct = 50; c.combat.maxHitPct = 50; }), hm = run(['hellfire'], {}, cm, 'human', 120);
    var rows = ['hellfire', 'x2:hellfire', 'x3:hellfire'].map(function (k) { return hm.bySpell[k]; });
    T.ok(rows.every(function (r) { return r.misses > 20 && r.ticks > 20; }) && rows.every(function (r) { return r.ticks + r.misses === rows[0].ticks + rows[0].misses; }),
      '50% hit: every tick rolls to hit on every target (' + rows.map(function (r) { return r.ticks + ' hit / ' + r.misses + ' missed'; }).join('; ') + ')');
    T.ok(!(rows[0].ticks === rows[1].ticks && rows[1].ticks === rows[2].ticks), 'the rolls are separate per target');
    var cx = det(2, function (c) { c.options.useCurseOfElements = true; }), hx = run(['curseOfElements', 'hellfire'], {}, cx);
    var hcoe = Math.round((206 + 0.022 * sp) * 1.1);
    T.ok(ticks(hx, 'hellfire').every(function (e) { return e.dmg === hcoe; }) && ticks(hx, 'x2:hellfire').every(function (e) { return e.dmg === hv; }),
      'Curse of the Elements counts only on the target that has it (' + hcoe + ' vs ' + hv + ')');
    var hh = run(['hellfire'], { baneOfHavoc: 1 }, det(2));
    T.ok(hh.bySpell.baneOfHavoc && Math.abs(hh.bySpell.baneOfHavoc.dmg - 0.15 * hh.bySpell.hellfire.dmg) < 1, 'Bane of Havoc copies 15% of what target 1 takes to target 2 (' +
      Math.round(hh.bySpell.baneOfHavoc.dmg) + '), on top of target 2\'s own ticks');

    T.group('live effects');
    var ge = run(['hellfire'], {}, det(1), 'gnome'), gt = ticks(ge, 'hellfire');
    T.eq(gt[0].dmg, Math.round((206 + 0.022 * table({}, det(1)).hellfire.sp) * 1.1), 'Eureka!: the ticks of the channel it was popped for get +10% (channel ticks, not DoT ticks)');
    var ci = det(1, function (c) { c.fight.hitEvery = 2; });
    var p0 = run(['hellfire'], {}, ci, 'human', 120), p3 = run(['hellfire'], { intensity: 3 }, ci, 'human', 120);
    T.ok(p0.pushbacks > 0 && p0.pushResisted === 0 && p3.pushResisted > 0, 'Intensity protects the channel from pushback (' + p3.pushResisted + ' of ' + (p3.pushResisted + p3.pushbacks) + ' hits resisted; none without it)');

    T.group('filler actions');
    ['hellfire', 'rainOfFire'].forEach(function (k) {
      var A = WL.ACTIONS[k];
      T.ok(A && A.filler && /hits every target/.test(A.label), 'filler "' + (A && A.label) + '"');
      T.ok(WL.editorActions().indexOf(k) >= 0 && WL.TIMELINE_SPELLS.indexOf(k) >= 0, k + ': in the build editor and the timeline spell list');
      var b = shipped('demo_pact_fire'); b.rotation[b.rotation.length - 1] = k;
      T.eq(WL.validateBuild(b).join(' | '), '', k + ': legal as the filler of a built-in build');
      T.eq(WL.decodeBuild(WL.encodeBuild(b)).rotation.join(','), b.rotation.join(','), k + ': survives a build-code round trip');
      var r = WL.simulateOnce(b, 'human', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { seed: 2, duration: 120 });
      T.ok(r.bySpell[k] && r.bySpell[k].ticks > 10 && r.dps > 0, k + ': a full build runs with it (' + r.dps.toFixed(0) + ' DPS on one target)');
      if (WL.ICONS) T.ok(!!WL.ICONS[k], k + ': icon');
      if (WL.SPELL_TEXT) T.ok(!!WL.SPELL_TEXT[WL.SPELLS[k].id], k + ': tooltip text');
    });
    T.ok(WL.BUILDS.every(function (b) { return b.rotation.indexOf('hellfire') < 0 && b.rotation.indexOf('rainOfFire') < 0; }), 'no built-in build uses them');
  });
})();
