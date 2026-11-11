// Forever patch of 2026-11-10: Wrack deals 70% of its damage; while you channel it, Corruption, Bane of
// Agony and Siphon Life tick twice as often without getting shorter (was: +10% damage to them and Bane of Doom);
// Soul Siphon counts only Corruption, Bane of Agony and Siphon Life.
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.critPct -= 2;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.options.dotEndCheck = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    return c;
  }
  var DUR = 120;
  function tb(rot, t) { return { key: 'twrack', short: 't', name: 't', notes: '', talents: t || { wrack: 1, siphonLife: 1 }, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function run(b, opts, dur) { var c = det(); Object.assign(c.options, opts || {}); return WL.simulateOnce(b, 'human', c, { seed: 3, duration: dur || DUR, log: true }); }
  function ticks(r, k) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === k; }); }
  function applies(r, k) { return r.log.filter(function (e) { return e.type === 'apply' && e.spell === k; }); }
  // Wrack channels from the log: [start, end) — from its cast to its 6th tick or the clip.
  function wrackWindows(r) {
    var w = [];
    r.log.forEach(function (e) {
      if (e.type === 'cast' && e.spell === 'wrack') w.push([e.t, e.t + WL.SPELLS.wrack.duration]);
      if (e.type === 'clip' && e.spell === 'wrack' && w.length) w[w.length - 1][1] = e.t;
    });
    return w;
  }
  // The expected tick times of one application of DoT k (applied at a, lasting until a + duration): a timer that runs
  // at double speed inside the Wrack windows, a tick each time it reaches tickEvery.
  function expectTicks(k, a, W, until) {
    var s = WL.SPELLS[k], end = Math.min(a + s.duration, until), out = [], t = a, prog = 0, step = 0.0005;
    while (t < end + 1e-9) {
      var on = W.some(function (x) { return t >= x[0] - 1e-9 && t < x[1] - 1e-9; }), rate = on ? 2 : 1;
      var need = (s.tickEvery - prog) / rate;
      var nextEdge = W.reduce(function (m, x) { return [x[0], x[1]].reduce(function (mm, y) { return y > t + 1e-9 && y < mm ? y : mm; }, m); }, Infinity);
      if (t + need <= Math.min(nextEdge, end) + 1e-6) { t += need; out.push(t); prog = 0; continue; }
      if (nextEdge >= end) { if (end === a + s.duration && (prog + (end - t) * rate) > 1e-6) out.push(end); break; }   // the part tick at the end
      prog += (nextEdge - t) * rate; t = nextEdge;
    }
    return out;
  }

  T.run('patch of 2026-11-10: Wrack data and Soul Siphon', function () {
    var w = WL.SPELLS.wrack;
    T.eq(w.tickBase + ' + ' + w.tickCoef, '60 + 0.2002', 'Wrack ticks 60 + 0.2002 × SP (official tooltip; 70% of 86 rounded)');
    T.eq(w.dotSpeedPct, 100, 'DoTs tick 100% faster while Wrack channels');
    T.eq(w.dotSpeedSpells.slice().sort().join(','), 'baneOfAgony,corruption,siphonLife', 'Corruption, Bane of Agony and Siphon Life (not Bane of Doom, not Immolate)');
    T.ok(w.debuffPct == null && w.debuffSpells == null, 'the old 10% damage bonus is gone');
    T.eq(WL.SOUL_SIPHON_EFFECTS.slice().sort().join(','), 'baneOfAgony,corruption,siphonLife', 'Soul Siphon counts Corruption, Bane of Agony and Siphon Life only');
    T.eq(WL.findBuild('wrack_ds').rotation.join(','), 'deathCoilFinisher,baneOfAgony,shadowTrance,corruption,siphonLife,curseOfElements,lifeTapNeed,wrack', 'Wrack DS: Bane of Agony and Siphon Life');
  });

  T.run('patch of 2026-11-10: DoTs tick twice as fast while Wrack channels', function () {
    // The shipped Wrack DS in a plain fight: Wrack starts and stops many times (Nightfall bolts, Life Tap, refreshes).
    var b = JSON.parse(JSON.stringify(WL.findBuild('wrack_ds'))), r = run(b), W = wrackWindows(r);
    T.ok(W.length > 10, W.length + ' Wrack channels');
    ['corruption', 'baneOfAgony', 'siphonLife'].forEach(function (k) {
      var ap = applies(r, k), all = ticks(r, k), bad = 0, n = 0, extra = 0;
      ap.forEach(function (a, i) {
        var next = i + 1 < ap.length ? ap[i + 1].t : Infinity;
        var got = all.filter(function (e) { return e.t > a.t + 1e-6 && e.t <= Math.min(next, DUR) + 1e-6; }).map(function (e) { return e.t; });
        var exp = expectTicks(k, a.t, W, Math.min(next, DUR));
        n += got.length; extra += got.length - WL.buildSpellTable(b, WL.computeStats(b, 'human', det()), det())[k].ticks;
        if (got.length !== exp.length || got.some(function (t, j) { return Math.abs(t - exp[j]) > 0.002; })) bad++;
      });
      T.eq(bad, 0, WL.SPELLS[k].name + ': all ' + n + ' ticks of ' + ap.length + ' casts come when a timer that runs at double speed during Wrack says');
      T.ok(all.every(function (e) { var a = applies(r, k).filter(function (x) { return x.t < e.t - 1e-6; }).pop(); return e.t <= a.t + WL.SPELLS[k].duration + 1e-6; }),
        WL.SPELLS[k].name + ': no tick after its normal duration (' + WL.SPELLS[k].duration + ' s) is over');
    });
    var c = ticks(r, 'corruption'), gaps = c.slice(1).map(function (e, i) { return +(e.t - c[i].t).toFixed(3); });
    T.ok(gaps.indexOf(1.5) >= 0 && gaps.indexOf(3) >= 0, 'Corruption ticks 1.5 s apart during Wrack and 3 s apart outside it');
  });

  T.run('patch of 2026-11-10: Bane of Doom, Bane of Agony ramp, the end of a DoT', function () {
    var r = run(tb(['bane', 'wrack']));
    var d = applies(r, 'baneOfDoom')[0], dt = ticks(r, 'baneOfDoom');
    T.ok(d && dt.length && Math.abs(dt[0].t - d.t - 60) < 1e-6, 'Bane of Doom still explodes 60 s after the cast while Wrack channels (' + (dt[0] && dt[0].t) + ')');

    // Bane of Agony: each tick's ramp follows the time since its cast (weak ticks in its first 8 s, strong ones in its last 8 s).
    var ra = run(tb(['baneOfAgony', 'wrack'])), at = ticks(ra, 'baneOfAgony'), a0 = applies(ra, 'baneOfAgony')[0].t, ramp = WL.SPELLS.baneOfAgony.ramp;
    var first = at.filter(function (e) { return e.t <= a0 + 24 + 1e-6 && e.part == null; });
    T.ok(first.length > 12, 'one Bane of Agony under Wrack ticks ' + first.length + ' times (12 without Wrack)');
    var unit = first.map(function (e) { return e.dmg / ramp[Math.min(11, Math.ceil((e.t - a0) / 2 - 1e-6) - 1)]; });
    T.ok(unit.every(function (u) { return Math.abs(u - unit[0]) <= 1.5; }), 'every tick = the same amount × the ramp of its 2-second slot (' + unit.map(Math.round).join(' ') + ')');

    // Corruption cast 2 s before Wrack: its ticks run on to exactly its normal end; what is left is lost (default) or dealt
    // as a part of a tick (option for measuring).
    var bc = tb(['corruption', 'wrack']), lost = run(bc, { wrackLastTick: 'lost' }, 40), part = run(bc, {}, 40);
    var pt = ticks(part, 'corruption').filter(function (e) { return e.part != null; });
    T.ok(ticks(lost, 'corruption').every(function (e) { return e.part == null; }), 'option "lost": only whole ticks');
    T.ok(pt.length > 0 && pt.every(function (e) { return e.part > 0 && e.part < 1 && Math.abs(e.t - applies(part, 'corruption').filter(function (a) { return a.t < e.t; }).pop().t - 18) < 1e-6; }),
      'default: a smaller last tick when the DoT ends between two ticks, at its normal end (' + pt.map(function (e) { return e.part; }).join(', ') + ')');
    var full = ticks(part, 'corruption').filter(function (e) { return e.part == null; })[0].dmg;
    T.ok(pt.every(function (e) { return Math.abs(e.dmg - full * e.part) <= 1; }), 'the part tick deals that part of a tick');
  });

  T.run('patch of 2026-11-10: the check version and the old schedule', function () {
    // With the speed-up at 0% the tick-by-tick timer gives exactly the fight of the fixed schedule.
    var b = JSON.parse(JSON.stringify(WL.findBuild('wrack_ds'))), old = WL.SPELLS.wrack.dotSpeedPct;
    WL.SPELLS.wrack.dotSpeedPct = 0;
    var a = run(b), z = run(b, { wrackMode: 'damage' });
    WL.SPELLS.wrack.dotSpeedPct = old;
    T.eq(a.total, z.total, 'speed-up 0%: the same fight as the fixed tick schedule');
    // wrackMode 'damage' (check version): normal tick times, ticks during Wrack deal twice as much.
    var r = run(b, { wrackMode: 'damage' }), W = wrackWindows(r), c = ticks(r, 'corruption');
    var inW = function (t) { return W.some(function (x) { return t > x[0] + 1e-6 && t < x[1] + 1e-6; }); };
    var i1 = c.filter(function (e) { return inW(e.t); }), o1 = c.filter(function (e) { return !inW(e.t); });
    T.ok(i1.length && o1.length, i1.length + ' Corruption ticks during Wrack, ' + o1.length + ' outside');
    T.ok(Math.abs(i1[0].dmg / o1[0].dmg - 2) < 0.01, 'check version: a tick during Wrack deals ×2 (' + i1[0].dmg + ' vs ' + o1[0].dmg + ')');
    var gaps = c.slice(1).map(function (e, i) { return +(e.t - c[i].t).toFixed(3); }).filter(function (g) { return g < 3 - 1e-6; });
    T.ok(gaps.every(function (g) { return g > 0; }) && c.length < ticks(run(b), 'corruption').length, 'check version: fewer, bigger ticks than the speed version');
  });

  T.run('patch of 2026-11-10: faster ticks = the same DoT damage as +100% for the time under Wrack', function () {
    // Check version 'share': normal tick times, each tick +100% for the share of its interval Wrack channelled. In theory the
    // same DoT damage as the faster ticks when the part of a tick at the end is dealt too (wrackLastTick 'partial').
    var b = WL.findBuild('wrack_ds'), dots = ['corruption', 'baneOfAgony', 'siphonLife'];
    function dotDps(o) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); Object.assign(c.options, o); c.fight.iterations = 300;
      var r = WL.simulate(b, 'undead', c, { iterations: 300 }); return dots.reduce(function (a, k) { return a + r.bySpell[k].dmg; }, 0); }
    var fast = dotDps({}), share = dotDps({ wrackMode: 'share' });
    T.ok(Math.abs(fast / share - 1) < 0.01, 'Corruption + Bane of Agony + Siphon Life: faster ticks ' + Math.round(fast) + ' vs check version ' + Math.round(share) + ' per fight (' + ((fast / share - 1) * 100).toFixed(2) + '%)');
    var lost = dotDps({ wrackLastTick: 'lost' });
    T.ok(lost < fast, 'without the part ticks at the end the DoTs deal less (' + Math.round(lost) + ')');
  });

  T.run('patch of 2026-11-10: Wrack cast again while it channels', function () {
    // A second Wrack action above the plain Wrack filler that switches on 20.5 s into the fight, in the middle of a filler
    // Wrack: it casts Wrack over the running one. Nothing is clipped: the ticks it had left carry over.
    var b = tb(['corruption', 'wrackDots', 'wrack']); b.params = { wrackDots: { sec: 0 } }; b.actWhen = { wrackDots: { t: 'fight', what: 'elapsed', op: '>=', v: 20.5 } };
    var r = run(b), rc = r.log.filter(function (e) { return e.type === 'recast'; });
    T.ok(rc.length > 0, rc.length + ' times Wrack was cast again while it channelled');
    T.eq(r.log.filter(function (e) { return e.type === 'clip' && e.spell === 'wrack' && e.for === 'wrack'; }).length, 0, 'never logged as a clip');
    var bad = 0;
    rc.forEach(function (x) {
      var c = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'wrack' && Math.abs(e.t - x.t) < 1e-6; })[0];
      var n = Math.floor(x.left + 1e-6) + 6, end = c ? c.t + c.channel : 0;
      var tk = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'wrack' && e.t > x.t + 1e-6 && e.t <= end + 1e-6; });
      var cut = r.log.some(function (e) { return (e.type === 'clip' || e.type === 'recast') && e.spell === 'wrack' && e.t > x.t + 1e-6 && e.t < end - 1e-6; });
      if (!c || c.channel !== n || (!cut && tk.length !== n)) bad++;
    });
    T.eq(bad, 0, 'each new Wrack runs for its 6 ticks plus the ones the old one had left, one every second');
    var W = wrackWindows(r).map(function (w, i, a) { return w; }), ap = applies(r, 'corruption'), all = ticks(r, 'corruption'), off = 0;
    // the DoTs stay sped up through the recast: Corruption's ticks still follow the double-speed timer
    W = []; r.log.forEach(function (e) {
      if (e.type === 'cast' && e.spell === 'wrack') W.push([e.t, e.t + e.channel]);
      if ((e.type === 'clip' || e.type === 'recast') && e.spell === 'wrack' && W.length) W[W.length - 1][1] = e.t;
    });
    ap.forEach(function (a, i) {
      var next = i + 1 < ap.length ? ap[i + 1].t : Infinity;
      var got = all.filter(function (e) { return e.t > a.t + 1e-6 && e.t <= Math.min(next, DUR) + 1e-6; }).map(function (e) { return e.t; });
      var exp = expectTicks('corruption', a.t, W, Math.min(next, DUR));
      if (got.length !== exp.length || got.some(function (t, j) { return Math.abs(t - exp[j]) > 0.002; })) off++;
    });
    T.eq(off, 0, 'Corruption keeps ticking twice as fast across each recast (' + ap.length + ' casts)');
  });

  T.run('patch of 2026-11-10: Soul Siphon on Wrack', function () {
    var tal = { wrack: 1, siphonLife: 1, soulSiphon: 3 };
    var alone = ticks(run(tb(['wrack'], tal), {}, 30), 'wrack')[0].dmg;
    var doom = run(tb(['bane', 'wrack'], tal)), dw = ticks(doom, 'wrack').filter(function (e) { return e.t < 60; });   // Bane of Doom: 60 s or more left
    T.ok(dw.length > 3 && dw.every(function (e) { return e.dmg === alone; }), 'Bane of Doom no longer counts: Wrack ticks ' + alone + ' with Doom up, as with nothing up');
    var three = run(tb(['baneOfAgony', 'corruption', 'siphonLife', 'wrack'], tal), {}, 30), sl = applies(three, 'siphonLife')[0].t;
    var tw = ticks(three, 'wrack').filter(function (e) { return e.t > sl + 1e-6 && e.t < sl + 18; });
    T.ok(tw.length > 3 && tw.every(function (e) { return Math.abs(e.dmg - alone * 1.36) <= 1; }), 'with Corruption, Bane of Agony and Siphon Life up: × 1.36 (' + (tw[0] && tw[0].dmg) + ')');
  });
})();
