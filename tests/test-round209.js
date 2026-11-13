// Round 209 tests (user: "do 1 to 20 and put them in the gear builder … a boss type (dragonkin/human/etc) picker … do the same
// with zone"): 20 more trinket effects, the boss type and zone they depend on, the zone trinkets' own stats. [A113]
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function wear(c, id, fight) { c.gearBuilder = { on: true, slots: { trinket1: { id: id } }, manual: {}, enchants: {} }; c.options.trinketUse = { trinket1: 'ready' }; Object.assign(c.fight, fight || {}); return c; }
  function run(id, fight, seed, f) { return WL.simulateOnce(sheet('wrack_ds'), 'human', wear(det(f), id, fight), { seed: seed || 3, duration: 180, log: true }); }
  function lines(r, key, type) { return r.log.filter(function (e) { return e.spell === key && (!type || e.type === type); }); }
  var NEW = [13968, 274615, 13382, 10577, 260802, 22268, 280032, 273840, 18371, 11832, 11819, 270226, 18354, 23207, 19812, 18467, 12930, 270225, 270276, 21565, 21566, 271903, 271905, 272059, 272061];

  T.run('round 209: boss type, zone, the trinkets in the gear builder', function () {
    T.group('settings');
    T.ok(WL.DEFAULT_CONFIG.fight.bossType === '' && WL.DEFAULT_CONFIG.fight.zone === '', 'boss type and zone: not set by default');
    T.ok(WL.BOSS_TYPES.length >= 20 && WL.ZONE_TYPES.length === 10, WL.BOSS_TYPES.length + ' boss types, ' + WL.ZONE_TYPES.length + ' zones (incl. not set)');
    ['dragonkin', 'humanoid', 'undead', 'demon', 'dinosaur', 'murloc', 'plant'].forEach(function (k) { T.ok(WL.BOSS_TYPES.some(function (b) { return b.key === k; }), 'boss type ' + k); });
    ['forest', 'marsh', 'mountain', 'snowy', 'volcanic', 'desert', 'wasteland', 'haunted', 'city'].forEach(function (k) { T.ok(WL.ZONE_TYPES.some(function (z) { return z.key === k; }), 'zone ' + k); });
    var cs = det(function (c) { c.fight.bossType = 'satyr'; });
    T.ok(WL.bossIs(cs, 'satyr') && WL.bossIs(cs, 'demon') && !WL.bossIs(cs, 'undead'), 'a Satyr counts as a Demon too');
    T.eq(WL.fxMult(det(function (c) { c.fight.zone = 'snowy'; }), { zones: { snowy: 2 } }), 2, 'a zone multiplier holds in its zone');
    T.eq(WL.fxMult(det(), { zones: { snowy: 2 }, vs: { undead: 2 } }), 1, '… and nowhere else');
    var code = WL.encodeSettings(det(function (c) { c.fight.bossType = 'undead'; c.fight.zone = 'forest'; })), back = det();
    WL.applySettings(back, WL.decodeSettings(code));
    T.ok(back.fight.bossType === 'undead' && back.fight.zone === 'forest', 'a settings code carries both');

    T.group('gear builder');
    NEW.forEach(function (id) { T.ok(!!WL.ITEMS[id] && !!WL.TRINKET_FX[id], WL.TRINKET_FX[id].name + ' (' + id + ') in the gear builder with its effect'); });
    T.eq(WL.ITEMS[12930].stats.sp, 15, 'Briarwood Reed: 15 spell power (Wowhead\'s list counts the Marsh doubling always: 30)');
    T.eq(WL.ITEMS[270225].stats.sp, 8, 'Jewel of the Guard Captain: 8 spell power (24 in Forest areas)');
    T.eq(WL.ITEMS[21565].stats.spellPen, 3, 'Rune of Perfection: 3 Spell Penetration (10 in Forest areas)');
    T.eq(WL.ITEMS[271903].stats.mp5, 5, 'Enriched Seal: 5 MP5 (15 in Forest areas)');
    T.eq(WL.ITEMS[11819].stats.sp, 5, 'Second Wind: 5 spell power (its tooltip: healing up to 15 and damage up to 5)');

    T.group('equip effects that need a boss type or zone');
    var b = sheet('wrack_ds');
    function spOf(id, fight) { return WL.computeStats(b, 'human', wear(det(), id, fight)).sp; }
    var s0 = spOf(23207, {});
    T.eq(spOf(23207, { bossType: 'undead' }) - s0, 85, 'Mark of the Champion: +85 against Undead');
    T.eq(spOf(23207, { bossType: 'satyr' }) - s0, 85, '… and against a Satyr (a Demon)');
    T.eq(spOf(23207, { bossType: 'dragonkin' }) - s0, 0, '… nothing against Dragonkin');
    T.eq(spOf(19812, { bossType: 'undead' }) - spOf(19812, {}), 46, 'Rune of the Dawn: +46 against Undead');
    T.eq(spOf(18467, { bossType: 'demon' }) - spOf(18467, {}), 18, "Royal Seal of Eldre'Thalas: +18 against Demons");
    T.eq(spOf(12930, { zone: 'marsh' }) - spOf(12930, {}), 15, 'Briarwood Reed: +15 in Marsh areas');
    T.eq(spOf(270276, { zone: 'forest' }) - spOf(270276, {}), 16, 'Cleansed Vilebranch Icon: +16 in Forest areas (tripled)');
    var st = WL.computeStats(b, 'human', wear(det(), 21565, { zone: 'forest' }));
    T.ok(st.breakdown.some(function (x) { return x.stat === 'spellPen' && x.source === 'Rune of Perfection' && x.value === 7; }), 'Rune of Perfection: +7 Spell Penetration in Forest areas, listed by name');
    T.eq(WL.computeStats(b, 'human', wear(det(), 272061, { zone: 'forest' })).mp5 - WL.computeStats(b, 'human', wear(det(), 272061, {})).mp5, 10, 'Darkspear Voodoo Seal: +10 MP5 in Forest areas');
  });

  T.run('round 209: trinket effects in the fight', function () {
    T.group('Cannonball Runner: 10 Holy shots, ×2 against Undead, no Curse of the Elements');
    var r = run(13382), sh = lines(r, 'trinket:13382').filter(function (e) { return e.type === 'hit' || e.type === 'miss'; });
    var first = lines(r, 'Cannonball Runner', 'trinket')[0];
    T.ok(sh.length >= 10, sh.length + ' shots in the fight');
    var tenAfter = sh.filter(function (e) { return first && e.t > first.t && e.t <= first.t + 10 + 1e-6; });
    T.eq(tenAfter.length, 10, 'the first use: 10 shots, one every second');
    T.ok(sh.filter(function (e) { return e.type === 'hit' && !e.crit; }).every(function (e) { return e.dmg >= 85 && e.dmg <= 139; }), 'non-crit shots 85–139 (Curse of the Elements is up and not added: Holy)');
    var ru = run(13382, { bossType: 'undead' });
    T.ok(lines(ru, 'trinket:13382', 'hit').filter(function (e) { return !e.crit; }).every(function (e) { return e.dmg >= 170 && e.dmg <= 278; }), 'against Undead: 170–278');

    T.group('Draconic Infused Emblem: +35 spell power for 10 s on a damaging cast, then 60 s internal cooldown (user); ×2 against Dragonkin');
    var rdc = run(22268), pr = rdc.log.filter(function (e) { return e.type === 'buff' && e.spell === 'Draconic Infused Emblem'; });
    T.ok(pr.length === 3 && pr.every(function (e, i) { return !i || e.t - pr[i - 1].t >= 60 - 1e-6; }) && pr[0].t < 5, 'procs at ' + pr.map(function (e) { return e.t.toFixed(1); }).join(', ') + ' s: on the first damaging cast, then each minute');
    T.near(WL.trinketSpWorth(WL.TRINKET_FX[22268], det()), 35 / 6, 1e-9, 'its worth in the list: 35 × 10 / 60');
    T.near(WL.trinketSpWorth(WL.TRINKET_FX[22268], det(function (c) { c.fight.bossType = 'dragonkin'; })), 70 / 6, 1e-9, '… twice against Dragonkin');

    T.group("Bolt's Charged Eyeball: 15% per damage you deal, 3 s cooldown, half of it on you; ×3 against Dinosaurs");
    var rb = run(280032), bh = lines(rb, 'trinket:280032').filter(function (e) { return e.type === 'hit' || e.type === 'miss'; }), me = rb.log.filter(function (e) { return e.type === 'buff' && /Bolt's Charged Eyeball \(hits you\)/.test(e.spell); });
    var all = bh.concat(me).map(function (e) { return e.t; }).sort(function (a, z) { return a - z; });
    T.ok(all.length > 10 && all.every(function (t, i) { return !i || t - all[i - 1] >= 3 - 1e-6; }), all.length + ' procs, never two within 3 s');
    T.ok(me.length > 0 && bh.length > 0, me.length + ' on you, ' + bh.length + ' on the boss');
    var rd = run(280032, { bossType: 'dinosaur' });
    T.ok(lines(rd, 'trinket:280032', 'hit').filter(function (e) { return !e.crit; }).every(function (e) { return Math.abs(e.dmg - 180) <= 1; }), 'against Dinosaurs: 180');

    T.group('Cursed Murloc Eye: 2 Shadow damage per damaging cast, ×4 against Murlocs');
    var rm = run(273840), mh = lines(rm, 'trinket:273840', 'hit');
    T.ok(mh.length > 20 && mh.filter(function (e) { return !e.crit; }).every(function (e) { return e.dmg === 2 || e.dmg === 3; }), mh.length + ' hits of 2 (×1.1 Curse of the Elements)');
    T.ok(lines(run(273840, { bossType: 'murloc' }), 'trinket:273840', 'hit').filter(function (e) { return !e.crit; }).every(function (e) { return e.dmg >= 8 && e.dmg <= 9; }), 'against Murlocs: 8');

    T.group('mana trinkets');
    function manaFrom(id, fight) { return WL.simulateOnce(sheet('wrack_ds'), 'human', wear(det(), id, fight), { seed: 3, duration: 300 }).manaFromConsumables || 0; }
    T.ok(manaFrom(11819, {}) > 600 && manaFrom(11819, {}) <= 630 + 1e-6, 'Second Wind: up to 630 mana (' + Math.round(manaFrom(11819, {})) + ')');
    T.ok(manaFrom(11819, { zone: 'mountain' }) > 630, '… up to 1,260 in Mountainous areas (' + Math.round(manaFrom(11819, { zone: 'mountain' })) + ')');
    T.ok(manaFrom(18371, {}) > 1200, 'Mindtap Talisman: up to 1,250 mana (' + Math.round(manaFrom(18371, {})) + ')');
    var bk0 = WL.simulate(sheet('wrack_ds'), 'human', det(function (c) { c.fight.iterations = 300; })), bk1 = WL.simulate(sheet('wrack_ds'), 'human', wear(det(function (c) { c.fight.iterations = 300; }), 11832));
    T.ok(bk1.lifeTaps < bk0.lifeTaps, 'Burst of Knowledge: fewer Life Taps (' + bk0.lifeTaps.toFixed(2) + ' → ' + bk1.lifeTaps.toFixed(2) + ')');

    T.group('Eye of the Beast: +7% spell hit for 20 s');
    var e0 = WL.simulate(sheet('wrack_ds'), 'human', det(function (c) { c.fight.iterations = 300; })), e1 = WL.simulate(sheet('wrack_ds'), 'human', wear(det(function (c) { c.fight.iterations = 300; }), 13968));
    var miss = function (x) { var m = 0, n = 0; Object.keys(x.bySpell).forEach(function (k) { if (k.indexOf('pet:') && k.indexOf('trinket:')) { m += x.bySpell[k].misses || 0; n += (x.bySpell[k].misses || 0) + (x.bySpell[k].landed || 0); } }); return m / n; };
    T.ok(miss(e1) < miss(e0), 'fewer misses (' + (100 * miss(e0)).toFixed(2) + '% → ' + (100 * miss(e1)).toFixed(2) + '%)');

    T.group("Pimgib's Collar: +9 MP5 for the Imp");
    var imp = WL.BUILDS.filter(function (x) { return x.pet === 'imp'; })[0];
    if (imp) {
      var p0 = WL.simulateOnce(JSON.parse(JSON.stringify(imp)), 'human', det(), { seed: 3, duration: 180 }), p1 = WL.simulateOnce(JSON.parse(JSON.stringify(imp)), 'human', wear(det(), 18354), { seed: 3, duration: 180 });
      T.ok((p1.bySpell['pet:firebolt'] || {}).casts >= (p0.bySpell['pet:firebolt'] || {}).casts, 'the Imp casts at least as many Firebolts (' + ((p0.bySpell['pet:firebolt'] || {}).casts || 0) + ' → ' + ((p1.bySpell['pet:firebolt'] || {}).casts || 0) + ')');
    } else T.ok(true, 'no built-in Imp build');

    T.group('zones on older trinkets');
    var fz0 = run(249469), fz1 = run(249469, { zone: 'snowy' });
    T.ok(fz1.dps > fz0.dps, 'Frozen Heart of the Mountain: more in Snowy areas (' + fz0.dps.toFixed(1) + ' → ' + fz1.dps.toFixed(1) + ')');
    function boom(z) { var x = run(274760, z ? { zone: z } : {}), u = lines(x, 'Everlook Delivery Bot', 'trinket')[0], h = lines(x, 'trinket:274760').filter(function (e) { return e.type === 'hit' || e.type === 'miss'; })[0]; return u && h ? h.t - u.t : -1; }
    var bn = boom(''), bs = boom('snowy');
    T.ok(bn > 0 && bs > 0 && bs < bn, 'Everlook Delivery Bot goes off sooner in Snowy areas (3 or 4 spells instead of 7): ' + bs.toFixed(1) + ' s vs ' + bn.toFixed(1) + ' s after use');
  });
})();
