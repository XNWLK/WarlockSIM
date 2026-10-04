// Round 95 tests (user): the racial cooldown on the timeline can be shared by all races (slot 'racial', the default) or
// set per race (options.activesRacialSplit → slots 'racial_orc' / 'racial_troll' / 'racial_gnome'). [A77]
(function () {
  function det(tl, split) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'custom'; c.options.activesTimeline = tl; c.options.activesRacialSplit = !!split;
    return c;
  }
  function tb(rot) { return { key: 't95', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  var DOOM = ['bane', 'corruption', 'shadowBolt'];
  function pop(race, cfg) { var e = WL.simulateOnce(tb(DOOM), race, cfg, { seed: 1, duration: 120, log: true }).log.filter(function (x) { return x.type === 'racial'; })[0]; return e ? e.t : null; }
  function near(t, want, slack) { return t != null && t >= want - 1e-6 && t <= want + slack; }

  T.run('round 95: racial cooldown per race on the timeline', function () {
    T.group('defaults');
    T.eq(WL.DEFAULT_CONFIG.options.activesRacialSplit, false, 'one list of times for all races by default');

    T.group('shared (not split): slot "racial" for every race');
    var sh = det({ racial: [30], racial_troll: [90] });
    T.ok(near(pop('orc', sh), 30, 3.1) && near(pop('troll', sh), 30, 3.1) && near(pop('gnome', sh), 30, 3.1),
      'Orc ' + pop('orc', sh) + ' s, Troll ' + pop('troll', sh) + ' s, Gnome ' + pop('gnome', sh) + ' s — all from 30 s (a stray per-race list is ignored)');

    T.group('split: each race its own list');
    var sp = det({ racial: [30], racial_orc: [20], racial_troll: [90] }, true);
    T.ok(near(pop('orc', sp), 20, 3.1), 'Orc from its own 20 s → ' + pop('orc', sp) + ' s');
    T.ok(near(pop('troll', sp), 90, 3.1), 'Troll from its own 90 s → ' + pop('troll', sp) + ' s');
    var g = pop('gnome', sp);
    T.ok(g != null && g > 50 && g < 70, 'Gnome has nothing placed → as usual, at the first Doom explosion (' + g + ' s); the shared list is ignored');

    T.group('settings code');
    var c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    WL.applySettings(c2, WL.decodeSettings(WL.encodeSettings(sp)));
    T.eq(c2.options.activesRacialSplit + ' ' + JSON.stringify(c2.options.activesTimeline.racial_troll), 'true [90]', 'the split flag and the per-race times travel in a settings code');
    T.eq(JSON.stringify(Object.keys(WL.activesTimelineOf(sp)).sort()), '["racial","racial_orc","racial_troll"]', 'per-race lists pass through WL.activesTimelineOf');
  });
})();
