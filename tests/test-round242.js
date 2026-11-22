// Round 242 tests (user: "move multi-dot above life tap for all builds"): with 2-3 targets and "Keep DoTs on the extra
// targets" on, WL.effectiveRotation puts multi-DoT right above "Life Tap when needed" (lifeTapNeed) when that comes
// before the filler — the placement measured in round 241 (docs/04_EXPLORATION.md section 69) [A61]. Never below
// "Shadow Bolt an extra target"; a list that places multi-DoT itself keeps its place; no lifeTapNeed = right before
// the filler, as before.
(function () {
  function cfgWith(targets, multi) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.targets = targets; c.fight.multiDot = multi;
    return c;
  }
  function tb(rot, extra) { return Object.assign({ key: 't242', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }, extra || {}); }
  function eff(b, t, md) { return WL.effectiveRotation(b, cfgWith(t, md)); }
  function without(rot) { return rot.filter(function (a) { return a !== 'multiDot'; }); }

  T.run('round 242: multi-DoT above Life Tap when needed', function () {
    T.group('every built-in build, 2 and 3 targets');
    WL.BUILDS.forEach(function (b) {
      var own = WL.expandGroups(b);
      T.ok(own.indexOf('lifeTapNeed') >= 0 && own.indexOf('multiDot') < 0, b.short + ': has Life Tap when needed and does not place multi-DoT itself');
      [2, 3].forEach(function (t) {
        var r = eff(b, t, true);
        T.eq(r.indexOf('multiDot') + 1, r.indexOf('lifeTapNeed'), b.short + ', ' + t + ' targets: multi-DoT right above Life Tap when needed', r.join(' > '));
        T.eq(without(r).join(','), own.join(','), b.short + ', ' + t + ' targets: the rest of the order unchanged');
        var fi = r.map(function (a) { var A = WL.actionOf(a, b); return !!(A && (A.filler || A.preFiller)); }).indexOf(true);
        T.ok(r.indexOf('multiDot') < fi, b.short + ', ' + t + ' targets: still above the filler');
      });
      T.eq(eff(b, 3, false).join(','), own.join(','), b.short + ': multi-DoT off → the build\'s own order');
      T.eq(eff(b, 1, true).join(','), own.join(','), b.short + ': 1 target → the build\'s own order');
    });
    var fd = WL.BUILDS.filter(function (b) { return b.rotation.indexOf('lifeTapPet') >= 0; })[0];
    if (fd) {
      var rf = eff(fd, 3, true);
      T.ok(rf.indexOf('lifeTapPet') < rf.indexOf('multiDot'), fd.short + ': the pet Life Tap keeps its place above multi-DoT (only Life Tap when needed moves it)', rf.join(' > '));
    }

    T.group('lists of your own');
    var mine = tb(['corruption', 'immolate', 'lifeTapNeed', 'multiDot', 'shadowBolt']);
    T.eq(eff(mine, 3, true).join(','), mine.rotation.join(','), 'a list that places multi-DoT itself keeps its place (below Life Tap here)');
    var noTap = tb(['corruption', 'immolate', 'lifeTapBelow', 'shadowBolt']);
    T.eq(eff(noTap, 2, true).join(','), 'corruption,immolate,lifeTapBelow,multiDot,shadowBolt', 'no Life Tap when needed: right before the filler, as before (other Life Taps do not move it)');
    var spreadFirst = tb(['corruption', 'shadowBoltSpread', 'lifeTapNeed', 'shadowBolt']);
    T.eq(eff(spreadFirst, 3, true).join(','), 'corruption,multiDot,shadowBoltSpread,lifeTapNeed,shadowBolt', 'Shadow Bolt an extra target above the Life Tap: multi-DoT right above the spread action (never below it)');
    var tapFirst = tb(['corruption', 'lifeTapNeed', 'shadowBoltSpread', 'shadowBolt']);
    T.eq(eff(tapFirst, 3, true).join(','), 'corruption,multiDot,lifeTapNeed,shadowBoltSpread,shadowBolt', 'Life Tap above the spread action: multi-DoT right above the Life Tap');
    var tapLow = tb(['corruption', 'shadowBolt', 'lifeTapNeed']);
    T.eq(eff(tapLow, 2, true).join(','), 'corruption,multiDot,shadowBolt,lifeTapNeed', 'Life Tap below the filler: multi-DoT stays right before the filler');
    var grouped = tb(['corruption', 'group:Mana', 'shadowBolt'], { groups: { Mana: ['lifeTapNeed', 'activateTrinket'] } });
    T.eq(eff(grouped, 2, true).join(','), 'corruption,multiDot,lifeTapNeed,activateTrinket,shadowBolt', 'Life Tap when needed inside a group: above it once the group is put in place');

    T.group('in a fight');
    var top = WL.BUILDS[0];
    var r = WL.simulateOnce(top, 'human', cfgWith(3, true), { seed: 42, duration: 120, log: true });
    T.ok(['x2:corruption', 'x3:corruption'].every(function (k) { return r.log.some(function (e) { return e.type === 'cast' && e.spell === k; }); }), top.short + ': both extra targets get their Corruption');
    T.ok(r.lifeTaps > 0, top.short + ': Life Tap when needed still taps (' + r.lifeTaps + ' Life Taps)');
  });
})();
