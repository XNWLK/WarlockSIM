// Round 148 tests (user): gear builder enchants, swap differences, item value and gear codes (app/gear-builder.js,
// data/items.js); one point fewer in a talent (engine/custom-builds.js: WL.buildWithoutPoint, WL.ACTION_TALENTS).
(function () {
  T.run('round 148: gear builder enchants, compare, value, gear codes; talent point value', function () {
    var C = function () { return JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); };
    var own = function (slot, stats, extra) { return { custom: Object.assign({ name: 'Test ' + slot, slot: slot, stats: stats }, extra || {}) }; };
    var c = C();

    T.group('gear builder: enchants');
    T.ok(WL.ENCHANTS && typeof WL.ENCHANTS === 'object', 'the enchant list exists (' + Object.keys(WL.ENCHANTS).length + ' so far)');
    T.eq(WL.GEAR_SLOTS.filter(function (s) { return s.enchant; }).map(function (s) { return s.key; }).join(','), 'head,shoulder,back,chest,wrist,hands,legs,feet,mainHand',
      'enchantable: head, shoulder, back, chest, wrist, hands, legs, feet, main hand');
    var invs = WL.GEAR_SLOTS.map(function (s) { return s.inv; }).sort(function (a, z) { return a - z; });
    T.eq(invs.join(','), '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19', 'every slot has its game inventory number, 1 to 19, once');
    var g = { slots: { head: own('head', { sp: 30, int: 12 }), legs: own('legs', { sp: 20 }), mainHand: own('twoHand', { sp: 60 }, { weapon: 'staff' }), offHand: own('offHand', { int: 6 }) },
              enchants: { head: { custom: { name: 'Arcanum', stats: { sp: 8, hitPct: 1 } } }, feet: { custom: { name: 'Boots', stats: { sp: 50 } } },
                          legs: { custom: { name: 'Spellthread', stats: { int: 18, sp: 10 } } }, neck: { custom: { name: 'Bad', stats: { sp: 99 } } } }, manual: {} };
    var r = WL.gearSheet(g, c);
    T.eq(r.enchUsed.join(','), 'head,legs', 'counted: the head and leg enchants; not the feet (no item there) nor the neck (no enchants there)');
    T.eq([r.enchants.sp, r.enchants.hitPct, r.enchants.int].join('/'), '18/1/18', 'enchants: 18 spell power, 1% hit, 18 Intellect');
    T.eq([r.sheet.sp, r.sheet.int, r.sheet.hitPct].join('/'), '128/30/1', 'sheet: items 110 + enchants 18 spell power; Intellect 12 + 18 (the off hand is blocked by the staff)');
    T.eq(r.sheet.critPct, WL.gearRound(1.7 + 110 / 60 + 30 / 60), 'crit includes the enchant\'s Intellect: ' + r.sheet.critPct + '%');
    var m = WL.gearManualFor(g, c, 'sp', 200);
    T.eq(m, 72, 'typing 200 spell power: your addition is 200 − 128 = 72');

    T.group('gear builder: what a swap changes');
    var sw = WL.gearSwapDelta(g, 'head', own('head', { sp: 40, int: 24, critPct: 1 }), c);
    T.eq([sw.delta.sp, sw.delta.int, sw.delta.critPct].join('/'), '10/12/1.2', 'a better hood: +10 spell power, +12 Intellect, +1.2% crit (1% + 12 / 60); its enchant stays');
    var sw2 = WL.gearSwapDelta(g, 'mainHand', own('oneHand', { sp: 40 }, { weapon: 'sword' }), c);
    T.eq([sw2.delta.sp, sw2.delta.int].join('/'), '-20/6', 'staff → one-hand sword: −20 spell power, and the off hand counts again (+6 Intellect)');
    T.eq(sw2.sword, true, '… and the Sword box would be on');
    var sw3 = WL.gearSwapDelta(g, 'legs', null, c);
    T.eq([sw3.delta.sp, sw3.delta.int].join('/'), '-30/-18', 'taking the legs off also takes their enchant away');
    var gOff = { slots: {}, enchants: {}, manual: {} };
    T.eq(WL.gearSwapDelta(gOff, 'neck', own('neck', { hitPct: 1 }), c).delta.hitPct, 1, 'an empty slot: the new item\'s stats are the change');

    T.group('gear builder: an item\'s worth from stat weights');
    var w = { sp: 0.5, hitPct: 10, critPct: 6, hastePct: 4, int: 0.2, pierce: 0.1 };
    var v = WL.gearValue({ sp: 20, hitPct: 1, int: 10, spi: 12, shadowSp: 10 }, w, { shadow: 0.6, fire: 0.1 });
    T.ok(Math.abs(v.dps - (20 * 0.5 + 10 + 2 + 10 * 0.5 * 0.6)) < 1e-9, '20 SP × 0.5 + 1% hit × 10 + 10 Int × 0.2 + 10 Shadow SP × 0.5 × 60% = ' + v.dps + ' DPS');
    T.ok(Math.abs(v.sp - v.dps / 0.5) < 1e-9, '… = ' + v.sp + ' spell power (DPS ÷ the spell power weight)');
    T.eq(v.unvalued.join(','), 'spi', 'Spirit has no stat weight: named, not counted');
    T.eq(WL.gearValue({}, w).dps, 0, 'no stats: worth 0');

    T.group('gear codes');
    var code = WL.encodeGear(g);
    T.ok(code.indexOf('WFG1:') === 0, 'a gear code starts with WFG1: (' + code.length + ' characters)');
    var back = WL.decodeGear(code);
    T.eq(Object.keys(back.slots).sort().join(','), 'head,legs,mainHand,offHand', 'it brings back every item');
    T.eq(JSON.stringify(back.slots.mainHand.custom), JSON.stringify({ name: 'Test twoHand', slot: 'twoHand', stats: { sp: 60 }, weapon: 'staff' }), '… with name, slot type, weapon type and stats');
    T.eq(Object.keys(back.enchants).sort().join(','), 'feet,head,legs', '… and the enchants of enchantable slots (the neck one is left out when made)');
    T.eq(back.ignored.length, 0, 'nothing ignored');
    var addon = WL.GEAR_CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1,
      items: { head: { id: 19375, name: 'Mish’undare, Circlet of the Mind Flayer', quality: 'epic', stats: { sp: 35, int: 24, critPct: 2, spi: 9, sta: 15 } },
               chest: { id: 1, name: 'Bad slot type', slot: 'feet', stats: { sp: 5, bogus: 7 } }, ear: { name: 'Nope' }, neck: { id: 5 } },
      enchants: { head: { id: 2588, name: 'Presence of Sight', stats: { sp: 18, hitPct: 1 } }, finger1: { name: 'Ring enchant', stats: { sp: 4 } } } }))));
    var a = WL.decodeGear(addon);
    T.eq(a.slots.head.custom.name, 'Mish’undare, Circlet of the Mind Flayer', 'an item from the addon: its name (not plain ASCII) comes through');
    T.eq(a.slots.head.custom.id, 19375, '… it keeps its game id');
    T.eq(a.slots.head.custom.slot, 'head', '… and gets the slot\'s type when none was given');
    T.eq(JSON.stringify(a.slots.chest.custom.stats) + ' ' + a.slots.chest.custom.slot, '{"sp":5} chest', 'a wrong slot type becomes the slot\'s own; an unknown stat is dropped');
    T.eq(a.ignored.join(' | '), 'slot "ear" | Neck (no name) | enchant on "finger1"', 'not used: an unknown slot, an id this page does not know and no name, an enchant where there are none');
    WL.ITEMS[424242] = { name: 'Listed test item', slot: 'neck', stats: { sp: 7 } };
    try {
      var k = WL.decodeGear(WL.GEAR_CODE_PREFIX + btoa(JSON.stringify({ v: 1, items: { neck: { id: 424242 } } })));
      T.eq(JSON.stringify(k.slots.neck), '{"id":424242}', 'an id in the item list is used from the list');
    } finally { delete WL.ITEMS[424242]; }
    var err = function (x) { try { WL.decodeGear(x); return ''; } catch (e) { return e.message; } };
    T.ok(/must start with WFG1:/.test(err('WFS1:abc')), 'a settings code is refused as a gear code');
    T.ok(/damaged/.test(err('WFG1:@@@')), 'a damaged gear code says so');
    T.ok(/version/.test(err('WFG1:' + btoa('{"v":9}'))), 'another version says so');

    T.group('gear builder: enchants in settings codes');
    var c1 = C(); c1.gearBuilder = { on: true, slots: g.slots, enchants: g.enchants, manual: {} };
    var c2 = C(); WL.applySettings(c2, WL.decodeSettings(WL.encodeSettings(c1)));
    T.ok(JSON.stringify(c2.gearBuilder.enchants) === JSON.stringify(g.enchants), 'a settings code carries the enchants while the builder is on');

    T.group('talent point value: one point fewer');
    var b = WL.findBuild('aff_pact_sb_succ') || WL.BUILDS[0];
    var tk = Object.keys(b.talents).filter(function (k) { return b.talents[k] > 1; })[0];
    var r1 = WL.buildWithoutPoint(b, tk);
    T.eq(r1.build.talents[tk], b.talents[tk] - 1, b.short + ': ' + WL.TALENT_BY_KEY[tk].name + ' ' + b.talents[tk] + ' → ' + (b.talents[tk] - 1));
    T.ok(JSON.stringify(r1.build.rotation) === JSON.stringify(b.rotation) && !r1.notes.length, '… nothing else changes');
    T.ok(b.talents[tk] === WL.findBuild(b.key).talents[tk], '… and the build itself is untouched');
    var withSl = { short: 'SL', talents: { siphonLife: 1, suppression: 5 }, pet: null, sacrifice: null, oil: 'none', rotation: ['siphonLife', 'corruption', 'shadowBolt'],
                   timeline: [{ t: 0, k: 'siphonLife' }, { t: 2, k: 'corruption' }] };
    var r2 = WL.buildWithoutPoint(withSl, 'siphonLife');
    T.ok(!('siphonLife' in r2.build.talents), 'Siphon Life 1 → gone');
    T.eq(r2.build.rotation.join(','), 'corruption,shadowBolt', '… its priority action goes with it');
    T.eq(r2.build.timeline.map(function (e) { return e.k; }).join(','), 'corruption', '… and its timeline entry');
    T.eq(r2.notes.length, 2, '… both named (' + r2.notes.join('; ') + ')');
    var inc = { short: 'Inc', talents: { incinerate: 1 }, pet: null, sacrifice: null, oil: 'none', rotation: ['immolate', 'incinerate'] };
    T.eq(WL.buildWithoutPoint(inc, 'incinerate').build.rotation.join(','), 'immolate,shadowBolt', 'Incinerate gone: Shadow Bolt becomes the filler');
    var sac = { short: 'Sac', talents: { demonicSacrifice: 1 }, pet: null, sacrifice: 'imp', oil: 'none', rotation: ['shadowBolt'] };
    T.eq(WL.buildWithoutPoint(sac, 'demonicSacrifice').build.sacrifice, null, 'Demonic Sacrifice gone: no demon is sacrificed');
    T.eq(WL.buildWithoutPoint(withSl, 'nothing').build.talents.suppression, 5, 'a talent the build does not have: nothing changes');
    var miss = [];
    Object.keys(WL.ACTION_TALENTS).forEach(function (act) {
      WL.ACTION_TALENTS[act].forEach(function (x) {
        var t = {}; Object.keys(WL.TALENT_BY_KEY).forEach(function (k) { if (k !== x) t[k] = 1; });
        var msg = '"' + WL.ACTIONS[act].label + '" needs the ' + WL.TALENT_BY_KEY[x].name + ' talent';
        var errs = WL.validateBuild({ talents: t, pet: 'imp', sacrifice: null, oil: 'none', rotation: [act, 'shadowBolt'] });
        if (errs.indexOf(msg) < 0) miss.push(act + '/' + x);
      });
    });
    T.eq(miss.join(', '), '', 'every action ↔ talent pair of the list is one the build checks also name (' + Object.keys(WL.ACTION_TALENTS).length + ' actions)');
  });
})();
