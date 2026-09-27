// Round 14 tests: aura uptimes / intervals (W4, W5), DPS histogram (W6), cast-log GCD field (W5), Engineering explosives (W14).
(function () {
  function base() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    return c;
  }
  function det(c) {
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100;
    c.gear.critPct = 0; c.gear.hitPct = 0; c.gear.weaponIsSword = false; c.options.useCurseOfElements = true;
    return c;
  }
  function tb(rot, talents) { return { key: 't', name: 't', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function sum(l) { return (l || []).reduce(function (a, x) { return a + x[1] - x[0]; }, 0); }

  T.run('aura uptimes and intervals', function () {
    T.group('uptime seconds = sum of logged intervals; intervals inside the fight and non-overlapping');
    var c = det(base()), b = tb(['curseOfElements', 'corruption', 'shadowBolt']);
    var r = WL.simulateOnce(b, 'human', c, { seed: 11, duration: 120, log: true });
    T.ok(r.uptime.coe > 0 && r.uptime['dot:corruption'] > 0, 'CoE and Corruption tracked (' + r.uptime.coe.toFixed(2) + ' / ' + r.uptime['dot:corruption'].toFixed(2) + ' s)');
    Object.keys(r.uptime).forEach(function (k) {
      T.near(sum(r.auras[k]), r.uptime[k], 1e-6, k + ': intervals sum to the uptime');
      var ok = (r.auras[k] || []).every(function (x, i, l) { return x[0] >= -1e-9 && x[1] <= 120 + 1e-9 && x[1] > x[0] && (i === 0 || x[0] >= l[i - 1][1] - 1e-9); });
      T.ok(ok, k + ': intervals ordered, inside [0, 120]');
    });
    var coeHit = r.log.filter(function (e) { return e.type === 'debuff' && e.spell === 'curseOfElements'; })[0];
    T.near(r.uptime.coe, 120 - coeHit.t, 1e-6, 'CoE (300 s) is up from its landing (' + coeHit.t + ' s) to the end');
    // Corruption: every tick interval is covered — uptime = sum over applications of min(duration, time left)
    var applies = r.log.filter(function (e) { return e.type === 'apply' && e.spell === 'corruption'; }).map(function (e) { return e.t; });
    var expect = 0, D = WL.SPELLS.corruption.duration;
    applies.forEach(function (t, i) { var end = Math.min(t + D, i + 1 < applies.length ? applies[i + 1] : Infinity, 120); expect += end - t; });
    T.near(r.uptime['dot:corruption'], expect, 1e-6, 'Corruption uptime = applications × duration, cut at refresh/fight end (' + expect.toFixed(2) + ' s)');

    T.group('Eureka! charges and Power Infusion');
    var g = WL.simulateOnce(tb(['shadowBolt']), 'gnome', det(base()), { seed: 3, duration: 60, log: true });
    var casts = g.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; });
    // 3 charges, spent when casts #1, #2 and #3 start. Round 38: Eureka! is a live aura that lasts until the 3rd
    // empowered cast has been cast, i.e. lands (was: until it starts) → pop … casts[2].t + its cast time.
    T.near(g.uptime.eureka, casts[2].t + casts[2].castTime - casts[0].t, 1e-3, 'Eureka! active from the pop until the 3rd empowered cast lands (' + g.uptime.eureka.toFixed(2) + ' s)');
    var cp = det(base()); cp.buffs.powerInfusion.on = true;
    var p = WL.simulateOnce(tb(['shadowBolt']), 'human', cp, { seed: 3, duration: 200, log: true });
    T.near(p.uptime.powerInfusion, 15 + 15, 1e-9, 'Power Infusion 15 s at 0 s and at 180 s in a 200 s fight');

    T.group('Monte-Carlo aggregates');
    var c2 = det(base()); c2.fight.iterations = 60;
    var m = WL.simulate(tb(['curseOfElements', 'corruption', 'shadowBolt']), 'human', c2);
    T.ok(Object.keys(m.uptimePct).every(function (k) { return m.uptimePct[k] >= 0 && m.uptimePct[k] <= 100 + 1e-9; }), 'uptime % within 0–100');
    T.ok(m.uptimePct.coe > 95, 'CoE uptime ' + m.uptimePct.coe.toFixed(1) + '% (> 95%)');
    T.eq(m.dpsHist.counts.reduce(function (a, x) { return a + x; }, 0), 60, 'histogram holds every fight');
    T.ok(m.dpsHist.min <= m.dps && m.dps <= m.dpsHist.max && m.dpsHist.counts.length === 24, 'histogram range contains the mean, 24 bins');

    T.group('cast log carries the GCD (timeline)');
    T.ok(r.log.filter(function (e) { return e.type === 'cast'; }).every(function (e) { return e.gcd > 0; }), 'every cast entry has gcd > 0');
  });

  T.run('settings code (W8)', function () {
    T.group('encode → decode → apply restores every setting the UI can change');
    var a = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    a.gear.sp = 612; a.gear.critPct = 12.5; a.fight.duration = 240; a.fight.seed = 99; a.options.useCurseOfElements = false;
    a.buffs.arcaneIntellect.on = true; a.debuffs.sunderArmor.on = false; a.consumables.elixirOwl.on = true; a.consumables.buildOil.on = false;
    a.consumables.denseDynamite.on = true; a.professions.engineering = true; a.petSpPct = 55; a.pets.succubus.melee.apPerSp = 1.2; a.combat.bossArmor = 4000;
    var code = WL.encodeSettings(a);
    T.ok(code.indexOf('WFS1:') === 0 && /^[A-Za-z0-9+\/=:WFS]+$/.test(code), 'code = WFS1: + base64 (' + code.length + ' chars)');
    var b = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), unknown = WL.applySettings(b, WL.decodeSettings(code));
    T.eq(unknown.length, 0, 'nothing unknown');
    T.eq(JSON.stringify(WL.settingsSnapshot(b)), JSON.stringify(WL.settingsSnapshot(a)), 'snapshot identical after the round trip');
    T.ok(b.consumables.elixirOwl.on && !b.consumables.buildOil.on && b.professions.engineering && !b.debuffs.sunderArmor.on, 'on/off lists restored');
    T.eq(WL.simulate(WL.BUILDS[0], 'gnome', b, { iterations: 20, log: false }).dps.toFixed(6), WL.simulate(WL.BUILDS[0], 'gnome', a, { iterations: 20, log: false }).dps.toFixed(6), 'same DPS from the loaded settings');
    T.group('bad input');
    var err1 = '', err2 = '';
    try { WL.decodeSettings('hello'); } catch (e) { err1 = e.message; }
    try { WL.decodeSettings('WFS1:@@@'); } catch (e) { err2 = e.message; }
    T.ok(/must start/.test(err1), 'wrong prefix rejected: ' + err1);
    T.ok(/damaged/.test(err2), 'broken base64 rejected: ' + err2);
    var o = WL.decodeSettings(code); o.cons.push('notAnItem'); o.gear.madeUp = 1;
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    T.eq(WL.applySettings(c, o).join(','), 'gear.madeUp,cons.notAnItem', 'unknown names reported, not applied');
    T.ok(/612 SP/.test(WL.describeSettings(o)) && /Engineering/.test(WL.describeSettings(o)), 'summary: ' + WL.describeSettings(o));
  });

  T.run('Engineering explosives (W14)', function () {
    T.group('requires the Engineering profession; shared / own cooldowns; fixed damage');
    var c = det(base()); c.options.useCurseOfElements = false;
    c.consumables.denseDynamite.on = true; c.consumables.goblinSapper.on = true;
    var off = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { seed: 5, duration: 130, log: true });
    T.ok(!off.bySpell['item:denseDynamite'] && !off.bySpell['item:goblinSapper'], 'without Engineering nothing is thrown');
    c.professions.engineering = true;
    var on = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { seed: 5, duration: 130, log: true });
    var dyn = on.log.filter(function (e) { return e.type === 'cast' && e.spell === 'item:denseDynamite'; }).map(function (e) { return e.t; });
    var sap = on.log.filter(function (e) { return e.type === 'cast' && e.spell === 'item:goblinSapper'; }).map(function (e) { return e.t; });
    T.eq(sap.join(','), '0', 'Sapper once (5 min cooldown) at the pull');
    T.eq(dyn.length, 3, 'Dense Dynamite 3× in 130 s (' + dyn.join(', ') + ')');
    T.ok(dyn[1] - dyn[0] >= 60 - 1e-9 && dyn[2] - dyn[1] >= 60 - 1e-9, 'Dynamite cooldown ≥ 60 s');
    T.near(dyn[0], 1.0, 1e-9, 'second item waits for the 1 s item GCD after the Sapper');
    var hits = on.log.filter(function (e) { return e.type === 'hit' && e.spell === 'item:denseDynamite'; });
    T.ok(hits.every(function (e) { return e.dmg >= 340 && e.dmg <= 460; }), 'Dynamite damage 340–460 (no spell power, 0% crit): ' + hits.map(function (e) { return e.dmg; }).join(', '));
    var firstSB = on.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; })[0];
    T.near(firstSB.t, 2.0, 1e-9, 'first Shadow Bolt after two 1 s item GCDs');
    T.ok(on.dps > off.dps, 'explosives add DPS (' + on.dps.toFixed(1) + ' vs ' + off.dps.toFixed(1) + ')');
    var stat = WL.computeStats(tb([]), 'human', c);
    T.near(stat.sp, WL.computeStats(tb([]), 'human', det(base())).sp, 1e-9, 'explosives do not change static stats');
    T.ok(!!WL.ICONS.consumable_denseDynamite && !!WL.ICONS.consumable_goblinSapper, 'explosive icons embedded');
  });
})();
