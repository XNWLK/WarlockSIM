// Round 155 tests (user): Spell Penetration is its own stat — it lowers the boss's resistance, but not below 0 (Spell
// Pierce goes below 0); every enchant from the Wowhead Forever data, chosen per slot in the gear builder.
(function () {
  T.run('round 155: Spell Penetration; the enchant list', function () {
    T.group('Spell Penetration: resistance down to 0, not below');
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));             // level resistance 24 by default
    T.eq(WL.effectiveResist(D, 0, 'shadow', false, 10), 14, 'no curse: 24 − 10 Spell Penetration = 14');
    T.eq(WL.effectiveResist(D, 0, 'shadow', false, 40), 0, '40 Spell Penetration: 0, not −16');
    T.eq(WL.effectiveResist(D, 0, 'shadow', true, 20), 0, 'with Curse of the Elements nothing is left to lower: 0');
    T.eq(WL.effectiveResist(D, 15, 'shadow', false, 40), -15, 'Spell Pierce still goes below 0 on top: −15');
    T.eq(WL.effectiveResist(D, 15, 'shadow', false, 10), -1, '24 − 10 = 14, then − 15 Spell Pierce = −1');
    T.ok(WL.resistProfile(D, 0, 'shadow', false, 10).mean > WL.resistProfile(D, 0, 'shadow', false).mean, 'less is resisted on average with it');
    T.ok('spellPen' in D.gear && WL.GEAR_STAT_KEYS.indexOf('spellPen') >= 0 && WL.GEAR_STAT_KEYS.indexOf('pierce') >= 0, 'a gear value of its own, next to Spell Pierce');
    var b = { key: 't155', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
    var c = JSON.parse(JSON.stringify(D)); c.gear.spellPen = 12;
    T.eq(WL.computeStats(b, 'human', c).spellPen, 12, 'the stats carry it');
    var run = function (pen) {
      var x = JSON.parse(JSON.stringify(D)); x.gear.spellPen = pen; x.options.useCurseOfElements = false; x.fight.durationVarPct = 0;
      return WL.simulateOnce(b, 'human', x, { seed: 5, duration: 60 }).bySpell.shadowBolt.dmg;
    };
    T.ok(run(24) > run(0), 'without the curse: more Shadow Bolt damage with 24 Spell Penetration (' + Math.round(run(0)) + ' → ' + Math.round(run(24)) + ')');
    T.eq(run(24), run(60), '… and no more with 60 (resistance is 0 either way)');

    T.group('the enchant list');
    var E = WL.ENCHANTS, ids = Object.keys(E);
    T.ok(ids.length > 100 && WL.ITEM_DB.enchants === ids.length, ids.length + ' enchants');
    var slotKeys = WL.GEAR_SLOTS.filter(function (s) { return s.enchant; }).map(function (s) { return s.key; });
    var bad = ids.filter(function (id) {
      var e = E[id];
      return !/^\d+$/.test(id) || !e.name || !e.text || !e.slots.length || !e.slots.every(function (s) { return slotKeys.indexOf(s) >= 0; }) ||
        !Object.keys(e.stats).every(function (k) { return WL.GEAR_STAT_KEYS.indexOf(k) >= 0; }) || !(e.icon >= 0 && e.icon < WL.ITEM_ICONS.names.length);
    });
    T.eq(bad.length, 0, 'every enchant: a game enchant id, a name, its text, slots that take enchants, sheet stats, an icon', bad.slice(0, 5).join(', '));
    T.ok(WL.gearSlot('offHand').enchant && ids.some(function (id) { return E[id].slots.indexOf('offHand') >= 0; }), 'the held off-hand item takes enchants (Forever has them)');
    var e = function (id, what, fn) { T.ok(E[id] && fn(E[id]), what + ' (' + id + ')', E[id] && JSON.stringify({ slots: E[id].slots, stats: E[id].stats, twoHand: E[id].twoHand })); };
    e(905, 'Intellect +5: bracers, +5 Intellect', function (x) { return x.slots.join() === 'wrist' && x.stats.int === 5; });
    e(66, 'Stamina +3: one enchant for bracers and boots (shield left out)', function (x) { return x.slots.join() === 'wrist,feet' && x.stats.sta === 3; });
    e(7662, '+65 Spell Power: main hand, two-handed weapons only', function (x) { return x.slots.join() === 'mainHand' && x.stats.sp === 65 && x.twoHand; });
    e(2504, 'Spell Power +30: any weapon', function (x) { return x.stats.sp === 30 && !x.twoHand; });
    e(2614, 'Shadow Damage +20: gloves, Shadow spell power', function (x) { return x.slots.join() === 'hands' && x.stats.shadowSp === 20 && !x.stats.sp; });
    e(2443, 'Frost Spell Damage +15: nothing the sim uses', function (x) { return !Object.keys(x.stats).length; });
    e(2505, 'Healing Spells +55: its 19 damage from the text', function (x) { return x.stats.sp === 19; });
    e(7661, '+6 Intellect and +5 Spirit: off hand only', function (x) { return x.slots.join() === 'offHand' && x.stats.int === 6 && x.stats.spi === 5; });
    e(2565, 'Mana Regen 4 per 5 sec.: MP5 4', function (x) { return x.stats.mp5 === 4; });
    T.ok(E[911] && !Object.keys(E[911].stats).length, 'enchants without a stat the sim uses are listed too (Minor Speed Increase)');
    e(2544, 'Arcanum of Focus: head and legs, +8 spell power', function (x) { return x.slots.join() === 'head,legs' && x.stats.sp === 8; });
    e(2605, 'Zandalar Signet of Mojo: shoulder, +18 spell power', function (x) { return x.slots.join() === 'shoulder' && x.stats.sp === 18; });
    e(2590, 'Prophetic Aura: Mana Regen +4 and Stamina +10', function (x) { return x.stats.mp5 === 4 && x.stats.sta === 10; });
    e(8218, 'necklace enchant: +6 spell power on the neck', function (x) { return x.slots.join() === 'neck' && x.stats.sp === 6; });
    T.ok(!ids.some(function (id) { return /^$/.test(E[id].name); }), 'no unfinished game texts as names');
  });
})();
