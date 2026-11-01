// Round 173 tests (user): the editor's four boxes line up; wide screens use their room ("on a 27 inch (1440p) monitor there's so
// much space left and right … put stuff side by side … have it be dynamic").
(function () {
  T.run('round 173: page columns and the editor grid', function () {
    var src = '';
    try { var x = new XMLHttpRequest(); x.open('GET', '../index.html', false); x.send(); src = x.responseText; } catch (e) { /* file:// */ }
    if (!src) { T.warn('index.html could not be read (file://)'); return; }
    var at = function (s) { return src.indexOf(s); }, has = function (s) { return src.indexOf(s) >= 0; };
    T.ok(at('class="colmain"') < at('id="buildPanel"') && at('id="lenSheet"') < at('class="colside"') && at('class="colside"') < at('id="charTitle"') && at('id="gearTop"') < at('class="foot"'),
      'left: the builds and the tool cards; right: your character and the fight (settings, gear builder)');
    T.ok(has('@media (min-width: 2350px) {') && has('.cols { display: grid;') && has('.cols, .colmain, .colside { display: contents; }'), 'side by side from 2350 px; narrower they stack as before');
    T.ok(has('@media (min-width: 1500px) { .wrap { max-width: min(1880px, 100%); } }'), 'from 1500 px the page is up to 1880 px wide (was 1320)');
    T.ok(has('.cardrow > details[open] { grid-column: 1 / -1; }'), 'folded cards are tiles; an open one takes the whole row');
    T.ok(has('.cardrow.late { order: 1; }') && at('<div class="cardrow late">') < at('id="editor"'), 'stacked: the editor, import / export and fight lengths come after your settings');
    T.ok(has('.edmain .edrots { display: contents; }') && at('class="edmain"') < at('class="edrots"') && at('class="edrots"') < at('class="edchecks"'), 'Simple | Advanced share the columns of the talent trees | quick sim (the four boxes line up)');
    T.ok(has('.edcol.edrules { margin-top: 0; }'), 'Simple and Advanced start at the same height');
  });
})();
