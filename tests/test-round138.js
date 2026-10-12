// Round 138 tests (user): "show the maths" — WL.explainSpell (engine/explain.js) repeats the engine's formulas step by
// step. Every number it shows must be the engine's: its own product of base × talents × auras against the spell table,
// and its pet / racial values against what real fights log.
(function () {
  function cfgWith(mod) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); if (mod) mod(c); return c; }
  var RACES = ['undead', 'gnome', 'human', 'orc'];

  T.run('round 138: show the maths = the engine\'s own numbers', function () {
    T.group('every damage row of every build has a calculation');
    var c = cfgWith(function (x) { x.buffs.powerInfusion.on = true; x.professions.engineering = true; x.consumables.goblinSapper.on = true; x.fight.targets = 2; x.fight.multiDot = true; });
    var rows = 0, none = [], off = [], text = [];
    WL.BUILDS.forEach(function (b) {
      RACES.forEach(function (race) {
        var r = WL.simulate(b, race, c, { iterations: 2, log: false });
        Object.keys(r.bySpell).forEach(function (k) {
          var x = WL.explainSpell(b, race, c, k, r.stats, r.table); rows++;
          if (!x) { none.push(b.key + ' ' + k); return; }
          var v = x.values;
          if (v.direct != null && !(Math.abs(v.direct - v.directCalc) <= 1e-6)) off.push(b.key + ' ' + k + ' hit ' + v.direct + ' vs ' + v.directCalc);
          if (v.tick != null && !(Math.abs(v.tick - v.tickCalc) <= 1e-6)) off.push(b.key + ' ' + k + ' tick ' + v.tick + ' vs ' + v.tickCalc);
          var all = x.title + ' ' + x.steps.map(function (s) { return s.label + ' ' + s.calc + ' ' + s.result; }).join(' ') + ' ' + x.notes.join(' ');
          if (/NaN|undefined|\[A\d|round \d/.test(all)) text.push(b.key + ' ' + k);
        });
      });
    });
    T.ok(rows > 200, rows + ' rows checked (' + WL.BUILDS.length + ' builds × ' + RACES.length + ' races, 2 targets, Power Infusion, a Sapper)');
    T.eq(none.join(', '), '', 'no damage row without a calculation');
    T.eq(off.join(', '), '', 'base × talents × auras, as written in the steps, is the spell table\'s value for every hit and tick');
    T.eq(text.join(', '), '', 'no "NaN", "undefined", assumption id or round number in any text');

    T.group('pet and racial values against the log of real fights');
    var b = WL.findBuild('demo_pact_succ_sb'), c1 = cfgWith(), seen = { lash: {}, brand: {}, tog: {} };
    var st = WL.computeStats(b, 'undead', c1), tb = WL.buildSpellTable(b, st, c1);
    for (var i = 0; i < 25; i++) {
      var fp = WL.fightParams(c1, i);
      WL.simulateOnce(b, 'undead', c1, { stats: st, table: tb, seed: fp.seed, duration: fp.duration, log: true }).log.forEach(function (e) {
        if (e.type === 'pet' && e.spell === 'pet:lashOfPain' && !e.crit) seen.lash[e.dmg] = 1;
        if (e.type === 'pet' && e.spell === 'pet:brand') seen.brand[e.dmg] = 1;
        if (e.type === 'hit' && e.spell === 'touchOfTheGrave') seen.tog[e.dmg] = 1;
      });
    }
    function allowed(v, extra) { var a = [v.hit, v.onBoss].concat(extra || []).filter(function (x) { return x != null; }).map(Math.round); return a; }
    function within(set, list) { return Object.keys(set).every(function (d) { return list.indexOf(+d) >= 0; }); }
    var lash = WL.explainSpell(b, 'undead', c1, 'pet:lashOfPain', st, tb).values, brand = WL.explainSpell(b, 'undead', c1, 'pet:brand', st, tb).values;
    var tog = WL.explainSpell(b, 'undead', c1, 'touchOfTheGrave', st, tb).values, coe = 1 + WL.SPELLS.curseOfElements.dmgTakenPct / 100;
    T.ok(Object.keys(seen.lash).length > 0 && within(seen.lash, allowed(lash)), 'Lash of Pain: every logged hit (' + Object.keys(seen.lash).join(', ') + ') is the calculation\'s value without / with the curse (' + allowed(lash).join(', ') + ')');
    T.ok(Object.keys(seen.brand).length > 0 && within(seen.brand, allowed(brand)), 'Demonic Brand: logged ' + Object.keys(seen.brand).join(', ') + ' — calculation ' + allowed(brand).join(', '));
    T.ok(Object.keys(seen.tog).length > 0 && within(seen.tog, allowed(tog, [tog.hit * coe, tog.onBoss / coe])), 'Touch of the Grave: logged ' + Object.keys(seen.tog).join(', ') + ' — the calculation with none / one / both debuffs');

    T.group('the Succubus\' swing');
    var c2 = cfgWith(function (x) { x.combat.petMelee.glancePct = 0; x.combat.petMelee.critSuppressionPct = 100; });   // only misses, dodges and normal hits
    var m = WL.simulate(b, 'undead', c2, { iterations: 10, log: false }).bySpell['pet:melee'];
    var sw = WL.explainSpell(b, 'undead', c2, 'pet:melee').values.swing;
    T.near(m.dmg / m.landed, sw, 1e-6, 'without glancing blows and crits every landed swing deals the calculation\'s normal swing (' + sw.toFixed(3) + ')');

    T.group('what has no calculation');
    T.eq(WL.explainSpell(b, 'undead', c1, 'noSuchSpell'), null, 'an unknown row → null (its row is then not clickable)');
    T.eq(WL.explainSpell(WL.findBuild('destro_incin_succ'), 'undead', c1, 'pet:firebolt'), null, 'a pet spell the build\'s demon does not have → null');
  });
})();
