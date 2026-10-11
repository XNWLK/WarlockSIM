// Round 136 tests (user): the Succubus' melee reaches 5 yards — the same as Lash of Pain. Data only (config.pets.succubus
// .melee.range): the fight engine never checks range, so no fight changes.
(function () {
  T.run('round 136: the Succubus\' melee range is in the data', function () {
    T.group('the data');
    var P = WL.DEFAULT_CONFIG.pets, m = P.succubus.melee;
    T.eq(m.range, 5, 'Succubus melee: 5 yd');
    T.eq(m.range, P.succubus.spell.range, 'the same as Lash of Pain (' + P.succubus.spell.range + ' yd)');
    T.eq([P.felhunter.melee.range, P.voidwalker.melee.range].join('/'), '/', 'Felhunter and Voidwalker: no melee range given (nothing was stated for them)');

    T.group('no fight changes');
    var b = WL.findBuild('demo_pact_succ_sb'), c0 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), c1 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    delete c0.pets.succubus.melee.range; c1.pets.succubus.melee.range = 40;
    var a = WL.simulate(b, 'undead', c0, { iterations: 20, log: false }), z = WL.simulate(b, 'undead', c1, { iterations: 20, log: false });
    T.ok(a.dps === z.dps, 'without the field and with 40 yd: the same DPS over 20 fights (' + a.dps.toFixed(3) + ')');
    T.ok(a.bySpell['pet:melee'].dmg === z.bySpell['pet:melee'].dmg, 'and the same melee damage');
  });
})();
