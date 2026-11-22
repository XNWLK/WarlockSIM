// Round 244 tests — evidence fixes, the user's picks (a public combat-log study, Warcraft Logs, Forever):
//  A "Imp regen from your Int": a demon's regen = mp5PerOwnerInt × your Intellect as MP5 (Imp 30%, Voidwalker / Succubus 10%;
//    the Felhunter keeps 8 a second) [A45];
//  B "Set procs: Necropile, Deathmist": Necropile Raiment 3 at 13.9% per landing (direct hits and DoT / channel landings, per
//    target; never ticks); Deathmist (set 518) with the reissued row 1681's bonuses [A116];
//  C "Hellfire cast rolls no procs": Hellfire's cast rolls no Blade of Eternal Darkness, Touch of the Grave, Judgement of
//    Wisdom, set, trinket or enchant proc; Rain of Fire's cast no Touch of the Grave [A131];
//  D "The small ones": Insight 5.4%, Violet Sorcerer's 4 at 1.0 a minute on cast time, the Voidwalker's halved melee, the
//    demon's spell power from your school total, Innervate × 5 MP5, demon crit as live (with a switch) [A26][A46][A55][A95][A106].
// tests/reference-gear.js pins the pre-round-244 demon rules for the worked tests; WL.SHIPPED_PETS.r244 holds the shipped ones.
(function () {
  var SH = WL.SHIPPED_PETS.r244;
  function shipped(c) { c.petSpPct = WL.SHIPPED_PETS.petSpPct; c.petCrit = JSON.parse(JSON.stringify(SH.petCrit)); c.petSchoolSp = SH.petSchoolSp; c.pets = JSON.parse(JSON.stringify(SH.pets)); return c; }
  function det(f) { var c = shipped(JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG))); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  var tb = function (rot, pet) { return { key: 't244', short: 't', name: 't', notes: '', talents: {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }; };
  function wear(ids, ench) {                                         // the gear builder wearing these items (each in the first free slot it fits)
    var s = {};
    ids.forEach(function (id) { s[WL.GEAR_SLOTS.filter(function (g) { return WL.gearFits(g.key, WL.ITEMS[id]) && !s[g.key]; })[0].key] = { id: id }; });
    return { on: true, slots: s, manual: {}, enchants: ench ? { mainHand: { id: ench } } : {}, };
  }
  function runs(b, race, c, n, dur, log) { var out = []; for (var s = 1; s <= n; s++) out.push(WL.simulateOnce(b, race, c, { seed: s, duration: dur || 180, log: !!log })); return out; }
  function sum(rs, f) { return rs.reduce(function (a, r) { return a + (f(r) || 0); }, 0); }
  function rowOf(r, k) { return r.bySpell[k] || { casts: 0, landed: 0, misses: 0, crits: 0, hits: 0, dmg: 0 }; }
  function procs(r, k) { var x = rowOf(r, k); return x.landed + x.misses; }
  function buffs(r, name) { return r.log.filter(function (e) { return e.type === 'buff' && e.spell === name; }).length; }

  T.run('round 244: demon mana regen from your Intellect [A45]', function () {
    T.group('data');
    T.eq(SH.pets.imp.mp5PerOwnerInt, 0.30, 'Imp: 30% of your Intellect as MP5');
    T.eq(SH.pets.succubus.mp5PerOwnerInt, 0.10, 'Succubus: 10%');
    T.eq(SH.pets.voidwalker.mp5PerOwnerInt, 0.10, 'Voidwalker: 10%');
    T.ok(SH.pets.felhunter.mp5PerOwnerInt == null && SH.pets.felhunter.manaRegen === 8, 'Felhunter: its share was never read — 8 a second, as before');
    T.ok(SH.pets.imp.mana === 2000 && SH.pets.succubus.mana === 2000, 'the pools stay 2000 (the notes cannot split the warlock\'s share of the demon\'s maximum mana)');

    T.group('in the fight');
    [['imp', 0.30], ['succubus', 0.10], ['voidwalker', 0.10], ['felhunter', null]].forEach(function (x) {
      var b = tb(['shadowBolt'], x[0]), c = det(), st = WL.computeStats(b, 'human', c);
      var r = WL.simulateOnce(b, 'human', c, { seed: 1, duration: 30 });
      var want = x[1] == null ? 8 : x[1] * st.int / 5;
      T.near(r.petRegen, want, 1e-9, x[0] + ': ' + want.toFixed(2) + ' mana a second at ' + st.int.toFixed(1) + ' Intellect');
      if (x[1] == null) return;
      var c2 = det(function (cc) { cc.extra.int = 100; }), st2 = WL.computeStats(b, 'human', c2);
      var r2 = WL.simulateOnce(b, 'human', c2, { seed: 1, duration: 30 });
      T.near(r2.petRegen - r.petRegen, x[1] * (st2.int - st.int) / 5, 1e-9, x[0] + ': +100 Intellect (' + (st2.int - st.int).toFixed(1) + ' with Kings) → +' + (r2.petRegen - r.petRegen).toFixed(2) + ' a second');
    });
    var imp = tb(['shadowBolt'], 'imp'), cNew = det(), cOld = det(function (c) { delete c.pets.imp.mp5PerOwnerInt; c.pets.imp.manaRegen = 8; });
    var oomNew = sum(runs(imp, 'human', cNew, 6, 300), function (r) { return r.petOomTime; }), oomOld = sum(runs(imp, 'human', cOld, 6, 300), function (r) { return r.petOomTime; });
    T.ok(oomOld > 30 && oomNew < oomOld, 'the Imp (no talents, no Demonic Energies) waits for mana less than at 8 a second: ' + (oomNew / 6).toFixed(1) + ' s against ' + (oomOld / 6).toFixed(1) + ' s a 300 s fight');
  });

  T.run('round 244: Necropile Raiment 13.9% per landing; Deathmist with row 1681 [A116]', function () {
    T.group('Necropile Raiment (3)');
    var np = WL.SET_FX[122].at[3];
    T.ok(np.chancePct === 13.9 && np.perTarget === true && np.kind === 'dmg' && np.min === 28, '13.9% per landing (13.93% [12.97, 14.89]), on each target, 28 Shadow');
    var c = det(function (x) { x.gearBuilder = wear([14626, 14629, 14631]); });
    var rs = runs(tb(['corruption', 'shadowBolt']), 'human', c, 12, 600, true);
    var land = sum(rs, function (r) { return rowOf(r, 'shadowBolt').landed + rowOf(r, 'corruption').landed; }), pr = sum(rs, function (r) { return procs(r, 'trinket:set122'); });
    var p = 0.139, se = Math.sqrt(p * (1 - p) / land);
    T.near(pr / land, p, 4 * se, (pr / land * 100).toFixed(2) + '% of ' + land + ' landings (Shadow Bolt hits and Corruption applications) vs 13.9% (± ' + (4 * se * 100).toFixed(2) + ')');
    var afterDot = 0, afterTick = 0;
    rs.forEach(function (r) { r.log.forEach(function (e, i) {
      var nx = r.log[i + 1]; if (!nx || nx.spell !== 'trinket:set122') return;
      if (e.type === 'apply' && e.spell === 'corruption') afterDot++;
      if (e.type === 'tick') afterTick++;
    }); });
    T.ok(afterDot > 20, 'a Corruption application rolls it (' + afterDot + ' procs right after one)');
    T.eq(afterTick, 0, 'no tick rolls it');
    var cx = det(function (x) { x.gearBuilder = wear([14626, 14629, 14631]); x.fight.targets = 3; x.fight.multiDot = true; }), onX = 0;
    runs(tb(['corruption', 'shadowBolt']), 'human', cx, 4, 300, true).forEach(function (r) { r.log.forEach(function (e, i) {
      var nx = r.log[i + 1]; if (nx && nx.spell === 'trinket:set122' && e.type === 'apply' && /^x[23]:corruption$/.test(e.spell)) onX++;
    }); });
    T.ok(onX > 0, 'a Corruption landing on an extra target rolls it too (' + onX + ')');

    T.group('Deathmist Raiment: row 1681\'s bonuses on the pieces 22070–22077');
    var S = WL.ITEM_SETS[518], by = function (n) { return S.bonuses.filter(function (b) { return b.n === n; })[0] || {}; };
    T.eq(S.items.join(','), '22070,22071,22072,22073,22074,22075,22076,22077', 'the eight pieces the gear builder offers');
    T.ok(/All Resistances/.test(by(2).text) && !by(2).stats, '(2) +8 all resistances (no stat of the sim)');
    T.eq((by(3).stats || {}).mp5, 8, '(3) 8 MP5');
    T.ok(/heal you/.test(by(4).text), '(4) the heal proc (healing: not simulated)');
    T.ok(/flee in terror/.test(by(5).text) && !by(5).stats, '(5) the fear, no spell power (rounds 211–243: +12 spell power)');
    T.eq((by(6).stats || {}).sp, 23, '(6) +23 spell power');
    var D = det(), g6 = WL.gearSheet(wear(S.items.slice(0, 6)), D), g5 = WL.gearSheet(wear(S.items.slice(0, 5)), D), g2 = WL.gearSheet(wear(S.items.slice(0, 2)), D);
    T.ok(g2.sets.sp === 0 && !g2.sets.mp5, '2 pieces: nothing the sim counts');
    T.ok(g5.sets.sp === 0 && g5.sets.mp5 === 8, '5 pieces: 8 MP5, no spell power');
    T.ok(g6.sets.sp === 23 && g6.sets.mp5 === 8, '6 pieces: +23 spell power and 8 MP5');
    var tip = String(WL.ITEM_TIPS[22070]).replace(/<[^>]+>/g, '');
    T.ok(/\(3\) Set: Restores 8 mana per 5 sec/.test(tip) && /\(6\) Set: Increases damage and healing done by magical spells and effects by up to 23/.test(tip), 'the tooltip shows (3) 8 MP5 and (6) +23');
  });

  T.run('round 244: Hellfire\'s cast rolls no procs; Rain of Fire\'s cast no Touch of the Grave [A131]', function () {
    T.ok(WL.SPELLS.hellfire.castOnSelf === true && WL.SPELLS.rainOfFire.castNoTog === true, 'the flags: Hellfire castOnSelf, Rain of Fire castNoTog');
    // Gear A: Blade of Eternal Darkness with Insight, Necropile Raiment (3), Draconic Infused Emblem; gear B: Violet Sorcerer's (4).
    var gA = function (c) { c.gearBuilder = wear([17780, 14626, 14629, 14631, 22268], 8216); c.debuffs.judgementOfWisdom.on = true; };
    var gB = function (c) { c.gearBuilder = wear([273044, 273051, 286987, 286988]); c.debuffs.judgementOfWisdom.on = true; };
    var EMB = WL.TRINKET_FX[22268].name, VIO = WL.SET_FX[2134].name;
    function count(rot, g) {
      var rs = runs(tb(['lifeTapNeed', rot]), 'undead', det(g), 15, 300, true);
      return { casts: sum(rs, function (r) { return rowOf(r, rot).casts; }), blade: sum(rs, function (r) { return procs(r, 'trinket:17780'); }), tog: sum(rs, function (r) { return rowOf(r, 'touchOfTheGrave').casts; }),
               jow: sum(rs, function (r) { return r.manaFromJow; }), necro: sum(rs, function (r) { return procs(r, 'trinket:set122'); }), insight: sum(rs, function (r) { return buffs(r, 'Insight'); }),
               emblem: sum(rs, function (r) { return buffs(r, EMB); }), violet: sum(rs, function (r) { return buffs(r, VIO); }) };
    }
    T.group('Hellfire');
    var h = count('hellfire', gA), hv = count('hellfire', gB);
    T.ok(h.casts > 100 && hv.casts > 100, h.casts + ' / ' + hv.casts + ' Hellfire casts');
    T.ok(h.blade === 0 && h.tog === 0 && h.jow === 0, 'no Blade of Eternal Darkness, Touch of the Grave or Judgement of Wisdom');
    T.ok(h.necro === 0 && h.insight === 0 && h.emblem === 0 && hv.violet === 0, 'no set (Necropile, Violet Sorcerer\'s), enchant (Insight) or trinket proc (Draconic Infused Emblem)');
    T.group('Rain of Fire');
    var f = count('rainOfFire', gA), fv = count('rainOfFire', gB);
    T.ok(f.casts > 100, f.casts + ' Rain of Fire casts');
    T.eq(f.tog, 0, 'no Touch of the Grave (0 of 171 in the study)');
    T.ok(f.blade > 0 && f.jow > 0 && f.necro > 0 && f.insight > 0 && f.emblem > 0 && fv.violet > 0,
      'the others still roll: Blade ' + f.blade + ', Judgement of Wisdom ' + Math.round(f.jow) + ' mana, Necropile ' + f.necro + ', Insight ' + f.insight + ', Emblem ' + f.emblem + ', Violet ' + fv.violet);
    T.group('control: Shadow Bolt');
    var s = count('shadowBolt', gA);
    T.ok(s.tog > 0 && s.blade > 0 && s.jow > 0, 'Shadow Bolt still procs Touch of the Grave (' + s.tog + '), the Blade (' + s.blade + ') and Judgement of Wisdom');
  });

  T.run('round 244: Insight, Violet Sorcerer\'s Vestments, the Voidwalker [A106][A116][A46]', function () {
    T.group('Insight (enchant 8216)');
    T.eq(WL.ENCHANT_FX[8216].proc.chancePct, 5.4, '5.4% per damaging spell (the row says 35%; low to medium confidence)');
    var ci = det(function (x) { x.gearBuilder = wear([17780], 8216); }), ri = runs(tb(['shadowBolt']), 'human', ci, 12, 600, true);
    var li = sum(ri, function (r) { return rowOf(r, 'shadowBolt').landed; }), bi = sum(ri, function (r) { return buffs(r, 'Insight'); }), pi = 0.054, sei = Math.sqrt(pi * (1 - pi) / li);
    T.near(bi / li, pi, 4 * sei, (bi / li * 100).toFixed(2) + '% of ' + li + ' Shadow Bolt landings (± ' + (4 * sei * 100).toFixed(2) + ')');

    T.group('Violet Sorcerer\'s Vestments (4): 1.0 a minute on cast time');
    var v = WL.SET_FX[2134].at[4];
    T.ok(v.ppm === 1.0 && v.minCast === 1.5 && v.aoeCastPct === 8.6 && v.perTarget === true && v.chancePct == null, 'ppm 1.0, instants at 1.5 s, Rain of Fire\'s cast 8.6%, per target');
    T.near(WL.procChancePct(v, WL.SPELLS.shadowBolt, 3), 5, 1e-9, 'a 3 s cast: 5%');
    T.near(WL.procChancePct(v, WL.SPELLS.shadowBolt, 2.5), 1.0 * 2.5 / 60 * 100, 1e-9, 'a 2.5 s cast: 4.17%');
    T.near(WL.procChancePct(v, WL.SPELLS.corruption, 0), 2.5, 1e-9, 'an instant (Corruption): 2.5%');
    T.near(WL.procChancePct(v, WL.SPELLS.drainLife, 0), 2.5, 1e-9, 'a drain\'s cast prices as an instant: 2.5%');
    T.eq(WL.procChancePct(v, WL.SPELLS.rainOfFire, 0), 8.6, 'Rain of Fire\'s cast: 8.6%');
    T.eq(WL.procChancePct({ chancePct: 13.9 }, WL.SPELLS.shadowBolt, 3), 13.9, 'a flat chance stays flat');
    T.ok(/only melees/.test(WL.SET_NOT_SIMULATED[2134][5]), '(5): not simulated — an Arcane elemental that only melees');
    T.ok(/a minute on cast time/.test(WL.setBonusNote(2134, { n: 4 })), 'the gear builder\'s note: ' + WL.setBonusNote(2134, { n: 4 }));

    T.group('the Voidwalker: weapon 0.494 × creature DPS + own 186 AP, all of it halved');
    var vm = SH.pets.voidwalker.melee;
    T.ok(Math.abs(vm.baseDps - (0.494 * 60.45 + 186 / 14)) < 0.1 && vm.dmgPct === 50, 'base ' + vm.baseDps + ' DPS (29.9 + 13.3), × 50%');
    var bv = tb(['shadowBolt'], 'voidwalker'), c50 = det(), c100 = det(function (x) { delete x.pets.voidwalker.melee.dmgPct; });
    var m50 = sum(runs(bv, 'human', c50, 4, 180), function (r) { return rowOf(r, 'pet:melee').dmg; }), m100 = sum(runs(bv, 'human', c100, 4, 180), function (r) { return rowOf(r, 'pet:melee').dmg; });
    T.near(m50 / m100, 0.5, 1e-9, 'its melee deals exactly half (same fights)');
    var ex = WL.explainSpell(bv, 'human', c50, 'pet:melee');
    T.ok(ex && ex.steps.some(function (s) { return /halved/.test(s.calc); }), 'the damage breakdown shows the halving');
  });

  T.run('round 244: the demon\'s spell power, Innervate, demon crit [A26][A55][A95]', function () {
    T.group('the demon\'s spell power: generic + your better school');
    T.eq(SH.petSchoolSp, true, 'cfg.petSchoolSp on');
    var bi = tb(['shadowBolt'], 'imp'), fb = function (f) { return sum(runs(bi, 'human', det(f), 3, 120), function (r) { return rowOf(r, 'pet:firebolt').dmg; }); };
    var gen = fb(function (c) { c.gear.sp += 100; }), sha = fb(function (c) { c.gear.shadowSp = 100; }), both = fb(function (c) { c.gear.shadowSp = 100; c.gear.fireSp = 50; });
    var none = fb(null), off = fb(function (c) { c.gear.shadowSp = 100; c.petSchoolSp = false; });
    T.near(sha, gen, 1e-6 * gen, '+100 Shadow spell power raises Firebolt as much as +100 spell power (' + Math.round(none) + ' → ' + Math.round(sha) + ')');
    T.near(both, sha, 1e-6 * sha, 'the better school only: +100 Shadow and +50 Fire = +100');
    T.near(off, none, 1e-6 * none, 'petSchoolSp false (rounds 31–243): school spell power gives the demon nothing');
    var ex = WL.explainSpell(bi, 'human', det(function (c) { c.gear.shadowSp = 100; }), 'pet:firebolt');
    T.ok(ex && ex.steps.some(function (s) { return /better school/.test(s.calc); }), 'the damage breakdown names it');

    T.group('Innervate: 5 × (Spirit regeneration + MP5), energize ticks unscaled');
    T.ok(WL.DEFAULT_CONFIG.buffs.blessingOfWisdom.tick && WL.DEFAULT_CONFIG.buffs.manaSpring.tick && WL.DEFAULT_CONFIG.buffs.restorativeTotems.tick, 'Blessing of Wisdom, Mana Spring, Restorative Totems: periodic energize ticks');
    var b = sheet('demo_pact_succ_sb'), ci = det(function (c) { c.buffs.innervate.on = true; c.buffs.blessingOfWisdom.on = true; c.gear.mp5 = 50; });
    var st = WL.computeStats(b, 'human', ci);
    T.ok(st.mp5 === 90 && st.mp5Tick === 40, 'MP5 90, of it 40 Blessing of Wisdom ticks');
    var want = 5 * (ci.combat.spiritRegenBase + ci.combat.spiritRegenPerSpi * st.spi) + 4 * 50 * 2 / 5;
    var r = WL.simulateOnce(b, 'human', ci, { seed: 2, duration: 300, log: true }), ticks = r.log.filter(function (e) { return e.type === 'mana' && e.spell === 'Innervate'; });
    T.ok(ticks.length >= 10, ticks.length + ' Innervate ticks');
    T.ok(ticks.slice(0, 5).every(function (e) { return e.gain === Math.round(want); }), 'each 2 s tick: 5 × Spirit regeneration + 4 × the 50 gear MP5 (the 5th runs anyway) = ' + want.toFixed(1) + ' (rounds 114–243: 5 × Spirit only)');

    T.group('demon crit: live (its own + your gear\'s crit) or the announced change (your spell crit)');
    T.ok(SH.petCrit.fromOwner === false && SH.petCrit.ownMeleePct === 0.7 && SH.petCrit.ownSpellPct === 0, 'cfg.petCrit: live, own melee 0.7%, own spell 0');
    var sb = sheet('demo_pact_succ_sb'), cl = det(function (c) { c.gear.critPct = 14; }), co = det(function (c) { c.gear.critPct = 14; c.petCrit.fromOwner = true; });
    var sl = WL.computeStats(sb, 'human', cl);
    T.near(sl.gearCritPct, 14 - 1.7 - (WL.WARLOCK_BASE_60.int + cl.gear.int) / 60, 1e-9, 'your gear\'s crit = the sheet less its base and Intellect: ' + sl.gearCritPct.toFixed(2) + '%');
    function rate(c, k) { var rs = runs(sb, 'human', c, 25, 600); var l = sum(rs, function (r) { return rowOf(r, k).landed; }), cr = sum(rs, function (r) { return rowOf(r, k).crits; }); return { n: l, p: cr / l }; }
    var ll = rate(cl, 'pet:lashOfPain'), lo = rate(co, 'pet:lashOfPain');
    var pl = sl.gearCritPct / 100, po = sl.critPct / 100;
    T.near(ll.p, pl, 4 * Math.sqrt(pl * (1 - pl) / ll.n), 'live: Lash of Pain crits ' + (ll.p * 100).toFixed(2) + '% vs ' + (pl * 100).toFixed(2) + '% (your gear\'s crit; ' + ll.n + ' hits)');
    T.near(lo.p, po, 4 * Math.sqrt(po * (1 - po) / lo.n), 'fromOwner: ' + (lo.p * 100).toFixed(2) + '% vs your spell crit ' + (po * 100).toFixed(2) + '%');
    var ml = rate(cl, 'pet:melee'), mo = rate(co, 'pet:melee'), sup = cl.combat.petMelee.critSuppressionPct;
    var mExp = Math.max(0, 0.7 + sl.gearCritPct - sup), xv = WL.explainSpell(sb, 'human', cl, 'pet:melee').values;
    T.near(xv.crit, mExp, 1e-9, 'live melee crit chance: 0.7 + ' + sl.gearCritPct.toFixed(2) + ' − ' + sup + ' = ' + mExp.toFixed(2) + '% of all swings (the breakdown agrees)');
    var pm = mExp / (100 - xv.miss - cl.combat.petMelee.dodgePct);
    T.near(ml.p, pm, 4 * Math.sqrt(Math.max(pm, 1e-4) * (1 - pm) / ml.n) + 1e-9, 'live melee in the fight: ' + (ml.p * 100).toFixed(2) + '% of landed swings vs ' + (pm * 100).toFixed(2) + '%');
    T.ok(mo.p > ml.p + 0.05, 'fromOwner melee crits far more: ' + (mo.p * 100).toFixed(2) + '% of landed swings');
    var cz = det(function (c) { c.gear.critPct = 8; }), mz = rate(cz, 'pet:melee');
    var sz = WL.computeStats(sb, 'human', cz);
    T.ok(0.7 + sz.gearCritPct - sup > 0 || mz.p === 0, 'at ' + sz.gearCritPct.toFixed(2) + '% gear crit: 0.7 + gear − ' + sup + ' ≤ 0 → no melee crit (' + (mz.p * 100).toFixed(2) + '%)');
  });
})();
