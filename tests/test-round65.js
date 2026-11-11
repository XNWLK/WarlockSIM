// Round 65 tests: Wrack's effect on the DoTs (A18) checked tick by tick (patch of 2026-11-10: faster ticks, not bigger ones), and the reference builds (SM Ruin, DS Ruin, Wrack DS → Wrack Succubus in round 77).
// Round 66: no built-in pin flag any more — every build is shown by default (cut-off 0); pins are per browser (page).
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.critPct -= 2;
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    return c;
  }
  function tb(rot, t) { return { key: 't65', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }

  T.run('round 65: Wrack and reference builds', function () {
    T.group('Wrack (patch of 2026-11-10): the DoT ticks keep their size while it channels (they come twice as often instead)');
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
    var ticks = function (k) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === k && e.part == null; }); };   // whole ticks (a sped-up DoT's last one can be smaller)
    var corr = Math.round(57 + 0.2 * sp);
    var cIn = ticks('corruption').filter(function (e) { return during(e.t); }), cOut = ticks('corruption').filter(function (e) { return !during(e.t); });
    T.ok(cIn.length > 2 && cIn.every(function (e) { return e.dmg === corr; }), 'Corruption ticks during Wrack = ' + corr + ' (no bonus; ' + cIn.length + ' ticks)');
    T.ok(cOut.length > 0 && cOut.every(function (e) { return e.dmg === corr; }), 'Corruption ticks outside Wrack = ' + corr + ' (' + cOut.length + ' ticks)');
    var avg = 46 + 0.133 * sp, ramp = [0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5];
    var boaIn = ticks('baneOfAgony').filter(function (e) { return during(e.t); });
    T.ok(boaIn.length > 2 && boaIn.every(function (e) { return ramp.some(function (f) { return e.dmg === Math.round(avg * f); }); }), 'Bane of Agony ticks during Wrack = ramp × avg');
    var sl = ticks('siphonLife'), slIn = sl.filter(function (e) { return during(e.t); }), slOut = sl.filter(function (e) { return !during(e.t); });
    T.ok(slIn.length > 0 && slIn.every(function (e) { return e.dmg === Math.round(41 + 0.05 * sp); }), 'Siphon Life ticks during Wrack = ' + Math.round(41 + 0.05 * sp) + ' (' + slIn.length + ' ticks)');
    T.ok(slOut.length > 0 && slOut.every(function (e) { return e.dmg === Math.round(41 + 0.05 * sp); }), 'Siphon Life ticks outside Wrack = ' + Math.round(41 + 0.05 * sp) + ' (' + slOut.length + ' ticks)');
    T.ok(ticks('wrack').every(function (e) { return e.dmg === Math.round(60 + 0.2002 * sp); }), 'Wrack ticks = 60 + 0.2002 × SP = ' + Math.round(60 + 0.2002 * sp) + ' (70% of 86 + 0.286)');
    T.eq(WL.SPELLS.wrack.dotSpeedSpells.slice().sort().join(','), 'baneOfAgony,corruption,siphonLife', 'sped-up spells: Corruption, Bane of Agony, Siphon Life (not Bane of Doom)');

    T.group('reference builds (user, round 65); shown by default (round 66)');
    var want = { sm_ruin_classic: '30/0/21', wrack_succubus: '33/0/18' };   // round 149: Malediction's points moved (patch 2026-10-16), then the search after it   // DS Ruin (22/11/18) taken off the sheet in round 110   // SM Ruin 33/0/18 until round 83
    Object.keys(want).forEach(function (k) {
      var bb = WL.findBuild(k);   // round 186 (user): both off the sheet, kept as fixtures
      T.ok(!!bb && !('pinned' in bb) && WL.RETIRED_BUILDS.indexOf(bb) >= 0, k + ' is kept as a fixture (no built-in pin flag since round 66)');
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
