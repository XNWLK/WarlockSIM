// Round 65 tests: Wrack's debuff (A18) checked tick by tick, and the reference builds (SM Ruin, DS Ruin, Wrack DS → Wrack Succubus in round 77).
// Round 66: no built-in pin flag any more — every build is shown by default (cut-off 0); pins are per browser (page).
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    return c;
  }
  function tb(rot, t) { return { key: 't65', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }

  T.run('round 65: Wrack and reference builds', function () {
    T.group('Wrack: +10% on Corruption and Bane of Agony only while it channels (spell data 1316697)');
    var c = det(), b = tb(['baneOfAgony', 'corruption', 'siphonLife', 'wrack'], { siphonLife: 1, wrack: 1 });
    var st = WL.computeStats(b, 'human', c), tab = WL.buildSpellTable(b, st, c), sp = tab.wrack.sp;
    var r = WL.simulateOnce(b, 'human', c, { duration: 60, log: true, seed: 1 });
    // channel windows from the log: each Wrack cast starts one, a clip or the 6 s end closes it
    var wins = [];
    r.log.forEach(function (e) {
      if (e.type === 'cast' && e.spell === 'wrack') wins.push([e.t, e.t + 6]);
      if (e.type === 'clip' && e.spell === 'wrack' && wins.length) wins[wins.length - 1][1] = e.t;
    });
    function during(t) { return wins.some(function (w) { return t > w[0] + 1e-6 && t <= w[1] + 1e-6; }); }
    var ticks = function (k) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === k; }); };
    var corr = Math.round(57 + 0.2 * sp), corrW = Math.round((57 + 0.2 * sp) * 1.10);
    var cIn = ticks('corruption').filter(function (e) { return during(e.t); }), cOut = ticks('corruption').filter(function (e) { return !during(e.t); });
    T.ok(cIn.length > 2 && cIn.every(function (e) { return e.dmg === corrW; }), 'Corruption ticks during Wrack = ' + corrW + ' (× 1.10; ' + cIn.length + ' ticks)');
    T.ok(cOut.length > 0 && cOut.every(function (e) { return e.dmg === corr; }), 'Corruption ticks outside Wrack = ' + corr + ' (' + cOut.length + ' ticks)');
    var boaIn = ticks('baneOfAgony').filter(function (e) { return during(e.t); });
    var avg = 46 + 0.133 * sp, ramp = [0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5];
    T.ok(boaIn.length > 2 && boaIn.every(function (e) { return ramp.some(function (f) { return e.dmg === Math.round(avg * f * 1.10); }); }), 'Bane of Agony ticks during Wrack = ramp × avg × 1.10');
    var sl = ticks('siphonLife');
    // Round 118 (user): Wrack's +10% also applies to Siphon Life and Bane of Doom (the tooltip's "your other Shadow damage over time effects").
    var slIn = sl.filter(function (e) { return during(e.t); }), slOut = sl.filter(function (e) { return !during(e.t); });
    T.ok(slIn.length > 0 && slIn.every(function (e) { return e.dmg === Math.round((41 + 0.05 * sp) * 1.10); }), 'Siphon Life ticks during Wrack = ' + Math.round((41 + 0.05 * sp) * 1.10) + ' (× 1.10; ' + slIn.length + ' ticks)');
    T.ok(slOut.length > 0 && slOut.every(function (e) { return e.dmg === Math.round(41 + 0.05 * sp); }), 'Siphon Life ticks outside Wrack = ' + Math.round(41 + 0.05 * sp) + ' (' + slOut.length + ' ticks)');
    T.ok(ticks('wrack').every(function (e) { return e.dmg === Math.round(36 + 0.143 * sp); }), 'Wrack ticks = 36 + 0.143 × SP = ' + Math.round(36 + 0.143 * sp));
    T.eq(WL.SPELLS.wrack.debuffSpells.slice().sort().join(','), 'baneOfAgony,baneOfDoom,corruption,siphonLife', 'affected spells: Corruption, Bane of Agony, Siphon Life, Bane of Doom (round 118)');

    T.group('reference builds (user, round 65); shown by default (round 66)');
    var want = { sm_ruin_classic: '30/0/21', wrack_succubus: '40/0/11' };   // DS Ruin (22/11/18) taken off the sheet in round 110   // SM Ruin 33/0/18 until round 83
    Object.keys(want).forEach(function (k) {
      var bb = WL.BUILDS.filter(function (x) { return x.key === k; })[0];
      T.ok(!!bb && !('pinned' in bb), k + ' is on the sheet (no built-in pin flag since round 66)');
      if (!bb) return;
      var s = { affliction: 0, demonology: 0, destruction: 0 };
      Object.keys(bb.talents).forEach(function (t) { s[WL.TALENT_BY_KEY[t].tree] += bb.talents[t]; });
      T.eq(s.affliction + '/' + s.demonology + '/' + s.destruction, want[k], k + ' talent split');
      T.eq(WL.validateBuild(bb).join(' | '), '', k + ' is legal');
    });
    T.eq(WL.DEFAULT_CONFIG.options.showWithinPct, 0, 'display cut-off 0 by default: every build is shown (round 66; was 10)');
    T.eq(WL.BUILDS.filter(function (x) { return x.pinned; }).length, 0, 'no build carries a pinned flag')
  });
})();
