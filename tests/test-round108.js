// Round 108 tests (user): Touch of the Grave (Undead) = 5% of your maximum health as Shadow damage. It scales with
// Stamina, never with spell power, and it does not crit. Round 149 (patch 2026-10-16): 30% chance with a 25 s cooldown, and
// it no longer scales with any Shadow damage % (rounds 108–148: Improved Shadow Bolt, Curse of the Elements, your Shadow
// auras, Power Infusion, … multiplied it).
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.combat.baseCritPct = 0; c.gear.critPct -= 2;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
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

  T.run('round 108: Touch of the Grave scales with Stamina, nothing else', function () {
    var rc = WL.RACES.undead.racials.filter(function (r) { return r.effect === 'proc'; })[0], keep = rc.chancePct, keepCd = rc.icd;
    T.eq([rc.name, keep, rc.icd, rc.maxHealthPct].join('/'), 'Touch of the Grave/30/15/5', 'Touch of the Grave: 30% chance, 15 s cooldown (round 164), 5% of maximum health');
    rc.chancePct = 100; rc.icd = 0;                      // every landed cast procs, so each hit can be checked (restored below)
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

      T.group('no Shadow damage % any more (patch 2026-10-16)');
      var cE = det(function (c) { c.options.useCurseOfElements = true; }), tE = tog(run(tb(['curseOfElements', 'searingPain']), cE));
      T.ok(tE.length >= 10 && tE.every(function (e) { return e.dmg === base; }), 'Curse of the Elements on the boss: unchanged (' + base + ')');
      var bI = tb(['shadowBolt'], { improvedShadowBolt: 5 }), rI = run(bI, cC, 60), tI = tog(rI), hI = Math.round(hp(bI, cC) * 0.05);
      var isbAt = rI.log.filter(function (e) { return e.type === 'debuff' && e.spell === 'isb'; })[0];
      var after = tI.filter(function (e) { return isbAt && e.t > isbAt.t + 1e-6 && e.t < isbAt.t + 11; });
      T.ok(isbAt && after.length >= 2 && after.every(function (e) { return e.dmg === hI; }), 'Improved Shadow Bolt 5/5 on the boss: unchanged (' + after.length + ' procs checked)');
      var bD = tb(['searingPain'], { demonicSacrifice: 1 }, { sacrifice: 'imp' }), tD = tog(run(bD, c0));
      T.ok(WL.computeStats(bD, 'undead', c0).mult.shadow === 1.15 && tD.every(function (e) { return e.dmg === Math.round(hp(bD, c0) * 0.05); }), 'Demonic Sacrifice (Imp, +15% Shadow): unchanged');
      var bM = tb(['searingPain'], { shadowMastery: 5 });
      T.ok(tog(run(bM, c0)).every(function (e) { return e.dmg === Math.round(hp(bM, c0) * 0.05); }), 'Shadow Mastery: unchanged');
      var cPI = det(function (c) { c.buffs.powerInfusion.on = true; }), tP = tog(run(b0, cPI));
      T.ok(tP.some(function (e) { return e.t < 14; }) && tP.every(function (e) { return e.dmg === base; }), 'Power Infusion: unchanged, also while it is up');

      T.group('extra targets: the same value everywhere');
      var cX = det(function (c) { c.debuffs.coeOther.on = true; c.fight.targets = 2; c.fight.multiDot = true; });
      var rX = run(tb(['corruption', 'searingPain']), cX, 60), tx = tog(rX);
      T.ok(tx.length > 5 && tx.every(function (e) { return e.dmg === base; }), 'two targets, the boss cursed: ' + base + ' on both');
    } finally { rc.chancePct = keep; rc.icd = keepCd; }
    T.eq([rc.chancePct, rc.icd].join('/'), '30/15', 'proc chance and cooldown restored (15 s since round 164)');
  });
})();
