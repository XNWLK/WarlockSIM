// Round 161 tests: racials from the patch notes of 2026-10-26 (user) [A100].
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.options.includePetDamage = true;
    if (f) f(c);
    return c;
  }
  function tb(pet, t) { return { key: 't161', short: 't', name: 't', notes: '', talents: t || {}, pet: pet, sacrifice: null, oil: 'none', rotation: ['shadowBolt'] }; }
  T.run('round 161: Human and Orc racials (patch notes of 2026-10-26)', function () {
    var c = det(), b = tb('succubus'), H = WL.RACES.human.racials, O = WL.RACES.orc.racials;
    var by = function (list, n) { return list.filter(function (r) { return r.name === n; })[0]; };
    T.eq(by(H, 'The Human Spirit').value, 10, 'The Human Spirit: +10% Spirit (was 5%)');
    T.eq(by(H, 'Ruthless').value, 1, 'Ruthless: +1% crit (was 2%)');
    T.ok(!by(O, 'Savage') && by(O, 'Command') && by(O, 'Command').effect === 'petDmgPct' && by(O, 'Command').value === 5, 'Orc: Savage gone, Command (+5% demon damage) back');
    T.ok(/10%/.test(WL.SPELL_TEXT[20598]) && /1%/.test(WL.SPELL_TEXT[20597]) && /pets increased by 5%/.test(WL.SPELL_TEXT[20575]) && !WL.SPELL_TEXT[20574], 'tooltips follow');
    var sH = WL.computeStats(b, 'human', c), sO = WL.computeStats(b, 'orc', c), sN = WL.computeStats(b, 'none', c);
    T.near(sH.critPct - sN.critPct, 1, 1e-9, 'Human crit +1 vs no race');
    T.near(sO.critPct - sN.critPct, 0, 1e-9, 'Orc: no crit racial');
    // Command: every demon hit × 1.05 (spells, melee, Demonic Brand bonus) — same fight with and without it.
    var noCmd = det(); var oc = JSON.parse(JSON.stringify(WL.RACES.orc));
    var r1 = WL.simulateOnce(b, 'orc', c, { seed: 5, duration: 120 });
    var save = WL.RACES.orc.racials; WL.RACES.orc.racials = save.filter(function (r) { return r.name !== 'Command'; });
    var r0; try { r0 = WL.simulateOnce(b, 'orc', noCmd, { seed: 5, duration: 120 }); } finally { WL.RACES.orc.racials = save; }
    ['pet:melee', 'pet:lashOfPain'].forEach(function (k) {
      var a = r1.bySpell[k], z = r0.bySpell[k];
      T.ok(a && z && a.casts === z.casts, k + ': same rolls with and without Command');
      T.near(a.dmg / z.dmg, 1.05, 1e-9, k + ': × 1.05 with Command');
    });
    T.near(r1.bySpell.shadowBolt.dmg, r0.bySpell.shadowBolt.dmg, 1e-6, 'your own spells: unchanged');
    var e = WL.explainSpell(b, 'orc', c, 'pet:lashOfPain');
    T.ok(e && e.steps.some(function (s) { return /Command/.test(s.calc); }), 'the Lash of Pain explanation lists Command');
  });
})();
