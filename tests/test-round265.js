// Round 265 tests — public evidence notes of live-realm combat logs (Forever 70862–71139, 2026-11-10 … 11-26), the user's
// answers of 2026-11-27: "1. demonic brand cant crit. 2. yes change it to 26 3. do it anyway 4. do it too."
//  1. Demonic Brand: no change — it still never crits (the notes saw ~8–10% crits; the user keeps it without). [A51]
//  2. Bolt's Charged Eyeball: 26% of the shocks hit you (1,797 of 6,831; was 32%). [A113]
//  3. Kindling Stave (11750): Ignition, 60–81 Fire (×3 against Plants), 1.85 a minute on cast time (at least 1.5 s), 10 ms
//     cooldown, once per enemy a harmful spell lands on, never on ticks; Rain of Fire's cast on each enemy in its area. [A132]
//  4. Book of the Dead (13353, off hand): use = a Summoned Skeleton for 60 s, 15 min cooldown; a swing every 2.0 s from 3 s
//     after the use (ASSUMED walk-in), 104–137.8 Physical less armor, 8.0% miss / 5.1% dodge / 36.2% glancing (65%) /
//     50.7% hit, no crit; not your demon. [A132]
(function () {
  var KIN = 11750, BOOK = 13353;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function bld(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  var SB = bld('demo_pact_succ_sb');
  function run(slots, o) {
    o = o || {};
    var c = det(o.f), s = {};
    Object.keys(slots).forEach(function (k) { s[k] = { id: slots[k] }; });
    c.gearBuilder = { on: true, slots: s, manual: {}, enchants: {} };
    if (o.use) c.options.trinketUse = o.use;
    Object.assign(c.fight, o.fight || {});
    return WL.simulateOnce(o.build || SB, o.race || 'human', c, { seed: o.seed || 3, duration: o.duration || 180, log: true });
  }
  function procs(r, id) { return r.log.filter(function (e) { return e.spell === 'trinket:' + id && (e.type === 'hit' || e.type === 'miss'); }); }
  var COE = 1 + WL.SPELLS.curseOfElements.dmgTakenPct / 100;

  T.run('round 265: Demonic Brand still never crits; Bolt\'s Charged Eyeball 26% on you', function () {
    T.group('Demonic Brand (the user: "demonic brand cant crit")');
    var b = 0, bc = 0;
    ['demo_pact_succ_sb', 'demo_pact_fire'].forEach(function (k) {
      for (var s = 1; s <= 6; s++) {
        var r = WL.simulateOnce(bld(k), 'human', det(), { seed: s, duration: 180, log: true });
        r.log.forEach(function (e) { if (e.spell === 'pet:brand') { b++; if (e.crit) bc++; } });
        var row = r.bySpell['pet:brand']; if (row) bc += row.crits;
      }
    });
    T.ok(b > 50, b + ' Brand hits in 12 fights of the two Demonology builds');
    T.eq(bc, 0, 'none of them crits');
    var sim = src('../engine/sim.js'), bp = (sim.match(/function brandProc\(\) \{[\s\S]*?\n    \}/) || [''])[0];
    if (sim) T.ok(bp && bp.indexOf("deal('pet:brand', amt, false, false)") >= 0 && !/critRoll|R\.crit\(/.test(bp), 'engine: the Brand hit is dealt with crit false, no crit roll');

    T.group('Bolt\'s Charged Eyeball');
    var p = WL.TRINKET_FX[280032].proc;
    T.eq(p.selfPct, 26, '26% of the shocks hit you (round 265; 32% in rounds 229–264)');
    T.ok(p.chancePct === 15 && p.icd === 3 && p.min === 60 && p.max === 60, 'the rest unchanged: 15% per damage event, 3 s cooldown, 60 Nature');
    var me = 0, boss = 0;
    for (var s2 = 1; s2 <= 25; s2++) {
      var r2 = run({ mainHand: 1, trinket1: 280032 }, { seed: s2, duration: 600 });
      r2.log.forEach(function (e) {
        if (e.type === 'buff' && /Bolt's Charged Eyeball \(hits you\)/.test(e.spell)) me++;
        else if (e.spell === 'trinket:280032' && (e.type === 'hit' || e.type === 'miss')) boss++;
      });
    }
    var share = me / (me + boss), se = Math.sqrt(0.26 * 0.74 / (me + boss));
    T.ok(me + boss > 1000 && Math.abs(share - 0.26) < 4 * se, (me + boss) + ' procs, ' + (share * 100).toFixed(1) + '% on you (26 ± ' + (4 * se * 100).toFixed(1) + ')');
    var mech = src('../MECHANICS.md');
    if (mech) T.ok(/\| Bolt's Charged Eyeball \|[^\n]*74% of the time to the boss[^\n]*26% of the time to you/.test(mech), 'MECHANICS.md: 74% the boss, 26% you');
  });

  T.run('round 265: Kindling Stave — Ignition', function () {
    T.group('the data');
    var fx = WL.ITEM_FX[KIN], p = fx && fx.proc;
    T.ok(fx && fx.name === 'Kindling Stave' && fx.slot === 'mainHand', 'in WL.ITEM_FX, worn in the main hand');
    T.ok(WL.ITEMS[KIN] && WL.ITEMS[KIN].slot === 'twoHand', 'a two-hander in the gear builder\'s list');
    T.ok(p && p.kind === 'ppmCast' && p.procsPerMin === 1.85 && p.minCast === 1.5 && p.icd === 0.01, '1.85 a minute on cast time, at least 1.5 s, 10 ms cooldown');
    T.ok(p && p.min === 60 && p.max === 81 && p.school === 'fire' && !p.mana, '60–81 Fire, no mana');
    T.ok(p && p.vs && p.vs.plant === 3 && !p.onlyVs, '×3 against Plants (the trinkets\' vs)');
    T.ok(p && p.areaCastPerTarget === true, 'Rain of Fire\'s cast rolls on each enemy in its area');
    var gb = { gearBuilder: { on: true, slots: { mainHand: { id: KIN } }, manual: {}, enchants: {} } };
    T.eq(WL.equippedItemFx(gb).length, 1, 'a worn Kindling Stave counts (WL.equippedItemFx)');
    T.eq(WL.equippedTrinkets(gb).length, 0, '… it has no use effect (not in WL.equippedTrinkets)');
    T.ok(/1\.85 a minute/.test(WL.itemFxText(fx)) && /60–81 Fire/.test(WL.itemFxText(fx)) && !/mana/.test(WL.itemFxText(fx)) && /Plant/.test(WL.itemFxText(fx)), 'the gear builder\'s text: ' + WL.itemFxText(fx));

    T.group('the rate on Shadow Bolt landings: 1.85 × max(1.5, cast time) / 60');
    var land = 0, hit = 0, exp = 0, onTick = 0, dm = [], cr = [];
    for (var s = 1; s <= 30; s++) {
      var r = run({ mainHand: KIN }, { seed: s, duration: 300 }), lg = r.log, ct = null, pr = {};
      procs(r, KIN).forEach(function (e) { pr[e.t.toFixed(6)] = (pr[e.t.toFixed(6)] || 0) + 1; if (e.type === 'hit') (e.crit ? cr : dm).push(e.dmg); });
      var landAt = {}, tickAt = {};
      lg.forEach(function (e) {
        if (e.type === 'cast' && e.spell === 'shadowBolt') ct = e.castTime;
        if (e.spell === 'shadowBolt' && e.type === 'hit') { land++; exp += 1.85 * Math.max(1.5, ct || 0) / 60; if (pr[e.t.toFixed(6)]) hit++; }
        if (e.spell && e.spell.indexOf('trinket:') !== 0 && e.type !== 'tick' && e.type !== 'cast') landAt[e.t.toFixed(6)] = 1;
        if (e.type === 'tick') tickAt[e.t.toFixed(6)] = 1;
        if (e.type === 'cast') landAt[e.t.toFixed(6)] = 1;
      });
      Object.keys(pr).forEach(function (t) { if (pr[t] > 1) onTick += 1000; if (!landAt[t]) onTick++; });
    }
    var se = Math.sqrt(exp);
    T.ok(land > 1500 && Math.abs(hit - exp) < 4 * se, land + ' Shadow Bolt landings: ' + hit + ' procs, expected ' + exp.toFixed(1) + ' ± ' + (4 * se).toFixed(1));
    T.eq(onTick, 0, 'every proc comes with a landing or a cast of yours (none on a lone DoT tick), never two at once');
    T.ok(dm.length > 100 && dm.every(function (d) { return d >= 60 - 0.5 && d <= 81 * COE + 0.5; }), dm.length + ' non-crits within 60–81 (× Curse of the Elements): ' + Math.min.apply(null, dm) + '–' + Math.max.apply(null, dm));
    T.ok(cr.length > 0 && cr.every(function (d) { return d >= 90 - 0.5 && d <= 81 * COE * 1.5 + 0.5; }), cr.length + ' crits at ×1.5 (your crit)');

    T.group('×3 against Plants; nothing on DoT ticks');
    var pl = [];
    for (var s3 = 1; s3 <= 10; s3++) procs(run({ mainHand: KIN }, { seed: s3, duration: 300, fight: { bossType: 'plant' } }), KIN).forEach(function (e) { if (e.type === 'hit' && !e.crit) pl.push(e.dmg); });
    T.ok(pl.length > 20 && pl.every(function (d) { return d >= 180 - 0.5 && d <= 243 * COE + 0.5; }) && Math.max.apply(null, pl) > 81 * COE * 1.5, pl.length + ' non-crits against a Plant within 180–243 (× Curse of the Elements)');
    var sim = src('../engine/sim.js');
    if (sim) {
      var pt = (sim.match(/function periodicTick\(key[\s\S]*?\n    \}/) || [''])[0], ax = (sim.match(/function aoeTick\(key, i\) \{[\s\S]*?\n    \}/) || [''])[0];
      T.ok(pt && ax && pt.indexOf('itemOnLand') < 0 && ax.indexOf('itemOnLand') < 0, 'engine: DoT ticks and Hellfire / Rain of Fire ticks never call itemOnLand');
    }
  });

  T.run('round 265: Book of the Dead — the Summoned Skeleton', function () {
    T.group('the data');
    var fx = WL.ITEM_FX[BOOK], u = fx && fx.use;
    T.ok(fx && fx.name === 'Book of the Dead' && fx.slot === 'offHand' && WL.ITEMS[BOOK] && WL.ITEMS[BOOK].slot === 'offHand', 'in WL.ITEM_FX, worn in the off hand');
    T.ok(u && u.kind === 'melee' && u.duration === 60 && u.cd === 900 && u.every === 2 && u.first === 3, '60 s, 15 min cooldown, a swing every 2.0 s from 3 s after the use (the walk-in, assumed)');
    T.ok(u && u.min === 104 && u.max === 137.8 && u.school === 'physical', '104–137.8 Physical (120.9 ± 14%)');
    T.ok(u && u.missPct === 8 && u.dodgePct === 5.1 && u.glancePct === 36.2 && u.glanceDmgPct === WL.DEFAULT_CONFIG.combat.petMelee.glanceDmgPct, '8.0% miss, 5.1% dodge, 36.2% glancing at the demon\'s glancing damage (65%)');
    var gb = function (mh) { return { gearBuilder: { on: true, slots: { mainHand: { id: mh }, offHand: { id: BOOK } }, manual: {}, enchants: {} } }; };
    var tr = WL.equippedTrinkets(gb(17780));
    T.ok(tr.length === 1 && tr[0].slot === 'offHand' && tr[0].id === BOOK, 'with a one-hander: its use is with the trinkets (slot offHand)');
    if (WL.gearOffHandBlocked) T.eq(WL.equippedTrinkets(gb(13937)).length + WL.equippedItemFx(gb(13937)).length, 0, 'nothing while a two-hander (Headmaster\'s Charge) blocks the off hand');
    T.ok(/60 s/.test(WL.itemFxText(fx)) && /36\.2% glancing/.test(WL.itemFxText(fx)) && /not your demon/.test(WL.itemFxText(fx)), 'the gear builder\'s text: ' + WL.itemFxText(fx));

    T.group('in the fight: one use, 29 swings 2.0 s apart from +3 s');
    var r = run({ mainHand: 1, offHand: BOOK }, { use: { offHand: 'ready' }, duration: 600 }), us = r.log.filter(function (e) { return e.type === 'trinket' && e.spell === 'Book of the Dead'; }), sw = procs(r, BOOK);
    T.eq(us.length, 1, 'one use in a 10 min fight (15 min cooldown)');
    var zu = run({ mainHand: 1, trinket1: 276744 }, { use: { trinket1: 'ready' }, duration: 600 }).log.filter(function (e) { return e.type === 'trinket'; });
    T.ok(us.length && zu.length && Math.abs(us[0].t - zu[0].t) < 1e-6, '"whenever it is ready": when an on-use trinket would be (' + (us[0] ? us[0].t.toFixed(2) : '?') + ' s, the first damaging cast after the opener)');
    T.eq(sw.length, 29, '29 swings');
    T.ok(us.length && sw.every(function (e, i) { return Math.abs(e.t - us[0].t - 3 - 2 * i) < 1e-6; }), 'at +3, +5 … +59 s');
    var d = run({ mainHand: 1, offHand: BOOK }, { duration: 180 }), du = d.log.filter(function (e) { return e.type === 'trinket' && e.spell === 'Book of the Dead'; });
    T.eq(du.length, 1, 'the default use setting ("with your other cooldowns") uses it too, once (at ' + (du[0] ? du[0].t.toFixed(1) : '?') + ' s)');

    T.group('its attack table and damage: not your hit or crit');
    var n = 0, miss = 0, gl = 0, hits = [], gls = [], crit = 0, ar = 1 - WL.armorReduction(det());
    for (var s = 1; s <= 40; s++) {
      var rr = run({ mainHand: 1, offHand: BOOK }, { seed: s, use: { offHand: 'ready' }, duration: 70 });
      procs(rr, BOOK).forEach(function (e) { n++; if (e.type === 'miss') miss++; else { if (e.crit) crit++; if (e.glance) { gl++; gls.push(e.dmg); } else hits.push(e.dmg); } });
    }
    var sd = function (p) { return 4 * Math.sqrt(p * (1 - p) / n); };
    T.eq(n, 40 * 29, n + ' swings in 40 fights');
    T.ok(Math.abs(miss / n - 0.131) < sd(0.131), 'miss + dodge ' + (miss / n * 100).toFixed(1) + '% (13.1 ± ' + (sd(0.131) * 100).toFixed(1) + ')');
    T.ok(Math.abs(gl / n - 0.362) < sd(0.362), 'glancing ' + (gl / n * 100).toFixed(1) + '% (36.2 ± ' + (sd(0.362) * 100).toFixed(1) + ')');
    T.eq(crit, 0, 'no crit');
    T.ok(hits.every(function (x) { return x >= Math.floor(104 * ar) && x <= Math.ceil(137.8 * ar); }), hits.length + ' hits within 104–137.8 × (1 − armor ' + ((1 - ar) * 100).toFixed(1) + '%): ' + Math.min.apply(null, hits) + '–' + Math.max.apply(null, hits));
    T.ok(gls.every(function (x) { return x >= Math.floor(104 * ar * 0.65) && x <= Math.ceil(137.8 * ar * 0.65); }), gls.length + ' glancing blows at 65%');
    var hit7 = run({ mainHand: 1, offHand: BOOK }, { seed: 5, use: { offHand: 'ready' }, duration: 70, f: function (c) { c.gear.hitPct = 10; c.gear.critPct = 40; } });
    T.ok(procs(hit7, BOOK).every(function (e) { return !e.crit; }), 'your crit (40%) and hit do not change it: still no crit');

    T.group('not your demon');
    var sim = src('../engine/sim.js'), ts = (sim.match(/function trSwing\(x, u\) \{[\s\S]*?\n    \}/) || [''])[0];
    if (sim) T.ok(ts && !/brandProc|petMult|jowProc|stats\.critPct|hitNow/.test(ts), 'engine: a swing spends no Demonic Brand charge, takes no demon bonus, no Judgement of Wisdom, not your hit or crit');
    var app = src('../app/app.js');
    if (app) T.ok(/u\.kind === 'melee' \? 'a fighter for '/.test(app) && /tr:\(trinket\\d\|offHand\)/.test(app), 'app.js: the cooldown row and the timeline describe it');
  });
})();
