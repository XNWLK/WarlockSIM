// Round 98 tests (user): priority action "Searing Pain in the execute phase only to trigger Decimation"
// (searingPainDecimation) — one Searing Pain right before Soul Fire is ready, the filler stays the filler.
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    return c;
  }
  function tb(rot, t) { return { key: 't98', short: 't', name: 't', notes: '', talents: t || { decimation: 2 }, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && (!k || e.spell === k); }); }
  function shipped(k) { return JSON.parse(JSON.stringify(WL.findBuild(k))); }   // round 110: also the builds taken off the sheet
  var DUR = 120, EX = DUR * (1 - WL.DEFAULT_CONFIG.fight.executePct / 100);   // boss health falls evenly: execute from 78 s

  T.run('round 98: Searing Pain only to trigger Decimation', function () {
    T.group('the action');
    var A = WL.ACTIONS.searingPainDecimation;
    T.ok(A && !A.filler && /only to trigger Decimation/.test(A.label), 'priority action "' + (A && A.label) + '"');
    T.ok(WL.editorActions().indexOf('searingPainDecimation') >= 0, 'offered in the build editor');
    var no = shipped('sm_ruin_classic');
    no.rotation.splice(no.rotation.length - 1, 0, 'soulFire', 'searingPainDecimation');
    T.ok(WL.validateBuild(no).some(function (e) { return /Decimation talent/.test(e); }), 'the editor refuses it without the Decimation talent');
    var ok = shipped('aff_pact_succ_drain');
    ok.rotation = ok.rotation.map(function (a) { return a === 'searingPainExecute' ? 'searingPainDecimation' : a; });
    T.eq(WL.validateBuild(ok).join(' | '), '', 'legal in Aff Pact Drain Life Succubus');
    T.eq(WL.decodeBuild(WL.encodeBuild(ok)).rotation.join(','), ok.rotation.join(','), 'survives a build-code round trip');

    T.group('timing (Decimation 2/2, Drain Life filler)');
    [['soulFire', 'searingPainDecimation', 'drainLife'], ['searingPainDecimation', 'soulFire', 'drainLife']].forEach(function (rot) {
      var r = WL.simulateOnce(tb(rot), 'human', det(), { seed: 1, duration: DUR, log: true });
      var all = casts(r).filter(function (e) { return e.spell !== 'lifeTap'; }), sp = casts(r, 'searingPain'), sf = casts(r, 'soulFire');
      T.ok(sp.length >= 3 && sp.every(function (e) { return e.t >= EX - 1e-6; }), rot[0] + ' first: no Searing Pain before the execute phase (' + sp.length + ' casts, first at ' + (sp[0] && sp[0].t.toFixed(1)) + ' s, execute from ' + EX + ' s)');
      T.ok(sp.every(function (e) { var nx = all[all.indexOf(e) + 1]; return nx && nx.spell === 'soulFire'; }), rot[0] + ' first: every Searing Pain is followed by a Soul Fire');
      T.eq(sf.length, sp.length, rot[0] + ' first: one Searing Pain per Soul Fire (' + sf.length + ' Soul Fires, all under Decimation: ' +
        sf.every(function (e) { return e.castTime < 4; }) + ')');
      T.ok(sf.every(function (e) { return e.castTime < 4; }), rot[0] + ' first: every Soul Fire has the short Decimation cast (' + (sf[0] && sf[0].castTime) + ' s)');
      T.ok(casts(r, 'drainLife').some(function (e) { return e.t > EX + 5; }), rot[0] + ' first: Drain Life stays the filler in the execute phase');
      var sfLen = sf[0].castTime;
      T.ok(sp.every(function (e) { return e.t + e.castTime + sfLen <= DUR + 1e-6; }), rot[0] + ' first: no Searing Pain when the Soul Fire could not be cast before the boss dies (last at ' + sp[sp.length - 1].t.toFixed(1) + ' s)');
    });
    var spam = WL.simulateOnce(tb(['soulFire', 'searingPainExecute', 'drainLife']), 'human', det(), { seed: 1, duration: DUR, log: true });
    var one = WL.simulateOnce(tb(['soulFire', 'searingPainDecimation', 'drainLife']), 'human', det(), { seed: 1, duration: DUR, log: true });
    T.ok(casts(spam, 'searingPain').length >= 1.5 * casts(one, 'searingPain').length, '"Searing Pain in the execute phase" casts many more (' + casts(spam, 'searingPain').length + ' vs ' + casts(one, 'searingPain').length + ')');

    T.group('does nothing when there is nothing to trigger');
    var noSf = WL.simulateOnce(tb(['searingPainDecimation', 'drainLife']), 'human', det(), { seed: 1, duration: DUR, log: true });
    T.eq(casts(noSf, 'searingPain').length, 0, 'no Soul Fire action in the list: never cast');
    var c0 = det(); c0.fight.travelMs = 0;
    var sb = WL.simulateOnce(tb(['soulFire', 'searingPainDecimation', 'shadowBolt']), 'human', c0, { seed: 1, duration: DUR, log: true });
    T.ok(casts(sb, 'searingPain').length < casts(sb, 'soulFire').length, 'Shadow Bolt filler (triggers Decimation itself): only where no Shadow Bolt landed since the last Soul Fire (' + casts(sb, 'searingPain').length + ' Searing Pain, ' + casts(sb, 'soulFire').length + ' Soul Fires)');

    T.group('shipped builds unchanged');
    T.ok(WL.BUILDS.every(function (b) { return b.rotation.indexOf('searingPainDecimation') < 0; }), 'no built-in build uses it (the Drain Life build does better with Searing Pain for the whole execute phase)');
  });
})();
