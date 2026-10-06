// Round 104 tests (user): priority action "Life Tap when mana is below _% and more than _ s remain" with two numbers the
// player fills in (build.params.lifeTapBelow = { pct, sec }; defaults 40 / 25). The automatic Life Tap is unchanged.
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull';
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    return c;
  }
  function tb(rot, params) { var b = { key: 't104', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; if (params) b.params = params; return b; }
  var DUR = 120;
  function run(b) { return WL.simulateOnce(b, 'human', det(), { seed: 1, duration: DUR, log: true }); }
  // Every Life Tap of a fight: when, and the mana right before it.
  function taps(r) { return r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'lifeTap'; }).map(function (e) { return { t: e.t, before: e.mana - e.gain }; }); }
  function shipped(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === k; })[0])); }
  // A built-in build as it was before round 105: without the action and its numbers.
  function bare(k) { var b = shipped(k); b.rotation = b.rotation.filter(function (a) { return a !== 'lifeTapBelow'; }); delete b.params; return b; }

  T.run('round 104: Life Tap below a mana % with time left', function () {
    T.group('the action and its numbers');
    var A = WL.ACTIONS.lifeTapBelow;
    T.ok(A && !A.filler && A.label === 'Life Tap when mana is below _% and more than _ s remain', 'priority action "' + (A && A.label) + '"');
    T.eq(A.params.map(function (p) { return p.key + ':' + p.def + ':' + p.min + '-' + p.max; }).join(' '), 'pct:40:1-100 sec:25:0-3600', 'two numbers: mana % (default 40) and seconds left (default 25)');
    T.ok(WL.editorActions().indexOf('lifeTapBelow') >= 0, 'offered in the build editor');
    var b0 = tb(['lifeTapBelow', 'shadowBolt']), b1 = tb(['lifeTapBelow', 'shadowBolt'], { lifeTapBelow: { pct: 60, sec: 10 } });
    T.eq(JSON.stringify(WL.actionParams(b0, 'lifeTapBelow')), '{"pct":40,"sec":25}', 'not set → 40% and 25 s');
    T.eq(JSON.stringify(WL.actionParams(b1, 'lifeTapBelow')), '{"pct":60,"sec":10}', 'the build\'s own numbers are used');
    T.eq(WL.actionLabel(b0, 'lifeTapBelow'), 'Life Tap when mana is below 40% and more than 25 s remain', 'label with the defaults');
    T.eq(WL.actionLabel(b1, 'lifeTapBelow'), 'Life Tap when mana is below 60% and more than 10 s remain', 'label with the build\'s numbers');
    T.eq(WL.actionLabel(b0, 'corruption'), WL.ACTIONS.corruption.label, 'actions without numbers keep their label');

    T.group('in a fight (Shadow Bolt filler, ' + DUR + ' s)');
    var c = det(), st = WL.computeStats(b0, 'human', c), max = st.maxMana, cost = WL.buildSpellTable(b0, st, c).shadowBolt.cost;
    var plain = run(tb(['shadowBolt'])), r0 = run(b0), t0 = taps(r0), tp = taps(plain);
    var early = t0.filter(function (x) { return x.t <= DUR - 25 - 1e-6; }), late = t0.filter(function (x) { return x.t > DUR - 25 + 1e-6; });
    T.ok(early.length >= 3 && early.every(function (x) { return x.before < 0.4 * max; }), 'every Life Tap with more than 25 s left: mana below 40% (' + early.length + ' taps, highest ' +
      Math.round(100 * Math.max.apply(null, early.map(function (x) { return x.before; })) / max) + '% of ' + Math.round(max) + ')');
    T.ok(early.some(function (x) { return x.before >= cost; }), 'it taps before mana runs out (with ' + Math.round(Math.max.apply(null, early.map(function (x) { return x.before; }))) + ' mana, a Shadow Bolt costs ' + cost + ')');
    T.ok(tp.every(function (x) { return x.before < cost; }), 'without the action: only the automatic Life Tap, below the next spell\'s cost');
    T.ok(t0[0].t < tp[0].t - 1, 'the first Life Tap comes earlier (' + t0[0].t.toFixed(1) + ' s vs ' + tp[0].t.toFixed(1) + ' s)');
    T.ok(late.every(function (x) { return x.before < cost; }), 'in the last 25 s only the automatic Life Tap is left (' + late.length + ' taps)');
    var r80 = run(tb(['lifeTapBelow', 'shadowBolt'], { lifeTapBelow: { pct: 80, sec: 0 } })), t80 = taps(r80);
    T.ok(t80.every(function (x) { return x.before < 0.8 * max; }) && t80.some(function (x) { return x.before >= 0.4 * max; }) && t80.length > t0.length,
      '80% / 0 s: taps already below 80% mana, more often (' + t80.length + ' vs ' + t0.length + ')');
    T.ok(t80.some(function (x) { return x.t > DUR - 25 && x.before >= cost; }), '80% / 0 s: also in the last 25 s');
    var never = run(tb(['lifeTapBelow', 'shadowBolt'], { lifeTapBelow: { pct: 40, sec: 3600 } }));
    T.eq(never.total, plain.total, 'more seconds than the fight has: never fires, the fight equals one without the action');
    var low = run(tb(['shadowBolt', 'lifeTapBelow']));
    T.eq(low.total, plain.total, 'placed after the filler it is never reached');

    T.group('checks and build codes');
    var ok = bare('demo_pact_succ_sb'); ok.rotation.splice(ok.rotation.length - 1, 0, 'lifeTapBelow');
    T.eq(WL.validateBuild(ok).join(' | '), '', 'legal in a build with the defaults');
    [{ pct: 0, sec: 25 }, { pct: 150, sec: 25 }, { pct: 40, sec: -1 }, { pct: NaN, sec: 25 }].forEach(function (p) {
      var bad = JSON.parse(JSON.stringify(ok)); bad.params = { lifeTapBelow: p };
      T.ok(WL.validateBuild(bad).some(function (e) { return /must be a number from/.test(e); }), 'refused: ' + p.pct + '% / ' + p.sec + ' s');
    });
    var mine = JSON.parse(JSON.stringify(ok)); mine.params = { lifeTapBelow: { pct: 55, sec: 12 } };
    var back = WL.decodeBuild(WL.encodeBuild(mine));
    T.eq(JSON.stringify(back.params), '{"lifeTapBelow":{"pct":55,"sec":12}}', 'a build code carries the numbers');
    T.eq(back.rotation.join(','), mine.rotation.join(','), '… and the priority list');
    T.ok(WL.decodeBuild(WL.encodeBuild(ok)).params === undefined, 'defaults are not written into the code');
    var gone = JSON.parse(JSON.stringify(mine)); gone.rotation = gone.rotation.filter(function (a) { return a !== 'lifeTapBelow'; });
    T.ok(WL.decodeBuild(WL.encodeBuild(gone)).params === undefined, 'numbers of an action that is not in the list are left out');
    var old = WL.decodeBuild(WL.encodeBuild(bare('sm_ruin_classic')));
    T.ok(old.params === undefined && old.rotation.indexOf('lifeTapBelow') < 0, 'older codes without the action still load');

    T.group('built-in builds (round 105, user: the best setting found, on every build)');
    var WANT = { demo_pact_succ_sb: '80/45', aff_pact_succ_sb: '80/45', demo_pact_succ_fire: '70/45', demo_pact_fire: '80/45', destro_incin_succ: '50/25', aff_pact_fire: '80/45',
      demo_pact_imp_sb: '60/10', aff_pact_succ_drain: '60/10', destro_incin_imp: '40/60', aff_succ_sb: '60/10', sm_ruin_classic: '40/25', ds_ruin_classic: '50/25', wrack_succubus: '60/25' };
    // Round 110: five of them were taken off the sheet (tests/retired-builds.js); their settings are still checked.
    var own = WL.BUILDS.filter(function (b) { return !b.custom; }).concat(WL.RETIRED_BUILDS);
    T.eq(own.length, Object.keys(WANT).length, own.length + ' builds: ' + (own.length - WL.RETIRED_BUILDS.length) + ' on the sheet + ' + WL.RETIRED_BUILDS.length + ' taken off it in round 110');
    own.forEach(function (b) {
      var p = WL.actionParams(b, 'lifeTapBelow'), n = b.rotation.length;
      T.ok(b.rotation[n - 2] === 'lifeTapBelow' && WL.ACTIONS[b.rotation[n - 1]].filler && b.rotation.indexOf('lifeTapBelow') === n - 2, b.short + ': the action sits right above the filler, once');
      T.eq(p.pct + '/' + p.sec, WANT[b.key], b.short + ': ' + WL.actionLabel(b, 'lifeTapBelow'));
      T.eq(WL.validateBuild(b).join(' | '), '', b.short + ': still a legal build');
      T.eq(JSON.stringify(WL.decodeBuild(WL.encodeBuild(b)).params), JSON.stringify(b.params), b.short + ': its build code carries the numbers');
    });
  });
})();
