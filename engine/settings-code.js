// Settings as a shareable code (W8) and the snapshot format used by batch compare (W13).
// Code = "WFS1:" + base64(JSON snapshot). The snapshot holds only what the user can change in the UI:
// fight, gear, options, which buffs / debuffs / consumables are on, professions, pet scaling, boss armor.
// Unknown keys in a code are ignored (older/newer versions stay loadable); lists missing from a code mean "all off".
window.WL = window.WL || {};

WL.SETTINGS_CODE_PREFIX = 'WFS1:';
// Settings that no longer exist: old codes may still carry them; they are dropped without a notice.
WL.RETIRED_SETTINGS = ['options.eurekaPolicy',    // round 88: Eureka! follows the cooldown setting
  'fight.startingShards',                         // round 118: soul shards are unlimited
  'gear.weaponIsSword',                           // round 149 (patch 2026-10-16): Ruthless needs no sword
  'buffs.windfuryTotem', 'buffs.flametongueTotem', 'buffs.tranquilAir',     // round 149: removed (they no longer help your demon)
  'gear.agi', 'buffs.graceOfAir', 'buffs.scrollOfAgility'];                 // round 152: Agility does nothing (demons crit with your spell crit)

WL.settingsSnapshot = function (c) {
  var on = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k].on; }); };
  var snap = {
    v: 1, fight: c.fight, gear: c.gear, options: c.options,
    buffs: on(c.buffs), debuffs: on(c.debuffs), cons: on(c.consumables),
    prof: c.professions || {}, petSpPct: c.petSpPct,
    succ: { apPerSp: c.pets.succubus.melee.apPerSp, baseDps: c.pets.succubus.melee.baseDps },
    bossArmor: c.combat.bossArmor,
    resist: c.combat.targetResist, levelResist: !!(c.combat.levelResist && c.combat.levelResist.on),   // round 39
  };
  // Round 147: the gear builder's items and your own additions, only while the builder is on (its numbers are in gear
  // anyway; this lets a code or link bring the builder back as it was). Off = not part of the settings.
  var gb = c.gearBuilder;
  if (gb && gb.on) snap.gb = { slots: gb.slots || {}, manual: gb.manual || {}, enchants: gb.enchants || {} };   // enchants: round 148
  return snap;
};

WL.encodeSettings = function (c) {
  var json = JSON.stringify(WL.settingsSnapshot(c));
  return WL.SETTINGS_CODE_PREFIX + btoa(unescape(encodeURIComponent(json)));
};

WL.decodeSettings = function (code) {
  var s = String(code || '').replace(/\s+/g, '');
  if (s.indexOf(WL.SETTINGS_CODE_PREFIX) !== 0) throw new Error('Not a settings code (it must start with ' + WL.SETTINGS_CODE_PREFIX + ')');
  var o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(s.slice(WL.SETTINGS_CODE_PREFIX.length))))); }
  catch (e) { throw new Error('The code is damaged (could not be decoded)'); }
  if (!o || o.v !== 1) throw new Error('Unknown settings-code version');
  return o;
};

// Applies a snapshot onto config `c` in place. Returns the list of names in the code that this version does not know.
WL.applySettings = function (c, o) {
  var unknown = [];
  ['fight', 'gear', 'options'].forEach(function (sec) {
    Object.keys(o[sec] || {}).forEach(function (k) { if (k in c[sec]) c[sec][k] = o[sec][k]; else if (WL.RETIRED_SETTINGS.indexOf(sec + '.' + k) < 0) unknown.push(sec + '.' + k); });
  });
  [['buffs', 'buffs'], ['debuffs', 'debuffs'], ['cons', 'consumables']].forEach(function (p) {
    var list = o[p[0]] || [], tgt = c[p[1]] || {};
    Object.keys(tgt).forEach(function (k) { tgt[k].on = list.indexOf(k) >= 0; });
    list.forEach(function (k) { if (!tgt[k] && WL.RETIRED_SETTINGS.indexOf(p[0] + '.' + k) < 0) unknown.push(p[0] + '.' + k); });
  });
  c.professions = c.professions || {};
  Object.keys(c.professions).forEach(function (k) { c.professions[k] = !!(o.prof || {})[k]; });
  if (isFinite(o.petSpPct)) c.petSpPct = o.petSpPct;
  if (o.succ) {
    if (isFinite(o.succ.apPerSp)) c.pets.succubus.melee.apPerSp = o.succ.apPerSp;
    if (isFinite(o.succ.baseDps)) c.pets.succubus.melee.baseDps = o.succ.baseDps;
  }
  if (isFinite(o.bossArmor)) c.combat.bossArmor = o.bossArmor;
  if (o.resist) ['shadow', 'fire'].forEach(function (s) { if (isFinite(o.resist[s])) c.combat.targetResist[s] = o.resist[s]; });
  if (typeof o.levelResist === 'boolean' && c.combat.levelResist) c.combat.levelResist.on = o.levelResist;
  // Gear builder (round 147): a code with it switches it on with its items; a code without it switches it off and keeps
  // the items you had (they no longer count).
  if (o.gb && typeof o.gb === 'object') c.gearBuilder = { on: true, slots: o.gb.slots || {}, manual: o.gb.manual || {}, enchants: o.gb.enchants || {} };
  else if (c.gearBuilder) c.gearBuilder.on = false;
  return unknown;
};

// Short human-readable summary of a snapshot (batch-compare list).
WL.describeSettings = function (o) {
  var g = o.gear || {};
  return g.sp + ' SP · ' + g.hitPct + '% hit · ' + g.critPct + '% crit · ' + g.hastePct + '% haste · ' +
    (o.buffs || []).length + ' buffs · ' + (o.cons || []).length + ' consumables' + ((o.prof || {}).engineering ? ' · Engineering' : '') +
    ' · ' + (o.fight || {}).duration + ' s · ' + (o.fight || {}).iterations + ' fights';
};

// ---------- share link (round 140, user) ----------
// One link that opens the page with settings loaded, and optionally a build: <page>#share=<code>.
//   payload = { v: 1, d: what differs from the default settings (WL.settingsDiff), f: WL.defaultsMark() of the page that
//               made it, b: a built-in build's key or a build code's content (your own build), r: race } — b and r are
//               optional. Only the differences are carried so that a link stays short enough for a chat message; a link
//               made with other defaults than the page has now is recognised by its mark (a full snapshot under `s` is
//               read too).
//   code    = "1." + base64url(deflated JSON)   where the browser can compress (every current one), else
//             "0." + base64url(JSON). Both kinds are read everywhere a compressed one can be opened.
// Compression is asynchronous in browsers, so both functions return a Promise.
(function () {
  function b64u(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    var s = atob(str.replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function pipe(bytes, stream) {
    // If the data is damaged, the write side fails together with the read side. The read side below reports it;
    // the write side is silenced here, or the browser logs an uncaught error on top of the page's own message.
    var w = stream.writable.getWriter(), quiet = function () {};
    w.write(bytes).catch(quiet); w.close().catch(quiet);
    return new Response(stream.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  WL.canZipShare = function () { return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined' && typeof Response !== 'undefined'; };
  WL.encodeShare = function (payload, noZip) {
    var bytes = new TextEncoder().encode(JSON.stringify(payload)), plain = function () { return '0.' + b64u(bytes); };
    if (noZip || !WL.canZipShare()) return Promise.resolve(plain());
    try { return pipe(bytes, new CompressionStream('deflate-raw')).then(function (z) { return '1.' + b64u(z); }, plain); }
    catch (e) { return Promise.resolve(plain()); }
  };
  WL.decodeShare = function (code) {
    var m = /^([01])\.([A-Za-z0-9_-]+)$/.exec(String(code || '').trim()), bytes;
    if (!m) return Promise.reject(new Error('That is not a share link of the sim.'));
    try { bytes = unb64u(m[2]); } catch (e) { return Promise.reject(new Error('The share link is damaged.')); }
    function parse(b) {
      var o;
      try { o = JSON.parse(new TextDecoder().decode(b)); } catch (e) { throw new Error('The share link is damaged.'); }
        if (!o || o.v !== 1 || !((o.s && o.s.v === 1) || (o.d && typeof o.d === 'object'))) throw new Error('This share link was made by a version of the sim that this page does not know.');
      return o;
    }
    if (m[1] === '0') return Promise.resolve(bytes).then(parse);
    if (!WL.canZipShare()) return Promise.reject(new Error('This browser cannot open this share link.'));
    try { return pipe(bytes, new DecompressionStream('deflate-raw')).then(parse, function () { throw new Error('The share link is damaged.'); }); }
    catch (e) { return Promise.reject(new Error('The share link is damaged.')); }
  };
  // What a snapshot has that differs from `base` (default: the default settings): changed keys of fight / gear / options,
  // and each of the other parts as a whole if it differs. WL.settingsMerge puts it back onto a base.
  var SECTIONS = ['fight', 'gear', 'options'], WHOLE = ['buffs', 'debuffs', 'cons', 'prof', 'petSpPct', 'succ', 'bossArmor', 'resist', 'levelResist', 'gb'];
  var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  WL.defaultSnapshot = function () { return JSON.parse(JSON.stringify(WL.settingsSnapshot(WL.DEFAULT_CONFIG))); };
  WL.settingsDiff = function (snap, base) {
    base = base || WL.defaultSnapshot();
    var d = {};
    SECTIONS.forEach(function (sec) {
      var o = {}, a = snap[sec] || {}, b = base[sec] || {};
      Object.keys(a).forEach(function (k) { if (!same(a[k], b[k])) o[k] = a[k]; });
      if (Object.keys(o).length) d[sec] = o;
    });
    WHOLE.forEach(function (k) { if (!same(snap[k], base[k])) d[k] = snap[k]; });
    return d;
  };
  WL.settingsMerge = function (d, base) {
    var s = JSON.parse(JSON.stringify(base || WL.defaultSnapshot()));
    SECTIONS.forEach(function (sec) { Object.keys((d || {})[sec] || {}).forEach(function (k) { s[sec][k] = d[sec][k]; }); });
    WHOLE.forEach(function (k) { if (d && k in d) s[k] = d[k]; });
    return s;
  };
  // A short mark of the default settings (FNV-1a of their snapshot): a link made with other defaults has another mark.
  WL.defaultsMark = function () {
    var str = JSON.stringify(WL.defaultSnapshot()), h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  };
  // The code in a page address ("…#share=<code>"), or null.
  WL.shareFromHash = function (hash) {
    var m = /[#&]share=([^&]+)/.exec(String(hash || ''));
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  };
})();
