// Round 271 tests (user: "can you add https://www.wowhead.com/forever/item=13929/hot-smoked-bass as an option in the buff food
// in consumables. also in consumables can you separate spellstone and firestonne so i can freely choose? we can have the
// current setting be auto and then the 2 invidivual stones so i can swap? so basically the current icon is gonna be the
// diagonal half half and it says auto pick best. and then under it the 2 individual stones."). Values: the Wowhead Forever
// tooltips of items 13929, 13603 and 13701 (read 2026-11-27).
(function () {
  function base(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function only(c, keys) { Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = keys.indexOf(k) >= 0; }); return c; }
  function tb(rot, oil) { return { key: 't', name: 't', talents: {}, pet: null, sacrifice: null, oil: oil || 'none', rotation: rot }; }
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }

  T.run('round 271: Hot Smoked Bass', function () {
    var C = WL.CONSUMABLES, B = C.hotSmokedBass, b = tb(['shadowBolt']);
    T.group('the food');
    T.ok(!!B && B.id === 13929 && B.group === 'food' && B.cat === 'Food' && B.critPct === 1 && !B.on, 'Hot Smoked Bass: item 13929, a food (one well-fed buff), +1% crit, off by default');
    T.ok(/1% Critical Strike chance for 15 min/.test(B.text), 'its text is the Forever tooltip\'s');
    T.ok(!!WL.ICONS.consumable_hotSmokedBass && !!WL.CON_TIPS[13929] && /Hot Smoked Bass/.test(WL.CON_TIPS[13929]), 'icon and in-game tooltip');
    var keys = Object.keys(C).filter(function (k) { return C[k].group === 'food'; });
    T.eq(keys.join(','), 'bakedSalmon,soaringPamplona,hotSmokedBass', 'the foods, in picker order');

    T.group('on the stat sheet');
    var s0 = WL.computeStats(b, 'human', only(base(), [])), s1 = WL.computeStats(b, 'human', only(base(), ['hotSmokedBass']));
    T.near(s1.critPct - s0.critPct, 1, 1e-9, '+1% spell crit');
    T.ok(s1.breakdown.some(function (x) { return x.stat === 'critPct' && x.source === 'Hot Smoked Bass' && x.value === 1; }), 'named in the crit breakdown');
    T.near(s1.sp - s0.sp, 0, 1e-9, 'no spell power');
    var both = WL.computeStats(b, 'human', only(base(), ['bakedSalmon', 'hotSmokedBass']));
    T.near(both.sp - s0.sp, 28, 1e-9, 'with Baked Salmon also on: only one well-fed buff counts (the first, Baked Salmon +28 SP) …');
    T.near(both.critPct - s0.critPct, 0, 1e-9, '… and the Bass adds no crit');
    T.eq(WL.activeConsumables(only(base(), ['bakedSalmon', 'hotSmokedBass'])).filter(function (c) { return c.group === 'food'; }).length, 1, 'one food active');
  });

  T.run('round 271: Spellstone / Firestone — auto or either one', function () {
    var C = WL.CONSUMABLES, sb = tb(['shadowBolt'], 'spellstone'), fb = tb(['shadowBolt'], 'firestone');
    T.group('three choices in the stone group');
    var keys = Object.keys(C).filter(function (k) { return C[k].group === 'stone'; });
    T.eq(keys.join(','), 'buildOil,majorSpellstone,majorFirestone', 'picker order (data order): auto first, then the two stones');
    T.ok(C.buildOil.on && !C.majorSpellstone.on && !C.majorFirestone.on, 'default: auto on, the two stones off');
    T.ok(/auto/i.test(C.buildOil.name) && /best/i.test(C.buildOil.name) && C.buildOil.buildOil === true, 'auto keeps the key buildOil and says it picks the best: ' + C.buildOil.name);
    T.ok(C.majorSpellstone.id === 13603 && C.majorSpellstone.stone === 'spellstone' && C.majorSpellstone.name === 'Major Spellstone', 'Major Spellstone: item 13603, forces the Spellstone');
    T.ok(C.majorFirestone.id === 13701 && C.majorFirestone.stone === 'firestone' && C.majorFirestone.name === 'Major Firestone', 'Major Firestone: item 13701, forces the Firestone');
    var A = WL.ICONS.consumable_buildOil, S = WL.ICONS.consumable_majorSpellstone, F = WL.ICONS.consumable_majorFirestone;
    T.ok(!!A && !!S && !!F && A !== S && A !== F && S !== F, 'three icons, the auto one its own (the two stones cut diagonally)');
    T.ok(!!WL.CON_TIPS[13603] && /Major Spellstone/.test(WL.CON_TIPS[13603]) && !!WL.CON_TIPS[13701] && /Major Firestone/.test(WL.CON_TIPS[13701]), 'both stones\' in-game tooltips');
    T.ok(!WL.CON_TIPS[17728], 'the old id 17728 (Forever\'s item 17728 is a pair of boots) is gone from the tooltips');
    T.ok(JSON.stringify(C.buildOil.stoneIds) === '[13603,13701]', 'the auto stone\'s tooltip shows both stones');
    T.eq(WL.activeConsumables(only(base(), ['buildOil', 'majorFirestone'])).filter(function (c) { return c.group === 'stone'; }).length, 1, 'one stone active (exclusive group)');

    T.group('auto = the build\'s own stone');
    T.eq(WL.stoneKey(sb, only(base(), ['buildOil'])), 'spellstone', 'a Spellstone build: Spellstone');
    T.eq(WL.stoneKey(fb, only(base(), ['buildOil'])), 'firestone', 'a Firestone build: Firestone');
    T.eq(WL.stoneKey(tb(['shadowBolt']), only(base(), ['buildOil'])), 'none', 'a build without a stone: none');
    T.eq(WL.stoneKey(fb, only(base(), [])), 'none', 'no stone chosen: none');
    T.eq(WL.stoneKey(fb, only(base(), ['majorSpellstone'])), 'spellstone', 'forced Spellstone on a Firestone build: Spellstone');
    T.eq(WL.stoneKey(sb, only(base(), ['majorFirestone'])), 'firestone', 'forced Firestone on a Spellstone build: Firestone');
    T.eq(WL.stoneKey(tb(['shadowBolt']), only(base(), ['majorFirestone'])), 'firestone', 'forced: also for a build that lists none');

    T.group('the stat sheet');
    var f0 = WL.computeStats(fb, 'human', only(base(), [])), fs = WL.computeStats(fb, 'human', only(base(), ['majorSpellstone']));
    T.near(fs.hastePct - f0.hastePct, 2, 1e-9, 'Firestone build, Spellstone forced: +2% haste');
    T.near(fs.schoolSp.shadow - f0.schoolSp.shadow, 21, 1e-9, '… +21 Shadow SP');
    T.near(fs.schoolSp.fire - f0.schoolSp.fire, 0, 1e-9, '… no Fire SP');
    T.near(fs.critPct - f0.critPct, 0, 1e-9, '… no crit');
    T.ok(/Major Spellstone/.test(fs.oilName), '… and it is named: ' + fs.oilName);
    var s0 = WL.computeStats(sb, 'human', only(base(), [])), sf = WL.computeStats(sb, 'human', only(base(), ['majorFirestone']));
    T.near(sf.critPct - s0.critPct, 2, 1e-9, 'Spellstone build, Firestone forced: +2% crit');
    T.near(sf.schoolSp.fire - s0.schoolSp.fire, 21, 1e-9, '… +21 Fire SP');
    T.near(sf.hastePct - s0.hastePct, 0, 1e-9, '… no haste');
    T.near(sf.schoolSp.shadow - s0.schoolSp.shadow, 0, 1e-9, '… no Shadow SP');
    var fa = WL.computeStats(fb, 'human', only(base(), ['buildOil'])), ff = WL.computeStats(fb, 'human', only(base(), ['majorFirestone']));
    T.ok(fa.critPct === ff.critPct && fa.schoolSp.fire === ff.schoolSp.fire && fa.hastePct === ff.hastePct, 'auto on a Firestone build = Firestone forced');
    var wo = WL.computeStats(fb, 'human', only(base(), ['majorSpellstone', 'wizardOil']));
    T.near(wo.sp - fs.sp, 24, 1e-9, 'a forced stone still stacks with a weapon oil');

    T.group('in the fight');
    var built = WL.BUILDS.filter(function (x) { return x.oil === 'firestone'; })[0];
    var run = function (k) { var c = only(base(), [k]); c.fight.iterations = 20; return WL.simulate(built, 'human', c).dps; };
    T.eq(run('buildOil'), run('majorFirestone'), built.short + ' (lists the Firestone): auto = Firestone forced, the same fights');
    T.ok(run('majorSpellstone') !== run('majorFirestone'), built.short + ': Spellstone forced fights differently');

    T.group('settings codes');
    var c = only(base(), ['majorFirestone', 'hotSmokedBass']), back = base();
    var res = WL.applySettings(back, WL.decodeSettings(WL.encodeSettings(c)));
    T.ok(back.consumables.majorFirestone.on && back.consumables.hotSmokedBass.on && !back.consumables.buildOil.on && !back.consumables.majorSpellstone.on, 'Major Firestone + Hot Smoked Bass go through a code and back');
    T.ok(Array.isArray(res) && res.length === 0, 'nothing unknown');
    var old = base(); res = WL.applySettings(old, { v: 1, cons: ['buildOil', 'bakedSalmon'] });
    T.ok(old.consumables.buildOil.on && !old.consumables.majorSpellstone.on && !old.consumables.majorFirestone.on && res.length === 0, 'an old code with buildOil = auto, as before');
    T.ok(WL.PAGE_CONSUMABLES_ON.indexOf('buildOil') >= 0 && WL.PAGE_CONSUMABLES_ON.indexOf('majorSpellstone') < 0 && WL.PAGE_CONSUMABLES_ON.indexOf('majorFirestone') < 0 && WL.PAGE_CONSUMABLES_ON.indexOf('hotSmokedBass') < 0, 'the page\'s defaults: auto (unchanged)');

    T.group('the page');
    var app = src('../app/app.js');
    if (app) {
      T.ok(/function stoneText\(b\)/.test(app) && /kv\('Weapon stone', esc\(stoneText\(b\)\)\)/.test(app), 'build details: the stone the build fought with (app/app.js stoneText)');
      T.ok(/o\.stoneIds/.test(app), 'the auto stone\'s tooltip: both stones');
    }
  });
})();
