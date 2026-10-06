// Character stat calculation: race + gear + buffs + talents + weapon oil -> final (static) stats.
// Dynamic effects (Blood Fury, Berserking, debuffs, procs) are applied by the simulation loop.
// Every contribution is pushed to `breakdown` so the UI can show exactly where each number comes from.
window.WL = window.WL || {};

WL.talentValue = function (build, key, field) {
  var pts = build.talents[key] || 0;
  if (!pts) return 0;
  var t = WL.TALENT_BY_KEY[key];
  return field ? t.v[field][pts - 1] : pts;
};

// Buffs that are switched on (a buff with `requires` only counts when that buff is also on, e.g. Restorative Totems).
WL.activeBuffs = function (cfg) {
  var B = cfg.buffs || {};
  return Object.keys(B).filter(function (k) { return B[k].on && (!B[k].requires || (B[B[k].requires] || {}).on); })
    .map(function (k) { return B[k]; });
};

// Consumables that are switched on; only the first active one per group counts (the UI keeps groups exclusive). [A57]
WL.activeConsumables = function (cfg) {
  var C = cfg.consumables || {}, seen = {}, prof = cfg.professions || {};
  return Object.keys(C).filter(function (k) {
    var c = C[k]; if (!c.on || seen[c.group]) return false;
    if (c.requires && !prof[c.requires]) return false;                 // e.g. explosives need Engineering (W14)
    seen[c.group] = 1; return true;
  }).map(function (k) { var c = C[k]; c.key = k; return c; });
};

// Weapon effects for a build (round 86, user: stone and oil are not exclusive in Forever): the per-build Spellstone /
// Firestone (consumable group 'stone') and a weapon oil (group 'weapon') — both count. Returns the active ones as a list
// of { name, sp, critPct, mp5, hastePct, schoolSp }; empty = nothing on the weapon.
WL.weaponEffects = function (build, cfg) {
  var act = WL.activeConsumables(cfg), out = [];
  var stone = act.filter(function (c) { return c.group === 'stone'; })[0];
  if (!cfg.consumables || !Object.keys(cfg.consumables).length) stone = { buildOil: true };   // configs without consumables
  if (stone && stone.buildOil && WL.OILS[build.oil] && build.oil !== 'none') out.push(WL.OILS[build.oil]);
  var w = act.filter(function (c) { return c.group === 'weapon'; })[0];
  if (w && w.oil) out.push({ name: w.name, sp: w.oil.sp || 0, critPct: w.oil.critPct || 0, mp5: w.oil.mp5 || 0, hastePct: 0 });
  return out;
};

// Boss armor after debuffs, and the resulting physical damage reduction for a level-60 attacker (pet melee). [A54]
// Debuffs of the same `group` do not stack: only the strongest of each group counts; debuffs without a group add up.
// Groups: 'major' = Sunder Armor / Expose Armor; 'minor' = Faerie Fire / Curse of Recklessness (round 68, user: no longer
// stack in Forever).
WL.bossArmor = function (cfg) {
  var D = cfg.debuffs || {}, byGroup = {}, loose = 0;
  Object.keys(D).forEach(function (k) {
    var d = D[k]; if (!d.on || !d.armor) return;
    if (d.group) byGroup[d.group] = Math.max(byGroup[d.group] || 0, d.armor); else loose += d.armor;
  });
  var grouped = Object.keys(byGroup).reduce(function (s, g) { return s + byGroup[g]; }, 0);
  return Math.max(0, cfg.combat.bossArmor - grouped - loose);
};
WL.armorReduction = function (cfg) {
  var a = WL.bossArmor(cfg);
  return a / (a + 400 + 85 * 60);
};

WL.computeStats = function (build, raceKey, cfg) {
  var race = WL.RACES[raceKey], base = WL.WARLOCK_BASE_60, gear = cfg.gear, cb = cfg.combat;
  var tv = function (k, f) { return WL.talentValue(build, k, f); };
  var oils = WL.weaponEffects(build, cfg);
  function oilStat(stat, f) { var sum = 0; oils.forEach(function (o) { sum += add(stat, o.name, o[f || stat] || 0); }); return sum; }
  var bd = [];
  function add(stat, source, value) { if (value) bd.push({ stat: stat, source: source, value: value }); return value; }
  function racial(effect) {
    var r = race.racials.filter(function (x) { return x.effect === effect; })[0];
    return r || null;
  }

  // --- Primary stats ---
  var buffStat = function (s) {
    var sum = 0;
    WL.activeBuffs(cfg).forEach(function (b) { if (b[s]) sum += add(s, b.name, b[s]); });
    return sum;
  };
  var cons = WL.activeConsumables(cfg).filter(function (c) { return c.group !== 'weapon' && c.group !== 'stone'; });
  var conStat = function (s) {
    var sum = 0;
    cons.forEach(function (c) { if (c[s]) sum += add(s, c.name, c[s]); });
    return sum;
  };
  // Crit from consumables (round 110, user): items that share a critGroup do not stack their crit — only the highest of the
  // active ones counts (Elixir of the Owl + Elixir of Sages = 2%, not 4%). Their other stats are not affected.
  var conCrit = function () {
    var sum = 0, best = {};
    cons.forEach(function (c) { if (c.critPct && c.critGroup && (!best[c.critGroup] || c.critPct > best[c.critGroup].critPct)) best[c.critGroup] = c; });
    cons.forEach(function (c) {
      if (!c.critPct) return;
      if (!c.critGroup) { sum += add('critPct', c.name, c.critPct); return; }
      if (best[c.critGroup] !== c) return;
      var same = cons.filter(function (x) { return x !== c && x.critPct && x.critGroup === c.critGroup; }).map(function (x) { return x.name; });
      sum += add('critPct', c.name + (same.length ? ' (does not stack with ' + same.join(', ') + ')' : ''), c.critPct);
    });
    return sum;
  };
  var kingsPct = WL.activeBuffs(cfg).reduce(function (a, b) { return a + (b.statPct || 0); }, 0);
  var ex = cfg.extra || {};
  var intFlat = add('int', 'Base (L60 Warlock) [A09]', base.int) + add('int', race.name + ' offset', race.offset.int)
          + add('int', 'Gear', gear.int) + buffStat('int') + conStat('int') + add('int', 'Stat-weight test', ex.int || 0);
  var int = intFlat * (1 + kingsPct / 100);
  if (kingsPct) add('int', 'Blessing of Kings +' + kingsPct + '%', int - intFlat);
  var spiFlat = add('spi', 'Base (L60 Warlock) [A09]', base.spi) + add('spi', race.name + ' offset', race.offset.spi)
          + add('spi', 'Gear', gear.spi) + buffStat('spi') + conStat('spi');
  var spiPct = racial('spiritPct') ? racial('spiritPct').value : 0;
  var spi = spiFlat * (1 + spiPct / 100) * (1 + kingsPct / 100);       // percentage bonuses multiply [A16]
  if (spiPct) add('spi', 'The Human Spirit +' + spiPct + '%', spiFlat * spiPct / 100);
  if (kingsPct) add('spi', 'Blessing of Kings +' + kingsPct + '%', spi - spiFlat * (1 + spiPct / 100));
  var staFlat = add('sta', 'Base (L60 Warlock) [A09]', base.sta) + add('sta', race.name + ' offset', race.offset.sta)
          + add('sta', 'Gear', gear.sta) + buffStat('sta') + conStat('sta');
  var staPct = tv('demonicEmbrace', 'staPct');
  var sta = staFlat * (1 + staPct / 100) * (1 + kingsPct / 100);
  if (staPct) add('sta', 'Demonic Embrace +' + staPct + '%', staFlat * staPct / 100);
  if (kingsPct) add('sta', 'Blessing of Kings +' + kingsPct + '%', sta - staFlat * (1 + staPct / 100));

  // Agility (round 75, user): only your melee crit uses it, and the Succubus' melee inherits that crit [A75].
  var agiFlat = add('agi', 'Base (L60 Warlock) [A75]', base.agi || 0) + add('agi', race.name + ' offset', race.offset.agi || 0)
          + add('agi', 'Gear', gear.agi || 0) + buffStat('agi') + conStat('agi');
  var agi = agiFlat * (1 + kingsPct / 100);
  if (kingsPct) add('agi', 'Blessing of Kings +' + kingsPct + '%', agi - agiFlat);

  // --- Pools --- [A10]
  var manaFlat = base.mana + 20 + cb.manaPerInt * (int - 20);
  var manaPct = tv('felVitality', 'manaPct') + (racial('manaPct') ? racial('manaPct').value : 0);
  var maxMana = manaFlat * (1 + manaPct / 100);
  add('maxMana', 'Base mana ' + base.mana + ' + 20 + 15 × (Int − 20) [A10]', manaFlat);
  if (manaPct) add('maxMana', 'Fel Vitality / Expansive Mind +' + manaPct + '%', maxMana - manaFlat);
  maxMana += conStat('maxMana');                                          // flat maximum mana from a consumable (none left since round 90: Flask of Distilled Wisdom removed)
  var maxHealth = base.health + 20 + 10 * (sta - 20);
  add('maxHealth', 'Base ' + base.health + ' + 20 + 10 × (Sta − 20)', maxHealth);

  // --- Pet state ---
  var petActive = !!build.pet;
  var sacrificeActive = !!build.sacrifice && (!build.pet || tv('demonicPact') > 0);

  // --- Spell power ---
  var sp = add('sp', 'Gear', gear.sp) + add('sp', 'Stat-weight test', ex.sp || 0) + conStat('sp') + oilStat('sp');
  var dkSp = 0;   // Demonic Knowledge: "your spell damage and your Demon pet's spell damage" — the pet gets it too (round 31)
  if (petActive && tv('demonicKnowledge')) {
    dkSp = Math.round(60 * tv('demonicKnowledge', 'levelPct') / 100);
    sp += add('sp', 'Demonic Knowledge (' + tv('demonicKnowledge', 'levelPct') + '% of level 60) [A27]', dkSp);
  }
  var schoolSp = { shadow: add('shadowSp', 'Gear', gear.shadowSp || 0), fire: add('fireSp', 'Gear', gear.fireSp || 0) };
  oils.forEach(function (oil) { if (oil.schoolSp) Object.keys(oil.schoolSp).forEach(function (s) { schoolSp[s] += add(s + 'Sp', oil.name, oil.schoolSp[s]); }); });
  cons.forEach(function (c) { if (c.schoolSp) Object.keys(c.schoolSp).forEach(function (s) { schoolSp[s] += add(s + 'Sp', c.name, c.schoolSp[s]); }); });

  // --- Hit --- [A01][A02]
  var hitRaw = add('hitPct', 'Base vs L63 boss [A01]', cb.baseHitPct)
             + add('hitPct', 'Suppression', tv('suppression', 'hitPct'))
             + add('hitPct', 'Gear', gear.hitPct || 0)
             + add('hitPct', 'Stat-weight test', ex.hitPct || 0) + conStat('hitPct');
  var hitPct = Math.min(cb.maxHitPct, hitRaw);

  // --- Crit --- [A03][A04][A42]: gear.critPct is the character-sheet total (base + Int + gear).
  // Extra Int from buffs / stat-weight tests adds crit on top of that total.
  // gear.critIncludesAll (user, round 3): the sheet total already contains racials, weapon oil and crit talents
  // (Malevolence), so none of those are added again. Spell-specific talents (Fire and Brimstone, Agonizing Flames)
  // are not on the character sheet and are still added per spell in spelltable.js.
  var intAboveSheet = int - (base.int + race.offset.int + gear.int);
  var critPct = add('critPct', gear.critIncludesAll ? 'Character sheet total incl. talents, racials, oil [A42]' : 'Character sheet (base + Int + gear) [A42]', gear.critPct || 0)
              + add('critPct', 'Extra Int ' + Math.round(intAboveSheet * 10) / 10 + ' / 60', intAboveSheet * cb.critPerInt)   // label rounded (round 110); the value is exact
              + add('critPct', 'Stat-weight test', ex.critPct || 0);
  critPct += buffStat('critPct') + conCrit();                            // e.g. Moonkin Form aura, Elixir of the Owl
  if (!gear.critIncludesAll) {
    critPct += oilStat('critPct');
    var sword = racial('critPctIfSword');
    if (sword && gear.weaponIsSword) critPct += add('critPct', 'Sword Specialization [A30]', sword.value);
  }

  // --- Melee crit --- [A75]: 2.0% + Agility / 20 (Classic L60 Warlock) + Sword Specialization; no spell-crit sources.
  var meleeCritPct = add('meleeCritPct', 'Base (L60 Warlock) [A75]', cb.meleeCritBasePct != null ? cb.meleeCritBasePct : 2)
                   + add('meleeCritPct', 'Agility ' + Math.round(agi * 10) / 10 + ' / ' + (cb.agiPerMeleeCrit || 20), agi / (cb.agiPerMeleeCrit || 20));
  var swordM = racial('critPctIfSword');
  if (swordM && gear.weaponIsSword) meleeCritPct += add('meleeCritPct', 'Sword Specialization [A30]', swordM.value);

  // --- Haste --- [A05][A08]
  var hastePct = add('hastePct', 'Gear', gear.hastePct || 0)
               + add('hastePct', 'Stat-weight test', ex.hastePct || 0)
               + oilStat('hastePct') + conStat('hastePct');
  var pierce = add('pierce', 'Gear', gear.pierce || 0) + add('pierce', 'Stat-weight test', ex.pierce || 0);

  var mp5 = add('mp5', 'Gear', gear.mp5 || 0) + buffStat('mp5') + conStat('mp5') + oilStat('mp5');

  // --- Static caster damage AURAS per school ("Mod Damage Done %" buffs: they multiply with each other and with the
  // talent spell modifiers [A16]). Talent spell modifiers (Shadow Mastery, Agonizing Flames, Malediction, …) are not
  // here: they add up per spell and modifier group in engine/spelltable.js (round 43, A68).
  var mult = { shadow: 1, fire: 1, all: 1 };
  function mul(school, source, pct) { if (pct) { mult[school] *= 1 + pct / 100; add(school + 'DmgPct', source, pct); } }
  if (sacrificeActive && build.sacrifice === 'imp') mul('shadow', 'Demonic Sacrifice (Imp)', 15);
  if (sacrificeActive && build.sacrifice === 'succubus') mul('fire', 'Demonic Sacrifice (Succubus)', 15);
  if (petActive && build.pet === 'succubus') mul('shadow', 'Master Demonologist (Succubus)', tv('masterDemonologist', 'schoolPct'));
  if (petActive && build.pet === 'imp') mul('fire', 'Master Demonologist (Imp)', tv('masterDemonologist', 'schoolPct'));
  if (petActive) mul('all', 'Soul Link', tv('soulLink', 'dmgPct'));

  return {
    race: raceKey, int: int, spi: spi, sta: sta, agi: agi, meleeCritPct: meleeCritPct, maxMana: maxMana, maxHealth: maxHealth,
    sp: sp, dkSp: dkSp, schoolSp: schoolSp, hitPct: hitPct, hitPctUncapped: hitRaw, critPct: critPct, hastePct: hastePct, mp5: mp5, pierce: pierce,
    mult: mult, petActive: petActive, sacrificeActive: sacrificeActive, oilName: oils.length ? oils.map(function (o) { return o.name; }).join(' + ') : WL.OILS.none.name, breakdown: bd,
  };
};
