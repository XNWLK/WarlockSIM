// Round 217 tests (user: "swap wrack main to leggings of torment and the alternative to skyshroud. use 21 shadow wrath bracers
// as main for wrack and sublime als alternative"): the two new items, in the Wrack DS list, with their tooltips.
(function () {
  T.run('round 217: Wrack DS legs and wrist', function () {
    var L = WL.ITEMS[22342], F = WL.ITEMS[11766], W = WL.PRE_RAID_BIS.wrack_ds;
    T.group('items');
    T.ok(L && L.slot === 'legs' && L.quality === 'rare' && L.stats.shadowSp === 34 && L.stats.int === 16 && L.stats.sta === 16,
      'Leggings of Torment: blue legs, +34 Shadow, +16 Int, +16 Sta (its Wowhead Forever page)');
    T.ok(/Valthalak/.test(L.from) && (L.phase || 1) === 1, 'Leggings of Torment: Lord Valthalak, Phase 1');
    T.ok(F && F.name === 'Flameweave Cuffs of Shadow Wrath' && F.slot === 'wrist' && F.stats.shadowSp === 21 && Object.keys(F.stats).length === 1,
      'Flameweave Cuffs: kept as the +21 Shadow Wrath roll, nothing else');
    T.group('list');
    T.eq(W.legs, 22342, 'Wrack DS legs: Leggings of Torment');
    T.eq(W.wrist, 13409, 'Wrack DS wrist: Shadow Wrath bracers (round 220: Tearfall Bracers +22 replaced Flameweave Cuffs +21)');
    T.ok(Object.keys(WL.PRE_RAID_BIS).every(function (k) { return k === 'wrack_ds' || (WL.PRE_RAID_BIS[k].legs !== 22342 && WL.PRE_RAID_BIS[k].wrist !== 11766); }),
      'the other builds keep their legs and wrist');
    T.group('Rugged Mantle of the Timbermaw');
    var R = WL.ITEMS[227808];
    T.ok(R && (R.phase || 1) === 1, 'Rugged Mantle of the Timbermaw: Phase 1 (user: "include these shoulders as an upgrade alternative for all builds"; was 9)');
    T.eq(R.from, 'Vendor: Meilosh', 'Rugged Mantle: sold by Meilosh, not a drop');
    T.ok(Object.keys(WL.PRE_RAID_BIS).every(function (k) { return WL.PRE_RAID_BIS[k].shoulder !== 227808; }), 'no main list wears it (an upgrade only)');
    T.group('tooltips');
    var tl = WL.ITEM_TIPS && WL.ITEM_TIPS[22342], tf = WL.ITEM_TIPS && WL.ITEM_TIPS[11766];
    if (!WL.ITEM_TIPS) { T.ok(true, 'item tooltips not loaded on this page'); return; }
    T.ok(tl && /Shadow spells and effects by up to <span>34/.test(tl) && /78 Armor/.test(tl), 'Leggings of Torment tooltip');
    T.ok(tf && /\+21 Shadow Spell Damage/.test(tf) && /of Shadow Wrath/.test(tf), 'Flameweave Cuffs tooltip shows the Shadow Wrath roll');
  });
})();
