// Round 42 tests: trainer ranks by default + AQ20 book ranks option, damage = Wowhead Effect Value − 1 (SPELLVALUES.md),
// pet melee attack table (glancing blows, crit suppression, inherits your hit), Eureka! 15 s cap, Soul Link on Demonic Brand.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t, pet) { return { key: 't42', short: 't', name: 't', notes: '', talents: t || {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }; }

  T.run('round 42: spell values, book ranks, pet melee table, Eureka! cap, Soul Link on brand', function () {
    T.group('spell values = Wowhead Forever Effect Value − 1 (SPELLVALUES.md, 2026-09-26)');
    // [key, field, Wowhead Effect Value, id]
    var V = [['shadowBolt', 'base', 252, 11661], ['immolate', 'base', 147, 11668], ['immolate', 'tickBase', 53, 11668],
      ['corruption', 'tickBase', 58, 11672], ['incinerate', 'base', 218], ['searingPain', 'base', 115], ['conflagrate', 'base', 283],
      ['shadowburn', 'base', 267], ['soulFire', 'base', 432], ['baneOfAgony', 'tickBase', 47], ['baneOfDoom', 'tickBase', 1743],
      ['siphonLife', 'tickBase', 42], ['drainLife', 'tickBase', 52], ['drainSoul', 'tickBase', 85], ['wrack', 'tickBase', 37],
      ['deathCoil', 'base', 455]];
    V.forEach(function (v) {
      var s = WL.SPELLS[v[0]];
      T.eq(s[v[1]], v[2] - 1, v[0] + '.' + v[1] + ' = ' + (v[2] - 1) + ' (Value ' + v[2] + ' − 1)');
      if (v[3]) T.eq(s.id, v[3], v[0] + ' uses spell ' + v[3]);
    });
    T.eq(WL.DEFAULT_CONFIG.pets.imp.spell.base, 44, 'Firebolt 44 (Value 45 − 1)');
    T.eq(WL.DEFAULT_CONFIG.pets.succubus.spell.base, 50, 'Lash of Pain 50 (Value 51 − 1)');
    T.eq(WL.SPELLS.incinerate.immolateBonusPct, 25, 'Incinerate +25% vs Immolate (Value 26 − 1)');
    T.eq([WL.SPELLS.shadowBolt.cost, WL.SPELLS.immolate.cost, WL.SPELLS.corruption.cost].join('/'), '370/370/290', 'trainer-rank mana costs 370 / 370 / 290');
    T.eq([WL.SPELLS.shadowBolt.rank, WL.SPELLS.immolate.rank, WL.SPELLS.corruption.rank].join('/'), '9/7/6', 'default ranks: Shadow Bolt R9, Immolate R7, Corruption R6 (user)');
    T.ok(/237 to 265/.test(WL.SPELL_TEXT[11661]), 'Shadow Bolt R9 tooltip shows the in-game 237 to 265', WL.SPELL_TEXT[11661]);

    T.group('AQ20 book ranks option (off by default)');
    T.eq(WL.DEFAULT_CONFIG.options.bookRanks, false, 'options.bookRanks is off by default (user)');
    T.ok(WL.spellsFor(WL.DEFAULT_CONFIG) === WL.SPELLS, 'off → the trainer-rank table itself');
    var on = det(function (c) { c.options.bookRanks = true; }), BK = WL.spellsFor(on);
    T.eq([BK.shadowBolt.id, BK.shadowBolt.base, BK.shadowBolt.cost].join('/'), '25307/268/380', 'on → Shadow Bolt R10: 268 (Value 269 − 1), 380 mana');
    T.eq([BK.immolate.id, BK.immolate.base, BK.immolate.tickBase, BK.immolate.cost].join('/'), '25309/158/55/380', 'Immolate R8: 158 + 55 per tick, 380 mana');
    T.eq([BK.corruption.id, BK.corruption.tickBase, BK.corruption.cost].join('/'), '25311/73/340', 'Corruption R7: 73 per tick, 340 mana');
    T.eq(WL.SPELLS.shadowBolt.base, 251, 'WL.SPELLS is not changed by the option');
    T.ok(BK.searingPain === WL.SPELLS.searingPain, 'other spells are shared');
    var sb1 = function (c) { return WL.simulateOnce(tb(['shadowBolt']), 'human', c, { duration: 30, log: true }).log.filter(function (e) { return e.type === 'hit'; })[0].dmg; };
    var sp = WL.computeStats(tb(['shadowBolt']), 'human', on).sp;
    T.eq(sb1(on), Math.round(268 + 0.857 * sp), 'with the option a Shadow Bolt hits for 268 + 0.857 × ' + sp);
    T.eq(sb1(det()), Math.round(251 + 0.857 * sp), 'without it: 251 + 0.857 × ' + sp);
    var tOn = WL.buildSpellTable(tb(['shadowBolt']), WL.computeStats(tb(['shadowBolt']), 'human', on), on);
    T.eq(tOn.shadowBolt.cost, 380, 'the spell table uses the book rank cost');
    var code = WL.decodeSettings(WL.encodeSettings(on)), back = det();
    WL.applySettings(back, code);
    T.eq(back.options.bookRanks, true, 'the settings code carries the option');

    T.group('pet melee attack table (glancing blows, crit suppression; inherits your hit and crit)');
    var succ = tb(['shadowBolt'], {}, 'succubus');
    var agg = function (c) { return WL.simulate(succ, 'human', c, { iterations: 300, log: false }).bySpell['pet:melee']; };
    // The test page pins the round-2 pet values in DEFAULT_CONFIG (reference-gear.js); use the shipped ones here.
    var shipped = function () {
      var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), m = c.pets.succubus.melee;
      c.petSpPct = WL.SHIPPED_PETS.petSpPct; m.apPerSp = WL.SHIPPED_PETS.succApPerSp; m.baseDps = WL.SHIPPED_PETS.succBaseDps;
      m.critPct = WL.SHIPPED_PETS.succCrit; m.inheritMeleeCrit = WL.SHIPPED_PETS.succInherit;
      return c;
    };
    var c0 = shipped(), st0 = WL.computeStats(succ, 'human', c0), m0 = agg(c0);
    var hitAbove = st0.hitPct - c0.combat.baseHitPct, miss = Math.max(0, 8 - Math.max(0, hitAbove - 1));
    T.near(100 * m0.misses / m0.casts, miss + 6.5, 1.0, 'miss + dodge = ' + miss.toFixed(1) + '% (8% − (your ' + hitAbove.toFixed(1) + '% hit − 1%)) + 6.5% dodge (measured ' + (100 * m0.misses / m0.casts).toFixed(2) + '%)');
    T.near(100 * m0.glances / m0.casts, 40, 1.5, 'glancing blows ≈ 40% of swings (measured ' + (100 * m0.glances / m0.casts).toFixed(2) + '%)');
    var critExp = 7.52 + st0.meleeCritPct - 4.8;
    T.near(100 * m0.crits / m0.casts, critExp, 1.2, 'crits ≈ 7.52 + ' + st0.meleeCritPct.toFixed(2) + ' − 4.8 = ' + critExp.toFixed(2) + '% of swings (measured ' + (100 * m0.crits / m0.casts).toFixed(2) + '%)');
    var c20 = shipped(); c20.gear.hitPct = 12;
    var m20 = agg(c20);
    T.near(100 * m20.misses / m20.casts, 6.5, 0.8, 'with 12% gear hit the pet never misses — only the 6.5% dodge is left (measured ' + (100 * m20.misses / m20.casts).toFixed(2) + '%)');
    var one = WL.simulateOnce(succ, 'human', c0, { seed: 4, duration: 120 }).bySpell['pet:melee'];
    T.ok(one.glances > 0 && one.glances <= one.landed - one.crits, 'glancing blows are never crits (' + one.glances + ' glances, ' + one.crits + ' crits, ' + one.landed + ' landed)');

    T.group('Eureka! lasts at most 15 s (spell data, round 42)');
    var gn = det(function (c) { c.options.eurekaPolicy = 'any'; c.fight.latencyMs = 800; });
    var eg = WL.simulateOnce(tb(['drainLife']), 'gnome', gn, { duration: 60, log: true });
    var ivs = (eg.auras && eg.auras.eureka) || [];
    T.ok(ivs.length > 0, 'the aura was used (' + ivs.map(function (v) { return v[0].toFixed(1) + '–' + v[1].toFixed(1); }).join(', ') + ')');
    T.ok(ivs.every(function (v) { return v[1] - v[0] <= 15 + 1e-6; }), 'no Eureka! aura lasts longer than 15 s');
    T.ok(eg.log.some(function (e) { return e.type === 'expire' && e.spell === 'eureka'; }), '3 Drain Life channels + 0.8 s latency run past 15 s → the aura expires (log "expire")');
    var lateTicks = eg.log.filter(function (e) { return e.type === 'tick' && e.spell === 'drainLife' && e.t > ivs[0][1] + 1e-6 && e.t < ivs[0][0] + 20; });
    var early = eg.log.filter(function (e) { return e.type === 'tick' && e.spell === 'drainLife' && e.t < ivs[0][1] - 1e-6 && !e.crit; })[0];
    T.ok(lateTicks.length > 0 && lateTicks.filter(function (e) { return !e.crit; }).every(function (e) { return Math.abs(e.dmg * 1.10 - early.dmg) <= 1.5; }),
      'Drain Life ticks after the 15 s mark lose the +10% (' + lateTicks.length + ' ticks)');

    T.group('Soul Link on Demonic Brand (round 42)');
    var brand = function (t) {
      var r = WL.simulateOnce(tb(['searingPain'], t, 'imp'), 'human', det(), { duration: 60, log: true });
      var d = r.log.filter(function (e) { return e.type === 'pet' && e.spell === 'pet:brand'; }).map(function (e) { return e.dmg; });
      return d[0];
    };
    var b0 = brand({ demonicBrand: 3 }), b1 = brand({ demonicBrand: 3, demonicSacrifice: 1, soulLink: 1 });
    T.near(b1 / b0, 1.03, 0.01, 'brand proc × 1.03 with Soul Link (' + b0 + ' → ' + b1 + ')');
  });
})();
