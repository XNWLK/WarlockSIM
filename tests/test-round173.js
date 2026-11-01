// Round 173 tests (user): the editor's four boxes line up; wide screens use their room ("on a 27 inch (1440p) monitor there's so
// much space left and right … put stuff side by side … have it be dynamic"). Round 174 (user: misaligned at 1440p, tiles "a little
// clunky", "your character and build editor should try to be next to eachother … place them according to relevance").
(function () {
  T.run('round 173 / 174: page columns and the editor grid', function () {
    var src = '';
    try { var x = new XMLHttpRequest(); x.open('GET', '../index.html', false); x.send(); src = x.responseText; } catch (e) { /* file:// */ }
    if (!src) { T.warn('index.html could not be read (file://)'); return; }
    var at = function (s) { return src.indexOf(s); }, has = function (s) { return src.indexOf(s) >= 0; };
    T.ok(at('class="colmain"') < at('id="buildPanel"') && at('id="buildPanel"') < at('id="compare"') && at('id="charts"') < at('id="lenSheet"') && at('id="lenSheet"') < at('class="colside"'),
      'left (what the sim shows): builds, compare, charts, fight lengths');
    T.ok(at('class="colside"') < at('class="panel charpanel"') && at('class="panel charpanel"') < at('id="charTitle"') && at('id="settings"') < at('id="gearTop"') && at('id="gearTop"') < at('id="editor"') && at('id="editor"') < at('id="tools"') && at('id="tools"') < at('class="foot"'),
      'right (what you put in): your character and the fight, gear builder, build editor, import / export');
    T.ok(has('.charpanel { display: grid;'), 'your character and the fight is one panel with its title inside (its top lines up with the builds\')');
    T.ok(has('@media (min-width: 2350px) {') && has('.cols { display: grid;') && has('.cols, .colmain, .colside { display: contents; }'), 'side by side from 2350 px; narrower they stack as before');
    T.ok(has('@media (min-width: 1500px) { .wrap { max-width: min(1880px, 100%); } }'), 'from 1500 px the page is up to 1880 px wide (was 1320)');
    T.ok(!has('class="cardrow') && !has('.cardrow'), 'no tiles: cards stack in their column, opening one only pushes the ones below');
    T.ok(has('.edmain .edrots { display: contents; }') && at('class="edmain"') < at('class="edrots"') && at('class="edrots"') < at('class="edchecks"'), 'Simple | Advanced share the columns of the talent trees | quick sim (the four boxes line up)');
    T.ok(has('.edcol.edrules { margin-top: 0; }'), 'Simple and Advanced start at the same height');
    // Round 175 (user: at 1440p cheat mode, the build editor, import / export and the gear builder "mess with the layout")
    T.ok(has('scrollbar-gutter: stable;'), 'room for the scrollbar is kept: opening a card never shifts the page sideways');
    T.ok(has('.charpanel .sidecard { height: auto; min-height: 0; overflow-y: visible; }'), 'side by side, the tabs card grows with its content (cheat mode) instead of scrolling inside');
  });
})();
