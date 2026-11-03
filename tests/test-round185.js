// Round 185 tests (user: "reorder wrack so it becomes the main filler"): Wrack Succubus channels Wrack above Shadow Trance,
// without the "keep Improved Shadow Bolt up" action, Siphon Life after Shadow Trance; the 4 s DoT rule on Wrack stays.
(function () {
  T.run('round 185: Wrack is the main filler of Wrack Succubus', function () {
    T.group('Wrack Succubus priority');
    var b = WL.BUILDS.filter(function (x) { return x.key === 'wrack_succubus'; })[0], r = b.rotation;
    T.eq(r.join(','), 'deathCoilFinisher,baneOfAgony,corruption,curseOfElements,immolate,wrack,shadowTrance,siphonLife,lifeTapNeed,shadowBolt',
      'Wrack above Shadow Trance, no ISB upkeep, Siphon Life after Shadow Trance, Shadow Bolt last');
    T.ok(b.actWhen && b.actWhen.wrack && b.actWhen.wrack.c.length === 3 && b.actWhen.wrack.c.every(function (x) { return x.op === '>=' && x.v === 4; }),
      'Wrack still waits until Corruption, Bane of Agony and Siphon Life have 4 s left');
    T.eq(WL.validateBuild(b).join(' | '), '', 'the editor accepts it');

    T.group('in the fight: Wrack is cast far more than before');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    ['buffs', 'debuffs'].forEach(function (g) { Object.keys(c[g]).forEach(function (k) { c[g][k].on = WL.SHIPPED_ON[g][k]; }); });
    var old = JSON.parse(JSON.stringify(b));
    old.rotation = ['deathCoilFinisher', 'baneOfAgony', 'corruption', 'siphonLife', 'curseOfElements', 'immolate', 'isbUpkeep', 'shadowTrance', 'lifeTapNeed', 'wrack', 'shadowBolt'];
    var now = WL.simulate(b, 'undead', c, { iterations: 60, log: false }), was = WL.simulate(old, 'undead', c, { iterations: 60, log: false });
    var wn = now.bySpell.wrack.casts, wo = was.bySpell.wrack.casts;
    T.ok(wn > 3 * wo && wn > 12, 'Wrack casts per fight: ' + wo.toFixed(1) + ' (round 184 order) → ' + wn.toFixed(1));
    T.ok(now.dps > was.dps, 'and the build does more damage (' + was.dps.toFixed(1) + ' → ' + now.dps.toFixed(1) + ' on these 60 fights)');
  });
})();
