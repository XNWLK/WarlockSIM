// Round 178 tests (user: switching a build's detail tabs, the Sim bar's "Settings changed" and "Use this gear for my stats"
// changed the sizes of the boxes).
(function () {
  T.run('round 178: nothing moves when content changes', function () {
    var get = function (p) { try { var x = new XMLHttpRequest(); x.open('GET', p, false); x.send(); return x.responseText; } catch (e) { return ''; } };
    var src = get('../index.html'), app = get('../app/app.js');
    if (!src || !app) { T.warn('index.html / app.js could not be read (file://)'); return; }
    var has = function (s, t) { return (t || src).indexOf(s) >= 0; };
    T.ok(has('<div class="dwrap">\' + detail(r)', app) && has('<div class="dwrap">\' + detail(x)', app) && has('.dwrap { width: 0; min-width: 100%; }'), 'a build\'s details do not size the table\'s columns (rows jumped per tab)');
    T.ok(has('.simbar { flex-wrap: nowrap; }') && has('flex: 1 1 420px; min-width: 0; font-size: 12px; white-space: nowrap; overflow: hidden;'), 'the Sim bar is one line; its status has a fixed share and trims itself');
    T.ok(has('<span class="simdot warn">', app) && !has('<span class="simdot stale">', app), 'the "settings changed" dot is not a "stale" box (that class padded it)');
    T.ok(has("classList.toggle('old', dirty && !running)", app) && has('#results.old > tbody') && !has("classList.toggle('stale', dirty", app), 'the old results fade without the notice box\'s padding (the table grew by 30 px)');
    T.ok(has("$('stale').hidden = running || dirty || !(pend.length || noW.length);", app), '"settings changed" is said by the Sim bar only (the notice stays for builds without results or stat weights)');
    T.ok(has('<span class="gbbadge" id="gbNote" hidden') && !has('<p class="meta gbnote" id="gbNote"'), 'the gear builder note is a badge in the Stats header, not an extra line');
  });
})();
