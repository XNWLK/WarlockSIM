// Round 110 tests (user feedback): five builds taken off the sheet; Elixir of the Owl and Elixir of Sages do not stack
// their 2% crit.
(function () {
  T.run('round 110: smaller build list, elixir crit', function () {
    T.group('builds on the sheet');
    var GONE = ['aff_pact_fire', 'demo_pact_succ_fire', 'aff_pact_succ_drain', 'aff_succ_sb', 'ds_ruin_classic', 'demo_pact_imp_sb'];
    var own = WL.BUILDS.filter(function (b) { return !b.custom; }).map(function (b) { return b.key; });
    T.eq(own.join(','), 'demo_pact_succ_sb,aff_pact_succ_sb,demo_pact_fire,destro_incin_succ,destro_incin_imp,sm_ruin_classic,wrack_succubus', 'seven builds remain, in the same order (round 122: Demo Pact Shadow Bolt Imp went too)');
    GONE.forEach(function (k) {
      T.ok(own.indexOf(k) < 0, k + ' is off the sheet');
      var b = WL.findBuild(k);
      T.ok(!!b && WL.RETIRED_BUILDS.indexOf(b) >= 0 && WL.validateBuild(b).length === 0, k + ' is kept as a legal test fixture');
    });
    T.ok(WL.findBuild('sm_ruin_classic') === WL.BUILDS.filter(function (b) { return b.key === 'sm_ruin_classic'; })[0], 'WL.findBuild returns a build of the sheet first');
    if (WL.DEFAULT_RESULTS) {
      T.eq(WL.DEFAULT_RESULTS.keys.filter(function (k) { return GONE.indexOf(k) >= 0; }).length, 0, 'the shipped default results hold no row of a removed build');
      T.eq(WL.DEFAULT_RESULTS.results.length, own.length * WL.SIM_RACE_KEYS.length, 'shipped default results: ' + own.length + ' builds × ' + WL.SIM_RACE_KEYS.length + ' race rows');
    }

    T.group('Elixir of the Owl + Elixir of Sages: the 2% crit counts once');
    var b0 = { talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: [] };
    var cfgWith = function (on) {
      var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
      Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = on.indexOf(k) >= 0; });
      return c;
    };
    var st = function (on) { return WL.computeStats(b0, 'human', cfgWith(on)); };
    var s0 = st([]), owl = st(['elixirOwl']), sag = st(['elixirSages']), both = st(['elixirOwl', 'elixirSages']);
    var intCrit = function (s) { return (s.int - s0.int) / 60; };
    T.eq(WL.CONSUMABLES.elixirOwl.critGroup, WL.CONSUMABLES.elixirSages.critGroup, 'both elixirs share one crit group');
    T.ok(WL.CONSUMABLES.elixirOwl.group !== WL.CONSUMABLES.elixirSages.group, 'they are still different elixirs: both can be ticked');
    T.near(owl.critPct - s0.critPct, 2 + intCrit(owl), 1e-9, 'Owl alone: +2% crit (+ its Intellect)');
    T.near(sag.critPct - s0.critPct, 2, 1e-9, 'Sages alone: +2% crit');
    T.near(both.critPct - s0.critPct, 2 + intCrit(both), 1e-9, 'both: still +2% crit (+ the Owl\'s Intellect), not +4%');
    T.near(both.int - s0.int, owl.int - s0.int, 1e-9, 'both: the Owl\'s Intellect still counts');
    T.near(both.spi - s0.spi, sag.spi - s0.spi, 1e-9, 'both: the Sages\' Spirit still counts');
    T.ok(owl.int > s0.int && sag.spi > s0.spi, 'the elixirs give Intellect / Spirit at all');
    var crits = both.breakdown.filter(function (x) { return x.stat === 'critPct' && /Elixir/.test(x.source); });
    T.ok(crits.length === 1 && crits[0].value === 2 && /does not stack with Elixir of Sages/.test(crits[0].source), 'the stat breakdown lists the crit once and says why (' + crits.map(function (x) { return x.source; }).join(' | ') + ')');
    var flask = st(['flaskNaturalAggression', 'elixirOwl', 'elixirSages']);
    T.near(flask.critPct - both.critPct, 4, 1e-9, 'crit from other consumables (Flask of Natural Aggression +4%) still adds on top');
    var crit = function (on) { return WL.computeStats(WL.BUILDS[0], 'human', cfgWith(on)).critPct; };
    T.near(crit(['buildOil', 'elixirOwl', 'elixirSages']), crit(['buildOil', 'elixirOwl']), 1e-9, 'in a real build: adding Sages on top of the Owl adds no crit');
  });
})();
