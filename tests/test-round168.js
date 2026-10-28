// Round 168 tests (user): a Life Tap that looks at the mana the rest of the fight needs (lifeTapNeed); Wrack Succubus waits
// for its DoTs; pre-pull Soul Fire is an option, off by default.
(function () {
  function det(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function taps(r) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'lifeTap'; }).length; }
  T.run('round 168: Life Tap when the rest of the fight needs it', function () {
    var A = WL.ACTIONS.lifeTapNeed;
    T.ok(A && JSON.stringify(A.params.map(function (p) { return p.key + p.def; })) === '["pct90","sec10"]', 'an action with a mana % and seconds left (defaults 90 / 10)');
    T.ok(WL.editorActions().indexOf('lifeTapNeed') >= 0, 'offered in the build editor');
    WL.BUILDS.filter(function (b) { return !b.custom; }).forEach(function (b) { T.ok(b.rotation.indexOf('lifeTapNeed') >= 0 && b.rotation.indexOf('lifeTapBelow') < 0 && b.params.lifeTapNeed, b.short + ': uses it, with its own numbers'); });

    T.group('with little mana it taps; with plenty it waits');
    var b = sheet('demo_pact_succ_sb'), plain = b;
    var old = sheet('demo_pact_succ_sb'); old.rotation = old.rotation.map(function (a) { return a === 'lifeTapNeed' ? 'lifeTapBelow' : a; }); old.params = { lifeTapBelow: b.params.lifeTapNeed };
    var r1 = WL.simulateOnce(plain, 'human', det(), { seed: 3, duration: 180, log: true }), r0 = WL.simulateOnce(old, 'human', det(), { seed: 3, duration: 180, log: true });
    T.ok(Math.abs(taps(r1) - taps(r0)) <= 2, 'default settings: about as many taps as "below 80%" (' + taps(r1) + ' vs ' + taps(r0) + ')');
    var rich = function (c) { c.buffs.innervate.on = true; c.buffs.innervate.count = 3; c.buffs.manaTide.on = true; c.consumables.demonicRune.on = true; };
    var q1 = WL.simulateOnce(plain, 'human', det(rich), { seed: 3, duration: 180, log: true }), q0 = WL.simulateOnce(old, 'human', det(rich), { seed: 3, duration: 180, log: true });
    T.ok(taps(q1) < taps(q0), 'with Innervate, Mana Tide and a rune: fewer taps (' + taps(q1) + ' vs ' + taps(q0) + ')');
    var inn = function (r) { return r.log.filter(function (e) { return e.type === 'buff' && /Innervate/.test(e.spell || ''); }).length; };
    T.ok(inn(q1) >= inn(q0), 'Innervate used at least as often (' + inn(q1) + ' vs ' + inn(q0) + '): the free mana comes first');
  });
  T.run('round 168: Wrack Succubus, pre-pull Soul Fire', function () {
    var w = sheet('wrack_succubus');
    T.ok(w.actWhen && w.actWhen.wrack && w.rotation[w.rotation.length - 1] === 'shadowBolt' && w.rotation[w.rotation.length - 2] === 'wrack', 'Wrack with its condition, Shadow Bolt below it');
    T.eq(WL.validateBuild(w).length, 0, 'a legal build');
    var A = WL.actionOf('wrack', w);
    T.ok(A && A.preFiller && !A.filler && /only when/.test(A.label), 'Wrack with a condition is a filler that can pass (Shadow Bolt then): ' + A.label);
    T.eq(WL.DEFAULT_CONFIG.fight.precast, '', 'pre-pull cast: off by default');
    T.ok(WL.PRECAST_SPELLS.indexOf('soulFire') >= 0, 'Soul Fire can be chosen as the pre-pull cast');
  });
})();
