// Settings as a shareable code (W8) and the snapshot format used by batch compare (W13).
// Code = "WFS1:" + base64(JSON snapshot). The snapshot holds only what the user can change in the UI:
// fight, gear, options, which buffs / debuffs / consumables are on, professions, pet scaling, boss armor.
// Unknown keys in a code are ignored (older/newer versions stay loadable); lists missing from a code mean "all off".
window.WL = window.WL || {};

WL.SETTINGS_CODE_PREFIX = 'WFS1:';
// Settings that no longer exist: old codes may still carry them; they are dropped without a notice.
WL.RETIRED_SETTINGS = ['options.eurekaPolicy'];   // round 88: Eureka! follows the cooldown setting

WL.settingsSnapshot = function (c) {
  var on = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k].on; }); };
  return {
    v: 1, fight: c.fight, gear: c.gear, options: c.options,
    buffs: on(c.buffs), debuffs: on(c.debuffs), cons: on(c.consumables),
    prof: c.professions || {}, petSpPct: c.petSpPct,
    succ: { apPerSp: c.pets.succubus.melee.apPerSp, baseDps: c.pets.succubus.melee.baseDps },
    bossArmor: c.combat.bossArmor,
    resist: c.combat.targetResist, levelResist: !!(c.combat.levelResist && c.combat.levelResist.on),   // round 39
  };
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
    list.forEach(function (k) { if (!tgt[k]) unknown.push(p[0] + '.' + k); });
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
  return unknown;
};

// Short human-readable summary of a snapshot (batch-compare list).
WL.describeSettings = function (o) {
  var g = o.gear || {};
  return g.sp + ' SP · ' + g.hitPct + '% hit · ' + g.critPct + '% crit · ' + g.hastePct + '% haste · ' +
    (o.buffs || []).length + ' buffs · ' + (o.cons || []).length + ' consumables' + ((o.prof || {}).engineering ? ' · Engineering' : '') +
    ' · ' + (o.fight || {}).duration + ' s · ' + (o.fight || {}).iterations + ' fights';
};
