// Round 247 tests — the user's answer of 2026-11-23: "keep the note. yes use 22 int for wrack both in the sim and the bis
// list" — Wrack DS's weapon wears Intellect +22 (2568, Enchanting, Phase 1) instead of Revelation (8217); the round 244
// recheck had +22 Intellect 3.1 DPS ahead of Revelation for Wrack DS (4 seeds × 3000 fights). The other builds keep
// Revelation. (The note = Deathmist Wraps' BiS note, unchanged.)
// Round 251 (user: "change the bis weapon for every build to … rod-of-the-ogre-magi with 65 spellpower enchant … basically
// we're dropping all 1 handers from the list" → "make the actual equipped item whatever the 2nd best after ironbark is"):
// every list, Wrack DS's too, wields a staff (Wrack DS: Headmaster's Charge) with +65 Spell Power (7662); Intellect +22 and Revelation are no list's weapon enchant any more. The enchant facts below stay.
(function () {
  function bk(k) { return WL.BUILDS.filter(function (b) { return b.key === k; })[0]; }
  function preBisGb(k, swap) {                                       // the gear builder wearing build k's Pre-BiS list and enchants
    var L = WL.PRE_RAID_BIS[k], EN = WL.preRaidBisEnchants(k), gb = { on: true, slots: {}, enchants: {}, manual: {} };
    Object.keys(L).forEach(function (s) { gb.slots[s] = { id: L[s] }; });
    Object.keys(EN).forEach(function (s) { if (L[s]) gb.enchants[s] = typeof EN[s] === 'number' ? { id: EN[s] } : EN[s]; });
    if (swap) gb.enchants.mainHand = { id: swap };
    return gb;
  }

  T.run('round 247: Wrack DS weapon enchant Intellect +22 (round 251: +65 Spell Power)', function () {
    T.group('the lists (data/pre-raid-bis.js)');
    T.ok(WL.ENCHANTS[2568] && WL.ENCHANTS[2568].name === 'Intellect +22' && WL.ENCHANTS[2568].stats.int === 22 && WL.ENCHANTS[2568].slots.indexOf('mainHand') >= 0, 'enchant 2568: the weapon\'s Intellect +22');
    T.eq(WL.enchantPhase(2568), 1, 'Intellect +22 is Phase 1 (Enchanting)');
    T.ok(!WL.ENCHANT_FX[2568], 'Intellect +22 has no proc (stats only)');
    T.eq(WL.preRaidBisEnchants('wrack_ds').mainHand, 7662, 'Wrack DS: main hand +65 Spell Power (round 251; Intellect +22 in rounds 247–250)');
    T.eq(WL.preRaidBisEnchants('wrack_ds').hands, 8492, 'Wrack DS keeps its gloves\' armor kit (round 214)');
    T.eq(WL.PRE_RAID_BIS_ENCHANTS.mainHand, 7662, 'the common table: +65 Spell Power (round 251; was Revelation)');
    var others = WL.BUILDS.filter(function (b) { return WL.PRE_RAID_BIS[b.key] && b.key !== 'wrack_ds'; });
    T.ok(others.length === 4 && others.every(function (b) { return WL.preRaidBisEnchants(b.key).mainHand === 7662; }), 'the other builds: +65 Spell Power too (round 251): ' + others.map(function (b) { return b.short; }).join(', '));

    T.group('the generated Pre-BiS gear (data/pre-bis-gear.js)');
    var G = WL.PRE_BIS_GEAR;
    T.eq(G.wrack_ds.enchants.mainHand.id, 7662, 'Wrack DS: main hand enchant 7662 (round 251)');
    T.ok(others.every(function (b) { return G[b.key].enchants.mainHand.id === 7662; }) && G._common.enchants.mainHand.id === 7662, 'the other builds and _common: 7662 (round 251)');
    T.eq(G.wrack_ds.sums.int, 71, 'Wrack DS: 71 Intellect from gear and enchants (round 259: Channeler\'s Ring 14 for Songstone of Ironforge 7; 64 in rounds 251–258, Headmaster\'s Charge has none, no Intellect enchant; 104 in rounds 247–250)');

    T.group('the gear sheet');
    var c = WL.pageDefaultConfig(), now = WL.gearSheet(preBisGb('wrack_ds'), c), i22 = WL.gearSheet(preBisGb('wrack_ds', 2568), c);
    T.near(now.enchants.sp - i22.enchants.sp, 65, 1e-9, 'Wrack DS\'s Pre-BiS sheet: +65 Spell Power from the weapon enchant (round 251; enchants ' + now.enchants.sp + ' SP vs ' + i22.enchants.sp + ' with Intellect +22)');
    T.near(i22.sheet.int - now.sheet.int, 22, 1e-9, '… and Intellect +22 in its place would still give +22 on the sheet\'s Intellect');
    var g = WL.cfgFor(bk('wrack_ds'), c);
    T.eq(g.gearBuilder.enchants.mainHand.id, 7662, 'WL.cfgFor (the page\'s default gear): Wrack DS wields +65 Spell Power (round 251)');
    T.near(g.gear.int, now.sheet.int, 1e-9, 'WL.cfgFor\'s Intellect = the gear builder\'s (' + g.gear.int + ')');
    T.ok(!WL.equippedEnchantFx(g).length, 'no weapon enchant effect on Wrack DS');
    T.ok(!WL.equippedEnchantFx(WL.cfgFor(bk('demo_pact_succ_sb'), c)).length, 'round 251: Shadow Demo has no Revelation in the fight any more (+65 Spell Power on its staff)');

    T.group('the fights');
    var gw = WL.cfgFor(bk('wrack_ds'), c); gw.combat.revelationChancePct = 100;
    var any = false;
    for (var s = 1; s <= 3; s++) { var r = WL.simulateOnce(bk('wrack_ds'), 'human', gw, { seed: s, duration: 180, log: true }); if (r.log.some(function (e) { return e.spell === 'Revelation'; })) any = true; }
    T.ok(!any, 'Wrack DS: no Revelation proc in its fights (3 seeds, even at 100% chance)');
    var gs = WL.cfgFor(bk('demo_pact_succ_sb'), c); gs.combat.revelationChancePct = 100; gs.gearBuilder.enchants.mainHand = { id: 8217 };   // round 251: Revelation put on by hand
    var rs = WL.simulateOnce(bk('demo_pact_succ_sb'), 'human', gs, { seed: 1, duration: 180, log: true });
    T.ok(rs.log.some(function (e) { return e.type === 'buff' && e.spell === 'Revelation'; }), 'Shadow Demo with Revelation put on its staff by hand: it procs (control)');
  });
})();
