// Round 279 tests — the user, 2026-11-28: "have the shadow spell power in the stats show the total of normal
// spellpower+shadow, fire total being fire+normal spellpower". app/app.js (not loaded here): the Stats panel's Shadow / Fire
// rows, a result's stats table and the compare view show spell power + the school's own spell power.
(function () {
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  T.run('round 279: Shadow / Fire spell power shown as totals', function () {
    var a = src('../app/app.js');
    if (!a) { T.warn('app/app.js not readable here (file://)'); return; }
    T.ok(/k: 'shadowSp', label: 'Shadow spell power'[^\n]*tot: function \(s\) \{ return s\.sp \+ s\.schoolSp\.shadow; \}/.test(a), 'Stats panel: Shadow = spell power + Shadow');
    T.ok(/k: 'fireSp', label: 'Fire spell power'[^\n]*tot: function \(s\) \{ return s\.sp \+ s\.schoolSp\.fire; \}/.test(a), 'Stats panel: Fire = spell power + Fire');
    T.ok(/if \(r\.withSp\) src\.unshift\('Spell power '/.test(a), 'Stats panel: the sources start with your spell power');
    T.ok(/\['Shadow spell power', st\.sp \+ st\.schoolSp\.shadow, 'shadowSp', 0\], \['Fire spell power', st\.sp \+ st\.schoolSp\.fire, 'fireSp', 0\]/.test(a), 'a result\'s stats table: totals');
    T.ok(/\['Shadow spell power', sA\.sp \+ sA\.schoolSp\.shadow, sB\.sp \+ sB\.schoolSp\.shadow/.test(a) && /\['Fire spell power', sA\.sp \+ sA\.schoolSp\.fire, sB\.sp \+ sB\.schoolSp\.fire/.test(a), 'the compare view: totals');
    T.ok(a.indexOf("'+ Shadow spell power'") < 0 && a.indexOf("'+ Fire spell power'") < 0, 'no "+ Shadow / + Fire" extras left');
    var st = WL.computeStats(WL.BUILDS[0], 'human', JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)));
    T.ok(st.sp > 0 && st.schoolSp && typeof st.schoolSp.shadow === 'number', 'the engine keeps spell power and the school extras apart (' + st.sp + ' + ' + st.schoolSp.shadow + ' Shadow); only the page adds them up');
  });
})();
