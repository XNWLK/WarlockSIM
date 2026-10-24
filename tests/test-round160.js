// Round 160 tests (user): Aff Pact Shadow Bolt Succubus off the sheet; "SM Ruin (classic)" is now "SM Ruin".
(function () {
  T.run('round 160: Aff Pact Shadow Bolt off the sheet, SM Ruin renamed', function () {
    var own = WL.BUILDS.filter(function (b) { return !b.custom; });
    T.ok(own.every(function (b) { return b.key !== 'aff_pact_succ_sb'; }), 'Aff Pact Shadow Bolt Succubus is off the sheet');
    var gone = WL.findBuild('aff_pact_succ_sb');
    T.ok(!!gone && WL.RETIRED_BUILDS.indexOf(gone) >= 0 && WL.validateBuild(gone).length === 0, 'kept as a legal test fixture');
    var sm = WL.findBuild('sm_ruin_classic');
    T.ok(WL.BUILDS.indexOf(sm) >= 0 && sm.short === 'SM Ruin' && /^SM Ruin – /.test(sm.name), 'SM Ruin: same key, new name (' + sm.short + ')');
    T.ok(own.every(function (b) { return !/classic/i.test(b.short + ' ' + b.name); }), 'no build on the sheet is called "classic"');
    var code = WL.encodeBuild(sm), back = WL.decodeBuild(code);
    T.ok(back && JSON.stringify(back.talents) === JSON.stringify(sm.talents), 'SM Ruin build codes still work');
  });
})();
