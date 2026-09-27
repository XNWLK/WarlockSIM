// Round 5 tests: talent behaviour the user asked to double-check (deterministic: 100% hit, 0% crit, no CoE, SP 700).
(function () {
  function det() {
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
  function hits(r, spell, type) { return r.log.filter(function (e) { return e.spell === spell && e.type === (type || 'hit'); }).map(function (e) { return e.dmg; }); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  T.run('demonic sacrifice', function () {
    T.group('talents: Demonic Sacrifice & Master Demonologist schools (Forever: Imp = Shadow, Succubus = Fire)');
    var c = det();
    var imp = WL.computeStats(tb([], { demonicSacrifice: 1 }, { sacrifice: 'imp' }), 'human', c);
    T.near(imp.mult.shadow, 1.15, 1e-12, 'sacrificed Imp → +15% Shadow');
    T.near(imp.mult.fire, 1, 1e-12, 'sacrificed Imp → no Fire bonus');
    var suc = WL.computeStats(tb([], { demonicSacrifice: 1 }, { sacrifice: 'succubus' }), 'human', c);
    T.near(suc.mult.fire, 1.15, 1e-12, 'sacrificed Succubus → +15% Fire');
    T.near(suc.mult.shadow, 1, 1e-12, 'sacrificed Succubus → no Shadow bonus');
    var noPact = WL.computeStats(tb([], { demonicSacrifice: 1 }, { sacrifice: 'imp', pet: 'succubus' }), 'human', c);
    T.near(noPact.mult.shadow, 1, 1e-12, 'summoning another demon without Demonic Pact cancels the sacrifice');
    var mdImp = WL.computeStats(tb([], { masterDemonologist: 5 }, { pet: 'imp' }), 'human', c);
    T.near(mdImp.mult.fire, 1.10, 1e-12, 'Master Demonologist with Imp → +10% Fire (tooltip)');
    var mdSuc = WL.computeStats(tb([], { masterDemonologist: 5 }, { pet: 'succubus' }), 'human', c);
    T.near(mdSuc.mult.shadow, 1.10, 1e-12, 'Master Demonologist with Succubus → +10% Shadow (tooltip)');
  });

  T.run('shadow and flame', function () {
    T.group('talents: Shadow and Flame — Conflagrate buffs Shadow, Shadowburn buffs Fire');
    var c = det(); c.fight.duration = 60;
    var sb = 251 + 0.857 * 700, immoTick = 52 + 0.13 * 700;          // SB R9 / Immolate R7, Value − 1 (round 42)
    var r1 = WL.simulateOnce(tb(['immolate', 'conflagrate', 'shadowBolt'], { conflagrate: 1, shadowAndFlame: 5 }), 'human', c, { log: true });
    T.eq(uniq(hits(r1, 'shadowBolt')).join(','), String(Math.round(sb * 1.10)), 'after Conflagrate every Shadow Bolt hits for ×1.10');
    T.eq(uniq(hits(r1, 'immolate', 'tick')).join(','), String(Math.round(immoTick)), 'Conflagrate does NOT buff Fire (Immolate ticks unchanged)');
    T.eq(r1.log.filter(function (e) { return e.type === 'consume'; }).length, 0, 'S&F 5/5: Conflagrate never consumes Immolate');
    var r2 = WL.simulateOnce(tb(['immolate', 'shadowburn', 'shadowBolt'], { shadowburn: 1, shadowAndFlame: 5 }), 'human', c, { log: true });
    T.eq(uniq(hits(r2, 'immolate', 'tick')).join(','), String(Math.round(immoTick * 1.10)), 'after Shadowburn every Immolate tick is ×1.10');
    T.eq(uniq(hits(r2, 'shadowBolt')).join(','), String(Math.round(sb)), 'Shadowburn does NOT buff Shadow (Shadow Bolt unchanged)');
    T.eq(r2.log.filter(function (e) { return e.type === 'refund'; }).length, r2.bySpell.shadowburn.hits, 'S&F 5/5: every Shadowburn refunds its Soul Shard');
  });

  T.run('demonic brand', function () {
    T.group('talents: Demonic Brand (Searing Pain brands; next 6 pet attacks deal bonus damage)');
    var c = det(); c.fight.duration = 60;
    var perProc = (65 + 68) / 2 + 0.078 * 700;   // 121.1
    var r = WL.simulateOnce(tb(['searingPain'], { demonicBrand: 3 }, { pet: 'imp' }), 'human', c, { log: true });
    var procs = hits(r, 'pet:brand', 'pet');
    T.ok(procs.length > 0, 'brand procs happen (' + procs.length + ')', '');
    T.eq(uniq(procs).join(','), String(Math.round(perProc)), 'each proc = 66.5 + 0.078 × 700 = 121.1');
    // First Searing Pain lands at 1.5 s, first Firebolt lands at 2.0 s → every Firebolt hits a branded target.
    T.eq(procs.length, r.bySpell['pet:firebolt'].hits, 'every Firebolt is branded (brand at 1.5 s, first bolt lands at 2.0 s)');
    var r2 = WL.simulateOnce(tb(['searingPain'], { demonicBrand: 3, unholyPower: 5, masterDemonologist: 5 }, { pet: 'imp' }), 'human', c, { log: true });
    T.eq(uniq(hits(r2, 'pet:brand', 'pet')).join(','), String(Math.round(perProc * 1.1 * 1.1)), 'scaled by Unholy Power ×1.10 and Master Demonologist (Imp) ×1.10');
    var r3 = WL.simulateOnce(tb(['shadowBolt'], { demonicBrand: 3 }, { pet: 'imp' }), 'human', c, { log: true });
    T.eq(hits(r3, 'pet:brand', 'pet').length, 0, 'no Searing Pain → no brand');
    var c4 = det(); c4.fight.duration = 60;
    var r4 = WL.simulateOnce(tb(['searingPain'], { demonicBrand: 1 }, { pet: 'imp' }), 'human', c4, { log: true });
    T.ok(hits(r4, 'pet:brand', 'pet').length <= hits(r, 'pet:brand', 'pet').length, 'rank 1 (2 charges) never procs more than rank 3', '');
  });

  T.run('tooltips', function () {
    T.group('tooltip data (generated by tools/gen-tooltips.ps1)');
    WL.TALENTS.forEach(function (t) {
      var txt = WL.TALENT_TEXT[t.key];
      T.ok(txt && txt.length === t.ranks && txt.every(function (s) { return s.length > 10 && s.indexOf('<') < 0; }),
        t.key + ': one clean tooltip per rank (' + t.ranks + ')', JSON.stringify(txt));
    });
    Object.keys(WL.SPELLS).forEach(function (k) {
      T.ok((WL.SPELL_TEXT[WL.SPELLS[k].id] || '').length > 10, k + ': spell tooltip present', WL.SPELLS[k].id);
    });
    var snf = WL.TALENT_TEXT.shadowAndFlame[4];
    T.ok(/Conflagrate increases all Shadow damage/.test(snf) && /Shadowburn increases all Fire damage/.test(snf),
      'Shadow and Flame text: Conflagrate → Shadow, Shadowburn → Fire (matches the engine)', snf);
  });

  T.run('pierce weight', function () {
    T.group('Spell Pierce stat weight');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.iterations = 150;
    var w = WL.statWeights(WL.TEST_BUILDS[4], 'orc', c, 150);
    T.ok(w.pierce > 0, 'DPS per 1 Spell Pierce is positive (boss at 0 resistance → vulnerable damage)', w.pierce);
    T.ok(Math.abs(w.pierce - w.base * 0.75 / 300) < w.base * 0.75 / 300 * 0.35,
      'weight ≈ DPS × 0.75/300 per point (Warlock spells only, pets unaffected)', w.pierce + ' vs ' + (w.base * 0.0025));
  });

  T.run('amplify curse', function () {
    T.group('talents: Amplify Curse (next Bane of Agony: base damage +50%, spell-power part unchanged; 3 min cooldown)');
    var c = det(); c.fight.duration = 30;
    // Round 25 (user): the aura "Modifies Spell Effectiveness" scales the base value only (46 since round 42), not 0.133 × SP.
    var amp = 46 * 1.5 + 0.133 * 700, plain = 46 + 0.133 * 700;
    var r = WL.simulateOnce(tb(['bane', 'shadowBolt'], { amplifyCurse: 1 }), 'human', c, { log: true });
    var ticks = hits(r, 'baneOfAgony', 'tick');
    T.eq(ticks[0], Math.round(amp * 0.5), 'first BoA tick = (46 × 1.5 + 0.133 × 700) × 0.5 (ramp)');
    T.eq(r.log.filter(function (e) { return e.spell === 'amplifyCurse'; }).length, 1, 'used once, then on its 3 min cooldown');
    var r0 = WL.simulateOnce(tb(['bane', 'shadowBolt'], {}), 'human', c, { log: true });
    T.near(r.bySpell.baneOfAgony.dmg / r0.bySpell.baneOfAgony.dmg, amp / plain, 1e-9, 'Bane of Agony × ' + (amp / plain).toFixed(3) + ' (not × 1.5)');
    T.ok(!r.log.some(function (e) { return e.type === 'cast' && e.eureka; }), 'not mislabelled as Eureka! in the log', '');
  });
})();
