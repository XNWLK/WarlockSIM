// Round 153 tests (user): Amplify Curse takes its Bane of Agony's final value after all calculations and multiplies it by
// 1.5 (rounds 25–152: the base value only).
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.combat.baseCritPct = 0;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.fight.duration = 30; c.options.useCurseOfElements = false; c.combat.levelResist.on = false;
    c.options.includePetDamage = false; c.options.activesPolicy = 'pull'; c.options.dotEndCheck = false;
    ['buffs', 'debuffs', 'consumables'].forEach(function (g) { Object.keys(c[g]).forEach(function (k) { c[g][k].on = false; }); });
    return c;
  }
  function tb(talents) { return { key: 't153', short: 't', name: 't', notes: '', talents: talents, pet: null, sacrifice: null, oil: 'none', rotation: ['bane', 'shadowBolt'] }; }

  T.run('round 153: Amplify Curse × 1.5 on the whole Bane of Agony', function () {
    T.group('every tick × 1.5, after the talents');
    var t = { shadowMastery: 5, improvedBaneOfAgony: 2 }, ta = JSON.parse(JSON.stringify(t)); ta.amplifyCurse = 1;
    var c = det(), r0 = WL.simulateOnce(tb(t), 'human', c, { seed: 2, log: true }), r1 = WL.simulateOnce(tb(ta), 'human', c, { seed: 2, log: true });
    var b0 = r0.bySpell.baneOfAgony, b1 = r1.bySpell.baneOfAgony;
    T.ok(b0 && b1 && b0.dmg > 0, 'Bane of Agony ticks in both fights');
    T.near(b1.dmg / b0.dmg, 1.5, 1e-9, 'with Shadow Mastery 5/5 and Improved Bane of Agony 2/2 too: × 1.5 exactly (not 1 + 10% + 10% + 50%)');
    var tk = function (r) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfAgony'; }); };
    var k0 = tk(r0), k1 = tk(r1);
    T.ok(k0.length === k1.length && k1.every(function (e, i) { return Math.abs(e.dmg - 1.5 * k0[i].dmg) <= 1; }), 'each of the ' + k1.length + ' ticks × 1.5 (ramp included)');
    T.eq(r1.log.filter(function (e) { return e.type === 'buff' && e.spell === 'amplifyCurse'; }).length, 1, 'used once in 30 s (3 min cooldown)');

    T.group('"show the maths"');
    var ex = WL.explainSpell(tb(ta), 'human', c, 'baneOfAgony');
    var note = ex && ex.notes.filter(function (n) { return /Amplify Curse/.test(n); })[0];
    T.ok(note && /× 1\.5, after everything else/.test(note) && !/base/.test(note), 'the note says × 1.5 on every tick', note);
  });
})();
