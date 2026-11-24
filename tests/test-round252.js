// Round 252 tests — the user, 2026-11-25: "make the gear builder load the +65 enchant with the staff. 65 spellpower isn't
// expensive anymore so it's the default enchant for all 2handers".
//  * app/gear-builder.js: WL.TWO_HAND_ENCHANT = 7662 (+65 Spell Power); WL.weaponEnchantFor(item, cur) — a two-hander keeps a
//    two-hand-only enchant or one you typed in, anything else → +65 Spell Power; a one-hander loses a two-hand-only enchant;
//    WL.gearFixWeapon(gb) applies it after a weapon went into the main hand and takes the off hand (and its enchant) off with a
//    two-hander; WL.gearSwapDelta (Compare) puts a new main-hand weapon on the same way.
//  * app/app.js (gbWield): picking a weapon, typing one in, loading a saved set, "Pre-raid BiS · build" (the list's own
//    +65 Spell Power, your other enchants stay), "Max Pre-BiS · build" (its enchants) and "Wear this" of Best combination.
//  * The BiS page (private/bis-page, local only): no "expensive enchant (+65 Spell Power)" / "two-hander: no off hand".
(function () {
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  var SP65 = 7662, REVELATION = 8217, SP30 = 2504, SP55 = 8211, ARCANIST = 7941, INT9_OH = 7659;
  var HEADMASTER = 13937, IRONBARK = 20220, WITCHBLADE = 13964, TOME = 22253;
  var KEYS = ['demo_pact_succ_sb', 'demo_pact_fire', 'destro_incin_succ', 'destro_incin_ds', 'wrack_ds'];
  function id(e) { return e ? (e.custom ? 'custom' : e.id) : null; }
  // what the gear builder holds after "Pre-raid BiS · build" (app.js gbSetLoad): the list's items, your enchants except the
  // weapon's (the list's own) and no off-hand enchant when the list has no off hand; then gbWield (WL.gearFixWeapon)
  function bisLoad(k, mine) {
    var L = WL.PRE_RAID_BIS[k], sl = {}, be = JSON.parse(JSON.stringify(mine)), lw = WL.preRaidBisEnchants(k).mainHand;
    Object.keys(L).forEach(function (s) { sl[s] = { id: L[s] }; });
    if (L.mainHand && lw != null) be.mainHand = typeof lw === 'object' ? lw : { id: lw };
    if (!L.offHand) delete be.offHand;
    return WL.gearFixWeapon({ on: true, slots: sl, enchants: be, manual: {} });
  }
  function maxLoad(k) {                                   // "Max Pre-BiS · build": its items and its enchants
    var M = WL.MAX_BIS_GEAR[k], sl = {};
    Object.keys(M.slots).forEach(function (s) { sl[s] = { id: M.slots[s] }; });
    return WL.gearFixWeapon({ on: true, slots: sl, enchants: JSON.parse(JSON.stringify(M.enchants || {})), manual: {} });
  }
  // your own enchants before the load: Revelation on the weapon (the lists' weapon enchant until round 251), +9 Intellect on
  // the off hand, something on the head
  var MINE = { head: { id: 2544 }, mainHand: { id: REVELATION }, offHand: { id: INT9_OH } };

  T.run('round 252: +65 Spell Power is the default enchant of every two-hander', function () {
    T.group('the rule (WL.weaponEnchantFor)');
    T.eq(WL.TWO_HAND_ENCHANT, SP65, 'WL.TWO_HAND_ENCHANT = 7662');
    var en = WL.ENCHANTS[SP65];
    T.ok(en && en.name === '+65 Spell Power' && en.twoHand && en.stats.sp === 65, '7662: +65 Spell Power, two-handed weapons only');
    var W = WL.weaponEnchantFor, staff = WL.ITEMS[HEADMASTER], one = WL.ITEMS[WITCHBLADE];
    T.ok(staff.slot === 'twoHand' && one.slot === 'mainHand', 'Headmaster\'s Charge is a two-hander, Witchblade a one-hander');
    T.eq(id(W(staff, { id: REVELATION })), SP65, 'a staff with Revelation on the weapon → +65 Spell Power');
    T.eq(id(W(staff, null)), SP65, 'a staff with no weapon enchant → +65 Spell Power');
    T.eq(id(W(staff, { id: SP30 })), SP65, 'a staff with a one-hand enchant (Spell Power +30) → +65 Spell Power');
    T.eq(id(W(staff, { id: 999999 })), SP65, 'a staff with an enchant this page does not know → +65 Spell Power');
    T.eq(id(W(staff, { id: SP65 })), SP65, 'a staff keeps +65 Spell Power');
    T.eq(id(W(staff, { id: SP55 })), SP55, 'a staff keeps a two-hand enchant you chose (Spell Power +55)');
    T.eq(id(W(staff, { id: ARCANIST })), ARCANIST, '… and Grand Arcanist');
    T.eq(id(W(staff, { custom: { name: 'Mine', stats: { sp: 40 } } })), 'custom', '… and an enchant you typed in');
    T.eq(id(W(HEADMASTER, REVELATION)), SP65, 'item and enchant as ids work too');
    T.eq(W(one, { id: SP65 }), null, 'a one-hander drops +65 Spell Power (two-handed weapons only)');
    T.eq(W(one, { id: SP55 }), null, '… and any two-hand-only enchant');
    T.eq(id(W(one, { id: REVELATION })), REVELATION, 'a one-hander keeps Revelation');
    T.eq(W(one, null), null, 'a one-hander with no enchant gets none');
    T.eq(id(W(null, { id: SP65 })), SP65, 'an empty main hand: the enchant stays (it only counts with an item)');
    T.eq(id(W({ name: 'My staff', slot: 'twoHand', stats: { sp: 50 } }, { id: REVELATION })), SP65, 'a staff you typed in → +65 Spell Power');

    T.group('picking a weapon by hand (WL.gearFixWeapon)');
    var g = { on: true, slots: { mainHand: { id: WITCHBLADE }, offHand: { id: TOME } }, enchants: { mainHand: { id: REVELATION }, offHand: { id: INT9_OH } }, manual: {} };
    g.slots.mainHand = { id: HEADMASTER }; WL.gearFixWeapon(g);
    T.eq(id(g.enchants.mainHand), SP65, 'Witchblade + Revelation → pick Headmaster\'s Charge: +65 Spell Power on it');
    T.ok(!g.slots.offHand && !g.enchants.offHand, '… and the off hand (Tome of the Lost, +9 Intellect) comes off');
    var c = WL.pageDefaultConfig(); c.gearMode = null;
    T.ok(WL.gearSheet(g, c).enchants.sp >= 65, '… and the sheet counts the +65 spell power');
    g.slots.mainHand = { id: WITCHBLADE }; WL.gearFixWeapon(g);
    T.ok(!g.enchants.mainHand, 'back to Witchblade: +65 Spell Power is dropped');
    T.eq(WL.gearSheet(g, c).enchants.sp, 0, '… and counts no more');
    g.enchants.mainHand = { id: REVELATION }; g.slots.offHand = { id: TOME }; WL.gearFixWeapon(g);
    T.ok(id(g.enchants.mainHand) === REVELATION && id(g.slots.offHand) === TOME, 'a one-hander keeps Revelation and the off hand');
    g.enchants.mainHand = { id: SP55 }; g.slots.mainHand = { id: IRONBARK }; WL.gearFixWeapon(g);
    T.eq(id(g.enchants.mainHand), SP55, 'a two-hander keeps the two-hand enchant you chose (Spell Power +55)');

    T.group('Compare (WL.gearSwapDelta)');
    var w = { on: true, slots: { mainHand: { id: WITCHBLADE } }, enchants: { mainHand: { id: REVELATION } }, manual: {} };
    var d = WL.gearSwapDelta(w, 'mainHand', { id: HEADMASTER }, c).delta;
    T.eq(d.sp, WL.ITEMS[HEADMASTER].stats.sp - WL.ITEMS[WITCHBLADE].stats.sp + 65, 'Witchblade + Revelation → Headmaster\'s Charge: its spell power and +65 Spell Power');
    T.eq(id(w.enchants.mainHand), REVELATION, '… what you wear is not changed');
    var s2 = { on: true, slots: { mainHand: { id: HEADMASTER } }, enchants: { mainHand: { id: REVELATION } }, manual: {} };
    T.eq(WL.gearSwapDelta(s2, 'mainHand', { id: HEADMASTER }, c).delta.sp, 0, 'comparing the weapon you wear with itself: no change');

    T.group('loading a Pre-raid BiS list (your Revelation and off-hand +9 Intellect before)');
    KEYS.forEach(function (k) {
      var b = bisLoad(k, MINE), it = WL.gearItem(b.slots.mainHand);
      T.ok(it && it.slot === 'twoHand' && id(b.enchants.mainHand) === SP65 && !b.slots.offHand && !b.enchants.offHand && id(b.enchants.head) === 2544,
        k + ': ' + (it && it.name) + ' with +65 Spell Power, no off hand or off-hand enchant, your head enchant stays');
    });
    KEYS.forEach(function (k) {
      var b = bisLoad(k, {});
      T.eq(id(b.enchants.mainHand), SP65, k + ': with no enchants of your own: +65 Spell Power on the staff');
    });

    T.group('loading a Max Pre-BiS list');
    KEYS.forEach(function (k) {
      var b = maxLoad(k), it = WL.gearItem(b.slots.mainHand);
      T.ok(it && it.slot === 'twoHand' && id(b.enchants.mainHand) === SP65 && !b.slots.offHand && !b.enchants.offHand, k + ': ' + (it && it.name) + ' with +65 Spell Power, no off hand');
    });

    T.group('the quick-setup gear (Realistic / Max Pre-BiS, as the fights use it)');
    [['Realistic', WL.PRE_BIS_GEAR], ['Max', WL.MAX_BIS_GEAR]].forEach(function (x) {
      Object.keys(x[1]).forEach(function (k) {
        var G = x[1][k], it = WL.ITEMS[G.slots.mainHand];
        if (it && it.slot === 'twoHand') T.ok(G.enchants.mainHand && G.enchants.mainHand.id === SP65, x[0] + ' ' + k + ': ' + it.name + ' with +65 Spell Power');
      });
    });

    T.group('a saved set with a staff');
    var saved = WL.gearFixWeapon({ on: true, slots: { mainHand: { id: HEADMASTER }, offHand: { id: TOME } }, enchants: { mainHand: { id: REVELATION }, offHand: { id: INT9_OH } }, manual: {} });
    T.ok(id(saved.enchants.mainHand) === SP65 && !saved.slots.offHand && !saved.enchants.offHand, 'staff + Revelation (+ a left-over off hand) → +65 Spell Power, no off hand');
  });

  T.run('round 252: the page code (app/app.js)', function () {
    var app = src('../app/app.js');
    T.group('app/app.js');
    if (!app) { T.warn('app/app.js not readable here (file://)'); return; }
    var fn = function (name) { var i = app.indexOf('function ' + name + '('); return i < 0 ? '' : app.slice(i, app.indexOf('\n  }\n', i)); };
    T.ok(/round 252/.test(app) && app.indexOf("65 spellpower isn't expensive") >= 0, 'a round 252 comment quotes the user');
    T.ok(/WL\.gearFixWeapon\(g\)/.test(fn('gbWield')), 'gbWield puts the weapon\'s enchant on (WL.gearFixWeapon)');
    var load = fn('gbSetLoad');
    T.ok(/preRaidBisEnchants\(v\.slice\(4\)\)\.mainHand/.test(load) && /delete be\.offHand/.test(load), 'Pre-raid BiS · build: the list\'s weapon enchant, no off-hand enchant');
    T.ok(/gbWield\(g\)/.test(load), 'every loaded set (saved, Pre-raid BiS, Max Pre-BiS) goes through gbWield');
    T.ok(/gbSel === 'mainHand' \? gbWield\(g\)/.test(app), 'picking a weapon from the list goes through gbWield');
    T.ok(/s\.key === 'mainHand' \? gbWield\(gb\(\)\)/.test(fn('gbEquip')), 'a weapon typed in goes through gbWield');
    T.ok(/gbWield\(g\)/.test(fn('gbOptWear')) && /WL\.gearFixWeapon\(after\)/.test(fn('gbOptCfg')), 'Best combination: simulated and worn with the weapon\'s enchant');
    T.ok(!/expensive/i.test(app.replace(/isn't expensive/g, '')), 'nothing on the page calls an enchant expensive (the user\'s quote aside)');
  });

  T.run('round 252: the BiS page (private/bis-page, local only)', function () {
    var al = src('../private/bis-page/alts.js'), pg = src('../private/bis-page/pre-raid-bis.html'), gh = src('../private/bis-page/github/index.html'), aj = src('../private/bis-page/alts.json');
    T.group('alts.js and the built pages');
    if (!al || !pg) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    T.ok(al.indexOf("'expensive enchant (+65 Spell Power)'") < 0 && al.indexOf("'two-hander: no off hand'") < 0, 'alts.js: no "expensive enchant" / "two-hander: no off hand" downside');
    T.ok(al.indexOf('PvP, the expensive enchant') < 0 && /isn't expensive anymore/.test(al), 'alts.js: its comments no longer list the enchant as a downside, and quote the user (round 216\'s quote kept as it was)');
    [['alts.json', aj], ['pre-raid-bis.html', pg], ['github/index.html', gh]].forEach(function (x) {
      if (!x[1]) { T.warn(x[0] + ' not readable'); return; }
      T.ok(!/expensive enchant/i.test(x[1]) && !/no off hand/i.test(x[1]), x[0] + ': no "expensive enchant" and no "no off hand"');
    });
  });
})();
