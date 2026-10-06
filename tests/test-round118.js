// Round 118 tests (user, to-do review): Wrack's +10% also on Siphon Life and Bane of Doom; Grace of Air Totem and the
// Scroll of Agility do not stack; level resistance is on and Curse of the Elements removes it; soul shards never run out.
(function () {
  function det(mod) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.options.dotEndCheck = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (mod) mod(c);
    return c;
  }
  function tb(rot, talents) { return { key: 't118', short: 't', name: 't', notes: '', talents: talents || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }

  T.run('round 118: Wrack on Doom / Siphon Life, agility buffs, level resistance, soul shards', function () {
    T.group('Wrack: +10% on Bane of Doom while it channels');
    var doom = function (rot) {
      var r = WL.simulateOnce(tb(rot, { wrack: 1 }), 'human', det(), { seed: 3, duration: 70, log: true });
      return r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0];
    };
    var dW = doom(['bane', 'wrack']), dS = doom(['bane', 'shadowBolt']);
    T.ok(dW && dS && Math.abs(dW.t - dS.t) < 1e-6, 'Bane of Doom explodes at ' + (dW ? dW.t.toFixed(1) : '?') + ' s in both fights');
    T.ok(Math.abs(dW.dmg - 1.10 * dS.dmg) <= 1, 'with Wrack channelling it deals × 1.10: ' + dW.dmg + ' vs ' + dS.dmg + ' with a Shadow Bolt filler');

    T.group('Grace of Air Totem + Scroll of Agility do not stack');
    var b0 = { talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: [] };
    var agi = function (on) { return WL.computeStats(b0, 'human', det(function (c) { on.forEach(function (k) { c.buffs[k].on = true; }); })).agi; };
    var base = agi([]);
    T.eq(WL.DEFAULT_CONFIG.buffs.graceOfAir.group, WL.DEFAULT_CONFIG.buffs.scrollOfAgility.group, 'both carry the same group');
    T.near(agi(['scrollOfAgility']) - base, 17, 1e-9, 'scroll alone: +17 Agility');
    T.near(agi(['graceOfAir']) - base, 77, 1e-9, 'totem alone: +77');
    T.near(agi(['graceOfAir', 'scrollOfAgility']) - base, 77, 1e-9, 'both: +77, not +94');
    T.near(agi(['graceOfAir', 'scrollOfAgility', 'markOfTheWild']) - base, 77 + 16, 1e-9, 'Mark of the Wild (no group) still adds: +93');
    var both = WL.computeStats(b0, 'human', det(function (c) { c.buffs.graceOfAir.on = c.buffs.scrollOfAgility.on = true; }));
    T.eq(both.breakdown.filter(function (x) { return x.stat === 'agi' && /Grace|Scroll/.test(x.source); }).map(function (x) { return x.source; }).join(','), 'Grace of Air Totem', 'the stat breakdown lists only the totem');

    T.group('level resistance: on, and Curse of the Elements removes it');
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    T.eq(WL.levelResist(D), 24, '+24 against a level-63 boss by default');
    T.eq(WL.effectiveResist(D, 0, 'shadow', false), 24, 'without the curse: 24 resistance');
    T.eq(WL.effectiveResist(D, 0, 'shadow', true), 0, 'with Curse of the Elements (−75): 0');
    T.eq(WL.effectiveResist(D, 10, 'fire', true), -10, 'Spell Pierce then goes below 0 (vulnerable damage)');
    var D100 = JSON.parse(JSON.stringify(D)); D100.combat.targetResist.shadow = 100;
    T.eq(WL.effectiveResist(D100, 0, 'shadow', true), 49, 'boss with 100 Shadow resistance: 100 + 24 − 75 = 49 under the curse');
    T.near(WL.resistProfile(D, 0, 'shadow', false).mean, -0.75 * 24 / 300, 1e-12, 'average loss without the curse: 0.75 × 24 / 300 = 6%');
    T.eq(WL.resistProfile(D, 0, 'shadow', true).mean, 0, 'none with it');
    var Doff = JSON.parse(JSON.stringify(D)); Doff.combat.levelResist.on = false;
    T.eq(WL.effectiveResist(Doff, 0, 'shadow', false), 0, 'switched off (Fight & pets → Advanced): 0 without the curse too');
    // in a fight: partial resists only before the curse is on the boss
    var cf = det(function (c) { c.options.useCurseOfElements = true; c.combat.levelResist.on = true; });
    var before = 0, after = 0, hitsAfter = 0;
    for (var seed = 1; seed <= 30; seed++) {
      var r = WL.simulateOnce(tb(['curseOfElements', 'shadowBolt']), 'human', cf, { seed: seed, duration: 40, log: true }), on = false;
      r.log.forEach(function (e) {
        if (e.type === 'debuff' && e.spell === 'curseOfElements') on = true;
        if (e.type !== 'hit' || e.spell !== 'shadowBolt') return;
        if (on) { hitsAfter++; if (e.resistPct) after++; } else if (e.resistPct) before++;
      });
    }
    T.ok(hitsAfter > 100 && after === 0, 'no Shadow Bolt is resisted once the curse is up (' + hitsAfter + ' hits in 30 fights)');
    var cn = det(function (c) { c.combat.levelResist.on = true; }), resisted = 0, hits = 0;
    for (var s2 = 1; s2 <= 30; s2++) WL.simulateOnce(tb(['shadowBolt']), 'human', cn, { seed: s2, duration: 40, log: true }).log.forEach(function (e) {
      if (e.type === 'hit' && e.spell === 'shadowBolt') { hits++; if (e.resistPct) resisted++; } });
    T.ok(resisted > 0.1 * hits && resisted < 0.35 * hits, 'without the curse some hits are partly resisted (' + resisted + ' of ' + hits + ')');

    T.group('soul shards never run out');
    var rs = WL.simulateOnce(tb(['shadowburn', 'shadowBolt'], { shadowburn: 1 }), 'human', det(), { seed: 1, duration: 600, log: true });
    var nSb = rs.log.filter(function (e) { return e.type === 'cast' && e.spell === 'shadowburn'; }).length;
    T.ok(nSb > 30, nSb + ' Shadowburns in a 10-minute fight (30 shards were the limit before)');
    T.ok(!('startingShards' in WL.DEFAULT_CONFIG.fight), 'the setting fight.startingShards is gone');
    var old = WL.settingsSnapshot(JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG))); old.fight = JSON.parse(JSON.stringify(old.fight)); old.fight.startingShards = 30;
    var unknown = WL.applySettings(JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), old);
    T.eq(unknown.join(','), '', 'a settings code from before still loads without a notice');
  });
})();
