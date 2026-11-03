// Round 184 tests: the Forever patch notes of 2026-11-03 — Wrack 86 + 28.6% SP per second, Improved Drains no longer
// raises Wrack (Drain Life / Drain Soul still), Shadow and Flame 4–20%, Salvation removed.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.sp = 500;
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false; c.combat.levelResist.on = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (f) f(c);
    return c;
  }
  function tb(rot, t) { return { key: 't184', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function table(b, c) { return WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c); }

  T.run('round 184: Forever patch notes of 2026-11-03', function () {
    T.group('Wrack: 86 + 28.6% of spell power every second (was 36 + 14.3%)');
    var c = det(), w = WL.SPELLS.wrack;
    T.ok(w.tickBase === 86 && w.tickCoef === 0.286 && w.tickEvery === 1 && w.duration === 6, 'data: 86 + 0.286 × SP per 1 s tick, 6 s');
    var plain = table(tb(['wrack'], { siphonLife: 1, wrack: 1 }), c);
    T.near(plain.wrack.tickDmg, 86 + 0.286 * plain.wrack.sp, 1e-9, 'no talents: one tick = 86 + 0.286 × ' + plain.wrack.sp + ' = ' + (86 + 0.286 * plain.wrack.sp).toFixed(1));
    var r = WL.simulateOnce(tb(['wrack'], { siphonLife: 1, wrack: 1 }), 'human', c, { duration: 30, log: true, seed: 1 });
    var ticks = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'wrack'; });
    T.ok(ticks.length > 20 && ticks.every(function (e) { return e.dmg === Math.round(86 + 0.286 * plain.wrack.sp); }), 'every tick in a fight hits for that (' + ticks.length + ' ticks)');

    T.group('Improved Drains: Drain Life and Drain Soul, no longer Wrack');
    var t0 = table(tb(['wrack'], { siphonLife: 1, wrack: 1 }), c), t3 = table(tb(['wrack'], { siphonLife: 1, wrack: 1, improvedDrains: 3 }), c);
    T.near(t3.wrack.tickDmg, t0.wrack.tickDmg, 1e-9, 'Improved Drains 3/3: Wrack unchanged (' + t0.wrack.tickDmg.toFixed(1) + ')');
    T.near(t3.drainLife.tickDmg / t0.drainLife.tickDmg, 1.20, 1e-9, '… Drain Life +20%');
    T.near(t3.drainSoul.tickDmg / t0.drainSoul.tickDmg, 1.20, 1e-9, '… Drain Soul +20%');

    T.group('Shadow and Flame: +4 / 8 / 12 / 16 / 20% (was 2 to 10%)');
    T.eq(WL.TALENT_BY_KEY.shadowAndFlame.v.schoolPct.join(','), '4,8,12,16,20', 'per rank');
    var sb = 251 + 0.857 * 500, hits = function (rr) { return rr.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; }); };
    [1, 3, 5].forEach(function (n) {
      var rr = WL.simulateOnce(tb(['immolate', 'conflagrate', 'shadowBolt'], { conflagrate: 1, shadowAndFlame: n }), 'human', c, { duration: 40, log: true, seed: 2 });
      var buffed = hits(rr).filter(function (e) { return e.dmg === Math.round(sb * (1 + 0.04 * n)); });
      T.ok(buffed.length > 3, n + '/5: Shadow Bolts after a Conflagrate hit for × ' + (1 + 0.04 * n).toFixed(2) + ' (' + buffed.length + ' of ' + hits(rr).length + ')');
    });

    T.group('Salvation removed');
    T.ok(!WL.DEFAULT_CONFIG.buffs.blessingOfSalvation && !WL.ICONS.buff_blessingOfSalvation, 'no Salvation buff, no icon');
    T.ok(!Object.keys(WL.DEFAULT_CONFIG.buffs).some(function (k) { return WL.DEFAULT_CONFIG.buffs[k].threatPct; }), 'no threat buff is left');
    var c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), snap = JSON.parse(JSON.stringify(WL.settingsSnapshot(c2)));
    snap.buffs = snap.buffs.concat(['blessingOfSalvation']);
    T.eq(WL.applySettings(c2, snap).join(','), '', 'an old settings code with Salvation on still loads, with no "unknown" names');
    T.ok(!c2.buffs.blessingOfSalvation, '… and Salvation does not come back');
  });
})();
