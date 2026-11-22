// Round 243 tests — Revelation (weapon enchant 8217), the user's choices [A106]:
//  * "Chance 11% × (1 − 2C)": a trigger roll at 11% × max(0, 1 − 2 × crit) (combat.revelationChancePct 11,
//    combat.revelationCritFactor 2; WL.revelationChancePct), fitted to players' in-game counts;
//  * from a public log study of Warcraft Logs reports (Forever 1.60.1.70862–70959): "Channel ticks all crit" (while it is
//    up every channel tick crits; the channel holds it and it is spent when the channel ends), "Hellfire/RoF ticks roll it"
//    (each landed tick that does not crit, on each target), "Spent at the cast" (a direct spell takes it when its cast
//    completes and crits on landing, even after travel time; DoTs / curses neither use nor spend it).
// Log fields read here: a 'buff' Revelation line comes right before the hit / tick that triggered it; 'used'
// Revelation (for: the spell) when a cast takes it; hits and ticks that had it carry rev: true.
(function () {
  function det(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function wield(c, ench) { c.gearBuilder = { on: true, slots: { mainHand: { id: 1 } }, enchants: ench ? { mainHand: { id: ench } } : {}, manual: {} }; return c; }
  function base(k) { return String(k).replace(/^x\d:/, ''); }
  function kindOf(k) { var s = WL.SPELLS[base(k)]; return s ? s.kind : ''; }
  function direct(k) { var kd = kindOf(k); return kd === 'direct' || kd === 'hybrid'; }
  function isRev(e) { return e.spell === 'Revelation'; }
  function logs(b, c, n, dur) { var out = []; for (var s = 1; s <= n; s++) out.push(WL.simulateOnce(b, 'human', c, { seed: s, duration: dur || 180, log: true }).log); return out; }
  var tb = function (rot) { return { key: 't243', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; };

  T.run('round 243: Revelation chance 11% × (1 − 2C)', function () {
    var cb = WL.DEFAULT_CONFIG.combat;
    T.group('the chance');
    T.eq(cb.revelationChancePct, 11, 'combat.revelationChancePct 11 (the enchant\'s value in the game files)');
    T.eq(cb.revelationCritFactor, 2, 'combat.revelationCritFactor 2 (fitted to players\' counts)');
    [[0, 11], [6, 9.68], [25, 5.5], [50, 0], [60, 0]].forEach(function (x) {
      T.near(WL.revelationChancePct(cb, x[0]), x[1], 1e-9, x[0] + '% crit → ' + x[1] + '%');
    });
    T.near(WL.revelationChancePct({ revelationChancePct: 10 }, 20), 8, 1e-9, 'a config without the crit factor: × (1 − crit), as in rounds 167–242');
    T.eq(WL.revelationChancePct({ revelationChancePct: 0, revelationCritFactor: 2 }, 5), 0, 'chance 0: never');
    var seen = 58 + 97 + 52, exp = 600 * WL.revelationChancePct(cb, 6) / 100 + 1000 * WL.revelationChancePct(cb, 3.5) / 100 + 700 * WL.revelationChancePct(cb, 13.5) / 100;
    T.near(exp, 216.6, 0.1, 'the players\' counts: ' + exp.toFixed(1) + ' expected in 2,300 casts that did not crit (seen ' + seen + ')');
    var code = WL.encodeSettings(det()), back = det(function (c) { c.combat.revelationChancePct = 3; c.combat.revelationCritFactor = 5; });
    WL.applySettings(back, WL.decodeSettings(code));
    T.ok(back.combat.revelationChancePct === 3 && back.combat.revelationCritFactor === 5, 'settings codes do not carry the Revelation settings (old codes keep the defaults)');

    T.group('measured rate of direct hits at a fixed crit');
    var b = sheet('demo_pact_succ_sb');
    var c = wield(det(function (x) { x.gear.critPct = 16; }), 8217);
    var C = WL.computeStats(b, 'human', c).critPct, p = WL.revelationChancePct(c.combat, C) / 100;
    var elig = 0, trig = 0, badTrig = 0, revHits = 0, revCrit = 0;
    logs(b, c, 70, 600).forEach(function (log) {
      log.forEach(function (e, i) {
        if (e.type === 'buff' && isRev(e)) { trig++; var nx = log[i + 1]; if (!(nx && nx.type === 'hit' && direct(nx.spell) && !nx.crit && !nx.rev)) badTrig++; return; }
        if (e.type !== 'hit' || !direct(e.spell)) return;
        if (e.rev) { revHits++; if (e.crit) revCrit++; } else if (!e.crit) elig++;
      });
    });
    var rate = trig / elig, se = Math.sqrt(p * (1 - p) / elig);
    T.ok(elig > 8000, 'enough casts that did not crit: ' + elig);
    T.near(rate, p, 4 * se, 'crit ' + C.toFixed(2) + '%: ' + trig + ' triggers / ' + elig + ' = ' + (rate * 100).toFixed(2) + '% vs 11% × (1 − 2C) = ' + (p * 100).toFixed(2) + '% (± ' + (4 * se * 100).toFixed(2) + ')');
    var pOld = WL.revelationChancePct({ revelationChancePct: 11, revelationCritFactor: 1 }, C) / 100;
    T.ok(Math.abs(rate - pOld) > 4 * se, '… and not 11% × (1 − C) = ' + (pOld * 100).toFixed(2) + '%');
    T.eq(badTrig, 0, 'every trigger comes from a direct hit that landed, did not crit and did not have it');
    T.ok(revHits > 100 && revCrit === revHits, 'a direct hit that took it always crits (' + revCrit + ' / ' + revHits + ')');
  });

  // Every channel in a log: { key, ticks: [tick lines], after: index of the line that ended it }.
  function channels(log) {
    var out = [], ch = null;
    log.forEach(function (e, i) {
      if (ch && (e.type === 'cast' || e.type === 'clip' || e.type === 'recast')) { ch.after = i; out.push(ch); ch = null; }
      if (e.type === 'cast' && e.channel) ch = { key: e.spell, ticks: [] };
      else if (ch && e.type === 'tick' && base(e.spell) === ch.key) ch.ticks.push(e);
    });
    return out;
  }
  // After a channel that held it, nothing uses it until a new trigger.
  function goneAfter(log, ch) {
    for (var j = ch.after; j < log.length; j++) {
      var e = log[j];
      if (e.type === 'buff' && isRev(e)) return true;
      if (e.rev || (e.type === 'used' && isRev(e))) return false;
    }
    return true;
  }

  T.run('round 243: Revelation rules from the log study', function () {
    T.group('"Channel ticks all crit": Wrack');
    var wc = wield(det(function (c) { c.combat.revelationChancePct = 100; }), 8217), held = 0, allCrit = true, gone = true, wrackTrig = 0, holdAll = true;
    logs(sheet('wrack_ds'), wc, 20).forEach(function (log) {
      log.forEach(function (e, i) { if (e.type === 'buff' && isRev(e) && log[i + 1] && log[i + 1].type === 'tick') wrackTrig++; });
      channels(log).forEach(function (ch) {
        var first = -1; ch.ticks.forEach(function (t, j) { if (t.rev && first < 0) first = j; });
        if (first < 0) return;
        held++;
        ch.ticks.slice(first).forEach(function (t) { if (!t.rev) holdAll = false; if (!t.crit) allCrit = false; });
        if (!goneAfter(log, ch)) gone = false;
      });
    });
    T.ok(held > 20, 'Wrack channels with Revelation up: ' + held);
    T.ok(holdAll && allCrit, 'from the first tick it is up on, every tick of that channel has it and crits');
    T.ok(gone, 'spent when the channel ends: nothing has it afterwards until a new trigger');
    T.eq(wrackTrig, 0, 'channel and DoT ticks (Wrack, Corruption, Bane of Agony, Siphon Life) never trigger it');

    T.group('"Hellfire/RoF ticks roll it": Hellfire on 3 targets');
    var hb = tb(['lifeTapNeed', 'hellfire']), hc = wield(det(function (c) { c.fight.targets = 3; }), 8217);
    var Ch = WL.computeStats(hb, 'human', hc).critPct, ph = WL.revelationChancePct(hc.combat, Ch) / 100;
    var byT = { 1: 0, 2: 0, 3: 0 }, hEl = 0, hTrig = 0, hBad = 0, hHeld = 0, hAll = true, hGone = true;
    logs(hb, hc, 30).forEach(function (log) {
      log.forEach(function (e, i) {
        if (e.type === 'buff' && isRev(e)) {
          hTrig++; var nx = log[i + 1];
          if (!(nx && nx.type === 'tick' && base(nx.spell) === 'hellfire' && !nx.crit && !nx.rev)) hBad++;
          else byT[/^x(\d):/.test(nx.spell) ? +RegExp.$1 : 1]++;
        }
        if (e.type === 'tick' && base(e.spell) === 'hellfire' && !e.crit && !e.rev) hEl++;
      });
      channels(log).forEach(function (ch) {
        var first = -1; ch.ticks.forEach(function (t, j) { if (t.rev && first < 0) first = j; });
        if (first < 0) return;
        hHeld++; ch.ticks.slice(first).forEach(function (t) { if (!t.rev || !t.crit) hAll = false; });
        if (!goneAfter(log, ch)) hGone = false;
      });
    });
    T.eq(hBad, 0, 'every trigger comes from a Hellfire tick that landed and did not crit');
    T.ok(byT[1] > 0 && byT[2] > 0 && byT[3] > 0, 'triggers on each target: ' + byT[1] + ' / ' + byT[2] + ' / ' + byT[3]);
    var hr = hTrig / hEl, hse = Math.sqrt(ph * (1 - ph) / hEl);
    T.near(hr, ph, 4 * hse, 'per tick: ' + (hr * 100).toFixed(2) + '% vs ' + (ph * 100).toFixed(2) + '% (± ' + (4 * hse * 100).toFixed(2) + ', ' + hEl + ' ticks)');
    T.ok(hHeld > 10 && hAll, 'a trigger from a tick: the rest of that channel (every target) crits (' + hHeld + ' channels)');
    T.ok(hGone, '… and it is spent when that channel ends');

    T.group('"Spent at the cast": travel time 1 s (Shadow Demo) and 2 s (Fire Demo)');
    var okHit = true, okCons = true, used = 0, inFlight = 0, inFlightRev = 0, missUsed = 0, dotFor = 0;
    [['demo_pact_succ_sb', 1], ['demo_pact_fire', 2]].forEach(function (bt) {
    var TR = bt[1], tc = wield(det(function (c) { c.combat.revelationChancePct = 100; c.fight.travelMs = TR * 1000; }), 8217);
    logs(sheet(bt[0]), tc, 30).forEach(function (log) {
      var cons = log.filter(function (e) { return e.type === 'used' && isRev(e); });
      cons.forEach(function (x) {
        used++;
        if (!direct(x.for)) dotFor++;
        var proj = WL.SPELLS[x.for].projectile, at = x.t + (proj ? TR : 0);
        if (at > 180 - 1e-6) return;                                // the fight ends before it lands
        var land = log.filter(function (e) { return (e.type === 'hit' || e.type === 'miss') && e.spell === x.for && Math.abs(e.t - at) < 1e-6; });
        if (!land.length) okCons = false;
        else if (land.some(function (e) { return e.type === 'miss'; }) && !land.some(function (e) { return e.rev; })) missUsed++;
        if (proj) log.forEach(function (e) {                        // other spells landing while it flies: not with it
          if (e.type === 'hit' && e.t > x.t + 1e-6 && e.t < at - 1e-6 && e.spell === 'searingPain') { inFlight++; if (e.rev) inFlightRev++; }
        });
      });
      log.forEach(function (e) {
        if (e.type !== 'hit' || !e.rev) return;
        var proj = WL.SPELLS[base(e.spell)].projectile, at = e.t - (proj ? TR : 0);
        if (!cons.some(function (x) { return x.for === base(e.spell) && Math.abs(x.t - at) < 1e-6; })) okHit = false;
      });
    });
    });
    T.ok(used > 100, 'casts that took it: ' + used);
    T.ok(okHit, 'every hit with it was cast with it up: taken when its cast completed (a projectile: its travel time before it lands)');
    T.ok(okCons, 'every cast that took it lands (or misses) at that time');
    T.ok(inFlight > 0 && inFlightRev === 0, 'a Searing Pain landing while a projectile that took it flies (Shadow Bolt, Soul Fire, Death Coil) does not get it (' + inFlight + ')');
    T.eq(dotFor, 0, 'only direct spells take it (not Corruption, curses, Life Tap)');
    T.ok(missUsed > 0, 'a cast that took it and missed: spent all the same (' + missUsed + ')');

    T.group('Immolate and DoT ticks');
    var ic = wield(det(function (c) { c.combat.revelationChancePct = 100; }), 8217), immRev = 0, immTickRev = 0, immTicks = 0, immTickCrit = 0, dotTrig = 0;
    logs(sheet('destro_incin_succ'), ic, 20).forEach(function (log) {
      log.forEach(function (e, i) {
        if (e.type === 'hit' && e.spell === 'immolate' && e.rev) immRev++;
        if (e.type === 'tick' && kindOf(e.spell) !== 'channel') { if (e.rev) immTickRev++; if (e.spell === 'immolate') { immTicks++; if (e.crit) immTickCrit++; } }
        if (e.type === 'buff' && isRev(e) && log[i + 1] && log[i + 1].type === 'tick') dotTrig++;
      });
    });
    T.ok(immRev > 0, 'Immolate\'s direct hit takes it and crits (' + immRev + ')');
    T.ok(immTickRev === 0 && immTicks > 100 && immTickCrit < immTicks * 0.5, 'Immolate\'s and the other DoTs\' ticks never have it (Immolate ticks crit ' + immTickCrit + ' / ' + immTicks + ')');
    T.eq(dotTrig, 0, 'DoT ticks (Immolate, Corruption, Bane of Agony) never trigger it');

    T.group('without Revelation: nothing changes');
    var plain = det(), r1 = WL.simulateOnce(sheet('destro_incin_succ'), 'human', plain, { seed: 3, duration: 180, log: true });
    T.ok(!r1.log.some(function (e) { return e.rev || isRev(e); }), 'no Revelation lines or flags without the enchant');
  });
})();
