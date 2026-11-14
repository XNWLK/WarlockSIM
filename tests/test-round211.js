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
