// Round 152 tests (user): demons crit with your spell crit only — the Succubus' melee too, nothing of her own (rounds
// 75–151: her own 7.52% + your melee crit from Agility). So Agility does nothing: Grace of Air Totem, Scroll of Agility IV,
// the Agility gear box and the melee crit stat are gone; old settings codes with them still load.
(function () {
  // The test page pins the round-2 pet values in DEFAULT_CONFIG (reference-gear.js); use the shipped ones here.
  function shipped(mod) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), m = c.pets.succubus.melee;
    c.petSpPct = WL.SHIPPED_PETS.petSpPct; m.apPerSp = WL.SHIPPED_PETS.succApPerSp; m.baseDps = WL.SHIPPED_PETS.succBaseDps;
    delete m.critPct; m.inheritSpellCrit = WL.SHIPPED_PETS.succInherit;
    ['buffs', 'debuffs'].forEach(function (g) { Object.keys(c[g]).forEach(function (k) { if (k in WL.SHIPPED_ON[g]) c[g][k].on = WL.SHIPPED_ON[g][k]; }); });
    if (mod) mod(c);
    return c;
  }
  var succ = { key: 't152', short: 't', name: 't', notes: '', talents: {}, pet: 'succubus', sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
  function meleeCrit(race, c) { var x = WL.simulate(succ, race, c, { iterations: 600, log: false }).bySpell['pet:melee']; return 100 * x.crits / x.casts; }

  T.run('round 152: demons crit with your spell crit; no Agility', function () {
    T.group('the data has no Agility any more');
    var D = WL.DEFAULT_CONFIG;
    T.ok(!D.buffs.graceOfAir && !D.buffs.scrollOfAgility, 'Grace of Air Totem and Scroll of Agility IV are gone');
    T.ok(!('agi' in D.gear) && WL.GEAR_STAT_KEYS.indexOf('agi') < 0, 'no Agility on the gear sheet or on items');
    T.ok(!('agi' in D.buffs.markOfTheWild), 'Mark of the Wild: no Agility part (Intellect, Spirit, Stamina stay)');
    T.ok(!('agi' in WL.WARLOCK_BASE_60) && WL.RACE_KEYS.every(function (r) { return !('agi' in WL.RACES[r].offset); }), 'no base or race Agility');
    T.ok(!('meleeCritBasePct' in D.combat) && !('agiPerMeleeCrit' in D.combat), 'no melee crit rule');
    var st = WL.computeStats(succ, 'human', shipped());
    T.ok(!('agi' in st) && !('meleeCritPct' in st) && !st.breakdown.some(function (x) { return x.stat === 'agi' || x.stat === 'meleeCritPct'; }), 'the stats have neither Agility nor melee crit');

    T.group('demon melee: crit = your spell crit, nothing of its own');
    ['felhunter', 'voidwalker'].forEach(function (p) {             // the Succubus' shipped values: next check (the test page pins round-2 ones)
      var m = D.pets[p].melee;
      T.ok(m.inheritSpellCrit === true && !m.critPct && !('inheritMeleeCrit' in m), D.pets[p].name + ': crit = your spell crit, no own crit');
    });
    T.ok(WL.SHIPPED_PETS.succInherit === true && WL.SHIPPED_PETS.succCrit == null, 'shipped Succubus (before the test page pins the round-2 values): the same');
    var c0 = shipped(), s0 = WL.computeStats(succ, 'human', c0), m0 = meleeCrit('human', c0);
    T.near(m0, s0.critPct - 4.8, 1.2, 'Succubus crits on ≈ your spell crit ' + s0.critPct.toFixed(2) + '% − 4.8% = ' + (s0.critPct - 4.8).toFixed(2) + '% of swings (measured ' + m0.toFixed(2) + '%)');
    var cM = shipped(function (c) { c.gear.critPct += 5; }), mM = meleeCrit('human', cM);
    T.near(mM - m0, 5, 1.2, '+5% spell crit on gear → about +5 points of her swings crit (' + m0.toFixed(2) + ' → ' + mM.toFixed(2) + '%)');
    var cN = shipped(), mN = meleeCrit('none', cN), sN = WL.computeStats(succ, 'none', cN);
    T.near(s0.critPct - sN.critPct, 1, 1e-9, 'Ruthless: +1% spell crit for a Human (round 161) …');
    T.near(m0 - mN, 2, 1.2, '… and so +2 points of her swings crit (' + mN.toFixed(2) + ' → ' + m0.toFixed(2) + '%)');
    var ex = WL.explainSpell(succ, 'human', c0, 'pet:melee');
    var crit = ex && ex.steps.filter(function (s) { return s.label === 'Crit'; })[0];
    T.ok(crit && /your spell crit/.test(crit.calc) && !/own|melee crit/.test(crit.calc), '"Show the maths": crit = your spell crit − 4.8%', crit && crit.calc);
    T.near(ex.values.crit, s0.critPct - 4.8, 1e-9, '… the same number as the fight uses');

    T.group('old settings codes still load');
    var c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), snap = JSON.parse(JSON.stringify(WL.settingsSnapshot(c2)));
    snap.buffs = snap.buffs.concat(['graceOfAir', 'scrollOfAgility']); snap.gear.agi = 40;
    var unk = WL.applySettings(c2, snap);
    T.eq(unk.join(','), '', 'a code with Agility on the gear, Grace of Air and the Scroll of Agility loads without "unknown" names');
    T.ok(!c2.buffs.graceOfAir && !c2.buffs.scrollOfAgility && !('agi' in c2.gear), '… and none of them comes back');
  });
})();
