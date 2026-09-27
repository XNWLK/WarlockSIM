// Step 4 tests: per-spell static table vs hand calculations (SP 700).
(function () {
  var cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
  cfg.gear.critPct = 20;   // the hand calculations below were worked with a 20% sheet crit
  var B = {}; WL.TEST_BUILDS.forEach(function (b) { B[b.key] = b; });

  T.run('table human aff', function () {
    T.group('spell table: Human / aff_wrack_ds (SP 700 + 21 shadow)');
    var st = WL.computeStats(B.aff_wrack_ds, 'human', cfg), t = WL.buildSpellTable(B.aff_wrack_ds, st, cfg);
    var sb = t.shadowBolt;
    T.near(sb.cast, 3.0, 1e-9, 'SB cast 3.0 (no Bane points)');
    // Round 42: trainer ranks and Wowhead Effect Value − 1 (SPELLVALUES.md): SB R9 251 / 370 mana, Corruption R6 57,
    // Wrack 36, BoA 46, Incinerate 217, Immolate R7 146 / 52, Shadowburn 266.
    T.near(sb.cost, 370, 1e-9, 'SB cost 370 (R9)');
    T.near(sb.sp, 721, 1e-9, 'SB uses SP 700 + 21 Spellstone');
    T.near(sb.critPct, 22 + 5, 1e-9, 'SB crit = 22 + Malevolence 5');
    T.near(sb.critMult, 1.5, 1e-12, 'SB crit mult 1.5 (no Ruin)');
    T.near(sb.directDmg, (251 + 0.857 * 721) * 1.05 * 1.15, 1e-9, 'SB = (251 + 0.857×721) × 1.05 × 1.15 = 1049.19');
    var co = t.corruption;
    T.near(co.cast, 0, 1e-9, 'Corruption instant (Improved Corruption 5/5)');
    T.eq(co.ticks, 6, 'Corruption 6 ticks');
    T.near(co.critMult, 2.0, 1e-12, 'Corruption crit mult 2.0 (Pandemic 3/3)');
    // Round 43 (A68): spell modifiers of one group add up — periodic: Shadow Mastery 5 + Improved Corruption 10 +
    // Malediction 5 = +20%; the Demonic Sacrifice aura (×1.15) multiplies.
    T.near(co.tickDmg, (57 + 0.2 * 721) * 1.15 * (1 + 0.05 + 0.10 + 0.05), 1e-9, 'Corruption tick = 201.2 × DS 1.15 × (1 + SM 5% + ImpCorr 10% + Malediction 5%)');
    var wr = t.wrack;
    T.near(wr.tickDmg, (36 + 0.143 * 721) * 1.15 * (1 + 0.05 + 0.20 + 0.05), 1e-9, 'Wrack tick = DS × (1 + SM 5% + Improved Drains 20% + Malediction 5%)');
    T.near(wr.critMult, 2.0, 1e-12, 'Wrack crit mult 2.0 (Pandemic)');
    T.near(t.baneOfAgony.tickDmg, (46 + 0.133 * 721) * 1.15 * (1 + 0.05 + 0.10 + 0.05), 1e-9, 'BoA avg tick = DS × (1 + SM 5% + Improved BoA 10% + Malediction 5%)');
    T.near(t.immolate.critMult, 1.5, 1e-12, 'Immolate crit mult 1.5');
    T.ok(!t.incinerate && !t.conflagrate && !t.shadowburn, 'Destruction talent spells unavailable', Object.keys(t).join(','));
  });

  T.run('table orc destro', function () {
    T.group('spell table: Orc / destro_incin_ds (SP 700 + 21 fire)');
    var st = WL.computeStats(B.destro_incin_ds, 'orc', cfg), t = WL.buildSpellTable(B.destro_incin_ds, st, cfg);
    var inc = t.incinerate;
    T.near(inc.cast, 2.0, 1e-9, 'Incinerate cast 2.5 − 0.5 (Bane 5/5)');
    T.near(inc.cost, 325 * 0.9, 1e-9, 'Incinerate cost −10% (Cataclysm 3/3)');
    T.near(inc.critMult, 2.0, 1e-12, 'Incinerate crit mult 2.0 (Ruin 5/5)');
    T.near(inc.directDmg, (217 + 0.714 * 721) * 1.15 * 1.10, 1e-9, 'Incinerate × DS Succ 1.15 × AgF 1.10');
    T.near(t.immolate.directDmg, (146 + 0.2 * 721) * 1.15 * (1 + 0.10 + 0.50), 1e-9, 'Immolate direct = DS × (1 + AgF 10% + Aftermath 50%) (round 43: same modifier group adds)');
    T.near(t.immolate.tickDmg, (52 + 0.13 * 721) * 1.15 * 1.10, 1e-9, 'Immolate tick: no Aftermath/Malediction');
    T.near(t.conflagrate.critPct, 22 + 25, 1e-9, 'Conflagrate crit 22 (incl. Firestone) + Fire and Brimstone 25');
    T.near(t.soulFire.cast, 4.0, 1e-9, 'Soul Fire cast 6 − 2 (Bane)');
    T.near(t.shadowburn.directDmg, (266 + 0.429 * 700) * 1.10, 1e-9, 'Shadowburn: no Spellstone SP, AgF only');
    T.near(t.corruption.cast, 1.2, 1e-9, 'Corruption cast 2.0 − 0.8 (Improved Corruption 2/5)');
  });

  T.run('table demo', function () {
    T.group('spell table: Gnome / demo_pact_succ');
    var st = WL.computeStats(B.demo_pact_succ, 'gnome', cfg), t = WL.buildSpellTable(B.demo_pact_succ, st, cfg);
    T.near(t.soulFire.cd, 6, 1e-9, 'Soul Fire CD 60 × (1 − 90%) (Decimation 2/2)');
    T.near(t.shadowBolt.sp, 781, 1e-9, 'SB SP = 700 + 60 (DK) + 21 (Spellstone)');
    T.near(t.shadowBolt.directDmg, (251 + 0.857 * 781) * 1.15 * 1.10 * 1.03, 1e-9, 'SB = base × DS Imp × MD Succ × Soul Link');
    T.near(t.shadowBolt.critMult, 2.0, 1e-12, 'SB crit mult 2.0 (Ruin)');
  });
})();
