// Round 93 tests (user): the cooldown timeline keeps one list of times per item (racial, pi, and each consumable's own
// key), so every cooldown can have a permanent row with its own checkbox. The round 92 slot names (potion / rune / sapper /
// explosive) are still read. [A77]
(function () {
  function det(tl, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'custom'; c.options.activesTimeline = tl;
    if (f) f(c);
    return c;
  }
  function tb(rot) { return { key: 't93', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function used(r, re) { return r.log.filter(function (e) { return (e.type === 'consumable' || e.type === 'cast') && re.test(e.spell); }).map(function (e) { return e.t; }); }
  function near(t, want, slack) { return t != null && t >= want - 1e-6 && t <= want + slack; }

  T.run('round 93: one timeline list per cooldown', function () {
    T.group('WL.activesTimelineOf');
    var c = det({ potion: [40], rune: [9], sapper: [1], explosive: [20], racial: ['30', -1, 'x'], pi: [] });
    T.eq(JSON.stringify(WL.activesTimelineOf(c)), '{"majorSpellblasting":[40],"demonicRune":[9],"goblinSapper":[1],"denseDynamite":[20],"racial":[30]}',
      'round 92 names → item keys (nothing ticked: Spellblasting potion, Dense Dynamite); junk dropped');
    var c2 = det({ potion: [40], explosive: [20], majorManaPotion: [5] }, function (x) { x.consumables.majorManaPotion.on = true; x.consumables.thoriumGrenade.on = true; });
    T.eq(JSON.stringify(WL.activesTimelineOf(c2)), '{"majorManaPotion":[5],"thoriumGrenade":[20]}', 'the ticked potion / explosive gets the old slot; a list under the item\'s own key wins');

    T.group('each item uses its own times');
    var cfg = det({ majorSpellblasting: [70], majorManaPotion: [30], thoriumGrenade: [25], denseDynamite: [90] }, function (x) {
      x.consumables.majorManaPotion.on = true; x.professions.engineering = true; x.consumables.thoriumGrenade.on = true;
    });
    var r = WL.simulateOnce(tb(['shadowBolt']), 'human', cfg, { seed: 1, duration: 200, log: true });
    T.ok(near(used(r, /Mana Potion/)[0], 30, 3.1), 'Major Mana Potion (ticked) at its own time, 30 s → ' + used(r, /Mana Potion/)[0] + ' s — not at the Spellblasting row\'s 70 s');
    T.ok(near(used(r, /thoriumGrenade/)[0], 25, 3.1), 'Thorium Grenade (ticked) at 25 s → ' + used(r, /thoriumGrenade/)[0] + ' s — not at the Dense Dynamite row\'s 90 s');
    T.eq(used(r, /Spellblasting|denseDynamite/).length, 0, 'the unticked rows (Spellblasting potion, Dense Dynamite) are not used at all');
    cfg.consumables.majorManaPotion.on = false; cfg.consumables.majorSpellblasting.on = true;
    var r2 = WL.simulateOnce(tb(['shadowBolt']), 'human', cfg, { seed: 1, duration: 200, log: true });
    T.ok(near(used(r2, /Spellblasting/)[0], 70, 3.1) && used(r2, /Mana Potion/).length === 0, 'switching the potion: Spellblasting at its 70 s (' + used(r2, /Spellblasting/)[0] + ' s), the mana potion\'s times kept but unused');
  });
})();
