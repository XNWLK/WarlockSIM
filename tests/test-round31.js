// Round 31 tests: pet scaling measured in Forever (user) — pet SP 10%, pet AP 1/6 of SP, Demonic Knowledge on the pet,
// pet spell crit = the Warlock's crit. The worked pet tests use the round-2 values pinned in reference-gear.js
// (petSpPct 100 etc.), so these tests set the shipped values explicitly.
(function () {
  function shipped() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.petSpPct = WL.SHIPPED_PETS.petSpPct; c.pets.succubus.melee.apPerSp = WL.SHIPPED_PETS.succApPerSp;
    c.pets.succubus.melee.baseDps = WL.SHIPPED_PETS.succBaseDps; c.pets.succubus.melee.critPct = WL.SHIPPED_PETS.succCrit;
    c.pets.succubus.melee.inheritMeleeCrit = WL.SHIPPED_PETS.succInherit;
    return c;
  }
  function impBuild(talents) {
    return { key: 't31imp', short: 't', name: 't', notes: '', talents: talents, pet: 'imp', sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
  }

  T.run('pet scaling measured in Forever (round 31)', function () {
    T.group('Demonic Knowledge reaches the pet in full; the rest is 10% of your SP');
    var c = shipped(); c.options.useCurseOfElements = false;
    // Demonic Knowledge 3/3 (+60 SP to you and the pet) and only talents without a damage effect (no Soul Link / Unholy
    // Power / Improved Imp / Master Demonologist), so Firebolt = 44 + 0.571 × pet SP exactly (base 44 = Effect Value 45 − 1
    // since round 42). (The engine does not
    // check legality; the point total does not matter here.)
    var b = impBuild({ demonicEmbrace: 5, improvedHealthFunnel: 2, felVitality: 3, demonicAegis: 2, improvedVoidwalker: 1, masterSummoner: 2,
      demonicSacrifice: 1, felDomination: 1, improvedFelhunter: 3, demonicKnowledge: 3 }), st = WL.computeStats(b, 'human', c);
    T.eq(st.dkSp, 60, 'stats.dkSp = 60 with Demonic Knowledge 3/3 and a pet out');
    var r = WL.simulateOnce(b, 'human', c, { seed: 3, duration: 60, log: true }), fb = r.bySpell['pet:firebolt'];
    var petSp = st.sp * 0.10 + 60;                                   // st.sp already includes Demonic Knowledge's 60
    var nonCrit = r.log.filter(function (e) { return e.type === 'pet' && e.spell === 'pet:firebolt' && !e.crit; });
    T.ok(nonCrit.length > 0 && nonCrit.every(function (e) { return Math.abs(e.dmg - Math.round(44 + 0.571 * petSp)) <= 1; }),
      'each non-crit Firebolt = 44 + 0.571 × (10% × ' + st.sp + ' + 60) = ' + (44 + 0.571 * petSp).toFixed(1) + ' (' + nonCrit.length + ' checked)');
    var b0 = impBuild({ demonicEmbrace: 5, improvedHealthFunnel: 2, felVitality: 3 }), st0 = WL.computeStats(b0, 'human', c);
    var r0 = WL.simulateOnce(b0, 'human', c, { seed: 3, duration: 60, log: true });
    var nc0 = r0.log.filter(function (e) { return e.type === 'pet' && e.spell === 'pet:firebolt' && !e.crit; })[0];
    T.near(nc0.dmg, Math.round(44 + 0.571 * st0.sp * 0.10), 1, 'without Demonic Knowledge: Firebolt = 44 + 0.571 × 10% × ' + st0.sp);
    T.ok(fb.hits > 0, 'Imp cast Firebolts (' + fb.hits + ')');

    T.group('Succubus melee: 1 pet AP per 6 SP');
    var m = c.pets.succubus.melee;
    T.near(m.apPerSp * 600, 100, 0.05, '600 SP → 100 pet AP → +' + (100 / 14).toFixed(2) + ' melee DPS');

    T.group('pet spell crit = the Warlock\'s crit (incl. buffs)');
    var cm = shipped(); cm.buffs.moonkinAura.on = true;
    var stc = WL.computeStats(b0, 'human', cm), stn = WL.computeStats(b0, 'human', shipped());
    T.near(stc.critPct - stn.critPct, 3, 1e-9, 'Moonkin aura raises the Warlock\'s crit by 3%');
    var agg = function (cfg) { var x = WL.simulate(b0, 'human', cfg, { iterations: 300, log: false }).bySpell['pet:firebolt']; return 100 * x.crits / x.hits; };
    var a1 = agg(shipped()), a2 = agg(cm);
    T.ok(a2 > a1 + 1.5, 'Firebolt crit rate follows it (' + a1.toFixed(1) + '% → ' + a2.toFixed(1) + '%)');
    T.near(a1, stn.critPct, 1.2, 'Firebolt crit rate ≈ the Warlock\'s crit (' + stn.critPct.toFixed(2) + '%)');

    T.group('Succubus melee crit = her own 7.52% + your MELEE crit − 4.8% crit suppression (rounds 42 and 75; round 32 used your spell crit)');
    var sb = { key: 't32succ', short: 't', name: 't', notes: '', talents: {}, pet: 'succubus', sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
    // Round 42: one-roll attack table — crits are a share of ALL swings (glancing blows take their own 40% slice).
    var meleeCrit = function (cfg) { var x = WL.simulate(sb, 'human', cfg, { iterations: 400, log: false }).bySpell['pet:melee']; return 100 * x.crits / x.casts; };
    var ss = WL.computeStats(sb, 'human', shipped()), expect = WL.SHIPPED_PETS.succCrit + ss.meleeCritPct - 4.8, got = meleeCrit(shipped());
    T.near(got, expect, 1.5, 'melee crit rate ≈ 7.52 + ' + ss.meleeCritPct.toFixed(2) + ' − 4.8 = ' + expect.toFixed(2) + '% of swings (measured ' + got.toFixed(2) + '%)');
    var gotM = meleeCrit(cm);
    T.near(gotM, got, 0.8, 'does not follow your spell crit any more (round 75): Moonkin aura +3% spell crit → ' + gotM.toFixed(2) + '%');
  });
})();
