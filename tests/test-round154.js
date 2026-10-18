// Round 154 tests (user): the gear builder's item list from the Wowhead Forever database (data/item-db.js, made by
// tools/gen-items.js): only what a Warlock can wear with at least one stat the sim uses, ratings turned into % with the
// sim's own rates, every item with an icon on the icon sheet.
(function () {
  T.run('round 154: the item list', function () {
    var I = WL.ITEMS, ids = Object.keys(I), useful = ['sp', 'shadowSp', 'fireSp', 'hitPct', 'critPct', 'hastePct', 'pierce', 'spellPen', 'int', 'spi', 'mp5'];
    var Q = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact', 'heirloom'];
    T.group('the list');
    T.ok(WL.ITEM_DB && WL.ITEM_DB.count === ids.length && ids.length > 1000, WL.ITEM_DB.count + ' items, collected ' + WL.ITEM_DB.collected);
    var bad = ids.filter(function (id) {
      var it = I[id], st = it.stats || {};
      return !/^\d+$/.test(id) || !it.name || !WL.GEAR_SLOTS.some(function (s) { return s.fits.indexOf(it.slot) >= 0; }) || Q.indexOf(it.quality) < 0 ||
        !Object.keys(st).every(function (k) { return WL.GEAR_STAT_KEYS.indexOf(k) >= 0 && st[k] > 0; }) || !useful.some(function (k) { return st[k]; }) ||
        !(it.icon >= 0 && it.icon < WL.ITEM_ICONS.names.length);
    });
    T.eq(bad.length, 0, 'every item: a game id, a name, a slot a Warlock has, a quality, positive stats of the sheet, at least one that is not Stamina, an icon', bad.slice(0, 5).map(function (id) { return id + ' ' + I[id].name; }).join('; '));
    var per = {}; ids.forEach(function (id) { per[I[id].slot] = (per[I[id].slot] || 0) + 1; });
    T.ok(['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger', 'trinket', 'offHand', 'ranged'].every(function (s) { return per[s] > 0; }) && (per.oneHand || 0) + (per.mainHand || 0) + (per.twoHand || 0) > 0,
      'items for every slot', JSON.stringify(per));
    T.ok(!ids.some(function (id) { return /\(TEST\)|^Test\b/i.test(I[id].name); }), 'no test items');
    var w = {}; ids.forEach(function (id) { if (I[id].weapon) w[I[id].weapon + ':' + I[id].slot] = 1; });
    T.ok(Object.keys(w).every(function (k) { return /^(dagger|sword):(oneHand|mainHand)$|^staff:twoHand$|^wand:ranged$/.test(k); }), 'weapons: daggers and swords one-handed, staves two-handed, wands in the wand slot', Object.keys(w).join(', '));

    T.group('stats as on the tooltip (ratings → %: 10 hit = 1%, 14 crit = 1%, 10 haste = 1%)');
    var eq = function (id, want, what) { var it = I[id]; T.eq(it ? JSON.stringify(it.stats) : 'missing', JSON.stringify(want), what + ' (' + id + ')'); };
    eq(240139, { sp: 36, hitPct: 1, hastePct: 2, int: 14, spi: 20, sta: 12 }, 'Heretic Sandals: 36 spell power, 1% hit, 2% haste');
    eq(22943, { sp: 28, spellPen: 13, int: 8, sta: 9 }, 'Malice Stone Pendant: 13 Spell Penetration (its own stat, not Spell Pierce; round 155)');
    eq(14153, { sp: 46, int: 9, sta: 10 }, 'Robe of the Void (Forever: Intellect 9 added, Stamina 10)');
    T.eq(I[14153] && I[14153].slot, 'chest', 'a robe goes in the chest slot');
    T.ok(!I[22496] && !I[22512] && I[22510], 'pieces of other classes\' sets are out (round 155: Frostfire = Mage, Faith = Priest), the Warlock set stays (Plagueheart)');
    T.ok(!I[276765], 'Leafre\'s Ring of Precise Spell Power is out (round 155, user)');

    T.group('icons');
    var IC = WL.ITEM_ICONS;
    T.ok(IC.file === 'art/items/icons.jpg' && IC.size === 36 && IC.cols === 24 && IC.names.length > 0, 'one sheet, ' + IC.names.length + ' icons of 36 px, 24 per row (items and enchants)');
    T.eq(new Set(IC.names).size, IC.names.length, 'each icon once');
  });
})();
