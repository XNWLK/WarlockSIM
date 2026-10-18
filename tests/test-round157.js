// Round 157 tests (user: "do everything from 1-10"): rules / groups / variables in the priority, stat weights of your
// choice (Spirit, MP5, Spell Penetration too), Atiesh auras and Blood Pact, Innervate / Power Infusion counts, the bag list
// of gear codes.
(function () {
  function det(mod) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.options.includePetDamage = false;
    if (mod) mod(c);
    return c;
  }
  function sm() { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === 'sm_ruin_classic'; })[0])); }

  T.run('round 157: rules, groups and variables', function () {
    T.group('conditions');
    var S = { t: 30, remaining: 90, targetHpPct: 60, mana: 3000, maxMana: 6000, shards: 5, brandCharges: 3, buffs: { shadowTrance: 33, brand: 40 }, cds: { shadowburn: 34 },
      build: { vars: { 'Min left': { num: 12 }, 'Late': { cond: { t: 'fight', what: 'remaining', op: '<', v: 20 } } } },
      dotLeft: function (k) { return k === 'corruption' ? 4 : 0; }, buff: function (k) { return this.buffs[k] > this.t; } };
    var C = function (n) { return WL.ruleCond(n, S, S.build); };
    T.ok(C({ t: 'dot', spell: 'corruption', op: '<=', v: 4 }) && !C({ t: 'dot', spell: 'corruption', op: '<', v: 4 }) && C({ t: 'dot', spell: 'immolate', op: '<=', v: 0 }), 'DoT time left: 4 s on Corruption, 0 on a DoT that is not up');
    T.ok(C({ t: 'aura', aura: 'shadowTrance', op: '>', v: 2.9 }) && !C({ t: 'aura', aura: 'decimation', op: '>', v: 0 }), 'buff time left: Shadow Trance 3 s, Decimation not up');
    T.ok(C({ t: 'cd', spell: 'shadowburn', op: '=', v: 4 }) && C({ t: 'cd', spell: 'conflagrate', op: '=', v: 0 }), 'cooldown left: 4 s; 0 when ready');
    T.ok(C({ t: 'fight', what: 'remaining', op: '>', v: { var: 'Min left' } }) && C({ t: 'fight', what: 'elapsed', op: '>=', v: 30 }) && C({ t: 'fight', what: 'bossHp', op: '<', v: 61 }), 'fight time left > a named number, time gone, boss health');
    T.ok(C({ t: 'mana', op: '=', v: 50 }) && C({ t: 'shards', op: '>', v: 4 }) && C({ t: 'brand', op: '=', v: 3 }), 'mana %, Soul Shards, Demonic Brand charges');
    T.ok(!C({ t: 'var', name: 'Late' }) && C({ t: 'not', c: { t: 'var', name: 'Late' } }), 'a named condition, and "not"');
    T.ok(C({ t: 'all', c: [{ t: 'mana', op: '>', v: 10 }, { t: 'shards', op: '>', v: 0 }] }) && !C({ t: 'all', c: [{ t: 'mana', op: '>', v: 10 }, { t: 'shards', op: '>', v: 9 }] }) &&
      C({ t: 'any', c: [{ t: 'mana', op: '>', v: 90 }, { t: 'shards', op: '>', v: 0 }] }) && C(null) && C({ t: 'all', c: [] }), 'all of / any of; no condition = always');
    T.ok(!C({ t: 'var', name: 'Loop' }) && !WL.ruleCond({ t: 'var', name: 'A' }, S, { vars: { A: { cond: { t: 'var', name: 'A' } } } }), 'an unknown or self-referring condition is false, not an endless loop');

    T.group('a build with them');
    var b = sm();
    b.rules = [{ spell: 'shadowBolt', name: 'Nightfall', when: { t: 'aura', aura: 'shadowTrance', op: '>', v: 0 } },
      { spell: 'corruption', when: { t: 'all', c: [{ t: 'dot', spell: 'corruption', op: '<=', v: 0 }, { t: 'var', name: 'Not ending' }] } }];
    b.vars = { 'Not ending': { cond: { t: 'fight', what: 'remaining', op: '>', v: { var: 'Min left' } } }, 'Min left': { num: 12 } };
    b.groups = { DoTs: ['rule:1', 'siphonLife'] };
    b.rotation = b.rotation.map(function (a) { return a === 'shadowTrance' ? 'rule:0' : a === 'corruption' ? 'group:DoTs' : a; }).filter(function (a) { return a !== 'siphonLife'; });
    T.eq(WL.validateBuild(b).join(' | '), '', 'a legal build');
    var rot = WL.effectiveRotation(b, det());
    T.ok(rot.indexOf('group:DoTs') < 0 && rot.indexOf('rule:1') >= 0 && rot.indexOf('siphonLife') === rot.indexOf('rule:1') + 1, 'the group is put in its place', rot.join(' > '));
    T.ok(/^Nightfall: Shadow Bolt if Shadow Trance/.test(WL.actionLabel(b, 'rule:0')) && /^Group "DoTs" \(2 actions\)$/.test(WL.actionLabel(b, 'group:DoTs')), 'labels', WL.actionLabel(b, 'rule:0'));
    var r = WL.simulateOnce(b, 'human', det(), { seed: 4, duration: 120, log: true });
    var casts = r.log.filter(function (e) { return e.type === 'cast'; });
    T.ok(casts.filter(function (e) { return e.spell === 'corruption'; }).length >= 3, 'the Corruption rule keeps Corruption up (' + casts.filter(function (e) { return e.spell === 'corruption'; }).length + ' casts)');
    T.ok(!casts.some(function (e) { return e.spell === 'corruption' && e.t > 108 + 1e-6; }), '… and not in the last 12 s (its named condition)');
    var b0 = sm(), c2 = det(function (c) { c.fight.iterations = 400; });
    T.near(WL.simulate(b, 'human', c2).dps / WL.simulate(b0, 'human', c2).dps, 1, 0.01, 'the same rotation as rules does about the same damage as the built-in actions');

    T.group('mistakes are named');
    var bad = sm(); bad.rules = [{ spell: 'shadowfury' }, { spell: 'conflagrate' }, { spell: 'shadowBolt', when: { t: 'dot', spell: 'shadowBolt', op: '>', v: 0 } }, { spell: 'shadowBolt', when: { t: 'fight', what: 'remaining', op: '>', v: { var: 'Nope' } } }];
    bad.rotation = bad.rotation.concat(['group:None']);
    var e = WL.validateBuild(bad).join(' | ');
    T.ok(/Rule 1: unknown spell/.test(e) && /Rule 2: Conflagrate needs the Conflagrate talent/.test(e) && /Rule 3: "shadowBolt" is not a DoT/.test(e) && /Rule 4: no number named "Nope"/.test(e) && /No group named "None"/.test(e), 'unknown spell, missing talent, not a DoT, unknown number, unknown group', e);
    var b2 = sm(); b2.rotation = b2.rotation.filter(function (a) { return !WL.ACTIONS[a] || !WL.ACTIONS[a].filler; }).concat(['rule:0']); b2.rules = [{ spell: 'shadowBolt' }];
    T.eq(WL.validateBuild(b2).join(' | '), '', 'a rule without a condition is a filler');

    T.group('build codes carry them');
    var d = WL.decodeBuild(WL.encodeBuild(b));
    var norm = function (x) { return JSON.stringify(x, function (k, v) { return v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce(function (o, kk) { o[kk] = v[kk]; return o; }, {}) : v; }); };
    T.ok(norm(d.rules) === norm(b.rules) && norm(d.vars) === norm(b.vars) && norm(d.groups) === norm(b.groups), 'rules, variables and groups come back unchanged');
  });

  T.run('round 157: stat weights of your choice', function () {
    T.ok(WL.WEIGHT_STATS.join() === 'sp,hitPct,critPct,hastePct,int,pierce,spellPen,spi,mp5' && WL.STAT_WEIGHT_KEYS.join() === 'sp,hitPct,critPct,hastePct,int,pierce', 'nine stats to choose from; the default six unchanged');
    var D = WL.DEFAULT_CONFIG;
    T.ok(D.options.weightStats.join() === WL.STAT_WEIGHT_KEYS.join() && D.options.weightPrecision === 0, 'by default the six, one run');
    ['spellPen', 'spi', 'mp5'].forEach(function (k) { T.ok(D.weightDeltas[k] > 0 && D.extra[k] === 0, k + ': a step and a test slot'); });
    var b = sm(), c = det(function (x) { x.combat.levelResist.on = true; x.options.useCurseOfElements = false; });
    var st = function (k) { var x = JSON.parse(JSON.stringify(c)); x.extra[k] = 10; return WL.computeStats(b, 'human', x); }, s0 = WL.computeStats(b, 'human', c);
    T.ok(st('spi').spi > s0.spi + 9 && st('mp5').mp5 === s0.mp5 + 10 && st('spellPen').spellPen === s0.spellPen + 10, 'the test slots raise Spirit, MP5 and Spell Penetration');
    var w = WL.combineWeights(c, 100, { sp: 110, mp5: 101 });
    T.ok(w.base === 100 && Math.abs(w.sp - 0.1) < 1e-9 && Math.abs(w.mp5 - 0.1) < 1e-9 && !('hitPct' in w), 'weights only for the stats that were run');
    var it = WL.gearValue({ sp: 10, mp5: 5, spi: 4 }, { sp: 1, hitPct: 10, critPct: 8, hastePct: 2, int: 0.2, pierce: 0, mp5: 0.4, spi: 0.1 }, {});
    T.ok(Math.abs(it.dps - (10 + 2 + 0.4)) < 1e-9 && !it.unvalued.length, 'an item\'s worth counts Spirit and MP5 when their weights are there');
  });

  T.run('round 157: raid extras', function () {
    var b = sm(), c0 = det(), on = function (keys) { return det(function (c) { keys.forEach(function (k) { c.buffs[k].on = true; }); }); };
    var s0 = WL.computeStats(b, 'human', c0);
    T.eq(WL.computeStats(b, 'human', on(['atieshWarlock'])).sp - s0.sp, 33, 'Atiesh (Warlock): +33 spell power');
    T.near(WL.computeStats(b, 'human', on(['atieshMage'])).critPct - s0.critPct, 2, 1e-9, 'Atiesh (Mage): +2% spell crit');
    T.eq(WL.computeStats(b, 'human', on(['atieshDruid'])).mp5 - s0.mp5, 11, 'Atiesh (Druid): 11 MP5');
    var kings = c0.buffs.blessingOfKings.on ? 1.1 : 1;
    T.near(WL.computeStats(b, 'human', on(['bloodPact'])).sta - s0.sta, 42 * kings, 1e-9, 'Blood Pact: +42 Stamina (× Blessing of Kings when it is on)');
    T.group('counts');
    var pi = function (n) { var r = WL.simulateOnce(b, 'human', det(function (c) { c.buffs.powerInfusion.on = true; c.buffs.powerInfusion.count = n; }), { seed: 3, duration: 300, log: true });
      return r.log.filter(function (e) { return e.type === 'buff' && /Power Infusion/.test(e.spell || ''); }).map(function (e) { return e.t; }); };
    var p1 = pi(1), p3 = pi(3);
    T.ok(p3.length === 3 * p1.length && p3.length >= 3, 'Power Infusion from 3 Priests: 3 times as often (' + p1.length + ' → ' + p3.length + ')');
    T.ok(p3[1] - p3[0] >= 15 - 1e-6 && p3[3] - p3[0] >= 180 - 1e-6, '… each when the last one is over, each Priest every 3 min');
    var inn = function (n) { var r = WL.simulateOnce(b, 'human', det(function (c) { c.buffs.innervate.on = true; c.buffs.innervate.count = n; c.gear.int = 0; c.gear.spi = 0; c.buffs.blessingOfWisdom.on = false; }), { seed: 3, duration: 400, log: true });
      return r.log.filter(function (e) { return e.type === 'buff' && /Innervate/.test(e.spell || ''); }).length; };
    T.ok(inn(1) === 1 && inn(3) >= 2, 'Innervate: once by default, again (when below 50% mana) with a count (' + inn(1) + ' / ' + inn(3) + ')');
    var cc = det(function (c) { c.buffs.innervate.on = true; c.buffs.innervate.count = 3; }), snap = WL.settingsSnapshot(cc), back = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    WL.applySettings(back, JSON.parse(JSON.stringify(snap)));
    T.ok(snap.counts && snap.counts.innervate === 3 && back.buffs.innervate.count === 3, 'settings codes keep the count');
  });

  T.run('round 157: bag items in gear codes', function () {
    var code = 'WFG1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, items: {}, bag: [{ id: 14153, name: 'Robe of the Void', slot: 'chest' },
      { name: 'Plate Thing', slot: 'chest', stats: { sta: 30 } }, { name: 'Odd Ring', slot: 'finger', stats: { sp: 5 } }, { name: 'Shield', slot: 'shield', stats: { sp: 5 } }] }))));
    var o = WL.decodeGear(code);
    T.eq(o.bag.length, 2, 'a listed item and an unlisted one with a useful stat; not Stamina-only, not a slot a Warlock has no use for');
    T.ok(o.bag[0].id === 14153 && o.bag[1].custom && o.bag[1].custom.unlisted, 'listed by id; the other flagged as not in the list');
  });
})();
