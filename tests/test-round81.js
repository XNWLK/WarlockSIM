// Round 81 tests (user): "rank 2 shadowbolt has been gutted, you can remove all rank 2 shadow bolt functionalities".
// The spell, its 3 priority actions and its timeline entry are gone; old build codes / saved builds still load (Rank 2
// filler → Shadow Bolt, Rank 2 ISB upkeep → the max-rank one, "Rank 2 below 740 mana" and Rank 2 timeline entries dropped).
(function () {
  T.run('round 81: Shadow Bolt Rank 2 removed', function () {
    T.group('spell, actions, editor lists');
    T.ok(!WL.SPELLS.shadowBoltR2, 'no shadowBoltR2 spell');
    T.ok(!WL.ACTIONS.shadowBoltR2 && !WL.ACTIONS.isbUpkeepR2 && !WL.ACTIONS.shadowBoltR2LowMana, 'no Rank 2 priority actions');
    T.ok(WL.editorActions().every(function (a) { return !/R2/.test(a); }), 'editor offers no Rank 2 action');
    T.ok(WL.TIMELINE_SPELLS.indexOf('shadowBoltR2') < 0 && WL.TIMELINE_SPELLS.indexOf('shadowBolt') >= 0, 'timeline: Shadow Bolt only');
    T.ok(WL.isShadowBolt('shadowBolt') && !WL.isShadowBolt('shadowBoltR2'), 'isShadowBolt: only the max rank');
    T.ok(WL.BUILDS.every(function (b) { return b.rotation.every(function (a) { return WL.ACTIONS[a]; }); }), 'every shipped build uses existing actions only');

    T.group('old build codes still load');
    var old = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'sm_ruin_classic'; })[0]));
    var fi = old.rotation.indexOf('shadowBolt');
    old.rotation.splice(fi, 1, 'isbUpkeepR2', 'shadowBoltR2LowMana', 'shadowBoltR2');
    old.timeline = [{ t: 0, k: 'shadowBoltR2' }, { t: 5, k: 'corruption' }];
    var o = { v: 1, short: 'old', talents: old.talents, pet: old.pet, sacrifice: old.sacrifice, oil: old.oil, rotation: old.rotation, tl: [[0, 'shadowBoltR2'], [5, 'corruption']] };
    var code = WL.BUILD_CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    var d = WL.decodeBuild(code), want = old.rotation.slice(0, fi).concat(['isbUpkeep', 'shadowBolt']);
    T.eq(d.rotation.join(','), want.join(','), 'Rank 2 ISB upkeep → isbUpkeep, Rank 2 filler → shadowBolt, low-mana action dropped');
    T.eq(d.timeline.map(function (e) { return e.k; }).join(','), 'corruption', 'Rank 2 timeline entry dropped');
    T.eq(WL.validateBuild(d).join(' | '), '', 'the migrated build is legal');
    T.eq(WL.migrateRotation(['shadowBolt', 'shadowBoltR2']).join(','), 'shadowBolt', 'no duplicate filler after the migration');
    var bad = JSON.parse(JSON.stringify(old)); bad.rotation = ['shadowBoltR2'];
    T.ok(WL.validateBuild(bad).some(function (e) { return /Unknown priority action/.test(e); }), 'an un-migrated Rank 2 action is refused');
  });
})();
