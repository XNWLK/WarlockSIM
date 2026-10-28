// Round 167 tests (user: "start implementing enchants as well (like revelation)"): weapon enchant effects. [A106]
(function () {
  function det(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function wield(c, ench) { c.gearBuilder = { on: true, slots: { mainHand: { id: 1 } }, enchants: ench ? { mainHand: { id: ench } } : {}, manual: {} }; return c; }
  T.run('round 167: weapon enchants with an effect', function () {
    var b = sheet('demo_pact_succ_sb');
    T.group('the list');
    [7942, 7941, 8216, 8217].forEach(function (id) { T.ok(WL.ENCHANTS[id] && WL.ENCHANT_FX[id] && WL.ENCHANTS[id].slots.indexOf('mainHand') >= 0, WL.ENCHANT_FX[id].name + ': in the weapon enchants'); });
    T.ok(WL.ENCHANTS[7941].twoHand, 'Grand Arcanist: two-handed weapons only');
    T.eq(WL.equippedEnchantFx(wield(det(), 8217)).length, 1, 'a worn Revelation counts');
    var off = wield(det(), 8217); off.gearBuilder.on = false; T.eq(WL.equippedEnchantFx(off).length, 0, '… only while the gear builder is on');
    var noW = wield(det(), 8217); noW.gearBuilder.slots = {}; T.eq(WL.equippedEnchantFx(noW).length, 0, '… and only on a weapon');

    T.group('in the fight (same fights with and without)');
    var dps = function (c) { var s = 0; for (var i = 1; i <= 60; i++) s += WL.simulateOnce(b, 'human', c, { seed: i, duration: 180 }).dps; return s / 60; };
    var base = dps(wield(det(), null));
    [[7942, 'Grand Sorcerer'], [7941, 'Grand Arcanist'], [8216, 'Insight'], [8217, 'Revelation']].forEach(function (x) {
      var v = dps(wield(det(), x[0])); T.ok(v > base, x[1] + ': more DPS (' + base.toFixed(1) + ' → ' + v.toFixed(1) + ')');
    });
    var r = WL.simulateOnce(b, 'human', wield(det(), 7942), { seed: 1, duration: 180, log: true });
    T.ok(r.log.some(function (e) { return e.type === 'buff' && e.spell === 'Grand Sorcerer'; }), 'Grand Sorcerer procs (7% per landed spell)');
    var r0 = WL.simulateOnce(b, 'human', wield(det(function (c) { c.combat.revelationChancePct = 0; }), 8217), { seed: 2, duration: 180, log: true });
    T.ok(!r0.log.some(function (e) { return e.type === 'buff' && e.spell === 'Revelation'; }), 'Revelation at 0% chance: never');
    var r1 = WL.simulateOnce(b, 'human', wield(det(function (c) { c.combat.revelationChancePct = 100; c.options.cheat = { hit: { shadowBolt: true }, crit: {} }; }), 8217), { seed: 2, duration: 180, log: true });
    var hits = r1.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; });
    var pairs = 0; for (var i = 1; i < hits.length; i++) if (!hits[i - 1].crit && hits[i].crit) pairs++;
    T.ok(hits.length > 20 && hits.filter(function (h) { return h.crit; }).length > hits.length * 0.4, 'Revelation at 100% × (1 − crit): a Shadow Bolt that does not crit makes the next direct hit crit (' + hits.filter(function (h) { return h.crit; }).length + ' / ' + hits.length + ' crits)');
  });
})();
