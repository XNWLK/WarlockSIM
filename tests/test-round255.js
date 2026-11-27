// Round 255 tests — the user, 2026-11-26: "because the magicians belt can be bought from the vendor, we will forgo the epic
// requirement for it".
//  * private/bis-page/notes.js CHEAP_OK: epics that still count as cheap for the ▼ alternative, with their cost in words —
//    Magician's Cord (272393), vendor: 100 Tarnished Undermine Real (Pix Xizzix). Its round-254 hand pick (ALT 11662 → 272393)
//    is gone: alts.js cheap() lets CHEAP_OK through despite quality epic, and downsides() shows the vendor cost, not "epic".
//  * Wrack DS keeps the user's ▼ Black Waistcord (round 218; the user: "no leave it") through ALT 10255 → 254087 — Master's
//    Belt of Shadow Wrath is no other build's waist (the Cord there: −1.8 vs Black Waistcord's −6.1).
//  * The page's notes: "▼ Alternative the best one that is not epic, crafted, reputation or PvP (a vendor epic like
//    Magician's Cord counts)".
// The waist slot was rerun (2 seeds × 2,000 fights): every ▼ / ▲ as before.
(function () {
  var CORD = 272393, BANTHOK = 11662, MASTERS = 10255, WAISTCORD = 254087, ARCHMAGE = 18405;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }

  T.run('round 255: the BiS page — Magician\'s Cord is ▼ by rule (private/bis-page, local only)', function () {
    var nt = src('../private/bis-page/notes.js'), al = src('../private/bis-page/alts.js'), tp = src('../private/bis-page/template.html'), dj = src('../private/bis-page/data.json');
    if (!nt || !al || !tp || !dj) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    var N = mod.exports;
    T.group('notes.js');
    T.ok(!!N.CHEAP_OK, 'CHEAP_OK exported');
    T.eq((N.CHEAP_OK || {})[CORD], 'vendor: 100 Tarnished Undermine Real', 'CHEAP_OK: Magician\'s Cord with its vendor cost');
    T.eq(Object.keys(N.CHEAP_OK || {}).length, 1, 'only the Cord');
    T.ok(!(BANTHOK in N.ALT), 'no hand-picked ▼ for Ban\'thok Sash any more (11662 → 272393 removed)');
    T.ok(Object.keys(N.ALT).every(function (k) { return N.ALT[k] !== CORD; }), 'no ALT entry points to the Cord');
    T.ok(!(MASTERS in N.ALT), 'round 257: Wrack DS\'s Black Waistcord pin (ALT 10255 → 254087) is gone');
    T.ok(!N.EXCLUDE[CORD], 'the Cord is not excluded');
    T.ok(/"because the\s*(\/\/\s*)?magicians belt can be bought from the vendor, we will forgo the epic requirement for it"/.test(nt), 'notes.js quotes the user');
    T.group('alts.js');
    T.ok(/CHEAP_OK = \{\}(, UP_ONLY = \{\})?(, UP_TRY = \{\})?(, ALT_BUILD = \{\})? \} = require\('\.\/notes\.js'\)/.test(al), 'reads CHEAP_OK from notes.js (round 259: UP_ONLY too; round 261: UP_TRY too; round 262: ALT_BUILD too)');
    T.ok(/const cheap = x => [^\n]*\(x\.it\.quality !== 'epic' \|\| !!CHEAP_OK\[x\.id\]\)/.test(al), 'cheap(): a CHEAP_OK epic passes');
    T.ok(/if \(CHEAP_OK\[id\]\) d\.push\(CHEAP_OK\[id\]\);\s*(\/\/[^\n]*)?\n\s*else if \(it\.quality === 'epic'\)/.test(al), 'downsides(): its vendor cost instead of "epic"');
    T.group('template.html');
    T.ok(/▼ Alternative the best one that is not epic, crafted, reputation or PvP \(a vendor epic like Magician\\'s Cord counts[;)]/.test(tp), 'the notes name the exception');
    T.group('data.json (waist)');
    var D = JSON.parse(dj), seen = 0;
    D.builds.forEach(function (b) {
      var a = b.alts.waist || {}; seen++;
      T.ok(a.up && a.up.id === ARCHMAGE, b.key + ': ▲ Belt of the Archmage stays');
      T.ok(a.alt && a.alt.id === CORD && a.alt.dps < 0 && a.alt.dps > -3, b.key + ': ▼ Magician\'s Cord by rule (' + (a.alt && a.alt.dps) + ' DPS)');
    });
    T.eq(seen, 5, 'five builds');
  });
})();
