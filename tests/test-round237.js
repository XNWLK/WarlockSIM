// Round 237 tests (user, a screenshot of Baked Salmon: "it seems we dont have that buff food … check … if their buff setup has
// other things we dont have and check wowhead data as well"; picked: the +20 Intellect food, Potion of Elemental Purging,
// Blessed Wizard Oil; no world buffs). Values: the Wowhead Forever tooltips (2026-11-20).
(function () {
  function base(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function only(c, keys) { Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = keys.indexOf(k) >= 0; }); return c; }
  function tb(rot) { return { key: 't', name: 't', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function boss(t) { return function (c) { c.fight.bossType = t; }; }

  T.run('round 237: Baked Salmon, +20 Intellect food, Elemental Purging, Blessed Wizard Oil', function () {
    var C = WL.CONSUMABLES, b = tb(['shadowBolt']);
    T.group('the foods (the biggest of each kind)');
    T.ok(C.bakedSalmon && C.bakedSalmon.id === 13935 && C.bakedSalmon.sp === 28 && C.bakedSalmon.group === 'food', 'Baked Salmon / Lobster Stew: well fed +28 spell damage');
    T.ok(C.soaringPamplona && C.soaringPamplona.id === 250066 && C.soaringPamplona.int === 20 && C.soaringPamplona.group === 'food', 'Soaring Pamplona / Bat Hachee / Prehistoric Pulled Raptor: well fed +20 Intellect');
    T.ok(!C.nightfinSoup && !C.runnTumTuber, 'Nightfin Soup (+22) and Runn Tum Tuber Surprise (+15) are gone');
    var s0 = WL.computeStats(b, 'human', only(base(), []));
    T.near(WL.computeStats(b, 'human', only(base(), ['soaringPamplona'])).int - s0.int, 20, 1e-9, '+20 Intellect');
    T.ok(WL.PAGE_CONSUMABLES_ON.indexOf('bakedSalmon') >= 0 && WL.PAGE_CONSUMABLES_ON.indexOf('nightfinSoup') < 0, 'the page\'s ideal Phase 1 food is Baked Salmon');
    ['bakedSalmon', 'soaringPamplona', 'elementalPurging', 'blessedWizardOil'].forEach(function (k) {
      T.ok(!!WL.ICONS['consumable_' + k] && !!WL.CON_TIPS[C[k].id], k + ': icon and in-game tooltip');
    });

    T.group('old settings codes');
    var old = base(); only(old, ['nightfinSoup']);
    var snap = WL.settingsSnapshot(old); snap.cons = ['nightfinSoup', 'runnTumTuber'];
    var back = base(); var res = WL.applySettings(back, snap);
    T.ok(back.consumables.bakedSalmon.on && back.consumables.soaringPamplona.on, 'a code with Nightfin Soup / Runn Tum Tuber turns on Baked Salmon / the +20 Intellect food');
    T.ok(Array.isArray(res) && res.length === 0, 'and reports nothing unknown' + (res && res.length ? ': ' + res.join(', ') : ''));

    T.group('Blessed Wizard Oil: only against Undead');
    T.ok(C.blessedWizardOil.id === 23123 && C.blessedWizardOil.oil.sp === 60 && C.blessedWizardOil.vs.undead && C.blessedWizardOil.group === 'weapon', '+60 spell damage, a weapon oil, Undead only');
    T.near(WL.computeStats(b, 'human', only(base(boss('undead')), ['blessedWizardOil'])).sp - s0.sp, 60, 1e-9, 'Boss type Undead: +60 SP');
    T.near(WL.computeStats(b, 'human', only(base(), ['blessedWizardOil'])).sp - s0.sp, 0, 1e-9, 'Boss type not set: nothing');
    T.near(WL.computeStats(b, 'human', only(base(boss('dragonkin')), ['blessedWizardOil'])).sp - s0.sp, 0, 1e-9, 'Dragonkin: nothing');

    T.group('Potion of Elemental Purging: only against Elementals');
    var ep = C.elementalPurging;
    T.ok(ep.id === 250954 && ep.spPotion.sp === 105 && ep.spPotion.duration === 300 && ep.vs.elemental && ep.group === 'potion' && ep.cdGroup === 'potion', '+105 spell damage for 5 min, a potion (2 min cooldown)');
    function fight(t) { return WL.simulateOnce(tb(['shadowBolt']), 'human', only(base(boss(t)), ['elementalPurging']), { seed: 4, duration: 120, log: true }); }
    function noPot(t) { return WL.simulateOnce(tb(['shadowBolt']), 'human', only(base(boss(t)), []), { seed: 4, duration: 120, log: true }); }
    var el = fight('elemental'), elNo = noPot('elemental'), un = fight('undead'), unNo = noPot('undead');
    T.ok(el.log.some(function (e) { return e.type === 'consumable' && e.spell === 'Potion of Elemental Purging'; }), 'against an Elemental it is drunk');
    T.ok(el.total > elNo.total * 1.05, '… and adds damage (' + Math.round(el.total) + ' vs ' + Math.round(elNo.total) + ')');
    T.ok(!un.log.some(function (e) { return e.type === 'consumable'; }) && Math.abs(un.total - unNo.total) < 1e-6, 'against anything else it is not used and changes nothing');
  });
})();
