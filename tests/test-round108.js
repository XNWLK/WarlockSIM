// Round 108 tests (user): Touch of the Grave (Undead) = 5% of your maximum health as Shadow damage. It scales with
// Stamina and with every Shadow damage % (Improved Shadow Bolt, Curse of the Elements, your Shadow auras, …), never
// with spell power, and it does not crit.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.combat.baseCritPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull';
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (f) f(c);
    return c;
  }
  function tb(rot, t, x) { var b = { key: 't108', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; if (x) Object.keys(x).forEach(function (k) { b[k] = x[k]; }); return b; }
  function run(b, c, dur) { return WL.simulateOnce(b, 'undead', c, { seed: 1, duration: dur || 40, log: true }); }
  function tog(r) { return r.log.filter(function (e) { return e.spell === 'touchOfTheGrave'; }); }
  function hp(b, c) { return WL.computeStats(b, 'undead', c).maxHealth; }

  T.run('round 108: Touch of the Grave scales with Stamina and Shadow damage %', function () {
    var rc = WL.RACES.undead.racials.filter(function (r) { return r.effect === 'proc'; })[0], keep = rc.chancePct;
    T.eq([rc.name, keep, rc.maxHealthPct].join('/'), 'Touch of the Grave/10/5', 'Touch of the Grave: 10% chance, 5% of maximum health');
    rc.chancePct = 100;                                  // every landed cast procs, so each hit can be checked (restored below)
    try {
      T.group('base, Stamina, spell power, crit');
      var c0 = det(), b0 = tb(['searingPain']), h0 = hp(b0, c0), base = Math.round(h0 * 0.05);
      var t0 = tog(run(b0, c0));
      T.ok(t0.length >= 10 && t0.every(function (e) { return e.dmg === base; }), 'no modifiers: every proc = 5% of ' + h0 + ' health = ' + base);
      var cS = det(function (c) { c.gear.sta += 100; }), hS = hp(b0, cS);
      T.ok(hS === h0 + 1000 && tog(run(b0, cS)).every(function (e) { return e.dmg === Math.round(hS * 0.05); }), '+100 Stamina = +1000 health: ' + Math.round(hS * 0.05) + ' per proc (+50)');
      var cP = det(function (c) { c.gear.sp += 500; c.gear.shadowSp += 300; });
      T.ok(tog(run(b0, cP)).every(function (e) { return e.dmg === base; }), '+500 spell power and +300 Shadow spell power: unchanged (' + base + ')');
      var cC = det(function (c) { c.gear.critPct = 100; });
      T.ok(tog(run(b0, cC)).every(function (e) { return e.dmg === base && !e.crit; }), '100% crit: it does not crit');

      T.group('Shadow damage %');
      var cE = det(function (c) { c.options.useCurseOfElements = true; }), tE = tog(run(tb(['curseOfElements', 'searingPain']), cE));
      T.ok(tE.length >= 10 && tE.every(function (e) { return e.dmg === Math.round(h0 * 0.05 * 1.10); }), 'Curse of the Elements on the boss: ×1.10 = ' + Math.round(h0 * 0.05 * 1.10));
      var bI = tb(['shadowBolt'], { improvedShadowBolt: 5 }), rI = run(bI, cC, 60), tI = tog(rI);
      var isbAt = rI.log.filter(function (e) { return e.type === 'debuff' && e.spell === 'isb'; })[0];
      var after = tI.filter(function (e) { return isbAt && e.t > isbAt.t + 1e-6 && e.t < isbAt.t + 11; });
      T.ok(isbAt && after.length >= 2 && after.every(function (e) { return e.dmg === Math.round(hp(bI, cC) * 0.05 * 1.20); }), 'Improved Shadow Bolt 5/5 on the boss: ×1.20 = ' + Math.round(hp(bI, cC) * 0.05 * 1.20) + ' (' + after.length + ' procs checked)');
      var bD = tb(['searingPain'], { demonicSacrifice: 1 }, { sacrifice: 'imp' }), tD = tog(run(bD, c0));
      T.ok(WL.computeStats(bD, 'undead', c0).mult.shadow === 1.15 && tD.every(function (e) { return e.dmg === Math.round(hp(bD, c0) * 0.05 * 1.15); }), 'Demonic Sacrifice (Imp, +15% Shadow): ×1.15 = ' + Math.round(hp(bD, c0) * 0.05 * 1.15));
      var bF = tb(['searingPain'], { demonicSacrifice: 1 }, { sacrifice: 'succubus' });
      T.ok(WL.computeStats(bF, 'undead', c0).mult.fire === 1.15 && tog(run(bF, c0)).every(function (e) { return e.dmg === Math.round(hp(bF, c0) * 0.05); }), 'Demonic Sacrifice (Succubus, +15% Fire): nothing — it is Shadow damage');
      var bM = tb(['searingPain'], { shadowMastery: 5, malediction: 5 });
      T.ok(tog(run(bM, c0)).every(function (e) { return e.dmg === Math.round(hp(bM, c0) * 0.05); }), 'Shadow Mastery / Malediction (modifiers of your own spells): nothing');
      var cPI = det(function (c) { c.buffs.powerInfusion.on = true; }), tP = tog(run(b0, cPI));
      T.ok(tP.some(function (e) { return e.t < 14 && e.dmg === Math.round(h0 * 0.05 * 1.20); }) && tP.some(function (e) { return e.t > 16 && e.dmg === base; }), 'Power Infusion (+20% damage for 15 s): ×1.20 while it is up, ' + base + ' after');

      T.group('extra targets use their own debuffs');
      // another Warlock keeps Curse of the Elements on the boss only; your DoTs also go on target 2, which has no curse
      var cX = det(function (c) { c.debuffs.coeOther.on = true; c.fight.targets = 2; c.fight.multiDot = true; });
      var rX = run(tb(['corruption', 'searingPain']), cX, 60), tx = tog(rX);
      var vals = {}; tx.forEach(function (e) { vals[e.dmg] = 1; });
      T.eq(Object.keys(vals).sort().join(','), [base, Math.round(h0 * 0.05 * 1.10)].join(','), 'two targets: ' + Math.round(h0 * 0.05 * 1.10) + ' on the boss (cursed), ' + base + ' on target 2 (not cursed)');
    } finally { rc.chancePct = keep; }
    T.eq(rc.chancePct, 10, 'proc chance restored');
  });
})();
