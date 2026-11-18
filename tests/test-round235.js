// Round 235 tests (user: "implement blade of eternal darkness with its stats and its proc"): its proc measured in game,
// 1.8 a minute on the cast time of the cast that launched each landed harmful spell (at least 1.5 s), 112 Shadow damage and
// 104 mana, on curses and DoT / channel casts too, never on ticks. [A127]
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function wear(c, slot) { c.gearBuilder = { on: true, slots: {}, manual: {}, enchants: {} }; c.gearBuilder.slots[slot || 'mainHand'] = { id: 17780 }; return c; }
  function withPpm(ppm, f) { var p = WL.ITEM_FX[17780].proc, was = p.procsPerMin; p.procsPerMin = ppm; try { return f(); } finally { p.procsPerMin = was; } }
  function blade(r) { return r.log.filter(function (e) { return e.spell === 'trinket:17780' && (e.type === 'hit' || e.type === 'miss'); }); }

  T.run('round 235: Blade of Eternal Darkness (stats and proc)', function () {
    T.group('the item');
    var it = WL.ITEMS[17780];
    T.ok(it && it.name === 'Blade of Eternal Darkness' && it.slot === 'mainHand' && it.weapon === 'dagger', 'in the gear builder: a main-hand dagger');
    T.eq(it.stats.sp, 62, '+62 spell power (its tooltip)');
    var p = WL.ITEM_FX[17780].proc;
    T.ok(p.kind === 'ppmCast' && p.procsPerMin === 1.8 && p.minCast === 1.5 && p.icd === 0.1, '1.8 a minute on cast time, at least 1.5 s, 100 ms cooldown');
    T.ok(p.min === 112 && p.max === 112 && p.school === 'shadow' && p.mana === 104, '112 Shadow damage and 104 mana');
    T.eq(WL.equippedItemFx(wear(det())).length, 1, 'worn in the main hand: in the fight');
    var off = wear(det()); off.gearBuilder.on = false;
    T.eq(WL.equippedItemFx(off).length, 0, '… only while the gear builder is on');
    T.eq(WL.equippedItemFx(det()).length, 0, 'not worn: nothing');
    T.ok(/1\.8 a minute/.test(WL.itemFxText(WL.ITEM_FX[17780])), 'its text for the gear builder: ' + WL.itemFxText(WL.ITEM_FX[17780]));

    T.group('what rolls (a chance of 100% for the test)');
    var cw = wear(det());
    var r = withPpm(40, function () { return WL.simulateOnce(sheet('wrack_ds'), 'human', cw, { seed: 5, duration: 120, log: true }); });
    var procs = blade(r), landT = {};
    r.log.forEach(function (e) {
      if ((e.type === 'apply' || e.type === 'debuff' || (e.type === 'hit' && WL.SPELLS[e.spell])) && WL.SPELLS[e.spell]) landT[e.t.toFixed(3)] = 1;
      if (e.type === 'cast' && e.channel) landT[e.t.toFixed(3)] = 1;
    });
    var landed = 0; Object.keys(r.bySpell).forEach(function (k) { var b = r.bySpell[k]; if (WL.SPELLS[k.replace(/^x\d:/, '')] && k !== 'lifeTap') landed += b.landed; });
    T.ok(procs.length > 20 && procs.length <= landed && procs.length >= landed - 2, procs.length + ' procs on ' + landed + ' landed casts (Corruption, Bane of Agony, Wrack and curse casts roll)');
    T.ok(procs.every(function (e) { return landT[e.t.toFixed(3)]; }), 'every proc is at a landing, never at a DoT or channel tick alone');
    var kinds = {}; procs.forEach(function (e) { r.log.forEach(function (x) { if (x.t === e.t && (x.type === 'apply' || x.type === 'debuff' || (x.type === 'cast' && x.channel))) kinds[x.spell] = 1; }); });
    ['corruption', 'baneOfAgony', 'wrack'].forEach(function (k) { T.ok(!!kinds[k], k + ' cast rolls (no damage on landing)'); });
    var hits = procs.filter(function (e) { return e.type === 'hit'; }), coe = 1 + WL.SPELLS.curseOfElements.dmgTakenPct / 100;
    T.ok(hits.every(function (e) { return [112, 168, Math.round(112 * coe), Math.round(168 * coe)].indexOf(e.dmg) >= 0; }), 'each hit: 112, ×1.5 on a crit, Curse of the Elements on it');
    T.ok(procs.every(function (e) { return e.mana <= 104; }) && procs.some(function (e) { return e.mana === 104; }), '104 mana a proc (less only at full mana)');
    T.near(r.manaFromItems, procs.reduce(function (a, e) { return a + e.mana; }, 0), 1e-6, 'manaFromItems = the procs\' mana, resisted ones included');
    var none = WL.simulateOnce(sheet('wrack_ds'), 'human', det(), { seed: 5, duration: 120, log: true });
    T.ok(!none.bySpell['trinket:17780'] && !none.manaFromItems, 'without the Blade: no proc');

    T.group('the chance follows the cast time');
    var cs = wear(det()), obs = 0, exp = 0, flat = 0;
    for (var i = 0; i < 60; i++) {
      var f = WL.simulateOnce(sheet('demo_pact_succ_sb'), 'human', cs, { seed: 100 + i, duration: 180 });
      Object.keys(f.bySpell).forEach(function (k) {
        var b = f.bySpell[k];
        if (k === 'trinket:17780') { obs += b.casts; return; }
        var s = WL.SPELLS[k.replace(/^x\d:/, '')]; if (!s || k === 'lifeTap' || !b.landed) return;
        var ct = s.kind === 'channel' ? 0 : b.castTime / b.casts;
        exp += b.landed * 1.8 * Math.max(1.5, ct) / 60; flat += b.landed * 0.045;
      });
    }
    T.ok(Math.abs(obs - exp) < 0.15 * exp, 'Shadow Bolt build, 60 fights: ' + obs + ' procs, ' + exp.toFixed(0) + ' expected on cast time');
    T.ok(obs > flat * 1.15, '… clearly more than a flat 4.5% per landing would give (' + flat.toFixed(0) + ')');
    T.ok(WL.ITEM_FX[17780].about > 0, 'a rough worth for the gear builder\'s list: ' + WL.ITEM_FX[17780].about + ' spell power');
  });
})();
