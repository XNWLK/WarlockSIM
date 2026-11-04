// Round 186 tests (user): adding Wrack in the Simple list adds plain Wrack, not Wrack with APL conditions left from a loaded
// build; the talent trees draw arrows from a prerequisite talent to the talent that needs it.
(function () {
  var DOTS4 = { t: 'all', c: [{ t: 'dot', spell: 'corruption', op: '>=', v: 4 }, { t: 'dot', spell: 'baneOfAgony', op: '>=', v: 4 }] };
  function tb(rot, actWhen) {
    var b = JSON.parse(JSON.stringify(WL.BUILDS.filter(function (x) { return x.key === 'wrack_ds'; })[0] || { talents: { wrack: 1, siphonLife: 1 }, oil: 'none' }));
    b.rotation = rot.slice(); delete b.actWhen; delete b.rules; delete b.params;
    if (actWhen) b.actWhen = JSON.parse(JSON.stringify(actWhen));
    return b;
  }
  function plainLines(k, b) { var c = Object.assign({}, b); delete c.actWhen; return JSON.stringify(WL.aplLines(k, c)); }

  T.run('round 186: an action added in the Simple list is the plain action', function () {
    T.group('Wrack after a loaded build whose Wrack waited for the DoTs');
    var b = tb(['corruption', 'baneOfAgony', 'shadowBolt'], { wrack: DOTS4 });   // its Wrack was removed, the condition stayed
    var r = WL.addAction(b, 'wrack');
    T.eq(b.rotation.join(','), 'corruption,baneOfAgony,shadowBolt,wrack', 'added as the filler entry "wrack", at the end');
    T.ok(!r.rule && !(b.actWhen && b.actWhen.wrack), 'the old condition is gone');
    T.ok(!WL.actionOf('wrack', b).when, 'the entry has no condition of its own');
    T.eq(JSON.stringify(WL.aplLines('wrack', b)), '[{"spell":"wrack"}]', 'its APL line is just "Wrack"');
    T.eq(WL.actionLabel(b, 'wrack'), WL.ACTIONS.wrack.label, 'the Simple list shows the plain label');

    T.group('Wrack again while one with a condition is still in the list');
    var b2 = tb(['corruption', 'baneOfAgony', 'wrack', 'shadowBolt'], { wrack: DOTS4 });
    var r2 = WL.addAction(b2, 'wrack');
    T.ok(r2.rule && r2.keys.length === 1 && /^rule:\d+$/.test(r2.keys[0]), 'the new one is an APL line of its own');
    T.eq(JSON.stringify(b2.rules[+r2.keys[0].slice(5)]), '{"spell":"wrack"}', 'a plain Wrack line, no condition');
    T.eq(JSON.stringify(b2.actWhen.wrack), JSON.stringify(DOTS4), 'the Wrack already in the list keeps its condition');
    T.eq(WL.validateBuild(b2).filter(function (e) { return /Rule|condition/i.test(e); }).join(' | '), '', 'no rule or condition errors');

    T.group('other actions added in the Simple list');
    ['shadowBolt', 'incinerate', 'corruption', 'siphonLife', 'curseOfElements', 'lifeTapNeed', 'lifeTapBelow', 'lifeTapPet', 'deathCoil', 'wrackDots'].forEach(function (k) {
      var aw = {}; aw[k] = { t: 'fight', what: 'remaining', op: '>', v: 150 };
      var c = tb(['immolate', 'drainLife'], aw), before = c.rotation.length;
      WL.addAction(c, k);
      var at = c.rotation.indexOf(k), A = WL.actionOf(k, c);
      T.ok(c.rotation.length === before + 1 && at >= 0 && !A.when && !(c.actWhen && c.actWhen[k]) && JSON.stringify(WL.aplLines(k, c)) === plainLines(k, c),
        WL.ACTIONS[k].label.replace(/_/g, '…') + ': plain' + (WL.ACTIONS[k].filler ? ' (filler: at the end)' : ' (above the filler)'));
      T.eq(at, WL.ACTIONS[k].filler ? c.rotation.length - 1 : 1, '  placed ' + (WL.ACTIONS[k].filler ? 'last' : 'above Drain Life'));
    });

    T.group('removing an entry takes its condition with it');
    var d = tb(['corruption', 'immolate', 'shadowBolt'], { corruption: DOTS4, immolate: DOTS4 });
    d.groups = { G: ['immolate'] }; d.rotation.splice(1, 1);                     // Immolate now only in a group
    WL.dropUnusedActWhen(d);
    T.ok(d.actWhen && d.actWhen.corruption && d.actWhen.immolate, 'kept while the action is in the list or in a group');
    d.rotation = ['shadowBolt']; delete d.groups; WL.dropUnusedActWhen(d);
    T.ok(!d.actWhen, 'dropped once the action is gone');

    var app = '';
    try { var y = new XMLHttpRequest(); y.open('GET', '../app/app.js', false); y.send(); app = y.responseText; } catch (e) { /* file:// */ }
    if (!app) { T.warn('app.js could not be read (file://)'); return; }
    T.group('the editor uses it');
    T.ok(/added = WL\.addAction\(b, a\)/.test(app), '"Add to the priority" adds through WL.addAction');
    T.ok(/data-edrm'\), 1\); WL\.dropUnusedActWhen\(b\)/.test(app), 'the ✕ button drops a condition left without its action');
  });

  T.run('round 186: talent tree arrows', function () {
    T.group('prerequisites');
    var pairs = WL.TALENTS.filter(function (t) { return t.req; }).map(function (t) { return t.req + '>' + t.key; }).sort();
    T.eq(pairs.join(','), ['amplifyCurse>curseOfExhaustion', 'baneOfHavoc>incinerate', 'conflagrate>fireAndBrimstone', 'demonicSacrifice>soulLink',
      'intensity>pyroclasm', 'masterSummoner>felDomination', 'siphonLife>wrack', 'soulLink>demonicPact'].join(','), 'eight arrows, from the talent data');
    WL.TALENTS.filter(function (t) { return t.req; }).forEach(function (t) {
      var r = WL.TALENT_BY_KEY[t.req];
      T.ok(r && r.tree === t.tree && r.row < t.row && r.col === t.col, t.name + ': ' + (r ? r.name : '?') + ' sits straight above it (a straight arrow down)');
      var between = WL.TALENTS.filter(function (x) { return x.tree === t.tree && x.col === t.col && x.row > r.row && x.row < t.row; });
      T.eq(between.length, 0, '  no other talent on the way');
    });
    var app = '', html = '';
    try { var y = new XMLHttpRequest(); y.open('GET', '../app/app.js', false); y.send(); app = y.responseText; } catch (e) { /* file:// */ }
    try { var z = new XMLHttpRequest(); z.open('GET', '../index.html', false); z.send(); html = z.responseText; } catch (e) { /* file:// */ }
    if (!app || !html) { T.warn('app.js / index.html could not be read (file://)'); return; }
    T.group('drawn in both kinds of tree');
    T.eq((app.match(/'<div class="tgrid">' \+ talentArrows\(tr, /g) || []).length, 2, 'build details and the build editor (behind the icons: before the cells)');
    T.ok(/\.tarrow\.down::after \{[^}]*border-top-color: var\(--ta\)/.test(html) && /\.tarrow\.on \{ --ta: rgb\(var\(--tr/.test(html), 'a line with an arrow head, in the tree colour, brighter once the prerequisite has its points');
    T.ok(/\.tarrow \{[^}]*pointer-events: none/.test(html), 'the arrows never take a click meant for a talent');
    T.ok(/Requires ' \+ \(t\.reqQty \|\| 1\) \+ ' point/.test(app), 'the talent\'s tooltip names what it requires');
  });
})();
