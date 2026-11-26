// Round 211 tests (user, with an in-game tooltip of Dreadmist Belt: "these are the dreadmist set bonuses. and deathmist is
// the other way around, so the 2 piece deathmist is the 6 piece dreadmist etc"): the game's set bonuses for Dreadmist
// Raiment (183) and Deathmist Raiment, in the gear builder and the tooltips. Round 245 (user, with the Wowhead Forever page of
// set 1681: "these are the ones that are available"): Deathmist is set 1681 (226905–226912); the Classic quest set 518 is out.
(function () {
  T.run('round 211: Dreadmist / Deathmist set bonuses from the game', function () {
    var S = WL.ITEM_SETS, by = function (sid) { var o = {}; S[sid].bonuses.forEach(function (b) { o[b.n] = b; }); return o; };
    var dr = by(183), de = by(1681);
    T.group('set data');
    T.ok(S[183].game && S[1681].game, 'both sets carry the game\'s bonuses');
    T.eq(dr[3].stats.sp, 12, 'Dreadmist (3): +12 spell power, as in the game (Wowhead said 18)');
    T.eq(dr[6].stats.mp5, 8, 'Dreadmist (6): 8 MP5');
    T.ok(/All Resistances/.test(dr[2].text) && !dr[2].stats, 'Dreadmist (2): +8 All Resistances (no stat of the sim)');
    // Round 244 (the user's pick; a public combat-log study): Deathmist takes the reissued row 1681's bonuses, not Dreadmist's in reverse.
    T.ok(/All Resistances/.test(de[2].text) && de[3].stats.mp5 === 8 && !de[5].stats && de[6].stats.sp === 23, 'Deathmist (round 244, row 1681): (2) resistances, (3) 8 MP5, (5) the fear, (6) +23 spell power');
    T.eq(S[1681].items.length, 8, 'Deathmist (set 1681): 8 pieces in the gear builder');
    T.ok(!S[518] && !WL.ITEMS[22070] && !WL.ITEMS[22077], 'the Classic quest Deathmist (set 518) is not in the item list (round 245; rounds 211–244 kept it and tossed set 1681)');
    T.ok(/up to 23/.test(S[1681].bonuses.map(function (b) { return b.text; }).join(' ')), 'Deathmist: the 23 spell power bonus (round 244, row 1681)');

    T.group('gear builder');
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    var wear = function (ids) { var s = {}; ids.forEach(function (id) { s[WL.GEAR_SLOTS.filter(function (g) { return WL.gearFits(g.key, WL.ITEMS[id]) && !s[g.key]; })[0].key] = { id: id }; }); return { on: true, slots: s, manual: {}, enchants: {} }; };
    var d2 = WL.gearSheet(wear(S[1681].items.slice(0, 2)), D), d5 = WL.gearSheet(wear(S[1681].items.slice(0, 5)), D);
    T.ok(!d2.sets.mp5 && d2.sets.sp === 0, 'Deathmist 2 pieces: nothing the sim counts (round 244)');
    T.ok(d5.sets.mp5 === 8 && d5.sets.sp === 0, 'Deathmist 5 pieces: 8 MP5, no spell power (round 244; rounds 211–243 + 12)');
    var r3 = WL.gearSheet(wear(S[183].items.slice(0, 3)), D), r6 = WL.gearSheet(wear(S[183].items.slice(0, 6)), D);
    T.ok(r3.sets.sp === 12 && r3.sets.mp5 === 0 && r6.sets.sp === 12 && r6.sets.mp5 === 8, 'Dreadmist 3 pieces: +12 spell power; 6: + 8 MP5');

    T.group('tooltips');
    if (!WL.ITEM_TIPS) { T.warn('data/item-tips.js not loaded'); return; }
    var tb = WL.ITEM_TIPS[226905], dt = WL.ITEM_TIPS[16702];   // round 245: Deathmist Belt of set 1681 (was 22070)
    T.ok(tb && /\(3\) Set: Restores 8 mana per 5 sec\./.test(tb) && /\(6\) Set: Increases damage and healing done by magical spells and effects by up to 23\./.test(tb), 'Deathmist Belt: row 1681\'s bonuses (round 244)');
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
    T.eq(P.wrack_ds.neck, 22403, 'Wrack DS neck: Nacreous Shell Necklace (round 216, user: "keep vectus as the upgrade and nacreous as main")');
    T.ok(['demo_pact_succ_sb', 'demo_pact_fire', 'destro_incin_succ', 'destro_incin_ds'].every(function (k) { return P[k].neck === 22403; }), 'the other builds: Nacreous Shell Necklace (round 216, user)');
    // round 218: the user's two green Shadow Wrath pieces for Wrack DS (Master's Boots / Belt of Shadow Wrath) are the exception
    // round 251 (user: "make the actual equipped item whatever the 2nd best after ironbark is"): the staff is the other exception
    // — Headmaster's Charge / Elemental Mage Staff are epics
    var GREEN_OK = { 10247: 1, 10255: 1 };
    T.ok(Object.keys(P).every(function (k) { return Object.keys(P[k]).every(function (s) { return WL.ITEMS[P[k][s]].quality === 'rare' || (k === 'wrack_ds' && GREEN_OK[P[k][s]]) || s === 'mainHand'; }); }), 'round 216: every item of every main list is blue (user; round 218: but the two Wrack DS Shadow Wrath greens; round 251: but the staff)');
    T.ok(Object.keys(P).every(function (k) { return P[k].finger1 !== 272407 && P[k].finger2 !== 272407; }) && P.demo_pact_fire.finger2 === 272406 && Object.keys(P).every(function (k) { return P[k].finger2 !== 12543; }), 'round 216: Songstone of Ironforge in the top ring slot where it is worn (round 259: only Incinerate DS still wears it); Channeler\'s Ring instead of Blessed Band of Light (user)');
    // round 251 (user: "basically we're dropping all 1 handers from the list" → "make the actual equipped item whatever the 2nd best
    // after ironbark is"): a staff, no off hand, replaces round 216's one-handers with Obsidian Bauble / Spirit of Aquementas
    T.ok(Object.keys(P).every(function (k) { return P[k].mainHand === (k === 'destro_incin_ds' ? 944 : 13937) && !P[k].offHand; }), 'round 251: every list wields Headmaster\'s Charge (Incinerate DS: Elemental Mage Staff), no off hand (user; was a one-hander + Obsidian Bauble / Spirit of Aquementas)');
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
      var EN = WL.preRaidBisEnchants(b.key); Object.keys(EN).forEach(function (s) { if (L[s]) gb.enchants[s] = typeof EN[s] === 'number' ? { id: EN[s] } : EN[s]; });   // round 213
      var sh = WL.gearSheet(gb, c).sheet, g = WL.cfgFor(b, c).gear;
      T.ok(WL.GEAR_STAT_KEYS.every(function (k) { return Math.abs(sh[k] - g[k]) < 1e-9; }), b.short + ': the engine\'s sheet = the gear builder\'s, enchants included (' + g.sp + ' SP, ' + g.critPct + '% crit, ' + g.hastePct + '% haste)');
    });
    T.group('Phase 1 enchants (round 213)');
    var E = WL.PRE_RAID_BIS_ENCHANTS, ce = WL.cfgFor(WL.BUILDS[0], c);
    T.ok(E.head === 2544 && E.legs === 2544 && E.neck === 8218 && E.chest === 8492 && E.hands === 931 && E.mainHand === 7662 && E.wrist === 7665 && !('offHand' in E) && E.feet.custom, 'head / legs 8 SP, neck 6 SP, chest Mystic Rugged Armor Kit (round 214), gloves haste, +65 Spell Power on the staff (round 251; was Revelation), wrist +16 Spell Power (round 214), no off hand (round 251), boots run speed');
    var gl = {}; WL.BUILDS.forEach(function (x) { if (WL.PRE_RAID_BIS[x.key]) gl[x.key] = WL.preRaidBisEnchants(x.key).hands; });
    T.ok(gl.demo_pact_fire === 8492 && gl.wrack_ds === 8492 && gl.demo_pact_succ_sb === 931 && gl.destro_incin_succ === 931 && gl.destro_incin_ds === 931, 'gloves per build (round 214): the armor kit for Fire Demo and Wrack DS, haste for the others (whichever simmed higher)');
    T.eq(WL.PRE_BIS_GEAR.wrack_ds.enchants.hands.id, 8492, 'the generated Pre-BiS gear has the per-build gloves');
    T.ok(ce.gearBuilder.enchants.mainHand.id === 7662 && !WL.equippedEnchantFx(ce).length, 'round 251: +65 Spell Power is on the main hand in the fight, no weapon effect (Revelation was until round 250)');
    T.eq(WL.cfgFor(WL.BUILDS[0], c).gear.hastePct, 1, '+1% haste from the gloves (' + WL.BUILDS[0].key + ')');
    T.ok([2544, 8218, 8492, 931, 7662, 7665, 7655].every(function (id) { return WL.enchantPhase(id) === 1; }) && WL.enchantPhase(2721) === 6 && WL.enchantPhase(2605) === 4 && WL.enchantPhase(7645) > 1, 'enchant phases: the lists\' enchants Phase 1; Scourge 6, Zandalar 4, Living Stats later');
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
