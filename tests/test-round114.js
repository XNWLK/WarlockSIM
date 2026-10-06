// Round 114 tests (user): the 5-second rule. Spirit regenerates mana only while no mana was spent for 5 seconds
// (combat.fsrSeconds); a cast-time spell spends when its cast completes, instants and channels when they start; Life Tap
// does not restart the 5 seconds; no Spirit regeneration on top of Innervate.
// Round 117 (user): no Spirit regeneration while a channel runs (drains, Wrack); the 5 s still count from the start of the
// channel, so a Life Tap right after a 5 s Drain Life regenerates.
(function () {
  function det() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull';
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    return c;
  }
  function tb(rot, talents, params) { var b = { key: 't114', short: 't', name: 't', notes: '', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; if (params) b.params = params; return b; }
  var DUR = 60;
  function run(b, c) { return WL.simulateOnce(b, 'human', c, { seed: 1, duration: DUR, log: true }); }
  // When mana was spent, read from the log: cast-time spells at the end of the cast (atEnd) or at its start, instants and
  // channels at their start. Life Tap and other free casts are not in the list.
  function spends(r, atEnd) {
    return r.log.filter(function (e) { return e.type === 'cast' && WL.SPELLS[e.spell] && WL.SPELLS[e.spell].cost > 0; })
      .map(function (e) { return e.t + (atEnd && !e.channel ? e.castTime : 0); });
  }
  // Seconds of the fight that lie more than 5 s after the last spend (nothing before the first spend), minus the time
  // inside `skip` — one [a, b] or a list of them that do not overlap each other (Innervate, channels).
  function outside(sp, skip) {
    var out = 0, cuts = !skip ? [] : typeof skip[0] === 'number' ? [skip] : skip;
    sp.forEach(function (t, i) {
      var a = t + 5, b = i + 1 < sp.length ? sp[i + 1] : DUR;
      if (b <= a) return;
      out += b - a;
      cuts.forEach(function (c) { out -= Math.max(0, Math.min(b, c[1]) - Math.max(a, c[0])); });
    });
    return out;
  }
  // When the player was channelling, from the log (no clips or pushback in these fights).
  function channels(r) { return r.log.filter(function (e) { return e.type === 'cast' && e.channel; }).map(function (e) { return [e.t, Math.min(DUR, e.t + e.channel)]; }); }
  function rate(r) { return (WL.DEFAULT_CONFIG.combat.spiritRegenBase + WL.DEFAULT_CONFIG.combat.spiritRegenPerSpi * r.stats.spi) / 2; }

  T.run('round 114: 5-second rule', function () {
    T.group('setting');
    T.eq(WL.DEFAULT_CONFIG.combat.fsrSeconds, 5, 'combat.fsrSeconds = 5');
    T.eq(WL.DEFAULT_CONFIG.combat.spiritRegenBase + '/' + WL.DEFAULT_CONFIG.combat.spiritRegenPerSpi, '8/0.25', 'Spirit regeneration: 8 + Spirit / 4 per 2 s (the Innervate formula)');

    T.group('casting without a pause: never outside the 5 seconds');
    var c0 = det(), r0 = run(tb(['shadowBolt']), c0);
    r0.stats = WL.computeStats(tb(['shadowBolt']), 'human', c0);
    var gaps0 = spends(r0, true).map(function (t, i, a) { return i ? t - a[i - 1] : 0; });
    T.ok(Math.max.apply(null, gaps0) < 5, 'Shadow Bolt spam (Life Taps in between): longest gap between two spends ' + Math.max.apply(null, gaps0).toFixed(2) + ' s');
    T.near(r0.fsrOutTime, outside(spends(r0, true)), 1e-6, 'time outside the rule = what the log says (' + r0.fsrOutTime.toFixed(2) + ' s)');

    T.group('a pause longer than 5 s: Spirit regenerates for the rest of it');
    var cm = det(); cm.fight.moveEvery = 20; cm.fight.moveDuration = 9; cm.fight.lifeTapWhileMoving = false;
    var bm = tb(['shadowBolt']), rm = run(bm, cm); rm.stats = WL.computeStats(bm, 'human', cm);
    var endV = outside(spends(rm, true)), startV = outside(spends(rm, false));
    T.ok(endV > 3, 'movement 9 s every 20 s, Shadow Bolt only: ' + endV.toFixed(2) + ' s outside the rule');
    T.near(rm.fsrOutTime, endV, 1e-6, 'the 5 s count from the END of a cast (cast-time spells spend their mana then)');
    // One pause looked at closely: P = the last Shadow Bolt before the first movement phase, X = the first one after it.
    // Nothing is cast in between, so the mana X starts with = P's mana + the Spirit regeneration up to that moment.
    var castsM = rm.log.filter(function (e) { return e.type === 'cast'; }), xi = castsM.map(function (e) { return e.t >= 29 - 1e-9; }).indexOf(true), P = castsM[xi - 1], X = castsM[xi];
    var costSB = WL.buildSpellTable(bm, rm.stats, cm).shadowBolt.cost, gained = X.mana + costSB - P.mana;
    T.ok(P.spell === 'shadowBolt' && X.spell === 'shadowBolt' && X.t - P.t > 8, 'pause: Shadow Bolt at ' + P.t.toFixed(1) + ' s (' + P.castTime.toFixed(1) + ' s cast), the next one at ' + X.t.toFixed(1) + ' s');
    T.near(gained, rate(rm) * (X.t - (P.t + P.castTime) - 5), 1, 'mana regenerated by then = rate × (pause − 5 s after the cast ENDED) = ' + gained.toFixed(0));
    T.ok(Math.abs(gained - rate(rm) * (X.t - P.t - 5)) > 20, 'not 5 s after the cast started (that would be ' + (rate(rm) * (X.t - P.t - 5)).toFixed(0) + ')');
    T.near(rm.manaFromSpirit, rate(rm) * rm.fsrOutTime, 1e-6, 'mana gained = (8 + Spirit / 4) / 2 per second × that time = ' + rm.manaFromSpirit.toFixed(1) + ' (Spirit ' + rm.stats.spi.toFixed(0) + ')');
    var cOff = det(); cOff.fight.moveEvery = 20; cOff.fight.moveDuration = 9; cOff.combat.fsrSeconds = 0;
    var rOff = run(bm, cOff);
    T.eq(rOff.manaFromSpirit, 0, 'fsrSeconds 0: no Spirit regeneration in combat (the rule before round 114)');

    T.group('Life Tap does not restart the 5 seconds (user)');
    // Two Life Taps placed late in the first pause with the fight timeline (26.5 s and 28 s; the last spend was at 20 s).
    var cl = det(); cl.fight.moveEvery = 20; cl.fight.moveDuration = 9; cl.fight.lifeTapWhileMoving = false;
    var bl = tb(['shadowBolt']); bl.timeline = [{ t: 26.5, k: 'lifeTap' }, { t: 28, k: 'lifeTap' }];
    var rl = run(bl, cl); rl.stats = WL.computeStats(bl, 'human', cl);
    var sp = spends(rl, true), inGap = 0;
    rl.log.forEach(function (e) {
      if (e.type !== 'cast' || e.spell !== 'lifeTap') return;
      var prev = sp.filter(function (t) { return t <= e.t + 1e-9; }).pop();
      if (prev != null && e.t > prev + 5) inGap++;
    });
    T.ok(inGap >= 2, inGap + ' Life Tap(s) cast more than 5 s after the last spend, while Spirit was regenerating');
    T.near(rl.fsrOutTime, outside(sp), 1e-6, 'the time outside the rule ignores them: ' + rl.fsrOutTime.toFixed(2) + ' s, counted from the spells only');
    T.near(rl.fsrOutTime, rm.fsrOutTime, 1e-6, 'the same as without the two Life Taps (' + rm.fsrOutTime.toFixed(2) + ' s)');
    T.near(rl.manaFromSpirit, rate(rl) * rl.fsrOutTime, 1e-6, 'and the mana matches: ' + rl.manaFromSpirit.toFixed(1));

    T.group('channels (round 117, user): no Spirit regeneration while channelling; the 5 s count from the channel\'s start');
    var cw = det(), bw = tb(['wrack'], { wrack: 1 }), rw = run(bw, cw);
    var nW = rw.log.filter(function (e) { return e.type === 'cast' && e.spell === 'wrack'; }).length;
    T.ok(nW >= 9 && outside(spends(rw, true)) > 8, 'Wrack only: ' + nW + ' channels of 6 s — by the clock alone ' + outside(spends(rw, true)).toFixed(1) + ' s would lie more than 5 s after a spend');
    T.eq(rw.fsrOutTime, 0, 'but all of it is channel time: no Spirit regeneration at all');
    T.eq(rw.manaFromSpirit, 0, 'and no mana from Spirit');
    var rd = run(tb(['drainLife']), det());
    T.eq(rd.fsrOutTime, 0, 'Drain Life only (5 s channels back to back): none either');
    // A Life Tap right after a channel (placed with the fight timeline): the channel started 5 s / 6 s ago, so the rule's
    // 5 s are over and the Life Tap's global cooldown regenerates — until the next channel spends mana again. After the
    // fifth Drain Life, so that the Life Tap does not fill the mana bar (regeneration stops at full mana).
    var bd = tb(['drainLife']); bd.timeline = [{ t: 25, k: 'lifeTap' }];
    var rdl = run(bd, det()); rdl.stats = WL.computeStats(bd, 'human', det());
    var tapD = rdl.log.filter(function (e) { return e.type === 'cast' && e.spell === 'lifeTap'; })[0], nextD = rdl.log.filter(function (e) { return e.type === 'cast' && e.spell === 'drainLife' && e.t > 25; })[0];
    T.ok(tapD && Math.abs(tapD.t - 25) < 1e-6 && nextD && nextD.t > 26, 'Drain Life 20–25 s, Life Tap at ' + (tapD ? tapD.t.toFixed(1) : '?') + ' s, next Drain Life at ' + (nextD ? nextD.t.toFixed(1) : '?') + ' s');
    T.near(rdl.fsrOutTime, nextD.t - 25, 1e-6, 'Spirit regenerates during that Life Tap: ' + rdl.fsrOutTime.toFixed(2) + ' s (user: "it\'ll apply after a 5 second drain if you life tap")');
    T.near(rdl.fsrOutTime, outside(spends(rdl, true), channels(rdl)), 1e-6, '= the time more than 5 s after a spend that is not channel time');
    T.near(rdl.manaFromSpirit, rate(rdl) * rdl.fsrOutTime, 1e-6, 'mana gained: ' + rdl.manaFromSpirit.toFixed(1));
    var bwl = tb(['wrack'], { wrack: 1 }); bwl.timeline = [{ t: 6, k: 'lifeTap' }];
    var rwl = run(bwl, det()), nextW = rwl.log.filter(function (e) { return e.type === 'cast' && e.spell === 'wrack' && e.t > 6; })[0];
    T.near(rwl.fsrOutTime, nextW.t - 6, 1e-6, 'Wrack 0–6 s, Life Tap at 6 s: ' + rwl.fsrOutTime.toFixed(2) + ' s — the Life Tap only, not the sixth second of the channel');
    T.near(rwl.fsrOutTime, outside(spends(rwl, true), channels(rwl)), 1e-6, 'again the log\'s count without channel time');

    T.group('Innervate: no Spirit regeneration on top of it');
    var ci = det(); ci.buffs.innervate.on = true; ci.fight.moveEvery = 20; ci.fight.moveDuration = 9;
    var ri = run(bm, ci), inn = ri.log.filter(function (e) { return e.type === 'buff' && e.spell === ci.buffs.innervate.name; })[0];
    T.ok(!!inn, 'Innervate was used (at ' + (inn ? inn.t.toFixed(1) : '?') + ' s)');
    if (inn) {
      var withSkip = outside(spends(ri, true), [inn.t, inn.t + ci.buffs.innervate.innervate.duration]), plain = outside(spends(ri, true));
      T.ok(plain - withSkip > 0.5, 'its 20 s overlap a pause (' + (plain - withSkip).toFixed(2) + ' s that would otherwise regenerate)');
      T.near(ri.fsrOutTime, withSkip, 1e-6, 'those seconds are left out: ' + ri.fsrOutTime.toFixed(2) + ' s');
    }

    T.group('in the results');
    var cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    var a = WL.simulate(WL.findBuild('wrack_succubus'), 'human', cfg, { iterations: 100, log: false });
    var b = WL.simulate(WL.findBuild('demo_pact_succ_sb'), 'human', cfg, { iterations: 100, log: false });
    T.ok(a.mana.spiritRegenAvg >= 0 && b.mana.spiritRegenAvg >= 0 && a.mana.spiritRegenAvg + b.mana.spiritRegenAvg > 0, 'mana from Spirit per fight is reported: Wrack Succubus ' + a.mana.spiritRegenAvg.toFixed(0) + ', Demo Pact Shadow Bolt Succubus ' + b.mana.spiritRegenAvg.toFixed(0));
    T.ok(a.mana.fsrOutSecAvg >= 0 && a.mana.fsrOutSecAvg < 0.2 * cfg.fight.duration && b.mana.fsrOutSecAvg < 0.2 * cfg.fight.duration, 'and the seconds it ran (' + a.mana.fsrOutSecAvg.toFixed(1) + ' s / ' + b.mana.fsrOutSecAvg.toFixed(1) + ' s)');
  });
})();
