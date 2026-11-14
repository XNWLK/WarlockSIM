// Round 210 tests (user: "need a checkbox in the gear builder with phase 1, phase 2, all items etc. … build a tooltip popup
// when you hover over an item that is as close to an ingame one as you can make it"): the items' content phases and the
// in-game style tooltips (data/item-phases.js, data/item-tips.js).
(function () {
  T.run('round 210: Spell Pierce on items, the combat-log resist model', function () {
    T.group('Spell Pierce on items');
    var ids = Object.keys(WL.ITEMS), pierce = ids.filter(function (id) { return WL.ITEMS[id].stats.pierce; });
    T.ok(pierce.length >= 45, pierce.length + ' items with Spell Pierce ("Your spells pierce N Magical Resistance")');
    T.eq(ids.filter(function (id) { return WL.ITEMS[id].stats.spellPen; }).length, 0, 'no item of the gear builder has Spell Penetration (none says "decreases the magical resistances")');
    T.eq(WL.ITEMS[22943].stats.pierce, 13, 'Malice Stone Pendant: 13 Spell Pierce');
    T.ok(WL.TRINKET_FX[21565].equip.pierce === 7 && !WL.TRINKET_FX[21565].equip.spellPen, 'Rune of Perfection: +7 Spell Piercing in Forest areas');

    T.group('combat-log resist model [A115]');
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    T.eq(D.combat.resistModel, 'fitted', 'the default model since round 210');
    var p15 = WL.resistProfile(D, 15, 'shadow', true);
    T.near(p15.mean, 15 / (15 + 8 * 60 + 19), 1e-12, '15 Spell Pierce at level 60 → +' + (p15.mean * 100).toFixed(2) + '% on average (15 / 514)');
    T.eq(p15.dist.map(function (d) { return d.pct; }).join(','), '0,10,20', '… as +0% / +10% / +20% hits');
    var a = 15 / 514;
    T.near(p15.dist[1].p, 5 * a, 1e-12, '+10% at 5a'); T.near(p15.dist[2].p, 2.5 * a, 1e-12, '+20% at 2.5a (half as often)');
    T.near(WL.resistProfile(D, 15, 'shadow', true, 0, true).mean, a / 10, 1e-12, 'a DoT tick rolls a tenth of it');
    T.near(WL.resistProfile(D, 0, 'shadow', false).mean, -24 / (24 + 499), 1e-12, 'level resistance 24 without the curse: ' + (24 / 523 * 100).toFixed(2) + '% resisted');
    T.eq(WL.resistProfile(D, 0, 'shadow', true).mean, 0, 'with the curse: nothing');
    var d25 = WL.tenthsDist(0.25), m25 = d25.reduce(function (s, x) { return s + x.p * x.tenths / 10; }, 0);
    T.ok(d25.length === 4 && Math.abs(m25 - 0.25) < 1e-12 && Math.abs(d25.reduce(function (s, x) { return s + x.p; }, 0) - 1) < 1e-12, 'past 10%: every tenth within 20% of the average, mean exact');
    T.near(WL.resistProfile(D, 100, 'fire', true).mean, 100 / 599, 1e-12, '100 Spell Pierce → +' + (100 / 599 * 100).toFixed(1) + '% (it flattens as it grows)');
    var c = JSON.parse(JSON.stringify(D)); c.combat.resistModel = 'classic';
    T.near(WL.resistProfile(c, 15, 'shadow', true).mean, 0.0375, 1e-12, 'the classic model stays as an option (15 → 3.75%)');
    var code = WL.encodeSettings(c), back = JSON.parse(JSON.stringify(D)); WL.applySettings(back, WL.decodeSettings(code));
    T.eq(back.combat.resistModel, 'classic', 'a settings code carries the model');

    T.group('in a fight');
    var s = JSON.parse(JSON.stringify(D)); s.fight.durationVarPct = 0; s.fight.duration = 3000; s.combat.baseHitPct = 100; s.combat.maxHitPct = 100;
    s.gear.critPct = -2; s.gear.hitPct = 0; s.options.useCurseOfElements = false; s.combat.levelResist.on = false;
    var tb = function (rot) { return { key: 't', name: 't', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; };
    var r0 = WL.simulateOnce(tb(['shadowBolt']), 'human', s, { rng: WL.makeRng(5) }); s.gear.pierce = 15;
    var r1 = WL.simulateOnce(tb(['shadowBolt']), 'human', s, { rng: WL.makeRng(5) });
    var avg = function (r) { return r.bySpell.shadowBolt.dmg / r.bySpell.shadowBolt.hits; };
    T.near(avg(r1) / avg(r0), 1 + a, 0.006, 'Shadow Bolt hits ×' + (1 + a).toFixed(4) + ' with 15 Spell Pierce (n=' + r1.bySpell.shadowBolt.hits + ')');
  });

  T.run('round 210: set bonuses', function () {
    T.group('set data');
    var S = WL.ITEM_SETS, sb = function (sid, n) { return (S[sid].bonuses.filter(function (b) { return b.n === n; })[0] || {}).stats || {}; };
    T.ok(Object.keys(S).length >= 30, Object.keys(S).length + ' item sets with a piece in the gear builder');
    T.eq(sb(81, 3).sp, 23, 'The Postmaster (3): +23 spell power'); T.eq(sb(81, 5).hitPct, 1, 'The Postmaster (5): +1% hit');
    T.eq(sb(181, 6).mp5, 8, "Magister's Regalia (6): 8 MP5"); T.eq(sb(473, 3).critPct, 1, "The Highlander's Intent (3): +1% crit");
    T.eq(sb(520, 3).spellPen, 5, 'Ironweave Battlesuit (3): 5 Spell Penetration ("decreases the magical resistances")');
    T.eq(sb(1972, 6).sp, 8, 'Stormcloth Regalia (6): 8 spell power (its healing not counted)');
    T.ok(!sb(81, 2).sp && !Object.keys(sb(81, 2)).length, 'The Postmaster (2): run speed, no stat');

    T.group('gear builder');
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), SL = ['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet'];
    var wearIds = function (ids) { var s = {}; ids.forEach(function (id) { s[WL.GEAR_SLOTS.filter(function (g) { return WL.gearFits(g.key, WL.ITEMS[id]) && !s[g.key]; })[0].key] = { id: id }; }); return { on: true, slots: s, manual: {}, enchants: {} }; };
    var post = S[81].items, g3 = WL.gearSheet(wearIds(post.slice(0, 3)), D), g5 = WL.gearSheet(wearIds(post), D), g2 = WL.gearSheet(wearIds(post.slice(0, 2)), D);
    T.ok(g2.sets.sp === 0 && g3.sets.sp === 23 && g5.sets.sp === 23 && g5.sets.hitPct === 1, 'The Postmaster: 2 pieces nothing, 3 → +23 spell power, 5 → + 1% hit');
    T.eq(WL.gearRound(g5.sheet.sp - g5.items.sp), 23, 'the sheet carries the set bonus');
    T.ok(g5.setList.length === 1 && g5.setList[0].worn === 5 && g5.setList[0].bonuses.every(function (b) { return b.on; }), 'the list of sets worn: 5 of 5, every bonus on');

    T.group('in a fight [A116]');
    var b = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'demo_pact_succ_sb'; })[0]));
    var fight = function (sid) { var c = JSON.parse(JSON.stringify(D)); c.fight.durationVarPct = 0; if (sid) c.gearBuilder = wearIds(WL.SET_FX[sid].pieces); return WL.simulateOnce(b, 'orc', c, { seed: 4, duration: 180, log: true }); };
    var n0 = fight(null), mg = fight(181);
    T.ok(mg.log.some(function (e) { return e.type === 'buff' && /Magister/.test(e.spell); }), "Magister's Regalia (5): mana procs in the log");
    var np = fight(122), nd = np.bySpell['trinket:set122'];
    T.ok(nd && nd.dmg > 0 && Math.abs(nd.dmg / nd.landed - 28) < 28 * 0.6, 'Necropile Raiment (3): about 28 Shadow damage per landed cast (' + (nd ? nd.landed : 0) + ' hits)');
    var vs = fight(2134);
    T.ok(vs.manaFromSpirit > n0.manaFromSpirit + 300, "Violet Sorcerer's Vestments (4): Spirit regeneration goes on while casting (" + Math.round(n0.manaFromSpirit) + ' → ' + Math.round(vs.manaFromSpirit) + ' mana)');
    T.eq(WL.equippedSetFx(Object.assign(JSON.parse(JSON.stringify(D)), { gearBuilder: wearIds(WL.SET_FX[181].pieces.slice(0, 4)) })).length, 0, '4 Magister pieces: no proc');
  });

  T.run('round 210: item phases and tooltips', function () {
    T.group('phases');
    T.eq(WL.PHASE_NOW, 1, 'the game is in Phase 1');
    T.ok(WL.PHASE_CHOICES.some(function (p) { return p.v === 1; }) && WL.PHASE_CHOICES.some(function (p) { return p.v === 0; }), 'the gear builder offers Phase 1 and All items');
    var ids = Object.keys(WL.ITEMS), bad = ids.filter(function (id) { var p = WL.ITEMS[id].phase; return p != null && !WL.PHASE_NAMES[p]; });
    T.eq(bad.length, 0, 'every item phase is a known one' + (bad.length ? ': ' + bad.slice(0, 5).join(', ') : ''));
    T.eq(ids.filter(function (id) { return WL.ITEMS[id].phase === 1; }).length, 0, 'phase 1 is left out of the file (missing = 1)');
    var byRaid = function (r) { return ids.filter(function (id) { return WL.ITEMS[id].raid === r; }); };
    var rule = function (id) { return !(id in WL.ITEM_PHASE_SET); };   // the first guess (the user's review wins, checked below)
    T.ok(byRaid('Molten Core').filter(rule).every(function (id) { return !WL.ITEMS[id].phase; }), 'Molten Core items: Phase 1 unless reviewed');
    T.ok(byRaid("Onyxia's Lair").filter(rule).every(function (id) { return !WL.ITEMS[id].phase; }), "Onyxia's Lair items: Phase 1 unless reviewed");
    T.ok(byRaid('Naxxramas').length > 0 && byRaid('Naxxramas').filter(rule).every(function (id) { return WL.ITEMS[id].phase >= 6; }), 'Naxxramas items: Phase 6 unless reviewed');
    T.ok(byRaid('Blackwing Lair').filter(rule).every(function (id) { return WL.ITEMS[id].phase >= 3; }), 'Blackwing Lair items: Phase 3 or later unless reviewed');
    var pvp = ids.filter(function (id) { return WL.ITEMS[id].src === 'pvp'; });
    T.ok(pvp.length > 0 && pvp.filter(rule).every(function (id) { return WL.ITEMS[id].phase >= 2; }), 'PvP rank gear: Phase 2 or later unless reviewed (' + pvp.length + ')');
    T.eq(Object.keys(WL.ITEM_PHASE_SET).length, 185, "the user's review of 2026-11-14: 184 items + Orb of the Darkmoon (round 211, pre-raid pick)");
    T.eq(WL.ITEMS[18820].phase, 9, "Talisman of Ephemeral Power: not in the game (user's review)");
    Object.keys(WL.ITEM_PHASE_SET).forEach(function (id) { if (WL.ITEMS[id]) T.eq(WL.ITEMS[id].phase || 1, WL.ITEM_PHASE_SET[id], 'your review wins: ' + WL.ITEMS[id].name); });
    var now = ids.filter(function (id) { return (WL.ITEMS[id].phase || 1) <= WL.PHASE_NOW; }).length;
    T.ok(now > ids.length * 0.6 && now < ids.length, now + ' of ' + ids.length + ' items in Phase 1');

    T.group('tooltips');
    if (!WL.ITEM_TIPS) { T.warn('data/item-tips.js not loaded'); return; }
    var tids = Object.keys(WL.ITEM_TIPS), have = ids.filter(function (id) { return WL.ITEM_TIPS[id]; }).length;
    T.ok(have >= ids.length * 0.97, have + ' of ' + ids.length + ' items have their tooltip');
    var tagBad = tids.filter(function (id) {
      var h = WL.ITEM_TIPS[id], m, re = /<\/?([a-z0-9]+)([^>]*)>/gi;
      while ((m = re.exec(h))) {
        if (!/^(b|span|br|div|table|tr|td|th)$/i.test(m[1])) return true;
        var a = m[2].trim(); if (a && !/^class="(q[0-7]?|indent|w)( (q[0-7]?|indent|w))*"$/.test(a)) return true;
      }
      return /<[^>]*$|javascript:|on\w+=/i.test(h);
    });
    T.eq(tagBad.length, 0, 'only the allowed tags and classes' + (tagBad.length ? ': ' + tagBad.slice(0, 5).join(', ') : ''));
    T.eq(tids.filter(function (id) { return /Item Level \d|Sell Price|Dropped by|Drop Chance/.test(WL.ITEM_TIPS[id]); }).length, 0, 'no item level, sell price or drop line (the game shows none)');
    T.eq(tids.filter(function (id) { return WL.ITEMS[id] && WL.ITEM_TIPS[id].indexOf(WL.ITEMS[id].name.replace(/&/g, '&amp;').replace(/'/g, "'")) < 0 && WL.ITEM_TIPS[id].indexOf(WL.ITEMS[id].name) < 0; }).length, 0, 'each tooltip names its item');
    if (WL.CON_TIPS) {
      var cids = Object.keys(WL.CONSUMABLES).map(function (k) { return WL.CONSUMABLES[k].id; }).filter(Boolean);
      T.ok(cids.every(function (id) { return WL.CON_TIPS[id]; }), 'every consumable has its tooltip (' + cids.length + ')');
      T.eq(Object.keys(WL.CON_TIPS).filter(function (id) { return /<(?!\/?(b|span|br|div|table|tr|td|th)[ >])|Item Level \d|Sell Price/i.test(WL.CON_TIPS[id]); }).length, 0, 'consumable tooltips: only the allowed tags, no item level or sell price');
    }
    var choker = WL.ITEM_TIPS[18814];
    if (choker) T.ok(/<b class="q4">Choker of the Fire Lord<\/b>/.test(choker) && /Binds when picked up/.test(choker) && /Requires Level 60/.test(choker) && /class="q2">Equip: Increases damage and healing done by magical spells and effects by up to 34\./.test(choker.replace(/<\/?span>/g, '')), 'Choker of the Fire Lord: epic name, binding, level, its Equip line');
  });
})();
