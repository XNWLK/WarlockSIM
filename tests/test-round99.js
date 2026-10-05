// Round 99 tests (user): spell ranges in the data — every spell, the pet spells, the Engineering explosives; Destructive
// Reach raises them in the spell table. The fight engine does not use ranges (the boss is always in range). [A78]
(function () {
  function cfg() { return JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); }
  function tb(t) { return { key: 't99', short: 't', name: 't', notes: '', talents: t, pet: null, sacrifice: null, oil: 'none', rotation: ['shadowBolt'] }; }
  function table(t, c) { c = c || cfg(); var b = tb(t); return WL.buildSpellTable(b, WL.computeStats(b, 'human', c), c); }
  var ALL = { incinerate: 1, conflagrate: 1, shadowburn: 1, baneOfHavoc: 1, siphonLife: 1, wrack: 1 };   // talents that teach a spell

  T.run('round 99: spell ranges', function () {
    T.group('data');
    var keys = Object.keys(WL.SPELLS);
    T.ok(keys.every(function (k) { return typeof WL.SPELLS[k].range === 'number' && WL.SPELLS[k].range >= 0; }), 'every one of the ' + keys.length + ' spells has a range');
    var not30 = keys.filter(function (k) { return WL.SPELLS[k].range !== 30; }).sort().join(',');
    T.eq(not30, 'drainLife,hellfire,lifeTap', 'all 30 yd except Drain Life, Life Tap and Hellfire (around you; round 100)');
    T.eq(WL.SPELLS.drainLife.range, 20, 'Drain Life 20 yd');
    T.eq(WL.SPELLS.lifeTap.range, 0, 'Life Tap 0 = cast on yourself');
    T.eq(WL.SPELLS.hellfire.range, 0, 'Hellfire 0 = around yourself');
    var bk = cfg(); bk.options.bookRanks = true;
    T.ok(Object.keys(WL.BOOK_RANKS).every(function (k) { return WL.spellsFor(bk)[k].range === WL.SPELLS[k].range; }), 'the AQ20 book ranks keep the range of their spell');
    T.eq(WL.DEFAULT_CONFIG.pets.imp.spell.range, 30, 'Firebolt 30 yd');
    T.eq(WL.DEFAULT_CONFIG.pets.succubus.spell.range, 5, 'Lash of Pain 5 yd (melee range)');
    var C = WL.DEFAULT_CONFIG.consumables;
    T.eq([C.goblinSapper.explosive.range, C.goblinSapper.explosive.radius].join('/'), '0/10', 'Goblin Sapper Charge: around you, 10 yd radius');
    T.eq([C.denseDynamite.explosive.range, C.denseDynamite.explosive.radius].join('/'), '30/5', 'Dense Dynamite: 30 yd, 5 yd radius');
    T.eq([C.thoriumGrenade.explosive.range, C.thoriumGrenade.explosive.radius].join('/'), '45/3', 'Thorium Grenade: 45 yd, 3 yd radius');

    T.group('Destructive Reach');
    T.eq(WL.TALENT_BY_KEY.destructiveReach.v.rangePct.join('/'), '10/20', 'talent values +10 / 20% range');
    var t0 = table(ALL), t1 = table(Object.assign({ destructiveReach: 1 }, ALL)), t2 = table(Object.assign({ destructiveReach: 2 }, ALL));
    T.eq(Object.keys(t0).length, keys.length, 'spell table with every spell talented (' + Object.keys(t0).length + ' spells)');
    T.ok(Object.keys(t0).every(function (k) { return t0[k].range === WL.SPELLS[k].range; }), 'without the talent: the table range = the spell range');
    T.eq([t1.shadowBolt.range, t2.shadowBolt.range].join('/'), '33/36', 'Shadow Bolt 33 / 36 yd at 1 / 2 points');
    T.eq([t1.drainLife.range, t2.drainLife.range].join('/'), '22/24', 'Drain Life 22 / 24 yd');
    T.eq([t2.corruption.range, t2.curseOfElements.range, t2.baneOfDoom.range, t2.wrack.range].join('/'), '36/36/36/36', 'also Affliction spells and the curse (its list of affected spells)');
    T.eq(t2.lifeTap.range, 0, 'Life Tap stays a self cast');

    T.group('no effect on the fight');
    var b0 = tb({ ruin: 0 }), b2 = tb({ destructiveReach: 2 }), c = cfg();
    var r0 = WL.simulateOnce(b0, 'human', c, { seed: 5, duration: 90 }), r2 = WL.simulateOnce(b2, 'human', c, { seed: 5, duration: 90 });
    T.eq(r2.total, r0.total, 'Destructive Reach 2/2 changes no damage (' + Math.round(r2.total) + ')');
  });
})();
