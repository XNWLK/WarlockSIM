// Round 130 tests (user: "move the curse earlier for destro incinerate imp"): Curse of the Elements sits right after
// Immolate in that build's priority (it was after Conflagrate). Since round 118 a boss has level resistance until the
// curse is on it, so the earlier curse leaves fewer hits that can be partly resisted.
(function () {
  T.run('round 130: Destro Incinerate Imp casts Curse of the Elements earlier', function () {
    T.group('the priority');
    var b = WL.BUILDS.filter(function (x) { return x.key === 'destro_incin_imp'; })[0], rot = b.rotation;
    var at = function (a) { return rot.indexOf(a); };
    T.eq(rot.join(','), 'deathCoilFinisher,bane,corruption,immolate,curseOfElements,lifeTapPet,conflagrate,shadowburn,lifeTapBelow,incinerate', 'the list, curse fifth');
    T.ok(at('curseOfElements') === at('immolate') + 1 && at('curseOfElements') < at('conflagrate') && at('curseOfElements') < at('shadowburn'),
      'right after Immolate, before Conflagrate and Shadowburn');
    T.eq(WL.validateBuild(b).join(' | '), '', 'still a legal build');
    var old = JSON.parse(JSON.stringify(b));
    old.rotation = ['deathCoilFinisher', 'bane', 'corruption', 'immolate', 'lifeTapPet', 'conflagrate', 'curseOfElements', 'shadowburn', 'lifeTapBelow', 'incinerate'];
    T.eq(old.rotation.slice().sort().join(','), rot.slice().sort().join(','), 'the same ten actions as before, only the order differs');

    T.group('in a fight (default settings, 10 seeds)');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), n = 10, sooner = 0, beforeConf = 0, oldAfterConf = 0, once = 0;
    var casts = function (bd, seed) { return WL.simulateOnce(bd, 'undead', c, { seed: seed, log: true }).log.filter(function (e) { return e.type === 'cast'; }); };
    var firstT = function (cs, spell) { var e = cs.filter(function (x) { return x.spell === spell; })[0]; return e ? e.t : Infinity; };
    for (var s = 1; s <= n; s++) {
      var now = casts(b, s), was = casts(old, s);
      var tNow = firstT(now, 'curseOfElements'), tWas = firstT(was, 'curseOfElements');
      if (tNow < tWas) sooner++;
      if (tNow < firstT(now, 'conflagrate')) beforeConf++;
      if (tWas > firstT(was, 'conflagrate')) oldAfterConf++;
      if (isFinite(tNow) && firstT(now, 'immolate') < tNow) once++;
    }
    T.eq(sooner, n, 'the curse goes up sooner than with the old order in every fight');
    T.eq(beforeConf, n, 'and before the first Conflagrate');
    T.eq(oldAfterConf, n, 'the old order cast it after the first Conflagrate (so the check above can fail)');
    T.eq(once, n, 'Immolate is still cast first');

    T.group('fewer hits before the curse');
    var open = function (bd) {      // your hits and ticks logged before the curse is cast, summed over the seeds (pet entries have their own type)
      var k = 0;
      for (var s2 = 1; s2 <= n; s2++) {
        var lg = WL.simulateOnce(bd, 'undead', c, { seed: s2, log: true }).log, ic = -1;
        lg.some(function (e, j) { if (e.type === 'cast' && e.spell === 'curseOfElements') { ic = j; return true; } return false; });
        k += lg.slice(0, ic < 0 ? lg.length : ic).filter(function (e) { return e.type === 'hit' || e.type === 'tick'; }).length;
      }
      return k;
    };
    var kNow = open(b), kWas = open(old);
    T.ok(kNow < kWas, 'your hits and ticks before the curse is up: ' + kNow + ' now, ' + kWas + ' with the old order');

    if (WL.DEFAULT_RESULTS) {
      T.group('shipped default results');
      var i = WL.DEFAULT_RESULTS.keys.indexOf('destro_incin_imp');
      T.ok(i >= 0 && String(WL.DEFAULT_RESULTS.builds).indexOf('"immolate","curseOfElements","lifeTapPet"') > 0, 'made with the new order');
    }
  });
})();
