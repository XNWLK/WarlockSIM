// Round 249 tests — two changes the user picked from public evidence notes (Forever, 2026-11-23):
//  1. Elixirs count each stat once (in-game checks of the character sheet and buff tooltips): of the active elixirs marked
//     elixirStats (data/consumables.js) only the largest amount of each stat counts, and Arcane Intellect / Divine Spirit /
//     Power Word: Fortitude (data/config.js overwritesElixir) replace the elixirs' Intellect / Spirit / Stamina while up.
//     Mark of the Wild, Blessing of Kings, the elixirs' crit beside Moonkin Aura and Greater Mageblood beside Mana Spring
//     still stack; Greater Arcane Elixir + Elixir of Shadow Power still stack; Spirit of Zanza is not an elixir here.
//  2. The 1% Spell Pierce cut (a public log study): no Spell Pierce bonus while |R| / (|R| + 8 × level + 19) is under 1%
//     (engine/resist.js WL.pierceBonusOn). At level 60, 5 Spell Pierce = 0.992% (none), 6 = 1.19% (a bonus).
(function () {
  var b0 = { key: 't249', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: [] };
  function bk(k) { return WL.BUILDS.filter(function (b) { return b.key === k; })[0]; }
  // Engine default settings with every raid buff and consumable off, then the listed ones on.
  function cfgWith(buffs, cons) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = buffs.indexOf(k) >= 0; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = cons.indexOf(k) >= 0; });
    return c;
  }
  function st(buffs, cons, race, tweak) { var c = cfgWith(buffs, cons); if (tweak) tweak(c); return WL.computeStats(b0, race || 'orc', c); }
  function src(s, stat) { return s.breakdown.filter(function (x) { return x.stat === stat; }).map(function (x) { return x.source; }); }

  T.run('round 249: elixirs count each stat once, raid buffs overwrite them', function () {
    var s0 = st([], []);
    T.group('data');
    T.eq(WL.DEFAULT_CONFIG.buffs.arcaneIntellect.overwritesElixir, 'int', 'Arcane Intellect overwrites the elixirs\' Intellect');
    T.eq(WL.DEFAULT_CONFIG.buffs.divineSpirit.overwritesElixir, 'spi', 'Divine Spirit overwrites the elixirs\' Spirit');
    T.eq(WL.DEFAULT_CONFIG.buffs.fortitude.overwritesElixir, 'sta', 'Power Word: Fortitude overwrites the elixirs\' Stamina');
    T.ok(!WL.DEFAULT_CONFIG.buffs.markOfTheWild.overwritesElixir && !WL.DEFAULT_CONFIG.buffs.blessingOfKings.overwritesElixir, 'Mark of the Wild and Blessing of Kings overwrite nothing');
    T.eq(Object.keys(WL.CONSUMABLES).filter(function (k) { return WL.CONSUMABLES[k].elixirStats; }).sort().join(','), 'cerebralCortex,elixirOwl,elixirSages',
      'the stat elixirs: Elixir of the Owl, Elixir of Sages, Cerebral Cortex Compound (not Spirit of Zanza, not the foods)');

    T.group('Intellect');
    var ai = st(['arcaneIntellect'], []), aiOwl = st(['arcaneIntellect'], ['elixirOwl']), owl = st([], ['elixirOwl']);
    T.near(owl.int - s0.int, 25, 1e-9, 'Elixir of the Owl alone: +25 Intellect');
    T.near(aiOwl.int - s0.int, 31, 1e-9, 'Arcane Intellect + Elixir of the Owl: +31 Intellect, not +56');
    T.near(aiOwl.int, ai.int, 1e-9, '… the same as Arcane Intellect alone');
    T.ok(src(aiOwl, 'int').every(function (x) { return !/^Elixir of the Owl/.test(x); }), 'the Intellect breakdown does not list the Owl');
    T.ok(src(aiOwl, 'int').some(function (x) { return /^Arcane Intellect \/ Brilliance \(replaces Elixir of the Owl\)$/.test(x); }), 'it says Arcane Intellect replaces it (' + src(aiOwl, 'int').join(' | ') + ')');
    T.near(aiOwl.critPct - ai.critPct, 2, 1e-9, 'the Owl\'s 2% crit still counts with Arcane Intellect up');
    var oc = st([], ['elixirOwl', 'cerebralCortex']);
    T.near(oc.int - s0.int, 25, 1e-9, 'Elixir of the Owl + Cerebral Cortex Compound: +25 Intellect, the larger one alone');
    T.ok(src(oc, 'int').some(function (x) { return /does not add to/.test(x); }), 'the breakdown says why (' + src(oc, 'int').join(' | ') + ')');
    T.near(st(['arcaneIntellect'], ['elixirOwl', 'cerebralCortex']).int, ai.int, 1e-9, 'Arcane Intellect + Owl + Cortex: Arcane Intellect alone');
    var big = st([], ['elixirOwl', 'cerebralCortex'], 'orc', function (c) { c.consumables.cerebralCortex.int = 40; });
    T.near(big.int - s0.int, 40, 1e-9, 'with unequal amounts the larger one counts (Cortex set to 40 → +40)');
    var small = st(['arcaneIntellect'], ['cerebralCortex'], 'orc', function (c) { c.consumables.cerebralCortex.int = 40; });
    T.near(small.int, ai.int, 1e-9, 'Arcane Intellect overwrites even a larger elixir amount (the notes: it overwrites)');

    T.group('Spirit');
    var ds = st(['divineSpirit'], []), dsSag = st(['divineSpirit'], ['elixirSages']), sag = st([], ['elixirSages']);
    T.near(sag.spi - s0.spi, 25, 1e-9, 'Elixir of Sages alone: +25 Spirit');
    T.near(dsSag.spi, ds.spi, 1e-9, 'Divine Spirit + Elixir of Sages: Divine Spirit alone (+40, not +65)');
    T.near(dsSag.critPct - ds.critPct, 2, 1e-9, 'the Sages\' 2% crit still counts with Divine Spirit up');
    var zan = st(['divineSpirit', 'fortitude'], ['spiritOfZanza']), dsf = st(['divineSpirit', 'fortitude'], []);
    T.ok(Math.abs(zan.spi - dsf.spi - 50) < 1e-9 && Math.abs(zan.sta - dsf.sta - 50) < 1e-9, 'Spirit of Zanza is left as it was: +50 Spirit and +50 Stamina beside Divine Spirit and Fortitude');

    T.group('Stamina');
    var testEl = function (c) { c.consumables.t249Sta = { on: true, group: 't249', cat: 'Elixir', name: 'Test Stamina elixir', desc: 'test', text: 'test', id: 1, sta: 30, elixirStats: true }; };
    var fo = st(['fortitude'], []), foEl = st(['fortitude'], [], 'orc', testEl), el = st([], [], 'orc', testEl);
    T.near(el.sta - s0.sta, 30, 1e-9, 'an elixir with +30 Stamina alone: +30');
    T.near(foEl.sta, fo.sta, 1e-9, 'Power Word: Fortitude + that elixir: Fortitude alone');
    T.near(foEl.maxHealth, fo.maxHealth, 1e-9, '… and the same health');

    T.group('what still stacks');
    var motw = st(['markOfTheWild'], []), motwOwl = st(['markOfTheWild'], ['elixirOwl']);
    T.near(motwOwl.int - motw.int, 25, 1e-9, 'Mark of the Wild + Elixir of the Owl: both count');
    T.near(st(['markOfTheWild'], ['elixirSages']).spi - motw.spi, 25, 1e-9, 'Mark of the Wild + Elixir of Sages: both count');
    var k0 = st(['blessingOfKings'], []), kOwl = st(['blessingOfKings'], ['elixirOwl']);
    T.near(kOwl.int - k0.int, 25 * 1.1, 1e-9, 'Blessing of Kings multiplies the elixir\'s Intellect');
    var mk = st(['moonkinAura'], []), mkOwl = st(['moonkinAura'], ['elixirOwl']);
    T.near(mkOwl.critPct - mk.critPct, 2 + 25 / 60, 1e-9, 'Moonkin Aura + Elixir of the Owl: the elixir\'s 2% crit adds (+ its Intellect)');
    T.near(st(['moonkinAura'], []).critPct - s0.critPct, 3, 1e-9, '… and Moonkin Aura its 3%');
    var ms = st(['manaSpring'], []), msMb = st(['manaSpring'], ['greaterMageblood']);
    T.near(msMb.mp5 - ms.mp5, 20, 1e-9, 'Greater Mageblood Elixir + Mana Spring Totem: both count');
    var gae = st([], ['greaterArcaneElixir', 'shadowPower']);
    T.near(gae.sp + gae.schoolSp.shadow - s0.sp - s0.schoolSp.shadow, 75, 1e-9, 'Greater Arcane Elixir + Elixir of Shadow Power: still 75 Shadow spell power');
    T.near(st([], ['greaterArcaneElixir', 'firePower']).schoolSp.fire - s0.schoolSp.fire, 10, 1e-9, '… and Elixir of Fire Power still adds beside Greater Arcane Elixir');
    var food = st(['arcaneIntellect'], ['soaringPamplona']);
    T.near(food.int - ai.int, 20, 1e-9, 'the +20 Intellect food is not an elixir: it still adds beside Arcane Intellect');

    T.group('the page\'s default setup');
    var pc = WL.pageDefaultConfig();
    T.ok(pc.buffs.arcaneIntellect.on && pc.buffs.divineSpirit.on && pc.consumables.elixirOwl.on && pc.consumables.elixirSages.on, 'the page starts with Arcane Intellect, Divine Spirit, the Owl and Sages');
    var ps = WL.computeStats(bk('demo_pact_succ_sb'), 'undead', pc), pcNo = WL.pageDefaultConfig();
    pcNo.consumables.elixirOwl.on = false; pcNo.consumables.elixirSages.on = false;
    var psNo = WL.computeStats(bk('demo_pact_succ_sb'), 'undead', pcNo);
    T.near(ps.int, psNo.int, 1e-9, 'Shadow Demo: the Owl adds no Intellect on the page defaults');
    T.near(ps.spi, psNo.spi, 1e-9, 'Shadow Demo: the Sages add no Spirit on the page defaults');
    T.near(ps.critPct - psNo.critPct, 2, 1e-9, '… but one 2% elixir crit still counts');
  });

  T.run('round 249: Spell Pierce gives no bonus under a 1% share', function () {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));   // level 60, 24 level resistance, Curse of the Elements removes it → R = −pierce
    var sb = function (p, cfg) { return WL.spellResist(cfg || c, p, 'shadow', true, 0, 'shadowBolt', false); };
    T.group('the cut');
    T.near(WL.fittedShare(5, 60), 5 / 504, 1e-12, '5 Spell Pierce at level 60: share 5 / 504');
    T.ok(WL.fittedShare(5, 60) < 0.01 && WL.fittedShare(6, 60) >= 0.01, '… 0.992% is under 1%, 6 / 505 = 1.19% is not');
    T.eq(WL.PIERCE_MIN_SHARE, 0.01, 'the cut is a 1% share');
    var p5 = sb(5), p6 = sb(6);
    T.ok(p5.R === -5 && p5.mean === 0 && p5.dist.length === 1 && p5.dist[0].pct === 0, '5 Spell Pierce at level 60: Shadow Bolt gets no bonus (R ' + p5.R + ', mean ' + p5.mean + ')');
    T.ok(p6.R === -6 && p6.mean > 0, '6 Spell Pierce at level 60: Shadow Bolt gets a bonus (+' + (p6.mean * 100).toFixed(3) + '%)');
    T.near(p6.mean, 6 / 505, 1e-9, '… that follows the share as before (no rounding, no step at the cut)');
    T.ok(sb(4).mean === 0 && sb(1).mean === 0 && sb(15).mean > 0, '1 and 4 give none, 15 gives a bonus');
    var c52 = JSON.parse(JSON.stringify(c)); c52.combat.casterLevel = 52;
    T.ok(WL.fittedShare(5, 52) >= 0.01 && sb(5, c52).mean > 0, 'the cut is a share, not a number of points: 5 Spell Pierce at level 52 (1.14%) give a bonus');
    T.group('which spells take it (unchanged)');
    ['deathCoil', 'shadowburn'].forEach(function (k) {
      T.ok(WL.spellResist(c, 6, 'shadow', true, 0, k, false).mean > 0 && WL.spellResist(c, 5, 'shadow', true, 0, k, false).mean === 0, k + ': a bonus at 6, none at 5');
    });
    T.ok(WL.spellResist(c, 6, 'fire', true, 0, 'incinerate', false).mean > 0, 'Incinerate: a bonus at 6');
    T.eq(WL.spellResist(c, 30, 'shadow', true, 0, 'baneOfAgony', true).mean, 0, 'Bane of Agony\'s ticks: no bonus, even at 30');
    T.eq(WL.spellResist(c, 30, 'shadow', true, 0, 'corruption', true).mean, 0, 'Corruption\'s ticks: no bonus');
    T.eq(WL.spellResist(c, 30, 'fire', true, 0, 'rainOfFire', true).mean, 0, 'Rain of Fire: no bonus');
    var noCoe = WL.spellResist(c, 5, 'shadow', false, 0, 'shadowBolt', false);
    T.ok(noCoe.R === 19 && noCoe.mean < 0, 'resistance left (no curse): still resisted as before');
    T.group('the builds\' Pre-BiS gear');
    var pc = WL.pageDefaultConfig();
    var w = WL.computeStats(bk('wrack_ds'), 'orc', pc);
    T.eq(w.pierce, 2, 'Wrack DS: 2 Spell Pierce on its Pre-BiS gear');
    T.eq(WL.spellResist(pc, w.pierce, 'shadow', true, w.spellPen, 'shadowBolt', false).mean, 0, 'Wrack DS: its 2 Spell Pierce give no bonus any more');
    T.ok(!WL.pierceBonusOn(pc, WL.effectiveResist(pc, w.pierce, 'shadow', true, w.spellPen)), '… WL.pierceBonusOn says so');
    var d = WL.computeStats(bk('demo_pact_succ_sb'), 'orc', pc);
    // round 251: Shadow Demo's off hand (Obsidian Bauble, 4 Spell Pierce) left with the one-handers — 2 Spell Pierce now, under the cut
    T.ok(d.pierce === 2 && WL.spellResist(pc, d.pierce, 'shadow', true, d.spellPen, 'shadowBolt', false).mean === 0, 'Shadow Demo: 2 Spell Pierce since round 251 (was 6 with Obsidian Bauble): no bonus');
    T.ok(WL.spellResist(pc, 6, 'shadow', true, d.spellPen, 'shadowBolt', false).mean > 0, '… 6 Spell Pierce on the same settings would still give the bonus');
    T.ok(pc.weightDeltas.pierce === 20 && WL.fittedShare(w.pierce + pc.weightDeltas.pierce, 60) >= 0.01, 'the stat weight\'s +20 lifts Wrack DS over the cut');
  });
})();
