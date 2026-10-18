// Rotation actions. A build's `rotation` is an ordered list of these keys; at every decision point the engine
// casts the FIRST action whose condition returns a spell key. Conditions read the sim state `S` (see engine/sim.js).
//
//   S.t            current time (s)          S.remaining   fight time left (s)
//   S.has(key)     spell available (talented)  S.ready(key) cooldown ready
//   S.dotLeft(key) seconds left on own DoT (0 if absent)
//   S.castTime(key) hasted cast time now     S.buff(name) buff/debuff active
//   S.targetHpPct  target health % (falls linearly [A24])
window.WL = window.WL || {};

// A DoT should be (re)applied when it is missing or will expire before the new cast lands. Near the end of the fight
// (the new DoT cannot run its full duration) the engine's end-of-fight check S.dotWorth decides: recast only if the
// damage it still adds beats the filler in the same time (round 53, A69). With that check switched off
// (options.dotEndCheck = false, S.dotWorth returns null) the old rule applies: at least `minTicks` ticks must fit.
function dotWorthOr(S, key, ti, oldRule) { var w = S.dotWorth ? S.dotWorth(key, ti) : null; return w === null ? oldRule : w; }
function dotNeeded(S, key, minTicks) {
  var s = WL.SPELLS[key];
  if (!S.has(key)) return false;
  if (S.dotLeft(key) > S.castTime(key)) return false;
  return dotWorthOr(S, key, 0, S.remaining - S.castTime(key) >= s.tickEvery * (minTicks || 2));
}

// The DoTs a priority list keeps up, for "Wrack when the shortest DoT has more than _ s left" (round 106): action → DoT.
// "bane" counts only as Bane of Agony — Bane of Doom is left out (user): it cannot be refreshed before it explodes.
WL.DOT_ACTIONS = { corruption: 'corruption', immolate: 'immolate', siphonLife: 'siphonLife', baneOfAgony: 'baneOfAgony', bane: 'baneOfAgony' };
// Shortest time left on those DoTs. A DoT that is not on the boss right now is not counted (its own action recasts
// it, or the end-of-fight check decided against it); Infinity when none is running.
WL.minDotLeft = function (S) {
  var rot = WL.expandGroups(S.build), min = Infinity;
  for (var i = 0; i < rot.length; i++) {
    var d = WL.DOT_ACTIONS[rot[i]]; if (!d) continue;
    var left = S.dotLeft(d);
    if (left > 0 && left < min) min = left;
  }
  return min;
};

WL.CONFLAG_EXPIRE_S = 3;   // "about to expire" for conflagrateExpire: one Immolate tick interval
WL.ACTIONS = {
  // Keep Curse of the Elements on the boss. [A34]
  curseOfElements: {
    label: 'Curse of the Elements if missing',
    pick: function (S) { return S.cfg.options.useCurseOfElements && !S.buff('coe') && S.remaining > 10 ? 'curseOfElements' : null; },
  },
  // Nightfall proc: instant Shadow Bolt.
  shadowTrance: {
    label: 'Shadow Bolt (max rank) if Shadow Trance (Nightfall) is up',
    pick: function (S) { return S.buff('shadowTrance') ? 'shadowBolt' : null; },
  },
  // One Bane per target: Bane of Doom when ready and it will explode before the fight ends, else Bane of Agony.
  bane: {
    label: 'Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off)',
    pick: function (S) {
      if (S.dotLeft('baneOfDoom') > 0 || S.dotLeft('baneOfAgony') > 0) return null;
      if (S.ready('baneOfDoom') && S.remaining >= 60) return 'baneOfDoom';
      if (S.has('baneOfAgony') && dotWorthOr(S, 'baneOfAgony', 0, S.remaining >= 12)) return 'baneOfAgony';
      return null;
    },
  },
  // Bane of Agony for the whole fight, never Bane of Doom (round 56, user) — use it instead of `bane`. Cast when no Bane
  // is on the target; near the end of the fight only while it still pays off (A69; check off: ≥ 12 s left).
  baneOfAgony: {
    label: 'Bane of Agony if no Bane (never Bane of Doom)',
    pick: function (S) {
      if (S.dotLeft('baneOfDoom') > 0 || S.dotLeft('baneOfAgony') > 0) return null;
      return S.has('baneOfAgony') && dotWorthOr(S, 'baneOfAgony', 0, S.remaining >= 12) ? 'baneOfAgony' : null;
    },
  },
  corruption: { label: 'Corruption if missing/expiring', pick: function (S) { return dotNeeded(S, 'corruption') ? 'corruption' : null; } },
  siphonLife: { label: 'Siphon Life if missing/expiring', pick: function (S) { return dotNeeded(S, 'siphonLife') ? 'siphonLife' : null; } },
  // With "Conflagrate only when Immolate is about to expire" in the list (round 97) an Immolate that is still up is not
  // refreshed while Conflagrate is ready: the Conflagrate goes first and takes that Immolate, then the new one is cast.
  immolate:   { label: 'Immolate if missing/expiring', pick: function (S) {
    if (S.build.rotation.indexOf('conflagrateExpire') >= 0 && S.has('conflagrate') && S.ready('conflagrate') && S.dotLeft('immolate') > 0) return null;
    return dotNeeded(S, 'immolate') ? 'immolate' : null;
  } },
  conflagrate: {
    label: 'Conflagrate on cooldown while Immolate is up',
    pick: function (S) { return S.has('conflagrate') && S.ready('conflagrate') && S.dotLeft('immolate') > 0 ? 'conflagrate' : null; },
  },
  // Conflagrate only when Immolate is about to expire (round 97, user): Conflagrate consumes Immolate, so on cooldown it
  // cuts Immolate short (10 s cooldown vs 15 s Immolate). Here it waits until Immolate has at most CONFLAG_EXPIRE_S left —
  // 4 of its 5 ticks are done — and the Immolate action above / below then recasts it. Works at any place in the list.
  conflagrateExpire: {
    label: 'Conflagrate only when Immolate is about to expire (≤ 3 s left)',
    pick: function (S) {
      if (!S.has('conflagrate') || !S.ready('conflagrate')) return null;
      var left = S.dotLeft('immolate');
      return left > 0 && left <= WL.CONFLAG_EXPIRE_S ? 'conflagrate' : null;
    },
  },
  shadowburn: {
    label: 'Shadowburn on cooldown (needs a Soul Shard)',
    pick: function (S) { return S.has('shadowburn') && S.ready('shadowburn') && S.shards > 0 ? 'shadowburn' : null; },
  },
  // Shadowburn only to keep Shadow and Flame's Fire buff (+10% Fire, 20 s) up: cast when the buff is missing or has
  // ≤ 3 s left (≈ one filler cast, so the refresh is not pushed past the expiry), instead of on every 15 s cooldown
  // (user, round 25). Tested thresholds 1 GCD / 2.5 / 3 / 4 s: all within noise of "on cooldown" (04_EXPLORATION §14).
  shadowburnSnF: {
    label: 'Shadowburn only to keep Shadow and Flame (Fire +10%) up (≤ 3 s left)',
    pick: function (S) {
      if (!S.has('shadowburn') || !S.build.talents.shadowAndFlame || !S.ready('shadowburn') || !(S.shards > 0)) return null;
      var left = S.buff('snfFire') ? S.buffs.snfFire - S.t : 0;
      return left <= 3 ? 'shadowburn' : null;
    },
  },
  // Conflagrate only to keep Shadow and Flame's Shadow buff (+10% Shadow, 20 s) up (round 67, user; like shadowburnSnF):
  // cast when the buff is missing or has ≤ 3 s left, instead of on every 10 s cooldown. Needs Immolate on the target.
  conflagrateSnF: {
    label: 'Conflagrate only to keep Shadow and Flame (Shadow +10%) up (≤ 3 s left)',
    pick: function (S) {
      if (!S.has('conflagrate') || !S.build.talents.shadowAndFlame || !S.ready('conflagrate') || !(S.dotLeft('immolate') > 0)) return null;
      var left = S.buff('snfShadow') ? S.buffs.snfShadow - S.t : 0;
      return left <= 3 ? 'conflagrate' : null;
    },
  },
  // Multi-DoT (round 27, A61): keep Corruption / Siphon Life / Bane of Agony / Immolate on targets 2 and 3.
  // Same refresh rule as on the boss (missing or expiring; near the end only while it still pays off, round 53). The Havoc target cannot
  // take Bane of Agony (one Bane per target). Sets S.nextTarget so the engine applies the spell to that target.
  // Round 39: your Curse of the Elements goes on each extra target first (when "Keep Curse of the Elements up" is on;
  // one curse per target, a Bane is not a curse) — it raises your damage there by 10%.
  multiDot: {
    label: 'Keep Curse of the Elements and DoTs on the extra targets (multi-DoT)',
    pick: function (S) {
      var order = ['curseOfElements', 'corruption', 'siphonLife', 'baneOfAgony', 'immolate'];
      for (var ti = 2; ti <= (S.multiTargets || 1); ti++) {
        for (var j = 0; j < order.length; j++) {
          var k = order[j];
          if (k === 'curseOfElements') {
            if (S.cfg.options.useCurseOfElements && S.xDebLeft(ti, 'coe') <= 0 && S.remaining > 10) { S.nextTarget = ti; return k; }
            continue;
          }
          if (!S.has(k) || (k === 'baneOfAgony' && ti === S.havocTarget)) continue;
          if (S.xDotLeft(ti, k) > S.castTime(k)) continue;
          if (!dotWorthOr(S, k, ti, S.remaining - S.castTime(k) >= WL.SPELLS[k].tickEvery * 2)) continue;
          S.nextTarget = ti; return k;
        }
      }
      return null;
    },
  },
  // Improved Shadow Bolt on the extra targets (round 39, user: per-target ISB): ISB only lands on the target a Shadow Bolt
  // crits. This casts Shadow Bolt at an extra target that has at least one of your DoTs and no ISB (or ISB running out
  // before the cast lands). Needs Improved Shadow Bolt; does nothing with 1 target.
  shadowBoltSpread: {
    label: 'Shadow Bolt an extra target that has your DoTs but no Improved Shadow Bolt',
    pick: function (S) {
      if (!S.build.talents.improvedShadowBolt) return null;
      var dots = ['corruption', 'siphonLife', 'baneOfAgony', 'immolate'];
      for (var ti = 2; ti <= (S.multiTargets || 1); ti++) {
        if (S.xDebLeft(ti, 'isb') > S.castTime('shadowBolt')) continue;
        if (!dots.some(function (k) { return S.xDotLeft(ti, k) > 0; })) continue;
        S.nextTarget = ti; return 'shadowBolt';
      }
      return null;
    },
  },
  // Keep Improved Shadow Bolt up on the boss (round 63, user; A72): cast the max-rank Shadow Bolt while the debuff is
  // missing or runs out before the bolt lands, so a Fire build's Shadow damage (Corruption, Banes, Shadowburn, Siphon Life)
  // gets +20%; the rest of the time the build's own filler (e.g. Incinerate). Put it right above the filler. Needs the talent.
  isbUpkeep: {
    label: 'Shadow Bolt (max rank) to keep Improved Shadow Bolt up on the boss',
    pick: function (S) {
      if (!S.build.talents.improvedShadowBolt) return null;
      var left = S.buff('isb') ? S.buffs.isb - S.t : 0;
      return left <= S.castTime('shadowBolt') ? 'shadowBolt' : null;
    },
  },
  // Death Coil (round 71, user; damage only, the heal is not modelled) [A74]
  deathCoil: {
    label: 'Death Coil on cooldown',
    pick: function (S) { return S.ready('deathCoil') ? 'deathCoil' : null; },
  },
  // Finisher: the last spell before the boss dies — when the time left is shorter than the filler's cast (so a normal
  // spell could not land any more) and Death Coil can still land (travel time). Put it at the top of the priority.
  deathCoilFinisher: {
    label: 'Death Coil as the finisher (when the filler would not land before the boss dies)',
    pick: function (S) {
      if (!S.ready('deathCoil')) return null;
      var rot = WL.expandGroups(S.build), f = null;
      // what the list would cast as its filler right now: a conditional filler (preFiller, round 106) when it applies, else the filler
      for (var i = 0; i < rot.length && !f; i++) { var A = WL.actionOf(rot[i], S.build); if (A && (A.filler || A.preFiller)) f = A.pick(S); }
      var sf = f && WL.SPELLS[f], need = !f ? S.gcd() : sf.kind === 'channel' ? sf.tickEvery : Math.max(S.castTime(f), 0.001);
      var travel = Math.max(0, (S.cfg.fight.travelMs || 0) / 1000);
      return S.remaining < need - 1e-6 && S.remaining > travel + 1e-6 ? 'deathCoil' : null;
    },
  },
  // Mid-fight pet swap (round 35, A63): the first time the boss is in the execute phase, sacrifice the active pet
  // (Demonic Sacrifice, off the GCD), Fel Domination (off the GCD) and summon the other demon (instant with Fel
  // Domination + Master Summoner 2/2; one GCD). Needs Demonic Sacrifice, Demonic Pact and Fel Domination. The sim then
  // uses the new sacrifice buff and the new pet for the rest of the fight.
  swapToImp: {
    label: 'At execute: sacrifice the pet, Fel Domination, summon the Imp',
    pick: function (S) { return S.canSwap && S.canSwap('imp') ? 'swap:imp' : null; },
  },
  swapToSuccubus: {
    label: 'At execute: sacrifice the pet, Fel Domination, summon the Succubus',
    pick: function (S) { return S.canSwap && S.canSwap('succubus') ? 'swap:succubus' : null; },
  },
  // Searing Pain only in the execute phase (where Decimation adds 6% and makes Soul Fire fast) — place it above the
  // normal filler to change fillers at execute (round 35).
  searingPainExecute: {
    label: 'Searing Pain in the execute phase (below the execute threshold)',
    pick: function (S) { return S.targetHpPct < S.cfg.fight.executePct ? 'searingPain' : null; },
  },
  // Searing Pain in the execute phase only to trigger Decimation (round 98, user): one Searing Pain right before Soul Fire
  // comes off cooldown, when the buff would not be up by then — for fillers that do not trigger Decimation themselves
  // (Drain Life, Wrack, Incinerate). The filler stays the filler. Does nothing without a Soul Fire action in the list,
  // or when the Soul Fire could not be cast before the boss dies.
  searingPainDecimation: {
    label: 'Searing Pain in the execute phase only to trigger Decimation (for Soul Fire)',
    pick: function (S) {
      var rank = S.build.talents.decimation, rot = S.build.rotation;
      if (!rank || !(S.targetHpPct < S.cfg.fight.executePct)) return null;
      if (rot.indexOf('soulFire') < 0 && rot.indexOf('soulFireShards') < 0) return null;
      var cd = Math.max(0, (S.cds.soulFire || 0) - S.t), up = S.buff('decimation') ? S.buffs.decimation - S.t : 0;
      if (up > cd) return null;                                           // Decimation is already up when Soul Fire is ready
      var sp = S.castTime('searingPain');
      if (cd > sp) return null;                                           // too early: the filler goes first
      var sf = S.castTime('soulFire') * (S.buff('decimation') ? 1 : 1 - WL.TALENT_BY_KEY.decimation.v.sfCastRedPct[rank - 1] / 100);
      return S.remaining >= Math.max(sp, S.gcd()) + sf ? 'searingPain' : null;
    },
  },
  // Soul Fire only while Decimation makes it free and fast (no shard spending otherwise).
  soulFire: {
    label: 'Soul Fire while Decimation buff is up',
    pick: function (S) { return S.buff('decimation') && S.ready('soulFire') ? 'soulFire' : null; },
  },
  // Demonic Energies: Life Tap early to keep the pet casting. Only when the pet is about to run dry
  // and the Warlock has room for the whole tap (the pet only gets mana the Warlock actually gains).
  lifeTapPet: {
    label: 'Life Tap to feed the pet (Demonic Energies) when it is nearly out of mana',
    pick: function (S) {
      if (!S.build.talents.demonicEnergies || !S.build.pet) return null;
      if (S.petMana() >= 2 * S.petSpellCost()) return null;
      return S.maxMana - S.mana >= S.tapGain() ? 'lifeTap' : null;
    },
  },
  // Life Tap early (round 104, user): when mana is below X% of your maximum and more than Y s of the fight remain. X and Y
  // are the build's own numbers (build.params.lifeTapBelow = { pct, sec }, typed into the build editor; `params` below
  // lists them with their defaults and limits — the "_" in the label are where they go). The automatic Life Tap (mana
  // below the next spell's cost) stays as it is.
  lifeTapBelow: {
    label: 'Life Tap when mana is below _% and more than _ s remain',
    params: [{ key: 'pct', def: 40, min: 1, max: 100, name: 'mana %' }, { key: 'sec', def: 25, min: 0, max: 3600, name: 'seconds left' }],
    pick: function (S) {
      var p = S.build.params && S.build.params.lifeTapBelow;
      var pct = p && p.pct != null ? p.pct : 40, sec = p && p.sec != null ? p.sec : 25;
      return S.mana < S.maxMana * pct / 100 && S.remaining > sec ? 'lifeTap' : null;
    },
  },
  // Demonic Brand upkeep: Searing Pain when the brand is down (or out of charges) and a pet is out.
  searingPainBrand: {
    label: 'Searing Pain to (re)apply Demonic Brand when it is down',
    pick: function (S) {
      if (!S.build.talents.demonicBrand || !S.build.pet) return null;
      return (!S.buff('brand') || !(S.brandCharges > 0)) ? 'searingPain' : null;
    },
  },
  // Soul Fire on cooldown, spending a Soul Shard when Decimation is not up (tests whether shards should be spent). [A25]
  soulFireShards: {
    label: 'Soul Fire on cooldown (spends a Soul Shard outside Decimation)',
    pick: function (S) { return S.ready('soulFire') && (S.buff('decimation') || S.shards > 0) ? 'soulFire' : null; },
  },
  // Wrack only while your DoTs have time left (round 106, user feedback): starts a Wrack when the shortest of the DoTs
  // this priority list keeps up (WL.DOT_ACTIONS, Bane of Doom left out) has more than X s left; otherwise it passes and
  // the list goes on to the filler below it (Shadow Bolt, Drain Life, …). X = build.params.wrackDots.sec (default 6 = one
  // full Wrack). Not a filler itself: the list still needs one at the end. A running Wrack is clipped as before when
  // something above it becomes due.
  wrackDots: {
    label: 'Wrack when the shortest DoT has more than _ s left',
    preFiller: true,                                                    // a filler with a condition: sits above the real filler
    params: [{ key: 'sec', def: 6, min: 0, max: 60, name: 'seconds left on the shortest DoT' }],
    pick: function (S) {
      if (!S.has('wrack')) return null;
      var p = S.build.params && S.build.params.wrackDots, sec = p && p.sec != null ? p.sec : 6;
      return WL.minDotLeft(S) > sec ? 'wrack' : null;
    },
  },
  // Fillers (always available).
  wrack:       { label: 'Wrack (filler channel)', filler: true, pick: function (S) { return S.has('wrack') ? 'wrack' : null; } },
  shadowBolt:  { label: 'Shadow Bolt (filler)',   filler: true, pick: function () { return 'shadowBolt'; } },
  incinerate:  { label: 'Incinerate (filler)',    filler: true, pick: function (S) { return S.has('incinerate') ? 'incinerate' : null; } },
  drainLife:   { label: 'Drain Life (filler channel)', filler: true, pick: function () { return 'drainLife'; } },
  // AoE channels as fillers (round 100, user): every tick hits every target of the fight (Fight & pets → Targets). [A79]
  hellfire:    { label: 'Hellfire (filler channel, hits every target)', filler: true, pick: function () { return 'hellfire'; } },
  rainOfFire:  { label: 'Rain of Fire (filler channel, hits every target)', filler: true, pick: function () { return 'rainOfFire'; } },
  // Drain Soul removed: its execute bonus no longer exists and it is not used (user, 2026-09-23).
  searingPain: { label: 'Searing Pain (filler)',  filler: true, pick: function () { return 'searingPain'; } },
};

// ---------- rules, groups and variables of your own (round 157, user: "an action priority list" like other sims) ----------
// Besides the actions above, a build's priority can hold
//   'rule:N'     build.rules[N] = { spell, when, name? }: cast `spell` when the condition `when` holds (no condition = always);
//                the spell must be talented and off cooldown. A rule never checks more than you wrote: a DoT rule without
//                "Corruption has ≤ 0 s left" recasts the DoT at once.
//   'group:Name' build.groups[Name] = [action keys]: the group's actions are put in its place (one level; a group in a group
//                is taken out).
// Conditions (`when`, and the named ones in build.vars) are trees of
//   { t: 'all', c: [...] } every one holds · { t: 'any', c: [...] } at least one · { t: 'not', c: node }
//   { t: 'dot',  spell, op, v }  seconds left on your DoT on the boss (0 when it is not up)
//   { t: 'aura', aura, op, v }   seconds left on a buff / debuff (WL.RULE_AURAS; 0 when it is not up)
//   { t: 'cd',   spell, op, v }  seconds until the spell's cooldown is ready (0 = ready)
//   { t: 'fight', what: 'remaining' | 'elapsed' | 'bossHp', op, v }   fight seconds left / gone, boss health %
//   { t: 'mana', op, v }         your mana in % of the maximum · { t: 'shards', op, v } · { t: 'brand', op, v } charges left
//   { t: 'var', name }           a named condition of build.vars
// op = '<', '<=', '>', '>=' or '='; v = a number, or { var: name } = a named number of build.vars ({ num: 12 }).
WL.RULE_SPELLS = Object.keys(WL.SPELLS).filter(function (k) { return k !== 'drainSoul' && k !== 'baneOfHavoc'; });
WL.RULE_DOTS = ['corruption', 'immolate', 'siphonLife', 'baneOfAgony', 'baneOfDoom'];
WL.RULE_AURAS = [['shadowTrance', 'Shadow Trance (Nightfall)'], ['decimation', 'Decimation'], ['isb', 'Improved Shadow Bolt on the boss'],
  ['coe', 'Curse of the Elements on the boss'], ['brand', 'Demonic Brand on the boss'], ['snfFire', 'Shadow and Flame (Fire)'], ['snfShadow', 'Shadow and Flame (Shadow)'],
  ['bloodFury', 'Blood Fury'], ['berserking', 'Berserking'], ['eureka', 'Eureka!'], ['powerInfusion', 'Power Infusion'], ['spPotion', 'Spellblasting potion']];
WL.RULE_OPS = ['<', '<=', '>', '>=', '='];
function ruleCmp(a, op, b) { return op === '<' ? a < b - 1e-9 : op === '<=' ? a <= b + 1e-9 : op === '>' ? a > b + 1e-9 : op === '>=' ? a >= b - 1e-9 : Math.abs(a - b) < 1e-6; }
WL.ruleNum = function (v, build) {
  if (v && typeof v === 'object' && v.var != null) { var x = ((build && build.vars) || {})[v.var]; return x && typeof x.num === 'number' ? x.num : NaN; }
  return +v;
};
WL.ruleCond = function (n, S, build, depth) {
  if (!n) return true;
  depth = depth || 0; if (depth > 12) return false;                      // a variable that refers to itself
  var b = build || S.build, val = function () { return WL.ruleNum(n.v, b); };
  switch (n.t) {
    case 'all': return (n.c || []).every(function (x) { return WL.ruleCond(x, S, b, depth + 1); });
    case 'any': return (n.c || []).some(function (x) { return WL.ruleCond(x, S, b, depth + 1); });
    case 'not': return !WL.ruleCond(n.c, S, b, depth + 1);
    case 'dot': return ruleCmp(Math.max(0, S.dotLeft(n.spell)), n.op, val());
    case 'aura': return ruleCmp(S.buff(n.aura) ? S.buffs[n.aura] - S.t : 0, n.op, val());
    case 'cd': return ruleCmp(Math.max(0, (S.cds[n.spell] || 0) - S.t), n.op, val());
    case 'fight': return ruleCmp(n.what === 'elapsed' ? S.t : n.what === 'bossHp' ? S.targetHpPct : S.remaining, n.op, val());
    case 'mana': return ruleCmp(100 * S.mana / S.maxMana, n.op, val());
    case 'shards': return ruleCmp(S.shards, n.op, val());
    case 'brand': return ruleCmp(S.buff('brand') ? S.brandCharges || 0 : 0, n.op, val());
    case 'var': { var x = ((b && b.vars) || {})[n.name]; return !!(x && x.cond) && WL.ruleCond(x.cond, S, b, depth + 1); }
  }
  return false;
};
// The action object of a priority key for this build (built-in, or one of the build's rules); null when unknown.
WL.actionOf = function (key, build) {
  if (WL.ACTIONS[key]) return WL.ACTIONS[key];
  var m = /^rule:(\d+)$/.exec(key || ''), r = m && build && build.rules && build.rules[+m[1]];
  if (!r || WL.RULE_SPELLS.indexOf(r.spell) < 0) return null;
  return { rule: r, label: WL.ruleText(r, build), filler: !r.when, pick: function (S) {
    if (!S.has(r.spell) || !S.ready(r.spell)) return null;
    return WL.ruleCond(r.when, S, build) ? r.spell : null;
  } };
};
// A condition / rule in words (for the page and the validator).
WL.condText = function (n, build) {
  if (!n) return 'always';
  var sn = function (k) { return (WL.SPELLS[k] || {}).name || k; }, an = function (k) { var a = WL.RULE_AURAS.filter(function (x) { return x[0] === k; })[0]; return a ? a[1] : k; };
  var v = function () { return n.v && typeof n.v === 'object' && n.v.var != null ? n.v.var : String(n.v); };
  switch (n.t) {
    case 'all': return (n.c || []).length ? '(' + n.c.map(function (x) { return WL.condText(x, build); }).join(' and ') + ')' : 'always';
    case 'any': return (n.c || []).length ? '(' + n.c.map(function (x) { return WL.condText(x, build); }).join(' or ') + ')' : 'never';
    case 'not': return 'not ' + WL.condText(n.c, build);
    case 'dot': return sn(n.spell) + ' time left ' + n.op + ' ' + v() + ' s';
    case 'aura': return an(n.aura) + ' time left ' + n.op + ' ' + v() + ' s';
    case 'cd': return sn(n.spell) + ' cooldown ' + n.op + ' ' + v() + ' s';
    case 'fight': return (n.what === 'elapsed' ? 'fight time gone' : n.what === 'bossHp' ? 'boss health %' : 'fight time left') + ' ' + n.op + ' ' + v() + (n.what === 'bossHp' ? '' : ' s');
    case 'mana': return 'mana % ' + n.op + ' ' + v();
    case 'shards': return 'Soul Shards ' + n.op + ' ' + v();
    case 'brand': return 'Demonic Brand charges ' + n.op + ' ' + v();
    case 'var': return n.name;
  }
  return '?';
};
WL.ruleText = function (r, build) { return (r.name ? r.name + ': ' : '') + ((WL.SPELLS[r.spell] || {}).name || r.spell) + (r.when ? ' if ' + WL.condText(r.when, build) : ''); };
// Faults in a rule's condition (unknown spell, aura, operator, variable, a number that is not one).
WL.condErrors = function (n, build, where, depth) {
  var out = [], b = build || {}; depth = depth || 0;
  if (!n) return out;
  if (depth > 12) return [where + ': the condition is nested too deep'];
  var num = function () { var x = WL.ruleNum(n.v, b); if (!isFinite(x)) out.push(where + ': ' + (n.v && n.v.var != null ? 'no number named "' + n.v.var + '"' : 'a number is missing')); if (WL.RULE_OPS.indexOf(n.op) < 0) out.push(where + ': unknown comparison "' + n.op + '"'); };
  switch (n.t) {
    case 'all': case 'any': (n.c || []).forEach(function (x) { out = out.concat(WL.condErrors(x, b, where, depth + 1)); }); break;
    case 'not': out = out.concat(WL.condErrors(n.c, b, where, depth + 1)); break;
    case 'dot': if (WL.RULE_DOTS.indexOf(n.spell) < 0) out.push(where + ': "' + n.spell + '" is not a DoT'); num(); break;
    case 'aura': if (!WL.RULE_AURAS.some(function (x) { return x[0] === n.aura; })) out.push(where + ': unknown buff "' + n.aura + '"'); num(); break;
    case 'cd': if (!WL.SPELLS[n.spell]) out.push(where + ': unknown spell "' + n.spell + '"'); num(); break;
    case 'fight': if (['remaining', 'elapsed', 'bossHp'].indexOf(n.what) < 0) out.push(where + ': unknown fight value'); num(); break;
    case 'mana': case 'shards': case 'brand': num(); break;
    case 'var': { var x = (b.vars || {})[n.name]; if (!x || !x.cond) out.push(where + ': no condition named "' + n.name + '"'); break; }
    default: out.push(where + ': unknown condition');
  }
  return out;
};
// Groups put in place (one level).
WL.expandGroups = function (build, rot) {
  var g = (build && build.groups) || {}, out = [];
  (rot || build.rotation).forEach(function (a) {
    var m = /^group:(.+)$/.exec(a);
    if (!m) { out.push(a); return; }
    (g[m[1]] || []).forEach(function (x) { if (!/^group:/.test(x)) out.push(x); });
  });
  return out;
};

// The priority list actually simulated: with 2+ targets and fight.multiDot on, "Keep DoTs on the extra targets" is
// inserted right before the first filler (unless the build already places it itself). (round 27)
// Round 39: if the build has "Shadow Bolt an extra target", multi-DoT goes right above it — otherwise the spread action
// keeps bolting target 2 and target 3 never gets its DoTs (found in the round-39 value check, MISTAKES A20).
WL.effectiveRotation = function (build, cfg) {
  var rot = WL.expandGroups(build), f = cfg && cfg.fight || {};   // round 157: groups put in place
  if (f.multiDot && (f.targets || 1) >= 2 && rot.indexOf('multiDot') < 0) {
    var fi = rot.map(function (a) { var A = WL.actionOf(a, build); return !!(A && (A.filler || A.preFiller)); }).indexOf(true);   // before the filler and any conditional filler (round 106)
    var si = rot.indexOf('shadowBoltSpread');
    if (si >= 0 && (fi < 0 || si < fi)) fi = si;
    rot.splice(fi < 0 ? rot.length : fi, 0, 'multiDot');
  }
  return rot;
};

// Precast (round 127, user; A87): "a spell that finishes before the fight timer starts". Only a spell with a cast bar
// can do that — an instant or a channel would start the fight. In the order of WL.SPELLS.
WL.PRECAST_SPELLS = Object.keys(WL.SPELLS).filter(function (k) { var s = WL.SPELLS[k]; return s.cast > 0 && s.kind !== 'channel' && s.kind !== 'utility'; });
// The spell this build precasts under these settings, or null: nothing chosen (fight.precast ''), the build cannot cast
// it (talent spell without the talent), or its talents make it an instant (Corruption with Improved Corruption 5/5).
// `table` = the build's spell table (WL.buildSpellTable).
WL.precastOf = function (build, cfg, table) {
  var k = cfg && cfg.fight && cfg.fight.precast;
  if (!k || WL.PRECAST_SPELLS.indexOf(k) < 0 || !table || !table[k] || !(table[k].cast > 0)) return null;
  return k;
};
