// Round 220 tests (user: "looks like those bracers can roll up to 22. put them on the bis list", with an in-game screenshot of
// Tearfall Bracers of Shadow Wrath): the item kept as its +22 Shadow Wrath roll, main wrist of the two Shadow builds.
(function () {
  T.run('round 220: Tearfall Bracers of Shadow Wrath', function () {
    var B = WL.ITEMS[13409], P = WL.PRE_RAID_BIS;
    T.ok(B && B.name === 'Tearfall Bracers of Shadow Wrath' && B.slot === 'wrist' && B.quality === 'rare' && B.stats.shadowSp === 22 && Object.keys(B.stats).length === 1,
      'the item: blue wrist, the +22 Shadow Wrath roll, nothing else the sim counts');
    T.ok(B.from === 'Drop: The Unforgiven' && !B.raid && (B.phase || 1) === 1, 'from The Unforgiven (Stratholme), not a raid item, Phase 1');
    T.eq(P.wrack_ds.wrist, 13409, 'Wrack DS wrist: Tearfall Bracers (+0.8 DPS over Flameweave Cuffs +21)');
    T.eq(P.demo_pact_succ_sb.wrist, 13409, 'Shadow Demo wrist: Tearfall Bracers (+2.0 DPS over Sublime Wristguards)');
    T.ok(['demo_pact_fire', 'destro_incin_succ', 'destro_incin_ds'].every(function (k) { return P[k].wrist === 18497; }), 'the fire builds keep Sublime Wristguards (Tearfall −5.7 … −7.6)');
    if (!WL.ITEM_TIPS) { T.ok(true, 'item tooltips not loaded on this page'); return; }
    var t = WL.ITEM_TIPS[13409] || '';
    T.ok(/Tearfall Bracers of Shadow Wrath/.test(t) && /35 Armor/.test(t) && /\+11 Shadow Resistance/.test(t) && /by up to <span>22<\/span>/.test(t) && /Requires Level 52/.test(t),
      'its tooltip as the game shows it (35 Armor, +11 Shadow Resistance, Equip: … up to 22)');
  });
})();
