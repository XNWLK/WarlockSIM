// Round 106 tests (user feedback): priority action "Wrack when the shortest DoT has more than _ s left" — a number you
// fill in is compared with the shortest time left on the DoTs the priority list keeps up (Bane of Doom left out);
// below it the list falls through to the filler under the action.
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.options.dotEndCheck = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    return c;
  }
  var TAL = { wrack: 1, siphonLife: 1 };
  function tb(rot, sec, t) { var b = { key: 't106', short: 't', name: 't', notes: '', talents: t || TAL, pet: null, sacrifice: null, oil: 'none', rotation: rot }; if (sec != null) b.params = { wrackDots: { sec: sec } }; return b; }
  var DUR = 120;
  function run(b) { return WL.simulateOnce(b, 'human', det(), { seed: 1, duration: DUR, log: true }); }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }); }
  // Time left on DoT `k` at time t, from the log (duration from the spell data).
  function left(r, k, t) {
    var ap = r.log.filter(function (e) { return e.type === 'apply' && e.spell === k && e.t <= t + 1e-6; }).pop();
    return ap ? Math.max(0, ap.t + WL.SPELLS[k].duration - t) : 0;
  }
  function shipped(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === k; })[0])); }

  T.run('round 106: Wrack while the DoTs have time left', function () {
    T.group('the action');
    var A = WL.ACTIONS.wrackDots;
    T.ok(A && !A.filler && A.label === 'Wrack when the shortest DoT has more than _ s left', 'priority action "' + (A && A.label) + '" (not a filler)');
    T.eq(A.params.map(function (p) { return p.key + ':' + p.def + ':' + p.min + '-' + p.max; }).join(' '), 'sec:6:0-60', 'one number: seconds left (default 6 = one full Wrack)');
    T.ok(WL.editorActions().indexOf('wrackDots') >= 0, 'offered in the build editor');
    T.eq(WL.actionLabel(tb(['wrackDots', 'shadowBolt'], 9), 'wrackDots'), 'Wrack when the shortest DoT has more than 9 s left', 'label with the build\'s number');
    T.eq(JSON.stringify(WL.DOT_ACTIONS), '{"corruption":"corruption","immolate":"immolate","siphonLife":"siphonLife","baneOfAgony":"baneOfAgony","bane":"baneOfAgony"}', 'DoTs that count: Corruption, Immolate, Siphon Life, Bane of Agony — not Bane of Doom');

    T.group('one DoT (Corruption, 6 s)');
    var r = run(tb(['corruption', 'wrackDots', 'shadowBolt'], 6)), wAll = casts(r, 'wrack'), sb = casts(r, 'shadowBolt');
    // A DoT that is not on the boss is not counted: at the very end Corruption is no longer recast and Wrack goes on.
    var w = wAll.filter(function (e) { return left(r, 'corruption', e.t) > 0; }), wEnd = wAll.filter(function (e) { return left(r, 'corruption', e.t) === 0; });
    T.ok(w.length >= 5 && w.every(function (e) { return left(r, 'corruption', e.t) > 6 - 1e-6; }), 'every Wrack with Corruption up starts with more than 6 s of it left (' + w.length + ' Wracks, least ' +
      Math.min.apply(null, w.map(function (e) { return left(r, 'corruption', e.t); })).toFixed(1) + ' s)');
    T.ok(wEnd.every(function (e) { return e.t > DUR - 10; }), 'a DoT that is not on the boss does not count: ' + wEnd.length + ' Wrack at the very end, after the last Corruption ran out');
    T.ok(sb.length >= 3 && sb.every(function (e) { return left(r, 'corruption', e.t) <= 6 + 1e-6; }), 'below that the list falls through to Shadow Bolt (' + sb.length + ' casts, all with ≤ 6 s left)');
    T.eq(r.clipped, 0, 'no Wrack is cut short by the Corruption refresh');
    var plain = run(tb(['corruption', 'wrack']));
    T.ok(plain.clipped > 0 && casts(plain, 'shadowBolt').length === 0, 'the plain Wrack filler is cut ' + plain.clipped + ' times for the same refreshes');

    T.group('the number');
    var r0 = run(tb(['corruption', 'wrackDots', 'shadowBolt'], 0));
    T.eq(r0.total, plain.total, '0 s: Wrack whenever a DoT is up — the same fight as the plain Wrack filler (clipping included)');
    var r12 = run(tb(['corruption', 'wrackDots', 'shadowBolt'], 12)), w12 = casts(r12, 'wrack').filter(function (e) { return left(r12, 'corruption', e.t) > 0; });
    T.ok(w12.length > 0 && w12.length < w.length && w12.every(function (e) { return left(r12, 'corruption', e.t) > 12 - 1e-6; }), '12 s: fewer Wracks (' + w12.length + ' vs ' + w.length + '), all with more than 12 s left');
    var r60 = run(tb(['corruption', 'wrackDots', 'shadowBolt'], 60));
    T.eq(casts(r60, 'wrack').filter(function (e) { return left(r60, 'corruption', e.t) > 0; }).length, 0, '60 s (longer than any DoT lasts): never Wrack while a DoT is up');
    T.eq(casts(run(tb(['corruption', 'wrackDots', 'shadowBolt'])), 'wrack').length, wAll.length, 'no number set = 6 s');

    T.group('several DoTs, the Banes');
    var up = function (x, t) { return [left(x, 'corruption', t), left(x, 'siphonLife', t)].filter(function (v) { return v > 0; }); };
    var m = run(tb(['corruption', 'siphonLife', 'wrackDots', 'shadowBolt'], 6)), wm = casts(m, 'wrack').filter(function (e) { return up(m, e.t).length === 2; });
    T.ok(wm.length >= 3 && wm.every(function (e) { return Math.min.apply(null, up(m, e.t)) > 6 - 1e-6; }), 'the shortest of Corruption and Siphon Life decides (' + wm.length + ' Wracks)');
    T.ok(wm.length < w.length, 'two DoTs leave fewer openings than one (' + wm.length + ' vs ' + w.length + ')');
    var doom = run(tb(['bane', 'wrackDots', 'shadowBolt'], 30)), wd = casts(doom, 'wrack');
    T.ok(wd.some(function (e) { return e.t > 35 && e.t < 55; }) && casts(doom, 'shadowBolt').filter(function (e) { return e.t < 55; }).length === 0,
      'Bane of Doom is left out: Wrack goes on while Doom has less than 30 s left');
    var agony = run(tb(['baneOfAgony', 'wrackDots', 'shadowBolt'], 30));
    T.ok(casts(agony, 'wrack').length === 0 && casts(agony, 'shadowBolt').length > 20, 'Bane of Agony counts: with 30 s (it lasts 24) there is never a Wrack');
    var none = run(tb(['wrackDots', 'shadowBolt'], 6));
    T.ok(casts(none, 'shadowBolt').length === 0 && casts(none, 'wrack').length > 10, 'no DoT in the list: always Wrack');

    T.group('fall-through filler, checks, build codes');
    var dl = run(tb(['corruption', 'wrackDots', 'drainLife'], 6));
    T.ok(casts(dl, 'wrack').length > 3 && casts(dl, 'drainLife').length > 3, 'Drain Life works as the filler below it too (' + casts(dl, 'wrack').length + ' Wracks, ' + casts(dl, 'drainLife').length + ' Drain Lifes)');
    var ws = shipped('wrack_succubus'); ws.rotation[ws.rotation.length - 1] = 'wrackDots'; ws.params = ws.params || {}; ws.params.wrackDots = { sec: 6 };
    T.ok(WL.validateBuild(ws).some(function (e) { return /needs a filler/.test(e); }), 'as the last entry it is refused: the list needs a filler below it');
    ws.rotation.push('shadowBolt');
    T.eq(WL.validateBuild(ws).join(' | '), '', 'legal in Wrack Succubus with Shadow Bolt below it');
    var back = WL.decodeBuild(WL.encodeBuild(ws));
    T.eq(JSON.stringify(back.params.wrackDots) + ' ' + back.rotation.slice(-2).join(','), '{"sec":6} wrackDots,shadowBolt', 'the build code carries the number');
    var noT = shipped('sm_ruin_classic'); noT.rotation.splice(noT.rotation.length - 1, 0, 'wrackDots');
    T.ok(WL.validateBuild(noT).some(function (e) { return /Wrack talent/.test(e); }), 'refused without the Wrack talent');
    var bad = JSON.parse(JSON.stringify(ws)); bad.params.wrackDots.sec = 99;
    T.ok(WL.validateBuild(bad).some(function (e) { return /must be a number from 0 to 60/.test(e); }), '99 s is refused');

    T.group('shipped builds unchanged');
    T.ok(WL.BUILDS.every(function (b) { return b.custom || b.rotation.indexOf('wrackDots') < 0; }), 'no built-in build uses it');
  });
})();
