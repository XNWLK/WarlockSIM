// Round 158 tests: pet melee hit = 8/17 of your spell hit (user) [A99].
(function () {
  function cfg(hit) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.hitPct = hit; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = true;
    c.combat.petMelee.dodgePct = 0; c.combat.petMelee.glancePct = 0;
    return c;
  }
  var b = { key: 't158', short: 't', name: 't', notes: '', talents: {}, pet: 'succubus', sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };

  T.run('round 158: pet melee hit = 8/17 of your spell hit', function () {
    var cb = WL.DEFAULT_CONFIG.combat;
    T.near(cb.petMelee.hitFromSpell, 8 / 17, 1e-12, 'share = 8/17');
    T.near(WL.petMeleeHit(WL.computeStats(b, 'human', cfg(17)), cb), 8, 1e-9, '17% spell hit → 8% melee hit');
    T.near(WL.petMeleeHit(WL.computeStats(b, 'human', cfg(8.5)), cb), 4, 1e-9, '8.5% → 4%');
    T.near(WL.petMeleeHit(WL.computeStats(b, 'human', cfg(0)), cb), 0, 1e-9, 'no hit → 0');
    T.near(WL.petMeleeHit(WL.computeStats(b, 'human', cfg(20)), cb), 160 / 17, 1e-9, '20% (over the cap) → 9.41%: from the stat, not capped');
    // Miss share in a fight: 8% − melee hit. 17% → 0% (round 159); 0% → 8%.
    function missPct(hit) { var sw = 0, mi = 0; for (var s = 1; s <= 30; s++) { var r = WL.simulateOnce(b, 'human', cfg(hit), { duration: 180, seed: s }), row = r.bySpell['pet:melee']; sw += row.casts; mi += row.misses; } return 100 * mi / sw; }
    var m17 = missPct(17), m0 = missPct(0);
    T.eq(+m17.toFixed(6), 0, 'round 159: at 17% spell hit she never misses (' + m17.toFixed(2) + '%)');
    T.ok(!('hitSuppressionPct' in WL.DEFAULT_CONFIG.combat.petMelee), 'round 159: no hit suppression left in the table');
    T.near(m0, 8, 1.5, 'with no hit she misses about 8% (' + m0.toFixed(2) + '%)');
    var spells = 0; for (var s = 1; s <= 10; s++) { var r = WL.simulateOnce(b, 'human', cfg(17), { duration: 120, seed: s }); spells += r.bySpell['pet:lashOfPain'] ? r.bySpell['pet:lashOfPain'].misses : 0; }
    T.eq(spells, 0, 'her spells still use your full hit: no Lash of Pain misses at 100%');
  });
})();
