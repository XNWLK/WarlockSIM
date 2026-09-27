// Round 35 tests: mid-fight pet swap at execute (A63) — the user's scenario: 2/31/18 Demo Pact SB Succubus, Improved
// Life Tap → Fel Domination; at execute sacrifice the Succubus (+15% Fire), Fel Domination, summon the Imp, Searing Pain
// filler with Decimation.
(function () {
  function scenario() {
    var b = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'demo_pact_succ_sb'; })[0]));
    delete b.talents.improvedLifeTap; b.talents.felDomination = 1;
    b.key = 't35swap'; b.short = 'swap test';
    b.rotation = ['bane', 'curseOfElements', 'searingPainBrand', 'immolate', 'corruption', 'swapToImp', 'soulFire', 'searingPainExecute', 'shadowBolt'];
    return b;
  }

  T.run('mid-fight pet swap (round 35)', function () {
    T.group('editor checks');
    var b = scenario();
    T.eq(WL.validateBuild(b).join(' | '), '', 'the scenario is legal (Fel Domination with Master Summoner 2/2, swap before the filler)');
    var noFd = JSON.parse(JSON.stringify(b)); delete noFd.talents.felDomination; noFd.talents.improvedLifeTap = 1;
    T.ok(WL.validateBuild(noFd).some(function (e) { return /Fel Domination/.test(e); }), 'without Fel Domination the swap is rejected');
    var same = JSON.parse(JSON.stringify(b)); same.rotation[5] = 'swapToSuccubus';
    T.ok(WL.validateBuild(same).some(function (e) { return /already out/.test(e); }), 'swapping to the demon that is already out is rejected');

    T.group('the swap in a fight');
    var cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), dur = 150;
    var r = WL.simulateOnce(b, 'human', cfg, { seed: 7, duration: dur, log: true }), log = r.log;
    var sac = log.filter(function (e) { return e.type === 'cast' && e.spell === 'demonicSacrifice'; });
    var fd = log.filter(function (e) { return e.type === 'cast' && e.spell === 'felDomination'; });
    var sum = log.filter(function (e) { return e.type === 'cast' && e.spell === 'summon:imp'; });
    T.eq([sac.length, fd.length, sum.length].join('/'), '1/1/1', 'one Demonic Sacrifice, one Fel Domination, one Summon Imp');
    var ts = r.swapAt, exT = dur * (1 - cfg.fight.executePct / 100);
    T.ok(ts >= exT - 1e-9 && ts < exT + 3.5, 'swap at the first decision in the execute phase (' + ts.toFixed(2) + ' s, execute from ' + exT.toFixed(2) + ' s)');
    // (log times are rounded to 1 ms; swapAt is exact)
    var at = function (e) { return Math.abs(e.t - ts) < 0.001; };
    T.ok(at(sac[0]) && at(fd[0]) && at(sum[0]) && sac[0].gcd === 0 && fd[0].gcd === 0 && sum[0].castTime === 0 && sum[0].gcd > 0,
      'all three at once: sacrifice and Fel Domination off the GCD, summon instant with one GCD');
    T.eq(sum[0].cost, Math.round(1373 * 0.80 * (1 - 0.50 - 0.40)), 'summon cost = 80% of base mana × (1 − 50% − 40%) = 110');
    var pets = log.filter(function (e) { return e.type === 'pet'; });
    T.ok(!pets.some(function (e) { return e.t > ts + 1e-9 && e.spell === 'pet:lashOfPain'; }), 'no Lash of Pain after the swap');
    // melee swings are not logged: count them — one every 2.0 s from 0 s until the swap
    T.eq(r.bySpell['pet:melee'].casts, Math.floor((ts - 1e-9) / 2.0) + 1, 'Succubus melee swings stop at the swap (' + r.bySpell['pet:melee'].casts + ' swings)');
    var fbBefore = pets.filter(function (e) { return e.spell === 'pet:firebolt' && e.t < ts; }).length, fbAfter = pets.filter(function (e) { return e.spell === 'pet:firebolt' && e.t > ts; }).length;
    T.ok(fbBefore === 0 && fbAfter > 3, 'Firebolts only after the swap (' + fbAfter + ')');
    var casts = function (sp, after) { return log.filter(function (e) { return e.type === 'cast' && e.spell === sp && (after ? e.t > ts + 1e-9 : e.t < ts); }).length; };
    T.ok(casts('shadowBolt', true) === 0 && casts('searingPain', true) > 5 && casts('shadowBolt', false) > 10,
      'Shadow Bolt before, Searing Pain after (' + casts('shadowBolt', false) + ' / ' + casts('searingPain', true) + ')');

    T.group('multipliers switch with the swap');
    // Immolate's DoT is Fire: before the swap (Imp sacrificed = +15% Shadow, Succubus out = Master Demonologist Shadow)
    // no Fire bonus; after it Succubus sacrificed +15% Fire and Imp out +10% Fire → every non-crit tick × 1.15 × 1.10.
    var ticks = log.filter(function (e) { return e.type === 'tick' && e.spell === 'immolate' && !e.crit; });
    var pre = ticks.filter(function (e) { return e.t < ts; }).map(function (e) { return e.dmg; }), post = ticks.filter(function (e) { return e.t > ts; }).map(function (e) { return e.dmg; });
    var avg = function (a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; };
    T.ok(pre.length > 3 && post.length > 3, 'Immolate ticks on both sides (' + pre.length + ' / ' + post.length + ')');
    T.near(avg(post) / avg(pre), 1.15 * 1.10, 0.01, 'Immolate tick after / before = 1.265 (' + (avg(post) / avg(pre)).toFixed(4) + ')');

    T.group('no swap without the talents or before execute');
    var ns = WL.simulateOnce(noFd, 'human', cfg, { seed: 7, duration: dur, log: true });
    T.ok(ns.swapAt == null && !ns.log.some(function (e) { return e.spell === 'demonicSacrifice'; }), 'no Fel Domination → no swap (the action just never fires)');
    T.ok(ns.bySpell['pet:melee'].casts > r.bySpell['pet:melee'].casts, 'and the Succubus keeps fighting the whole fight (' + ns.bySpell['pet:melee'].casts + ' swings)');
  });
})();
