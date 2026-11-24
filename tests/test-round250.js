// Round 250 tests — Revelation (weapon enchant 8217) after a live hotfix [A106]. The user, 2026-11-24: "ok so revelation
// was just hotfixed. it is now consumes on aoe ticks like hellfire. previously it would make the entire channel crit. it
// also now doesn't have a chance to trigger off of each individual hit from the aoe's but rather 1 chance per tick"; then
// for Drain Life / Wrack the user's pick "First tick only" ("Like Hellfire now: the first tick crits and uses up the
// charge; the other ticks don't crit").
//  * A channel tick (Hellfire, Rain of Fire, Drain Life, Drain Soul, Wrack) that comes while it is up takes it and spends it
//    ('used' Revelation for: the channel's spell, right before that tick): that one tick crits — an area tick on every
//    target it hits (an assumption: one tick event) — and the rest of the channel does not, unless a new trigger comes.
//  * A Hellfire / Rain of Fire tick rolls the trigger once (not once per target), after all its targets, when at least
//    one target took a landed hit that did not crit; the 'buff' Revelation line then follows that tick's lines.
//  * Direct hits, DoTs and curses: unchanged (round 243).
(function () {
  function det(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function wield(c, ench) { c.gearBuilder = { on: true, slots: { mainHand: { id: 1 } }, enchants: ench ? { mainHand: { id: ench } } : {}, manual: {} }; return c; }
  function base(k) { return String(k).replace(/^x\d:/, ''); }
  function isRev(e) { return e.spell === 'Revelation'; }
  function logs(b, c, n, dur) { var out = []; for (var s = 1; s <= n; s++) out.push(WL.simulateOnce(b, 'human', c, { seed: s, duration: dur || 180, log: true }).log); return out; }
  var tb = function (rot) { return { key: 't250', short: 't', name: 't', notes: '', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; };

  // The ticks of an area channel in a log, one entry per tick event: { t, n, lines (tick / miss lines, every target),
  // usedBefore (a 'used' Revelation for this spell right before it), buffAfter (number of 'buff' Revelation lines right
  // after it, at the same time) }.
  function aoeTicks(log, key) {
    var out = [], cur = null;
    log.forEach(function (e, i) {
      var mine = (e.type === 'tick' || e.type === 'miss') && base(e.spell) === key && e.n;
      if (mine) {
        if (!cur || cur.t !== e.t || cur.n !== e.n) {
          var pv = log[i - 1];
          cur = { t: e.t, n: e.n, lines: [], usedBefore: !!(pv && pv.type === 'used' && isRev(pv) && pv.for === key && pv.t === e.t), buffAfter: 0, idx: out.length };
          out.push(cur);
        }
        cur.lines.push(e); return;
      }
      if (cur && e.type === 'buff' && isRev(e) && e.t === cur.t) { cur.buffAfter++; return; }
      if (e.type !== 'buff' && e.type !== 'used') cur = null;
    });
    return out;
  }
  function landedPlain(tk) { return tk.lines.some(function (e) { return e.type === 'tick' && !e.crit; }); }

  function aoeRules(key, rot) {
    T.group(key + ': one trigger roll per tick, 1 vs 3 targets');
    var rates = {};
    [1, 3].forEach(function (nt) {
      var c = wield(det(function (x) { x.fight.targets = nt; x.fight.healAmount = 2000; }), 8217), b = tb(rot);
      var C = WL.computeStats(b, 'human', c).critPct, p = WL.revelationChancePct(c.combat, C) / 100;
      var elig = 0, trig = 0, twice = 0, badTrig = 0;
      logs(b, c, 40).forEach(function (log) {
        aoeTicks(log, key).forEach(function (tk) {
          if (tk.buffAfter > 1) twice++;
          var ok = !tk.usedBefore && landedPlain(tk);
          if (ok) { elig++; trig += tk.buffAfter ? 1 : 0; } else if (tk.buffAfter) badTrig++;
        });
      });
      var r = trig / elig, se = Math.sqrt(p * (1 - p) / elig), pk = 1 - Math.pow(1 - p, nt);
      rates[nt] = r;
      T.ok(elig > 500, nt + ' target' + (nt > 1 ? 's' : '') + ': ticks with a landed hit that did not crit: ' + elig);
      T.eq(twice, 0, nt + ' target(s): never two triggers from one tick');
      T.eq(badTrig, 0, nt + ' target(s): no trigger from a tick that took it or had no landed hit that did not crit');
      T.near(r, p, 4 * se, nt + ' target(s): ' + trig + ' triggers / ' + elig + ' ticks = ' + (r * 100).toFixed(2) + '% per tick vs ' + (p * 100).toFixed(2) + '% (± ' + (4 * se * 100).toFixed(2) + ')');
      if (nt > 1) T.ok(Math.abs(r - pk) > 4 * se, '… and not one roll per target hit: 1 − (1 − p)^' + nt + ' = ' + (pk * 100).toFixed(2) + '% (rounds 243–249)');
    });

    T.group(key + ': a tick takes the charge and spends it (3 targets)');
    var c3 = wield(det(function (x) { x.fight.targets = 3; x.fight.healAmount = 2000; x.combat.revelationChancePct = 100; }), 8217);
    var used = 0, allCrit = true, allRev = true, nextPlain = 0, nextRev = 0, sameTickBuff = 0, orphan = 0, revNoUse = 0, held = 0;
    logs(tb(rot), c3, 20).forEach(function (log) {
      var tks = aoeTicks(log, key);
      tks.forEach(function (tk, j) {
        var anyRev = tk.lines.some(function (e) { return e.rev; });
        if (anyRev && !tk.usedBefore) revNoUse++;
        if (!tk.usedBefore) return;
        used++;
        tk.lines.forEach(function (e) { if (e.type === 'tick') { if (!e.crit) allCrit = false; if (!e.rev) allRev = false; } });
        if (tk.buffAfter) sameTickBuff++;
        var nx = tks[j + 1];
        if (nx && nx.n === tk.n + 1) {                        // the next tick of the same channel
          if (nx.usedBefore || nx.lines.some(function (e) { return e.rev; })) nextRev++; else nextPlain++;
        }
      });
      // every use follows a trigger since the last use (nothing holds it, nothing reuses it)
      var up = false;
      log.forEach(function (e) {
        if (e.type === 'buff' && isRev(e)) up = true;
        else if (e.type === 'used' && isRev(e)) { if (!up) orphan++; up = false; }
      });
      // the old rule: a channel holding it — two ticks in a row with it
      tks.forEach(function (tk, j) { var nx = tks[j + 1]; if (nx && nx.n === tk.n + 1 && tk.usedBefore && nx.lines.some(function (e) { return e.rev; }) && !nx.usedBefore) held++; });
    });
    T.ok(used > 50, 'ticks that took it: ' + used);
    T.ok(allRev && allCrit, 'such a tick has it and crits on every target it hits (assumed: one tick event)');
    T.eq(revNoUse, 0, 'no tick has it without taking it (a "used" line right before it)');
    T.eq(sameTickBuff, 0, 'a tick that took it does not trigger it again (it crit on every target)');
    T.ok(nextPlain > 20 && nextRev === 0, 'the next tick of that channel does not have it (' + nextPlain + ' ticks): it was spent, and a tick that took it rolls no new one');
    T.eq(held, 0, 'no channel holds it any more (rounds 243–249: every later tick crit)');
    T.eq(orphan, 0, 'every use follows its own trigger');
    return rates;
  }

  T.run('round 250: Revelation on Hellfire and Rain of Fire ticks (hotfix)', function () {
    aoeRules('hellfire', ['lifeTapNeed', 'hellfire']);
    aoeRules('rainOfFire', ['lifeTapNeed', 'rainOfFire']);
  });

  T.run('round 250: Revelation on Drain Life and Wrack ("First tick only")', function () {
    // channels: { key, ticks: [tick lines], usedAt: index of the tick that took it, or -1 }
    function chans(log, key) {
      var out = [], ch = null;
      log.forEach(function (e, i) {
        if (ch && (e.type === 'cast' || e.type === 'clip' || e.type === 'recast')) { out.push(ch); ch = null; }
        if (e.type === 'cast' && e.channel && e.spell === key) ch = { ticks: [], usedAt: -1, bad: 0 };
        else if (ch && e.type === 'tick' && e.spell === key) {
          var pv = log[i - 1];
          if (pv && pv.type === 'used' && isRev(pv) && pv.for === key && pv.t === e.t) { if (ch.usedAt >= 0) ch.bad++; ch.usedAt = ch.ticks.length; }
          ch.ticks.push(e);
        }
      });
      if (ch) out.push(ch);
      return out;
    }
    [['Drain Life (Immolate\'s direct hit triggers it, Drain Life\'s first tick takes it)', tb(['lifeTapNeed', 'immolate', 'drainLife']), 'drainLife'],
     ['Wrack (Wrack DS)', sheet('wrack_ds'), 'wrack']].forEach(function (x) {
      T.group(x[0]);
      var c = wield(det(function (y) { y.combat.revelationChancePct = 100; }), 8217);
      var took = 0, firstOnly = true, critOk = true, laterRev = 0, laterTicks = 0, laterCrit = 0, twice = 0, trig = 0;
      logs(x[1], c, 20).forEach(function (log) {
        log.forEach(function (e, i) {                         // a trigger line next to one of its ticks (before or after it)
          if (e.type === 'buff' && isRev(e) && [log[i - 1], log[i + 1]].some(function (n) { return n && n.type === 'tick' && n.spell === x[2] && n.t === e.t; })) trig++;
        });
        chans(log, x[2]).forEach(function (ch) {
          twice += ch.bad;
          if (ch.usedAt < 0) { if (ch.ticks.some(function (t) { return t.rev; })) firstOnly = false; return; }
          took++;
          if (ch.usedAt !== 0) firstOnly = false;
          var t0 = ch.ticks[ch.usedAt];
          if (!t0.rev || !t0.crit) critOk = false;
          ch.ticks.slice(ch.usedAt + 1).forEach(function (t) { laterTicks++; if (t.rev) laterRev++; if (t.crit) laterCrit++; });
        });
      });
      T.ok(took > 10, 'channels that took it: ' + took);
      T.ok(firstOnly && twice === 0, 'the first tick takes it (it was up when the channel started; nothing triggers it during the channel)');
      T.ok(critOk, 'that tick crits');
      T.ok(laterTicks > 30 && laterRev === 0 && laterCrit < laterTicks * 0.5, 'the other ticks of that channel do not have it (' + laterTicks + ' ticks, ' + laterCrit + ' crit at the normal chance)');
      T.eq(trig, 0, x[2] + ' ticks never trigger it (unchanged)');
    });
  });

  T.run('round 250: direct hits unchanged', function () {
    var c = wield(det(function (x) { x.combat.revelationChancePct = 100; }), 8217), used = 0, crit = 0;
    logs(sheet('demo_pact_succ_sb'), c, 5).forEach(function (log) {
      log.forEach(function (e) { if (e.type === 'hit' && e.rev) { used++; if (e.crit) crit++; } });
    });
    T.ok(used > 20 && crit === used, 'a direct spell that took it still crits when it lands (' + crit + ' / ' + used + ')');
  });
})();
