// Round 172 tests (user): the build editor shows the priority twice, next to each other — "Simple" (the list of actions) and
// "Advanced (APL)" (the same list as APL lines); a simple action makes its matching APL line, and an APL line that matches a
// simple action becomes that action. The quick sim's races: numbers, no bars.
(function () {
  function cfgOf(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.concat(WL.RETIRED_BUILDS || []).filter(function (b) { return b.key === k; })[0])); }

  T.run('round 172: every simple action has APL lines that decide exactly like it', function () {
    T.group('the lines');
    var keys = Object.keys(WL.ACTIONS);
    T.ok(keys.every(function (k) { return WL.APL_TEMPLATES[k]; }), 'all ' + keys.length + ' built-in actions have APL lines');
    var special = keys.filter(function (k) { return WL.aplTemplate(k, {})[0].special; });
    T.eq(special.sort().join(','), 'multiDot,shadowBoltSpread,swapToImp,swapToSuccubus', 'only the actions that pick their own target or swap the pet have no single-spell form');
    var w = sheet('wrack_succubus');
    T.eq(WL.aplLines('shadowTrance', w).map(function (l) { return l.spell + ' if ' + WL.condText(l.when, w); }).join(), 'shadowBolt if Shadow Trance (Nightfall) time left > 0 s', 'Shadow Bolt on Nightfall: "Shadow Bolt if Shadow Trance time left > 0 s"');
    T.ok(/mana % < 60 and fight time left > 25 s and not free mana is ready and the rest of the fight needs more mana/.test(WL.condText(WL.aplLines('lifeTapNeed', w)[0].when, w)), 'Life Tap by need, with the build\'s own numbers (60 / 25)');
    T.ok(/Corruption time left >= 4 s/.test(WL.condText(WL.aplLines('wrack', w)[0].when, w)), 'an action\'s extra condition is part of its line (Wrack while the DoTs last)');
    T.eq(WL.aplLines('bane', w).length, 2, 'Bane of Doom, else Bane of Agony: two lines');

    T.group('decision by decision in real fights (each action\'s check vs its lines)');
    var orig = {}, n = 0, fired = 0, bad = [], depth = 0;
    keys.forEach(function (k) {
      var A = WL.ACTIONS[k]; orig[k] = A.pick;
      A.pick = function (S) {
        var r = orig[k].call(this, S);
        if (depth) return r;
        var L = WL.aplLines(k, S.build); if (L[0].special) return r;
        depth++; var x = null;
        try { for (var i = 0; i < L.length && !x; i++) if (S.has(L[i].spell) && S.ready(L[i].spell) && WL.ruleCond(L[i].when, S, S.build)) x = L[i].spell; } finally { depth--; }
        n++; if (r) fired++;
        if ((r || null) !== x && bad.length < 5) bad.push(k + ' at ' + S.t.toFixed(2) + ' s: action ' + r + ', lines ' + x + ' (' + S.build.key + ')');
        return r;
      };
    });
    try {
      var builds = WL.BUILDS.filter(function (b) { return !b.custom; }).concat(WL.RETIRED_BUILDS || []);
      var d = sheet('destro_incin_succ'); d.key = 't172d'; d.rotation = ['curseOfElements', 'immolate', 'conflagrateExpire', 'shadowburnSnF', 'conflagrateSnF', 'searingPainDecimation', 'soulFireShards', 'searingPainExecute', 'lifeTapBelow', 'incinerate'];
      Object.assign(d.talents, { conflagrate: 1, shadowAndFlame: 5, decimation: 2, shadowburn: 1 });
      var m = sheet('demo_pact_succ_sb'); m.key = 't172m'; m.rotation = ['deathCoilFinisher', 'bane', 'corruption', 'searingPainBrand', 'lifeTapPet', 'deathCoil', 'isbUpkeep', 'shadowTrance', 'soulFire', 'conflagrate', 'shadowburn', 'lifeTapNeed', 'shadowBolt'];
      Object.assign(m.talents, { demonicBrand: 1, demonicEnergies: 1, improvedShadowBolt: 5, nightfall: 2 });
      builds = builds.concat([d, m]);
      var cfgs = [null, function (c) { c.buffs.innervate.on = true; c.buffs.manaTide.on = true; c.consumables.demonicRune.on = true; }, function (c) { c.fight.targets = 3; c.fight.multiDot = true; }, function (c) { c.options.useCurseOfElements = false; }];
      builds.forEach(function (b) { cfgs.forEach(function (f, ci) { [120, 300].forEach(function (dur) { WL.simulateOnce(b, 'undead', cfgOf(f), { seed: 1 + ci, duration: dur }); }); }); });
    } finally { keys.forEach(function (k) { WL.ACTIONS[k].pick = orig[k]; }); }
    T.ok(n > 50000 && fired > 5000, n + ' checks, ' + fired + ' casts, ' + builds.length + ' builds × 4 settings × 120 / 300 s');
    T.eq(bad.join(' | '), '', 'the lines decide exactly like the actions');
  });

  T.run('round 172: an APL line that matches a simple action becomes it', function () {
    var w = sheet('wrack_succubus'), others = w.rotation;
    var m1 = WL.aplMatch({ spell: 'shadowBolt', when: { t: 'aura', aura: 'shadowTrance', op: '>', v: 0 } }, w, []);
    T.ok(m1 && m1.key === 'shadowTrance' && !m1.extra && !m1.params, 'Shadow Bolt if Shadow Trance > 0 → "Shadow Bolt on Nightfall"');
    var lt = { spell: 'lifeTap', when: { t: 'all', c: [{ t: 'manaNeed' }, { t: 'mana', op: '<', v: 70 }, { t: 'not', c: { t: 'freeMana' } }, { t: 'fight', what: 'remaining', op: '>', v: 20 }] } };
    var m2 = WL.aplMatch(lt, w, []);
    T.ok(m2 && m2.key === 'lifeTapNeed' && m2.params.pct === 70 && m2.params.sec === 20, 'Life Tap by need with other numbers (in any order) → the action with 70 / 20');
    var m3 = WL.aplMatch({ spell: 'corruption', when: { t: 'all', c: [{ t: 'refresh', spell: 'corruption' }, { t: 'fight', what: 'elapsed', op: '>', v: 5 }] } }, w, []);
    T.ok(m3 && m3.key === 'corruption' && m3.extra && m3.extra.t === 'fight', 'Corruption needs a recast + one more condition → Corruption with an extra condition');
    T.ok(!WL.aplMatch({ spell: 'corruption', when: m3 && { t: 'all', c: [{ t: 'refresh', spell: 'corruption' }, { t: 'fight', what: 'elapsed', op: '>', v: 5 }] } }, w, others), '… but not while Corruption is in the priority elsewhere (its condition would apply there too)');
    var m4 = WL.aplMatch({ spell: 'shadowBolt', when: { t: 'mana', op: '>', v: 50 } }, w, []);
    T.ok(m4 && m4.key === 'shadowBolt' && m4.extra, 'a filler with a condition → that filler with an extra condition (it passes to the next filler, like Wrack)');
    T.ok(!WL.aplMatch({ spell: 'shadowBolt', when: { t: 'mana', op: '>', v: 50 } }, w, others), '… unless the filler is in the priority already: then it stays an APL line of your own');
    T.ok(!WL.aplMatch({ spell: 'deathCoil', when: { t: 'mana', op: '<', v: 10 } }, w, []), 'no simple action: stays an APL line of your own');
    T.ok(WL.aplMatch({ spell: 'shadowBolt' }, w, []).key === 'shadowBolt', 'Shadow Bolt without a condition → the Shadow Bolt filler');
    var lines = Object.keys(WL.ACTIONS).filter(function (k) { var L = WL.aplLines(k, w); return L.length === 1 && !L[0].special; });
    var same = lines.filter(function (k) { var L = WL.aplLines(k, w), m = WL.aplMatch(L[0], w, []), aw = w.actWhen && w.actWhen[k]; return m && m.key === k && JSON.stringify(m.extra) === JSON.stringify(aw || null); });   // with its own extra condition (Wrack)
    T.eq(same.length, lines.length, 'every one-line action\'s own line is recognised as that action (' + same.length + ')');
  });

  T.run('round 172: the new APL conditions', function () {
    var b = sheet('demo_pact_succ_sb');
    b.rules = [{ spell: 'shadowBolt', when: { t: 'all', c: [{ t: 'refresh', spell: 'corruption' }, { t: 'talent', talent: 'improvedShadowBolt', op: '>=', v: 1 }, { t: 'aura', aura: 'isb', op: '<=', v: { cast: 'shadowBolt' } },
      { t: 'fight', what: 'bossHp', op: '<', v: { exec: 1 } }, { t: 'pet' }, { t: 'setting', key: 'coe' }, { t: 'minDot', op: '>', v: 2 }, { t: 'known', spell: 'conflagrate' }, { t: 'check', act: 'deathCoilFinisher' }] } }];
    b.rotation.splice(b.rotation.length - 1, 0, 'rule:0');
    T.eq(WL.validateBuild(b).join(' | '), '', 'a line with every new condition is a legal build');
    var r = WL.simulateOnce(b, 'undead', cfgOf(), { seed: 1, duration: 120 });
    T.ok(r.dps > 0, 'and it simulates (no endless loop when a line runs the DoT check itself): ' + r.dps.toFixed(1) + ' DPS');
    var bad = JSON.parse(JSON.stringify(b)); bad.rules[0].when = { t: 'check', act: 'nope' };
    T.ok(WL.validateBuild(bad).some(function (e) { return /unknown check/.test(e); }), 'an unknown check is refused');
    T.eq(WL.condText({ t: 'aura', aura: 'isb', op: '<=', v: { cast: 'shadowBolt' } }), 'Improved Shadow Bolt on the boss time left <= Shadow Bolt cast time', 'a cast time as the number');
    T.eq(WL.condText({ t: 'fight', what: 'bossHp', op: '<', v: { exec: 1 } }), 'boss health % < the execute %', 'the execute threshold as the number');
    var code = WL.decodeBuild(WL.encodeBuild(b));
    T.eq(JSON.stringify(code.rules), JSON.stringify(b.rules), 'a build code carries them');
    var w = WL.buildWithoutPoint(b, 'improvedShadowBolt');
    T.ok(w.build.rules && w.build.rules.length === 1, '"Value of each point" keeps the build\'s APL lines');
  });

  T.run('round 172: the editor page', function () {
    var src = '';
    try { var x = new XMLHttpRequest(); x.open('GET', '../index.html', false); x.send(); src = x.responseText; } catch (e) { /* file:// */ }
    if (!src) { T.warn('index.html could not be read (file://)'); return; }
    var at = function (s) { return src.indexOf(s); };
    T.ok(/<details class="edcol" id="edSimpleBox" open><summary>Simple /.test(src), '"Simple": open by default');
    T.ok(/<details class="edcol edrules" id="edRulesBox" open><summary>Advanced \(APL\) /.test(src), '"Advanced (APL)": open by default');
    T.ok(at('class="edrots"') < at('id="edSimpleBox"') && at('id="edSimpleBox"') < at('id="edRulesBox"') && at('id="edRulesBox"') < at('id="edTlOn"'), 'next to each other, with the super advanced timeline under them');
    T.ok(!/id="edTlOn" type="checkbox" checked/.test(src), 'the super advanced timeline is off by default');
    var app = '';
    try { var y = new XMLHttpRequest(); y.open('GET', '../app/app.js', false); y.send(); app = y.responseText; } catch (e) { /* file:// */ }
    T.ok(app && app.indexOf('class="qbar"><i style="width:\' + w') < 0 && /round 172 \(user\): a number, no bar/.test(app), 'quick sim races: a number, no bar');
    T.ok(/actWhen: src\.actWhen/.test(app) && /actWhen: b\.actWhen/.test(app), 'a build loaded into the editor or saved from it keeps its extra conditions (Wrack Succubus)');
  });
})();
