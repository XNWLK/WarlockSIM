// Round 119 tests (user, to-do review part 2): your health (Life Tap, Hellfire, rune and Sapper cost it; the healing
// setting, leeching spells and the Felhunter sacrifice restore it), Voidwalker / Felhunter sacrifices, threat with
// Blessing of Salvation and Tranquil Air Totem.
(function () {
  function det(mod) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.options.dotEndCheck = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (mod) mod(c);
    return c;
  }
  function tb(rot, talents, extra) {
    var b = { key: 't119', short: 't', name: 't', notes: '', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot };
    Object.keys(extra || {}).forEach(function (k) { b[k] = extra[k]; });
    return b;
  }
  function run(b, c, dur, seed) { return WL.simulateOnce(b, 'human', c, { seed: seed || 1, duration: dur || 60, log: true }); }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === k; }); }
  function near(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1e-6 : tol); }

  T.run('round 119: health, Voidwalker / Felhunter sacrifice, threat', function () {
    T.group('health: settings and Life Tap');
    T.eq(WL.DEFAULT_CONFIG.fight.healAmount + '/' + WL.DEFAULT_CONFIG.fight.healEvery, '1000/10', 'default: healed for 1000 every 10 s');
    T.eq(WL.SPELLS.lifeTap.healthCost, 430, 'Life Tap costs 430 health');
    var c1 = det(), b1 = tb(['shadowBolt']), r1 = run(b1, c1, 120), st1 = WL.computeStats(b1, 'human', c1), H = r1.health;
    T.ok(r1.lifeTaps >= 5, r1.lifeTaps + ' Life Taps in a 2-minute Shadow Bolt fight');
    T.eq(H.tap, 430 * r1.lifeTaps, 'health spent on them: 430 each = ' + H.tap);
    T.ok(near(st1.maxHealth - H.tap - H.self + H.healed + H.leech + H.sac, H.end), 'the books balance: ' + st1.maxHealth + ' − spent + healed = ' + H.end.toFixed(0) + ' at the end');
    var heals = r1.log.filter(function (e) { return e.type === 'heal'; });
    T.eq(heals.length, 11, 'a heal every 10 s: 11 in a 120 s fight (10 s … 110 s)');
    T.ok(near(heals[0].t, 10) && near(heals[10].t, 110), 'the first at 10 s, the last at 110 s');
    T.ok(H.healed <= 11 * 1000 + 1e-6 && heals.every(function (e) { return e.gain <= 1000; }) && heals.some(function (e) { return e.gain < 1000; }), 'healing stops at full health (' + H.healed.toFixed(0) + ' of 11,000 used)');
    T.eq(H.blocked, 0, 'with the default healing no Life Tap ever has to wait');

    T.group('health: without healing Life Tap runs out');
    var c0 = det(function (c) { c.fight.healAmount = 0; }), r0 = run(b1, c0, 300), maxTaps = Math.ceil(st1.maxHealth / 430) - 1;
    T.eq(r0.log.filter(function (e) { return e.type === 'heal'; }).length, 0, 'healing 0: no heals');
    T.eq(r0.lifeTaps, maxTaps, 'only ' + maxTaps + ' Life Taps fit into ' + st1.maxHealth + ' health (one more would kill you)');
    T.ok(r0.health.min > 0 && r0.health.min <= 430, 'health never reaches 0 (lowest: ' + r0.health.min + ')');
    T.ok(r0.health.blocked > 30, 'after that the fight is spent waiting: ' + r0.health.blocked.toFixed(0) + ' s without mana or health');
    var rr = run(b1, c1, 300);
    T.ok(rr.total > r0.total * 1.2, 'so healing is worth damage: ' + Math.round(rr.total) + ' vs ' + Math.round(r0.total) + ' without');
    // an optional Life Tap (a priority action) is skipped instead of waited for
    var bo = tb(['lifeTapBelow', 'shadowBolt'], {}, { params: { lifeTapBelow: { pct: 100, sec: 0 } } }), ro = run(bo, c0, 60);
    var lastTap = casts(ro, 'lifeTap').pop(), boltsAfter = casts(ro, 'shadowBolt').filter(function (e) { return e.t > lastTap.t; }).length;
    T.ok(boltsAfter >= 3, '"Life Tap below 100% mana" with no health left: skipped, ' + boltsAfter + ' Shadow Bolts are still cast with the mana that is there');

    T.group('health: leeching spells give it back');
    T.ok(WL.SPELLS.drainLife.leech === 1 && WL.SPELLS.siphonLife.leech === 1 && WL.SPELLS.deathCoil.leech === 1, 'Drain Life, Siphon Life and Death Coil return their damage as health');
    var rd = run(tb(['lifeTapBelow', 'drainLife'], {}, { params: { lifeTapBelow: { pct: 100, sec: 0 } } }), c0, 60);
    T.ok(rd.health.leech > 0 && rd.health.leech <= rd.bySpell.drainLife.dmg + 1e-6, 'Drain Life: ' + rd.health.leech.toFixed(0) + ' health back from ' + rd.bySpell.drainLife.dmg.toFixed(0) + ' damage (capped at full health)');
    T.ok(rd.lifeTaps > maxTaps, 'which pays for more Life Taps than the health bar alone: ' + rd.lifeTaps + ' > ' + maxTaps);

    T.group('health: Demonic Rune and Hellfire');
    var cr = det(function (c) { c.fight.healAmount = 0; c.consumables.demonicRune.on = true; }), rrn = run(b1, cr, 60);
    var runes = rrn.log.filter(function (e) { return e.type === 'consumable'; }).length;
    T.ok(runes === 1 && rrn.health.self === 800, 'a Demonic Rune costs 800 health (' + runes + ' used, ' + rrn.health.self + ' lost)');
    var ch = det(function (c) { c.fight.healAmount = 0; c.fight.targets = 3; }), bh = tb(['hellfire']), sth = WL.computeStats(bh, 'human', ch);
    var tickSelf = Math.round(206 + 0.022 * sth.sp), rh = run(bh, ch, 60);
    T.ok(WL.SPELLS.hellfire.selfDamage === true && !WL.SPELLS.rainOfFire.selfDamage, 'Hellfire burns you, Rain of Fire does not');
    T.eq(casts(rh, 'hellfire').length, 1, 'no healing: one Hellfire, then not enough health for another whole channel (' + sth.maxHealth + ' health, ' + (15 * tickSelf) + ' per channel)');
    T.eq(rh.health.self, 15 * tickSelf, 'it cost 15 ticks × ' + tickSelf + ' (206 + 2.2% of spell power, no talents) = ' + 15 * tickSelf);
    T.ok(rh.health.min > 0, 'you survive (' + rh.health.min + ' health left)');
    var chh = det(function (c) { c.fight.healAmount = 5000; c.fight.healEvery = 5; c.fight.targets = 3; }), rhh = run(bh, chh, 60);
    T.eq(casts(rhh, 'hellfire').length, 4, 'with plenty of healing: back to back, 4 channels in 60 s');
    var bt = tb(['hellfire']); bt.timeline = [{ t: 20, k: 'hellfire' }];
    var rt = run(bt, ch, 60), clip = rt.log.filter(function (e) { return e.type === 'clip' && e.for === 'health'; })[0];
    T.ok(clip && rt.health.min > 0 && rt.health.min <= tickSelf, 'a Hellfire forced by the fight timeline with too little health stops before the tick that would kill you (at ' + (clip ? clip.t.toFixed(0) : '?') + ' s, ' + rt.health.min + ' health left)');
    var rs = WL.simulate(WL.BUILDS[0], 'human', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { iterations: 50, log: false });
    T.ok(rs.health && rs.health.max > 3000 && rs.health.min > 0 && rs.health.tapAvg > 1000 && rs.health.blockedSecAvg === 0, 'a run reports health: max ' + rs.health.max.toFixed(0) + ', lowest ' + rs.health.min.toFixed(0) + ', ' + rs.health.tapAvg.toFixed(0) + ' spent on Life Tap per fight');

    T.group('Voidwalker and Felhunter sacrifice');
    var ds = { demonicSacrifice: 1 };
    ['voidwalker', 'felhunter'].forEach(function (k) {
      var full = JSON.parse(JSON.stringify(WL.BUILDS[0])); full.pet = null; full.sacrifice = k;
      full.rotation = full.rotation.filter(function (a) { return a !== 'searingPainBrand'; });
      T.ok(WL.validateBuild(full).every(function (e) { return !/sacrifice/i.test(e); }), k + ': accepted by the build editor');
    });
    T.ok(WL.validateBuild(tb(['shadowBolt'], {}, { sacrifice: 'doomguard' })).some(function (e) { return /Unknown sacrifice/.test(e); }), 'an unknown sacrifice is still refused');
    var sv = WL.computeStats(tb(['shadowBolt'], ds, { sacrifice: 'voidwalker' }), 'human', c1), sf = WL.computeStats(tb(['shadowBolt'], ds, { sacrifice: 'felhunter' }), 'human', c1);
    T.ok(sv.mult.shadow === 1 && sv.mult.fire === 1 && sf.mult.shadow === 1 && sf.mult.fire === 1 && sv.sacrificeActive, 'neither gives a damage bonus');
    var rv = run(tb(['shadowBolt'], ds, { sacrifice: 'voidwalker' }), c1, 60), rn = run(tb(['shadowBolt'], ds), c1, 60);
    T.ok(near(rv.manaFromSac, 14 * 0.02 * sv.maxMana), 'Voidwalker: 2% of maximum mana every 4 s = 14 ticks × ' + (0.02 * sv.maxMana).toFixed(0) + ' = ' + rv.manaFromSac.toFixed(0) + ' mana in 60 s');
    T.ok(rv.lifeTaps < rn.lifeTaps && rn.manaFromSac === 0, 'fewer Life Taps with it (' + rv.lifeTaps + ' vs ' + rn.lifeTaps + ')');
    var rf = run(tb(['shadowBolt'], ds, { sacrifice: 'felhunter' }), c0, 60);
    T.ok(rf.health.sac > 0 && rf.health.sac <= 14 * 0.03 * sf.maxHealth + 1e-6 && rn.health.sac === 0, 'Felhunter: 3% of maximum health every 4 s (' + rf.health.sac.toFixed(0) + ' health back in 60 s, without other healing)');
    var rp = run(tb(['shadowBolt'], { demonicSacrifice: 1 }, { sacrifice: 'voidwalker', pet: 'imp' }), c1, 60);
    T.eq(rp.manaFromSac, 0, 'with a pet out and no Demonic Pact the sacrifice is not active: nothing');

    T.group('threat');
    var t0 = run(tb(['shadowBolt']), c1, 60);
    T.ok(near(t0.threat, t0.total, 1e-6), 'plain Shadow Bolts: 1 threat per damage (' + Math.round(t0.threat) + ')');
    var t5 = run(tb(['shadowBolt'], { suppression: 5 }), c1, 60);
    T.ok(near(t5.threat / t5.total, 0.80, 1e-9), 'Suppression 5/5: −20% threat');
    var tp = run(tb(['searingPain']), c1, 60), tpb = run(tb(['searingPain'], { demonicBrand: 3 }), c1, 60);
    T.ok(near(tp.bySpell.searingPain.threat / tp.bySpell.searingPain.dmg, 2, 1e-9), 'Searing Pain: twice its damage ("a high amount of threat")');
    T.ok(near(tpb.bySpell.searingPain.threat / tpb.bySpell.searingPain.dmg, 1, 1e-9), 'with Demonic Brand 3/3 (−50%): back to 1 per damage');
    var B = WL.DEFAULT_CONFIG.buffs;
    T.ok(B.blessingOfSalvation.threatPct === 30 && B.tranquilAir.threatPct === 20 && !B.blessingOfSalvation.on && !B.tranquilAir.on, 'Blessing of Salvation −30%, Tranquil Air Totem −20%, both off by default');
    var ts = run(tb(['shadowBolt']), det(function (c) { c.buffs.blessingOfSalvation.on = true; }), 60);
    var tst = run(tb(['shadowBolt']), det(function (c) { c.buffs.blessingOfSalvation.on = true; c.buffs.tranquilAir.on = true; }), 60);
    T.ok(near(ts.threat / ts.total, 0.70, 1e-9) && near(ts.total, t0.total), 'Salvation: threat × 0.70, damage unchanged');
    T.ok(near(tst.threat / tst.total, 0.56, 1e-9), 'Salvation + Tranquil Air: × 0.70 × 0.80 = 0.56');
    var cpet = det(function (c) { c.options.includePetDamage = true; }), tpet = run(tb(['shadowBolt'], {}, { pet: 'imp' }), cpet, 60), petDmg = 0;
    Object.keys(tpet.bySpell).forEach(function (k) { if (k.indexOf('pet:') === 0) { petDmg += tpet.bySpell[k].dmg; if (tpet.bySpell[k].threat) petDmg = NaN; } });
    T.ok(petDmg > 0 && near(tpet.threat, tpet.total - petDmg, 1e-6), 'the pet\'s damage is its own threat: yours = your damage only (' + Math.round(tpet.threat) + ' of ' + Math.round(tpet.total) + ')');
    T.ok(rs.tps > 0 && rs.tps < rs.dps, 'a run reports threat per second (' + rs.tps.toFixed(1) + ' at ' + rs.dps.toFixed(1) + ' DPS)');
  });
})();
