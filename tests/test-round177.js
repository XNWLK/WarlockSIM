// Round 177 tests (user picked these from another sim's layout): the Sim bar at the top (Sim! / Stop, progress, last run),
// preset buttons, "Restore all defaults", damage bars by school, tree-coloured talent trees, headline numbers and tabs in a
// build's details, sub-tabs in Advanced (APL), compact buffs and consumable slots, the welcome tour.
(function () {
  T.async('round 177: the worker pool can stop a run', function (done) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.iterations = 30;
    var b = WL.BUILDS[0], jobs = [], got = 0, finished = false;
    for (var i = 0; i < 12; i++) jobs.push({ kind: 'combo', build: b, race: 'human', cfg: c });
    var pool = WL.makeSimPool('../engine/worker.js', 2), h = null;
    h = pool.run(jobs, function () { got++; if (got === 1) h.stop(); }, function () { finished = true; });
    T.ok(h && typeof h.stop === 'function', 'run() gives back a stop handle');
    setTimeout(function () {
      T.group('Stop');
      T.eq(got, 1, 'no more results after Stop (jobs already on a worker are dropped)');
      T.ok(!finished, 'and no "done": the run is over without it');
      done();
    }, 4000);
  });

  T.run('round 177: the page', function () {
    var get = function (p) { try { var x = new XMLHttpRequest(); x.open('GET', p, false); x.send(); return x.responseText; } catch (e) { return ''; } };
    var src = get('../index.html'), app = get('../app/app.js');
    if (!src || !app) { T.warn('index.html / app.js could not be read (file://)'); return; }
    var has = function (s, t) { return (t || src).indexOf(s) >= 0; }, at = function (s) { return src.indexOf(s); };
    T.group('the Sim bar');
    T.ok(at('id="simBar"') > at('</header>') && at('id="simBar"') < at('class="cols"') && has('.simbar { position: sticky; top: 0;'), 'under the header, outside the columns, and it stays at the top while scrolling');
    T.ok(at('id="runBtn"') > at('id="simBar"') && at('id="statbar"') > at('id="simBar"') && at('id="simStatus"') > at('id="simBar"'), 'Sim!, the run\'s status and the stat chips are in it');
    T.ok(has("btn.textContent = running ? 'Stop' : 'Sim!'", app) && has("if (running) { if (stopCur) stopCur(); return; }", app), 'Sim! becomes Stop while running');
    T.ok(has("results = undo.results; runCfg = undo.runCfg; weights = undo.weights; prevRun = undo.prevRun;", app), 'Stop during the builds puts the run before back');
    T.ok(has('best so far', app) && has("' s left'", app) && has('Up to date', app) && has('Settings changed', app), 'progress (left, best so far) and the last run (up to date or not)');
    T.group('presets and defaults');
    // Round 181 (user: "just have all presets be a dropdown"): one Presets ▾ list — click loads, ✕ deletes, save at its bottom.
    T.ok(has('id="presetMore"') && has('id="presetList"') && has('data-pload=', app) && has('data-pdel=', app) && has('class="pmsave"'), 'presets: one dropdown — click loads, ✕ deletes your own, save at the bottom');
    T.ok(has('id="resetAll"') && has("if (!armed('resetAll')) return;", app), '"Restore all defaults" (two clicks)');
    T.group('damage by school, trees in colour');
    T.ok(has("function schoolOf(k, b)", app) && has("return b && b.pet === 'imp' ? 'fire' : 'shadow';", app) && has('--sch-shadow:') && has('--sch-fire:'), 'damage bars by school; Demonic Brand follows the pet');
    T.ok(has('class="dmgcell"', app) && has('Damage done', app), 'the details\' spell table has a damage bar per spell');
    T.ok(has('.tree.t-affliction') && has('.tree.t-demonology') && has('.tree.t-destruction') && has("'<div class=\"tree t-' + tr + '\">", app), 'talent trees in their own colour');
    T.group('a build\'s details');
    T.ok(has("tile('DPS'", app) && has("tile('Threat per second'", app) && has("tile('Casts per minute'", app) && has("tile('Time Life Tapping'", app), 'headline numbers: DPS, threat, casts per minute, time Life Tapping');
    T.ok(['overview', 'damage', 'fight', 'mana', 'stats', 'build', 'log'].every(function (k) { return has("['" + k + "', ", app); }) && has('data-dpanel=', app), 'seven tabs: Overview, Damage, DoTs & timeline, Mana & health, Stats, Talents & rotation, Log');
    T.group('build editor');
    T.ok(has('data-apltab="list"') && has('data-apltab="groups"') && has('data-apltab="vars"'), 'Advanced (APL): Priority list · Action groups · Variables');
    T.group('settings');
    T.ok(has('class="c btile"', app) && has('.btile:has(> input:checked)'), 'buffs and debuffs: compact tiles (icon + name), details on hover');
    T.ok(has('id="consBoxes" class="cslots"') && has('data-cslot=', app) && has('data-cpick=', app), 'consumables: one slot per group, click to pick');
    T.ok(has('\'<span hidden>\' + blk.keys.map(function (k) { return \'<input id="c_\' + k', app), '… the check boxes stay underneath (saving and codes unchanged)');
    T.group('welcome tour');
    T.ok(has('id="tourCard"') && has('id="tourLink"') && has("localStorage.getItem('wfs.tour')", app) && has("tourShow(0)", app), 'a welcome card on the first visit; "Tour" at the top starts it again');
    T.ok(['#simBar', '#buildPanel', '.charpanel', '#gearTop', '#editor', '#compare', '#layoutBtn'].every(function (s) { return has("['" + s + "'", app); }), 'one step per part of the page');
  });
})();
