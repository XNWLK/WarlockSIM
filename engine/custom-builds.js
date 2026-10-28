// Custom builds (W7): validation (same rules as tests/test-data.js and tools/explore.js) and a shareable build code.
// Build code = "WFB1:" + base64(JSON {v, short, talents, pet, sacrifice, oil, rotation, tl?}); tl = fight timeline [[t, spell], …] (round 70).
// Wowhead Forever talent-calculator links cannot be imported: their URL encoding could not be determined (round 20,
// docs/03_BUILD_LOG.md step 28) — the editor uses its own code instead.
window.WL = window.WL || {};

WL.BUILD_CODE_PREFIX = 'WFB1:';
WL.PET_KEYS = ['imp', 'succubus', 'felhunter', 'voidwalker'];
WL.SACRIFICE_KEYS = ['imp', 'succubus', 'voidwalker', 'felhunter'];   // Voidwalker (mana) and Felhunter (health) since round 119

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
  // Round 157: rules ('rule:N'), groups ('group:Name', put in place) and variables of the build's own.
  (b.rotation || []).forEach(function (a) {
    var m = /^group:(.+)$/.exec(a); if (!m) return;
    var g = (b.groups || {})[m[1]];
    if (!Array.isArray(g)) errs.push('No group named "' + m[1] + '"');
    else if (!g.length) errs.push('Group "' + m[1] + '" is empty');
    else g.forEach(function (x) { if (/^group:/.test(x)) errs.push('Group "' + m[1] + '": a group cannot hold another group'); });
  });
  (b.rules || []).forEach(function (r, i) {
    var where = 'Rule ' + (i + 1) + (r && r.name ? ' (' + r.name + ')' : ''), s = r && WL.SPELLS[r.spell];
    if (!s || WL.RULE_SPELLS.indexOf(r.spell) < 0) { errs.push(where + ': unknown spell "' + (r && r.spell) + '"'); return; }
    if (s.talent && !t[s.talent]) errs.push(where + ': ' + s.name + ' needs the ' + WL.TALENT_BY_KEY[s.talent].name + ' talent');
    errs = errs.concat(WL.condErrors(r.when, b, where));
  });
  Object.keys(b.actWhen || {}).forEach(function (k) {                // round 166: conditions on built-in actions
    if (!WL.ACTIONS[k]) errs.push('A condition for an unknown action "' + k + '"');
    else errs = errs.concat(WL.condErrors(b.actWhen[k], b, '"' + WL.ACTIONS[k].label + '"'));
  });
  Object.keys(b.vars || {}).forEach(function (k) {
    var v = b.vars[k];
    if (!/^[A-Za-z][\w -]{0,29}$/.test(k)) errs.push('Variable "' + k + '": a name of letters, digits and spaces (up to 30)');
    if (!v || (v.cond == null && !(typeof v.num === 'number' && isFinite(v.num)))) errs.push('Variable "' + k + '" is empty');
    else if (v.cond) errs = errs.concat(WL.condErrors(v.cond, b, 'Variable "' + k + '"'));
  });
  var rot = WL.expandGroups(b);
  if (!rot.length) errs.push('The priority list is empty');
  rot.forEach(function (a) { if (!WL.actionOf(a, b)) errs.push(/^rule:/.test(a) ? 'The priority list names a rule that does not exist (' + a + ')' : 'Unknown priority action "' + a + '"'); });
  var fi = rot.map(function (a) { var A = WL.actionOf(a, b); return !!(A && A.filler); }).indexOf(true);
  if (fi < 0 && rot.length) errs.push('The priority list needs a filler (Shadow Bolt, Searing Pain, Incinerate, … or a rule without a condition) at the end');
  else if (fi >= 0 && fi < rot.length - 1) errs.push('Everything after the first filler (' + WL.actionOf(rot[fi], b).label + ') is never cast — move the filler to the end');
  // Talent-gated actions without the talent (they would silently never fire).
  var gated = { conflagrate: 'conflagrate', conflagrateExpire: 'conflagrate', shadowburn: 'shadowburn', incinerate: 'incinerate', wrack: 'wrack', wrackDots: 'wrack', siphonLife: 'siphonLife',
    searingPainBrand: 'demonicBrand', searingPainDecimation: 'decimation', lifeTapPet: 'demonicEnergies', shadowburnSnF: 'shadowAndFlame', conflagrateSnF: 'shadowAndFlame', shadowBoltSpread: 'improvedShadowBolt', isbUpkeep: 'improvedShadowBolt' };
  if (rot.indexOf('shadowburnSnF') >= 0 && !t.shadowburn) errs.push('"' + WL.ACTIONS.shadowburnSnF.label + '" needs the Shadowburn talent');
  if (rot.indexOf('conflagrateSnF') >= 0 && !t.conflagrate) errs.push('"' + WL.ACTIONS.conflagrateSnF.label + '" needs the Conflagrate talent');
  rot.forEach(function (a) { if (gated[a] && !t[gated[a]]) errs.push('"' + WL.ACTIONS[a].label + '" needs the ' + WL.TALENT_BY_KEY[gated[a]].name + ' talent'); });   // rot: groups put in place
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
    // the cooldown runs from the END of the previous cast (round 107)
    if (sp.cd && lastCast[e.k] != null && e.t < lastCast[e.k] + sp.cast + sp.cd - 1e-6)
      out.push({ i: i, msg: name + ' at ' + e.t.toFixed(1) + ' s is still on cooldown (ready at ' + (lastCast[e.k] + sp.cast + sp.cd).toFixed(1) + ' s)' });
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
  var g = /^group:(.+)$/.exec(key || '');
  if (g) { var n = ((b && b.groups) || {})[g[1]]; return 'Group "' + g[1] + '"' + (n ? ' (' + n.length + ' action' + (n.length === 1 ? '' : 's') + ')' : ''); }   // round 157
  var A = WL.actionOf(key, b); if (!A) return key;
  if (A.rule) return A.label;
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

// ---------- Wowhead Forever talent links (round 166, user; on hold until the format was known) ----------
// https://www.wowhead.com/forever/talent-calc/warlock/v2<tree>-<tree>-<tree>_t0/<clicks>
//   v2       the link version;
//   <tree>   one digit per talent = its points, in the tree's reading order (row by row, left to right); trailing zeros and
//            empty trees at the end are left out; Affliction - Demonology - Destruction;
//   <clicks> the order the points were spent: a tree digit (0 / 1 / 2), then one letter per point (a = the tree's first
//            talent …). Wowhead rewrites it in a shorter form of its own; the digits after v2 are what counts here.
// Checked 2026-10-28: Demo Pact Shadow Bolt's link loads on Wowhead with exactly its points.
WL.WOWHEAD_TREES = ['affliction', 'demonology', 'destruction'];
WL.wowheadTreeOrder = function (tree) {
  return WL.TALENTS.filter(function (t) { return t.tree === tree; }).sort(function (a, b) { return a.row - b.row || a.col - b.col; });
};
WL.wowheadTalentLink = function (b) {
  var parts = [], clicks = '';
  WL.WOWHEAD_TREES.forEach(function (tree, ti) {
    var list = WL.wowheadTreeOrder(tree), d = '', c = '';
    list.forEach(function (t, i) { var n = (b.talents || {})[t.key] || 0; d += n; c += new Array(n + 1).join(String.fromCharCode(97 + i)); });
    parts.push(d.replace(/0+$/, '')); if (c) clicks += ti + c;
  });
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  return 'https://www.wowhead.com/forever/talent-calc/warlock/v2' + parts.join('-') + '_t0' + (clicks ? '/' + clicks : '');
};
// Talents of a Wowhead talent link, or null when the text is none. Throws on a link of another class or a broken one.
WL.parseWowheadTalents = function (text) {
  var s = String(text || '').trim(), m = s.match(/talent-calc\/([a-z-]+)\/?([^\s?#]*)/i);
  if (!m) return null;
  if (m[1].toLowerCase() !== 'warlock') throw new Error('That is a talent link for ' + m[1] + ', not for a Warlock.');
  var path = m[2], talents = {}, v = path.match(/^v\d([0-9-]*)/);
  if (v) {
    v[1].split('-').forEach(function (d, ti) {
      var list = WL.wowheadTreeOrder(WL.WOWHEAD_TREES[ti] || '');
      if (ti > 2 || d.length > list.length) throw new Error('The talent link does not fit the Forever Warlock trees.');
      d.split('').forEach(function (ch, i) { var n = +ch; if (n) talents[list[i].key] = Math.min(n, list[i].ranks); });
    });
  } else {                                                // only the clicks (lower case = one point, upper case = all ranks)
    var clicks = path.split('/').pop(), tree = -1;
    clicks.split('').forEach(function (ch) {
      if (/[0-2]/.test(ch)) { tree = +ch; return; }
      var list = WL.wowheadTreeOrder(WL.WOWHEAD_TREES[tree] || ''), i = ch.toLowerCase().charCodeAt(0) - 97, t = list[i];
      if (!t) throw new Error('The talent link does not fit the Forever Warlock trees.');
      talents[t.key] = ch === ch.toUpperCase() ? t.ranks : Math.min(t.ranks, (talents[t.key] || 0) + 1);
    });
  }
  return talents;
};

WL.encodeBuild = function (b) {
  var o = { v: 1, short: b.short, talents: b.talents, pet: b.pet || null, sacrifice: b.sacrifice || null, oil: b.oil, rotation: b.rotation };
  if (b.timeline && b.timeline.length) o.tl = b.timeline.map(function (e) { return [Math.round(e.t * 100) / 100, e.k]; });   // round 70
  var p = WL.cleanParams(b.params, b.rotation); if (p) o.p = p;                                                        // round 104
  if (b.rules && b.rules.length) o.rules = b.rules;                                                                    // round 157
  if (b.groups && Object.keys(b.groups).length) o.groups = b.groups;
  if (b.vars && Object.keys(b.vars).length) o.vars = b.vars;
  if (b.actWhen && Object.keys(b.actWhen).length) o.aw = b.actWhen;                                                   // round 166
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

// Talents a Forever patch removed (round 149): old build codes and saved builds still load. Malediction (patch of
// 2026-10-16) became Grim Reach in the same place of the tree (2 ranks, range only): its points move there as far as they
// fit, the rest are left unspent. → { talents, notes: [what was moved] }.
WL.RETIRED_TALENTS = { malediction: { name: 'Malediction', to: 'grimReach' } };
WL.migrateTalents = function (t) {
  var out = {}, notes = [];
  Object.keys(t || {}).forEach(function (k) { if (!WL.RETIRED_TALENTS[k] && +t[k]) out[k] = +t[k]; });
  Object.keys(t || {}).forEach(function (k) {
    var r = WL.RETIRED_TALENTS[k], n = +t[k] || 0; if (!r || !n) return;
    var to = WL.TALENT_BY_KEY[r.to], m = Math.min(n, to.ranks - (out[r.to] || 0));
    if (m > 0) out[r.to] = (out[r.to] || 0) + m;
    notes.push(r.name + ' no longer exists: ' + (m > 0 ? m + ' of its ' + n + ' point' + (n > 1 ? 's' : '') + ' moved to ' + to.name : 'its ' + n + ' point' + (n > 1 ? 's are' : ' is') + ' unspent') +
      (m > 0 && n > m ? ', ' + (n - m) + ' unspent' : ''));
  });
  return { talents: out, notes: notes };
};

WL.decodeBuild = function (code) {
  var s = String(code || '').replace(/\s+/g, '');
  if (s.indexOf(WL.BUILD_CODE_PREFIX) !== 0) throw new Error('Not a build code (it must start with ' + WL.BUILD_CODE_PREFIX + ')');
  var o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(s.slice(WL.BUILD_CODE_PREFIX.length))))); }
  catch (e) { throw new Error('The build code is damaged (could not be decoded)'); }
  if (!o || o.v !== 1 || typeof o.talents !== 'object') throw new Error('Unknown build-code version');
  var mt = WL.migrateTalents(o.talents);
  var b = { short: String(o.short || 'Custom build').slice(0, 40), talents: mt.talents, pet: o.pet || null, sacrifice: o.sacrifice || null,
           oil: o.oil || 'none', rotation: Array.isArray(o.rotation) ? WL.migrateRotation(o.rotation) : [],
           params: WL.cleanParams(o.p),
           timeline: Array.isArray(o.tl) ? o.tl.map(function (x) { return { t: +x[0], k: String(x[1]) }; }).filter(function (e) { return e.k !== 'shadowBoltR2'; }) : undefined };
  if (mt.notes.length) b.migrated = mt.notes;                       // round 149: what a patch changed in this build
  if (Array.isArray(o.rules)) b.rules = o.rules.filter(function (r) { return r && typeof r.spell === 'string'; }).map(function (r) { var x = { spell: r.spell }; if (r.when) x.when = r.when; if (r.name) x.name = String(r.name).slice(0, 40); return x; });   // round 157
  if (o.groups && typeof o.groups === 'object') { b.groups = {}; Object.keys(o.groups).forEach(function (k) { if (Array.isArray(o.groups[k])) b.groups[String(k).slice(0, 30)] = o.groups[k].map(String); }); }
  if (o.aw && typeof o.aw === 'object') { b.actWhen = {}; Object.keys(o.aw).forEach(function (k) { if (WL.ACTIONS[k] && o.aw[k]) b.actWhen[k] = o.aw[k]; }); if (!Object.keys(b.actWhen).length) delete b.actWhen; }   // round 166
  if (o.vars && typeof o.vars === 'object') { b.vars = {}; Object.keys(o.vars).forEach(function (k) { var v = o.vars[k]; if (v && (v.cond || typeof v.num === 'number')) b.vars[String(k).slice(0, 30)] = v.cond ? { cond: v.cond } : { num: +v.num }; }); }
  return b;
};

// Actions a user may put in a priority list (excludes test-only actions).
WL.editorActions = function () {
  return Object.keys(WL.ACTIONS).filter(function (k) { return k !== 'soulFireShards'; });
};

// ---------- talent point value (round 148, user): the build with one point fewer in one talent ----------
// Priority actions that need a talent (or several) to do anything — the same rules as WL.validateBuild's checks.
WL.ACTION_TALENTS = {
  conflagrate: ['conflagrate'], conflagrateExpire: ['conflagrate'], shadowburn: ['shadowburn'], incinerate: ['incinerate'],
  wrack: ['wrack'], wrackDots: ['wrack'], siphonLife: ['siphonLife'], searingPainBrand: ['demonicBrand'],
  searingPainDecimation: ['decimation'], lifeTapPet: ['demonicEnergies'], shadowBoltSpread: ['improvedShadowBolt'],
  isbUpkeep: ['improvedShadowBolt'], shadowburnSnF: ['shadowAndFlame', 'shadowburn'], conflagrateSnF: ['shadowAndFlame', 'conflagrate'],
  swapToImp: ['demonicSacrifice', 'demonicPact', 'felDomination'], swapToSuccubus: ['demonicSacrifice', 'demonicPact', 'felDomination'],
};
// A copy of build b with one point fewer in talent `key`. When the talent is gone completely, whatever only it allowed goes
// too: its priority actions and timeline spells, the sacrifice (Demonic Sacrifice); a priority left without a filler gets
// Shadow Bolt at the end. Row and 51-point rules are not rechecked — it measures what the point does, not a legal build.
// Returns { build, notes: [what else had to change] }.
WL.buildWithoutPoint = function (b, key) {
  var t = JSON.parse(JSON.stringify(b.talents || {})), notes = [];
  var c = { short: b.short, talents: t, pet: b.pet || null, sacrifice: b.sacrifice || null, oil: b.oil, rotation: (b.rotation || []).slice(),
            timeline: b.timeline ? b.timeline.map(function (e) { return { t: e.t, k: e.k }; }) : undefined, params: b.params };
  if (!t[key]) return { build: c, notes: notes };
  if (--t[key] > 0) return { build: c, notes: notes };
  delete t[key];
  var gone = c.rotation.filter(function (a) { return (WL.ACTION_TALENTS[a] || []).some(function (x) { return !t[x]; }); });
  if (gone.length) {
    c.rotation = c.rotation.filter(function (a) { return gone.indexOf(a) < 0; });
    notes.push('taken out of the priority: ' + gone.map(function (a) { return WL.ACTIONS[a] ? WL.ACTIONS[a].label.replace(/_/g, '…') : a; }).join(', '));
  }
  if (c.timeline) {
    var before = c.timeline.length;
    c.timeline = c.timeline.filter(function (e) { var s = WL.SPELLS[e.k]; return !(s && s.talent && !t[s.talent]); });
    if (c.timeline.length < before) notes.push((before - c.timeline.length) + ' timeline entr' + (before - c.timeline.length === 1 ? 'y' : 'ies') + ' removed');
  }
  if (key === 'demonicSacrifice' && c.sacrifice) { c.sacrifice = null; notes.push('no demon sacrificed'); }
  if (!c.rotation.some(function (a) { return WL.ACTIONS[a] && WL.ACTIONS[a].filler; })) { c.rotation.push('shadowBolt'); notes.push('Shadow Bolt added as the filler'); }
  c.params = WL.cleanParams(b.params, c.rotation);
  return { build: c, notes: notes };
};
