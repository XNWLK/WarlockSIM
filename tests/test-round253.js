// Round 253 tests — Revelation (weapon enchant 8217): which hit of a Hellfire / Rain of Fire tick decides its one trigger
// roll [A106]. Public evidence notes (a log study of Revelation wearers, Forever, hotfixes 2026-11-24 20:54 and
// 2026-11-25 01:13 UTC): a hit event rolls once however many targets it strikes, and its first result is that roll —
// when the first result crits, the event rolls nothing. The user: "yea change it but keep the old system written down so
// we can go back to it if we need to"; then "dont need it as a setting, just somewhere in the md".
//  * engine/sim.js aoeTick: the one roll needs the tick's FIRST LANDED hit (the first target that did not miss) not to
//    crit, and the tick not to have taken the charge. A tick that misses every target rolls nothing.
//  * Rounds 250–252 rolled when ANY landed hit of the tick did not crit; MECHANICS.md (Revelation, "Old rule") keeps it.
// The hit, crit and proc random streams are replaced by scripted ones (WL.makeRng spied for the three stream seeds), so
// every tick's targets miss / land / crit in a set pattern, and each call of the proc stream is one trigger roll (with
// only Hellfire / Rain of Fire cast and Revelation the only effect that rolls it).
(function () {
  var SEED = 253, OFF = { hit: 0x1B873593, crit: 0x85EBCA6B, proc: 0xC2B2AE35 };   // engine/sim.js: the stream seeds
  var LAND = 0, MISS = 0.9999, CRIT = 0, PLAIN = 0.9999;                             // R.hit / R.crit values
  function det(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function wield(c) { c.gearBuilder = { on: true, slots: { mainHand: { id: 1 } }, enchants: { mainHand: { id: 8217 } }, manual: {} }; return c; }
  function base(k) { return String(k).replace(/^x\d:/, ''); }
  function isRev(e) { return e.spell === 'Revelation'; }
  var tb = function (rot) { return { key: 't253', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; };

  // One fight on 3 targets with scripted streams: hits[] = one value per target (cycled tick after tick), crits[] = one value
  // per landed hit (cycled), proc = the value of every trigger roll. Returns { log, rolls }.
  function run(rot, hits, crits, proc) {
    var real = WL.makeRng, rolls = 0;
    function cyc(a) { var i = 0; return function () { return a[i++ % a.length]; }; }
    WL.makeRng = function (seed) {
      var s = seed >>> 0;
      if (s === ((SEED ^ OFF.hit) >>> 0)) return cyc(hits);
      if (s === ((SEED ^ OFF.crit) >>> 0)) return cyc(crits);
      if (s === ((SEED ^ OFF.proc) >>> 0)) return function () { rolls++; return proc; };
      return real(seed);
    };
    try {
      var c = wield(det(function (x) { x.fight.targets = 3; x.fight.multiDot = false; x.fight.healAmount = 5000; }));
      var log = WL.simulateOnce(tb(rot), 'human', c, { seed: SEED, duration: 20, log: true }).log;
    } finally { WL.makeRng = real; }
    return { log: log, rolls: rolls };
  }
  // the ticks of an area channel: { lines (tick / miss lines, target order), usedBefore, buffAfter } (as round 250's tests)
  function aoeTicks(log, key) {
    var out = [], cur = null;
    log.forEach(function (e, i) {
      if ((e.type === 'tick' || e.type === 'miss') && base(e.spell) === key && e.n) {
        if (!cur || cur.t !== e.t || cur.n !== e.n) {
          var pv = log[i - 1];
          cur = { t: e.t, n: e.n, lines: [], usedBefore: !!(pv && pv.type === 'used' && isRev(pv) && pv.for === key && pv.t === e.t), buffAfter: 0 };
          out.push(cur);
        }
        cur.lines.push(e); return;
      }
      if (cur && e.type === 'buff' && isRev(e) && e.t === cur.t) { cur.buffAfter++; return; }
      if (e.type !== 'buff' && e.type !== 'used') cur = null;
    });
    return out;
  }
  // a tick's pattern as text: per target 'm' (miss), 'c' (crit) or 'p' (landed, no crit)
  function pat(tk) { return tk.lines.map(function (e) { return e.type === 'miss' ? 'm' : e.crit ? 'c' : 'p'; }).join(''); }
  function allAre(tks, p) { return tks.length > 0 && tks.every(function (tk) { return pat(tk) === p; }); }

  [['hellfire', ['hellfire']], ['rainOfFire', ['rainOfFire']]].forEach(function (x) {
    var key = x[0], rot = x[1];
    T.run('round 253: ' + key + ' — the first landed hit of a tick decides its one trigger roll', function () {
      T.group(key + ': first landing crits, the second does not');
      var a = run(rot, [LAND, LAND, LAND], [CRIT, PLAIN, PLAIN], 0.9999), ta = aoeTicks(a.log, key);
      T.ok(ta.length >= 10 && allAre(ta, 'cpp'), 'every tick: target 1 crits, targets 2 and 3 land without a crit (' + ta.length + ' ticks)');
      T.eq(a.rolls, 0, 'no trigger roll at all (the first result crit)');
      T.ok(ta.every(function (tk) { return tk.lines.some(function (e) { return e.type === 'tick' && !e.crit; }); }),
        '… though every tick had a landed hit that did not crit: the old rule (rounds 250–252, MECHANICS.md "Old rule") would have rolled ' + ta.length + ' times');

      T.group(key + ': first target misses, the second lands without a crit');
      var b = run(rot, [MISS, LAND, LAND], [PLAIN, CRIT], 0.9999), tbk = aoeTicks(b.log, key);
      T.ok(tbk.length >= 10 && allAre(tbk, 'mpc'), 'every tick: target 1 misses, target 2 lands without a crit, target 3 crits (' + tbk.length + ' ticks)');
      T.eq(b.rolls, tbk.length, 'one trigger roll per tick: a miss is no landing, so target 2 is the first result');

      T.group(key + ': first landing does not crit, the others do');
      var d = run(rot, [LAND, LAND, LAND], [PLAIN, CRIT, CRIT], 0.9999), td = aoeTicks(d.log, key);
      T.ok(td.length >= 10 && allAre(td, 'pcc'), 'every tick: p c c (' + td.length + ' ticks)');
      T.eq(d.rolls, td.length, 'one trigger roll per tick, not one per target');

      T.group(key + ': every target misses');
      var m = run(rot, [MISS, MISS, MISS], [PLAIN], 0.9999), tm = aoeTicks(m.log, key);
      T.ok(tm.length >= 10 && allAre(tm, 'mmm'), 'every tick misses every target (' + tm.length + ' ticks)');
      T.eq(m.rolls, 0, 'no landing, no trigger roll');

      T.group(key + ': a tick that takes the charge does not roll');
      var g = run(rot, [LAND, LAND, LAND], [PLAIN, PLAIN, PLAIN], 0), tg = aoeTicks(g.log, key);   // every roll triggers it
      var took = tg.filter(function (tk) { return tk.usedBefore; }), rest = tg.filter(function (tk) { return !tk.usedBefore; });
      T.ok(took.length >= 4 && rest.length >= 4, 'ticks that took it: ' + took.length + ', ticks that did not: ' + rest.length);
      T.ok(took.every(function (tk) { return pat(tk) === 'ccc' && tk.lines.every(function (e) { return e.rev; }); }), 'a tick that took it crits on every target');
      T.ok(took.every(function (tk) { return tk.buffAfter === 0; }), 'and triggers no new one');
      T.ok(rest.every(function (tk) { return pat(tk) === 'ppp' && tk.buffAfter === 1; }), 'every other tick lands without a crit and triggers it once');
      T.eq(g.rolls, rest.length, 'trigger rolls = the ticks that did not take it (' + g.rolls + ')');
    });
  });
})();
