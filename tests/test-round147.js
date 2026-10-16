// Round 147 tests (user): the gear builder — a character window whose items add up into the Stats panel's Sheet (gear)
// values (data/items.js, app/gear-builder.js), and its place in settings codes and share links (engine/settings-code.js).
// The fight engine reads cfg.gear as before and never the items.
(function () {
  T.run('round 147: gear builder', function () {
    var C = function () { return JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); };
    var near = function (a, b) { return Math.abs(a - b) < 1e-9; };

    T.group('gear builder: the slots and the item list');
    var keys = WL.GEAR_SLOTS.map(function (s) { return s.key; });
    T.eq(WL.GEAR_SLOTS.length, 19, '19 slots, as on the character window');
    T.ok(keys.every(function (k, i) { return keys.indexOf(k) === i; }), 'every slot key once');
    T.eq(['left', 'right', 'weapons'].map(function (c) { return WL.GEAR_SLOTS.filter(function (s) { return s.col === c; }).length; }).join('/'), '8/8/3', '8 on the left, 8 on the right, 3 weapons');
    T.ok(WL.GEAR_SLOTS.every(function (s) { return s.name && s.fits && s.fits.length; }), 'every slot has a name and the item types it takes');
    T.ok(WL.GEAR_STAT_KEYS.every(function (k) { return k in WL.DEFAULT_CONFIG.gear; }), 'every item stat is a Sheet (gear) value (' + WL.GEAR_STAT_KEYS.join(', ') + ')');
    T.ok(WL.ITEMS && typeof WL.ITEMS === 'object', 'the item list exists (' + Object.keys(WL.ITEMS).length + ' items so far)');
    var fitsAny = function (it) { return WL.GEAR_SLOTS.some(function (s) { return s.fits.indexOf(it.slot) >= 0; }); };
    T.ok(Object.keys(WL.ITEMS).every(function (id) {
      var it = WL.ITEMS[id];
      return /^\d+$/.test(id) && it.name && fitsAny(it) && Object.keys(it.stats || {}).every(function (k) { return WL.GEAR_STAT_KEYS.indexOf(k) >= 0; });
    }), 'every listed item: a game item id, a name, a slot that exists, only known stats');

    T.group('gear builder: a naked character');
    var c = C(), n = WL.gearNaked(c);
    T.ok(near(n.critPct, 1.7 + 110 / 60), 'crit on the sheet: 1.7% + 110 Intellect / 60 = ' + n.critPct.toFixed(4) + '%');
    T.ok(WL.GEAR_STAT_KEYS.every(function (k) { return k === 'critPct' || n[k] === 0; }), 'everything else 0 (base Intellect, Spirit, Stamina and Agility are added by the sim, not the sheet)');
    var empty = WL.gearSheet({ slots: {}, manual: {} }, c);
    T.eq(empty.sheet.critPct, 3.53, 'nothing worn: the sheet says 3.53% crit');
    T.eq(empty.used.length, 0, '… and no slot counts');

    T.group('gear builder: items add up');
    var own = function (slot, stats, extra) { return { custom: Object.assign({ name: 'Test ' + slot, slot: slot, stats: stats }, extra || {}) }; };
    var g = { slots: {
      head: own('head', { sp: 30, int: 20, critPct: 1 }),
      neck: own('neck', { hitPct: 1, sta: 8 }),
      finger1: own('finger', { sp: 12, hitPct: 1 }),
      finger2: own('finger', { shadowSp: 25 }),
      trinket1: own('trinket', { sp: 20, mp5: 4 }),
      mainHand: own('oneHand', { sp: 40, int: 10, hastePct: 1 }, { weapon: 'sword' }),
      offHand: own('offHand', { int: 6, spi: 5, pierce: 10 }),
    }, manual: {} };
    var r = WL.gearSheet(g, c);
    T.eq(r.used.length, 7, 'seven slots filled, seven count');
    T.eq([r.sheet.sp, r.sheet.shadowSp, r.sheet.hitPct, r.sheet.hastePct, r.sheet.pierce, r.sheet.int, r.sheet.spi, r.sheet.sta, r.sheet.mp5].join('/'),
      '102/25/2/1/10/36/5/8/4', 'spell power 102, Shadow 25, hit 2%, haste 1%, Spell Pierce 10, Intellect 36, Spirit 5, Stamina 8, MP5 4');
    T.eq(r.sheet.critPct, WL.gearRound(1.7 + 110 / 60 + 1 + 36 / 60), 'crit = naked 3.53% + 1% from the head + 36 Intellect / 60 = ' + r.sheet.critPct + '%');
    var g2 = JSON.parse(JSON.stringify(g)); g2.slots.mainHand = own('twoHand', { sp: 60 }, { weapon: 'staff' });
    var r2 = WL.gearSheet(g2, c);
    T.ok(r2.offHandBlocked && r2.used.indexOf('offHand') < 0, 'a two-handed weapon (staff): the off hand does not count');
    T.eq([r2.sheet.sp, r2.sheet.int, r2.sheet.pierce].join('/'), '122/20/0', '… its stats are gone from the sum (spell power 122, Intellect 20, Spell Pierce 0)');
    var g3 = JSON.parse(JSON.stringify(g)); delete g3.slots.mainHand.custom.weapon;
    var g4 = { slots: { head: own('finger', { sp: 99 }), neck: { id: 999999999 } }, manual: {} };
    T.eq(WL.gearSheet(g4, c).used.length, 0, 'a ring in the head slot and an item id this page does not know: neither counts');
    T.ok(WL.gearFits('mainHand', { slot: 'twoHand' }) && WL.gearFits('mainHand', { slot: 'oneHand' }) && !WL.gearFits('offHand', { slot: 'oneHand' }), 'weapons: one- and two-handed in the main hand, no weapon in the off hand');

    T.group('gear builder: what you type on top');
    var g5 = JSON.parse(JSON.stringify(g)), sp = 150;
    g5.manual.sp = WL.gearManualFor(g5, c, 'sp', sp);
    T.eq(g5.manual.sp, 48, 'you type 150 spell power where the items give 102: your addition is 48');
    T.eq(WL.gearSheet(g5, c).sheet.sp, sp, '… and the sheet says 150');
    g5.manual.int = WL.gearManualFor(g5, c, 'int', 96);
    var r5 = WL.gearSheet(g5, c);
    T.eq(r5.sheet.int, 96, 'Intellect typed as 96: the sheet says 96');
    T.eq(r5.sheet.critPct, WL.gearRound(1.7 + 110 / 60 + 1 + 96 / 60), '… and crit follows the extra 60 Intellect (+1%): ' + r5.sheet.critPct + '%');
    g5.manual.critPct = WL.gearManualFor(g5, c, 'critPct', 9);
    T.eq(WL.gearSheet(g5, c).sheet.critPct, 9, 'crit typed as 9%: the sheet says 9%');
    var r6 = WL.gearSheet({ slots: {}, manual: { sp: 500, hitPct: 5 } }, c);
    T.eq([r6.sheet.sp, r6.sheet.hitPct].join('/'), '500/5', 'additions alone, no items: they are the sheet');

    T.group('gear builder: in settings codes and share links');
    var c0 = C();
    T.ok(!('gb' in WL.settingsSnapshot(c0)), 'the default settings carry no gear builder (the shipped results stay valid)');
    c0.gearBuilder = { on: false, slots: g.slots, manual: {} };
    T.ok(!('gb' in WL.settingsSnapshot(c0)), 'switched off: its items are not part of the settings');
    c0.gearBuilder.on = true;
    var snap = WL.settingsSnapshot(c0);
    T.ok(snap.gb && JSON.stringify(snap.gb.slots) === JSON.stringify(g.slots), 'switched on: the settings carry its items');
    var c1 = C(); WL.applySettings(c1, WL.decodeSettings(WL.encodeSettings(c0)));
    T.ok(c1.gearBuilder && c1.gearBuilder.on && JSON.stringify(c1.gearBuilder.slots) === JSON.stringify(g.slots), 'a settings code brings the builder back on, with the same items');
    var c2 = C(); c2.gearBuilder = { on: true, slots: g.slots, manual: {} };
    WL.applySettings(c2, WL.decodeSettings(WL.encodeSettings(C())));
    T.ok(c2.gearBuilder.on === false && Object.keys(c2.gearBuilder.slots).length === 7, 'a code without it switches it off and keeps the items you had');
    var d = WL.settingsDiff(snap);
    T.ok('gb' in d && JSON.stringify(WL.settingsMerge(d).gb) === JSON.stringify(snap.gb), 'a share link carries it as a difference and gets it back');
    T.ok(!('gb' in WL.settingsDiff(WL.settingsSnapshot(C()))), '… and a link without it has none');

    T.group('gear builder: the fight engine does not read it');
    var b = WL.findBuild('demo_pact_fire'), x0 = C(), x1 = C();
    x0.combat.levelResist.on = false; x1.combat.levelResist.on = false;
    x1.gearBuilder = { on: true, slots: g.slots, manual: { sp: 1000 } };
    var a = WL.simulate(b, 'orc', x0, { iterations: 10, log: false }), z = WL.simulate(b, 'orc', x1, { iterations: 10, log: false });
    T.ok(a.dps === z.dps, 'the same gear numbers with and without a builder in the settings: the same DPS over 10 fights (' + a.dps.toFixed(3) + ')');
  });
})();
