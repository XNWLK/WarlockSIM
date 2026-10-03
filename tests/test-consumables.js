// Round 11 tests: consumables (data/consumables.js) -> stats (engine/stats.js) and in-fight use (engine/sim.js). [A57]
(function () {
  function base() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    return c;
  }
  function det(c) {
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100;
    c.gear.critPct = 0; c.gear.hitPct = 0; c.gear.weaponIsSword = false; c.options.useCurseOfElements = false;
    return c;
  }
  function tb(rot, oil) { return { key: 't', name: 't', talents: {}, pet: null, sacrifice: null, oil: oil || 'none', rotation: rot }; }
  function only(c, keys) { Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = keys.indexOf(k) >= 0; }); return c; }

  T.run('consumable data', function () {
    T.group('defaults and icons');
    var C = WL.DEFAULT_CONFIG.consumables, keys = Object.keys(C);
    T.eq(keys.filter(function (k) { return C[k].on; }).join(','), 'buildOil', 'only the per-build Spellstone/Firestone is on by default');
    keys.forEach(function (k) {
      T.ok(!!WL.ICONS['consumable_' + k], 'icon for ' + k);
      T.ok(C[k].group && C[k].name && C[k].desc && C[k].text && C[k].id, k + ' has group, name, desc, text, id');
    });
    T.ok(WL.DEFAULT_CONFIG.consumables !== WL.CONSUMABLES, 'config holds a copy (UI edits do not change the data file)');
  });

  T.run('consumable stats', function () {
    T.group('stats (Human, no talents)');
    var b = tb(['shadowBolt']), c0 = only(base(), []);
    var s0 = WL.computeStats(b, 'human', c0);
    var s = WL.computeStats(b, 'human', only(base(), ['elixirOwl']));
    T.near(s.int - s0.int, 25, 1e-9, 'Elixir of the Owl +25 Int');
    T.near(s.critPct - s0.critPct, 2 + 25 / 60, 1e-9, 'Owl: +2% crit + 25 Int / 60');
    var sw = WL.computeStats(b, 'human', only(base(), ['flaskDistilledWisdom']));
    T.near(sw.maxMana - s0.maxMana, 2000, 1e-9, 'Flask of Distilled Wisdom +2000 max mana (flat)');
    T.near(WL.computeStats(b, 'human', only(base(), ['flaskSupremePower'])).sp - s0.sp, 150, 1e-9, 'Flask of Supreme Power +150 SP');
    T.near(WL.computeStats(b, 'human', only(base(), ['nightfinSoup'])).sp - s0.sp, 22, 1e-9, 'Nightfin Soup +22 SP (Forever value)');
    T.near(WL.computeStats(b, 'human', only(base(), ['minorArcaneElixir'])).sp - s0.sp, 5, 1e-9, 'Minor Arcane Elixir +5 SP (round 12)');
    T.ok(!WL.CONSUMABLES.superiorManaPotion, 'Superior Mana Potion removed (user round 12)');
    T.eq(['greaterArcaneElixir', 'shadowPower', 'firePower', 'magebloodElixir'].map(function (k) { return WL.CONSUMABLES[k].icon; }).join(','),
      'inv_potion_25,inv_potion_46,inv_potion_33,inv_potion_45', 'Classic icons for the 4 elixirs with a wrong Forever DB icon');
    T.near(WL.computeStats(b, 'human', only(base(), ['shadowPower'])).schoolSp.shadow, 40, 1e-9, 'Elixir of Shadow Power +40 Shadow SP');
    T.near(WL.computeStats(b, 'human', only(base(), ['kreegsStout'])).int - s0.int, -5, 1e-9, "Kreeg's Stout −5 Int");
    T.near(WL.computeStats(b, 'human', only(base(), ['greaterMageblood'])).mp5, 20, 1e-9, 'Greater Mageblood 20 MP5');
    T.near(WL.computeStats(b, 'human', only(base(), ['flaskNaturalSwiftness'])).hastePct, 5, 1e-9, 'Flask of Natural Swiftness +5% haste');
    var ck = base(); only(ck, ['cerebralCortex']); ck.buffs.blessingOfKings.on = true;
    T.near(WL.computeStats(b, 'human', ck).int, (310 + 25) * 1.1, 1e-9, 'consumable Int is multiplied by Kings');

    T.group('weapon slot');
    var ss = tb(['shadowBolt'], 'spellstone');
    var sOil = WL.computeStats(ss, 'human', only(base(), ['buildOil']));
    T.near(sOil.hastePct, 2, 1e-9, 'buildOil → Major Spellstone +2% haste');
    T.near(sOil.schoolSp.shadow, 21, 1e-9, 'buildOil → Major Spellstone +21 Shadow SP');
    var sBwo = WL.computeStats(ss, 'human', only(base(), ['brilliantWizardOil']));
    T.near(sBwo.sp - s0.sp, 36, 1e-9, 'Brilliant Wizard Oil +36 SP');
    T.near(sBwo.critPct - s0.critPct, 1, 1e-9, 'Brilliant Wizard Oil +1% crit');
    T.near(sBwo.hastePct + sBwo.schoolSp.shadow, 0, 1e-9, 'Brilliant Wizard Oil alone (stone unticked): no haste, no Shadow SP');
    T.eq(sBwo.oilName, 'Brilliant Wizard Oil', 'oilName reports the oil');
    // Round 86 (user, found in game): the stone and a weapon oil are not exclusive — both count.
    var sBoth = WL.computeStats(ss, 'human', only(base(), ['buildOil', 'brilliantWizardOil']));
    T.near(sBoth.hastePct, 2, 1e-9, 'Spellstone + Brilliant Wizard Oil: +2% haste from the stone');
    T.near(sBoth.schoolSp.shadow, 21, 1e-9, 'Spellstone + Brilliant Wizard Oil: +21 Shadow SP from the stone');
    T.near(sBoth.sp - s0.sp, 36, 1e-9, 'Spellstone + Brilliant Wizard Oil: +36 SP from the oil');
    T.near(sBoth.critPct - s0.critPct, 1, 1e-9, 'Spellstone + Brilliant Wizard Oil: +1% crit from the oil');
    T.eq(sBoth.oilName, 'Major Spellstone + Brilliant Wizard Oil', 'oilName names both');
    var fs2 = WL.computeStats(tb(['shadowBolt'], 'firestone'), 'human', only(base(), ['buildOil', 'brilliantWizardOil']));
    T.near(fs2.critPct - s0.critPct, 3, 1e-9, 'Firestone + Brilliant Wizard Oil: +2% + 1% crit');
    T.eq(WL.CONSUMABLES.buildOil.group, 'stone', 'the stone is its own group');
    T.eq(['brilliantWizardOil', 'wizardOil', 'brilliantManaOil'].map(function (k) { return WL.CONSUMABLES[k].group; }).join(','), 'weapon,weapon,weapon', 'the oils share the weapon-oil group');
    var two = WL.computeStats(ss, 'human', only(base(), ['brilliantWizardOil', 'wizardOil']));
    T.near(two.sp - s0.sp, 36, 1e-9, 'two oils ticked: only the first counts');
    T.near(WL.computeStats(ss, 'human', only(base(), ['brilliantManaOil'])).mp5, 15, 1e-9, 'Brilliant Mana Oil 15 MP5');
    var sNone = WL.computeStats(ss, 'human', only(base(), []));
    T.near(sNone.hastePct + sNone.schoolSp.shadow, 0, 1e-9, 'weapon slot empty → no Spellstone');
    var noCons = base(); delete noCons.consumables;
    T.near(WL.computeStats(ss, 'human', noCons).hastePct, 2, 1e-9, 'config without consumables → per-build oil (old behaviour)');

    T.group('one per group');
    var both = only(base(), ['flaskSupremePower', 'flaskDistilledWisdom', 'greaterArcaneElixir', 'shadowPower']);
    var act = WL.activeConsumables(both).map(function (x) { return x.key; }).join(',');
    T.eq(act, 'flaskSupremePower,greaterArcaneElixir,shadowPower', 'second flask ignored, different groups stack');
    var sb = WL.computeStats(b, 'human', both);
    T.near(sb.maxMana, s0.maxMana, 1e-9, 'ignored Distilled Wisdom adds no mana');
    T.near(sb.sp - s0.sp, 185, 1e-9, 'Supreme Power 150 + Greater Arcane 35');
  });

  T.run('consumables in the fight', function () {
    T.group('mana potion + rune (separate cooldowns)');
    var c = det(only(base(), ['majorManaPotion', 'demonicRune']));
    var r = WL.simulateOnce(tb(['shadowBolt']), 'human', c, { seed: 7, duration: 180, log: true });
    var uses = r.log.filter(function (e) { return e.type === 'consumable'; });
    var pots = uses.filter(function (e) { return e.spell === 'Major Mana Potion'; }), runes = uses.filter(function (e) { return e.spell === 'Demonic / Dark Rune'; });
    var maxMana = WL.computeStats(tb([]), 'human', c).maxMana;
    T.ok(pots.length >= 1 && runes.length >= 1, 'both potion (' + pots.length + ') and rune (' + runes.length + ') used');
    T.ok(pots.every(function (e) { return e.gain === 1800; }) && runes.every(function (e) { return e.gain === 1200; }), 'gains 1800 / 1200');
    T.ok(uses.every(function (e) { return maxMana - (e.mana - e.gain) >= e.gain - 1; }), 'only used when at least the amount is missing');
    for (var i = 1; i < pots.length; i++) T.ok(pots[i].t - pots[i - 1].t >= 120 - 1e-6, 'potion cooldown ≥ 120 s (' + pots[i - 1].t + ' → ' + pots[i].t + ')');
    T.near(r.manaFromConsumables, 1800 * pots.length + 1200 * runes.length, 1e-6, 'manaFromConsumables = sum of gains');
    var r0 = WL.simulateOnce(tb(['shadowBolt']), 'human', det(only(base(), [])), { seed: 7, duration: 180, log: false });
    T.ok(r.lifeTaps < r0.lifeTaps, 'fewer Life Taps with potion + rune (' + r.lifeTaps + ' vs ' + r0.lifeTaps + ')');
    T.ok(r.dps > r0.dps, 'more DPS with potion + rune (' + r.dps.toFixed(1) + ' vs ' + r0.dps.toFixed(1) + ')');

    T.group('restored mana potion (20% of max mana)');
    var cr = det(only(base(), ['restoredManaPotion']));
    var rr = WL.simulateOnce(tb(['shadowBolt']), 'human', cr, { seed: 7, duration: 180, log: true });
    var mm = WL.computeStats(tb([]), 'human', cr).maxMana, ru = rr.log.filter(function (e) { return e.type === 'consumable'; });
    T.ok(ru.length >= 1 && ru.every(function (e) { return e.gain === Math.round(mm * 0.2); }), 'gain = 20% of ' + fmt0(mm) + ' mana');

    T.group('Major Spellblasting Potion (+40 SP for 30 s at the pull)');
    var cs = det(only(base(), ['majorSpellblasting']));
    var rs = WL.simulateOnce(tb(['shadowBolt']), 'human', cs, { seed: 7, duration: 180, log: true });
    var su = rs.log.filter(function (e) { return e.type === 'consumable'; });
    T.ok(su.length === 2, 'used twice in 180 s (t = ' + su.map(function (e) { return e.t; }).join(', ') + ')');
    T.near(su[0].t, 0, 1e-9, 'first use at the pull');
    T.ok(su[1].t >= 120 - 1e-6, 'second use after the 2 min cooldown');
    var rs0 = WL.simulateOnce(tb(['shadowBolt']), 'human', det(only(base(), [])), { seed: 7, duration: 180, log: false });
    T.ok(rs.dps > rs0.dps, 'more DPS with Spellblasting (' + rs.dps.toFixed(1) + ' vs ' + rs0.dps.toFixed(1) + ')');
    var gain = rs.dps - rs0.dps, sbCoef = WL.SPELLS.shadowBolt.coef || 0.857;
    // ~60 s of +40 SP out of 180 s → roughly 40 × coef / 3 s-per-bolt... sanity band only
    T.ok(gain > 1 && gain < 40 * sbCoef, 'DPS gain in a plausible band (' + gain.toFixed(2) + ')');
  });
  function fmt0(x) { return Math.round(x); }
})();
