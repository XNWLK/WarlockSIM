// Round 38 (second request): Judgement of Wisdom on the boss (A64) — landed spells you cast at the boss and landed pet
// attacks have a 50% chance to restore 59 mana to the attacker.
(function () {
  function cfgJ(on) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.debuffs.judgementOfWisdom.on = on;
    return c;
  }
  T.run('Judgement of Wisdom (round 38)', function () {
    T.group('data');
    var d = WL.DEFAULT_CONFIG.debuffs.judgementOfWisdom;
    T.ok(d && d.id === 20355 && d.jow.mana === 59 && d.jow.chancePct === 50 && WL.SHIPPED_ON.debuffs.judgementOfWisdom === true, 'debuff 20355: 59 mana, 50% (guess), on by default since round 60 (user; off before)');
    T.ok(/restoring 59 of the attacker/.test(WL.SPELL_TEXT[20355] || ''), 'tooltip text (live Wowhead)');

    T.group('your mana');
    var top = WL.BUILDS.filter(function (b) { return b.key === 'demo_pact_fire'; })[0];
    var off = WL.simulateOnce(top, 'human', cfgJ(false), { seed: 4, duration: 150, log: true });
    var on = WL.simulateOnce(top, 'human', cfgJ(true), { seed: 4, duration: 150, log: true });
    T.ok(!off.manaFromJow && !off.log.some(function (e) { return e.spell === 'Judgement of Wisdom'; }), 'off: no mana from it');
    var gains = on.log.filter(function (e) { return e.type === 'mana' && e.spell === 'Judgement of Wisdom'; });
    T.ok(gains.length > 5 && gains.every(function (e) { return e.gain <= 59; }), 'on: ' + gains.length + ' procs of up to 59 mana (' + Math.round(on.manaFromJow) + ' mana)');
    T.ok(on.lifeTaps < off.lifeTaps, 'fewer Life Taps (' + off.lifeTaps + ' → ' + on.lifeTaps + ')');
    // DPS: averaged over 200 fights — a single fight can go either way (the Life Taps move, round 105)
    var aOff = WL.simulate(top, 'human', cfgJ(false), { iterations: 200, log: false }), aOn = WL.simulate(top, 'human', cfgJ(true), { iterations: 200, log: false });
    T.ok(aOn.dps > aOff.dps && aOn.lifeTaps < aOff.lifeTaps, 'more DPS on average over 200 fights (' + aOff.dps.toFixed(1) + ' → ' + aOn.dps.toFixed(1) + ', Life Taps ' + aOff.lifeTaps.toFixed(1) + ' → ' + aOn.lifeTaps.toFixed(1) + ')');
    // procs only right after a landed spell at the boss (hit / apply / debuff / channel cast), never after a tick or Life Tap
    var bad = gains.filter(function (e) {
      var i = on.log.indexOf(e), p = on.log[i - 1];
      return !p || p.t !== e.t || p.type === 'tick' || (p.type === 'cast' && p.spell === 'lifeTap');
    });
    T.eq(bad.length, 0, 'every proc follows a landed spell at the same instant (none after ticks or Life Tap)');

    T.group('rate: 50% of landed spells at the boss');
    // Mana is capped, so a proc at full mana gains 0 but still counts: count proc entries, over 40 fights.
    var procs = 0, landed = 0;
    for (var sd = 1; sd <= 40; sd++) {
      var f = WL.simulateOnce(top, 'human', cfgJ(true), { seed: sd, duration: 150, log: true });
      procs += f.log.filter(function (e) { return e.spell === 'Judgement of Wisdom'; }).length;
      Object.keys(f.bySpell).forEach(function (k) { var s = WL.SPELLS[k]; if (s && k !== 'lifeTap' && k !== 'baneOfHavoc') landed += f.bySpell[k].landed; });
    }
    T.near(procs / landed, 0.5, 0.03, procs + ' procs / ' + landed + ' landed spells at the boss = ' + (100 * procs / landed).toFixed(1) + '%');

    T.group('pet mana');
    T.ok(on.petManaFromJow > 0 && !off.petManaFromJow, 'the Imp gains mana from its own Firebolts (' + Math.round(on.petManaFromJow || 0) + ')');
    T.ok(on.bySpell['pet:firebolt'].hits >= off.bySpell['pet:firebolt'].hits, 'at least as many Firebolts (' + off.bySpell['pet:firebolt'].hits + ' → ' + on.bySpell['pet:firebolt'].hits + ')');

    T.group('own random stream: nothing else moves until the first mana difference');
    // Up to the first proc the two fights must be event-for-event identical (hits, crits, damage).
    var firstProc = gains[0].t, a = off.log.filter(function (e) { return e.t < firstProc; }), b = on.log.filter(function (e) { return e.t < firstProc && e.spell !== 'Judgement of Wisdom'; });
    T.eq(JSON.stringify(b.map(function (e) { return [e.t, e.type, e.spell, e.dmg, e.crit]; })), JSON.stringify(a.map(function (e) { return [e.t, e.type, e.spell, e.dmg, e.crit]; })),
      'the ' + a.length + ' events before the first proc (' + firstProc + ' s) are identical with and without it');
  });
})();
