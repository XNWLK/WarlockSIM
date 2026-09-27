// Custom builds (W7): validation (same rules as tests/test-data.js and tools/explore.js) and a shareable build code.
// Build code = "WFB1:" + base64(JSON {v, short, talents, pet, sacrifice, oil, rotation}).
// Wowhead Forever talent-calculator links cannot be imported: their URL encoding could not be determined (round 20,
// docs/03_BUILD_LOG.md step 28) — the editor uses its own code instead.
window.WL = window.WL || {};

WL.BUILD_CODE_PREFIX = 'WFB1:';
WL.PET_KEYS = ['imp', 'succubus', 'felhunter', 'voidwalker'];
WL.SACRIFICE_KEYS = ['imp', 'succubus'];   // the only sacrifices with a damage effect in the engine

// Returns a list of problems (empty = legal and simulatable).
WL.validateBuild = function (b) {
  var errs = [], total = 0, t = b.talents || {};
  Object.keys(t).forEach(function (k) {
    var tal = WL.TALENT_BY_KEY[k], pts = t[k];
    if (!tal) { errs.push('Unknown talent "' + k + '"'); return; }
    total += pts;
    if (!(pts >= 1 && pts <= tal.ranks)) errs.push(tal.name + ': ' + pts + ' points (max ' + tal.ranks + ')');
    if (tal.req && (t[tal.req] || 0) < tal.reqQty) errs.push(tal.name + ' needs ' + tal.reqQty + ' point(s) in ' + WL.TALENT_BY_KEY[tal.req].name);
    var below = 0;
    Object.keys(t).forEach(function (k2) { var t2 = WL.TALENT_BY_KEY[k2]; if (t2 && t2.tree === tal.tree && t2.row < tal.row) below += t[k2]; });
    if (below < tal.row * 5) errs.push(tal.name + ' (row ' + (tal.row + 1) + ') needs ' + tal.row * 5 + ' points in ' + WL.TREES[tal.tree].name + ' above it (has ' + below + ')');
  });
  if (total !== 51) errs.push('Spend exactly 51 points (now ' + total + ')');
  if (b.pet && WL.PET_KEYS.indexOf(b.pet) < 0) errs.push('Unknown pet "' + b.pet + '"');
  if (b.sacrifice && WL.SACRIFICE_KEYS.indexOf(b.sacrifice) < 0) errs.push('Unknown sacrifice "' + b.sacrifice + '"');
  if (b.sacrifice && !t.demonicSacrifice) errs.push('A sacrifice needs the Demonic Sacrifice talent');
  if (b.sacrifice && b.pet && !t.demonicPact) errs.push('Keeping a pet out after a sacrifice needs Demonic Pact');
  if (b.sacrifice && b.pet && b.pet === b.sacrifice) errs.push('Demonic Pact: the sacrificed demon cannot be the one you keep out');
  if (!WL.OILS[b.oil]) errs.push('Unknown weapon oil "' + b.oil + '"');
  var rot = b.rotation || [];
  if (!rot.length) errs.push('The priority list is empty');
  rot.forEach(function (a) { if (!WL.ACTIONS[a]) errs.push('Unknown priority action "' + a + '"'); });
  var fi = rot.map(function (a) { return WL.ACTIONS[a] && WL.ACTIONS[a].filler; }).indexOf(true);
  if (fi < 0 && rot.length) errs.push('The priority list needs a filler (Shadow Bolt, Searing Pain, Incinerate, …) at the end');
  else if (fi >= 0 && fi < rot.length - 1) errs.push('Everything after the first filler (' + WL.ACTIONS[rot[fi]].label + ') is never cast — move the filler to the end');
  // Talent-gated actions without the talent (they would silently never fire).
  var gated = { conflagrate: 'conflagrate', shadowburn: 'shadowburn', incinerate: 'incinerate', wrack: 'wrack', siphonLife: 'siphonLife',
    searingPainBrand: 'demonicBrand', lifeTapPet: 'demonicEnergies', shadowburnSnF: 'shadowAndFlame', shadowBoltSpread: 'improvedShadowBolt' };
  if (rot.indexOf('shadowburnSnF') >= 0 && !t.shadowburn) errs.push('"' + WL.ACTIONS.shadowburnSnF.label + '" needs the Shadowburn talent');
  rot.forEach(function (a) { if (gated[a] && !t[gated[a]]) errs.push('"' + WL.ACTIONS[a].label + '" needs the ' + WL.TALENT_BY_KEY[gated[a]].name + ' talent'); });
  if ((rot.indexOf('searingPainBrand') >= 0 || rot.indexOf('lifeTapPet') >= 0) && !b.pet) errs.push('Demonic Brand upkeep / Life Tap for the pet need a pet out');
  // Mid-fight pet swap (round 35): sacrifice the pet at execute, Fel Domination, summon the other one.
  [['swapToImp', 'imp'], ['swapToSuccubus', 'succubus']].forEach(function (s) {
    if (rot.indexOf(s[0]) < 0) return;
    var lab = '"' + WL.ACTIONS[s[0]].label + '"';
    ['demonicSacrifice', 'demonicPact', 'felDomination'].forEach(function (k) { if (!t[k]) errs.push(lab + ' needs the ' + WL.TALENT_BY_KEY[k].name + ' talent'); });
    if (!b.pet) errs.push(lab + ' needs a pet out at the start (it is the one that gets sacrificed)');
    else if (b.pet === s[1]) errs.push(lab + ': that demon is already out — pick the other swap');
  });
  if (rot.indexOf('swapToImp') >= 0 && rot.indexOf('swapToSuccubus') >= 0) errs.push('Only one pet swap per fight — keep one of the two swap actions');
  if (rot.indexOf('bane') >= 0 && rot.indexOf('baneOfAgony') >= 0)                 // one Bane per target (round 56)
    errs.push('Keep one Bane action: "' + WL.ACTIONS.bane.label + '" or "' + WL.ACTIONS.baneOfAgony.label + '"');
  return errs;
};

WL.encodeBuild = function (b) {
  var o = { v: 1, short: b.short, talents: b.talents, pet: b.pet || null, sacrifice: b.sacrifice || null, oil: b.oil, rotation: b.rotation };
  return WL.BUILD_CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
};

WL.decodeBuild = function (code) {
  var s = String(code || '').replace(/\s+/g, '');
  if (s.indexOf(WL.BUILD_CODE_PREFIX) !== 0) throw new Error('Not a build code (it must start with ' + WL.BUILD_CODE_PREFIX + ')');
  var o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(s.slice(WL.BUILD_CODE_PREFIX.length))))); }
  catch (e) { throw new Error('The build code is damaged (could not be decoded)'); }
  if (!o || o.v !== 1 || typeof o.talents !== 'object') throw new Error('Unknown build-code version');
  return { short: String(o.short || 'Custom build').slice(0, 40), talents: o.talents, pet: o.pet || null, sacrifice: o.sacrifice || null,
           oil: o.oil || 'none', rotation: Array.isArray(o.rotation) ? o.rotation : [] };
};

// Actions a user may put in a priority list (excludes test-only actions).
WL.editorActions = function () {
  return Object.keys(WL.ACTIONS).filter(function (k) { return k !== 'soulFireShards'; });
};
