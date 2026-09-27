// Step 7 tests: Spell Pierce / resistance, pet actors, stat weights, median.
(function () {
  function detCfg() {   // deterministic: 100% hit, 0% crit, no CoE
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100;
    c.gear.critPct = 0; c.gear.hitPct = 0; c.gear.weaponIsSword = false;
    c.options.useCurseOfElements = false;
    return c;
  }
  function tb(rot, talents, extra) {
    var b = { key: 't', name: 't', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot };
    for (var k in (extra || {})) b[k] = extra[k];
    return b;
  }

  T.run('resist', function () {
    T.group('resistance & Spell Pierce [A43][A44]');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    T.eq(WL.effectiveResist(c, 0, 'shadow', true), 0, 'boss 0 resist + CoE → 0 (CoE cannot go below 0)');
    T.eq(WL.effectiveResist(c, 15, 'shadow', true), -15, '15 pierce → −15');
    c.combat.targetResist.fire = 100;
    T.eq(WL.effectiveResist(c, 15, 'fire', true), 10, '100 resist − 75 CoE − 15 pierce = 10');
    T.eq(WL.effectiveResist(c, 15, 'fire', false), 85, 'without CoE: 100 − 15 = 85');
    var d = WL.vulnerableDist(15 * 0.75 / 300, 0.1, 0.2);
    T.eq(d.map(function (o) { return o.pct; }).join(','), '0,10,20', '15 pierce → outcomes +0% / +10% / +20% (user example)');
    var mean = d.reduce(function (a, o) { return a + o.p * o.pct / 100; }, 0);
    T.near(mean, 0.0375, 1e-9, 'mean vulnerable damage = 0.75 × 15 / 300 = 3.75%');
    T.near(d.reduce(function (a, o) { return a + o.p; }, 0), 1, 1e-12, 'probabilities sum to 1');
    T.eq(WL.vulnerableDist(0, 0.1, 0.2).length, 1, 'no pierce → single outcome');
    var big = WL.vulnerableDist(100 * 0.75 / 300, 0.1, 0.2), bm = big.reduce(function (a, o) { return a + o.p * o.pct / 100; }, 0);
    T.near(bm, 0.25, 1e-9, '100 pierce → mean 25%');
    var p = WL.resistProfile(c, 15, 'fire', true);
    // round 39: positive resistance is rolled as partial resists (0/25/50/75/100%) with the same mean (was a flat multiplier)
    var pm = p.dist.reduce(function (a, o) { return a + o.p * o.pct / 100; }, 0);
    T.near(pm, -0.0025 * 10, 1e-9, 'positive resistance 10 → partial resists averaging −2.5%');
    T.ok(p.flat === 1 && p.dist.every(function (o) { return o.pct % 25 === 0 && o.pct <= 0; }), 'resisted in 25% chunks (' + p.dist.map(function (o) { return o.pct + '%:' + o.p.toFixed(3); }).join(' ') + ')');
  });

  T.run('pierce in sim', function () {
    T.group('Spell Pierce inside the simulation');
    var c = detCfg(); c.fight.duration = 3000;
    var r0 = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { rng: WL.makeRng(3) });
    c.gear.pierce = 15;
    var r1 = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { rng: WL.makeRng(3) });
    var a0 = r0.bySpell.shadowBolt.dmg / r0.bySpell.shadowBolt.hits, a1 = r1.bySpell.shadowBolt.dmg / r1.bySpell.shadowBolt.hits;
    T.near(a1 / a0, 1.0375, 0.006, 'avg SB hit ×1.0375 with 15 pierce (n=' + r1.bySpell.shadowBolt.hits + ')');
    T.eq(Object.keys(r1.vulnHits).sort(function (x, y) { return x - y; }).join(','), '0,10,20', 'observed outcome steps 0/10/20%');
    T.eq(Object.keys(r0.vulnHits).length, 0, 'pierce 0 → no vulnerable rolls');
  });

  T.run('imp', function () {
    T.group('pet: Imp (Firebolt R7 = 44 + 0.571 × SP, 2 s, 115 mana; Effect Value 45 − 1 since round 42)');
    var c = detCfg(); c.fight.duration = 60;
    var b = tb(['shadowBolt'], {}, { pet: 'imp' });
    var r = WL.simulateOnce(b, 'human', c, { log: true });
    var fb = r.bySpell['pet:firebolt'];
    T.near(fb.dmg / fb.hits, 44 + 0.571 * 700, 1e-6, 'each Firebolt = 44 + 0.571 × 700 = 443.7 (no talents)');
    // Mana: 2000 pool, 115/cast, +8/s. Casts at 0,2,4,… until mana < 115, then one cast per (115−m)/8 s.
    var mana = 2000, t = 0, casts = 0, last = 0;
    while (t < 60 - 1e-9) {
      mana = Math.min(2000, mana + 8 * (t - last)); last = t;
      if (mana >= 115) { mana -= 115; if (t + 2 <= 60 + 1e-9) casts++; t += 2; }
      else t += Math.max(0.1, (115 - mana) / 8);
    }
    T.eq(fb.hits, casts, 'Firebolt count matches an independent mana walk (' + casts + ' landed in 60 s)');
    T.ok(r.petOomTime > 0, 'Imp runs out of mana (Icy Veins observation)', r.petOomTime);
    var b2 = tb(['shadowBolt'], { demonicEnergies: 2 }, { pet: 'imp' });
    var r2 = WL.simulateOnce(b2, 'human', c, {});
    T.ok(r2.bySpell['pet:firebolt'].hits > fb.hits, 'Demonic Energies (Life Tap → pet mana) gives more Firebolts', r2.bySpell['pet:firebolt'].hits + ' vs ' + fb.hits);
  });

  T.run('succubus', function () {
    T.group('pet: Succubus (Lash of Pain R6 = 50 + 0.429 × SP, 12 s CD; melee with glancing blows since round 42)');
    var c = detCfg(); c.fight.duration = 120;
    var b = tb(['shadowBolt'], { improvedSayaad: 3, unholyPower: 5 }, { pet: 'succubus' });
    var r = WL.simulateOnce(b, 'human', c, { log: true });
    var lash = r.bySpell['pet:lashOfPain'];
    T.eq(lash.hits, 10, 'Lash at 0,12,…,108 → 10 casts in 120 s');
    // Round 43 (A68): Improved Sayaad is "Modifies Spell Effectiveness" → base value only (like Amplify Curse).
    T.near(lash.dmg / lash.hits, (50 * 1.30 + 0.429 * 700) * 1.10, 1e-6, 'Lash = (50 × Improved Sayaad 1.30 + 0.429 × 700) × Unholy Power 1.10 = 401.8');
    var m = c.pets.succubus.melee, mel = r.bySpell['pet:melee'];
    T.eq(mel.casts, 60, 'melee swings every 2.0 s → 60 in 120 s (swing at 120 excluded)');
    var perHit = (m.baseDps + m.apPerSp * 700 / m.apPerDps) * m.swing * (1 - WL.armorReduction(c)) * 1.10;
    // Round 42: glancing blows deal 65% (never crit); crits ×2 → exact average per landed swing.
    var gl = mel.glances || 0;
    T.near(mel.dmg / mel.landed, perHit * (1 + mel.crits / mel.landed - 0.35 * gl / mel.landed), perHit * 1e-9,
      'melee hit = (base + AP from SP) × 2 s × (1 − armor reduction) × 1.10, crits ×2, glancing ×0.65 (' + gl + ' glances)');
    T.near(mel.landed / mel.casts, 0.855, 0.12, 'melee land rate ≈ 85.5% (this test sets base hit 100 → no hit above base → 8% miss + 6.5% dodge)');
  });

  T.run('life tap for pet', function () {
    T.group('Life Tap to feed the pet (Demonic Energies)');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.duration = 180;
    var base = tb(['shadowBolt'], { demonicEnergies: 2 }, { pet: 'imp' });
    var feed = tb(['lifeTapPet', 'shadowBolt'], { demonicEnergies: 2 }, { pet: 'imp' });
    var r0 = WL.simulateOnce(base, 'human', c, { log: true }), r1 = WL.simulateOnce(feed, 'human', c, { log: true });
    T.ok(r1.bySpell['pet:firebolt'].hits > r0.bySpell['pet:firebolt'].hits, 'feeding taps give more Firebolts (' + r1.bySpell['pet:firebolt'].hits + ' vs ' + r0.bySpell['pet:firebolt'].hits + ')', '');
    var st = WL.computeStats(feed, 'human', c), full = Math.round(430 + st.spi);
    var taps = r1.log.filter(function (e) { return e.spell === 'lifeTap'; });
    T.ok(taps.every(function (e) { return Math.abs(e.gain - full) <= 1; }), 'every tap gains the full ' + full + ' mana (never wasted at the cap)', taps.map(function (e) { return e.gain; }).join(','));
    var noDE = tb(['lifeTapPet', 'shadowBolt'], {}, { pet: 'imp' }), r2 = WL.simulateOnce(noDE, 'human', c, {});
    var r3 = WL.simulateOnce(tb(['shadowBolt'], {}, { pet: 'imp' }), 'human', c, {});
    T.eq(r2.lifeTaps, r3.lifeTaps, 'without Demonic Energies the action never fires');
  });

  T.run('racial timing', function () {
    T.group('racial cooldowns fire only before damaging casts');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.duration = 60;
    ['gnome', 'orc', 'troll'].forEach(function (rk) {
      var r = WL.simulateOnce(WL.TEST_BUILDS[0], rk, c, { log: true });
      var i = r.log.findIndex(function (e) { return e.type === 'racial'; });
      var next = r.log.slice(i + 1).find(function (e) { return e.type === 'cast'; });
      var before = r.log.slice(0, i).filter(function (e) { return e.type === 'cast'; }).map(function (e) { return e.spell; });
      T.ok(i >= 0 && next && WL.SPELLS[next.spell].kind !== 'utility', rk + ': racial is followed by a damaging cast (' + (next && next.spell) + ')', JSON.stringify(next));
      T.ok(before.indexOf('curseOfElements') >= 0, rk + ': Curse of the Elements was cast before the racial', before.join(','));
    });
    var g = WL.simulateOnce(WL.TEST_BUILDS[0], 'gnome', c, { log: true });
    var eur = g.log.filter(function (e) { return e.type === 'cast' && e.eureka; }).map(function (e) { return e.spell; });
    T.eq(eur.length, 3, 'Eureka! empowers exactly 3 casts in the first minute: ' + eur.join(', '));
    T.ok(eur.every(function (s) { return WL.SPELLS[s].kind !== 'utility'; }), 'no Eureka charge spent on a curse', eur.join(','));
  });

  T.run('weights', function () {
    T.group('stat weights (common random numbers)');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.iterations = 200;
    var b = WL.TEST_BUILDS.filter(function (x) { return x.key === 'ds_ruin_sb'; })[0];
    var w = WL.statWeights(b, 'orc', c, 200);
    T.ok(w.sp > 0, 'SP weight positive', w.sp);
    T.ok(w.hitPct > 0, 'hit weight positive below cap', w.hitPct);
    T.ok(w.critPct > 0, 'crit weight positive', w.critPct);
    T.ok(w.int > 0, 'Int weight positive', w.int);
    var c2 = JSON.parse(JSON.stringify(c)); c2.gear.hitPct = 12;   // 83 + 5 + 12 = 100 → capped (round 48: cap 100, was 11 → 99)
    var w2 = WL.statWeights(b, 'orc', c2, 100);
    T.eq(w2.hitPct, 0, 'hit weight exactly 0 at the 100% cap (identical fights)');
    var w3 = WL.statWeights(b, 'orc', c, 200);
    T.eq(w3.sp, w.sp, 'weights reproducible with the same seed');
    var r = WL.simulate(b, 'orc', c, { iterations: 201 });
    T.ok(r.dpsMedian >= r.dpsMin && r.dpsMedian <= r.dpsMax, 'median within min–max', r.dpsMedian);
  });
})();
