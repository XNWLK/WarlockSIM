// Round 251 tests — the user, 2026-11-24: "change the bis weapon for every build to
// https://www.wowhead.com/forever/item=18534/rod-of-the-ogre-magi with 65 spellpower enchant. make that fix in the bis list
// and the sim. have the upgrade still be ironbark, remove the enchant remark on it. make the alternative the next best staff
// … basically we're dropping all 1 handers from the list. adjust the gear in the sim accordingly"; then, on the staff fights:
// "ironbark should be the upgrade for every build. make the actual equipped item whatever the 2nd best after ironbark is. if
// it is headmasters then make that one equipped and put ogre magi as the alternative. if ogre magi is better than equip that
// and make whatever comes next the alternative".
//  * Realistic Pre-BiS (data/pre-raid-bis.js WL.PRE_RAID_BIS): every build wields the 2nd best staff after Ironbark with +65
//    Spell Power (7662), no off hand — Headmaster's Charge (13937); Incinerate DS Elemental Mage Staff (944), the clear 2nd
//    there in 8 seeds × 4,000 fights. Revelation / the off hand's +9 Intellect / Wrack DS's Intellect +22 are gone.
//  * Max Pre-BiS (WL.MAX_PRE_RAID_BIS): Ironbark Staff with 7662 in every build (Shadow Demo's Sageblade + Therazane's Touch
//    replaced).
//  * The generated gear (data/pre-bis-gear.js) follows; the BiS page (private/bis-page, local only): the equipped staff →
//    ▲ Ironbark Staff without the enchant remark, ▼ Rod of the Ogre Magi (Incinerate DS: Staff of Sorrow, the next staff), no
//    one-hander or off-hand item.
(function () {
  function bk(k) { return WL.BUILDS.filter(function (b) { return b.key === k; })[0]; }
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  var HEADMASTER = 13937, ELEMENTAL = 944, ROD = 18534, SORROW = 280082, IRONBARK = 20220, SP65 = 7662;
  var KEYS = ['demo_pact_succ_sb', 'demo_pact_fire', 'destro_incin_succ', 'destro_incin_ds', 'wrack_ds'];
  var EQUIP = { demo_pact_succ_sb: HEADMASTER, demo_pact_fire: HEADMASTER, destro_incin_succ: HEADMASTER, destro_incin_ds: ELEMENTAL, wrack_ds: HEADMASTER };
  var ALT = {}; ALT[HEADMASTER] = ROD; ALT[ELEMENTAL] = SORROW;
  function staff(id) { var it = WL.ITEMS[id]; return !!(it && it.slot === 'twoHand' && it.weapon === 'staff' && (it.phase || 1) === 1 && !it.raid); }

  T.run('round 251: staves only (the 2nd best staff after Ironbark)', function () {
    T.group('the items and the enchant');
    T.ok([HEADMASTER, ELEMENTAL, ROD, SORROW, IRONBARK].every(staff), 'Headmaster\'s Charge, Elemental Mage Staff, Rod of the Ogre Magi, Staff of Sorrow, Ironbark Staff: Phase 1 staves, not from a raid');
    var hm = WL.ITEMS[HEADMASTER], em = WL.ITEMS[ELEMENTAL];
    T.ok(hm.name === 'Headmaster\'s Charge' && hm.stats.sp === 90 && hm.stats.spi === 20 && hm.stats.sta === 30, 'item 13937: Headmaster\'s Charge, 90 spell power, 20 Spi, 30 Sta');
    T.ok(em.name === 'Elemental Mage Staff' && em.stats.fireSp === 100 && em.stats.pierce === 8 && em.stats.int === 26, 'item 944: Elemental Mage Staff, 100 Fire spell power, 8 Spell Pierce, 26 Int');
    var en = WL.ENCHANTS[SP65];
    T.ok(en && en.name === '+65 Spell Power' && en.stats.sp === 65 && en.twoHand && WL.enchantPhase(SP65) === 1, 'enchant 7662: +65 Spell Power, two-handed weapons, Phase 1');

    T.group('Realistic Pre-BiS (WL.PRE_RAID_BIS)');
    T.eq(Object.keys(WL.PRE_RAID_BIS).sort().join(','), KEYS.slice().sort().join(','), 'the five builds');
    KEYS.forEach(function (k) {
      var L = WL.PRE_RAID_BIS[k], E = WL.preRaidBisEnchants(k);
      T.ok(L.mainHand === EQUIP[k] && !('offHand' in L), k + ': ' + WL.ITEMS[EQUIP[k]].name + ', no off hand');
      T.eq(E.mainHand, SP65, k + ': +65 Spell Power on it');
      T.ok(!('offHand' in E), k + ': no off-hand enchant');
    });
    T.eq(WL.PRE_RAID_BIS_ENCHANTS.mainHand, SP65, 'the common enchant table: +65 Spell Power (was Revelation)');
    T.ok(!('offHand' in WL.PRE_RAID_BIS_ENCHANTS), '… and no off-hand enchant (was +9 Intellect)');
    T.ok(KEYS.every(function (k) { return !(WL.PRE_RAID_BIS_ENCHANTS_BY_BUILD[k] || {}).mainHand; }), 'no build overrides the weapon enchant (Wrack DS\'s Intellect +22 is gone)');

    T.group('Max Pre-BiS (WL.MAX_PRE_RAID_BIS)');
    KEYS.forEach(function (k) {
      var M = WL.MAX_PRE_RAID_BIS[k], ME = WL.MAX_PRE_RAID_BIS_ENCHANTS[k];
      T.ok(M.mainHand === IRONBARK && !('offHand' in M), k + ': Ironbark Staff, no off hand');
      T.ok(ME.mainHand === SP65 && !('offHand' in ME), k + ': +65 Spell Power on it, no off-hand enchant');
    });

    T.group('the generated gear (data/pre-bis-gear.js)');
    [['Realistic', WL.PRE_BIS_GEAR], ['Max', WL.MAX_BIS_GEAR]].forEach(function (x) {
      var G = x[1];
      KEYS.concat(['_common']).forEach(function (k) {
        var g = G[k], it = g && WL.ITEMS[g.slots.mainHand];
        T.ok(it && it.slot === 'twoHand' && !g.slots.offHand && g.enchants.mainHand && g.enchants.mainHand.id === SP65 && !g.enchants.offHand, x[0] + ' ' + k + ': a two-hander with +65 Spell Power, no off hand (' + (it && it.name) + ')');
      });
    });
    T.ok(KEYS.every(function (k) { return WL.PRE_BIS_GEAR[k].slots.mainHand === EQUIP[k]; }) && WL.PRE_BIS_GEAR._common.slots.mainHand === HEADMASTER, 'Realistic: each build\'s staff; _common Headmaster\'s Charge (most builds)');

    T.group('the fights (WL.cfgFor)');
    var c = WL.pageDefaultConfig(), m = WL.pageDefaultConfig(); m.gearMode = 'maxBis';
    KEYS.forEach(function (k) {
      [['Realistic', c], ['Max', m]].forEach(function (x) {
        var g = WL.cfgFor(bk(k), x[1]), gb = g.gearBuilder, sh = WL.gearSheet(gb, x[1]);
        T.ok(!gb.slots.offHand && gb.enchants.mainHand.id === SP65 && !WL.equippedEnchantFx(g).length && sh.enchants.sp >= 65, x[0] + ' ' + k + ': no off hand, +65 Spell Power counted, no weapon effect');
      });
    });
  });

  T.run('round 251: the BiS page (private/bis-page, local only)', function () {
    var nt = src('../private/bis-page/notes.js'), dj = src('../private/bis-page/data.json');
    if (!nt || !dj) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    var N = mod.exports;
    T.group('notes.js');
    T.ok(N.UP[HEADMASTER] === IRONBARK && N.UP[ELEMENTAL] === IRONBARK, '▲ upgrade of each equipped staff: Ironbark Staff (user: "ironbark should be the upgrade for every build")');
    T.ok(N.ALT[HEADMASTER] === ROD, '▼ alternative of Headmaster\'s Charge: Rod of the Ogre Magi (user: "put ogre magi as the alternative")');
    T.ok(N.ALT[ELEMENTAL] === SORROW, '▼ alternative of Elemental Mage Staff (Incinerate DS): Staff of Sorrow, the next staff there');
    T.ok(!(ROD in N.UP) && !(ROD in N.ALT), 'no ▲ / ▼ keyed by Rod of the Ogre Magi any more (it is no main item)');
    T.eq(JSON.stringify(N.NOTE[IRONBARK]), JSON.stringify(['Arathi Basin Exalted']), 'Ironbark Staff\'s note: Arathi Basin Exalted only (user: "remove the enchant remark on it")');

    T.group('data.json (the page\'s data)');
    var D = JSON.parse(dj), oneH = [];
    T.eq(D.builds.length, 5, 'five builds');
    D.builds.forEach(function (b) {
      var a = b.alts.mainHand || {};
      T.ok(b.slots.mainHand === EQUIP[b.key] && !b.slots.offHand && !b.alts.offHand, b.key + ': ' + WL.ITEMS[EQUIP[b.key]].name + ', no off-hand row');
      T.eq(b.ench.mainHand, '+65 Spell Power', b.key + ': its enchant is +65 Spell Power');
      T.ok(a.up && a.up.id === IRONBARK && !a.up.ench && (a.up.minus || []).join('|') === 'Arathi Basin Exalted', b.key + ': ▲ Ironbark Staff, no enchant remark');
      T.ok(a.alt && a.alt.id === ALT[EQUIP[b.key]], b.key + ': ▼ ' + WL.ITEMS[ALT[EQUIP[b.key]]].name);
      Object.keys(b.alts).forEach(function (s) { [b.alts[s].up, b.alts[s].alt].forEach(function (x) { var it = x && WL.ITEMS[x.id]; if (it && (it.slot === 'oneHand' || it.slot === 'mainHand' || it.slot === 'offHand')) oneH.push(b.key + ' ' + s + ' ' + it.name); }); });
    });
    T.ok(!oneH.length, 'no one-hander or off-hand item anywhere on the page', oneH.join(', '));
  });
})();
