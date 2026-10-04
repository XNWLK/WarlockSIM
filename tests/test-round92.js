// Round 92 tests (user): the custom cooldown timeline — options.activesPolicy 'custom' with options.activesTimeline
// { racial, potion, pi, rune, sapper, explosive: [seconds] }. A cooldown is held until its next placed time and used at
// the first chance from then on; after its last placed use it is automatic again; cooldowns without a placed use behave
// as usual (buffs: the first Bane of Doom explosion). [A77]
(function () {
  function det(tl, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.options.includePetDamage = false;
    c.options.activesPolicy = 'custom'; c.options.activesTimeline = tl;
    c.buffs.powerInfusion.on = true; c.consumables.majorSpellblasting.on = true;
    if (f) f(c);
    return c;
  }
  function tb(rot) { return { key: 't92', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  var DOOM = ['bane', 'corruption', 'shadowBolt'];
  function times(r, what) {
    return r.log.filter(function (e) {
      return what === 'racial' ? e.type === 'racial' : what === 'pi' ? e.type === 'buff' && /Power Infusion/.test(e.spell) :
        what === 'item' ? e.type === 'cast' && /^item:/.test(e.spell) : e.type === 'consumable' && what.test(e.spell);
    }).map(function (e) { return e.t; });
  }
  function near(t, want, slack) { return t != null && t >= want - 1e-6 && t <= want + slack; }

  T.run('round 92: custom cooldown timeline', function () {
    T.group('defaults');
    T.eq(JSON.stringify(WL.DEFAULT_CONFIG.options.activesTimeline), '{}', 'empty timeline by default (policy stays "doom")');

    T.group('placed uses happen at the first damaging cast from their time on');
    var r = WL.simulateOnce(tb(DOOM), 'orc', det({ racial: [30], potion: [100], pi: [10, 200] }), { seed: 1, duration: 300, log: true });
    var rac = times(r, 'racial'), pot = times(r, /Spellblasting/), pi = times(r, 'pi');
    T.ok(near(rac[0], 30, 3.1), 'Blood Fury placed at 30 s → ' + rac[0] + ' s');
    T.ok(near(pot[0], 100, 3.1), 'Spellblasting potion placed at 100 s → ' + pot[0] + ' s');
    T.ok(near(pi[0], 10, 3.1) && near(pi[1], 200, 3.1) && pi.length === 2, 'Power Infusion placed at 10 and 200 s → ' + pi.join(', ') + ' s (held in between although ready at ' + (pi[0] + 180).toFixed(1) + ' s)');

    T.group('after its last placed use a cooldown is automatic again');
    T.ok(rac.length === 3 && rac[1] - rac[0] >= 120 - 1e-6 && rac[1] - rac[0] < 124, 'Blood Fury again as soon as it is ready (' + rac.join(', ') + ' s)');
    T.ok(pot.length === 2 && pot[1] - pot[0] >= 120 - 1e-6 && pot[1] - pot[0] < 124, 'potion again as soon as it is ready (' + pot.join(', ') + ' s)');

    T.group('a use placed inside the cooldown waits for it');
    var b = WL.simulateOnce(tb(DOOM), 'orc', det({ racial: [30, 60] }), { seed: 1, duration: 300, log: true }), br = times(b, 'racial');
    T.ok(near(br[0], 30, 3.1) && br[1] - br[0] >= 120 - 1e-6 && br[1] - br[0] < 124, 'second Blood Fury placed at 60 s fires when ready (' + br.join(', ') + ' s)');

    T.group('cooldowns without a placed use: as usual');
    var u = WL.simulateOnce(tb(DOOM), 'orc', det({ racial: [30] }), { seed: 1, duration: 300, log: true });
    var boom = u.log.filter(function (e) { return e.type === 'tick' && e.spell === 'baneOfDoom'; })[0];
    var up = times(u, /Spellblasting/)[0], ui = times(u, 'pi')[0];
    T.ok(boom && up === ui && up <= boom.t + 1e-6 && boom.t - up <= 3.0 + 1e-6, 'potion and Power Infusion still go with the first Doom explosion (' + up + ' s, explosion ' + (boom && boom.t) + ' s)');
    var e0 = det({}), d0 = JSON.parse(JSON.stringify(e0)); d0.options.activesPolicy = 'doom';
    T.eq(WL.simulateOnce(tb(DOOM), 'orc', e0, { seed: 2, duration: 200 }).dps, WL.simulateOnce(tb(DOOM), 'orc', d0, { seed: 2, duration: 200 }).dps, "an empty custom timeline = the 'doom' setting");

    T.group('mana potion, rune and explosives');
    var cm = det({ potion: [40], rune: [50], explosive: [20, 200] }, function (c) {
      c.consumables.majorSpellblasting.on = false; c.consumables.majorManaPotion.on = true; c.consumables.demonicRune.on = true;
      c.professions.engineering = true; c.consumables.denseDynamite.on = true; c.buffs.powerInfusion.on = false;
    });
    var m = WL.simulateOnce(tb(['shadowBolt']), 'human', cm, { seed: 1, duration: 300, log: true });
    var mp = times(m, /Mana Potion/), ru = times(m, /Rune/), dy = times(m, 'item');
    T.ok(near(mp[0], 40, 3.1), 'mana potion placed at 40 s → ' + mp[0] + ' s (not earlier, although mana was missing)');
    T.ok(near(ru[0], 50, 3.1), 'rune placed at 50 s → ' + ru[0] + ' s');
    T.ok(near(dy[0], 20, 3.1) && near(dy[1], 200, 3.1), 'dynamite placed at 20 and 200 s → ' + dy.slice(0, 2).join(', ') + ' s (not thrown at 0 s or in between)');
    T.ok(dy.length === 3 && dy[2] - dy[1] >= 60 - 1e-6, 'then on cooldown again (' + dy.join(', ') + ' s)');
    var auto = det({}, function (c) { c.consumables.majorSpellblasting.on = false; c.consumables.majorManaPotion.on = true; c.professions.engineering = true; c.consumables.denseDynamite.on = true; c.buffs.powerInfusion.on = false; });
    var a = WL.simulateOnce(tb(['shadowBolt']), 'human', auto, { seed: 1, duration: 300, log: true });
    T.near(times(a, 'item')[0], 0, 1e-9, 'not placed: dynamite at 0 s as usual');
    var gains = a.log.filter(function (e) { return e.type === 'consumable'; });
    T.ok(gains.length > 0 && gains.every(function (e) { return e.gain === 1800; }), 'not placed: mana potion only when 1800 mana is missing');

    T.group('settings code and bad input');
    var c1 = det({ racial: [59], pi: [0, 180] }), c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    WL.applySettings(c2, WL.decodeSettings(WL.encodeSettings(c1)));
    T.eq(c2.options.activesPolicy + ' ' + JSON.stringify(c2.options.activesTimeline), 'custom {"racial":[59],"pi":[0,180]}', 'the timeline travels in a settings code');
    var junk = det({ racial: 'x', potion: [NaN, -5, '70'], nope: [1] });
    var j = WL.simulateOnce(tb(DOOM), 'orc', junk, { seed: 1, duration: 200, log: true });
    T.ok(near(times(j, /Spellblasting/)[0], 70, 3.1) && isFinite(j.dps), 'junk in the timeline is ignored, numbers as text are read (' + times(j, /Spellblasting/)[0] + ' s)');
  });
})();
