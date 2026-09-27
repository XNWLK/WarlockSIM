// Round 8 tests: raid buffs and boss debuffs.
(function () {
  function base() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    return c;
  }
  function det(c) {
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100;
    c.gear.critPct = 0; c.gear.hitPct = 0; c.gear.weaponIsSword = false; c.options.useCurseOfElements = false;
    return c;
  }
  function tb(rot) { return { key: 't', name: 't', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }

  T.run('buff stats', function () {
    T.group('raid buffs → stats (Human, no talents: Int 310, Spi (115+80)×1.05, Sta 265)');
    var c = base(), b = tb(['shadowBolt']);
    var s0 = WL.computeStats(b, 'human', c);
    c.buffs.markOfTheWild.on = true;
    var s1 = WL.computeStats(b, 'human', c);
    T.near(s1.int - s0.int, 16, 1e-9, 'Mark of the Wild +16 Int');
    T.near(s1.sta - s0.sta, 16, 1e-9, 'Mark of the Wild +16 Sta');
    T.near(s1.spi - s0.spi, 16 * 1.05, 1e-9, 'Mark of the Wild +16 Spi (× Human Spirit 1.05)');
    T.near(s1.critPct - s0.critPct, 16 / 60, 1e-9, '+16 Int above the sheet → +0.267% crit');
    var c2 = base(); c2.buffs.blessingOfKings.on = true;
    var s2 = WL.computeStats(b, 'human', c2);
    T.near(s2.int, 310 * 1.1, 1e-9, 'Kings: Int × 1.10');
    T.near(s2.spi, 195 * 1.05 * 1.1, 1e-9, 'Kings: Spi × 1.05 × 1.10');
    T.near(s2.sta, 265 * 1.1, 1e-9, 'Kings: Sta × 1.10');
    T.near(s2.critPct - s0.critPct, 31 / 60, 1e-9, 'Kings: extra 31 Int → +0.517% crit');
    var c3 = base(); c3.buffs.moonkinAura.on = true;
    T.near(WL.computeStats(b, 'human', c3).critPct - s0.critPct, 3, 1e-9, 'Moonkin aura +3% crit');
    var c4 = base(); c4.buffs.blessingOfWisdom.on = true; c4.buffs.manaSpring.on = true; c4.buffs.restorativeTotems.on = true;
    T.near(WL.computeStats(b, 'human', c4).mp5, 40 + 25 + 6.25, 1e-9, 'MP5 = Wisdom 40 + Mana Spring 25 + Restorative 6.25');
    var c5 = base(); c5.buffs.restorativeTotems.on = true;
    T.near(WL.computeStats(b, 'human', c5).mp5, 0, 1e-9, 'Restorative Totems alone (no Mana Spring) gives nothing');
    var c6 = base(); c6.buffs.fortitude.on = true;
    T.near(WL.computeStats(b, 'human', c6).maxHealth - s0.maxHealth, 700, 1e-9, 'Fortitude +70 Sta = +700 health');
  });

  T.run('armor', function () {
    T.group('boss armor & pet melee reduction [A54]');
    var c = base();
    T.eq(WL.bossArmor(c), 3731 - 2250 - 505, 'default Sunder ×5 + Faerie Fire → 976');
    T.near(WL.armorReduction(c), 976 / (976 + 5500), 1e-12, 'reduction = 976 / (976 + 400 + 85×60) = 15.1%');
    c.debuffs.exposeArmor.on = true;
    T.eq(WL.bossArmor(c), 976, 'Expose Armor does not stack with Sunder Armor');
    c.debuffs.curseOfRecklessness.on = true;
    T.eq(WL.bossArmor(c), 471, '+ Curse of Recklessness −505 → 471');
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    T.near(WL.armorReduction(c), 3731 / 9231, 1e-12, 'no debuffs → 40.4%');
    var cs = det(base()); cs.fight.duration = 60;
    var b = tb(['shadowBolt']); b.pet = 'succubus';
    var r0 = WL.simulateOnce(b, 'human', cs, {});
    Object.keys(cs.debuffs).forEach(function (k) { cs.debuffs[k].on = false; });
    var r1 = WL.simulateOnce(b, 'human', cs, {});
    var per0 = r0.bySpell['pet:melee'].dmg / r0.bySpell['pet:melee'].landed, per1 = r1.bySpell['pet:melee'].dmg / r1.bySpell['pet:melee'].landed;
    T.near(per0 / per1, (1 - 976 / 6476) / (1 - 3731 / 9231), 0.03, 'Succubus melee hits harder with the armor debuffs (ratio of (1 − reduction))');
  });

  T.run('coe other', function () {
    T.group('Curse of the Elements from another Warlock');
    var c = det(base()); c.fight.duration = 30; c.options.useCurseOfElements = true; c.debuffs.coeOther.on = true;
    var r = WL.simulateOnce(tb(['curseOfElements', 'shadowBolt']), 'human', c, { log: true });
    T.ok(!r.bySpell.curseOfElements, 'we never cast it (no GCD spent)', JSON.stringify(r.bySpell.curseOfElements));
    var sb = r.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; }).map(function (e) { return e.dmg; });
    T.eq(sb[0], Math.round((251 + 0.857 * 700) * 1.10), 'first Shadow Bolt already has +10% magic damage taken');   // SB R9 (round 42)
  });

  T.run('power infusion', function () {
    T.group('Power Infusion (+20% spell damage for 15 s at the pull)');
    var c = det(base()); c.fight.duration = 30; c.buffs.powerInfusion.on = true;
    var r = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { log: true });
    var sb = 251 + 0.857 * 700;                                         // SB R9 (round 42)
    var hits = r.log.filter(function (e) { return e.type === 'hit'; });
    T.ok(hits.filter(function (e) { return e.t < 15; }).every(function (e) { return e.dmg === Math.round(sb * 1.2); }), 'hits before 15 s ×1.20', '');
    T.ok(hits.filter(function (e) { return e.t >= 15; }).every(function (e) { return e.dmg === Math.round(sb); }), 'hits after 15 s normal', '');
  });

  T.run('fight length variation', function () {
    T.group('fight length variation [A56]');
    var c = base(); c.fight.iterations = 300;
    var b = WL.TEST_BUILDS[4];
    var r = WL.simulate(b, 'orc', c, { log: false });
    T.near(r.avgDuration, 180, 3, 'average fight length ≈ 180 s with ±10% variation (' + r.avgDuration.toFixed(2) + ')');
    var r2 = WL.simulate(b, 'orc', c, { log: false });
    T.eq(r.dps, r2.dps, 'same seed → same fight lengths → identical DPS');
    var lens = [];
    for (var i = 0; i < 200; i++) {
      var fs = (c.fight.seed * 7919 + i) >>> 0;
      lens.push(180 * (1 + 0.1 * (2 * WL.makeRng(fs ^ 0x5bd1e995)() - 1)));
    }
    T.ok(Math.min.apply(null, lens) >= 162 && Math.max.apply(null, lens) <= 198, 'every fight between 162 and 198 s', Math.min.apply(null, lens) + '–' + Math.max.apply(null, lens));
    c.fight.durationVarPct = 0;
    T.eq(WL.simulate(b, 'orc', c, { log: false }).avgDuration, 180, 'variation 0 → exactly 180 s');
  });

  T.run('icons', function () {
    T.group('icons & ids present (data/icons.js generated by tools/gen-icons.ps1)');
    var c = WL.DEFAULT_CONFIG;
    Object.keys(c.buffs).forEach(function (k) {
      T.ok(c.buffs[k].id > 0 && /^data:image\/jpeg;base64,/.test(WL.ICONS['buff_' + k] || ''), 'buff ' + k + ': Wowhead id + icon', c.buffs[k].id);
    });
    Object.keys(c.debuffs).forEach(function (k) {
      T.ok(c.debuffs[k].id > 0 && /^data:image\/jpeg;base64,/.test(WL.ICONS['debuff_' + k] || ''), 'debuff ' + k + ': Wowhead id + icon', c.debuffs[k].id);
    });
    WL.TALENTS.forEach(function (t) { T.ok(!!WL.ICONS['talent_' + t.key], 'talent icon ' + t.key, ''); });
    WL.RACE_KEYS.forEach(function (r) { T.ok(!!WL.ICONS['race_' + r], 'race icon ' + r, ''); });
  });

  T.run('mana buffs', function () {
    T.group('Mana Tide Totem & Innervate (once, when mana < 50%)');
    var c = det(base()); c.fight.duration = 120; c.gear.int = 0; c.buffs.manaTide.on = true;
    var r = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { log: true });
    var tide = r.log.filter(function (e) { return e.type === 'mana' && e.spell === c.buffs.manaTide.name; });
    T.eq(tide.length, 4, '4 Mana Tide ticks (every 3 s for 12 s)');
    T.ok(tide.every(function (e) { return e.gain === 290; }), 'each tick +290 mana', tide.map(function (e) { return e.gain; }).join(','));
    var trig = r.log.filter(function (e) { return e.type === 'buff' && e.spell === c.buffs.manaTide.name; })[0];
    T.ok(trig && trig.mana < 0.5 * 2743 + 1, 'triggered below 50% mana', JSON.stringify(trig));
    var c2 = det(base()); c2.fight.duration = 120; c2.gear.int = 0; c2.buffs.innervate.on = true;
    var r2 = WL.simulateOnce(tb(['shadowBolt']), 'human', c2, { log: true });
    var inn = r2.log.filter(function (e) { return e.type === 'mana'; });
    var spi = WL.computeStats(tb(['shadowBolt']), 'human', c2).spi;
    T.eq(inn.length, 10, 'Innervate: 10 ticks over 20 s');
    T.eq(inn[0].gain, Math.round((8 + spi / 4) * 5), 'each tick = 5 × (8 + Spirit/4) = ' + Math.round((8 + spi / 4) * 5));
    T.ok(r2.lifeTaps < WL.simulateOnce(tb(['shadowBolt']), 'human', det(base()), {}).lifeTaps + 100, 'runs', '');
  });
})();
