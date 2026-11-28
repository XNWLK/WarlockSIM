// Round 277 tests — the user, 2026-11-28: "yes add both". Public evidence notes of live-realm combat logs (Forever,
// updated 2026-11-27):
//  1. Draconic Infused Emblem (22268): Rain of Fire's cast rolls it once for each enemy in its area (1 − 0.92ⁿ a cast),
//     never on a pulse → proc.areaCastPerTarget; engine/sim.js trOnAreaCast on the extra targets (the boss: trOnCast).
//  2. Blade of Eternal Darkness (17780), Engulfing Shadows: binary — fully resisted at the average share while the target
//     has resistance left, never partly, and no Spell Pierce bonus → proc.binary 'engulfingShadows' (engine/resist.js
//     WL.RESIST_RULES { binary, noBonus }); engine/sim.js itemOnLand. [A113][A127]
(function () {
  var EMB = 22268, BLADE = 17780;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function bld(k, rot) { var b = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === k; })[0])); if (rot) b.rotation = rot; return b; }
  function cfg(slots, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), s = {};
    c.fight.durationVarPct = 0;
    Object.keys(slots).forEach(function (k) { s[k] = { id: slots[k] }; });
    c.gearBuilder = { on: true, slots: s, manual: {}, enchants: {} };
    if (f) f(c);
    return c;
  }

  T.run('round 277: Draconic Infused Emblem per enemy on Rain of Fire\'s cast', function () {
    var p = WL.TRINKET_FX[EMB].proc;
    T.ok(p.areaCastPerTarget === true && p.chancePct === 8, 'proc.areaCastPerTarget, still 8% (the note: 7.84% over 1,480 wearers, kept at 8%)');
    var rof = bld('demo_pact_fire', ['rainOfFire']), starts = {};
    [1, 3].forEach(function (nt) {
      var casts = 0, n = 0;
      for (var sd = 1; sd <= 20; sd++) {
        WL.simulateOnce(rof, 'human', cfg({ trinket1: EMB }, function (c) { c.fight.targets = nt; }), { seed: sd, duration: 300, log: true }).log.forEach(function (e) {
          if (e.type === 'cast' && e.spell === 'rainOfFire') casts++;
          if (e.type === 'buff' && e.spell === 'Draconic Infused Emblem') n++;
        });
      }
      starts[nt] = n / casts;
    });
    T.ok(starts[3] > starts[1] * 2, 'Rain of Fire, 20 × 300 s: Emblem buffs per cast ' + starts[1].toFixed(3) + ' on 1 enemy, ' + starts[3].toFixed(3) + ' on 3 (1 − 0.92³ = 0.221 before overlaps)');
    var s = src('../engine/sim.js');
    if (s) T.ok(/function trOnAreaCast\(key\)/.test(s) && /if \(TRA && s\.aoe\) for/.test(s), 'engine/sim.js: trOnAreaCast on each extra enemy of an area cast');
  });

  T.run('round 277: Blade of Eternal Darkness is binary', function () {
    var p = WL.ITEM_FX[BLADE].proc, rr = WL.RESIST_RULES.engulfingShadows;
    T.ok(p.binary === 'engulfingShadows' && rr && rr.binary && rr.noBonus, 'proc.binary engulfingShadows; WL.RESIST_RULES: binary, no Spell Pierce bonus');
    var sb = bld('demo_pact_succ_sb');
    function count(f) {
      var o = { res: 0, hit: 0, part: 0 };
      for (var sd = 1; sd <= 30; sd++) WL.simulateOnce(sb, 'human', cfg({ mainHand: BLADE }, f), { seed: sd, duration: 600, log: true }).log.forEach(function (e) {
        if (e.spell !== 'trinket:' + BLADE) return;
        if (e.type === 'miss' && e.resisted) o.res++; else if (e.type === 'hit') o.hit++;
      });
      return o;
    }
    var noCoe = count(function (c) { c.options.useCurseOfElements = false; }), coe = count(null);
    var share = 24 / (24 + 8 * 60 + 19);
    T.ok(noCoe.res > 0 && Math.abs(noCoe.res / (noCoe.res + noCoe.hit) - share) < 0.03, 'no Curse of the Elements (24 level resistance left): ' + noCoe.res + ' of ' + (noCoe.res + noCoe.hit) + ' fully resisted (share ' + (share * 100).toFixed(1) + '%)');
    T.eq(coe.res, 0, 'with Curse of the Elements (resistance 0): none resisted');
    var pr = WL.spellResist(JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), 30, 'shadow', true, 0, 'engulfingShadows', false);
    T.ok(pr.R < 0 && pr.mean === 0 && pr.landP === 1, 'past the resistance (30 Spell Pierce): no bonus, always lands');
  });
})();
