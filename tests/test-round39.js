// Round 39 tests: partial resists (A43) + level resistance, travel time (A65), Curse of the Elements and Improved Shadow
// Bolt per extra target (A61), default Stamina 160 / MP5 0 (A58).
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t, pet) { return { key: 't39', short: 't', name: 't', notes: '', talents: t || {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }; }
  function hits(r, sp) { return r.log.filter(function (e) { return e.type === 'hit' && e.spell === sp; }); }

  T.run('round 39: resists, travel time, CoE / ISB per target', function () {
    T.group('partial resists (boss resistance)');
    var base = WL.simulateOnce(tb(['shadowBolt']), 'human', det(), { seed: 2, duration: 600, log: true });
    var full = hits(base, 'shadowBolt')[0].dmg;
    var rr = WL.simulateOnce(tb(['shadowBolt']), 'human', det(function (c) { c.combat.targetResist.shadow = 25; }), { seed: 2, duration: 600, log: true });
    var h = hits(rr, 'shadowBolt');
    T.ok(h.every(function (e) { return [1, 0.75, 0.5, 0.25, 0].some(function (f) { return Math.abs(e.dmg - full * f) <= 1; }); }), 'every Shadow Bolt is resisted by 0 / 25 / 50 / 75 / 100% (' + h.length + ' hits)');
    var avg = h.reduce(function (s, e) { return s + e.dmg; }, 0) / h.length / full;
    T.near(avg, 1 - 0.75 * 25 / 300, 0.012, '25 resistance → average ' + (100 * avg).toFixed(2) + '% of full damage (expected 93.75%)');
    T.ok(h.some(function (e) { return e.resistPct === 25 && e.resistDmg > 0; }), 'the log marks partial resists ("−25% resisted")');
    var lr = WL.simulateOnce(tb(['shadowBolt']), 'human', det(function (c) { c.combat.levelResist.on = true; }), { seed: 2, duration: 600, log: true });
    var avgL = hits(lr, 'shadowBolt').reduce(function (s, e) { return s + e.dmg; }, 0) / hits(lr, 'shadowBolt').length / full;
    T.near(avgL, 1 - 0.75 * 24 / 300, 0.012, 'level resistance (+24) → ' + (100 * avgL).toFixed(2) + '% (expected 94%)');
    T.eq(WL.DEFAULT_CONFIG.combat.levelResist.on, false, 'level resistance is off by default (user)');
    var lp = WL.simulateOnce(tb(['shadowBolt']), 'human', det(function (c) { c.combat.levelResist.on = true; c.gear.pierce = 24; }), { seed: 2, duration: 100, log: true });
    T.ok(hits(lp, 'shadowBolt').every(function (e) { return Math.abs(e.dmg - full) <= 1; }), '24 Spell Pierce cancels the level resistance');
    var cc = WL.simulateOnce(tb(['curseOfElements', 'shadowBolt']), 'human', det(function (c) { c.combat.targetResist.shadow = 75; c.options.useCurseOfElements = true; }), { seed: 2, duration: 100, log: true });
    T.ok(hits(cc, 'shadowBolt').every(function (e) { return !e.resistPct; }), 'Curse of the Elements (−75) removes 75 resistance → no resists');

    T.group('travel time');
    var t0 = WL.simulateOnce(tb(['shadowBolt']), 'human', det(), { seed: 3, duration: 30, log: true });
    var t8 = WL.simulateOnce(tb(['shadowBolt']), 'human', det(function (c) { c.fight.travelMs = 800; }), { seed: 3, duration: 30, log: true });
    var c0 = t8.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; })[0], h8 = hits(t8, 'shadowBolt')[0], h0 = hits(t0, 'shadowBolt')[0];
    T.near(h0.t - c0.t, c0.castTime, 0.002, 'travel 0 (default): Shadow Bolt hits at the end of its cast');
    T.near(h8.t - c0.t, c0.castTime + 0.8, 0.002, 'travel 800 ms: it hits 0.8 s later (' + (h8.t - c0.t).toFixed(3) + ' s after the cast started)');
    T.eq(WL.DEFAULT_CONFIG.fight.travelMs, 0, 'default travel time 0 (user)');
    var casts8 = t8.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; }).length, casts0 = t0.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; }).length;
    T.eq(casts8, casts0, 'the caster is not delayed (same number of casts: ' + casts8 + ')');
    var imp = WL.simulateOnce(tb(['shadowBolt'], {}, 'imp'), 'human', det(function (c) { c.fight.travelMs = 500; }), { seed: 3, duration: 20, log: true });
    var fb = imp.log.filter(function (e) { return e.type === 'pet' && e.spell === 'pet:firebolt'; })[0];
    T.near(fb.t, 2.0 + 0.5, 0.002, "the Imp's first Firebolt lands at 2.0 s cast + 0.5 s travel");

    T.group('Curse of the Elements on the extra targets');
    var top = WL.BUILDS[0];
    var md = function (coe) { return det(function (c) { c.fight.targets = 3; c.fight.multiDot = true; c.options.useCurseOfElements = coe; }); };
    var on = WL.simulateOnce(top, 'human', md(true), { seed: 5, duration: 120, log: true }), off = WL.simulateOnce(top, 'human', md(false), { seed: 5, duration: 120, log: true });
    T.ok(['x2:curseOfElements', 'x3:curseOfElements'].every(function (k) { return on.log.some(function (e) { return e.type === 'debuff' && e.spell === k; }); }), 'multi-DoT puts your CoE on target 2 and 3');
    var tickAvg = function (r) { var t = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'x2:corruption' && !e.crit; }); return t.reduce(function (s, e) { return s + e.dmg; }, 0) / t.length; };
    T.near(tickAvg(on) / tickAvg(off), 1.10, 0.01, 'Corruption ticks on target 2 × 1.10 with your curse there (' + (tickAvg(on) / tickAvg(off)).toFixed(4) + ')');
    T.ok(on.uptime['deb2:coe'] > 100, 'CoE uptime on target 2 tracked (' + on.uptime['deb2:coe'].toFixed(1) + ' s)');

    T.group('Improved Shadow Bolt per target');
    var sb = JSON.parse(JSON.stringify(top)); sb.rotation = top.rotation.slice(0, -1).concat(['shadowBoltSpread', 'shadowBolt']);
    var crit = det(function (c) { c.fight.targets = 2; c.fight.multiDot = true; c.gear.critPct = 100; c.gear.critIncludesAll = true; });
    var r = WL.simulateOnce(sb, 'human', crit, { seed: 6, duration: 120, log: true });
    var spread = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'x2:shadowBolt'; });
    var isb2 = r.log.filter(function (e) { return e.type === 'debuff' && e.spell === 'x2:isb'; });
    T.ok(spread.length > 0 && isb2.length > 0, 'Shadow Bolt on target 2 (' + spread.length + '×) puts ISB on target 2 (' + isb2.length + '×)');
    var pct = WL.talentValue(sb, 'improvedShadowBolt', 'debuffPct');
    var ivs = r.auras['deb2:isb'] || [];
    var inIsb = function (t) { return ivs.some(function (iv) { return t > iv[0] + 1e-6 && t < iv[1] - 1e-6; }); };
    var ticks = r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'x2:corruption'; });
    var tin = ticks.filter(function (e) { return inIsb(e.t); }), tout = ticks.filter(function (e) { return !ivs.some(function (iv) { return e.t >= iv[0] - 1e-6 && e.t <= iv[1] + 1e-6; }); });
    var a = function (l) { return l.reduce(function (s, e) { return s + e.dmg; }, 0) / l.length; };
    T.ok(tin.length > 0 && tout.length > 0, 'target-2 Corruption ticks with (' + tin.length + ') and without (' + tout.length + ') ISB there');
    T.near(a(tin) / a(tout), 1 + pct / 100, 0.015, 'target-2 Shadow ticks × ' + (1 + pct / 100) + ' while ISB is on target 2 (' + (a(tin) / a(tout)).toFixed(4) + ')');
    var one = WL.simulateOnce(sb, 'human', det(function (c) { c.gear.critPct = 100; c.gear.critIncludesAll = true; }), { seed: 6, duration: 60, log: true });
    T.ok(!one.log.some(function (e) { return /^x\d:/.test(e.spell || ''); }), 'with 1 target the spread action never fires');
    var noIsb = JSON.parse(JSON.stringify(sb)); delete noIsb.talents.improvedShadowBolt; noIsb.talents.cataclysm = (noIsb.talents.cataclysm || 0);
    T.ok(WL.validateBuild(noIsb).some(function (e) { return /Improved Shadow Bolt/.test(e); }), 'the editor requires Improved Shadow Bolt for the spread action');
    // MISTAKES A20: multi-DoT must sit above the spread action, or target 3 never gets its DoTs.
    var three = det(function (c) { c.fight.targets = 3; c.fight.multiDot = true; });
    var eff = WL.effectiveRotation(sb, three);
    T.eq(eff.indexOf('multiDot') + 1, eff.indexOf('shadowBoltSpread'), 'multi-DoT is inserted right above the spread action');
    var r3 = WL.simulateOnce(sb, 'human', three, { seed: 6, duration: 120, log: true });
    T.ok(r3.log.some(function (e) { return e.type === 'cast' && /^x3:(corruption|immolate)$/.test(e.spell); }), 'with the spread action, target 3 still gets its DoTs');

    T.group('defaults (user, round 39)');
    T.eq([WL.SHIPPED_GEAR.sta, WL.SHIPPED_GEAR.mp5].join('/'), '160/0', 'Stamina 160, MP5 0');
  });
})();
