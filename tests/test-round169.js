// Round 169 tests (user: "i also want the build list to be more prominent so maybe have that up top", "the first top bar at the
// top is kind of pointless", "maybe reposition or move certain settings"): the page order.
(function () {
  T.run('round 169: the build list comes first', function () {
    var src = '';
    try { var x = new XMLHttpRequest(); x.open('GET', '../index.html', false); x.send(); src = x.responseText; } catch (e) { /* file:// */ }
    if (!src) { T.warn('index.html could not be read (file://)'); return; }
    var at = function (s) { return src.indexOf(s); };
    T.ok(at('id="buildPanel"') > at('</header>') && at('id="buildPanel"') < at('id="settings"'), 'the build list sits right under the header, above the settings');
    T.ok(at('id="buildPanel"') < at('id="statbar"') && at('id="statbar"') < at('id="results"'), 'Sim! and the stat chips are in the build list\'s top row');
    T.ok(at('id="quickbar"') > at('id="buildPanel"') && at('id="quickbar"') < at('id="results"'), 'quick setup sits above the table');
    T.ok(at('id="steps"') < 0, 'the old steps strip is gone');
    T.ok(at('id="presetSel"') > at('id="charTitle"') && at('id="presetSel"') < at('id="settings"'), 'saved setups (presets) sit next to "Your character and the fight"');
    T.ok(at('id="presetMsg"') > 0, '… with their own message line');
    T.ok(at('id="compare"') < at('id="settings"') && at('id="editor"') > at('id="settings"'), 'result tools under the list; build editor below the settings');
    // Round 170 (user: "move that window to the very bottom")
    T.ok(at('id="lenSheet"') > at('id="tools"') && at('id="lenSheet"') < at('class="foot"'), 'By fight length is the last box on the page');
    T.ok(/\.buildpanel \{[^}]*minmax\(0, 1fr\)/.test(src), 'the build list stays inside a phone screen (its wide table scrolls)');
  });
})();
