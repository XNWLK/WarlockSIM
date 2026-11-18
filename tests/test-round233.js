// Round 233 tests (user: "yes add the per-level bonus to the sim"): the per-level bonus of the Forever client data
// (the game client's data tables, build 1.60.1.70959: SpellEffect.EffectRealPointsPerLevel, SpellLevels BaseLevel / MaxLevel), at level 60.
(function () {
  T.run('round 233: per-level bonus of the client data (level 60)', function () {
    T.group('the formula');
    T.eq(WL.PLAYER_LEVEL, 60, 'you are level 60');
    T.eq(WL.levelValue({ base: 20, per: 1, from: 6, to: 16 }), 30, 'Life Tap R1 at level 16 = 30 (the user\'s in-game test: "30 + Spirit exactly")');
    T.eq(WL.levelValue({ base: 25.2, per: 1.75, from: 40, to: 60 }), 60.2, 'Wrack: 25.2 + 1.75 × 20 = 60.2 (tooltip 60)');
    T.eq(WL.levelValue({ base: 251, per: 1.8, from: 60, to: 65 }), 251, 'a spell learned at 60 gets no bonus (Shadow Bolt R9 = 251, in game 237–265)');

    T.group('the spells at level 60 (client value → sim value)');
    var EXPECT = { searingPain: ['base', 114, 116.4], shadowburn: ['base', 266, 273.2], soulFire: ['base', 431, 438.6], deathCoil: ['base', 454, 460],
      hellfire: ['tickBase', 206, 210.2], rainOfFire: ['tickBase', 220, 221.2], wrack: ['tickBase', 25.2, 60.2], lifeTap: ['manaBase', 420, 424] };
    Object.keys(EXPECT).forEach(function (k) {
      var s = WL.SPELLS[k], x = EXPECT[k];
      T.ok(s.lvl && s.lvl.base === x[1], k + ': client base ' + x[1], JSON.stringify(s.lvl));
      T.eq(s[x[0]], x[2], k + ' ' + x[0] + ' = ' + x[2]);
      T.eq(WL.levelValue(s.lvl), s[x[0]], k + ': the value is the formula\'s');
    });
    T.eq(WL.SPELLS.lifeTap.healthCost, 424, 'Life Tap costs 424 health (the tooltip text says 430)');
    var fb = WL.DEFAULT_CONFIG.pets.imp.spell;
    T.eq(fb.base, 45.2, 'Imp Firebolt 44 + 0.6 × 2 = 45.2');
    T.eq(WL.levelValue(fb.lvl), fb.base, 'Firebolt: the value is the formula\'s');
    ['shadowBolt', 'immolate', 'incinerate', 'conflagrate', 'corruption', 'baneOfAgony', 'baneOfDoom', 'siphonLife', 'drainLife', 'drainSoul'].forEach(function (k) {
      T.ok(!WL.SPELLS[k].lvl, k + ': no per-level bonus (learned at 60, or 0 per level)');
    });
  });
})();
