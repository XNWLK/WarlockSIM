// Round 257 tests — the user, 2026-11-26: "how is black waistcord still listed as an alternative for wrack ds instead of the
// epic belt", then "yes swap". The round-218 hand pick Master's Belt of Shadow Wrath → Black Waistcord (notes.js ALT
// 10255 → 254087) is removed, so Wrack DS's ▼ waist is Magician's Cord by rule (CHEAP_OK, round 255) like the other builds.
// The waist slot was rerun (2 seeds × 2,000 fights); every other slot unchanged.
(function () {
  var CORD = 272393, MASTERS = 10255, WAISTCORD = 254087;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  T.run('round 257: Wrack DS ▼ waist = Magician\'s Cord (private/bis-page, local only)', function () {
    var nt = src('../private/bis-page/notes.js'), dj = src('../private/bis-page/data.json');
    if (!nt || !dj) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    var N = mod.exports;
    T.ok(!(MASTERS in N.ALT), 'notes.js: no ALT pin under Master\'s Belt of Shadow Wrath');
    T.ok(Object.keys(N.ALT).every(function (k) { return N.ALT[k] !== WAISTCORD; }), 'no ALT entry points to Black Waistcord');
    T.ok(/yes\s*(\/\/\s*)?swap/.test(nt), 'notes.js quotes the user');
    var D = JSON.parse(dj), w = D.builds.filter(function (b) { return b.key === 'wrack_ds'; })[0];
    T.ok(!!w, 'wrack_ds on the page');
    var a = (w && w.alts.waist) || {};
    T.ok(a.alt && a.alt.id === CORD && a.alt.dps < 0 && a.alt.dps > -4, 'wrack_ds: ▼ Magician\'s Cord (' + (a.alt && a.alt.dps) + ' DPS)');
  });
})();
