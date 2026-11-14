// Round 211 tests (user, with an in-game tooltip of Dreadmist Belt: "these are the dreadmist set bonuses. and deathmist is
// the other way around, so the 2 piece deathmist is the 6 piece dreadmist etc"): the game's set bonuses for Dreadmist
// Raiment (183) and the quest Deathmist Raiment (518; the vendor pieces, set 1681, are out), in the gear builder and the tooltips.
(function () {
  T.run('round 211: Dreadmist / Deathmist set bonuses from the game', function () {
    var S = WL.ITEM_SETS, by = function (sid) { var o = {}; S[sid].bonuses.forEach(function (b) { o[b.n] = b; }); return o; };
    var dr = by(183), de = by(518);
    T.group('set data');
    T.ok(S[183].game && S[518].game, 'both sets carry the game\'s bonuses');
    T.eq(dr[3].stats.sp, 12, 'Dreadmist (3): +12 spell power, as in the game (Wowhead said 18)');
    T.eq(dr[6].stats.mp5, 8, 'Dreadmist (6): 8 MP5');
    T.ok(/All Resistances/.test(dr[2].text) && !dr[2].stats, 'Dreadmist (2): +8 All Resistances (no stat of the sim)');
    T.ok([2, 3, 4, 5, 6].every(function (n) { return de[n] && de[n].text === dr[8 - n].text; }), 'Deathmist (n) = Dreadmist (8 − n), for 2 to 6 pieces');
    T.ok(de[2].stats.mp5 === 8 && de[5].stats.sp === 12 && !de[6].stats, 'Deathmist (2): 8 MP5, (5): +12 spell power, (6): resistances');
    T.eq(S[518].items.length, 8, 'quest Deathmist: 8 pieces in the gear builder');
    T.ok(!S[1681] && !WL.ITEMS[226905] && !WL.ITEMS[226911], 'the vendor Deathmist (set 1681) is not in the item list (user: "can be tossed")');
    T.ok(!/up to 23/.test(S[518].bonuses.map(function (b) { return b.text; }).join(' ')), 'quest Deathmist: Wowhead\'s 23 spell power bonus is gone');

    T.group('gear builder');
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    var wear = function (ids) { var s = {}; ids.forEach(function (id) { s[WL.GEAR_SLOTS.filter(function (g) { return WL.gearFits(g.key, WL.ITEMS[id]) && !s[g.key]; })[0].key] = { id: id }; }); return { on: true, slots: s, manual: {}, enchants: {} }; };
    var d2 = WL.gearSheet(wear(S[518].items.slice(0, 2)), D), d5 = WL.gearSheet(wear(S[518].items.slice(0, 5)), D);
    T.ok(d2.sets.mp5 === 8 && d2.sets.sp === 0, 'Deathmist 2 pieces: 8 MP5, no spell power');
    T.ok(d5.sets.mp5 === 8 && d5.sets.sp === 12, 'Deathmist 5 pieces: 8 MP5 + 12 spell power');
    var r3 = WL.gearSheet(wear(S[183].items.slice(0, 3)), D), r6 = WL.gearSheet(wear(S[183].items.slice(0, 6)), D);
    T.ok(r3.sets.sp === 12 && r3.sets.mp5 === 0 && r6.sets.sp === 12 && r6.sets.mp5 === 8, 'Dreadmist 3 pieces: +12 spell power; 6: + 8 MP5');

    T.group('tooltips');
    if (!WL.ITEM_TIPS) { T.warn('data/item-tips.js not loaded'); return; }
    var tb = WL.ITEM_TIPS[22070], dt = WL.ITEM_TIPS[16702];
    T.ok(tb && /\(2\) Set: Restores 8 mana per 5 sec\./.test(tb) && /\(5\) Set: Increases damage and healing done by magical spells and effects by up to 12\./.test(tb), 'Deathmist Belt: the game\'s bonuses, in Deathmist\'s order');
    T.ok(tb && !/Item #/.test(tb) && /<span>Deathmist Robe<\/span>/.test(tb), 'Deathmist Belt: the set\'s pieces by name, so worn pieces count');
    T.ok(dt && /\(3\) Set: Increases damage and healing done by magical spells and effects by up to 12\./.test(dt) && !/up to 18/.test(dt), 'Dreadmist Belt: (3) 12 spell power, as in the game');
  });
})();

// Round 211: the pre-raid BiS lists (data/pre-raid-bis.js, the user's picks).
(function () {
  T.run('round 211: pre-raid BiS lists', function () {
    var P = WL.PRE_RAID_BIS;
    T.ok(P && WL.PRE_RAID_BIS_PHASE === 1, 'data/pre-raid-bis.js is loaded (Phase 1)');
    var keys = Object.keys(P);
    T.eq(keys.length, 5, 'a list for each of the 5 builds');
    keys.forEach(function (k) {
      var L = P[k], bad = [];
      T.ok(WL.BUILDS.some(function (b) { return b.key === k; }), k + ': a build of the sim');
      Object.keys(L).forEach(function (s) { var it = WL.ITEMS[L[s]]; if (!it || !WL.gearFits(s, it) || (it.phase || 1) > 1 || it.raid) bad.push(s + ' ' + L[s]); });
      T.ok(!bad.length, k + ': ' + Object.keys(L).length + ' items, each in the item list, fits its slot, Phase 1, not from a raid', bad.join(', '));
      T.ok(L.finger1 !== L.finger2 && L.trinket1 !== L.trinket2, k + ': two different rings and trinkets');
      T.ok(!(L.offHand && WL.ITEMS[L.mainHand].slot === 'twoHand'), k + ': no off hand with a two-hander');
    });
    T.eq(P.wrack_ds.neck, 19426, 'Wrack DS neck: Orb of the Darkmoon (typed in by the user)');
    T.eq(WL.ITEMS[19426].phase || 1, 1, 'Orb of the Darkmoon is Phase 1 (the user\'s pick)');
  });
})();

// Round 211: gear modes (user: "change the quick gear setups from default & hit capped to Pre-BiS and Custom … have Pre-BiS
// be the items and stats straight from that artifact"; each build its own list; the page starts on Pre-BiS).
(function () {
  T.run('round 211: Pre-BiS gear per build', function () {
    var D = WL.DEFAULT_CONFIG, P = WL.PRE_BIS_GEAR;
    T.group('data and defaults');
    T.ok(WL.PAGE_GEAR_MODE === 'preBis' && WL.pageDefaultConfig().gearMode === 'preBis', 'the page starts on Pre-BiS');
    T.ok(!('gearMode' in D), 'WL.DEFAULT_CONFIG has no gear mode: the engine\'s own default gear is unchanged (500 SP)');
    T.eq(Object.keys(WL.PRE_RAID_BIS).filter(function (k) { return P[k]; }).length, 5, 'data/pre-bis-gear.js has every list');
    T.ok(Object.keys(WL.PRE_RAID_BIS).every(function (k) { return JSON.stringify(P[k].slots) === JSON.stringify(WL.PRE_RAID_BIS[k]); }), 'its items = the lists of data/pre-raid-bis.js (else run node tools/gen-pre-bis.js)');
    T.eq(WL.PRE_RAID_BIS.wrack_ds.head, 22267, 'Wrack DS wears Spellweaver\'s Turban (user)');
    T.ok(!WL.ITEMS[260212].stats.shadowSp && WL.ITEMS[260212].stats.sp === 12, 'Bad Hat: no Shadow damage any more (user), 12 spell power');

    T.group('WL.cfgFor = the gear builder');
    var c = WL.pageDefaultConfig();
    WL.BUILDS.filter(function (b) { return WL.PRE_RAID_BIS[b.key]; }).forEach(function (b) {
      var L = WL.PRE_RAID_BIS[b.key], gb = { on: true, slots: {}, enchants: {}, manual: {} };
      Object.keys(L).forEach(function (s) { gb.slots[s] = { id: L[s] }; });
      var EN = WL.PRE_RAID_BIS_ENCHANTS; Object.keys(EN).forEach(function (s) { if (L[s]) gb.enchants[s] = typeof EN[s] === 'number' ? { id: EN[s] } : EN[s]; });   // round 213
      var sh = WL.gearSheet(gb, c).sheet, g = WL.cfgFor(b, c).gear;
      T.ok(WL.GEAR_STAT_KEYS.every(function (k) { return Math.abs(sh[k] - g[k]) < 1e-9; }), b.short + ': the engine\'s sheet = the gear builder\'s, enchants included (' + g.sp + ' SP, ' + g.critPct + '% crit, ' + g.hastePct + '% haste)');
    });
    T.group('Phase 1 enchants (round 213)');
    var E = WL.PRE_RAID_BIS_ENCHANTS, ce = WL.cfgFor(WL.BUILDS[0], c);
    T.ok(E.head === 2544 && E.legs === 2544 && E.neck === 8218 && E.chest === 928 && E.hands === 931 && E.mainHand === 8217 && E.wrist === 8209 && E.feet.custom, 'head / legs 8 SP, neck 6 SP, chest +3 stats, gloves haste, Revelation (user), wrist +6 spell damage (pick), boots run speed');
    T.ok(WL.equippedEnchantFx(ce).some(function (x) { return x.id === 8217 && x.fx.name === 'Revelation'; }), 'Revelation is on the main hand in the fight');
    T.eq(WL.cfgFor(WL.BUILDS[0], c).gear.hastePct, 1, '+1% haste from the gloves');
    T.ok([2544, 8218, 928, 931, 8217, 8209].every(function (id) { return WL.enchantPhase(id) === 1; }) && WL.enchantPhase(2721) === 6 && WL.enchantPhase(2605) === 4 && WL.enchantPhase(7645) > 1, 'enchant phases: the lists\' enchants Phase 1; Scourge 6, Zandalar 4, Living Stats later');
    T.ok(Object.keys(WL.ENCHANTS).every(function (id) { return WL.ENCHANT_PHASE_GUESS[id] != null; }), 'every enchant has a phase guess (data/enchant-phases.js)');
    var custom = { key: 'my_build_x', talents: {} };
    T.eq(JSON.stringify(WL.cfgFor(custom, c).gearBuilder.slots.head), JSON.stringify({ id: P._common.slots.head }), 'a build without a list (your own) wears the items most builds wear');
    T.ok(WL.cfgFor(WL.BUILDS[0], D) === D, 'no gear mode: the settings as they are');
    var once = WL.cfgFor(WL.BUILDS[0], c); T.ok(WL.cfgFor(WL.BUILDS[0], once) === once, 'applied once (no second swap)');

    T.group('in a fight');
    var b = WL.BUILDS.filter(function (x) { return x.key === 'wrack_ds'; })[0], n = 30;
    var c1 = WL.pageDefaultConfig(); c1.fight.iterations = n;
    var c2 = JSON.parse(JSON.stringify(c1)); delete c2.gearMode; var ap = WL.cfgFor(b, c1); c2.gear = JSON.parse(JSON.stringify(ap.gear)); c2.gearBuilder = JSON.parse(JSON.stringify(ap.gearBuilder));
    T.eq(WL.simulate(b, 'undead', c1).dps, WL.simulate(b, 'undead', c2).dps, 'Pre-BiS = the same fights with that gear typed in and its items in the gear builder');
    T.eq(JSON.stringify(WL.computeStats(b, 'undead', c1)), JSON.stringify(WL.computeStats(b, 'undead', c2)), 'and the same character stats (the detail views)');

    T.group('settings code and share links');
    var sp = WL.settingsSnapshot(WL.pageDefaultConfig());
    T.ok(sp.gm === 'preBis' && !sp.gear && !sp.gb, 'Pre-BiS: the code says so; the gear values and items are not in it');
    var cc = WL.pageDefaultConfig(); cc.gearMode = null; cc.gear.sp = 123; var sc = WL.settingsSnapshot(cc);
    T.ok(sc.gm === 'custom' && sc.gear.sp === 123, 'Custom: the gear values are in it');
    var back = WL.pageDefaultConfig(); WL.applySettings(back, JSON.parse(JSON.stringify(sc)));
    T.ok(!back.gearMode && back.gear.sp === 123, 'a Custom code loads as your own gear');
    var back2 = JSON.parse(JSON.stringify(cc)); WL.applySettings(back2, JSON.parse(JSON.stringify(sp))); T.eq(back2.gearMode, 'preBis', 'a Pre-BiS code switches Pre-BiS on');
    var old = JSON.parse(JSON.stringify(sc)); delete old.gm; var back3 = WL.pageDefaultConfig(); WL.applySettings(back3, old); T.ok(!back3.gearMode, 'an older code (no gear mode) = your own gear');
    var d = WL.settingsDiff(sc), m = WL.settingsMerge(d);
    T.ok(d.gm === 'custom' && m.gm === 'custom' && m.gear.sp === 123, 'a share link of Custom gear: only the differences, merged back right');
    T.eq(JSON.stringify(WL.settingsDiff(sp)), '{}', 'a share link of the default settings carries nothing');
  });
})();
