// Round 140 tests (user): share links — WL.encodeShare / WL.decodeShare / WL.shareFromHash (engine/settings-code.js).
// A link carries a settings snapshot and optionally a build and a race; it must come back exactly, compressed or not.
(function () {
  T.async('round 140: share links', function (done) {
    T.group('share link: there and back');
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.sp = 777; c.gear.hitPct = 12.5; c.fight.duration = 95; c.buffs.powerInfusion.on = true; c.consumables.flaskSupremePower.on = true; c.options.activesPolicy = 'pull';
    var snap = WL.settingsSnapshot(c), custom = { v: 1, short: 'Tëst “build”', talents: { suppression: 5, bane: 5 }, pet: 'imp', sacrifice: null, oil: 'firestone', rotation: ['corruption', 'shadowBolt'] };
    var diff = WL.settingsDiff(snap), mark = WL.defaultsMark();
    var p1 = { v: 1, d: diff, f: mark }, p2 = { v: 1, d: diff, f: mark, b: 'demo_pact_fire', r: 'orc' }, p3 = { v: 1, s: snap, b: custom, r: 'gnome' };
    var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
    var fail = function (e) { T.ok(false, 'share link test', String(e && e.stack || e)); done(); };

    T.group('share link: only what differs from the defaults');
    T.eq(JSON.stringify(WL.settingsDiff(WL.defaultSnapshot())), '{}', 'the default settings differ in nothing');
    T.eq(Object.keys(diff).sort().join(','), 'buffs,cons,fight,gear,options', 'the changed settings: only the parts that were touched (' + JSON.stringify(diff).length + ' characters instead of ' + JSON.stringify(snap).length + ')');
    T.eq(JSON.stringify(diff.gear), '{"sp":777,"hitPct":12.5}', 'of the gear only the two changed values');
    T.ok(same(WL.settingsMerge(diff), snap), 'put back onto the defaults it is the full snapshot again');
    T.ok(same(WL.settingsMerge({}), WL.defaultSnapshot()), 'an empty difference gives the defaults');
    var sp0 = WL.DEFAULT_CONFIG.gear.sp; WL.DEFAULT_CONFIG.gear.sp = sp0 + 1; var mark2 = WL.defaultsMark(); WL.DEFAULT_CONFIG.gear.sp = sp0;
    T.ok(/^[0-9a-z]{1,8}$/.test(mark) && mark2 !== mark && WL.defaultsMark() === mark, 'the mark of the defaults is short (' + mark + '), changes when a default changes and is the same again afterwards');
    T.group('share link: there and back');
    T.eq(WL.shareFromHash('#share=1.abc_-9'), '1.abc_-9', 'the code is read from "#share=…"');
    T.eq(WL.shareFromHash('#x=1&share=0.Zm9v&y=2'), '0.Zm9v', '… also between other parts of the address');
    T.eq(WL.shareFromHash('#tools'), null, 'an address without a share code → null');
    T.eq(WL.shareFromHash(''), null, 'no address part → null');

    Promise.all([WL.encodeShare(p1), WL.encodeShare(p2), WL.encodeShare(p3), WL.encodeShare(p3, true)]).then(function (codes) {
      var zip = WL.canZipShare();
      T.ok(codes.every(function (x) { return /^[01]\.[A-Za-z0-9_-]+$/.test(x); }), 'every code is "0." or "1." + letters, digits, - and _ (safe in an address)');
      T.eq(codes[3].charAt(0), '0', 'asked not to compress → a "0." code');
      if (zip) {
        T.eq(codes[0].charAt(0), '1', 'this browser compresses: a "1." code');
        T.ok(codes[2].length < codes[3].length * 0.75, 'the compressed code is clearly shorter (' + codes[2].length + ' vs ' + codes[3].length + ' characters)');
        T.ok(codes[0].length < WL.encodeSettings(c).length * 0.2, 'a link with only the differences is a fraction of the settings code of the same settings (' + codes[0].length + ' vs ' + WL.encodeSettings(c).length + ' characters)');
      }
      return Promise.all(codes.map(function (x) { return WL.decodeShare(x); })).then(function (back) {
        T.ok(same(back[0], p1), 'settings only (as differences): comes back exactly');
        T.ok(same(back[1], p2), 'differences + a sheet build + a race: comes back exactly');
        T.ok(same(back[2], p3), 'a full snapshot + your own build (with non-ASCII letters in its name): comes back exactly');
        T.ok(same(back[3], p3), 'the uncompressed code gives the same');
        var c2 = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), unknown = WL.applySettings(c2, WL.settingsMerge(back[0].d));
        T.ok(same(WL.settingsSnapshot(c2), snap) && !unknown.length, 'applied to fresh default settings it gives the shared settings (777 SP, 12.5% hit, 95 s, Power Infusion, a flask, cooldowns on the pull)');
      });
    }).then(function () {
      T.group('share link: what is not one');
      var bad = ['', 'hello', '2.abcd', '1.', '0.!!!', '0.' + btoa('not json').replace(/=+$/, ''), '0.' + btoa(JSON.stringify({ v: 2, s: { v: 1 } })).replace(/=+$/, ''), '0.' + btoa(JSON.stringify({ v: 1 })).replace(/=+$/, ''), '0.' + btoa(JSON.stringify({ v: 1, s: { v: 9 } })).replace(/=+$/, ''), '1.AAAAAAAA'];
      return Promise.all(bad.map(function (x) { return WL.decodeShare(x).then(function () { return 'ACCEPTED'; }, function (e) { return e.message; }); })).then(function (msgs) {
        T.eq(msgs.filter(function (m) { return m === 'ACCEPTED'; }).length, 0, 'ten wrong or damaged codes: every one is refused');
        T.ok(msgs.every(function (m) { return typeof m === 'string' && m.length > 10 && !/undefined|TypeError|JSON/.test(m); }), 'each with a plain message (' + msgs[1] + ' / ' + msgs[5] + ' / ' + msgs[6] + ')');
      });
    }).then(function () {
      T.group('share link: a damaged one leaves no uncaught error');
      var seen = [], on = function (e) { seen.push(String(e.reason && e.reason.message || e.reason)); if (e.preventDefault) e.preventDefault(); };
      window.addEventListener('unhandledrejection', on);
      var cut = ['1.abc', '1.AAAA', '1.AAAAAAAA'];
      return Promise.all(cut.map(function (x) { return WL.decodeShare(x).then(function () { return 'ACCEPTED'; }, function (e) { return e.message; }); })).then(function (msgs) {
        return new Promise(function (r) { setTimeout(r, 300); }).then(function () {
          window.removeEventListener('unhandledrejection', on);
          T.ok(msgs.every(function (m) { return m === 'The share link is damaged.'; }), 'three compressed links with cut or broken data: each refused as damaged');
          T.eq(seen.length, 0, 'and nothing is left uncaught for the browser console' + (seen.length ? ' (' + seen.join(' / ') + ')' : ''));
        });
      });
    }).then(done, fail);
  });
})();
