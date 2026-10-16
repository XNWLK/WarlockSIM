// Round 149 tests: the Forever patch of 2026-10-16 — Shadow Mastery 2–10%, Malediction replaced by Grim Reach (range
// only), Ruthless (Human, +2% crit) and Savage (Orc, +1% crit) for spells and your melee crit, Blood Fury 3 min, Eureka!
// an 8 s buff (a cast counts when it finishes inside it), Touch of the Grave 30% with a 25 s cooldown and nothing
// multiplying it, Windfury / Flametongue / Tranquil Air Totem gone, Salvation; old codes and builds still load.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.combat.baseCritPct = 0;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull';
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (f) f(c);
    return c;
  }
  function tb(rot, t, x) { var b = { key: 't149', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; if (x) Object.keys(x).forEach(function (k) { b[k] = x[k]; }); return b; }
  function code(o) { return WL.BUILD_CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
  var near = function (a, b, e) { return Math.abs(a - b) <= (e || 1e-6); };

  T.run('round 149: Forever patch of 2026-10-16', function () {
    T.group('Shadow Mastery 2 / 4 / 6 / 8 / 10%; Malediction replaced by Grim Reach');
    var smT = WL.TALENT_BY_KEY.shadowMastery, gr = WL.TALENT_BY_KEY.grimReach;
    T.eq(smT.v.shadowPct.join(','), '2,4,6,8,10', 'Shadow Mastery per rank');
    T.ok(!WL.TALENT_BY_KEY.malediction, 'Malediction is gone');
    T.ok(gr && gr.tree === 'affliction' && gr.row === 1 && gr.col === 0 && gr.ranks === 2 && gr.v.rangePct.join(',') === '10,20', 'Grim Reach in its place: 2 ranks, range +10 / 20%');
    T.ok(WL.BUILDS.every(function (b) { return !b.talents.malediction; }), 'no built-in build has Malediction points');
    T.ok(WL.BUILDS.every(function (b) { return !WL.validateBuild(b).length; }), 'every built-in build is legal');
    var c = det(), bS = tb(['shadowBolt'], { shadowMastery: 5 }), tS = WL.buildSpellTable(bS, WL.computeStats(bS, 'gnome', c), c);
    T.ok(near(tS.shadowBolt.op0, 0.10, 1e-12) && near(tS.corruption.op22, 0.10, 1e-12), 'Shadow Mastery 5/5: Shadow Bolt hits and Corruption ticks +10% (talent group ' + tS.shadowBolt.op0 + ' / ' + tS.corruption.op22 + ')');
    var bG = tb(['shadowBolt'], { grimReach: 2 }), tG = WL.buildSpellTable(bG, WL.computeStats(bG, 'gnome', c), c);
    T.ok(['shadowBolt', 'corruption', 'immolate', 'hellfire', 'drainLife'].every(function (k) { return !tG[k].op0 && !tG[k].op22; }), 'Grim Reach 2/2: no damage change');
    T.ok(WL.TALENT_TEXT.grimReach && /range of your Affliction spells by 20%/.test(WL.TALENT_TEXT.grimReach[1]), 'Grim Reach tooltip', String(WL.TALENT_TEXT.grimReach));
    T.ok(/by 10%\./.test(WL.TALENT_TEXT.shadowMastery[4]), 'Shadow Mastery tooltip says 10% at 5/5', WL.TALENT_TEXT.shadowMastery[4]);

    T.group('Ruthless (Human) +2% and Savage (Orc) +1% crit: spells and your melee crit');
    var b = tb(['shadowBolt']), cs = function (r, cc) { return WL.computeStats(b, r, cc || c); };
    var sH = cs('human'), sO = cs('orc'), sN = cs('none'), sT = cs('troll'), cb = c.combat;
    T.ok(near(sH.critPct - sN.critPct, 2) && near(sO.critPct - sN.critPct, 1) && near(sT.critPct - sN.critPct, 0), 'spell crit vs no race: Human +' + (sH.critPct - sN.critPct) + ', Orc +' + (sO.critPct - sN.critPct) + ', Troll +' + (sT.critPct - sN.critPct));
    T.ok(near(sH.meleeCritPct, cb.meleeCritBasePct + sH.agi / cb.agiPerMeleeCrit + 2), 'Human melee crit (the Succubus inherits it) = 2% + Agility ÷ 20 + 2% Ruthless = ' + sH.meleeCritPct.toFixed(2));
    T.ok(near(sO.meleeCritPct, cb.meleeCritBasePct + sO.agi / cb.agiPerMeleeCrit + 1), 'Orc melee crit = 2% + Agility ÷ 20 + 1% Savage = ' + sO.meleeCritPct.toFixed(2));
    var cA = det(function (x) { x.gear.critIncludesAll = true; });
    T.ok(near(cs('human', cA).critPct, cs('none', cA).critPct), '"Sheet crit % already includes … racials": Ruthless is not added again');
    T.ok(!('weaponIsSword' in WL.DEFAULT_CONFIG.gear), 'the Sword setting is gone');
    T.ok(WL.RACES.human.racials.some(function (r) { return r.name === 'Ruthless'; }) && !WL.RACES.human.racials.some(function (r) { return /Sword/.test(r.name); }), 'Human racials: The Human Spirit, Ruthless');

    T.group('Blood Fury: 3 minute cooldown');
    var bf = WL.RACES.orc.racials.filter(function (r) { return r.name === 'Blood Fury'; })[0];
    T.eq(bf.cd, 180, 'Blood Fury cooldown 180 s');
    var rO = WL.simulateOnce(b, 'orc', c, { seed: 1, duration: 300, log: true });
    var pops = rO.log.filter(function (e) { return e.type === 'racial'; }).map(function (e) { return e.t; });
    T.ok(pops.length === 2 && pops[1] - pops[0] >= 180 - 1e-6 && pops[1] - pops[0] < 184, 'in a 300 s fight it is used at ' + pops.join(' and ') + ' s');

    T.group('Eureka!: an 8 s buff, no charges; a cast counts when it finishes while the buff is up');
    var eu = WL.RACES.gnome.racials.filter(function (r) { return r.effect === 'cooldown'; })[0];
    T.ok(eu.duration === 8 && !eu.charges && eu.cd === 120 && eu.dmgPct === 10 && eu.costRedPct === 10, 'Eureka!: 8 s, 2 min cooldown, +10% damage, −10% mana', JSON.stringify(eu));
    var rG = WL.simulateOnce(b, 'gnome', c, { seed: 1, duration: 30, log: true });
    var pop = rG.log.filter(function (e) { return e.type === 'racial'; })[0], end = pop.t + 8;
    var casts = rG.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowBolt'; });
    var hits = rG.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt'; });
    var inside = casts.map(function (x) { return x.t + x.castTime < end - 1e-6; }), normal = hits[hits.length - 1].dmg;
    T.ok(inside.filter(Boolean).length >= 2 && inside.some(function (x) { return !x; }), inside.filter(Boolean).length + ' Shadow Bolts finish inside the 8 s, the rest after');
    T.ok(hits.every(function (h, i) { return Math.abs(h.dmg / normal - (inside[i] ? 1.10 : 1)) < 0.01; }), 'those hit for × 1.10, the others normally (' + hits.slice(0, 5).map(function (h) { return h.dmg; }).join(', ') + ' …)');
    var strad = casts.filter(function (x) { return x.t < end - 1e-6 && x.t + x.castTime > end + 1e-6; });
    T.ok(strad.length === 1 && !strad[0].eureka, 'the Shadow Bolt started at ' + (strad[0] && strad[0].t) + ' s finishes after the buff (' + end + ' s): no bonus, no cheaper cast');
    T.ok(casts.every(function (x, i) { return !!x.eureka === inside[i]; }), 'the fight log marks exactly the casts that finish inside');
    var first = casts[0], before = rG.log[rG.log.indexOf(first) - 1], tab = WL.buildSpellTable(b, WL.computeStats(b, 'gnome', c), c);
    T.ok(before && before.t === first.t && Math.abs(before.mana - first.mana - Math.round(tab.shadowBolt.cost * 0.9)) <= 1, 'the first one costs 90% (' + (before && before.mana - first.mana) + ' of ' + Math.round(tab.shadowBolt.cost) + ')');
    T.ok(!rG.log.some(function (e) { return e.type === 'expire' && e.spell === 'eureka'; }) && near(rG.auras.eureka[0][1] - rG.auras.eureka[0][0], 8, 1e-6), 'the buff simply runs 8 s (aura ' + rG.auras.eureka[0].join(' – ') + ')');
    // a channel: its ticks while the buff is up
    var bD = tb(['drainLife']), rD = WL.simulateOnce(bD, 'gnome', c, { seed: 1, duration: 20, log: true });
    var popD = rD.log.filter(function (e) { return e.type === 'racial'; })[0], endD = popD.t + 8;
    var ticks = rD.log.filter(function (e) { return e.type === 'tick' && e.spell === 'drainLife'; });
    var tIn = ticks.filter(function (e) { return e.t < endD - 0.01; }), tOut = ticks.filter(function (e) { return e.t > endD + 0.01; });
    T.ok(tIn.length >= 5 && tOut.length >= 2 && tIn.every(function (e) { return Math.abs(e.dmg / tOut[0].dmg - 1.10) < 0.01; }), 'Drain Life: ' + tIn.length + ' ticks inside × 1.10, ' + tOut.length + ' after it normal');
    // a DoT: never
    var bC = tb(['corruption', 'shadowBolt']), rC = WL.simulateOnce(bC, 'gnome', c, { seed: 1, duration: 40, log: true });
    var cT = rC.log.filter(function (e) { return e.type === 'tick' && e.spell === 'corruption'; });
    T.ok(cT.length > 5 && cT.every(function (e) { return Math.abs(e.dmg - cT[cT.length - 1].dmg) <= 1; }), 'Corruption ticks are the same inside and outside the buff');

    T.group('Touch of the Grave: 30% chance, then 25 s cooldown; nothing multiplies it');
    var tg = WL.RACES.undead.racials.filter(function (r) { return r.effect === 'proc'; })[0];
    T.ok(tg.chancePct === 30 && tg.icd === 25 && tg.maxHealthPct === 5, 'Touch of the Grave: 30%, 25 s, 5% of your maximum health', JSON.stringify(tg));
    var demo = WL.BUILDS.filter(function (x) { return x.key === 'demo_pact_succ_sb'; })[0];
    var cU = det(function (x) { x.options.useCurseOfElements = true; x.buffs.powerInfusion.on = true; });
    var rU = WL.simulateOnce(demo, 'undead', cU, { seed: 3, duration: 600, log: true });
    var th = rU.log.filter(function (e) { return e.type === 'hit' && e.spell === 'touchOfTheGrave'; }), hpU = WL.computeStats(demo, 'undead', cU).maxHealth;
    T.ok(th.length >= 12 && th.length <= 24, th.length + ' hits in 600 s (at most 24 with the 25 s cooldown)');
    T.ok(th.every(function (e, i) { return i === 0 || e.t - th[i - 1].t >= 25 - 1e-6; }), 'at least 25 s between two hits');
    T.ok(th.every(function (e) { return e.dmg === Math.round(hpU * 0.05); }), 'every hit = 5% of ' + hpU.toFixed(0) + ' health = ' + Math.round(hpU * 0.05) + ', with Curse of the Elements, Improved Shadow Bolt, Master Demonologist and Power Infusion all in play');
    T.ok(/30% chance/.test(WL.SPELL_TEXT[1260201]) && /25 sec/.test(WL.SPELL_TEXT[1260201]), 'tooltip text', WL.SPELL_TEXT[1260201]);

    T.group('totems and Salvation');
    ['windfuryTotem', 'flametongueTotem', 'tranquilAir'].forEach(function (k) { T.ok(!WL.DEFAULT_CONFIG.buffs[k], k + ' is gone'); });
    T.ok(Object.keys(WL.DEFAULT_CONFIG.buffs).every(function (k) { return !WL.DEFAULT_CONFIG.buffs[k].excl; }), 'no raid buff clashes with another any more');
    T.eq(WL.DEFAULT_CONFIG.buffs.blessingOfSalvation.name, 'Salvation', 'Blessing of Salvation is now Salvation');
    T.ok(!WL.DEFAULT_CONFIG.buffs.blessingOfSalvation.group, '… and nothing to not stack with');
    T.ok(/spell crit \(raid\)/.test(WL.DEFAULT_CONFIG.buffs.moonkinAura.desc), 'Moonkin aura: spell crit, raid-wide', WL.DEFAULT_CONFIG.buffs.moonkinAura.desc);
    var c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), snap = JSON.parse(JSON.stringify(WL.settingsSnapshot(c2)));
    snap.buffs = snap.buffs.concat(['windfuryTotem', 'flametongueTotem', 'tranquilAir', 'graceOfAir']); snap.gear.weaponIsSword = true;
    var unk = WL.applySettings(c2, snap);
    T.eq(unk.join(','), '', 'an old settings code with those totems and the Sword box loads without "unknown" names');
    T.ok(c2.buffs.graceOfAir.on && !('weaponIsSword' in c2.gear), '… its Grace of Air is on, no Sword setting comes back');
    var cW = det(function (x) { x.options.includePetDamage = true; x.buffs.graceOfAir.on = true; });
    var rW = WL.simulateOnce(demo, 'human', cW, { seed: 1, duration: 60, log: true });
    T.ok(!rW.log.some(function (e) { return /windfury|flametongue/.test(e.spell || ''); }), 'the Succubus swings without any totem extras');

    T.group('old build codes and saved builds with Malediction still load');
    var d = WL.decodeBuild(code({ v: 1, short: 'Old', talents: { suppression: 5, malediction: 5, improvedCorruption: 5 }, pet: null, oil: 'none', rotation: ['shadowBolt'] }));
    T.eq(JSON.stringify(d.talents), '{"suppression":5,"improvedCorruption":5,"grimReach":2}', '5 Malediction → 2 Grim Reach (all it takes)');
    T.ok(d.migrated && d.migrated.length === 1 && /2 of its 5 points moved to Grim Reach, 3 unspent/.test(d.migrated[0]), 'the note says so', d.migrated && d.migrated[0]);
    var rows = function (b) { return WL.validateBuild(b).filter(function (x) { return !/Spend exactly 51/.test(x); }); };
    T.eq(rows(d).join('; '), '', '… and the tree rules still hold (the 3 unspent points are yours to spend)');
    var d2 = WL.decodeBuild(code({ v: 1, short: 'Old2', talents: { suppression: 5, improvedLifeTap: 2, improvedCorruption: 2, malediction: 1, pandemic: 3 }, pet: null, oil: 'none', rotation: ['shadowBolt'] }));
    T.ok(d2.talents.grimReach === 1 && !d2.talents.malediction && !rows(d2).length, '1 Malediction → 1 Grim Reach: Pandemic keeps its 10 points below', WL.validateBuild(d2).join('; '));
    var d3 = WL.decodeBuild(code({ v: 1, short: 'Old3', talents: { suppression: 5, malediction: 5, pandemic: 3 }, pet: null, oil: 'none', rotation: ['shadowBolt'] }));
    T.ok(rows(d3).some(function (x) { return /needs \d+ points/.test(x); }), 'Pandemic on 5 Suppression + 5 Malediction loses its row (2 + 5 < 10): the page keeps such a build as "needs fixing"', WL.validateBuild(d3).join('; '));
    T.ok(!('migrated' in WL.decodeBuild(WL.encodeBuild(WL.BUILDS[0]))), 'a build without Malediction: no note');

    T.group('gear builder: nothing about swords any more');
    var gs = WL.gearSheet({ on: true, slots: { mainHand: { custom: { name: 'S', slot: 'oneHand', stats: { sp: 10 }, weapon: 'sword' } } } }, WL.DEFAULT_CONFIG);
    T.ok(!('sword' in gs) && gs.sheet.sp === 10, 'the sheet has no sword field; the item still counts');
    T.ok(!('sword' in WL.gearSwapDelta({ slots: {} }, 'head', null, WL.DEFAULT_CONFIG)), 'a swap neither');
  });
})();
