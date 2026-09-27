// Round 20 tests: encounter options (W11: latency, movement, second target with Bane of Havoc) and mana summary (W3).
(function () {
  function base() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.critPct = 0; c.gear.hitPct = 0; c.gear.weaponIsSword = false;
    c.options.useCurseOfElements = false;
    return c;
  }
  function tb(rot, talents) { return { key: 't', name: 't', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && (!k || e.spell === k); }); }

  T.run('encounter options (W11)', function () {
    T.group('latency: every action starts later by the reaction delay');
    var c = base(); c.gear.int = 2000;           // plenty of mana: no Life Tap in 30 s
    var r0 = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { seed: 1, duration: 30, log: true });
    c.fight.latencyMs = 100;
    var r1 = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { seed: 1, duration: 30, log: true });
    T.eq(casts(r0, 'shadowBolt').slice(0, 4).map(function (e) { return e.t; }).join(','), '0,3,6,9', 'no latency: 0, 3, 6, 9 s');
    T.eq(casts(r1, 'shadowBolt').slice(0, 4).map(function (e) { return e.t; }).join(','), '0,3.1,6.2,9.3', '100 ms latency: 0, 3.1, 6.2, 9.3 s');
    T.ok(r1.dps < r0.dps, 'latency lowers DPS (' + r1.dps.toFixed(1) + ' < ' + r0.dps.toFixed(1) + ')');

    T.group('movement: only instants while moving, no cast runs into a movement phase');
    var m = base(); m.gear.int = 2000; m.fight.moveEvery = 20; m.fight.moveDuration = 5;
    var rm = WL.simulateOnce(tb(['baneOfAgony', 'shadowBolt'].map(function (x) { return x === 'baneOfAgony' ? 'bane' : x; })), 'human', m, { seed: 2, duration: 100, log: true });
    var bad = casts(rm).filter(function (e) {
      var len = e.castTime || 0, k = Math.floor(e.t / 20), inMove = k >= 1 && e.t - k * 20 < 5 - 1e-9;
      var next = (Math.floor(e.t / 20) + 1) * 20;
      return (len > 1e-9 && inMove) || (len > 1e-9 && e.t + len > next + 1e-6);
    });
    T.eq(bad.length, 0, 'no cast-time spell starts while moving or overlaps the next movement phase');
    var movingInstants = casts(rm).filter(function (e) { var k = Math.floor(e.t / 20); return k >= 1 && e.t - k * 20 < 5 - 1e-9; });
    T.ok(movingInstants.every(function (e) { return !(e.castTime > 1e-9); }), 'everything cast while moving is instant (' + movingInstants.length + ' casts)');
    var rs = WL.simulateOnce(tb(['bane', 'shadowBolt']), 'human', (function () { var s = base(); s.gear.int = 2000; return s; })(), { seed: 2, duration: 100, log: true });
    T.ok(rm.dps < rs.dps && rm.idle > 0, 'movement costs DPS (' + rm.dps.toFixed(1) + ' vs ' + rs.dps.toFixed(1) + ') and leaves idle time (' + rm.idle.toFixed(1) + ' s)');

    T.group('second target: Bane of Havoc copies 15% of the Warlock\'s damage (not the pet\'s)');
    var hb = WL.BUILDS.filter(function (b) { return b.talents.baneOfHavoc; })[0];
    var h1 = base(); var h2 = base(); h2.fight.targets = 2;
    var a1 = WL.simulateOnce(hb, 'human', h1, { seed: 3, duration: 120, log: true });
    var a2 = WL.simulateOnce(hb, 'human', h2, { seed: 3, duration: 120, log: true });
    var hv = a2.bySpell.baneOfHavoc, own = Object.keys(a2.bySpell).filter(function (k) { return k.indexOf('pet:') !== 0 && k !== 'baneOfHavoc'; })
      .reduce(function (s, k) { return s + a2.bySpell[k].dmg; }, 0);
    T.ok(!!hv, 'Havoc damage line exists (' + hb.short + ')');
    T.near(hv.dmg, 0.15 * own, 1e-6, 'Havoc damage = 15% of the Warlock\'s own damage');
    T.eq(casts(a2, 'baneOfHavoc').map(function (e) { return e.t; }).join(','), '0', 'Bane of Havoc cast once, at the pull');
    T.eq(casts(a2).filter(function (e) { return e.spell !== 'baneOfHavoc'; })[0].t, 0, 'off the GCD: the first rotation spell also starts at 0 s');
    T.ok(a2.dps > a1.dps, '2 targets raise DPS (' + a2.dps.toFixed(1) + ' vs ' + a1.dps.toFixed(1) + ')');
    var nb = WL.BUILDS.filter(function (b) { return !b.talents.baneOfHavoc; })[0];
    T.near(WL.simulateOnce(nb, 'human', h2, { seed: 3, duration: 120 }).dps, WL.simulateOnce(nb, 'human', h1, { seed: 3, duration: 120 }).dps, 1e-9, 'builds without Bane of Havoc: 2 targets change nothing');
    T.ok(!!(WL.SPELL_TEXT || {})[1225228] && !!WL.ICONS.baneOfHavoc, 'Bane of Havoc tooltip and icon generated');
  });

  T.run('custom builds (W7)', function () {
    T.group('validator: every shipped build is legal, every rule catches its case');
    WL.BUILDS.filter(function (b) { return !b.custom; }).forEach(function (b) { T.eq(WL.validateBuild(b).join(' | '), '', b.short + ' is legal'); });
    var ok = JSON.parse(JSON.stringify(WL.BUILDS[0]));
    function errs(mod) { var b = JSON.parse(JSON.stringify(ok)); mod(b); return WL.validateBuild(b).join(' | '); }
    T.ok(/exactly 51/.test(errs(function (b) { b.talents.suppression = 2; })), '52 points rejected');
    T.ok(/max 3/.test(errs(function (b) { b.talents.cataclysm = 4; b.talents.improvedShadowBolt = 1; })), 'rank above max rejected');
    T.ok(/needs 10 points/.test(errs(function (b) { delete b.talents.cataclysm; delete b.talents.improvedShadowBolt; b.talents.suppression = 5; b.talents.improvedCorruption = 1; b.talents.improvedLifeTap = 2; })), 'row gate enforced (Ruin without 10 points above)');
    T.ok(/cannot be the one you keep out/.test(errs(function (b) { b.pet = 'imp'; b.sacrifice = 'imp'; })), 'sacrificed demon kept out rejected (Demonic Pact rule)');
    T.ok(/needs Demonic Pact/.test(errs(function (b) { delete b.talents.demonicPact; b.talents.soulLink = 1; b.talents.masterDemonologist = 5; b.talents.suppression = 2; })), 'pet + sacrifice without Pact rejected');
    T.ok(/move the filler to the end/.test(errs(function (b) { b.rotation = ['shadowBolt', 'corruption']; })), 'actions after the filler flagged');
    T.ok(/needs the Conflagrate talent/.test(errs(function (b) { b.rotation = ['conflagrate', 'shadowBolt']; })), 'talent-gated action without the talent flagged');
    T.group('build code round trip');
    var code = WL.encodeBuild(ok), back = WL.decodeBuild(code);
    T.ok(code.indexOf('WFB1:') === 0, 'code starts with WFB1:');
    T.eq(JSON.stringify([back.talents, back.pet, back.sacrifice, back.oil, back.rotation]), JSON.stringify([ok.talents, ok.pet, ok.sacrifice, ok.oil, ok.rotation]), 'talents, pets, oil and priority survive');
    var e1 = ''; try { WL.decodeBuild('WFS1:abc'); } catch (e) { e1 = e.message; }
    T.ok(/must start with WFB1/.test(e1), 'a settings code is not accepted as a build code');
    var sim = JSON.parse(JSON.stringify(back)); sim.key = 'custom_test'; sim.custom = true;
    T.near(WL.simulate(sim, 'gnome', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { iterations: 20, log: false }).dps,
           WL.simulate(ok, 'gnome', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { iterations: 20, log: false }).dps, 1e-9, 'a decoded build simulates identically');
  });

  T.run('Spell Pierce marker in the log (round 25)', function () {
    T.group('each damage entry carries the vulnerable step and the vulnerable share of its damage');
    var c = base(); c.gear.pierce = 20; c.options.useCurseOfElements = true;
    var r = WL.simulateOnce(tb(['curseOfElements', 'corruption', 'shadowBolt']), 'human', c, { seed: 9, duration: 120, log: true });
    var dmgRows = r.log.filter(function (e) { return (e.type === 'hit' || e.type === 'tick') && e.spell !== 'touchOfTheGrave'; });
    var marked = dmgRows.filter(function (e) { return e.vulnPct; });
    T.ok(marked.length > 0 && marked.length < dmgRows.length, marked.length + ' of ' + dmgRows.length + ' damage entries have vulnerable damage');
    T.ok(marked.every(function (e) { return e.vulnPct % 10 === 0 && e.vulnDmg === Math.round(e.dmg * e.vulnPct / (100 + e.vulnPct)) || Math.abs(e.vulnDmg - e.dmg * e.vulnPct / (100 + e.vulnPct)) <= 1; }),
      'steps are multiples of 10% and vulnerable damage = damage × pct / (100 + pct)');
    var hits = Object.keys(r.vulnHits).filter(function (k) { return +k > 0; }).reduce(function (s, k) { return s + r.vulnHits[k]; }, 0);
    T.eq(marked.length, hits, 'marked entries = vulnerable rolls counted by the engine');
    var c0 = base(); c0.options.useCurseOfElements = true;
    var r0 = WL.simulateOnce(tb(['curseOfElements', 'corruption', 'shadowBolt']), 'human', c0, { seed: 9, duration: 120, log: true });
    T.ok(r0.log.every(function (e) { return !e.vulnPct; }), 'no Spell Pierce → no markers');
  });

  T.run('Shadowburn to keep Shadow and Flame up (round 25)', function () {
    T.group('only cast when the Fire buff is missing or has ≤ 3 s left');
    var b = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.rotation.indexOf('shadowburn') >= 0; })[0]));
    b.rotation = b.rotation.map(function (a) { return a === 'shadowburn' ? 'shadowburnSnF' : a; });
    var r = WL.simulateOnce(b, 'human', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { seed: 4, duration: 180, log: true });
    // Only Shadowburn applies the Fire buff (20 s), so after a Shadowburn that hits, the next one may come ≥ 17 s later.
    // (The logged aura intervals merge refreshes, so "time left" cannot be read from them — first version of this test did.)
    var sb = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowburn'; }).map(function (e) { return e.t; });
    var missed = r.log.filter(function (e) { return e.type === 'miss' && e.spell === 'shadowburn'; }).map(function (e) { return e.t; });
    var gaps = sb.slice(1).map(function (t, i) { return { gap: t - sb[i], prevHit: missed.indexOf(sb[i]) < 0 }; });
    var ok = gaps.every(function (g) { return !g.prevHit || g.gap >= 17 - 1e-6; });
    T.ok(sb.length > 1 && ok, sb.length + ' Shadowburns; gaps after a hit all ≥ 17 s (' + gaps.map(function (g) { return g.gap; }).join(', ') + ')');
    T.eq(WL.validateBuild(b).join(' | '), '', 'the variant is a legal build in the editor');
    var nb = JSON.parse(JSON.stringify(b)); delete nb.talents.shadowAndFlame; nb.talents.fireAndBrimstone = 3; nb.talents.aftermath = (nb.talents.aftermath || 0) + 2;
    T.ok(/needs the Shadow and Flame talent/.test(WL.validateBuild(nb).join(' | ')), 'editor flags it without Shadow and Flame');
  });

  T.run('mana summary (W3)', function () {
    T.group('Life Tap time share, pet out-of-mana share, pet mana in the log');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.iterations = 50;
    var imp = WL.BUILDS.filter(function (b) { return b.pet === 'imp'; })[0];
    var r = WL.simulate(imp, 'gnome', c);
    T.ok(r.mana && r.mana.tapTimePct > 0 && r.mana.tapTimePct < 100, 'Life Tap time ' + r.mana.tapTimePct.toFixed(1) + '% of the fight');
    T.near(r.mana.tapTimePct, 100 * r.lifeTaps * 1.5 / r.avgDuration, 0.5, '≈ Life Taps × 1.5 s GCD / fight length (no haste)');
    T.ok(r.mana.petOomFightsPct >= 0 && r.mana.petOomFightsPct <= 100, 'pet out-of-mana share ' + r.mana.petOomFightsPct.toFixed(0) + '% of fights');
    T.ok(r.log.every(function (e) { return e.mana >= 0 && e.petMana >= 0; }), 'every log entry carries Warlock and pet mana (for the graph)');
  });
})();
