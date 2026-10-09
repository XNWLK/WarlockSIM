// Round 133 tests (user): Molten Skin and Soul Link also reduce what the Demonic Rune and the Goblin Sapper Charge do to
// you — the same factor as for Hellfire (round 132): −2% per Molten Skin point, −30% with Soul Link while a demon is out,
// the two multiplied. Life Tap is not reduced.
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
  var MS5 = { moltenSkin: 5 }, SL = { demonicSacrifice: 1, soulLink: 1 }, BOTH = { demonicSacrifice: 1, soulLink: 1, moltenSkin: 5 };
  function tb(talents, pet, sac) { return { key: 't133', short: 't', name: 't', notes: '', talents: talents || {}, pet: pet || null, sacrifice: sac || null, oil: 'none', rotation: ['shadowBolt'] }; }
  function run(b, c, dur) { return WL.simulateOnce(b, 'human', c, { seed: 1, duration: dur || 60, log: true }); }
  var runeCfg = det(function (c) { c.consumables.demonicRune.on = true; });
  var sapCfg = det(function (c) { c.professions.engineering = true; c.consumables.goblinSapper.on = true; });
  function rune(t, pet, sac) { var r = run(tb(t, pet, sac), runeCfg); return { lost: r.health.self, used: r.log.filter(function (e) { return e.type === 'consumable'; }).length, mana: r.manaFromConsumables }; }
  function sap(t, pet, sac) { var r = run(tb(t, pet, sac), sapCfg), x = r.bySpell['item:goblinSapper'] || { casts: 0, dmg: 0 }; return { lost: r.health.self, used: x.casts, dmg: x.dmg, r: r }; }

  T.run('round 133: Molten Skin and Soul Link reduce the Demonic Rune and the Goblin Sapper too', function () {
    T.group('Demonic Rune (800 health)');
    var r0 = rune();
    T.eq(r0.used + ' × ' + r0.lost, '1 × 800', 'no talents: one rune, 800 health, as before');
    T.eq(rune(MS5).lost, 720, 'Molten Skin 5 / 5: 720 (−10%)');
    T.eq(rune({ moltenSkin: 2 }).lost, 768, 'Molten Skin 2 / 5: 768 (−4%)');
    T.eq(rune(SL, 'imp').lost, 560, 'Soul Link with a demon out: 560 (−30%)');
    T.eq(rune(SL, null, 'succubus').lost, 800, 'Soul Link, demon sacrificed: 800');
    T.eq(rune(SL).lost, 800, 'Soul Link, no demon: 800');
    T.eq(rune(BOTH, 'imp').lost, 504, 'both: 504 (× 0.90 × 0.70, the two multiply)');
    T.eq(rune(BOTH, 'imp').mana, r0.mana, 'the mana it gives is the same (' + r0.mana + ')');

    T.group('Goblin Sapper Charge (375–625 to you, 500 on average)');
    var s0 = sap();
    T.eq(s0.used + ' × ' + s0.lost, '1 × 500', 'no talents: one Sapper, 500 health, as before');
    T.eq(sap(MS5).lost, 450, 'Molten Skin 5 / 5: 450');
    T.eq(sap(SL, 'imp').lost, 350, 'Soul Link with a demon out: 350');
    T.eq(sap(SL, null, 'succubus').lost, 500, 'Soul Link, demon sacrificed: 500');
    T.eq(sap(BOTH, 'imp').lost, 315, 'both: 315 (500 × 0.63)');
    T.eq(sap(MS5).dmg, s0.dmg, 'its damage to the boss is the same with Molten Skin (' + Math.round(s0.dmg) + ')');

    T.group('"enough health?" follows the reduced amount');
    // A rune needs more health than it costs; a Sapper more than its biggest hit to you (625, or 394 with both talents).
    var low = function (cfg, sta, t, pet) {
      var b = tb(t, pet), c = JSON.parse(JSON.stringify(cfg)); c.gear.sta = sta;         // sheet Stamina far down: very little health
      return { max: WL.computeStats(b, 'human', c).maxHealth, lost: run(b, c).health.self };
    };
    var l0 = low(runeCfg, -120), lB = low(runeCfg, -120, BOTH, 'imp');
    T.eq(l0.max + ' / ' + lB.max, '684 / 684', 'test setup: 684 health with and without the talents');
    T.eq(l0.lost + ' / ' + lB.lost, '0 / 504', 'with 684 health: no rune without the talents (it costs 800), a rune with both (504)');
    var p0 = low(sapCfg, -130), pB = low(sapCfg, -130, BOTH, 'imp');
    T.eq(p0.max + ' / ' + pB.max, '584 / 584', 'test setup: 584 health');
    T.eq(p0.lost + ' / ' + pB.lost, '0 / 315', 'with 584 health: no Sapper without the talents (it can hit you for 625), one with both (at most 394)');

    T.group('Life Tap is not reduced');
    var t0 = run(tb(), det(), 120), tB = run(tb(BOTH, 'imp'), det(), 120);
    T.ok(t0.lifeTaps > 0 && tB.lifeTaps > 0 && t0.health.tap / t0.lifeTaps === 430 && tB.health.tap / tB.lifeTaps === 430, 'Life Tap costs 430 health with and without both talents (' + t0.lifeTaps + ' / ' + tB.lifeTaps + ' taps)');
  });
})();
