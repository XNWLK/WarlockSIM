// Round 75 tests (user): your melee crit comes from Agility, your spell crit from Int + gear; the Succubus' melee inherits
// your MELEE crit (was your spell crit since round 32), Lash of Pain your spell crit. Grace of Air Totem (off) and
// Scroll of Agility IV (on) in the raid buffs; Elixir of Cunning's +25 Agility now counts (A75).
(function () {
  function shipped() {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), m = c.pets.succubus.melee;
    c.petSpPct = WL.SHIPPED_PETS.petSpPct; m.apPerSp = WL.SHIPPED_PETS.succApPerSp; m.baseDps = WL.SHIPPED_PETS.succBaseDps;
    m.critPct = WL.SHIPPED_PETS.succCrit; m.inheritMeleeCrit = WL.SHIPPED_PETS.succInherit;
    ['buffs', 'debuffs'].forEach(function (g) { Object.keys(c[g]).forEach(function (k) { c[g][k].on = WL.SHIPPED_ON[g][k]; }); });   // the shipped buffs
    return c;
  }
  var nob = { key: 't75', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
  var succ = { key: 't75s', short: 't', name: 't', notes: '', talents: {}, pet: 'succubus', sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };

  T.run('round 75: melee crit from Agility, Succubus melee inherits it', function () {
    T.group('Defaults: Grace of Air Totem off, Scroll of Agility IV on; Mark of the Wild +16 Agility');
    var B = WL.DEFAULT_CONFIG.buffs;
    T.ok(B.graceOfAir && !WL.SHIPPED_ON.buffs.graceOfAir && B.graceOfAir.agi === 77, 'Grace of Air Totem: +77 Agility, off by default');
    T.ok(B.scrollOfAgility && WL.SHIPPED_ON.buffs.scrollOfAgility && B.scrollOfAgility.agi === 17, 'Scroll of Agility IV: +17 Agility, on by default');
    T.eq(B.markOfTheWild.agi, 16, 'Mark of the Wild gives Agility too');

    T.group('Agility = (50 base + race offset + gear + buffs + consumables) × Kings; melee crit = 2% + Agility / 20 + Sword Spec');
    var c = shipped(), offs = { human: 0, gnome: 3, orc: -3, undead: -2, troll: 2 };
    WL.RACE_KEYS.forEach(function (r) {
      var s = WL.computeStats(nob, r, c), agi = (50 + offs[r] + 16 + 17) * 1.1;
      var mc = 2 + agi / 20 + (r === 'human' && c.gear.weaponIsSword ? 2 : 0);
      T.ok(Math.abs(s.agi - agi) < 1e-9 && Math.abs(s.meleeCritPct - mc) < 1e-9, WL.RACES[r].name + ': Agility ' + s.agi.toFixed(1) + ', melee crit ' + s.meleeCritPct.toFixed(2) + '%');
    });
    var s0 = WL.computeStats(nob, 'human', c);
    var cg = shipped(); cg.buffs.graceOfAir.on = true;
    var sg = WL.computeStats(nob, 'human', cg);
    T.near(sg.agi - s0.agi, 77 * 1.1, 1e-9, 'Grace of Air Totem: +84.7 Agility with Kings');
    T.near(sg.meleeCritPct - s0.meleeCritPct, 77 * 1.1 / 20, 1e-9, '… = +4.24% melee crit');
    T.eq(sg.critPct, s0.critPct, 'and no spell crit');
    // Agility from a consumable (Elixir of Cunning until round 90, when the user removed it): a stand-in keeps the rule tested
    var ce = shipped(); ce.consumables.testAgi = { on: true, group: 'testAgi', name: 'Agility test consumable', agi: 25 };
    T.near(WL.computeStats(nob, 'human', ce).agi - s0.agi, 25 * 1.1, 1e-9, 'a consumable with +25 Agility counts (× Kings)');
    var ca = shipped(); ca.gear.agi = 40;
    T.near(WL.computeStats(nob, 'human', ca).meleeCritPct - s0.meleeCritPct, 40 * 1.1 / 20, 1e-9, 'gear Agility 40 → +2.2% melee crit');
    var cc = shipped(); cc.gear.critPct += 5; cc.gear.int += 120;
    var sc = WL.computeStats(nob, 'human', cc);
    T.ok(sc.critPct > s0.critPct + 4.9 && sc.meleeCritPct === s0.meleeCritPct, 'gear crit and Int raise spell crit only (' + s0.critPct.toFixed(2) + ' → ' + sc.critPct.toFixed(2) + '%), melee crit stays ' + s0.meleeCritPct.toFixed(2) + '%');

    T.group('Succubus: melee crit = 7.52% + your melee crit − 4.8%; Lash of Pain = your spell crit');
    var cs = shipped(), ss = WL.computeStats(succ, 'human', cs), r = WL.simulate(succ, 'human', cs, { iterations: 400, log: false });
    var mel = r.bySpell['pet:melee'], lash = r.bySpell['pet:lashOfPain'], exp = 7.52 + ss.meleeCritPct - 4.8;
    T.near(100 * mel.crits / mel.casts, exp, 1.2, 'melee crits ≈ 7.52 + ' + ss.meleeCritPct.toFixed(2) + ' − 4.8 = ' + exp.toFixed(2) + '% of swings (measured ' + (100 * mel.crits / mel.casts).toFixed(2) + '%)');
    T.near(100 * lash.crits / lash.landed, ss.critPct, 3.5, 'Lash of Pain crits ≈ your spell crit ' + ss.critPct.toFixed(2) + '% (measured ' + (100 * lash.crits / lash.landed).toFixed(2) + '%)');
    var rg = WL.simulate(succ, 'human', cg, { iterations: 400, log: false }).bySpell['pet:melee'];
    T.ok(100 * rg.crits / rg.casts > 100 * mel.crits / mel.casts + 2.5, 'Grace of Air Totem raises her melee crits (' + (100 * mel.crits / mel.casts).toFixed(2) + ' → ' + (100 * rg.crits / rg.casts).toFixed(2) + '%)');
    var rm = WL.simulate(succ, 'human', cc, { iterations: 400, log: false });
    T.near(100 * rm.bySpell['pet:melee'].crits / rm.bySpell['pet:melee'].casts, 100 * mel.crits / mel.casts, 0.8, 'more spell crit does not change her melee crits');
  });

  T.run('round 74: Demonic Brand applied early', function () {
    T.group('Fire builds and Demo Pact SB Imp: the Brand upkeep near the top (10,000 fights +0.03 … +0.16%)');
    var cd = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    ['buffs', 'debuffs'].forEach(function (g) { Object.keys(cd[g]).forEach(function (k) { cd[g][k].on = WL.SHIPPED_ON[g][k]; }); });
    var first = function (b) {
      var e = WL.simulateOnce(b, 'human', cd, { duration: 60, log: true, seed: 7 }).log.filter(function (x) { return x.type === 'cast' && x.spell === 'searingPain'; })[0];
      return e ? e.t : Infinity;
    };
    ['demo_pact_succ_fire', 'demo_pact_fire', 'demo_pact_imp_sb', 'aff_pact_fire'].forEach(function (k) {
      var b = WL.findBuild(k), i = b.rotation.indexOf('searingPainBrand');
      var without = JSON.parse(JSON.stringify(b)); without.rotation = b.rotation.filter(function (a) { return a !== 'searingPainBrand'; });
      var tNow = first(b), tWas = first(without);
      T.ok(i >= 0 && i <= 2 && i < b.rotation.indexOf('curseOfElements') && tNow < tWas && tNow < 4,
        b.short + ': Brand upkeep at #' + (i + 1) + ', first Searing Pain at ' + tNow.toFixed(1) + ' s (without it: ' + tWas.toFixed(1) + ' s)');
    });
    T.group('Shadow Bolt Succubus builds keep Brand after Bane and Curse of the Elements (earlier loses 0.3 … 0.9%)');
    ['demo_pact_succ_sb', 'aff_pact_succ_sb', 'aff_succ_sb'].forEach(function (k) {
      var r = WL.findBuild(k).rotation;
      T.ok(r.indexOf('searingPainBrand') > r.indexOf('curseOfElements') && r.indexOf('curseOfElements') > r.indexOf('bane'), k + ': ' + r.join(' > '));
    });
  });
})();
