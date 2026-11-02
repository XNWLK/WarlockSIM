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
    // Round 181 (user: "honestly the whole thing is just clunky. just have all presets be a dropdown"): one button, one list.
    T.ok(has('<button type="button" class="pdrop" id="presetMore"') && has('id="presetMenu"') && !has('id="presetPills"') && !has('function fitPills()', app), 'one "Presets ▾" button instead of a row of preset buttons');
    T.ok(has('<div class="pmsave"><input id="presetName"') && has("e.target.id === 'presetName') { e.preventDefault(); savePreset(); }", app) && has("$('presetName').value = ''; closePresetMenu();", app), 'saving sits at the bottom of the list (Enter works); a save closes it');
    T.ok(has('<div class="pmhead">Built-in</div>', app) && has('<div class="pmhead">Yours</div>', app), 'the list: built-in, yours (and old gear sets)');
    T.ok(has('narrow: a fixed grid') && has('#presetMsg { grid-column: 1 / -1; min-height: 1.4em; }'), 'narrow: a fixed grid with the message line always kept');
  });
})();
