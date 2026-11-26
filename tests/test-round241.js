// Round 241 tests (user: "implement everything"): four trinkets and a weapon enchant from Wowhead Forever's spell data
// (2026-11-22) — Blackhand's Breadth, Everlook Pathcarver, Zarla's Snack Pouch, Scented Runewood Brooch, Dismantle; the
// onlyVs flag, a Physical trinket hit (boss armor, no Curse of the Elements). [A129] Rain of Fire ticks at a tenth of
// the resist share, no partial resist above 75% (user picked both). [A130]
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  // A trinket in trinket1 (used whenever ready) and / or a weapon enchant on a plain main hand.
  function wear(c, id, fight, ench, use) {
    c.gearBuilder = { on: true, slots: { mainHand: { id: 1 } }, manual: {}, enchants: ench ? { mainHand: { id: ench } } : {} };
    if (id) c.gearBuilder.slots.trinket1 = { id: id };
    c.options.trinketUse = { trinket1: use || 'ready' };
    Object.assign(c.fight, fight || {});
    return c;
  }
  var SB = sheet('demo_pact_succ_sb');
  function run(id, fight, o) {
    o = o || {};
    var c = wear(det(o.f), id, fight, o.ench, o.use);
    return WL.simulateOnce(o.b || SB, 'human', c, { seed: o.seed || 3, duration: o.duration || 180, log: o.log !== false });
  }
  function shots(r, key) { return r.log.filter(function (e) { return e.spell === key && (e.type === 'hit' || e.type === 'miss'); }); }
  var COE = 1 + WL.SPELLS.curseOfElements.dmgTakenPct / 100;

  T.run('round 241: the data', function () {
    T.group('trinkets and the enchant');
    var bb = WL.TRINKET_FX[13965].use;
    T.ok(bb.kind === 'crit' && bb.pct === 5 && bb.duration === 20 && bb.cd === 300 && bb.vs.orc === 2 && bb.vs.ogre === 2 && bb.target, "Blackhand's Breadth: +5% crit on your target for 20 s, 5 min, doubled against Orcs and Ogres");
    var pc = WL.TRINKET_FX[274759].use;
    T.ok(pc.kind === 'dmg' && pc.min === 607 && pc.max === 607 && pc.school === 'physical' && pc.cd === 300 && pc.vs.plant === 2, 'Everlook Pathcarver: 607 Physical, 5 min, ×2 against Plants');
    var zs = WL.TRINKET_FX[276744].use;
    T.ok(zs.kind === 'dmgOver' && zs.min === 213 && zs.max === 254 && zs.school === 'fire' && zs.shots === 4 && zs.first === 4 && zs.every === 3.3 && zs.cd === 900, "Zarla's Snack Pouch: 4 Fireballs of 213–254 Fire, the first at 4.0 s (round 260; round 258: 3.2), then one every 3.3 s, 15 min (round 258: a combat log; was 5 × 439 every 3 s)");
    if (WL.ITEMS[276744]) T.eq(WL.ITEMS[276744].stats.sp, 11, "Zarla's Snack Pouch: +11 spell power (item stats)");
    var br = WL.TRINKET_FX[269741].proc;
    T.ok(br.kind === 'dmg' && br.chancePct === 100 && br.min === 84 && br.max === 126 && br.school === 'nature' && br.vs.furbolg === 1 && br.onlyVs, 'Scented Runewood Brooch: 84–126 Nature per damaging cast, only against Furbolg');
    var dm = WL.ENCHANT_FX[7210];
    T.ok(dm && dm.name === 'Dismantle' && dm.about === 0 && dm.proc.kind === 'dmg' && dm.proc.min === 60 && dm.proc.max === 90 && dm.proc.school === 'nature' && dm.proc.vs.mechanical === 1 && dm.proc.onlyVs, 'Dismantle: 60–90 Nature, only against Mechanical');
    T.eq(WL.DEFAULT_CONFIG.combat.dismantleChancePct, 10, "Dismantle's chance: 10% (a guess; Revelation's was one until round 243)");
    T.ok(!WL.TRINKET_FX[280074], 'Scalding Flamehoof: no effect here (a drawback on you; its stats count)');
    [13965, 274759, 276744, 269741].forEach(function (id) { T.eq(WL.trinketSpWorth(WL.TRINKET_FX[id], det()), 0, WL.TRINKET_FX[id].name + ': no spell-power worth in the list'); });

    T.group('onlyVs');
    var fur = det(function (c) { c.fight.bossType = 'furbolg'; }), hum = det(function (c) { c.fight.bossType = 'humanoid'; });
    T.ok(WL.fxOn(fur, br) && !WL.fxOn(det(), br) && !WL.fxOn(hum, br), 'the Brooch counts against a Furbolg, not with no boss type, not against a Humanoid');
    T.eq(WL.fxMult(fur, br), 1, '… × 1 there');
    T.eq(WL.fxMult(hum, br), 0, '… × 0 elsewhere');
    T.ok(WL.fxOn(det(), bb) && WL.fxMult(det(), bb) === 1 && WL.fxMult(det(function (c) { c.fight.bossType = 'ogre'; }), bb) === 2, 'without onlyVs, vs still only multiplies (×1 / ×2)');
    T.eq(WL.equippedEnchantFx(wear(det(), null, {}, 7210)).length, 1, 'Dismantle on the main hand counts');
  });

  T.run('round 241: in the fight', function () {
    T.group('Scented Runewood Brooch: only against Furbolg');
    var none = run(null, {}), nf = run(269741, {}), nh = run(269741, { bossType: 'humanoid' }), noneH = run(null, { bossType: 'humanoid' });
    T.ok(!nf.bySpell['trinket:269741'] && shots(nf, 'trinket:269741').length === 0, 'no boss type: no hit');
    T.eq(nf.dps, none.dps, '… the same fight as without it (' + none.dps.toFixed(1) + ')');
    T.eq(nh.dps, noneH.dps, 'against a Humanoid: the same fight as without it');
    var rf = run(269741, { bossType: 'furbolg' }), bh = shots(rf, 'trinket:269741');
    T.ok(bh.length > 30, 'against a Furbolg: ' + bh.length + ' hits / misses (one per landed damaging cast)');
    T.ok(bh.filter(function (e) { return e.type === 'hit' && !e.crit; }).every(function (e) { return e.dmg >= 84 && e.dmg <= 126; }), 'non-crit hits 84–126 (Nature: no Curse of the Elements)');
    T.ok(bh.some(function (e) { return e.crit; }) && bh.some(function (e) { return e.type === 'miss'; }), 'your spell hit and crit roll');

    T.group('Dismantle: only against Mechanical');
    var dn = run(null, {}, { ench: 7210 }), dm = run(null, { bossType: 'mechanical' }, { ench: 7210 });
    T.ok(shots(dn, 'trinket:ench7210').length === 0, 'no boss type: no hit');
    T.eq(dn.dps, none.dps, '… the same fight as without it');
    var dh = shots(dm, 'trinket:ench7210');
    T.ok(dh.length > 0, 'against Mechanical: ' + dh.length + ' hits / misses at 10%');
    T.ok(dh.filter(function (e) { return e.type === 'hit' && !e.crit; }).every(function (e) { return e.dmg >= 60 && e.dmg <= 90; }), 'non-crit hits 60–90 (Nature)');
    var d100 = run(null, { bossType: 'mechanical' }, { ench: 7210, f: function (c) { c.combat.dismantleChancePct = 100; } });
    var d0 = run(null, { bossType: 'mechanical' }, { ench: 7210, f: function (c) { c.combat.dismantleChancePct = 0; } });
    var b100 = shots(run(269741, { bossType: 'furbolg' }), 'trinket:269741').length;
    T.ok(shots(d100, 'trinket:ench7210').length > dh.length * 4, 'combat.dismantleChancePct 100: ' + shots(d100, 'trinket:ench7210').length + ' (one per landed damaging cast)');
    T.eq(shots(d100, 'trinket:ench7210').length, b100, '… as many as the Brooch\'s 100% against a Furbolg (the same fight)');
    T.eq(shots(d0, 'trinket:ench7210').length, 0, 'combat.dismantleChancePct 0: none');

    T.group('Everlook Pathcarver: 607 Physical less armor, no Curse of the Elements, ×2 against Plants');
    var c0 = det(), v = 607 * (1 - WL.armorReduction(c0));
    var rp = run(274759, {}), ph = shots(rp, 'trinket:274759');
    T.eq(ph.length, 1, 'one use in 3 min (5 min cooldown)');
    T.ok(rp.log.some(function (e) { return e.type === 'debuff' && e.spell === 'curseOfElements' && e.t < ph[0].t; }), 'Curse of the Elements is up when it hits');
    T.ok(ph[0].type === 'miss' || [Math.round(v), Math.round(v * 1.5)].indexOf(ph[0].dmg) >= 0, '607 × (1 − armor ' + (100 * WL.armorReduction(c0)).toFixed(1) + '%) = ' + v.toFixed(1) + ' (× 1.5 on a crit), not × Curse of the Elements: ' + ph[0].dmg);
    var rpp = run(274759, { bossType: 'plant' }), pp = shots(rpp, 'trinket:274759');
    T.ok(pp[0].type === 'miss' || [Math.round(2 * v), Math.round(3 * v)].indexOf(pp[0].dmg) >= 0, 'against a Plant: twice that (' + pp[0].dmg + ')');
    var cNo = det(function (c) { c.debuffs.sunderArmor.on = false; c.debuffs.faerieFire.on = false; }), vNo = 607 * (1 - WL.armorReduction(cNo));
    var rpa = WL.simulateOnce(SB, 'human', wear(cNo, 274759), { seed: 3, duration: 180, log: true }), pa = shots(rpa, 'trinket:274759');
    T.ok(vNo < v && (pa[0].type === 'miss' || [Math.round(vNo), Math.round(vNo * 1.5)].indexOf(pa[0].dmg) >= 0), 'without Sunder Armor and Faerie Fire: the full armor, less (' + vNo.toFixed(1) + ')');

    T.group("Zarla's Snack Pouch: a whelp, 4 Fireballs of 213–254 Fire (round 258; was 5 × 439)");
    var rz = run(276744, {}), zu = rz.log.filter(function (e) { return e.type === 'trinket' && e.spell === "Zarla's Snack Pouch"; }), zh = shots(rz, 'trinket:276744');
    T.eq(zu.length, 1, 'one use in 3 min (15 min cooldown)');
    T.eq(zh.length, 4, '4 Fireballs');
    T.ok(zu.length && zh.every(function (e, i) { return Math.abs(e.t - zu[0].t - (4 + 3.3 * i)) < 1e-6; }), 'at 4.0, 7.3, 10.6 and 13.9 s (round 260)');
    T.ok(zh.filter(function (e) { return e.type === 'hit' && !e.crit; }).every(function (e) { return e.dmg >= Math.round(213 * COE) && e.dmg <= Math.round(254 * COE); }), 'non-crit: 213–254 × Curse of the Elements (Fire)');

    T.group("Blackhand's Breadth: +5% crit for your spells (10% against Orcs / Ogres), not your demon");
    function crits(r) {
      var me = 0, pet = 0;
      Object.keys(r.bySpell).forEach(function (k) { var b = r.bySpell[k]; if (k.indexOf('pet:') === 0) pet += b.crits + b.tickCrits; else if (k.indexOf('trinket:') !== 0) me += b.crits + b.tickCrits; });
      return { me: me, pet: pet };
    }
    var off = { me: 0, pet: 0 }, on = { me: 0, pet: 0 }, orc = { me: 0, pet: 0 }, mono = true;
    for (var s = 1; s <= 30; s++) {
      var a = crits(run(13965, {}, { seed: s, duration: 20, use: 'never', log: false }));
      var b = crits(run(13965, {}, { seed: s, duration: 20, log: false }));
      var o = crits(run(13965, { bossType: 'orc' }, { seed: s, duration: 20, log: false }));
      if (!(a.me <= b.me && b.me <= o.me)) mono = false;
      off.me += a.me; off.pet += a.pet; on.me += b.me; on.pet += b.pet; orc.me += o.me; orc.pet += o.pet;
    }
    T.ok(mono, 'in each of 30 fights of 20 s: crits never fewer with it, never fewer again against an Orc');
    T.ok(on.me > off.me && orc.me - off.me > 1.4 * (on.me - off.me), 'your crits: ' + off.me + ' → ' + on.me + ' (+5%) → ' + orc.me + ' (+10% against an Orc)');
    // Round 241 review: the check "your demon's crits do not change" is gone: it could not fail (your demon's attacks never
    // roll critRoll, so no trinket crit can reach them). The trinket's other limit, only on your target, is checked instead.

    T.group("Blackhand's Breadth: on your target only, not on extra targets (round 241 review)");
    var HF = { key: 't241', name: 't', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: ['hellfire'] };
    function tc(r, k) { var x = r.bySpell[k]; return x ? x.crits + x.tickCrits : 0; }
    var main = { off: 0, on: 0 }, extra = { off: 0, on: 0 }, same = true, ticks2 = 0;
    for (var s2 = 1; s2 <= 10; s2++) {
      var ra = run(13965, { targets: 3 }, { b: HF, seed: s2, duration: 20, use: 'never', log: false });
      var rb = run(13965, { targets: 3 }, { b: HF, seed: s2, duration: 20, log: false });
      main.off += tc(ra, 'hellfire'); main.on += tc(rb, 'hellfire');
      ['x2:hellfire', 'x3:hellfire'].forEach(function (k) { extra.off += tc(ra, k); extra.on += tc(rb, k); if (tc(ra, k) !== tc(rb, k)) same = false; ticks2 += (rb.bySpell[k] || {}).ticks || 0; });
    }
    T.ok(ticks2 > 200, 'Hellfire, 3 targets, 10 fights of 20 s: ' + ticks2 + ' ticks on targets 2 and 3');
    T.ok(same, '… their crits are the same with and without the trinket used, fight by fight (' + extra.off + ' → ' + extra.on + ')');
    T.ok(main.on > main.off, '… on your target: more (' + main.off + ' → ' + main.on + ')');
  });

  // Round 241 (user picked "Rain of Fire ticks: a tenth" and "Cap partials at 75%"; public evidence notes of live-realm
  // combat logs and Warcraft Logs reports (Forever 1.60.1.70862–71037, 2026-09-27 to 2026-11-22)) [A130].
  T.run('round 241: Rain of Fire ticks and the 75% partial cap', function () {
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), A = 24 / 523;
    function hi(res, f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.combat.targetResist.fire = res; c.combat.targetResist.shadow = res; if (f) f(c); return c; }
    function avg(p) { return p.dist.reduce(function (s, d) { return s + d.p * d.pct / 100; }, 0); }
    T.group('Rain of Fire: a tenth of the share, Hellfire the full share');
    T.eq(WL.RESIST_RULES.rainOfFire.tickShare, 1, 'rainOfFire: { noBonus, tickShare }');
    var rof = WL.spellResist(D, 0, 'fire', false, 0, 'rainOfFire', false), hf = WL.spellResist(D, 0, 'fire', false, 0, 'hellfire', false), sb = WL.spellResist(D, 0, 'shadow', false, 0, 'shadowBolt', false);
    T.near(rof.mean, -A / 10, 1e-12, '24 level resistance, no curse: Rain of Fire ticks lose ' + (A * 10).toFixed(3) + '% on average (a tenth of ' + (A * 100).toFixed(2) + '%)');
    T.near(rof.mean, sb.mean / 10, 1e-12, '… a tenth of a hit\'s at the same resistance');
    T.near(avg(rof), rof.mean, 1e-12, '… and its steps average that');
    T.near(hf.mean, sb.mean, 1e-12, 'Hellfire\'s ticks: the full share, like a hit (' + (-hf.mean * 100).toFixed(2) + '%)');
    T.eq(rof.landP, 1, 'Rain of Fire is not binary');
    var H = hi(300);
    T.near(WL.spellResist(H, 0, 'fire', false, 0, 'rainOfFire', false).mean, WL.spellResist(H, 0, 'fire', false, 0, 'hellfire', false).mean / 10, 1e-12, '300 Fire resistance: still a tenth of Hellfire\'s');
    T.eq(WL.spellResist(D, 15, 'fire', true, 0, 'rainOfFire', false).mean, 0, 'Spell Pierce past 0: still no bonus');
    var cl = JSON.parse(JSON.stringify(D)); cl.combat.resistModel = 'classic';
    T.near(WL.spellResist(cl, 0, 'fire', false, 0, 'rainOfFire', false).mean, WL.spellResist(cl, 0, 'fire', false, 0, 'hellfire', false).mean, 1e-12, 'the classic model rolls ticks like hits (unchanged)');

    T.group('no partial resist above 75%');
    var X = hi(1000, function (c) { c.options.useCurseOfElements = false; }), a = 1024 / (1024 + 499);
    var px = WL.spellResist(X, 0, 'shadow', false, 0, 'shadowBolt', false), raw = WL.tenthsDist(a);
    T.ok(raw.some(function (d) { return d.tenths > 7.5; }), '1000 Shadow resistance, no curse: share ' + (a * 100).toFixed(1) + '%, tenths above 75% before the cap');
    T.ok(px.dist.every(function (d) { return d.pct >= -75; }) && px.dist.some(function (d) { return d.pct === -75; }), 'Shadow Bolt: no step above 75% (' + px.dist.map(function (d) { return -d.pct + '%'; }).join(' / ') + ')');
    T.ok(px.dist.every(function (d) { return d.pct % 10 === 0 || d.pct === -75; }), '… steps of 10% up to 70%, or exactly 75%');
    T.near(px.dist.reduce(function (s, d) { return s + d.p; }, 0), 1, 1e-12, '… chances add to 1');
    T.near(avg(px), px.mean, 1e-12, '… mean ' + (-px.mean * 100).toFixed(2) + '% (the steps\' average), below the uncapped ' + (a * 100).toFixed(2) + '%');
    T.ok(-px.mean < a, '… the cap lowers the average');
    var pl = WL.petResist(X, 'shadow', false, 'lashOfPain');
    T.ok(pl.dist.every(function (d) { return d.pct >= -75; }) && pl.dist.some(function (d) { return d.pct === -75; }), 'Lash of Pain (demon partial): no step above 75% either');
    var ib = WL.spellResist(X, 0, 'fire', false, 0, 'incinerate', false), fb = WL.petResist(X, 'fire', false, 'firebolt');
    T.near(1 - ib.landP, a, 1e-12, 'Incinerate (binary): full resist chance still the share, ' + (a * 100).toFixed(1) + '% (not a partial)');
    T.near(1 - fb.landP, a, 1e-12, 'Imp Firebolt (binary): the same');
    var big = hi(9000, function (c) { c.options.useCurseOfElements = false; }), pb = WL.spellResist(big, 0, 'shadow', false, 0, 'shadowBolt', false);
    T.ok(pb.dist.length === 1 && pb.dist[0].pct === -75 && Math.abs(pb.mean + 0.75) < 1e-12, '9000 resistance (share 95%): every hit loses exactly 75%');
    var P = WL.resistProfile(D, 1000, 'shadow', true);
    T.ok(P.mean > 0.6 && P.dist.some(function (d) { return d.pct > 75; }), '1000 Spell Pierce: bonus steps are not capped (up to +' + Math.max.apply(null, P.dist.map(function (d) { return d.pct; })) + '%)');
    T.ok(WL.resistProfile(D, 0, 'shadow', false).dist.every(function (d) { return d.pct >= -20; }) && Math.abs(sb.mean + A) < 1e-12, 'default level resistance: unchanged (share ' + (A * 100).toFixed(2) + '%)');

    T.group('in a fight');
    function fight(rot, f, pet) {
      var c = hi(0, function (c) { c.fight.durationVarPct = 0; c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.options.useCurseOfElements = false; if (f) f(c); });
      return WL.simulateOnce({ key: 't', name: 't', talents: {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }, 'human', c, { seed: 4, duration: 1200, log: true });
    }
    function meanRes(r, key, type) { var t = r.log.filter(function (e) { return e.spell === key && e.type === type; }); return { n: t.length, m: t.reduce(function (s, e) { return s + (e.resistPct || 0); }, 0) / Math.max(1, t.length) / 100 }; }
    var res150 = function (c) { c.combat.targetResist.fire = 150; }, s150 = 174 / (174 + 499);
    var rr = meanRes(fight(['rainOfFire'], res150), 'rainOfFire', 'tick'), hh = meanRes(fight(['hellfire'], res150), 'hellfire', 'tick');
    T.near(rr.m, s150 / 10, 0.006, 'Rain of Fire ticks, 150 Fire resistance: ' + (rr.m * 100).toFixed(2) + '% resisted on average over ' + rr.n + ' ticks (a tenth of ' + (s150 * 100).toFixed(1) + '%)');
    T.near(hh.m, s150, 0.02, 'Hellfire ticks: ' + (hh.m * 100).toFixed(1) + '% over ' + hh.n + ' (the full share)');
    var sx = fight(['shadowBolt'], function (c) { c.combat.targetResist.shadow = 1000; }).log.filter(function (e) { return e.spell === 'shadowBolt' && e.type === 'hit'; });
    T.ok(sx.length > 50 && sx.every(function (e) { return !(e.resistPct > 75); }) && sx.some(function (e) { return e.resistPct === 75; }), 'Shadow Bolt at 1000 Shadow resistance: ' + sx.length + ' hits, none resisted more than 75%, some exactly 75%');
  });
})();
