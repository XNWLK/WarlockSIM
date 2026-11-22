// Round 239 tests (user pasted notes on how resists and Spell Penetration work for each Warlock spell, and a table of Spell
// Piercing before / after hotfix 114309, live 2026-11-19): binary / hit / tick rules, no Pierce bonus on ticks or Rain of
// Fire, demons resisted without your Pierce. [A128]
(function () {
  function base(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0;
    if (f) f(c);
    return c;
  }
  function tb(rot, pet) { return { key: 't', name: 't', talents: {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }; }
  var A = 24 / 523;                                                       // level resistance 24 at level 60: 24 / (24 + 499)

  T.run('round 239: resist rules per spell', function () {
    var D = base();
    T.group('the rules (WL.spellResist), 24 level resistance, no curse');
    var sb = WL.spellResist(D, 0, 'shadow', false, 0, 'shadowBolt', false);
    T.near(sb.mean, -A, 1e-12, 'Shadow Bolt: partial resists, ' + (A * 100).toFixed(2) + '% on average'); T.eq(sb.landP, 1, '… and always lands');
    ['immolate', 'incinerate', 'shadowburn', 'deathCoil', 'baneOfAgony', 'drainSoul'].forEach(function (k) {
      var p = WL.spellResist(D, 0, WL.SPELLS[k].school, false, 0, k, false), t = WL.spellResist(D, 0, WL.SPELLS[k].school, false, 0, k, true);
      T.ok(Math.abs(p.landP - (1 - A)) < 1e-12 && p.mean === 0 && t.mean === 0, k + ': binary — resisted ' + (A * 100).toFixed(2) + '% of casts, no partials on its hit or ticks');
    });
    T.near(WL.spellResist(D, 0, 'shadow', false, 0, 'corruption', true).mean, -A / 10, 1e-12, 'Corruption ticks: a tenth of the average');
    T.near(WL.spellResist(D, 0, 'shadow', false, 0, 'drainLife', true).mean, -A / 10, 1e-12, 'Drain Life ticks: a tenth too');

    T.group('15 Spell Pierce under the curse (resistance −15)');
    var B = 15 / 514;
    T.near(WL.spellResist(D, 15, 'shadow', true, 0, 'shadowBolt', false).mean, B, 1e-12, 'Shadow Bolt: +' + (B * 100).toFixed(2) + '%');
    T.near(WL.spellResist(D, 15, 'fire', true, 0, 'immolate', false).mean, B, 1e-12, 'Immolate\'s hit: the bonus too (hotfix 114309)');
    T.near(WL.spellResist(D, 15, 'fire', true, 0, 'incinerate', false).mean, B, 1e-12, 'Incinerate: the bonus too');
    T.near(WL.spellResist(D, 15, 'fire', true, 0, 'hellfire', false).mean, B, 1e-12, 'Hellfire: the bonus');
    ['corruption', 'siphonLife', 'baneOfAgony', 'baneOfDoom', 'drainLife', 'drainSoul', 'wrack', 'immolate'].forEach(function (k) {
      T.eq(WL.spellResist(D, 15, WL.SPELLS[k].school, true, 0, k, true).mean, 0, k + ' ticks: no bonus');
    });
    T.eq(WL.spellResist(D, 15, 'fire', true, 0, 'rainOfFire', false).mean, 0, 'Rain of Fire: no bonus (ground effects)');
    T.eq(WL.spellResist(D, 15, 'fire', true, 0, 'immolate', false).landP, 1, 'nothing left to resist: binary spells always land');

    T.group('demons');
    T.near(WL.petResist(D, 'fire', false, 'firebolt').landP, 1 - A, 1e-12, 'Imp Firebolt: binary, ' + (A * 100).toFixed(2) + '% resisted before the curse');
    T.near(WL.petResist(D, 'shadow', false, 'lashOfPain').mean, -A, 1e-12, 'Lash of Pain: partial');
    T.eq(WL.petResist(D, 'fire', true, 'firebolt').landP, 1, 'with Curse of the Elements nothing is resisted');
  });

  T.run('round 239: resist rules in a fight', function () {
    function fight(rot, f, pet, seed, talents) { var b = tb(rot, pet); if (talents) b.talents = talents; return WL.simulateOnce(b, 'human', base(f), { seed: seed || 3, duration: 600, log: true }); }
    var noCoe = function (c) { c.options.useCurseOfElements = false; c.combat.targetResist.fire = 150; c.combat.targetResist.shadow = 150; };
    T.group('a boss with 150 Fire / Shadow resistance, no curse');
    var inc = WL.BUILDS.filter(function (b) { return b.rotation.indexOf('incinerate') >= 0; })[0];
    var r = fight(['immolate', 'incinerate'], noCoe, null, 3, inc.talents), lg = r.log;
    var res = lg.filter(function (e) { return e.type === 'miss' && e.resisted; });
    T.ok(res.some(function (e) { return e.spell === 'immolate'; }) && res.some(function (e) { return e.spell === 'incinerate'; }), 'Immolate and Incinerate are fully resisted at times (' + res.length + ')');
    T.ok(!lg.some(function (e) { return (e.spell === 'immolate' || e.spell === 'incinerate') && e.resistPct; }), '… and never partially');
    var share = 174 / (174 + 499), casts = r.bySpell.incinerate.casts, rate = (r.bySpell.incinerate.resisted || 0) / casts;
    T.near(rate, share, 0.05, 'Incinerate resisted ' + (rate * 100).toFixed(1) + '% of ' + casts + ' casts (share ' + (share * 100).toFixed(1) + '%)');
    var s = fight(['shadowBolt'], noCoe);
    T.ok(s.log.some(function (e) { return e.spell === 'shadowBolt' && e.resistPct; }) && !s.log.some(function (e) { return e.resisted; }), 'Shadow Bolt: partial resists, never a full one');

    T.group('50 Spell Pierce under the curse');
    var pc = function (c) { c.gear.pierce = 50; };
    var d = fight(['corruption', 'siphonLife', 'shadowBolt'], pc);
    T.ok(d.log.some(function (e) { return e.spell === 'shadowBolt' && e.vulnPct > 0; }), 'Shadow Bolt gets bonus damage');
    T.ok(!d.log.some(function (e) { return e.type === 'tick' && e.vulnPct; }), 'no DoT tick does');
    var rf = fight(['rainOfFire'], pc);
    T.ok(!rf.log.some(function (e) { return e.vulnPct; }), 'Rain of Fire never does');

    T.group('demons');
    var imp = fight(['shadowBolt'], function (c) { noCoe(c); c.options.includePetDamage = true; }, 'imp');
    var fb = imp.bySpell['pet:firebolt'];
    T.ok(fb && fb.resisted > 0, 'the Imp\'s Firebolt is fully resisted at times (' + (fb && fb.resisted) + ' of ' + (fb && fb.casts) + ')');
    var imp2 = fight(['curseOfElements', 'shadowBolt'], function (c) { c.options.includePetDamage = true; c.gear.pierce = 50; }, 'imp');
    T.ok(!(imp2.bySpell['pet:firebolt'].resisted > 0), 'under the curse it never is, and your Spell Pierce does not reach it');
    T.ok(!imp2.log.some(function (e) { return e.type === 'pet' && e.vulnPct; }), 'no bonus damage on demons');

    T.group('default settings: nothing is resisted');
    var dd = WL.simulateOnce(WL.BUILDS[0], 'human', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), { seed: 1, log: true });
    T.ok(!dd.log.some(function (e) { return e.resisted; }), 'no full resists with the curse up');
  });
})();
