// Round 30 tests: WoW Forever beta build of 2026-09-24 (dev notes, S12) — Eureka! -10% mana, Touch of the Grave on
// every damaging cast (DoTs and channels on cast, never on ticks), Wizard Oil 24 SP.
(function () {
  function cfg0() { return JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); }

  T.run('beta build 2026-09-24 changes (round 30)', function () {
    T.group('Eureka!: mana cost -10%');
    var top = WL.BUILDS[0], cfg = cfg0(); cfg.options.activesPolicy = 'pull';   // cooldowns on the pull (round 87 default: first Doom explosion)
    var r = WL.simulateOnce(top, 'gnome', cfg, { seed: 5, duration: 60, log: true }), n = 0;
    var table = WL.buildSpellTable(top, WL.computeStats(top, 'gnome', cfg), cfg);
    for (var i = 1; i < r.log.length; i++) {
      var e = r.log[i], p = r.log[i - 1];
      if (e.type === 'cast' && e.eureka && p.t === e.t) {        // mana right before and right after the cast, same instant
        T.near(p.mana - e.mana, Math.round(table[e.spell].cost * 0.9), 1.01, 'Eureka! cast of ' + e.spell + ' costs 90% (' + (p.mana - e.mana) + ' of ' + Math.round(table[e.spell].cost) + ')');
        n++;
      }
    }
    T.ok(n >= 1, 'at least one Eureka!-empowered cast checked (' + n + ')');

    T.group('Touch of the Grave: on every landed damaging cast, never on ticks');
    var foundDot = false, foundChan = false, badTick = false, badUtil = false;
    var drain = WL.findBuild('aff_pact_succ_drain');
    [top, drain].forEach(function (b) {
      for (var s = 1; s <= 25; s++) {
        var x = WL.simulateOnce(b, 'undead', cfg, { seed: s, duration: 120, log: true });
        for (var k = 1; k < x.log.length; k++) {
          var q = x.log[k], pr = x.log[k - 1];
          if (q.spell !== 'touchOfTheGrave') continue;
          if (pr.type === 'apply' && WL.SPELLS[pr.spell] && WL.SPELLS[pr.spell].kind === 'dot') foundDot = true;
          if (pr.type === 'cast' && WL.SPELLS[pr.spell] && WL.SPELLS[pr.spell].kind === 'channel') foundChan = true;
          if (pr.type === 'tick') badTick = true;
          // (an 'isb' debuff entry may precede it: it belongs to the same Shadow Bolt hit)
          if ((pr.type === 'debuff' && pr.spell === 'curseOfElements') || (pr.type === 'cast' && pr.spell === 'lifeTap')) badUtil = true;
        }
      }
    });
    T.ok(foundDot, 'procs right after a DoT is applied (Corruption / Bane / Siphon Life)');
    T.ok(foundChan, 'procs when a channel (Drain Life) lands');
    T.ok(!badTick, 'never right after a periodic tick');
    T.ok(!badUtil, 'never from a curse or Life Tap');
    var agg = WL.simulate(top, 'undead', cfg, { iterations: 300, log: false }), landed = 0;
    Object.keys(agg.bySpell).forEach(function (k) { var s = WL.SPELLS[k]; if (s && s.kind !== 'utility') landed += agg.bySpell[k].landed; });
    var rate = agg.bySpell.touchOfTheGrave.casts / landed;
    T.near(rate, 0.10, 0.012, 'proc rate per landed damaging cast ≈ 10% (' + (100 * rate).toFixed(2) + '% of ' + landed.toFixed(1) + ' casts per fight)');

    T.group('Wizard Oil');
    T.ok(!WL.CONSUMABLES.wizardOil, 'Wizard Oil (24 SP since this beta build) removed in round 87: only Brilliant Wizard Oil is kept');
  });
})();
