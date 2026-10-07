// Round 127 tests (user): precast — fight.precast names a spell with a cast bar that is started before the pull so that it
// completes as the fight timer starts. It lands at 0 s, its mana is already spent, its cooldown starts at 0 s, its cast time
// is not fight time, and only what is left of its global cooldown runs into the fight. A build that cannot precast the
// spell starts as usual.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = -100; c.gear.weaponIsSword = false;   // every spell hits, nothing crits
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.options.dotEndCheck = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (f) f(c);
    return c;
  }
  function pre(k, f) { return det(function (c) { c.fight.precast = k; if (f) f(c); }); }
  function tb(rot, talents, pet) { return { key: 't127', short: 't', name: 't', notes: '', talents: talents || {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }; }
  function run(b, c, dur, race) { return WL.simulateOnce(b, race || 'human', c, { seed: 1, duration: dur || 30, log: true }); }
  function table(b, c, race) { return WL.buildSpellTable(b, WL.computeStats(b, race || 'human', c), c); }
  function casts(r, k) { return r.log.filter(function (e) { return e.type === 'cast' && (!k || e.spell === k); }); }
  function firstReal(r) { return casts(r).filter(function (e) { return e.precast == null; })[0]; }

  T.run('round 127: precast — a spell that finishes as the fight timer starts', function () {
    T.group('the setting');
    T.eq(WL.DEFAULT_CONFIG.fight.precast, '', 'no precast by default');
    T.eq(WL.PRECAST_SPELLS.join(','), 'shadowBolt,immolate,incinerate,searingPain,soulFire,corruption', 'the spells with a cast bar can be precast (no instants, no channels, no curses)');
    var sb = tb(['shadowBolt']);
    T.eq(WL.precastOf(sb, det(), table(sb, det())), null, 'nothing chosen: no precast');
    ['drainLife', 'baneOfAgony', 'conflagrate', 'curseOfElements', 'lifeTap', 'nonsense'].forEach(function (k) {
      T.eq(WL.precastOf(sb, pre(k), table(sb, pre(k))), null, k + ' cannot be precast');
    });
    T.eq(WL.precastOf(sb, pre('shadowBolt'), table(sb, pre('shadowBolt'))), 'shadowBolt', 'Shadow Bolt can');
    T.eq(WL.precastOf(sb, pre('incinerate'), table(sb, pre('incinerate'))), null, 'Incinerate without the talent: no precast');
    var inc = tb(['incinerate'], { incinerate: 1 });
    T.eq(WL.precastOf(inc, pre('incinerate'), table(inc, pre('incinerate'))), 'incinerate', 'Incinerate with the talent: precast');
    var ic5 = tb(['shadowBolt'], { improvedCorruption: 5 });
    T.eq(WL.precastOf(ic5, pre('corruption'), table(ic5, pre('corruption'))), null, 'Corruption made instant by Improved Corruption 5/5: no precast');
    T.eq(WL.precastOf(sb, pre('corruption'), table(sb, pre('corruption'))), 'corruption', 'Corruption with its 2 s cast: precast');

    T.group('Shadow Bolt precast: one extra Shadow Bolt at 0 s, for no fight time');
    var c0 = det(), c1 = pre('shadowBolt'), r0 = run(sb, c0), r1 = run(sb, c1), t1 = table(sb, c1), st = WL.computeStats(sb, 'human', c1);
    T.ok(st.critPct < 0, 'test setup: nothing can crit', st.critPct);
    var e0 = r1.log[0];
    T.ok(e0.type === 'cast' && e0.spell === 'shadowBolt' && e0.t === 0 && e0.precast === 3 && e0.castTime === 0 && e0.gcd === 0, 'the log opens with the precast at 0 s (its 3 s cast lies before the pull)', JSON.stringify(e0));
    var h0 = r1.log.filter(function (e) { return e.type === 'hit'; })[0];
    T.ok(h0.t === 0 && h0.spell === 'shadowBolt', 'it lands at 0 s', JSON.stringify(h0));
    T.near(h0.dmg, Math.round(t1.shadowBolt.directDmg), 1e-9, 'for a plain Shadow Bolt hit (' + Math.round(t1.shadowBolt.directDmg) + ')');
    T.eq(e0.mana, Math.round(st.maxMana - t1.shadowBolt.cost), 'its mana is already spent when the fight starts (' + Math.round(st.maxMana) + ' − ' + t1.shadowBolt.cost + ')');
    T.eq(firstReal(r1).t, 0, 'the first cast of the fight starts at 0 s, as without a precast');
    T.eq(casts(r1, 'shadowBolt').length, casts(r0, 'shadowBolt').length + 1, 'one Shadow Bolt more than without (' + casts(r0, 'shadowBolt').length + ' → ' + casts(r1, 'shadowBolt').length + ')');
    T.near(r1.total - r0.total, t1.shadowBolt.directDmg, 1e-6, 'the fight deals exactly one Shadow Bolt more damage');
    T.near(r1.bySpell.shadowBolt.castTime, r0.bySpell.shadowBolt.castTime, 1e-9, 'and the precast takes no fight time (cast time ' + r1.bySpell.shadowBolt.castTime.toFixed(1) + ' s both ways)');
    T.near(r1.dps - r0.dps, t1.shadowBolt.directDmg / 30, 1e-6, 'DPS gain = one Shadow Bolt ÷ fight length');
    T.eq(casts(r1).filter(function (e) { return e.precast != null; }).length, 1, 'exactly one precast per fight');

    T.group('what is left of the global cooldown runs into the fight');
    var ic3 = tb(['shadowBolt'], { improvedCorruption: 3 }), rc = run(ic3, pre('corruption'));
    T.eq(table(ic3, pre('corruption')).corruption.cast, 0.8, 'test setup: Corruption with Improved Corruption 3/5 is a 0.8 s cast');
    T.near(rc.log[0].gcd, 0.7, 1e-9, 'a 0.8 s precast leaves 0.7 s of the 1.5 s global cooldown');
    T.near(firstReal(rc).t, 0.7, 1e-9, 'so the first cast of the fight starts at 0.7 s');
    T.ok(rc.log.some(function (e) { return e.type === 'apply' && e.spell === 'corruption' && e.t === 0; }), 'Corruption is on the boss from 0 s');
    T.eq(firstReal(run(sb, pre('searingPain'))).t, 0, 'a 1.5 s precast (Searing Pain) leaves nothing: first cast at 0 s');
    T.eq(firstReal(run(sb, pre('immolate'))).t, 0, 'a 2 s precast (Immolate) leaves nothing either');

    T.group('cooldown, mana rule, travel time, latency');
    var sf = tb(['soulFireShards', 'shadowBolt']), rs0 = run(sf, det(), 100), rs1 = run(sf, pre('soulFire'), 100);
    var second = casts(rs0, 'soulFire')[1].t;
    T.ok(casts(rs0, 'soulFire')[0].t === 0 && second >= 66 - 1e-9 && second < 72, 'without a precast: Soul Fire at 0 s (6 s cast), the next one not before 66 s = 60 s after it completed (' + second.toFixed(2) + ' s)', second);
    var real = casts(rs1, 'soulFire').filter(function (e) { return e.precast == null; });
    T.ok(real.length === 1 && real[0].t >= 60 - 1e-9 && real[0].t < 66, 'with a Soul Fire precast: its cooldown runs from 0 s, the next Soul Fire starts at ' + real[0].t.toFixed(2) + ' s — not before 60 s, and earlier than it could without a precast', real.length && real[0].t);
    var idle = tb([]), ri0 = run(idle, det()), ri1 = run(idle, pre('shadowBolt'));
    T.eq(ri0.fsrOutTime, 0, 'test setup: a fight without any cast never spends mana (no Spirit regeneration counted)');
    T.near(ri1.fsrOutTime, 25, 1e-6, '5-second rule: the precast\'s mana counts as spent at 0 s — Spirit regenerates from 5 s on (25 of 30 s)');
    var rt = run(sb, pre('shadowBolt', function (c) { c.fight.travelMs = 800; }));
    T.near(rt.log.filter(function (e) { return e.type === 'hit'; })[0].t, 0.8, 1e-9, 'travel time 800 ms: the precast Shadow Bolt hits at 0.8 s');
    T.eq(firstReal(rt).t, 0, '… and you are free at 0 s all the same');
    T.near(run(sb, pre('immolate', function (c) { c.fight.travelMs = 800; })).log.filter(function (e) { return e.type === 'hit'; })[0].t, 0, 1e-9, 'Immolate does not fly: it lands at 0 s with any travel time');
    var rl = run(sb, pre('shadowBolt', function (c) { c.fight.latencyMs = 200; }));
    T.near(firstReal(rl).t, 0.2, 1e-9, 'latency 200 ms: your reaction time comes after the precast, as after every cast (first cast at 0.2 s)');
    T.eq(firstReal(run(sb, det(function (c) { c.fight.latencyMs = 200; }))).t, 0, 'without a precast the first cast is at 0 s whatever the latency');

    T.group('the precast lands before anything else at 0 s');
    var bb = tb(['shadowBolt'], { demonicBrand: 3 }, 'succubus');
    var cb = pre('searingPain', function (c) { c.options.includePetDamage = true; var m = c.combat.petMelee; m.missPct = 0; m.dodgePct = 0; m.glancePct = 0; m.critSuppressionPct = 100; });
    var rb = run(bb, cb);
    T.eq(rb.log.filter(function (e) { return e.spell === 'pet:brand' && e.t === 0; }).length, 2, 'a precast Searing Pain brands the boss before the Succubus\'s first swing at 0 s: the swing and her Lash of Pain both get a Demonic Brand hit');
    var orc = run(sb, pre('shadowBolt'), 30, 'orc');
    var iHit = orc.log.map(function (e) { return e.type; }).indexOf('hit'), iRac = orc.log.map(function (e) { return e.type; }).indexOf('racial');
    T.ok(iRac > iHit && iHit >= 0, 'the racial cooldown is not used for the precast: Blood Fury comes after it (before the first cast of the fight)', iHit + ' / ' + iRac);
    T.near(orc.log[iHit].dmg, Math.round(table(sb, c1, 'orc').shadowBolt.directDmg), 1e-9, '… so the precast hits without Blood Fury');
    var hv = tb(['shadowBolt'], { baneOfHavoc: 1 }), rh = run(hv, pre('shadowBolt', function (c) { c.fight.targets = 2; }));
    var iH = rh.log.map(function (e) { return e.spell; }).indexOf('baneOfHavoc');
    T.ok(iH > 1 && rh.log[iH].t === 0, 'two targets: Bane of Havoc goes up after the precast has landed (not before the pull)', iH);

    T.group('a build that cannot precast the spell starts as usual');
    var a = run(sb, det()), b = run(sb, pre('incinerate'));
    T.ok(a.total === b.total && a.log.length === b.log.length && b.log[0].precast == null, 'Incinerate chosen, build without it: the same fight as without a precast');
    var x = run(ic5, det()), y = run(ic5, pre('corruption'));
    T.ok(x.total === y.total && y.log[0].precast == null, 'Corruption chosen, build with instant Corruption: the same fight as without a precast');

    T.group('settings code and the shipped builds');
    var cc = pre('soulFire'), back = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    var unknown = WL.applySettings(back, WL.decodeSettings(WL.encodeSettings(cc)));
    T.eq(back.fight.precast + ' / ' + unknown.length, 'soulFire / 0', 'the precast travels in a settings code');
    var old = WL.decodeSettings(WL.encodeSettings(det())); delete old.fight.precast;
    var fresh = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); WL.applySettings(fresh, old);
    T.eq(fresh.fight.precast, '', 'a code from before this setting loads with no precast');
    WL.BUILDS.forEach(function (bd) {
      var cs = pre('soulFire', function (c) { c.options.includePetDamage = true; }), r = WL.simulateOnce(bd, 'human', cs, { seed: 5, duration: 120, log: true });
      var p = r.log.filter(function (e) { return e.precast != null; });
      var hit = r.log.filter(function (e) { return e.type === 'hit' && e.spell === 'soulFire'; })[0];
      T.ok(p.length === 1 && r.log[0] === p[0] && p[0].t === 0 && hit && hit.t === 0, bd.short + ': a Soul Fire precast opens the fight (' + p[0].precast + ' s cast before the pull) and lands at 0 s');
    });
    var fire = WL.findBuild('demo_pact_fire'), f0 = WL.simulateOnce(fire, 'human', det(), { seed: 5, duration: 120 }), f1 = WL.simulateOnce(fire, 'human', pre('soulFire'), { seed: 5, duration: 120 });
    var sfHit = table(fire, pre('soulFire')).soulFire.directDmg;
    T.ok(f1.total - f0.total > 0.5 * sfHit, 'Demo Pact Fire Imp without crits and misses: a Soul Fire precast adds ' + Math.round(f1.total - f0.total) + ' damage (one Soul Fire = ' + Math.round(sfHit) + ')', f1.total - f0.total);
  });
})();
