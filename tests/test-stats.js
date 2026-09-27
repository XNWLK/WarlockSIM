// Step 3/7 tests: computeStats vs hand calculations (worked in comments).
// Default gear (user): SP 700, hit 5%, crit 20% sheet total, haste 0, pierce 0; Int 200, Spi 80, Sta 200 from gear.
(function () {
  var cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
  cfg.gear.critPct = 20;   // the hand calculations below were worked with a 20% sheet crit
  var B = {}; WL.TEST_BUILDS.forEach(function (b) { B[b.key] = b; });

  T.run('stats human aff', function () {
    T.group('stats: Human / aff_wrack_ds');
    var s = WL.computeStats(B.aff_wrack_ds, 'human', cfg);
    T.near(s.int, 310, 1e-9, 'Int = 110 + 0 + 200');
    T.near(s.spi, 204.75, 1e-9, 'Spi = (115 + 80) × 1.05');
    T.near(s.sta, 304.75, 1e-9, 'Sta = (65 + 200) × 1.15 (Demonic Embrace 5/5)');
    T.near(s.maxMana, 6604.45, 1e-6, 'Mana = (1373 + 20 + 15×290) × 1.15 (Fel Vitality 3/3)');
    T.near(s.maxHealth, 4281.5, 1e-6, 'Health = 1414 + 20 + 10×(304.75 − 20)');
    T.near(s.sp, 700, 1e-9, 'SP = 700 (no pet → no Demonic Knowledge)');
    T.near(s.schoolSp.shadow, 21, 1e-9, 'Shadow SP = 21 (Spellstone)');
    T.near(s.hitPct, 93, 1e-9, 'Hit = 83 + Suppression 5 + gear 5');
    T.near(s.critPct, 22, 1e-9, 'Crit = sheet 20 + Sword Specialization 2 (Malevolence added per spell)');
    T.near(s.hastePct, 2, 1e-9, 'Haste = 2 (Spellstone)');
    T.near(s.pierce, 0, 1e-9, 'Spell Pierce 0');
    // Round 43: stats.mult holds only auras; Shadow Mastery is a spell modifier that adds up in the spell table (A68).
    T.near(s.mult.shadow, 1.15, 1e-12, 'Shadow aura mult = DS Imp 15% (Shadow Mastery is in the spell table since round 43)');
    T.near(s.mult.all, 1, 1e-12, 'All mult = 1 (no pet → no Soul Link)');
  });

  T.run('stats gnome demo', function () {
    T.group('stats: Gnome / demo_pact_succ');
    var s = WL.computeStats(B.demo_pact_succ, 'gnome', cfg);
    T.near(s.int, 313, 1e-9, 'Int = 110 + 3 + 200');
    T.near(s.maxMana, 5788 * 1.20, 1e-6, 'Mana = (1373 + 20 + 15×293) × (1 + 0.15 + 0.05)');
    T.near(s.sp, 760, 1e-9, 'SP = 700 + 60 (Demonic Knowledge 3/3, pet out)');
    T.near(s.critPct, 20, 1e-9, 'Crit = sheet 20 (no sword spec, no oil crit)');
    T.near(s.hitPct, 88, 1e-9, 'Hit = 83 + 0 + 5');
    T.near(s.mult.shadow, 1.15 * 1.10, 1e-12, 'Shadow mult = DS Imp (kept by Pact) × Master Demonologist Succubus');
    T.near(s.mult.all, 1.03, 1e-12, 'All mult = Soul Link 3%');
  });

  T.run('stats orc destro', function () {
    T.group('stats: Orc / destro_incin_ds');
    var s = WL.computeStats(B.destro_incin_ds, 'orc', cfg);
    T.near(s.critPct, 22, 1e-9, 'Crit = sheet 20 + Firestone 2');
    T.near(s.schoolSp.fire, 21, 1e-9, 'Fire SP = 21 (Firestone)');
    T.near(s.hastePct, 0, 1e-9, 'Haste = 0');
    T.near(s.mult.fire, 1.15, 1e-12, 'Fire mult = DS Succubus 15%');
  });

  T.run('stats edge', function () {
    T.group('stats: edge cases & stat-weight extras');
    var c2 = JSON.parse(JSON.stringify(cfg)); c2.gear.hitPct = 20;
    var s = WL.computeStats(B.aff_wrack_ds, 'troll', c2);
    T.near(s.hitPct, 100, 1e-9, 'Hit capped at 100% (round 48: Forever has no permanent 1% miss)');
    T.near(s.hitPctUncapped, 108, 1e-9, 'Uncapped hit reported (83+5+20)');
    var c3 = JSON.parse(JSON.stringify(cfg)); c3.gear.weaponIsSword = false;
    T.near(WL.computeStats(B.aff_wrack_ds, 'human', c3).critPct, 20, 1e-9, 'Human without sword: 20%');
    var c4 = JSON.parse(JSON.stringify(cfg)); c4.buffs.arcaneIntellect.on = true;
    var s4 = WL.computeStats(B.aff_wrack_ds, 'human', c4);
    T.near(s4.int, 341, 1e-9, 'Arcane Intellect +31 Int');
    T.near(s4.critPct, 22 + 31 / 60, 1e-9, 'extra Int adds crit on top of the sheet total (60 Int = 1%)');
    var c6 = JSON.parse(JSON.stringify(cfg)); c6.gear.critIncludesAll = true;
    T.near(WL.computeStats(B.aff_wrack_ds, 'human', c6).critPct, 20, 1e-9, 'critIncludesAll on → 20 flat (Sword Spec not added)');
    T.near(WL.computeStats(B.destro_incin_ds, 'orc', c6).critPct, 20, 1e-9, 'critIncludesAll on → 20 flat (Firestone not added)');
    T.near(WL.buildSpellTable(B.aff_wrack_ds, WL.computeStats(B.aff_wrack_ds, 'human', c6), c6).shadowBolt.critPct, 20, 1e-9, 'critIncludesAll on → Malevolence not added');
    var c5 = JSON.parse(JSON.stringify(cfg)); c5.extra = { sp: 50, hitPct: 1, critPct: 1, hastePct: 1, int: 60 };
    var s5 = WL.computeStats(B.aff_wrack_ds, 'human', c5);
    T.near(s5.sp, 750, 1e-9, 'extra SP +50');
    T.near(s5.hitPct, 94, 1e-9, 'extra +1% hit');
    T.near(s5.critPct, 22 + 1 + 1, 1e-9, 'extra +1% crit and 60 Int +1%');
    T.near(s5.hastePct, 3, 1e-9, 'extra +1% haste');
    T.near(s5.maxMana, (1373 + 20 + 15 * 350) * 1.15, 1e-6, 'extra Int also adds mana');
    ['int', 'critPct', 'hitPct'].forEach(function (k) {
      var sum = s5.breakdown.filter(function (x) { return x.stat === k; }).reduce(function (a, x) { return a + x.value; }, 0);
      T.near(sum, k === 'hitPct' ? s5.hitPctUncapped : s5[k], 1e-9, 'breakdown entries sum to final ' + k);
    });
  });
})();
