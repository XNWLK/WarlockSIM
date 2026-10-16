// Round 125 tests (user): Grace of Air Totem gave 89 Agility (gone in round 152); threat reductions multiply with Suppression. (Rounds
// 125–148 also: Tranquil Air / Windfury / Grace of Air one totem type, Tranquil Air and Salvation not stacking — the two
// totems were removed in round 149.)
(function () {
  function det(on) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.critPct -= 2;
    c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    (on || []).forEach(function (k) { c.buffs[k].on = true; });
    return c;
  }
  var b = { key: 't125', short: 't', name: 't', notes: '', talents: {}, pet: 'succubus', sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
  function run(on) { return WL.simulateOnce(b, 'human', det(on), { seed: 4, duration: 120 }); }
  function ratio(r) {                                               // your threat per point of your own damage
    var mine = 0; Object.keys(r.bySpell).forEach(function (k) { if (k.indexOf('pet:') !== 0) mine += r.bySpell[k].dmg; });
    return r.threat / mine;
  }

  T.run('round 125: Salvation with Suppression', function () {
    T.group('Salvation');
    T.near(ratio(run([])), 1, 1e-9, 'no buffs: 1 threat per damage');
    T.near(ratio(run(['blessingOfSalvation'])), 0.70, 1e-9, 'Salvation: −30%');
    var b5 = JSON.parse(JSON.stringify(b)); b5.talents = { suppression: 5 };
    var r5 = WL.simulateOnce(b5, 'human', det(['blessingOfSalvation']), { seed: 4, duration: 120 });
    T.near(ratio(r5), 0.80 * 0.70, 1e-9, 'Suppression 5/5 still multiplies on top: × 0.80 × 0.70');
  });
})();
