// Round 27 tests: multi-DoT on extra targets (A61).
(function () {
  function cfgWith(targets, multi) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.targets = targets; c.fight.multiDot = multi;
    return c;
  }
  function rows(r, prefix) { return Object.keys(r.bySpell).filter(function (k) { return k.indexOf(prefix) === 0; }); }

  T.run('multi-DoT (round 27)', function () {
    T.group('option off or 1 target: identical to before');
    var top = WL.BUILDS[0];
    var a = WL.simulateOnce(top, 'gnome', cfgWith(1, false), { seed: 21, duration: 150 });
    var b = WL.simulateOnce(top, 'gnome', cfgWith(1, true), { seed: 21, duration: 150 });
    T.near(b.dps, a.dps, 1e-9, '1 target: multi-DoT option has no effect');
    var c2 = WL.simulateOnce(top, 'gnome', cfgWith(2, false), { seed: 21, duration: 150 });
    T.near(c2.dps, a.dps, 1e-9, '2 targets without multi-DoT and without Havoc: same as 1 target');
    // Round 242 (user: "move multi-dot above life tap for all builds"): right above "Life Tap when needed" (was: right
    // before the filler); test-round242.js checks every build.
    var ti = top.rotation.indexOf('lifeTapNeed');
    T.eq(WL.effectiveRotation(top, cfgWith(2, true)).join(','), top.rotation.slice(0, ti).concat(['multiDot'], top.rotation.slice(ti)).join(','),
      'multi-DoT action inserted right above Life Tap when needed (round 242)');

    T.group('2 targets, no Havoc: DoTs kept on target 2');
    var m = WL.simulateOnce(top, 'gnome', cfgWith(2, true), { seed: 21, duration: 150, log: true });
    var x2 = rows(m, 'x2:');
    T.ok(['x2:corruption', 'x2:baneOfAgony', 'x2:immolate'].every(function (k) { return x2.indexOf(k) >= 0 && m.bySpell[k].ticks > 0; }), 'Corruption, Bane of Agony, Immolate tick on target 2 (' + x2.join(', ') + ')');
    T.ok(m.dps > a.dps, 'more total DPS (' + m.dps.toFixed(1) + ' vs ' + a.dps.toFixed(1) + ')');
    // First version expected > 80% flat; the boss's own Corruption is only ~81% in this fight, target 2 starts ~1.5 s later.
    // Round 53: measured with the end-of-fight DoT check off — with it on, target 2's last Corruption (12.2 s left, 4
    // ticks worth 864 < 948 of Shadow Bolt; target 2 has no ISB) is rightly skipped, which is tested in test-round53.js.
    var cOff = cfgWith(2, true); cOff.options.dotEndCheck = false;
    var mo = WL.simulateOnce(top, 'gnome', cOff, { seed: 21, duration: 150 });
    var upX = 100 * (mo.uptime['dot2:corruption'] || 0) / 150, upM = 100 * mo.uptime['dot:corruption'] / 150;
    T.ok(upX >= upM - 10, 'Corruption on target 2 up ' + upX.toFixed(1) + '% vs ' + upM.toFixed(1) + '% on the boss (within 10 points)');
    // Round 282: the average of ALL ticks was mostly tick crits (2 vs 9 crits of 42 decided it once Shadow Demo renews Demonic Brand
    // below 3 s); since round 39 target 2 has your Curse of the Elements too, so the difference left is Improved Shadow Bolt: the
    // non-crit ticks (from the fight log) are never bigger on target 2, and smaller on average.
    var nc = function (k) { return m.log.filter(function (e) { return e.type === 'tick' && e.spell === k && !e.crit; }).map(function (e) { return e.dmg; }); };
    var mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }, t2 = nc('x2:corruption'), t1 = nc('corruption');
    T.ok(t2.length > 10 && t1.length > 10 && Math.max.apply(null, t2) <= Math.min.apply(null, t1) + 1 && mean(t2) < mean(t1), 'target-2 Corruption ticks are smaller (no ISB there; non-crit ticks): ' + mean(t2).toFixed(0) + ' < ' + mean(t1).toFixed(0));
    T.ok(m.log.some(function (e) { return e.type === 'cast' && e.spell === 'x2:corruption'; }), 'casts on target 2 appear in the log');

    T.group('3 targets with Bane of Havoc on target 2');
    var hb = WL.BUILDS.filter(function (x) { return x.talents.baneOfHavoc; })[0];
    var h = WL.simulateOnce(hb, 'gnome', cfgWith(3, true), { seed: 22, duration: 150 });
    T.ok(!h.bySpell['x2:baneOfAgony'] && !!h.bySpell['x3:baneOfAgony'], 'no Bane of Agony on the Havoc target, Bane of Agony on target 3');
    var own = Object.keys(h.bySpell).filter(function (k) { return k.indexOf('pet:') !== 0 && k.indexOf('x2:') !== 0 && k !== 'baneOfHavoc'; })
      .reduce(function (s, k) { return s + h.bySpell[k].dmg; }, 0);
    T.near(h.bySpell.baneOfHavoc.dmg, 0.15 * own, 1e-6, 'Havoc copies 15% of the damage dealt to the OTHER targets (target-2 damage not copied)');
    var single = WL.simulateOnce(hb, 'gnome', cfgWith(2, false), { seed: 22, duration: 150 });
    T.ok(h.dps > single.dps, '3 targets + multi-DoT beat 2 targets Havoc only (' + h.dps.toFixed(1) + ' vs ' + single.dps.toFixed(1) + ')');
    T.eq(WL.validateBuild(Object.assign({}, top, { rotation: ['multiDot'].concat(top.rotation) })).join(' | '), '', 'multiDot is a legal priority action in the editor');
  });
})();
