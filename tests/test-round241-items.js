// Round 241 tests (item sync of 2026-11-22): the crafted Demonheart pieces (273940–273943) are no set pieces (set 2100's
// tooltip lists six other ids), they share "Unique-Equipped: Artisan's Tier (1)", and the gear builder warns when two of
// one unique-equipped category are worn. The new items' tooltips are in data/item-tips.js.
(function () {
  var NAKED = { on: true, slots: {}, enchants: {}, manual: {} };
  function gbWith(slots) { var g = JSON.parse(JSON.stringify(NAKED)); Object.keys(slots).forEach(function (k) { g.slots[k] = { id: slots[k] }; }); return g; }

  T.run('round 241: Demonheart pieces and unique-equipped categories', function () {
    T.group('the four Demonheart items (item sync of 2026-11-22)');
    var want = {
      273940: ['Demonheart Leggings', 'legs', { sp: 20, hitPct: 1.1, int: 19, spi: 10, sta: 16 }],
      273941: ['Demonheart Gloves', 'hands', { sp: 13, critPct: 1, int: 13, sta: 15 }],
      273942: ['Demonheart Spaulders', 'shoulder', { sp: 13, hitPct: 0.9, critPct: 1, int: 11, sta: 13 }],
      273943: ['Demonheart Boots', 'feet', { sp: 17, int: 15, sta: 19 }]
    };
    Object.keys(want).forEach(function (id) {
      var it = WL.ITEMS[id], w = want[id];
      T.ok(!!it, w[0] + ' is in the item list'); if (!it) return;
      T.eq(it.name, w[0], id + ': name'); T.eq(it.slot, w[1], w[0] + ': slot ' + w[1]);
      T.eq(it.quality, 'epic', w[0] + ': epic'); T.eq(it.ilvl, 60, w[0] + ': item level 60'); T.eq(it.from, 'Crafted', w[0] + ': crafted');
      T.eq(JSON.stringify(it.stats), JSON.stringify(w[2]), w[0] + ': stats ' + JSON.stringify(w[2]));
      T.eq(it.uniqueCat, "Artisan's Tier", w[0] + ": Unique-Equipped: Artisan's Tier"); T.eq(it.uniqueMax, 1, w[0] + ': … (1)');
      T.ok(!it.set, w[0] + ': no set link (set 2100 lists six other ids)');
      T.ok(!it.unique, w[0] + ': no plain "Unique" (the category says it)');
    });
    T.ok(!(WL.ITEM_SETS || {})[2100], 'set 2100 Demonheart Raiment is not in WL.ITEM_SETS (none of its pieces is on Wowhead yet)');

    T.group('no set bonus from two pieces');
    var two = gbWith({ legs: 273940, hands: 273941 }), r = WL.gearSheet(two, WL.DEFAULT_CONFIG);
    T.eq(WL.gearSets(two).length, 0, 'Leggings + Gloves: no set');
    T.eq(r.sets.hitPct, 0, '… no +1% spell hit from a (2) bonus');
    T.near(r.items.hitPct, 1.1, 1e-9, '… the Leggings\' own 1.1% hit counts');
    T.eq(r.items.sp, 33, '… spell power 20 + 13');

    T.group('the gear builder\'s warning');
    var w = WL.gearUniqueWarn(gbWith({ legs: 273940 }), 'hands', WL.ITEMS[273941]);
    T.eq(w, "Unique-Equipped: Artisan's Tier (1): you already wear Demonheart Leggings", 'Gloves while wearing the Leggings: ' + w);
    T.eq(WL.gearUniqueWarn(gbWith({ legs: 273940 }), 'legs', WL.ITEMS[273943]), '', 'replacing the Leggings themselves: no warning');
    T.eq(WL.gearUniqueWarn(gbWith({}), 'hands', WL.ITEMS[273941]), '', 'nothing of the category worn: no warning');
    T.eq(WL.gearUniqueWarn(gbWith({ legs: 273940 }), 'hands', { name: 'x', slot: 'hands', stats: {} }), '', 'an item without a category: no warning');
    var over = WL.gearUniqueOver(two);
    T.eq(over.length, 1, 'two Artisan\'s Tier items worn: one category over its limit');
    T.eq(over[0] && over[0].cat, "Artisan's Tier", '… Artisan\'s Tier');
    T.eq(over[0] && over[0].names.join(', '), 'Demonheart Gloves, Demonheart Leggings', '… both named (slot order)');
    T.eq(WL.gearUniqueOver(gbWith({ legs: 273940 })).length, 0, 'one worn: fine');
    var ev = WL.ITEMS[274759];
    T.ok(ev && ev.uniqueCat === 'Everlook Prototype' && ev.uniqueMax === 1, 'Everlook Pathcarver: Unique-Equipped: Everlook Prototype (1)');
    var wr = Object.keys(WL.ITEMS).filter(function (id) { return WL.ITEMS[id].uniqueCat === "Watcher's Ring"; });
    T.ok(wr.length >= 2, "Watcher's Ring: " + wr.length + ' rings share the category');
    if (wr.length >= 2) T.ok(!!WL.gearUniqueWarn(gbWith({ finger1: +wr[0] }), 'finger2', WL.ITEMS[wr[1]]), "… two Watcher's Rings: the warning");
    T.ok(Object.keys(WL.ITEMS).every(function (id) { var it = WL.ITEMS[id]; return !it.uniqueCat || (typeof it.uniqueCat === 'string' && it.uniqueMax >= 1); }), 'every category has a name and a limit');

    // Round 241 review: the gear optimizer compared how many categories were over their limit, so with two Artisan's Tier
    // pieces worn a third passed, and so did fixing Artisan's Tier while breaking another category. Now per category.
    T.group('the optimizer\'s unique check, per category (round 241 review)');
    function put(g, slots) { var a = JSON.parse(JSON.stringify(g)); Object.keys(slots).forEach(function (k) { if (slots[k]) a.slots[k] = { id: slots[k] }; else delete a.slots[k]; }); return a; }
    T.ok(WL.gearUniqueAllowed(two, two), "two Artisan's Tier pieces worn: keeping them is allowed");
    T.ok(!WL.gearUniqueAllowed(two, put(two, { feet: 273943 })), '… adding a third (the Boots) is not');
    T.ok(WL.gearUniqueAllowed(two, put(two, { hands: null })), '… taking one off is');
    if (wr.length >= 2) {
      T.ok(!WL.gearUniqueAllowed(two, put(two, { hands: null, finger1: +wr[0], finger2: +wr[1] })), "… taking one off but wearing two Watcher's Rings is not");
      T.ok(WL.gearUniqueAllowed(two, put(two, { finger1: +wr[0] })), "… one Watcher's Ring with them is");
      T.ok(WL.gearUniqueAllowed(gbWith({}), gbWith({ legs: 273940, finger1: +wr[0] })), 'nothing worn: one of each of two categories is allowed');
    }
    T.ok(!WL.gearUniqueAllowed(gbWith({}), two), '… two of one category is not');

    T.group('one warning for the same Signet Ring in both finger slots (round 241 review)');
    var sg = WL.ITEMS[21201];
    T.ok(sg && sg.unique && sg.uniqueCat === 'Signet Ring of the Bronze Dragonflight', 'Signet Ring of the Bronze Dragonflight (21201): Unique and its category');
    var ws = WL.gearUniqueWarnings(gbWith({ finger1: 21201 }), 'finger2', 21201, sg);
    T.eq(ws.join(' | '), 'Unique: you already wear it in the other slot', 'the same ring in the other slot: only "Unique" (' + ws.length + ' warning)');
    var ws2 = WL.gearUniqueWarnings(gbWith({ finger1: 21201 }), 'finger2', 21202, WL.ITEMS[21202]);
    T.ok(ws2.length === 1 && /^Unique-Equipped: Signet Ring of the Bronze Dragonflight/.test(ws2[0]), 'another Signet Ring: the category\'s warning (' + ws2.join(' | ') + ')');
    T.eq(WL.gearUniqueWarnings(gbWith({ finger1: 21201 }), 'finger1', 21201, sg).length, 0, 'replacing the ring itself: none');

    T.group('a two-hander in the main hand: the off hand does not count (round 241 review)');
    var cat = function (name, slot) { return { name: name, slot: slot, stats: {}, uniqueCat: 'Test Category', uniqueMax: 1 }; };
    var orb = cat('Test Orb', 'offHand'), staff = cat('Test Staff', 'twoHand'), knife = cat('Test Knife', 'oneHand');
    var gOrb = { on: true, slots: { offHand: { custom: orb } }, enchants: {}, manual: {} }, gStaff = { on: true, slots: { mainHand: { custom: staff } }, enchants: {}, manual: {} };
    T.eq(WL.gearUniqueWarn(gOrb, 'mainHand', staff), '', 'a two-hander of the off-hand item\'s category: no warning (the off hand stops counting)');
    T.ok(!!WL.gearUniqueWarn(gOrb, 'mainHand', knife), '… a one-hander of it: the warning');
    T.eq(WL.gearUniqueWarn(gStaff, 'offHand', orb), '', 'an off-hand item under a two-hander: no warning (it does not count)');
    var both = { on: true, slots: { mainHand: { custom: staff }, offHand: { custom: orb } }, enchants: {}, manual: {} };
    T.eq((WL.gearUniqueWorn(both)['Test Category'] || []).length, 1, 'wearing both: only the two-hander counts');
    T.eq(WL.gearUniqueOver(both).length, 0, '… not over the limit');
    T.ok(WL.gearUniqueAllowed(gOrb, both), '… the optimizer may put the two-hander over the off-hand item');

    T.group('other sets unchanged');
    var s345 = (WL.ITEM_SETS || {})[345];
    T.ok(s345 && s345.items.indexOf(272548) >= 0 && s345.items.indexOf(272553) >= 0, "Champion's Threads (345) keeps its Robe and Gloves");

    T.group('tooltips of the new items (data/item-tips.js)');
    if (!WL.ITEM_TIPS) { T.warn('data/item-tips.js not loaded'); return; }
    [273940, 273941, 273942, 273943, 13965, 269741, 274759].forEach(function (id) {
      T.ok(!!WL.ITEM_TIPS[id], id + ' ' + ((WL.ITEMS[id] || {}).name || '') + ': has a tooltip');
    });
    T.ok(/Unique-Equipped: Artisan's Tier \(1\)/.test(WL.ITEM_TIPS[273940] || ''), 'the Leggings\' tooltip says Unique-Equipped: Artisan\'s Tier (1)');
  });
})();
