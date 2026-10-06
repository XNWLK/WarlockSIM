// Custom builds (W7): validation (same rules as tests/test-data.js and tools/explore.js) and a shareable build code.
// Build code = "WFB1:" + base64(JSON {v, short, talents, pet, sacrifice, oil, rotation, tl?}); tl = fight timeline [[t, spell], …] (round 70).
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
  var gated = { conflagrate: 'conflagrate', conflagrateExpire: 'conflagrate', shadowburn: 'shadowburn', incinerate: 'incinerate', wrack: 'wrack', siphonLife: 'siphonLife',
    searingPainBrand: 'demonicBrand', searingPainDecimation: 'decimation', lifeTapPet: 'demonicEnergies', shadowburnSnF: 'shadowAndFlame', conflagrateSnF: 'shadowAndFlame', shadowBoltSpread: 'improvedShadowBolt', isbUpkeep: 'improvedShadowBolt' };
  if (rot.indexOf('shadowburnSnF') >= 0 && !t.shadowburn) errs.push('"' + WL.ACTIONS.shadowburnSnF.label + '" needs the Shadowburn talent');
  if (rot.indexOf('conflagrateSnF') >= 0 && !t.conflagrate) errs.push('"' + WL.ACTIONS.conflagrateSnF.label + '" needs the Conflagrate talent');
  rot.forEach(function (a) { if (gated[a] && !t[gated[a]]) errs.push('"' + WL.ACTIONS[a].label + '" needs the ' + WL.TALENT_BY_KEY[gated[a]].name + ' talent'); });
  rot.forEach(function (a) {                                             // numbers of an action inside their limits (round 104)
    var A = WL.ACTIONS[a]; if (!A || !A.params) return;
    var v = WL.actionParams(b, a);
    A.params.forEach(function (p) {
      if (!(typeof v[p.key] === 'number' && v[p.key] >= p.min && v[p.key] <= p.max)) errs.push('"' + A.label.replace(/_/g, '…') + '": ' + p.name + ' must be a number from ' + p.min + ' to ' + p.max);
    });
  });
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
  // Fight timeline (round 70, A73): spells at fixed start times on top of the priority. Timing checks: WL.checkTimeline.
  if (b.timeline) {
    if (!Array.isArray(b.timeline)) errs.push('The fight timeline is damaged');
    else b.timeline.forEach(function (e, i) {
      var s = e && WL.SPELLS[e.k];
      if (!s || WL.TIMELINE_SPELLS.indexOf(e.k) < 0) errs.push('Timeline entry ' + (i + 1) + ': unknown spell "' + (e && e.k) + '"');
      else if (s.talent && !t[s.talent]) errs.push('Timeline: ' + s.name + ' at ' + e.t.toFixed(1) + ' s needs the ' + WL.TALENT_BY_KEY[s.talent].name + ' talent');
      if (!(e && e.t >= 0 && isFinite(e.t))) errs.push('Timeline entry ' + (i + 1) + ': bad start time');
    });
  }
  return errs;
};

// Spells a player can put on the fight timeline (all castable Warlock spells; Bane of Havoc is automatic with 2+ targets).
WL.TIMELINE_SPELLS = ['curseOfElements', 'baneOfDoom', 'baneOfAgony', 'corruption', 'siphonLife', 'immolate', 'conflagrate', 'shadowburn',
  'soulFire', 'shadowBolt', 'incinerate', 'searingPain', 'drainLife', 'drainSoul', 'wrack', 'hellfire', 'rainOfFire', 'deathCoil', 'lifeTap'];

// Time a timeline entry blocks the caster (cast or GCD, whichever is longer; channels their full duration), with the stats
// of `cfg` (haste, Spellstone, Bane). Decimation / Shadow Trance can only make casts shorter, so they are not assumed.
WL.timelineSpan = function (b, cfg, k) {
  var st = WL.computeStats(b, 'human', cfg), tab = WL.buildSpellTable(b, st, cfg), s = WL.SPELLS[k], h = 1 + (st.hastePct || 0) / 100;
  var gcd = Math.max(cfg.combat.minGcd, cfg.combat.gcd / h);
  if (k === 'lifeTap' || !tab[k]) return { cast: 0, span: gcd, gcd: gcd };
  if (s.kind === 'channel') return { cast: s.duration, span: s.duration, gcd: gcd };
  var cast = tab[k].cast / h;
  return { cast: cast, span: Math.max(cast, gcd), gcd: gcd, cd: tab[k].cd || 0 };
};
// Timing problems of a build's timeline: overlaps (a spell starting before the previous one finished), cooldowns (the
// same spell again too early), entries after the fight's end. Returns [{ i, msg }] (i = index in the time-sorted list).
WL.checkTimeline = function (b, cfg) {
  var out = [], tl = (b.timeline || []).slice().sort(function (x, y) { return x.t - y.t; }), lastEnd = 0, lastCast = {}, dur = cfg.fight.duration;
  tl.forEach(function (e, i) {
    if (!WL.SPELLS[e.k]) return;
    var sp = WL.timelineSpan(b, cfg, e.k), name = WL.SPELLS[e.k].name;
    if (i > 0 && e.t < lastEnd - 1e-6) out.push({ i: i, msg: name + ' at ' + e.t.toFixed(1) + ' s overlaps the previous spell (busy until ' + lastEnd.toFixed(1) + ' s)' });
    if (sp.cd && lastCast[e.k] != null && e.t < lastCast[e.k] + sp.cd - 1e-6)
      out.push({ i: i, msg: name + ' at ' + e.t.toFixed(1) + ' s is still on cooldown (ready at ' + (lastCast[e.k] + sp.cd).toFixed(1) + ' s)' });
    if (e.t >= dur) out.push({ i: i, msg: name + ' at ' + e.t.toFixed(1) + ' s is after the fight (' + dur + ' s) — only reached in longer fights' });
    lastEnd = Math.max(lastEnd, e.t + sp.span); lastCast[e.k] = e.t;
  });
  return out;
};

// Priority actions with numbers of their own (round 104): WL.ACTIONS[key].params = [{ key, def, min, max, name }], the
// build keeps the values in build.params[actionKey][paramKey]; anything not set is the default.
WL.actionParams = function (b, key) {
  var A = WL.ACTIONS[key], out = {}, own = (b && b.params && b.params[key]) || {};
  ((A && A.params) || []).forEach(function (p) { out[p.key] = own[p.key] != null ? own[p.key] : p.def; });
  return out;
};
// The action's label with the build's numbers in place of the "_".
WL.actionLabel = function (b, key) {
  var A = WL.ACTIONS[key]; if (!A) return key;
  if (!A.params) return A.label;
  var v = WL.actionParams(b, key), i = 0;
  return A.label.replace(/_/g, function () { var p = A.params[i++]; return p ? String(v[p.key]) : '_'; });
};
// Keeps only numbers of known actions (build codes, saved builds). undefined when nothing is left.
WL.cleanParams = function (params, rotation) {
  var out = {}, any = false;
  Object.keys(params || {}).forEach(function (a) {
    var A = WL.ACTIONS[a]; if (!A || !A.params || (rotation && rotation.indexOf(a) < 0)) return;
    A.params.forEach(function (p) {
      var v = params[a] && params[a][p.key];
      if (typeof v === 'number' && isFinite(v)) { (out[a] = out[a] || {})[p.key] = v; any = true; }
    });
  });
  return any ? out : undefined;
};

WL.encodeBuild = function (b) {
  var o = { v: 1, short: b.short, talents: b.talents, pet: b.pet || null, sacrifice: b.sacrifice || null, oil: b.oil, rotation: b.rotation };
  if (b.timeline && b.timeline.length) o.tl = b.timeline.map(function (e) { return [Math.round(e.t * 100) / 100, e.k]; });   // round 70
  var p = WL.cleanParams(b.params, b.rotation); if (p) o.p = p;                                                        // round 104
  return WL.BUILD_CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
};

// Shadow Bolt Rank 2 was gutted in Forever and removed (round 81): old build codes and saved builds still load — the Rank 2
// filler / ISB upkeep become their max-rank twins, "Rank 2 below 740 mana" and Rank 2 timeline entries are dropped.
WL.R2_ACTIONS = { shadowBoltR2: 'shadowBolt', isbUpkeepR2: 'isbUpkeep', shadowBoltR2LowMana: null };
WL.migrateRotation = function (rot) {
  var out = [];
  rot.forEach(function (a) { var m = WL.R2_ACTIONS.hasOwnProperty(a) ? WL.R2_ACTIONS[a] : a; if (m && out.indexOf(m) < 0) out.push(m); });
  return out;
};

WL.decodeBuild = function (code) {
  var s = String(code || '').replace(/\s+/g, '');
  if (s.indexOf(WL.BUILD_CODE_PREFIX) !== 0) throw new Error('Not a build code (it must start with ' + WL.BUILD_CODE_PREFIX + ')');
  var o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(s.slice(WL.BUILD_CODE_PREFIX.length))))); }
  catch (e) { throw new Error('The build code is damaged (could not be decoded)'); }
  if (!o || o.v !== 1 || typeof o.talents !== 'object') throw new Error('Unknown build-code version');
  return { short: String(o.short || 'Custom build').slice(0, 40), talents: o.talents, pet: o.pet || null, sacrifice: o.sacrifice || null,
           oil: o.oil || 'none', rotation: Array.isArray(o.rotation) ? WL.migrateRotation(o.rotation) : [],
           params: WL.cleanParams(o.p),
           timeline: Array.isArray(o.tl) ? o.tl.map(function (x) { return { t: +x[0], k: String(x[1]) }; }).filter(function (e) { return e.k !== 'shadowBoltR2'; }) : undefined };
};

// Actions a user may put in a priority list (excludes test-only actions).
WL.editorActions = function () {
  return Object.keys(WL.ACTIONS).filter(function (k) { return k !== 'soulFireShards'; });
};
