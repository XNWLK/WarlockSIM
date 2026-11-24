// Round 245 tests — the user's answers of 2026-11-22:
//  1 "30 spellpower isn't available yet.": the weapon enchant Spell Power +30 (2504) is not Phase 1 (guess: Phase 2);
//  2 "these are the ones that are available" (the Wowhead Forever page of item set 1681, Deathmist Raiment): the pieces
//    226905–226912 are in, with set 1681's bonuses; the Classic quest Deathmist (22070–22077, set 518) is out;
//  3 "6min cd is correct.": Weakness Analyzer's cooldown is 360 s (was 90).
(function () {
  function wear(ids) {                                               // the gear builder wearing these items (each in the first free slot it fits)
    var s = {};
    ids.forEach(function (id) { s[WL.GEAR_SLOTS.filter(function (g) { return WL.gearFits(g.key, WL.ITEMS[id]) && !s[g.key]; })[0].key] = { id: id }; });
    return { on: true, slots: s, manual: {}, enchants: {} };
  }

  T.run('round 245: Spell Power +30 is not Phase 1', function () {
    T.group('enchant phase');
    T.ok(WL.ENCHANTS[2504] && WL.ENCHANTS[2504].stats.sp === 30, 'enchant 2504 is the weapon\'s Spell Power +30');
    T.ok(WL.ENCHANT_PHASE_SET[2504] == null, 'no review of it in WL.ENCHANT_PHASE_SET');
    T.eq(WL.ENCHANT_PHASE_GUESS[2504], 2, 'phase guess 2 (user: "30 spellpower isn\'t available yet.")');
    T.eq(WL.enchantPhase(2504), 2, 'WL.enchantPhase(2504) = 2: the gear builder\'s Phase 1 leaves it out');
    // round 247: Wrack DS wielded Intellect +22 (2568); round 251: every list wields a staff with +65 Spell Power (7662)
    T.ok(WL.BUILDS.every(function (b) { return !WL.PRE_RAID_BIS[b.key] || WL.preRaidBisEnchants(b.key).mainHand === 7662; }), 'the Pre-BiS lists do not use Spell Power +30 on the weapon (+65 Spell Power on the staff since round 251)');
  });

  T.run('round 245: Deathmist Raiment is set 1681 (226905–226912)', function () {
    T.group('the pieces (Wowhead Forever, as the user\'s set page)');
    // [id, slot, sp, int, sta, spi, hitPct, pierce]
    var want = [[226905, 'waist', 12, 13, 13, 8, 0, 2], [226906, 'chest', 11, 22, 23, 14, 0, 4], [226907, 'wrist', 7, 12, 12, 0, 0, 1],
      [226908, 'feet', 12, 14, 22, 10, 0, 0], [226909, 'head', 18, 24, 24, 0, 1, 0], [226910, 'legs', 15, 18, 21, 0, 1, 0],
      [226911, 'hands', 13, 13, 16, 0, 1, 0], [226912, 'shoulder', 12, 16, 13, 0, 0, 2]];
    var sum = { sp: 0, int: 0, sta: 0 };
    want.forEach(function (w) {
      var it = WL.ITEMS[w[0]], s = (it && it.stats) || {};
      T.ok(it && it.slot === w[1] && it.set === 1681 && (it.phase || 1) === 1 && (s.sp || 0) === w[2] && (s.int || 0) === w[3] && (s.sta || 0) === w[4] && (s.spi || 0) === w[5] && (s.hitPct || 0) === w[6] && (s.pierce || 0) === w[7],
        w[0] + ' ' + (it ? it.name : '(missing)') + ': ' + w[1] + ', ' + w[2] + ' SP, ' + w[3] + ' Int, ' + w[4] + ' Sta' + (w[5] ? ', ' + w[5] + ' Spi' : '') + (w[6] ? ', 1% hit' : '') + (w[7] ? ', Spell Pierce ' + w[7] : '') + ', set 1681, Phase 1');
      if (it) { sum.sp += s.sp || 0; sum.int += s.int || 0; sum.sta += s.sta || 0; }
    });
    T.ok(sum.sp === 100 && sum.int === 132 && sum.sta === 144, 'the eight pieces: ' + sum.sp + ' spell power, ' + sum.int + ' Intellect, ' + sum.sta + ' Stamina (the set page\'s totals)');
    T.ok(want.every(function (w) { var it = WL.ITEMS[w[0]]; return it && it.icon >= 0 && it.icon < WL.ITEM_ICONS.names.length; }), 'each piece has an icon of the icon sheet (no new icons)');
    T.eq(WL.ITEMS[226911].name, 'Deathmist Wraps', '226911 is the Wraps (the BiS page\'s note moved from 22077)');

    T.group('left out');
    T.ok([22070, 22071, 22072, 22073, 22074, 22075, 22076, 22077].every(function (id) { return !WL.ITEMS[id]; }) && !WL.ITEM_SETS[518], 'the Classic quest Deathmist (22070–22077, set 518): not in the game (user)');
    T.ok([226921, 226922, 226923, 226924, 226925, 226926, 226927, 226928].every(function (id) { return !WL.ITEMS[id]; }), 'the ids of set 1681\'s old piece list (226921–226928, no source): still out');
    T.ok(Object.keys(WL.PRE_RAID_BIS).every(function (k) { return Object.keys(WL.PRE_RAID_BIS[k]).every(function (s) { return WL.PRE_RAID_BIS[k][s] < 22070 || WL.PRE_RAID_BIS[k][s] > 22077; }); }), 'no Pre-BiS list wears a Classic Deathmist piece');

    T.group('set 1681\'s bonuses');
    var S = WL.ITEM_SETS[1681], by = function (n) { return S.bonuses.filter(function (b) { return b.n === n; })[0] || {}; };
    T.ok(S && S.game && S.size === 8 && S.items.join(',') === '226905,226906,226907,226908,226909,226910,226911,226912', 'the set: 8 pieces, 226905–226912');
    T.eq(S.bonuses.map(function (b) { return b.n; }).join(','), '2,3,4,5,6', 'bonuses at 2, 3, 4, 5 and 6 pieces');
    T.ok(/\+8 All Resistances/.test(by(2).text) && (by(3).stats || {}).mp5 === 8 && /5% chance to heal you for 270 to 330/.test(by(4).text) && /2% chance of causing the attacker to flee in terror for 2 sec/.test(by(5).text) && (by(6).stats || {}).sp === 23,
      '(2) +8 all resistances, (3) 8 MP5, (4) 5% heal 270–330, (5) 2% fear 2 s, (6) +23 spell power');
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    var g5 = WL.gearSheet(wear(S.items.slice(0, 5)), D), g6 = WL.gearSheet(wear(S.items.slice(0, 6)), D);
    T.ok(g5.sets.sp === 0 && g5.sets.mp5 === 8 && g6.sets.sp === 23 && g6.sets.mp5 === 8, 'worn: 5 pieces 8 MP5; 6 pieces + 23 spell power');

    T.group('tooltips');
    if (!WL.ITEM_TIPS) { T.warn('data/item-tips.js not loaded'); return; }
    T.ok(S.items.every(function (id) { var h = WL.ITEM_TIPS[id] || ''; return /\(6\) Set: Increases damage and healing done by magical spells and effects by up to 23\./.test(h) && !/Item #/.test(h) && /<span>Deathmist Wraps<\/span>/.test(h); }),
      'every piece: the set\'s pieces by name and its bonuses (Wowhead\'s tooltips show "(0/8)" without bonus lines)');
  });

  T.run('round 245: Weakness Analyzer 6 min cooldown', function () {
    var fx = WL.TRINKET_FX[272438];
    T.group('Weakness Analyzer');
    T.eq(fx.use.cd, 360, 'cd 360 s (user: "6min cd is correct."; was 90)');
    T.ok(!WL.ITEM_TIPS || /\(6 Min Cooldown\)/.test(WL.ITEM_TIPS[272438]), 'its tooltip says "(6 Min Cooldown)"');
    T.ok(fx.use.kind === 'crit' && fx.use.pct === 5 && fx.use.duration === 20 && fx.use.endsOnCrit, 'the rest as before: +5% crit for 20 s or until a direct crit');
    T.eq(WL.trinketSpWorth(fx, WL.pageDefaultConfig()), 0, 'its spell power worth for the item list: 0 as before (a crit effect)');
    T.ok(Object.keys(WL.PRE_RAID_BIS).every(function (k) { return WL.PRE_RAID_BIS[k].trinket2 === 272438; }), 'every Pre-BiS list wears it');
    var c = WL.pageDefaultConfig(); c.fight.durationVarPct = 0;
    var n180 = 0, n400 = [], b = WL.BUILDS.filter(function (x) { return x.key === 'destro_incin_ds'; })[0];
    for (var s = 1; s <= 4; s++) {
      n180 += WL.simulateOnce(b, 'orc', c, { seed: s, duration: 180, log: true }).log.filter(function (e) { return e.type === 'trinket'; }).length;
      n400.push(WL.simulateOnce(b, 'orc', c, { seed: s, duration: 400, log: true }).log.filter(function (e) { return e.type === 'trinket'; }).map(function (e) { return e.t; }));
    }
    T.eq(n180, 4, 'Incinerate DS (Pre-BiS), 180 s fights: one use each');
    T.ok(n400.every(function (u) { return u.length === 2 && u[1] - u[0] >= 360 - 1e-6; }), '400 s fights: two uses, 6 min apart (' + n400.map(function (u) { return u.map(function (t) { return t.toFixed(0); }).join('/'); }).join(', ') + ' s)');
  });
})();
