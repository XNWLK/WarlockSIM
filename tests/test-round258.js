// Round 258 tests — Zarla's Snack Pouch from a player's combat log (2 uses, Stratholme, 2026-11-26; the user: "yes use the
// log, keep my hit and crit"): its Black Dragon Whelp casts Fireball (3.0 s casts, 0.1–1.0 s apart), the first starting
// 0.2 s after the summon, and the 15 s cut off the 5th → 4 Fireballs of 213–254 Fire (before Curse of the Elements)
// landing at about 3.2, 6.5, 9.8 and 13.1 s; your hit and crit as before. dmgOver's new optional `first` (when the first
// shot lands; default `every`) leaves Cannonball Runner as it was. [A129] The Max Pre-BiS trinkets were rerun (every pool
// trinket in both slots, paired fights).
(function () {
  var POUCH = 276744;
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  var SB = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === 'demo_pact_succ_sb'; })[0]));
  function run(id, o) {
    o = o || {};
    var c = det(o.f);
    c.gearBuilder = { on: true, slots: { mainHand: { id: 1 }, trinket1: { id: id } }, manual: {}, enchants: {} };
    c.options.trinketUse = { trinket1: 'ready' };
    Object.assign(c.fight, o.fight || {});
    return WL.simulateOnce(SB, 'human', c, { seed: o.seed || 3, duration: o.duration || 180, log: true });
  }
  function shots(r, id) { return r.log.filter(function (e) { return e.spell === 'trinket:' + id && (e.type === 'hit' || e.type === 'miss'); }); }
  function uses(r, name) { return r.log.filter(function (e) { return e.type === 'trinket' && e.spell === name; }); }
  var COE = 1 + WL.SPELLS.curseOfElements.dmgTakenPct / 100;

  T.run('round 258: Zarla\'s Snack Pouch from the combat log', function () {
    T.group('the data');
    var u = WL.TRINKET_FX[POUCH].use;
    T.ok(u.kind === 'dmgOver' && u.school === 'fire' && u.cd === 900, 'a summoned helper (dmgOver), Fire, 15 min cooldown');
    T.eq(u.shots, 4, '4 Fireballs (was 5): the 5th cast is cut off by the whelp\'s 15 s');
    T.eq(u.min, 213, 'min 213 before modifiers (was 439)');
    T.eq(u.max, 254, 'max 254 before modifiers (was 439)');
    T.eq(u.every, 3.3, 'one every 3.3 s (3.0 s casts + gaps; was 3)');
    T.eq(u.first, 4, 'the first lands 4.0 s after the use (round 260: 1 s + its 3.0 s cast; round 258: 3.2)');
    T.ok(WL.TRINKET_FX[POUCH].use.first + 3 * u.every < 15, 'the 4th lands inside the whelp\'s 15 s');
    T.ok(WL.TRINKET_FX[POUCH].use.first + 4 * u.every > 15 - 3, 'a 5th cast would start after ~12 s and end after 15 s: cut off');

    T.group('in the fight: 4 landings at 4.0 / 7.3 / 10.6 / 13.9 s (round 260), 213–254 × Curse of the Elements, your hit and crit');
    var r = run(POUCH), us = uses(r, "Zarla's Snack Pouch"), sh = shots(r, POUCH);
    T.eq(us.length, 1, 'one use in 3 min');
    T.eq(sh.length, 4, '4 Fireballs');
    [4.0, 7.3, 10.6, 13.9].forEach(function (at, i) {
      T.ok(us.length && sh[i] && Math.abs(sh[i].t - us[0].t - at) < 1e-6, 'Fireball ' + (i + 1) + ' at +' + at + ' s (' + (sh[i] && us.length ? (sh[i].t - us[0].t).toFixed(3) : '?') + ')');
    });
    var dm = [], cr = [], miss = 0;
    for (var s = 1; s <= 40; s++) {
      var rr = run(POUCH, { seed: s, duration: 20 });
      shots(rr, POUCH).forEach(function (e) { if (e.type === 'miss') miss++; else (e.crit ? cr : dm).push(e.dmg); });
    }
    T.ok(dm.length > 50 && dm.every(function (d) { return d >= Math.floor(213 * COE) && d <= Math.ceil(254 * COE); }), dm.length + ' non-crits, all within 213–254 × Curse of the Elements (' + Math.min.apply(null, dm) + '–' + Math.max.apply(null, dm) + ')');
    T.ok(Math.max.apply(null, dm) > 254, 'some above 254: Curse of the Elements is added (Fire)');
    T.ok(cr.length > 0 && cr.every(function (d) { return d >= Math.floor(213 * COE * 1.5) && d <= Math.ceil(254 * COE * 1.5); }), cr.length + ' crits at ×1.5 (your crit)');
    var mean = dm.reduce(function (a, b) { return a + b; }, 0) / dm.length;
    T.near(mean / COE, 233.5, 6, 'non-crit mean before Curse of the Elements ≈ 233.5 (uniform 213–254): ' + (mean / COE).toFixed(1));
    var cut = run(POUCH, { duration: 10, f: function (c) { c.options.trinketUse = { trinket1: 'ready' }; } }), cu = uses(cut, "Zarla's Snack Pouch"), cs = shots(cut, POUCH);
    T.ok(cu.length === 1 && cs.every(function (e) { return e.t <= 10 + 1e-6; }) && cs.length === [4.0, 7.3, 10.6, 13.9].filter(function (a) { return cu[0].t + a <= 10 + 1e-6; }).length, 'a 10 s fight: only the Fireballs that land before its end (' + cs.length + ')');

    T.group('other dmgOver trinkets unchanged (no `first`: the first shot after `every` s)');
    var cb = WL.TRINKET_FX[13382].use;
    T.ok(cb.kind === 'dmgOver' && cb.first == null && cb.shots === 10 && cb.every === 1 && cb.min === 85 && cb.max === 139, 'Cannonball Runner: 10 shots of 85–139 Holy, one every second, no `first`');
    var rc = run(13382), cuu = uses(rc, 'Cannonball Runner'), csh = shots(rc, 13382).filter(function (e) { return cuu.length && e.t > cuu[0].t && e.t <= cuu[0].t + 10 + 1e-6; });
    T.eq(csh.length, 10, 'Cannonball Runner: 10 shots in its first 10 s');
    T.ok(csh.every(function (e, i) { return Math.abs(e.t - cuu[0].t - (i + 1)) < 1e-6; }), '… at +1, +2, … +10 s, as before');
    var others = Object.keys(WL.TRINKET_FX).filter(function (id) { var x = WL.TRINKET_FX[id].use; return x && x.kind === 'dmgOver' && x.first != null; });
    T.eq(others.join(','), String(POUCH), 'only Zarla\'s Snack Pouch has a `first`');
  });

  T.run('round 258: the Max Pre-BiS trinkets rerun', function () {
    var EYE = 13968, WA = 272438, SEAL = 18467;
    var want = { demo_pact_succ_sb: [EYE, WA], demo_pact_fire: [POUCH, WA], destro_incin_succ: [EYE, WA], destro_incin_ds: [POUCH, WA], wrack_ds: [POUCH, WA] };
    Object.keys(want).forEach(function (k) {
      var M = WL.MAX_PRE_RAID_BIS[k], G = WL.MAX_BIS_GEAR[k], R = WL.PRE_RAID_BIS[k], w = want[k];
      T.ok(M.trinket1 === w[0] && M.trinket2 === w[1], 'Max ' + k + ': ' + WL.ITEMS[w[0]].name + ' + ' + WL.ITEMS[w[1]].name);
      T.ok(G.slots.trinket1 === w[0] && G.slots.trinket2 === w[1], 'generated Max gear ' + k + ': the same trinkets');
      T.ok(R.trinket1 === SEAL && R.trinket2 === WA, 'Realistic ' + k + ': still Royal Seal of Eldre\'Thalas + Weakness Analyzer');
    });
    T.ok(Object.keys(want).every(function (k) { var g = { slots: {} }; ['trinket1', 'trinket2'].forEach(function (s) { g.slots[s] = { id: WL.MAX_PRE_RAID_BIS[k][s] }; }); return !WL.gearUniqueOver(g).length; }), 'no unique-equipped rule broken');
    var ss = WL.MAX_BIS_GEAR.demo_pact_succ_sb.sums.sp, si = WL.MAX_BIS_GEAR.destro_incin_succ.sums.sp;
    T.ok(ss > 0 && si > 0, 'sums present (Shadow Demo sp ' + ss + ', Incinerate Pandemic sp ' + si + ')');
  });

  T.run('round 258: the pre-raid page ▲ for Royal Seal (private/bis-page, local only)', function () {
    function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
    var nt = src('../private/bis-page/notes.js'), dj = src('../private/bis-page/data.json');
    if (!nt || !dj) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    T.ok(!(18467 in mod.exports.UP), 'notes.js: no ▲ pick under Royal Seal of Eldre\'Thalas any more (the pouch: only +0.0 … +0.9 in its place)');
    T.ok(Object.keys(mod.exports.UP).every(function (k) { return mod.exports.UP[k] !== POUCH; }), 'no UP entry points to Zarla\'s Snack Pouch');
    var D = JSON.parse(dj);
    D.builds.forEach(function (b) {
      var t = b.alts && b.alts.trinket1, up = t && t.up;
      T.ok(!up || (up.id !== POUCH && up.dps > 0.5), b.key + ': Royal Seal\'s ▲ is no longer Zarla\'s Snack Pouch (' + (up ? WL.ITEMS[up.id].name + ' ' + up.dps : 'none') + ')');
      T.ok(t && t.alt && t.alt.dps < 0, b.key + ': ▼ kept (' + (t && t.alt && WL.ITEMS[t.alt.id].name) + ')');
    });
  });
})();
