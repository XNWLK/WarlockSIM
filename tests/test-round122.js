// Round 122 tests (user: "remove build 4 (demo pact shadow bolt imp)"): the build is off the sheet and lives on as a test
// fixture; the other seven builds and their shipped results are untouched.
(function () {
  T.run('round 122: Demo Pact Shadow Bolt Imp off the sheet', function () {
    var own = WL.BUILDS.filter(function (b) { return !b.custom; });
    T.eq(own.length, 7, 'seven builds on the sheet');
    T.ok(own.every(function (b) { return b.key !== 'demo_pact_imp_sb'; }), 'Demo Pact Shadow Bolt Imp is not one of them');
    var b = WL.findBuild('demo_pact_imp_sb');
    T.ok(!!b && WL.RETIRED_BUILDS.indexOf(b) >= 0, 'it is kept as a test fixture');
    T.eq(WL.validateBuild(b).join(' | '), '', 'the fixture is a legal build');
    T.ok(b.pet === 'imp' && b.sacrifice === 'succubus' && b.rotation[b.rotation.length - 1] === 'shadowBolt', 'unchanged: Imp out, Succubus sacrificed, Shadow Bolt filler');
    T.eq(WL.RETIRED_BUILDS.length, 6, 'six fixtures: five from round 110 and this one');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    T.ok(WL.simulate(b, 'undead', c, { iterations: 20, log: false }).dps > 0, 'it still simulates');
    T.ok(WL.decodeBuild(WL.encodeBuild(b)).rotation.join(',') === b.rotation.join(','), 'and still travels in a build code (a code made from it earlier keeps loading)');
    T.ok(own.some(function (x) { return x.pet === 'imp' && x.rotation.indexOf('searingPain') >= 0; }) && own.some(function (x) { return x.key === 'destro_incin_imp'; }),
      'the two other Imp builds stay: Demo Pact Fire Imp and Destro Incinerate Imp');
    if (WL.DEFAULT_RESULTS) {
      T.eq(WL.DEFAULT_RESULTS.keys.indexOf('demo_pact_imp_sb'), -1, 'the shipped default results hold no row of it');
      T.eq(WL.DEFAULT_RESULTS.results.length, 7 * WL.SIM_RACE_KEYS.length, 'shipped default results: 7 builds × ' + WL.SIM_RACE_KEYS.length + ' race rows');
    }
  });
})();
