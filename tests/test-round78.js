// Round 78 tests: damage taken every N s → pushback (A76). Casts: +1.0 / 0.8 / 0.6 / 0.4 / 0.2 s, then 0.2 s per hit,
// no cap on the number of hits, never back past the cast's start. Channels: −25% of the full duration per hit.
// Protection: Intensity (Destruction), Fel Concentration (Drain Life, Drain Soul, Wrack), Concentration Aura 35%; sum ≤ 100%.
(function () {
  function det(every) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    c.fight.hitEvery = every;
    return c;
  }
  function tb(rot, t) { return { key: 't78', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }

  T.run('round 78: pushback', function () {
    T.group('defaults (user, round 78)');
    T.eq(WL.DEFAULT_CONFIG.fight.hitEvery, 0, 'no hits by default');
    var ca = WL.DEFAULT_CONFIG.buffs.concentrationAura;
    T.ok(!!ca && ca.on === false && ca.pushbackResistPct === 35 && ca.cls === 'Paladin', 'Concentration Aura: Paladin raid buff, off, 35%');
    T.eq(WL.TALENT_BY_KEY.intensity.v.resistPct.join('/'), '23/47/70', 'Intensity 23/47/70% (tooltip)');
    T.eq(WL.TALENT_BY_KEY.felConcentration.v.resistPct.join('/'), '23/47/70', 'Fel Concentration 23/47/70% (tooltip)');

    T.group('casts: 1.0 / 0.8 / 0.6 / 0.4 / 0.2 s, then 0.2 s, never back past the start');
    var b = tb(['shadowBolt']), c = det(0.45), r = WL.simulateOnce(b, 'human', c, { duration: 60, log: true, seed: 3 });
    var full = WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c).shadowBolt.cast;
    T.ok(full > 2, 'Shadow Bolt cast time ' + full + ' s');
    var cur = null, bad = 0, n = 0, sixth = 0, capped = 0, landBad = 0, casts = 0;
    r.log.forEach(function (e) {
      if (e.spell !== 'shadowBolt') return;
      if (e.type === 'cast') { cur = { start: e.t, end: e.t + full, n: 0 }; casts++; }
      else if (e.type === 'pushback' && cur) {
        var step = Math.max(0.2, 1 - 0.2 * cur.n), end = Math.min(cur.end + step, e.t + full), exp = end - cur.end;
        cur.n++;
        if (!(Math.abs(e.delay - exp) <= 0.002)) bad++;            // NaN-safe
        if (exp < step - 1e-6) capped++;
        if (cur.n >= 6 && Math.abs(e.delay - 0.2) < 0.002) sixth++;
        cur.end = end; n++;
      } else if ((e.type === 'hit' || e.type === 'miss') && cur) { if (!(Math.abs(e.t - cur.end) <= 0.002)) landBad++; cur = null; }
    });
    T.ok(n > 20 && bad === 0, 'every pushback = min(step, back to the start) (' + n + ' pushbacks)');
    T.ok(capped > 0, 'some pushbacks stop at the start of the cast (' + capped + ')');
    T.ok(sixth > 0, 'no cap on the number of hits: 6th+ hit of a cast still pushes 0.2 s (' + sixth + ')');
    T.eq(landBad, 0, 'each Shadow Bolt lands when its pushed-back cast ends');
    T.near(r.pushbackTime, r.log.filter(function (e) { return e.type === 'pushback'; }).reduce(function (a, e) { return a + e.delay; }, 0), 0.01, 'pushback time = sum of the delays');
    var r0 = WL.simulateOnce(b, 'human', det(0), { duration: 60, log: true, seed: 3 });
    T.ok(r0.pushbacks === 0 && r.dps < r0.dps * 0.85, 'a hit every 0.45 s: fewer Shadow Bolts (' + r.dps.toFixed(0) + ' vs ' + r0.dps.toFixed(0) + ' DPS without hits)');

    T.group('instants are never pushed back');
    var ri = WL.simulateOnce(tb(['corruption', 'shadowBolt'], { improvedCorruption: 5 }), 'human', det(0.5), { duration: 60, log: true, seed: 4 });
    T.eq(ri.log.filter(function (e) { return (e.type === 'pushback' || e.type === 'pushResist') && e.spell === 'corruption'; }).length, 0, 'instant Corruption (Improved Corruption 5/5): no pushback');

    T.group('channels: −25% of the full duration per hit');
    var bd = tb(['drainLife']), rd = WL.simulateOnce(bd, 'human', det(1), { duration: 60, log: true, seed: 5 });
    var dl = WL.SPELLS.drainLife, chan = null, cutBad = 0, cuts = 0, lateTicks = 0;
    rd.log.forEach(function (e) {
      if (e.spell !== 'drainLife') return;
      if (e.type === 'cast') chan = { end: e.t + dl.duration };
      else if (e.type === 'pushback' && chan) {
        var ne = Math.max(e.t, chan.end - 0.25 * dl.duration);
        if (!(Math.abs(e.cut - (chan.end - ne)) <= 0.002)) cutBad++;
        chan.end = ne; cuts++;
      } else if (e.type === 'tick' && chan && e.t > chan.end + 1e-6) lateTicks++;
    });
    T.ok(cuts > 20 && cutBad === 0, 'each hit cuts 25% (' + (0.25 * dl.duration) + ' s), at most what is left (' + cuts + ' cuts)');
    T.eq(lateTicks, 0, 'no ticks after the shortened end');
    var ticks = rd.log.filter(function (e) { return e.type === 'tick' && e.spell === 'drainLife'; }).length;
    var casts2 = rd.log.filter(function (e) { return e.type === 'cast' && e.spell === 'drainLife'; }).length;
    T.ok(ticks < casts2 * WL.SPELLS.drainLife.duration / WL.SPELLS.drainLife.tickEvery, 'fewer ticks per channel than without hits (' + (ticks / casts2).toFixed(2) + ')');

    T.group('protection: talent + Concentration Aura, one roll per hit');
    function share(t, aura, rot) {
      var cc = det(0.7); cc.fight.iterations = 200; if (aura) cc.buffs.concentrationAura.on = true;
      var x = WL.simulate(tb(rot || ['shadowBolt'], t), 'human', cc).pushback;
      return x.resisted / (x.resisted + x.n);
    }
    var p70 = share({ intensity: 3 }), p35 = share({}, true), p23 = share({ intensity: 1 });
    T.ok(Math.abs(p70 - 0.70) < 0.03, 'Intensity 3/3 on Shadow Bolt: ' + (p70 * 100).toFixed(1) + '% of hits resisted (70%)');
    T.ok(Math.abs(p23 - 0.23) < 0.03, 'Intensity 1/3: ' + (p23 * 100).toFixed(1) + '% (23%)');
    T.ok(Math.abs(p35 - 0.35) < 0.03, 'Concentration Aura alone: ' + (p35 * 100).toFixed(1) + '% (35%)');
    T.eq(share({ intensity: 3 }, true), 1, 'Intensity 70% + Concentration Aura 35% → capped at 100%: no pushback at all');
    T.eq(share({ felConcentration: 3 }), 0, 'Fel Concentration does not protect Shadow Bolt');
    var pd = share({ felConcentration: 3 }, false, ['drainLife']);
    T.ok(Math.abs(pd - 0.70) < 0.03, 'Fel Concentration 3/3 on Drain Life: ' + (pd * 100).toFixed(1) + '% (70%)');
    T.eq(share({ intensity: 3 }, false, ['drainLife']), 0, 'Intensity does not protect Drain Life (Affliction)');

    T.group('off = unchanged');
    var a = WL.simulateOnce(b, 'human', det(0), { duration: 60, seed: 9 }), z = WL.simulateOnce(b, 'human', det(0), { duration: 60, seed: 9 });
    T.ok(a.pushbacks === 0 && a.pushResisted === 0 && a.dps === z.dps, 'hitEvery 0: no hits, no rolls');
  });
})();
