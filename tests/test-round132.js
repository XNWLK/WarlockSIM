// Round 132 tests (user): Molten Skin and Soul Link reduce the damage you take from your own Hellfire. Molten Skin: 2% per
// point. Soul Link: 30% of the damage goes to your demon, only while a demon is out. The two multiply. Nothing else that
// costs health changed in that round, and Hellfire's damage to the boss does not change. Round 133 (user): the Demonic
// Rune and the Goblin Sapper are reduced too (tests/test-round133.js); Life Tap is not.
(function () {
  function det(mod) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = -100; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'pull'; c.options.dotEndCheck = false; c.fight.healAmount = 0;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    if (mod) mod(c);
    return c;
  }
  function tb(talents, pet, sac, rot) { return { key: 't132', short: 't', name: 't', notes: '', talents: talents || {}, pet: pet || null, sacrifice: sac || null, oil: 'none', rotation: rot || ['hellfire'] }; }
  function run(b, c, dur) { return WL.simulateOnce(b, 'human', c || det(), { seed: 1, duration: dur || 16, log: true }); }
  function ticks(r) { return r.log.filter(function (e) { return e.type === 'tick' && e.spell === 'hellfire'; }).length; }
  function dmg(r) { return (r.bySpell.hellfire || { dmg: 0 }).dmg; }
  // one whole channel in a 16 s fight: what each tick does to you (Soul Link's +3% damage does not touch it: no damage talents)
  function self(b, c) { var r = run(b, c); return { r: r, perTick: r.health.self / ticks(r), n: ticks(r) }; }
  function raw(b, c) { return 206 + 0.022 * WL.computeStats(b, 'human', c || det()).sp; }

  T.run('round 132: Molten Skin and Soul Link reduce Hellfire\'s damage to yourself', function () {
    T.group('the talent values');
    T.eq(WL.TALENT_BY_KEY.moltenSkin.v.dmgTakenPct.join(), '2,4,6,8,10', 'Molten Skin: 2 / 4 / 6 / 8 / 10% less damage taken');
    T.eq(WL.TALENT_BY_KEY.soulLink.v.toPetPct.join() + ' / ' + WL.TALENT_BY_KEY.soulLink.v.dmgPct.join(), '30 / 3', 'Soul Link: 30% of the damage to the demon; its +3% damage as before');
    T.ok(/30% of all damage taken/.test(WL.TALENT_TEXT.soulLink[0]) && /by 10%/.test(WL.TALENT_TEXT.moltenSkin[4]), 'both numbers are in the tooltips');

    T.group('Molten Skin');
    var b0 = tb(), s0 = self(b0), base = Math.round(raw(b0));
    T.eq(s0.n + ' × ' + s0.perTick, '15 × ' + base, 'no talents: 15 ticks of ' + base + ' to yourself (206 + 2.2% of spell power), as before');
    [1, 2, 3, 4, 5].forEach(function (p) {
      var s = self(tb({ moltenSkin: p }));
      T.eq(s.perTick, Math.round(raw(b0) * (1 - 0.02 * p)), p + ' / 5: ' + s.perTick + ' per tick (−' + 2 * p + '%)');
    });
    var s5 = self(tb({ moltenSkin: 5 }));
    T.eq(dmg(s5.r), dmg(s0.r), 'Hellfire\'s damage to the boss is the same with and without Molten Skin (' + Math.round(dmg(s0.r)) + ')');

    T.group('Soul Link: only while a demon is out');
    var SL = { demonicSacrifice: 1, soulLink: 1 };
    var bOut = tb(SL, 'imp'), sOut = self(bOut);
    T.eq(sOut.perTick, Math.round(raw(bOut) * 0.70), 'Imp out: ' + sOut.perTick + ' per tick (−30%)');
    var bVw = tb(SL, 'voidwalker'), sVw = self(bVw);
    T.eq(sVw.perTick, Math.round(raw(bVw) * 0.70), 'any demon: the same with a Voidwalker out');
    var bSac = tb(SL, null, 'succubus'), sSac = self(bSac);
    T.eq(sSac.perTick, Math.round(raw(bSac)), 'demon sacrificed: nothing (' + sSac.perTick + ' per tick)');
    var bNone = tb(SL), sNone = self(bNone);
    T.eq(sNone.perTick, Math.round(raw(bNone)), 'no demon at all: nothing');
    T.eq(self(tb({}, 'imp')).perTick, base, 'a demon out without the talent: nothing');
    T.ok(dmg(sOut.r) > dmg(s0.r) * 1.029 && dmg(sOut.r) < dmg(s0.r) * 1.031, 'to the boss Soul Link still adds its 3%, no more (' + (dmg(sOut.r) / dmg(s0.r)).toFixed(4) + ')');

    T.group('both together multiply');
    var bBoth = tb({ demonicSacrifice: 1, soulLink: 1, moltenSkin: 5 }, 'imp'), sBoth = self(bBoth);
    T.eq(sBoth.perTick, Math.round(raw(bBoth) * 0.90 * 0.70), 'Molten Skin 5 / 5 + Soul Link: ' + sBoth.perTick + ' per tick (× 0.90 × 0.70 = −37%, not −40%)');
    var hi = det(function (c) { c.gear.sp = 2000; }), sHi = self(bBoth, hi);
    T.eq(sHi.perTick, Math.round((206 + 0.022 * WL.computeStats(bBoth, 'human', hi).sp) * 0.63), 'the spell power part is reduced too (' + sHi.perTick + ' at 2,000 spell power)');

    T.group('what follows from it: more Hellfire on the same health');
    var some = det(function (c) { c.fight.healAmount = 500; c.fight.healEvery = 10; }), long0 = run(b0, some, 120), longB = run(bBoth, some, 120);
    T.ok(ticks(long0) > 15 && ticks(longB) > ticks(long0) * 1.3, 'healed for 500 every 10 s, 2 minutes: ' + ticks(long0) + ' Hellfire ticks without the talents, ' + ticks(longB) + ' with both', ticks(longB));
    T.ok(dmg(longB) > dmg(long0) * 1.3, 'so more damage to the boss (' + Math.round(dmg(long0)) + ' → ' + Math.round(dmg(longB)) + ')');
    T.ok(long0.health.min > 0 && longB.health.min > 0, 'and you still never drop to 0 (' + long0.health.min + ' / ' + longB.health.min + ' health left at the lowest)');

    T.group('nothing else changes');
    var tap = function (t) { var r = run(tb(t, t.soulLink ? 'imp' : null, null, ['shadowBolt']), det(), 120); return r.lifeTaps + ' taps / ' + r.health.tap; };
    T.eq(tap({ demonicSacrifice: 1, soulLink: 1, moltenSkin: 5 }).split(' / ')[1] / parseInt(tap({ demonicSacrifice: 1, soulLink: 1, moltenSkin: 5 }), 10), 430, 'Life Tap still costs 430 health with both talents (a cost, not damage)');
    var rune = function (t, pet) { return run(tb(t, pet, null, ['shadowBolt']), det(function (c) { c.consumables.demonicRune.on = true; }), 60).health.self; };
    T.eq(rune({}, null) + ' / ' + rune({}, 'imp'), '800 / 800', 'the Demonic Rune costs 800 without the talents (round 133: less with them)');
    T.eq(self(tb({ moltenSkin: 5 }, null, null, ['rainOfFire'])).r.health.self, 0, 'Rain of Fire does not hurt you, talents or not');
  });
})();
