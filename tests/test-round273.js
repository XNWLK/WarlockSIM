// Round 273 tests — the user, 2026-11-27: "yes add curses". A Warcraft Logs report (Forever, Stratholme, one Warlock
// wearer, 40 procs; round 272) showed Draconic Infused Emblem (22268) proccing 8 ms after a Curse of the Elements cast:
// its tooltip's "on harmful spellcast" includes your curses. data/trinkets.js: proc.onCurse; engine/sim.js trOnCurse rolls
// it on a landed Curse of the Elements (any target) and on Bane of Havoc's cast. [A113]
(function () {
  var EMB = 22268;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function bld(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function run(onCurse, seed) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0;
    c.gearBuilder = { on: true, slots: { trinket1: { id: EMB } }, manual: {}, enchants: {} };
    var p = WL.TRINKET_FX[EMB].proc, keep = p.onCurse;
    p.onCurse = onCurse;
    try { return WL.simulateOnce(bld('demo_pact_fire'), 'human', c, { seed: seed, duration: 600, log: true }); } finally { p.onCurse = keep; }
  }
  // An Emblem buff that starts right after a landed Curse of the Elements (nothing else landed in between).
  function afterCurse(r) {
    var n = 0, last = null;
    r.log.forEach(function (e) {
      if (e.type === 'buff' && e.spell === 'Draconic Infused Emblem' && last === 'curseOfElements') n++;
      if (e.type === 'debuff' || e.type === 'hit' || e.type === 'miss' || e.type === 'cast') last = e.spell;
    });
    return n;
  }

  T.run('round 273: Draconic Infused Emblem rolls on your curses', function () {
    T.group('the data');
    var p = WL.TRINKET_FX[EMB] && WL.TRINKET_FX[EMB].proc;
    T.ok(p && p.kind === 'sp' && p.chancePct === 8 && p.sp === 35 && p.duration === 10 && !p.icd, '8% per harmful cast, +35 spell power for 10 s, no internal cooldown (the log of round 272: 6.8%, 95% 5.0–9.1%, gaps down to 1.5 s)');
    T.ok(p && p.onCurse === true, 'onCurse: curse casts roll it too');
    var others = Object.keys(WL.TRINKET_FX).filter(function (k) { var q = WL.TRINKET_FX[k].proc; return q && q.onCurse && +k !== EMB; });
    T.eq(others.length, 0, 'no other trinket rolls on curses');

    T.group('in the fight (Fire Demo, 40 × 600 s)');
    var on = 0, off = 0;
    for (var sd = 1; sd <= 40; sd++) { on += afterCurse(run(true, sd)); off += afterCurse(run(false, sd)); }
    T.ok(on > 0, 'with onCurse: ' + on + ' Emblem procs right after a Curse of the Elements');
    T.eq(off, 0, 'without it: none');

    T.group('the source');
    var s = src('../engine/sim.js');
    if (s) T.ok(/function trOnCurse\(key\)/.test(s) && /if \(TRC\) trOnCurse\('baneOfHavoc'\)/.test(s) && (s.match(/if \(TRC\) trOnCurse\(key\)/g) || []).length === 2, 'engine/sim.js: trOnCurse on Curse of the Elements (main and extra targets) and on Bane of Havoc\'s cast');
  });
})();
