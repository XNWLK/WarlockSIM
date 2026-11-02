// Round 179 tests (user: "saving presets pushes the window as well. can we have a space for that somehow").
(function () {
  T.run('round 179: the presets row keeps its size', function () {
    var get = function (p) { try { var x = new XMLHttpRequest(); x.open('GET', p, false); x.send(); return x.responseText; } catch (e) { return ''; } };
    var src = get('../index.html'), app = get('../app/app.js');
    if (!src || !app) { T.warn('index.html / app.js could not be read (file://)'); return; }
    var has = function (s, t) { return (t || src).indexOf(s) >= 0; };
    T.ok(has('.charhead { flex-wrap: nowrap; min-width: 0; }') && has('.charpanel { grid-template-columns: minmax(0, 1fr); }'), 'wide: one line that cannot widen the panel');
    T.ok(has('#presetMsg { flex: 1 1 0; min-width: 60px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'), 'the message has its own slot, trimmed');
    T.ok(has("$('presetMsg').title = full || s;", app) && has("presetMsg('Loaded \"' + p.name.replace(", app), 'short messages; the whole text on hover');
    T.ok(has('max-width: 38%; flex-wrap: nowrap; overflow-x: auto;'), 'many preset buttons scroll sideways instead of wrapping');
    T.ok(has('narrow: a fixed grid') && has('#presetMsg { grid-column: 1 / -1; min-height: 1.4em; }'), 'narrow: a fixed grid with the message line always kept');
  });
})();
