// Round 125 tests (user): Tranquil Air Totem is the same totem type as Windfury and Grace of Air (none of the three stack);
// Tranquil Air Totem and Blessing of Salvation do not stack their threat reduction; Grace of Air Totem gives 89 Agility.
(function () {
  function det(on) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
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
  function names(on) { return WL.activeBuffs(det(on)).map(function (x) { return x.name; }).join(' + '); }
  function agi(on) { return WL.computeStats(b, 'human', det(on)).agi; }
  function extra(r) { return (r.bySpell['pet:windfury'] || { casts: 0 }).casts; }

  T.run('round 125: one air totem at a time; Tranquil Air / Salvation; Grace of Air 89', function () {
    var B = WL.DEFAULT_CONFIG.buffs;
    T.group('Grace of Air Totem');
    T.eq(B.graceOfAir.agi, 89, '89 Agility');
    T.ok(/by 89\./.test((WL.SPELL_TEXT || {})[B.graceOfAir.id] || ''), 'the same number as its tooltip text');
    T.near(agi(['graceOfAir']) - agi([]), 89, 1e-9, 'alone: +89 Agility');

    T.group('the three air totems share one slot');
    T.ok([B.windfuryTotem, B.graceOfAir, B.tranquilAir].every(function (x) { return WL.buffExcl(x).indexOf('airTotem') >= 0; }), 'Windfury, Grace of Air and Tranquil Air carry the same totem type');
    T.eq(names(['windfuryTotem', 'tranquilAir']), 'Windfury Totem', 'Windfury + Tranquil Air switched on: only Windfury counts');
    T.eq(names(['graceOfAir', 'tranquilAir']), 'Grace of Air Totem', 'Grace of Air + Tranquil Air: only Grace of Air counts');
    T.eq(names(['windfuryTotem', 'graceOfAir', 'tranquilAir']), 'Windfury Totem', 'all three: only Windfury counts');
    var r0 = run([]), rT = run(['tranquilAir']), rWT = run(['windfuryTotem', 'tranquilAir']), rW = run(['windfuryTotem']), rGT = run(['graceOfAir', 'tranquilAir']);
    T.near(ratio(r0), 1, 1e-9, 'no buffs: 1 threat per damage');
    T.near(ratio(rT), 0.80, 1e-9, 'Tranquil Air alone: −20% threat');
    T.ok(extra(rT) === 0, 'and no extra attacks');
    T.near(ratio(rWT), 1, 1e-9, 'Windfury + Tranquil Air: no threat reduction');
    T.ok(extra(rWT) > 0 && rWT.total === rW.total, 'but the extra attacks — the same fight as with Windfury alone');
    T.near(ratio(rGT), 1, 1e-9, 'Grace of Air + Tranquil Air: no threat reduction');
    T.near(agi(['graceOfAir', 'tranquilAir']) - agi([]), 89, 1e-9, 'but the Agility');

    T.group('Tranquil Air Totem and Blessing of Salvation do not stack');
    T.eq(B.blessingOfSalvation.group, B.tranquilAir.group, 'both carry the same group');
    T.near(ratio(run(['blessingOfSalvation'])), 0.70, 1e-9, 'Salvation alone: −30%');
    T.near(ratio(run(['blessingOfSalvation', 'tranquilAir'])), 0.70, 1e-9, 'both: −30%, not −44%');
    T.near(ratio(run(['tranquilAir', 'blessingOfSalvation', 'graceOfAir'])), 0.70, 1e-9, 'with Grace of Air as the air totem: Salvation still counts');
    var rWS = run(['windfuryTotem', 'blessingOfSalvation']);
    T.ok(Math.abs(ratio(rWS) - 0.70) < 1e-9 && extra(rWS) > 0, 'Windfury Totem and Salvation work together: −30% threat and extra attacks');
    var b5 = JSON.parse(JSON.stringify(b)); b5.talents = { suppression: 5 };
    var r5 = WL.simulateOnce(b5, 'human', det(['blessingOfSalvation', 'tranquilAir']), { seed: 4, duration: 120 });
    T.near(ratio(r5), 0.80 * 0.70, 1e-9, 'Suppression 5/5 still multiplies on top: × 0.80 × 0.70');

    T.group('icon');
    T.ok(/^data:image\/jpeg;base64,/.test(WL.ICONS.buff_windfuryTotem || ''), 'Windfury Totem has its picture');
  });
})();
