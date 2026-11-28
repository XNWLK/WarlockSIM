// Round 282 tests — the user, 2026-11-28: "yes apply all three" (round 280's look at Shadow Demo). Two of the three here:
// "Searing Pain to (re)apply Demonic Brand" gets a number, "less than _ s left" (default 0 = only when the brand is down, as
// before), and Shadow Demo uses it at 3 s, with no "Life Tap when needed" while Bane of Doom has 0-15 s left.
(function () {
  function cfgOf(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.concat(WL.RETIRED_BUILDS || []).filter(function (b) { return b.key === k; })[0])); }
  var OLD_FORM = { t: 'all', c: [{ t: 'talent', talent: 'demonicBrand', op: '>=', v: 1 }, { t: 'pet' }, { t: 'brand', op: '<=', v: 0 }] };
  // the action's check on every call in real fights; returns what it saw
  function watch(builds, f, durs) {
    var A = WL.ACTIONS.searingPainBrand, orig = A.pick, seen = { n: 0, bad: [], early: 0 };
    A.pick = function (S) { var r = orig.call(this, S); f(S, r, seen); seen.n++; return r; };
    try { builds.forEach(function (b) { (durs || [120, 300]).forEach(function (d, i) { WL.simulateOnce(b, 'orc', cfgOf(), { seed: 3 + i, duration: d }); }); }); }
    finally { A.pick = orig; }
    return seen;
  }

  T.run('round 282: "Searing Pain to (re)apply Demonic Brand" — less than _ s left', function () {
    T.group('the number');
    var A = WL.ACTIONS.searingPainBrand, P = A.params && A.params[0];
    T.ok(P && P.key === 'sec' && P.def === 0 && P.min === 0 && P.max === 10 && A.params.length === 1, 'one number: seconds left on the brand, default 0, 0 … 10');
    T.ok(/less than _ s left/.test(A.label), 'its label has the "_": ' + A.label);
    var sd = sheet('demo_pact_succ_sb'), fd = sheet('demo_pact_fire');
    T.ok(/less than 3 s left/.test(WL.actionLabel(sd, 'searingPainBrand')), 'Shadow Demo: "' + WL.actionLabel(sd, 'searingPainBrand') + '"');
    T.ok(/less than 0 s left/.test(WL.actionLabel(fd, 'searingPainBrand')), 'Fire Demo: the default 0');
    T.eq(WL.validateBuild(sd).join(' | '), '', 'Shadow Demo is a legal build');
    [-1, 10.5, 11, 'x'].forEach(function (v) {
      var b = sheet('demo_pact_succ_sb'); b.params.searingPainBrand.sec = v;
      T.ok(WL.validateBuild(b).some(function (e) { return /seconds left on the brand must be a number from 0 to 10/.test(e); }), String(v) + ' s is refused');
    });
    var b10 = sheet('demo_pact_succ_sb'); b10.params.searingPainBrand.sec = 10;
    T.eq(WL.validateBuild(b10).join(' | '), '', '10 s is allowed');
    var code = WL.decodeBuild(WL.encodeBuild(sd));
    T.eq(JSON.stringify(code.params), JSON.stringify(sd.params), 'a build code carries the number');

    T.group('default 0: exactly the old check, on every build that uses it');
    var users = WL.BUILDS.concat(WL.RETIRED_BUILDS || []).filter(function (b) { return WL.expandGroups(b).indexOf('searingPainBrand') >= 0; }).map(function (b) {
      var c = JSON.parse(JSON.stringify(b)); if (c.params) delete c.params.searingPainBrand; return c;
    });
    T.ok(users.length >= 2, users.length + ' builds use it (' + users.map(function (b) { return b.short || b.key; }).join(', ') + ')');
    var s0 = watch(users, function (S, r, seen) {
      var old = !S.build.talents.demonicBrand || !S.build.pet ? null : (!S.buff('brand') || !(S.brandCharges > 0)) ? 'searingPain' : null;
      if ((r || null) !== old && seen.bad.length < 5) seen.bad.push(S.build.key + ' at ' + S.t.toFixed(2) + ' s: ' + r + ' vs ' + old);
    });
    T.ok(s0.n > 1000, s0.n + ' checks');
    T.eq(s0.bad.join(' | '), '', 'every decision as before');
    var keep = sheet('demo_pact_fire'), zero = sheet('demo_pact_fire'); zero.params = Object.assign({}, zero.params, { searingPainBrand: { sec: 0 } });
    T.eq(WL.simulateOnce(zero, 'orc', cfgOf(), { seed: 5, duration: 180 }).dps, WL.simulateOnce(keep, 'orc', cfgOf(), { seed: 5, duration: 180 }).dps, 'Fire Demo with 0 written out = Fire Demo (same DPS to the last digit)');

    T.group('3 s: also when the brand has less than 3 s left');
    var s3 = watch([sd], function (S, r, seen) {
      if (!S.buff('brand') || !(S.brandCharges > 0)) { if (r !== 'searingPain' && seen.bad.length < 5) seen.bad.push('down at ' + S.t.toFixed(2)); return; }
      var left = S.buffs.brand - S.t, want = left < 3 ? 'searingPain' : null;
      if (want) seen.early++;
      if ((r || null) !== want && seen.bad.length < 5) seen.bad.push(left.toFixed(2) + ' s left at ' + S.t.toFixed(2) + ' s: ' + r);
    });
    T.eq(s3.bad.join(' | '), '', 'fires when the brand is down, out of charges or has < 3 s left — never with 3 s or more');
    T.ok(s3.early > 10, s3.early + ' times with the brand still up and < 3 s left');
  });

  T.run('round 282: Shadow Demo', function () {
    T.group('its priority');
    var b = sheet('demo_pact_succ_sb');
    T.eq(JSON.stringify(b.rotation), '["deathCoilFinisher","bane","curseOfElements","searingPainBrand","corruption","lifeTapNeed","activateTrinket","shadowBolt"]', 'the priority is unchanged');
    T.eq(JSON.stringify(b.params), '{"searingPainBrand":{"sec":3},"lifeTapNeed":{"pct":80,"sec":45}}', 'Demonic Brand renewed below 3 s; Life Tap numbers as before');
    T.eq(JSON.stringify(b.actWhen), '{"lifeTapNeed":{"t":"any","c":[{"t":"dot","spell":"baneOfDoom","op":"<=","v":0},{"t":"dot","spell":"baneOfDoom","op":">=","v":15}]}}', '"Life Tap when needed" only when Bane of Doom is not up or has 15 s or more left');
    T.ok(/less than 3 s left/.test(b.notes) && /last 15 s of Bane of Doom/.test(b.notes), 'the notes say both');
    T.ok(/Bane of Doom time left <= 0 s or Bane of Doom time left >= 15 s/.test(WL.actionLabel(b, 'lifeTapNeed')), 'the Life Tap action reads: ' + WL.actionLabel(b, 'lifeTapNeed'));

    T.group('a logged fight: no "Life Tap when needed" in the last 15 s of Bane of Doom');
    var A = WL.ACTIONS.lifeTapNeed, orig = A.pick, asked = 0, inside = 0, r;
    A.pick = function (S) { asked++; var d = S.dotLeft('baneOfDoom'); if (d > 0 && d < 15) inside++; return orig.call(this, S); };
    try { r = WL.simulateOnce(b, 'orc', cfgOf(), { seed: 7, duration: 300, log: true }); } finally { A.pick = orig; }
    T.ok(asked > 50 && inside === 0, 'its own check asked ' + asked + ' times, never with Bane of Doom at 0-15 s');
    var dooms = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'baneOfDoom'; }).map(function (e) { return e.t; });
    var taps = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'lifeTap'; }).map(function (e) { return e.t; });
    var dur = WL.SPELLS.baneOfDoom.duration || 60;
    var late = taps.filter(function (t) { return dooms.some(function (d) { return t > d + dur - 15 + 1e-6 && t < d + dur - 1e-6; }); });
    T.ok(dooms.length >= 3 && taps.length > 0, dooms.length + ' Banes of Doom, ' + taps.length + ' Life Taps in 300 s');
    T.eq(late.length, 0, 'no Life Tap in any Bane of Doom\'s last 15 s');
  });

  T.run('round 282: the APL lines of the action', function () {
    T.group('round trip');
    var sd = sheet('demo_pact_succ_sb'), fd = sheet('demo_pact_fire');
    T.eq(JSON.stringify(WL.aplLines('searingPainBrand', fd)), JSON.stringify([{ spell: 'searingPain', when: OLD_FORM }]), 'at 0 s: the line as before (Fire Demo)');
    var L = WL.aplLines('searingPainBrand', sd);
    T.eq(JSON.stringify(L), JSON.stringify([{ spell: 'searingPain', when: { t: 'all', c: [OLD_FORM.c[0], OLD_FORM.c[1], { t: 'any', c: [{ t: 'brand', op: '<=', v: 0 }, { t: 'aura', aura: 'brand', op: '<', v: 3 }] }] } }]), 'at 3 s: "… and (charges <= 0 or Demonic Brand time left < 3 s)"');
    T.ok(/Demonic Brand charges <= 0 or Demonic Brand on the boss time left < 3 s/.test(WL.condText(L[0].when, sd)), 'in words: ' + WL.condText(L[0].when, sd));
    var m = WL.aplMatch(L[0], sd, []);
    T.ok(m && m.key === 'searingPainBrand' && m.params && m.params.sec === 3 && !m.extra, 'that line → the action with 3 s');
    var m0 = WL.aplMatch(WL.aplLines('searingPainBrand', fd)[0], fd, []);
    T.ok(m0 && m0.key === 'searingPainBrand' && !m0.params && !m0.extra, 'the old line → the action, no number to change (Fire Demo)');
    var m1 = WL.aplMatch({ spell: 'searingPain', when: OLD_FORM }, sd, []);
    T.ok(m1 && m1.key === 'searingPainBrand' && m1.params && m1.params.sec === 0, 'the old line in Shadow Demo → the action with 0 s');
    var l5 = JSON.parse(JSON.stringify(L[0])); l5.when.c[2].c[1].v = 5;
    var m5 = WL.aplMatch(l5, fd, []);
    T.ok(m5 && m5.key === 'searingPainBrand' && m5.params && m5.params.sec === 5, 'a line with 5 s → the action with 5 s');
    var l11 = JSON.parse(JSON.stringify(L[0])); l11.when.c[2].c[1].v = 11;
    var m11 = WL.aplMatch(l11, fd, []);
    T.ok(!m11 || m11.key !== 'searingPainBrand', '11 s is out of range: not the action (at most the Searing Pain filler with a condition)');
    var me = WL.aplMatch({ spell: 'searingPain', when: OLD_FORM }, sd, sd.rotation);
    T.ok(!me || me.key !== 'searingPainBrand', 'the old line while the 3 s action is in the priority elsewhere: not that action');
    T.ok(WL.aplMatch(L[0], sd, sd.rotation), 'the same 3 s line next to it: the action');
    var lt = WL.aplLines('lifeTapNeed', sd);
    var mt = WL.aplMatch(lt[0], sd, []);
    T.ok(mt && mt.key === 'lifeTapNeed' && JSON.stringify(mt.extra) === JSON.stringify(sd.actWhen.lifeTapNeed), 'Shadow Demo\'s Life Tap line → "Life Tap when needed" with its Bane of Doom condition');

    T.group('the lines decide like the action');
    var orig = WL.ACTIONS.searingPainBrand.pick, n = 0, bad = [];
    WL.ACTIONS.searingPainBrand.pick = function (S) {
      var r = orig.call(this, S), Ls = WL.aplLines('searingPainBrand', S.build), x = null;
      for (var i = 0; i < Ls.length && !x; i++) if (S.has(Ls[i].spell) && S.ready(Ls[i].spell) && WL.ruleCond(Ls[i].when, S, S.build)) x = Ls[i].spell;
      n++; if ((r || null) !== x && bad.length < 5) bad.push(S.build.key + ' ' + S.t.toFixed(2) + ': ' + r + ' / ' + x);
      return r;
    };
    try {
      [0, 1.5, 3, 6, 10].forEach(function (s, i) {
        [sheet('demo_pact_succ_sb'), sheet('demo_pact_fire')].forEach(function (b) { b.params = Object.assign({}, b.params, { searingPainBrand: { sec: s } }); WL.simulateOnce(b, 'orc', cfgOf(), { seed: 11 + i, duration: 150 }); });
      });
    } finally { WL.ACTIONS.searingPainBrand.pick = orig; }
    T.ok(n > 500, n + ' checks at 0 / 1.5 / 3 / 6 / 10 s');
    T.eq(bad.join(' | '), '', 'the same every time');
  });

  T.run('round 282: the other builds are unchanged', function () {
    T.group('the other builds');
    WL.BUILDS.filter(function (b) { return b.key !== 'demo_pact_succ_sb'; }).forEach(function (b) {
      T.ok(!(b.params && b.params.searingPainBrand) && !(b.actWhen && b.actWhen.searingPainBrand) && !/baneOfDoom/.test(JSON.stringify((b.actWhen || {}).lifeTapNeed || null)), (b.short || b.key) + ': no Demonic Brand number, no Bane of Doom condition on Life Tap');
    });
    var fd = sheet('demo_pact_fire');
    T.ok(fd.rotation.indexOf('searingPainBrand') >= 0 && !(fd.actWhen && fd.actWhen.lifeTapNeed), 'Fire Demo keeps "Searing Pain to (re)apply Demonic Brand" at 0 s (no gain there in round 280)');
  });
})();
