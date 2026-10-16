// Round 75 tests (user): your melee crit came from Agility and the Succubus' melee inherited it; Grace of Air Totem and
// Scroll of Agility IV raised it. Round 152 (user) removed all of that — demons crit with your spell crit only, see
// test-round152.js. What is left here: round 74, Demonic Brand applied early.
(function () {
  T.run('round 74: Demonic Brand applied early', function () {
    T.group('Fire builds and Demo Pact SB Imp: the Brand upkeep near the top (10,000 fights +0.03 … +0.16%)');
    var cd = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    ['buffs', 'debuffs'].forEach(function (g) { Object.keys(cd[g]).forEach(function (k) { cd[g][k].on = WL.SHIPPED_ON[g][k]; }); });
    var first = function (b) {
      var e = WL.simulateOnce(b, 'human', cd, { duration: 60, log: true, seed: 7 }).log.filter(function (x) { return x.type === 'cast' && x.spell === 'searingPain'; })[0];
      return e ? e.t : Infinity;
    };
    ['demo_pact_succ_fire', 'demo_pact_fire', 'demo_pact_imp_sb', 'aff_pact_fire'].forEach(function (k) {
      var b = WL.findBuild(k), i = b.rotation.indexOf('searingPainBrand');
      var without = JSON.parse(JSON.stringify(b)); without.rotation = b.rotation.filter(function (a) { return a !== 'searingPainBrand'; });
      var tNow = first(b), tWas = first(without);
      T.ok(i >= 0 && i <= 2 && i < b.rotation.indexOf('curseOfElements') && tNow < tWas && tNow < 4,
        b.short + ': Brand upkeep at #' + (i + 1) + ', first Searing Pain at ' + tNow.toFixed(1) + ' s (without it: ' + tWas.toFixed(1) + ' s)');
    });
    T.group('Shadow Bolt Succubus builds keep Brand after Bane and Curse of the Elements (earlier loses 0.3 … 0.9%)');
    ['demo_pact_succ_sb', 'aff_pact_succ_sb', 'aff_succ_sb'].forEach(function (k) {
      var r = WL.findBuild(k).rotation;
      T.ok(r.indexOf('searingPainBrand') > r.indexOf('curseOfElements') && r.indexOf('curseOfElements') > r.indexOf('bane'), k + ': ' + r.join(' > '));
    });
  });
})();
