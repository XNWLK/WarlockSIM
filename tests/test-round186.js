// Round 186 tests (user): SM Ruin off the sheet, Wrack Succubus replaced by Wrack DS, Incinerate DS added; the condition
// "time since you last spent mana" (the 5-second rule); the decision search hook of the engine (tools/explore-oracle.js).
(function () {
  function det(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.findBuild(k))); }
  T.run('round 186: Wrack DS, Incinerate DS, time since mana spent, decision search', function () {
    T.group('the sheet');
    var own = WL.BUILDS.filter(function (b) { return !b.custom; });
    T.eq(own.map(function (b) { return b.short; }).join(' | '), 'Shadow Demo | Fire Demo | Incinerate Pandemic | Incinerate DS | Wrack DS', 'five builds (round 191: three renamed)');
    ['sm_ruin_classic', 'wrack_succubus'].forEach(function (k) { var b = WL.findBuild(k); T.ok(!!b && WL.RETIRED_BUILDS.indexOf(b) >= 0, k + ' is a test fixture now'); });
    var split = function (b) { var s = { affliction: 0, demonology: 0, destruction: 0 }; Object.keys(b.talents).forEach(function (t) { s[WL.TALENT_BY_KEY[t].tree] += b.talents[t]; }); return s.affliction + '/' + s.demonology + '/' + s.destruction; };
    var w = WL.findBuild('wrack_ds'), d = WL.findBuild('destro_incin_ds');
    T.eq(split(w), '35/11/5', 'Wrack DS 35/11/5 (the user\'s code)');
    T.eq(split(d), '7/11/33', 'Incinerate DS 7/11/33 (the user\'s code)');
    T.ok(w.pet === null && w.sacrifice === 'imp' && w.oil === 'spellstone', 'Wrack DS: Imp sacrificed, no demon, Spellstone');
    T.ok(d.pet === null && d.sacrifice === 'succubus' && d.oil === 'firestone', 'Incinerate DS: Succubus sacrificed, no demon, Firestone');
    T.eq(WL.validateBuild(w).concat(WL.validateBuild(d)).join(' | '), '', 'both are legal builds');
    T.ok(!/round|A\d{2,3}\b|\.js/.test(w.notes + d.notes), 'build notes say nothing internal');
    // the user's codes decode to the same talents
    var codeW = 'WFB1:eyJ2IjoxLCJzaG9ydCI6IldyYWNrIFNhYyIsInRhbGVudHMiOnsic3VwcHJlc3Npb24iOjUsImltcHJvdmVkQ29ycnVwdGlvbiI6NSwiaW1wcm92ZWRMaWZlVGFwIjoyLCJwYW5kZW1pYyI6MywiYW1wbGlmeUN1cnNlIjoxLCJtYWxldm9sZW5jZSI6NSwic2lwaG9uTGlmZSI6MSwic2hhZG93TWFzdGVyeSI6NSwic291bFNpcGhvbiI6Mywid3JhY2siOjEsImltcHJvdmVkQmFuZU9mQWdvbnkiOjIsImRlbW9uaWNFbWJyYWNlIjo1LCJmZWxWaXRhbGl0eSI6MywiZGVtb25pY0FlZ2lzIjoyLCJkZW1vbmljU2FjcmlmaWNlIjoxLCJpbXByb3ZlZFNoYWRvd0JvbHQiOjUsIm5pZ2h0ZmFsbCI6Mn0sInBldCI6bnVsbCwic2FjcmlmaWNlIjoiaW1wIiwib2lsIjoic3BlbGxzdG9uZSIsInJvdGF0aW9uIjpbImRlYXRoQ29pbEZpbmlzaGVyIiwiYmFuZSIsInNoYWRvd1RyYW5jZSIsImNvcnJ1cHRpb24iLCJjdXJzZU9mRWxlbWVudHMiLCJsaWZlVGFwTmVlZCIsIndyYWNrIl0sInAiOnsibGlmZVRhcE5lZWQiOnsicGN0Ijo2MCwic2VjIjoyNX19fQ==';
    var cw = WL.decodeBuild(codeW);
    T.ok(cw && Object.keys(cw.talents).every(function (k) { return cw.talents[k] === w.talents[k]; }) && Object.keys(w.talents).length === Object.keys(cw.talents).length, 'Wrack DS talents = the user\'s code');

    T.group('time since you last spent mana');
    T.eq(WL.condText({ t: 'fsr', op: '>=', v: 6 }), 'time since you last spent mana >= 6 s', 'in words');
    T.eq(WL.condErrors({ t: 'fsr', op: '>=', v: 6 }, w, 'x').length, 0, 'a legal condition');
    var S0 = { t: 10, lastSpend: 4, spendAt: null };
    T.ok(WL.ruleCond({ t: 'fsr', op: '>=', v: 6 }, S0, w) && !WL.ruleCond({ t: 'fsr', op: '>', v: 6 }, S0, w), '6 s after the last spend: >= 6 holds, > 6 does not');
    T.ok(!WL.ruleCond({ t: 'fsr', op: '>=', v: 0.5 }, { t: 10, lastSpend: 4, spendAt: 11 }, w), 'while a cast is being cast it counts as spending now');
    // in a fight: a Life Tap that only fires 6 s after the last spend taps only right after a full Wrack (or later)
    var b = sheet('wrack_ds'); b.actWhen = { lifeTapNeed: { t: 'fsr', op: '>=', v: 6 } };
    var r = WL.simulateOnce(b, 'undead', det(), { seed: 5, duration: 180, log: true });
    T.ok(r.lifeTaps > 0, 'it still taps (' + r.lifeTaps + ')');

    T.group('decision search hook: off = no change, the priority\'s own choice = no change');
    var c = det(), st = WL.computeStats(w, 'undead', c), tb = WL.buildSpellTable(w, st, c);
    var plain = WL.simulateOnce(w, 'undead', c, { stats: st, table: tb, seed: 9, duration: 170 });
    var seen = [];
    var obs = WL.simulateOnce(w, 'undead', c, { stats: st, table: tb, seed: 9, duration: 170, ctl: { at: -1, cands: ['wrack', 'shadowBolt', 'corruption', 'lifeTap'], observe: function (i) { seen.push({ base: i.base, kind: i.kind, legal: i.legal }); } } });
    T.eq(obs.total, plain.total, 'watching every decision changes nothing (' + seen.length + ' decisions)');
    T.ok(seen.length > 100, 'a free decision and every channel tick count as decisions');
    var same = WL.simulateOnce(w, 'undead', c, { stats: st, table: tb, seed: 9, duration: 170, ctl: { at: 20, key: seen[20].base } });
    var same2 = WL.simulateOnce(w, 'undead', c, { stats: st, table: tb, seed: 9, duration: 170, ctl: { at: 20, key: seen[20].base } });
    T.eq(same.total, same2.total, 'a branch is reproducible');
    var at = -1; seen.forEach(function (x, i) { if (at < 0 && i > 10 && x.kind === 'd' && x.base === 'wrack' && x.legal.indexOf('shadowBolt') >= 0) at = i; });
    var other = WL.simulateOnce(w, 'undead', c, { stats: st, table: tb, seed: 9, duration: 170, ctl: { at: at, key: 'shadowBolt', seed: 1 } });
    T.ok(at > 0 && !other.ctlIllegal && other.bySpell.shadowBolt.casts > plain.bySpell.shadowBolt.casts - 3 && other.total !== plain.total, 'a Shadow Bolt instead of a Wrack at decision ' + at + ' changes the fight');
  });
})();
