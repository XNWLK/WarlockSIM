// Round 70 tests: the fight timeline ("super advanced" build editor, A73). Timeline spells are cast at their times, the
// priority fills gaps (only what ends in time; channels are clipped), recasts after a timeline miss and takes over after
// the end; mana → Life Tap first and the rest runs later; cooldowns wait; uncastable entries are skipped.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.fight.durationVarPct = 0;
    c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false; c.debuffs.judgementOfWisdom.on = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, tl, t) { return { key: 't70', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot, timeline: tl }; }
  function casts(r) { return r.log.filter(function (e) { return e.type === 'cast'; }); }
  function at(r, k) { return casts(r).filter(function (e) { return e.spell === k; }).map(function (e) { return +e.t.toFixed(2); }); }

  T.run('round 70: fight timeline', function () {
    T.group('timeline casts at their times; the priority fills only what fits');
    var c = det();
    var tl = [{ t: 0, k: 'corruption' }, { t: 5, k: 'immolate' }, { t: 9, k: 'shadowBolt' }, { t: 12, k: 'conflagrate' }, { t: 14, k: 'lifeTap' }];
    var r = WL.simulateOnce(tb(['immolate', 'corruption', 'shadowBolt', 'searingPain'], tl), 'human', c, { duration: 40, log: true, seed: 1 });
    var tlc = casts(r).filter(function (e) { return e.timeline; }).map(function (e) { return e.spell + '@' + e.t.toFixed(2); });
    T.eq(tlc.join(' '), 'corruption@0.00 immolate@5.00 shadowBolt@9.00', 'timeline casts at 0 / 5 / 9 s (marked "timeline" in the log)');
    T.ok(at(r, 'lifeTap').indexOf(14) >= 0, 'the timeline Life Tap at 14 s');
    T.ok(r.log.some(function (e) { return e.type === 'skip' && e.spell === 'conflagrate' && e.timeline; }), 'Conflagrate without the talent is skipped');
    var gap = casts(r).filter(function (e) { return !e.timeline && e.t > 0 && e.t < 14; });
    T.ok(gap.every(function (e) {
      var next = tl.filter(function (x) { return x.t > e.t + 1e-6; })[0], span = Math.max(e.castTime, e.gcd);
      return !next || e.t + span <= next.t + 1e-6;
    }), 'every priority cast in a gap ends before the next timeline spell (' + gap.map(function (e) { return e.spell + '@' + e.t.toFixed(1); }).join(', ') + ')');
    T.ok(gap.some(function (e) { return e.spell === 'searingPain'; }), 'a shorter spell further down the priority is used when the first choice does not fit');
    T.ok(casts(r).some(function (e) { return !e.timeline && e.t > 15; }), 'after the timeline the priority takes over');

    T.group('a missed timeline spell: the priority gets one turn (recasts it)');
    var cm = det(function (x) { x.combat.baseHitPct = 70; x.combat.maxHitPct = 100; });
    var found = null;
    for (var s = 1; s < 200 && !found; s++) {
      // packed timeline: no gap after the Immolate, so only the "priority turn" can fit the recast in
      var rm = WL.simulateOnce(tb(['immolate', 'shadowBolt'], [{ t: 0, k: 'immolate' }, { t: 2, k: 'shadowBolt' }, { t: 5, k: 'shadowBolt' }, { t: 8, k: 'shadowBolt' }]), 'human', cm, { duration: 20, log: true, seed: s });
      var first = rm.log.filter(function (e) { return e.spell === 'immolate' && (e.type === 'miss' || e.type === 'hit'); })[0];
      if (first && first.type === 'miss') found = rm;
    }
    T.ok(!!found, 'a fight where the timeline Immolate at 0 s misses');
    if (found) { var c2 = casts(found); T.eq(c2[1] && c2[1].spell + (c2[1].timeline ? ' (timeline)' : ''), 'immolate', 'the next cast is the priority\'s Immolate, before the timeline Shadow Bolt due at 2 s (at ' + (c2[1] && c2[1].t.toFixed(2)) + ' s)'); }

    T.group('mana: Life Tap first, the timeline runs later');
    var cl = det(function (x) { x.gear.int = 0; x.gear.sp = 0; Object.keys(x.buffs).forEach(function (k) { x.buffs[k].on = false; }); });
    var many = []; for (var i = 0; i < 20; i++) many.push({ t: i * 3, k: 'shadowBolt' });
    var rl = WL.simulateOnce(tb(['shadowBolt'], many), 'human', cl, { duration: 80, log: true, seed: 2 });
    var sb = casts(rl).filter(function (e) { return e.timeline && e.spell === 'shadowBolt'; });
    T.ok(rl.log.some(function (e) { return e.type === 'cast' && e.spell === 'lifeTap'; }), 'Life Taps happen when a timeline spell is short of mana');
    T.eq(sb.length, 20, 'every timeline Shadow Bolt is still cast');
    T.ok(sb.some(function (e, j) { return e.t > many[j].t + 1; }), 'later entries run later than scheduled (shifted by the taps)');

    T.group('cooldowns wait; channels');
    var cc = det();
    var rc = WL.simulateOnce(tb(['shadowBolt'], [{ t: 0, k: 'immolate' }, { t: 2, k: 'conflagrate' }, { t: 5, k: 'conflagrate' }], { conflagrate: 1, shadowAndFlame: 5 }), 'human', cc, { duration: 30, log: true, seed: 3 });
    var cf = at(rc, 'conflagrate');
    T.ok(cf.length >= 2 && cf[1] >= cf[0] + 10 - 1e-6, 'a second Conflagrate waits for its 10 s cooldown (' + cf.join(', ') + ')');
    var rch = WL.simulateOnce(tb(['drainLife'], [{ t: 0, k: 'corruption' }, { t: 6, k: 'shadowBolt' }]), 'human', cc, { duration: 20, log: true, seed: 4 });
    var sbt = at(rch, 'shadowBolt')[0];
    T.ok(rch.log.some(function (e) { return e.type === 'clip' && e.spell === 'drainLife' && e.for === 'timeline'; }) && sbt >= 6 && sbt <= 7 + 1e-6,
      'a priority channel in a gap is clipped for the timeline (Shadow Bolt at ' + sbt + ' s, ≤ 1 tick late)');
    var rtc = WL.simulateOnce(tb(['corruption', 'shadowBolt'], [{ t: 0, k: 'drainLife' }]), 'human', cc, { duration: 20, log: true, seed: 5 });
    T.eq(rtc.log.filter(function (e) { return e.type === 'clip'; }).length, 0, 'a timeline channel runs to its end (not clipped by the priority)');

    T.group('checks and build code');
    var b = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'sm_ruin_classic'; })[0]));
    b.timeline = [{ t: 0, k: 'curseOfElements' }, { t: 1, k: 'immolate' }, { t: 5, k: 'baneOfDoom' }, { t: 20, k: 'baneOfDoom' }, { t: 400, k: 'shadowBolt' }];
    var ch = WL.checkTimeline(b, WL.DEFAULT_CONFIG).map(function (x) { return x.msg; }).join(' | ');
    T.ok(/overlaps the previous spell/.test(ch), 'an overlap is reported');
    T.ok(/still on cooldown/.test(ch), 'a spell on cooldown is reported');
    T.ok(/after the fight/.test(ch), 'an entry after the fight is reported');
    b.timeline.push({ t: 50, k: 'conflagrate' });
    T.ok(WL.validateBuild(b).some(function (e) { return /Conflagrate talent/.test(e); }), 'a spell without its talent is refused');
    b.timeline.pop();
    T.eq(JSON.stringify(WL.decodeBuild(WL.encodeBuild(b)).timeline), JSON.stringify(b.timeline), 'the timeline survives a build-code round trip');
    T.eq(WL.decodeBuild(WL.encodeBuild(WL.BUILDS[0])).timeline, undefined, 'a build without a timeline has none after a round trip');
  });
})();
