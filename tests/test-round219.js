// Round 219 tests (user: "make the sim use trinkets that have an on use effect, find the optimal timer for that. include it
// in the timeline and add the APL for it. make the APL a global 'activate trinket'"): the "Activate trinket" action, its
// effect on the fight, and the trinket rows of the timeline.
(function () {
  function sd() { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === 'demo_pact_succ_sb'; })[0])); }
  function cfg() { var c = WL.pageDefaultConfig(); c.fight.durationVarPct = 0; c.fight.duration = 180; return c; }
  function uses(r) { return r.log.filter(function (e) { return e.type === 'trinket'; }).map(function (e) { return e.t; }); }
  function withAct(b, when) {
    b.rotation = b.rotation.filter(function (a) { return a !== 'activateTrinket'; }); b.rotation.unshift('activateTrinket');
    if (b.actWhen) delete b.actWhen.activateTrinket;
    if (when) { b.actWhen = b.actWhen || {}; b.actWhen.activateTrinket = when; }
    return b;
  }
  T.run('round 219: Activate trinket', function () {
    T.group('the action');
    var A = WL.ACTIONS.activateTrinket;
    T.ok(!!A && /Activate trinket/.test(A.label), 'a built-in priority action: ' + (A && A.label));
    T.ok(WL.editorActions().indexOf('activateTrinket') >= 0, 'in the editor\'s action list');
    T.eq(JSON.stringify(WL.aplTemplate('activateTrinket')), '[{"special":true}]', 'APL view: an action of its own (it uses items, not a spell)');
    var b = withAct(sd());
    T.eq(WL.validateBuild(b).length, 0, 'a legal build with it on top');
    T.eq(WL.decodeBuild(WL.encodeBuild(b)).rotation[0], 'activateTrinket', 'build codes keep it');

    T.group('in a fight (Shadow Demo in its Pre-BiS gear: Weakness Analyzer)');
    // Round 245 (user: "6min cd is correct."): its cooldown is 360 s (was 90), so a 400 s fight shows the second use.
    var r = WL.simulateOnce(b, 'orc', cfg(), { seed: 7, log: true, duration: 400 }), u = uses(r);
    T.ok(u.length >= 2 && u[0] < 1e-6, 'used at the pull (' + u.map(function (t) { return t.toFixed(1); }).join(', ') + ' s)');
    T.ok(u.length >= 2 && u[1] - u[0] >= 360 - 1e-6 && u[1] - u[0] < 365, 'again once its 6 min cooldown is over');
    T.eq(uses(WL.simulateOnce(b, 'orc', cfg(), { seed: 7, log: true })).length, 1, 'a 180 s fight: used once (round 245)');
    var c0 = cfg(); c0.options.trinketUse = { trinket1: 'never', trinket2: 'never' };
    T.eq(uses(WL.simulateOnce(b, 'orc', c0, { seed: 7, log: true })).length, 0, '"never" still keeps it unused');
    var late = withAct(sd(), { t: 'fight', what: 'elapsed', op: '>=', v: 1000 });
    T.eq(uses(WL.simulateOnce(late, 'orc', cfg(), { seed: 7, log: true })).length, 0, 'with the action in the priority, the trinket\'s own "Use" setting is not read (a condition that never holds: no use)');
    var w30 = withAct(sd(), { t: 'fight', what: 'elapsed', op: '>=', v: 30 }), u30 = uses(WL.simulateOnce(w30, 'orc', cfg(), { seed: 7, log: true }));
    T.ok(u30.length >= 1 && u30[0] >= 30 - 1e-6 && u30[0] < 34, 'a condition times it (only after 30 s: first at ' + (u30[0] || 0).toFixed(1) + ' s)');
    var plain = sd(); plain.rotation = plain.rotation.filter(function (a) { return a !== 'activateTrinket'; }); if (plain.actWhen) delete plain.actWhen.activateTrinket;
    var up = uses(WL.simulateOnce(plain, 'orc', cfg(), { seed: 7, log: true }));
    T.ok(up.length >= 1, 'without the action: used as before, by its "Use" setting (' + up.map(function (t) { return t.toFixed(1); }).join(', ') + ' s)');

    T.group('the default builds (user chose "best per build")');
    var B = {}; WL.BUILDS.forEach(function (x) { B[x.key] = x; });
    var fi = function (x) { return x.rotation.indexOf('activateTrinket') === x.rotation.length - 2; };
    T.ok(fi(B.demo_pact_succ_sb) && fi(B.destro_incin_ds) && fi(B.wrack_ds), 'Shadow Demo, Incinerate DS, Wrack DS: right above the filler, no condition');
    T.ok(B.demo_pact_fire.rotation[0] === 'activateTrinket' && JSON.stringify(B.demo_pact_fire.actWhen.activateTrinket) === '{"t":"fight","what":"elapsed","op":">=","v":60}', 'Fire Demo: on top, once 60 s have gone');
    T.ok(B.destro_incin_succ.rotation.indexOf('activateTrinket') < 0, 'Incinerate Pandemic: not in its priority (the old rule was best)');

    T.group('timeline');
    var iv = (r.auras || {})['tr:trinket2'] || [];
    T.ok(iv.length >= 2 && iv[0][0] < 1e-6 && iv[0][1] > 0, 'its effect is a timeline row (tr:trinket2), from the pull');
    T.ok(iv.every(function (x) { return x[1] - x[0] <= 20 + 1e-6; }), 'each stretch at most its 20 s (Weakness Analyzer ends on a direct crit)');
    T.eq(r.trNames && r.trNames.trinket2, 'Weakness Analyzer', 'the row is named after the trinket');
    T.ok(Math.abs(u[1] - iv[1][0]) < 0.002, 'the second stretch starts at the second use (the log keeps milliseconds)');
  });

  // Round 219 (user: "shadow and flame still shows the old 10% tooltip instead of 20. update that and check if any other
  // tooltips are outdated. make sure it's not just the tooltip that's messed up, make sure the functionality works properly").
  T.run('round 219: outdated tooltips, Shadow and Flame in the fight', function () {
    T.group('tooltips match the values the sim uses');
    var bad = [];
    WL.TALENTS.forEach(function (t) {
      var txt = WL.TALENT_TEXT[t.key] || [];
      Object.keys(t.v || {}).forEach(function (k) {
        var a = t.v[k]; if (!Array.isArray(a)) return;
        a.forEach(function (val, r) {
          var nums = String(txt[r] || '').replace(/ for 20 sec/g, '').match(/\d+(\.\d+)?/g) || [];
          if (!nums.some(function (n) { return Math.abs(+n - val) < 1e-9 || Math.abs(+n - val * 100) < 1e-9; })) bad.push(t.key + ' ' + k + ' rank ' + (r + 1));
        });
      });
    });
    T.eq(bad.join(', '), '', 'every talent value is in its rank\'s tooltip (Shadow and Flame\'s "20 sec" left out of the check)');
    T.ok(/by 20% for 20 sec/.test(WL.TALENT_TEXT.shadowAndFlame[4]) && /by 4% for 20 sec/.test(WL.TALENT_TEXT.shadowAndFlame[0]) && /100% chance/.test(WL.TALENT_TEXT.shadowAndFlame[4]), 'Shadow and Flame: 4% … 20% (patch of 2026-11-03), 20% … 100% chances');
    var rc = function (race, name) { return WL.RACES[race].racials.filter(function (x) { return x.name === name; })[0]; };
    var tg = rc('undead', 'Touch of the Grave'), bz = rc('troll', 'Berserking');
    T.ok(new RegExp('\\(' + tg.icd + ' sec cooldown\\)').test(WL.SPELL_TEXT[tg.id]), 'Touch of the Grave: ' + tg.icd + ' s cooldown in its tooltip (was 25)');
    T.ok(new RegExp('for ' + bz.duration + ' sec').test(WL.SPELL_TEXT[bz.id]), 'Berserking: ' + bz.duration + ' s in its tooltip (was 10)');

    T.group('Shadow and Flame works in the fight (Incinerate DS, 5/5)');
    var b = WL.BUILDS.filter(function (x) { return x.key === 'destro_incin_ds'; })[0], c = WL.pageDefaultConfig(); c.fight.durationVarPct = 0;
    T.eq(b.talents.shadowAndFlame, 5, 'Incinerate DS has 5/5');
    // round 233: 150 s — near the end the rotation's damage-based choices differ with the bonus at 0 (Incinerate vs Bane of Agony at 164 s)
    var a = WL.simulateOnce(b, 'undead', c, { seed: 5, log: true, duration: 150 });
    var T5 = WL.TALENT_BY_KEY.shadowAndFlame, keep = T5.v.schoolPct.slice(); T5.v.schoolPct = [0, 0, 0, 0, 0];
    var z; try { z = WL.simulateOnce(b, 'undead', c, { seed: 5, log: true, duration: 150 }); } finally { T5.v.schoolPct = keep; }
    var hits = function (r) { return r.log.filter(function (e) { return e.dmg > 0 && e.type !== 'pet'; }); }, A = hits(a), Z = hits(z);
    T.ok(A.length > 50 && A.length === Z.length && A.every(function (e, i) { return Z[i].spell === e.spell && Math.abs(Z[i].t - e.t) < 1e-9; }), 'the same fight with the bonus at 0 (' + A.length + ' hits)');
    var up = function (k, t) { return ((a.auras || {})[k] || []).some(function (x) { return t >= x[0] - 1e-9 && t < x[1] - 1e-9; }); };
    // a hit at the very moment the buff starts or ends (the log keeps milliseconds; e.g. an Immolate landing just before the
    // Shadowburn that starts the Fire buff) is left out: which side it falls on is not in the log
    var edge = function (k, t) { return ((a.auras || {})[k] || []).some(function (x) { return Math.abs(t - x[0]) < 0.002 || Math.abs(t - x[1]) < 0.002; }); };
    var on = [], off = [];
    A.forEach(function (e, i) {
      var s = WL.SPELLS[e.spell.replace(/^x\d:/, '')]; if (!s || (s.school !== 'fire' && s.school !== 'shadow')) return;
      var bk = s.school === 'fire' ? 'snfFire' : 'snfShadow'; if (edge(bk, e.t)) return;
      (up(bk, e.t) ? on : off).push([e.dmg, Z[i].dmg]);
    });
    T.ok(on.length > 20 && on.every(function (q) { return Math.abs(q[0] - 1.2 * q[1]) <= 1.1; }), 'with its buff up a hit does 20% more (' + on.length + ' hits; the log rounds damage to whole points)');
    T.ok(off.every(function (q) { return q[0] === q[1]; }), 'without it, nothing changes (' + off.length + ' hits)');
    var n = function (f) { return a.log.filter(f).length; };
    T.eq(n(function (e) { return e.type === 'consume'; }), 0, '5/5: Conflagrate never consumes Immolate (100%)');
    T.eq(n(function (e) { return e.type === 'refund'; }), n(function (e) { return e.type === 'hit' && e.spell === 'shadowburn'; }), '5/5: every Shadowburn that hits refunds its Soul Shard (100%; a miss does not)');
  });
})();
