// Round 176 tests (user: "can you make a layout editor so people can drag the different windows how they want them").
(function () {
  T.run('round 176: the layout editor', function () {
    var get = function (p) { try { var x = new XMLHttpRequest(); x.open('GET', p, false); x.send(); return x.responseText; } catch (e) { return ''; } };
    var src = get('../index.html'), app = get('../app/app.js');
    if (!src || !app) { T.warn('index.html / app.js could not be read (file://)'); return; }
    var has = function (s, t) { return (t || src).indexOf(s) >= 0; };
    T.ok(has('id="layoutBtn"') && src.indexOf('id="layoutBtn"') < src.indexOf('</header>'), 'a "Layout" button in the header');
    T.ok(has('<dialog id="layoutDlg"') && has('id="ly_left"') && has('id="ly_right"') && has('id="ly_stack"') && has('id="layoutReset"'), 'the editor: wide screens left / right, narrower windows one list, back to the default');
    T.ok(has("var LY_DEFAULT = { left: ['builds', 'compare', 'charts', 'len'], right: ['char', 'gear', 'editor', 'tools'], stack: ['builds', 'compare', 'charts', 'char', 'gear', 'editor', 'tools', 'len'] };", app),
      'the default is the page as it was (Racials by fight length last when stacked)');
    var blocks = ['buildPanel', 'compare', 'charts', 'lenSheet', 'gearTop', 'editor', 'tools'];
    T.ok(blocks.every(function (id) { return has("'" + id + "'", app) && has('id="' + id + '"'); }) && has("document.querySelector('.charpanel')", app), 'all eight boxes can be moved');
    T.ok(has("addEventListener('pointerdown'", app) && has("addEventListener('pointerup'", app) && has('touch-action: none; user-select: none;'), 'dragged with the pointer (mouse, touch and pen), the arrows do the same');
    T.ok(has("localStorage.setItem('wfs.layout'", app) && has("localStorage.removeItem('wfs.layout')", app) && has('function lyClean(o)', app), 'kept in this browser (the default stores nothing); a damaged or old entry is cleaned');
    T.ok(has('.colmain > *, .colside > * { order: var(--stack, 0); }') && has('.colmain > *, .colside > * { order: 0; }'), 'narrower windows: the list order; wide screens: the columns\' own order');
  });
})();
