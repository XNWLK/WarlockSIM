// "Show the maths" (round 138, user): how one damage source of a build is calculated, step by step, with the build's own
// stats and the current settings. It repeats the engine's formulas (engine/spelltable.js, engine/sim.js) in words; the
// tests compare every result here with the engine's own value, so the two cannot drift apart unnoticed.
//   WL.explainSpell(build, raceKey, cfg, key[, stats, table]) → { title, steps: [{ label, calc, result }], notes: [text],
//                                                                 values: { … numbers for the tests … } } or null
//   key = a damage row of a result (r.bySpell): a spell key, 'x2:…' / 'x3:…' (extra target), 'pet:…', 'item:…',
//         'touchOfTheGrave', 'baneOfHavoc', 'lifeTap'.
// Not part of the simulation: nothing here changes a number.
window.WL = window.WL || {};

(function () {
  function f(x, d) { return Number(x).toLocaleString('en-US', { maximumFractionDigits: d == null ? 1 : d }); }
  function x2(m) { return '× ' + m.toFixed(2); }
  function clean(s) { return String(s).replace(/\s*\[A\d+\]/g, '').replace(/ \(\d+% of level 60\)/, '').replace(/^Base \(L60 Warlock\)$/, 'base').replace(/^Gear$/, 'gear').replace(/ offset$/, ''); }
  function sources(stats, stat) { return stats.breakdown.filter(function (e) { return e.stat === stat; }); }
  function sumText(list, d) { return list.map(function (e, i) { return (i ? (e.value < 0 ? '− ' : '+ ') : (e.value < 0 ? '−' : '')) + f(Math.abs(e.value), d) + ' ' + clean(e.source); }).join(' '); }
  function coeOn(cfg) { return !!((cfg.options && cfg.options.useCurseOfElements) || (cfg.debuffs && cfg.debuffs.coeOther && cfg.debuffs.coeOther.on)); }
  function activeBuff(cfg, field) { return WL.activeBuffs(cfg).filter(function (b) { return b[field]; })[0] || null; }

  WL.explainSpell = function (build, raceKey, cfg, key, stats, table) {
    stats = stats || WL.computeStats(build, raceKey, cfg);
    table = table || WL.buildSpellTable(build, stats, cfg);
    var SPELLS = WL.spellsFor(cfg), cb = cfg.combat, race = WL.RACES[raceKey];
    var tv = function (k, fld) { return WL.talentValue(build, k, fld); };
    var xt = /^x(\d):(.+)$/.exec(key), bk = xt ? xt[2] : key, extra = !!xt;
    var steps = [], notes = [], values = {};
    function step(label, calc, result) { steps.push({ label: label, calc: calc, result: result == null ? '' : result }); }
    var coe = 1 + SPELLS.curseOfElements.dmgTakenPct / 100, hasCoe = coeOn(cfg);
    var PI = activeBuff(cfg, 'spellDmgPct');
    var auraOf = function (school) { return sources(stats, school + 'DmgPct').concat(sources(stats, 'allDmgPct')); };
    var auraText = function (list) { return list.map(function (e) { return (1 + e.value / 100).toFixed(2) + ' ' + clean(e.source); }).join(' × '); };
    var auraMult = function (list) { return list.reduce(function (a, e) { return a * (1 + e.value / 100); }, 1); };
    var critNote = function () { return 'Every hit and tick rolls its own crit.'; };

    // ---------- your demon ----------
    function petMultParts(school, withCoe) {
      var p = [];
      if (tv('unholyPower')) p.push([1 + tv('unholyPower', 'petDmgPct') / 100, 'Unholy Power']);
      if (stats.mult.all !== 1) p.push([stats.mult.all, 'Soul Link']);
      if (((build.pet === 'succubus' && school === 'shadow') || (build.pet === 'imp' && school === 'fire')) && tv('masterDemonologist')) p.push([1 + tv('masterDemonologist', 'schoolPct') / 100, 'Master Demonologist']);
      if (withCoe && school !== 'physical' && hasCoe) p.push([coe, 'Curse of the Elements']);
      return p;
    }
    var partsText = function (p) { return p.map(function (q) { return q[0].toFixed(2) + ' ' + q[1]; }).join(' × '); };
    var partsMult = function (p) { return p.reduce(function (a, q) { return a * q[0]; }, 1); };
    function petSpStep() {
      var pct = cfg.petSpPct != null ? cfg.petSpPct : 100, sp = stats.sp * pct / 100 + (stats.dkSp || 0);
      step('Demon\'s spell power', pct + '% of your ' + f(stats.sp) + ' spell power' + (stats.dkSp ? ' + ' + stats.dkSp + ' Demonic Knowledge' : ''), f(sp));
      return sp;
    }
    if (bk.indexOf('pet:') === 0) {
      var pk = bk.slice(4), pc = build.pet && cfg.pets[build.pet];
      if (!pc) return null;
      if (pc.spell && pc.spell.key === pk) {
        var ps = pc.spell, psp = petSpStep(), sayaad = pk === 'lashOfPain' ? tv('improvedSayaad', 'lashPct') : 0, impImp = pk === 'firebolt' ? tv('improvedImp', 'firebolt') : 0;
        var pbase = ps.base * (1 + sayaad / 100) + ps.coef * psp;
        step('Base hit', (sayaad ? ps.base + ' × ' + (1 + sayaad / 100).toFixed(2) + ' Improved Sayaad' : ps.base) + ' + ' + ps.coef + ' × ' + f(psp), f(pbase));
        var pp = petMultParts(ps.school, false);
        if (impImp) pp.unshift([1 + impImp / 100, 'Improved Imp']);
        var pv = pbase * partsMult(pp);
        if (pp.length) step('Demon\'s damage bonuses (each multiplies)', partsText(pp), f(pv));
        values.hit = pv;
        if (hasCoe) { step('With Curse of the Elements on the boss', f(pv) + ' ' + x2(coe), f(pv * coe)); values.onBoss = pv * coe; }
        step('A crit', 'your spell crit, ' + f(stats.critPct, 2) + '%, deals × ' + cb.critMultiplier, f((values.onBoss || pv) * cb.critMultiplier));
        notes.push('It misses with your miss chance (' + f(100 - stats.hitPct) + '%). ' + (ps.cast ? ps.cast + ' s cast, not shortened by haste' : 'Instant, ' + ps.cd + ' s cooldown') + ', ' + ps.cost + ' mana of the demon\'s own.');
        notes.push('The demon\'s spell power follows yours as it is at that moment: a Spellblasting potion or Blood Fury raises it.');
        return { title: ps.name, steps: steps, notes: notes, values: values };
      }
      if (pk === 'melee' && pc.melee) {
        var m = pc.melee, tbm = cb.petMelee;
        var hitBonus = Math.max(0, stats.hitPct - cb.baseHitPct - tbm.hitSuppressionPct), miss = Math.max(0, tbm.missPct - hitBonus);
        var critCh = Math.max(0, (m.critPct || 0) + (m.inheritSpellCrit ? stats.critPct : 0) - tbm.critSuppressionPct);
        var ap = m.apPerSp * stats.sp, dps = m.baseDps + ap / m.apPerDps, armor = WL.bossArmor(cfg), red = WL.armorReduction(cfg);
        step('Attack power from you', f(stats.sp) + ' spell power ÷ 6', f(ap));
        step('Damage per second', m.baseDps + ' base + ' + f(ap) + ' ÷ ' + m.apPerDps, f(dps, 2));
        step('Boss armor', f(cb.bossArmor, 0) + ' − armor debuffs = ' + f(armor, 0) + '; ' + f(armor, 0) + ' ÷ (' + f(armor, 0) + ' + 5,500)', f(red * 100, 2) + '% less');
        var mp = petMultParts('physical', false), sw = dps * m.swing * (1 - red) * partsMult(mp);
        step('One normal swing', f(dps, 2) + ' × ' + m.swing + ' s × (1 − ' + f(red, 4) + ')' + (mp.length ? ' × ' + partsText(mp) : ''), f(sw));
        values.swing = sw; values.miss = miss; values.crit = critCh;
        step('Miss', tbm.missPct + '% − (your hit ' + f(stats.hitPct) + '% − ' + cb.baseHitPct + '% − ' + tbm.hitSuppressionPct + '%)', f(miss) + '%');
        step('Dodge', '', tbm.dodgePct + '%');
        step('Glancing blow', 'deals ' + tbm.glanceDmgPct + '% damage, cannot crit', tbm.glancePct + '% → ' + f(sw * tbm.glanceDmgPct / 100));
        step('Crit', (m.critPct ? m.critPct + '% own + ' : '') + (m.inheritSpellCrit ? 'your spell crit ' + f(stats.critPct, 2) + '%' : '') + ' − ' + tbm.critSuppressionPct + '%; deals × 2', f(critCh, 2) + '% → ' + f(sw * 2));
        step('Normal hit', 'the rest', f(Math.max(0, 100 - miss - tbm.dodgePct - tbm.glancePct - critCh), 2) + '% → ' + f(sw));
        notes.push('Master Demonologist and Curse of the Elements do not apply to melee. Her crit is your spell crit (the same as for her spells, without spell-specific talents such as Malevolence), less 4.8% against a level-63 boss.');
        return { title: pc.name + ' melee', steps: steps, notes: notes, values: values };
      }
      if (pk === 'brand') {
        var db = cfg.demonicBrand, bb = (db.baseMin + db.baseMax) / 2, ssp = stats.sp + (stats.schoolSp.shadow || 0), bsch = build.pet === 'imp' ? 'fire' : 'shadow';
        var bbase = bb + db.shadowSpCoef * ssp, bp = petMultParts(bsch, false), bvv = bbase * partsMult(bp);
        step('Base', bb + ' + ' + db.shadowSpCoef + ' × ' + f(ssp) + ' (your Shadow spell power)', f(bbase));
        if (bp.length) step('Demon\'s damage bonuses (each multiplies)', partsText(bp), f(bvv));
        values.hit = bvv;
        if (hasCoe) { step('With Curse of the Elements on the boss', f(bvv) + ' ' + x2(coe), f(bvv * coe)); values.onBoss = bvv * coe; }
        notes.push('A landed Searing Pain brands the boss for ' + db.duration + ' s with ' + tv('demonicBrand', 'charges') + ' charges. Every landed attack of your demon spends one charge and adds this hit (' + (bsch === 'fire' ? 'Fire' : 'Shadow') + '). It cannot miss or crit.');
        return { title: 'Demonic Brand', steps: steps, notes: notes, values: values };
      }
      return null;
    }

    // ---------- racial, items, Havoc, Life Tap ----------
    if (bk === 'touchOfTheGrave') {
      var tog = race.racials.filter(function (r) { return r.effect === 'proc'; })[0]; if (!tog) return null;
      var tb0 = stats.maxHealth * tog.maxHealthPct / 100;
      step('Damage', tog.maxHealthPct + '% of your ' + f(stats.maxHealth, 0) + ' maximum health', f(tb0));
      values.hit = tb0;
      notes.push(tog.chancePct + '% chance on every landed cast of a damaging spell (a direct spell, a DoT when it is applied, a channel when it starts; never a tick)' +
        (tog.icd ? ', then nothing for ' + tog.icd + ' s' : '') + '. It heals you for the same amount.');
      notes.push('It scales with Stamina, not with spell power. Nothing raises it: no talent, no aura, no debuff on the target, no Power Infusion. It cannot crit and is never resisted.');
      return { title: 'Touch of the Grave', steps: steps, notes: notes, values: values };
    }
    if (bk === 'baneOfHavoc') {
      step('Copy', SPELLS.baneOfHavoc.havocPct + '% of everything you deal to the other targets', 'dealt to target 2 as well');
      notes.push('Your demon\'s damage is not copied. Bane of Havoc is cast off the global cooldown as soon as it is not up.');
      return { title: 'Bane of Havoc', steps: steps, notes: notes, values: values };
    }
    if (bk.indexOf('item:') === 0) {
      var it = (cfg.consumables || {})[bk.slice(5)]; if (!it || !it.explosive) return null;
      var ex = it.explosive, avg = (ex.min + ex.max) / 2;
      step('Damage', 'a roll between ' + ex.min + ' and ' + ex.max, f(avg) + ' on average');
      values.hit = avg;
      if (hasCoe) { step('With Curse of the Elements on the boss', f(avg) + ' ' + x2(coe), f(avg * coe)); values.onBoss = avg * coe; }
      step('A crit', 'your sheet crit, ' + f(cfg.gear.critPct, 2) + '%, deals × ' + cb.critMultiplier, f((values.onBoss || avg) * cb.critMultiplier));
      notes.push('No spell power and no talents. It misses with your miss chance (' + f(100 - stats.hitPct) + '%) and is never resisted. Thrown whenever its ' + ex.cd + ' s cooldown is ready; instant, with a 1 s global cooldown of its own.');
      return { title: it.name, steps: steps, notes: notes, values: values };
    }
    if (bk === 'lifeTap') {
      var ilt = tv('improvedLifeTap', 'manaPct'), gain = (SPELLS.lifeTap.manaBase + stats.spi) * (1 + ilt / 100);
      step('Mana gained', (ilt ? '(' : '') + SPELLS.lifeTap.manaBase + ' + ' + f(stats.spi) + ' Spirit' + (ilt ? ') × ' + (1 + ilt / 100).toFixed(2) + ' Improved Life Tap' : ''), f(gain));
      values.mana = gain;
      step('Cost', SPELLS.lifeTap.healthCost + ' health and one global cooldown', '');
      notes.push('Cast by itself whenever the next spell costs more mana than you have. It does not restart the 5-second rule, and nothing reduces its health cost.');
      return { title: 'Life Tap', steps: steps, notes: notes, values: values };
    }

    // ---------- your own spells ----------
    var s = SPELLS[bk], e = table[bk];
    if (!s || !e) return null;
    if (s.kind === 'utility') {
      if (bk === 'curseOfElements') notes.push('No damage of its own. On the target for ' + f(s.duration / 60, 0) + ' minutes: it takes ' + s.dmgTakenPct + '% more damage from your spells, your demon\'s spells and explosives, and its resistance drops by ' + cb.coeResistReduction + '. It has to hit (' + f(100 - stats.hitPct) + '% miss).');
      else return null;
      return { title: s.name, steps: steps, notes: notes, values: values };
    }
    var school = s.school, schoolName = school === 'fire' ? 'Fire' : 'Shadow';
    var spSrc = sources(stats, 'sp').concat(sources(stats, school + 'Sp'));
    step('Spell power for ' + schoolName + ' spells', spSrc.length > 1 ? sumText(spSrc, 0) : '', f(e.sp));
    var auras = auraOf(school), am = auraMult(auras);
    var isb = school === 'shadow' && tv('improvedShadowBolt') ? 1 + tv('improvedShadowBolt', 'debuffPct') / 100 : 0;
    var sm = school === 'shadow' ? tv('shadowMastery', 'shadowPct') : 0;
    var agf = s.tree === 'destruction' && !s.noAgonizingFlames ? tv('agonizingFlames', 'dmgPct') : 0;
    function group(parts, total) {             // talents of one group add up
      parts = parts.filter(function (p) { return p[1]; });
      var sum = parts.reduce(function (a, p) { return a + p[1]; }, 0);
      if (Math.abs(sum / 100 - total) > 1e-9) return { text: 'talents', mult: 1 + total };   // an effect this text does not know: still the engine's number
      return { text: parts.map(function (p) { return p[0] + ' +' + p[1] + '%'; }).join(', '), mult: 1 + total, n: parts.length };
    }
    function onBoss(periodic) {                // what is normally on the boss
      var p = [];
      if (bk === 'incinerate' && !periodic) p.push([1 + s.immolateBonusPct / 100, 'Immolate on the target']);
      if (hasCoe) p.push([coe, 'Curse of the Elements']);
      if (isb) p.push([isb, 'Improved Shadow Bolt']);
      return p;
    }
    function others(periodic, grp) {           // effects that come and go
      var o = [];
      var snf = tv('shadowAndFlame') ? 1 + tv('shadowAndFlame', 'schoolPct') / 100 : 0;
      if (snf) o.push('Shadow and Flame × ' + snf.toFixed(2) + ' for 20 s after a ' + (school === 'shadow' ? 'Conflagrate' : 'Shadowburn'));
      if (PI) o.push(PI.name + ' × ' + (1 + PI.spellDmgPct / 100).toFixed(2) + ' for ' + PI.duration + ' s');
      if (periodic && tv('wrack') && SPELLS.wrack.debuffSpells.indexOf(bk) >= 0 && !extra) o.push('× ' + (1 + SPELLS.wrack.debuffPct / 100).toFixed(2) + ' while you channel Wrack');
      if (periodic && s.drain && tv('soulSiphon') && !extra) o.push('Soul Siphon × 1.' + ('0' + tv('soulSiphon', 'perEffectPct')).slice(-2) + ' for each of Corruption, Bane of Agony, Bane of Doom, Siphon Life and Curse of the Elements on the target, at most × ' + (1 + tv('soulSiphon', 'maxPct') / 100).toFixed(2));
      var dec = !periodic && (WL.isShadowBolt(bk) || bk === 'searingPain') ? tv('decimation', 'dmgPct') : 0;
      if (dec) o.push('below ' + cfg.fight.executePct + '% boss health Decimation adds ' + dec + '% to the talent group: × ' + f((grp + dec / 100) / grp, 4));
      var eu = race.racials.filter(function (r) { return r.effect === 'cooldown' && r.dmgPct; })[0];
      if (eu && (!periodic || s.kind === 'channel')) o.push('Eureka! adds ' + eu.dmgPct + '% to the talent group ' + (periodic ? 'for every tick that comes while it is up' : 'when the cast finishes while it is up') + ': × ' + f((grp + eu.dmgPct / 100) / grp, 4));
      return o;
    }
    var critParts = [f(stats.critPct, 2) + '% from your stats'];
    if (school === 'shadow' && !cfg.gear.critIncludesAll && tv('malevolence')) critParts.push(tv('malevolence', 'shadowCritPct') + '% Malevolence');
    if (bk === 'searingPain' && tv('agonizingFlames')) critParts.push(tv('agonizingFlames', 'spCritPct') + '% Agonizing Flames');
    if (bk === 'conflagrate' && tv('fireAndBrimstone')) critParts.push(tv('fireAndBrimstone', 'conflagCritPct') + '% Fire and Brimstone');
    var critWhy = s.tree === 'destruction' && tv('ruin') ? ' with Ruin' : WL.PANDEMIC_SPELLS.indexOf(bk) >= 0 && tv('pandemic') ? ' with Pandemic' : '';
    var critCalc = critParts.join(' + ') + (critParts.length > 1 ? ' = ' + f(e.critPct, 2) + '%' : '') + '; deals × ' + f(e.critMult, 3) + critWhy;

    if (s.base != null) {                      // a direct hit (also the first part of Immolate)
      var hyb = s.kind === 'hybrid', base = s.base + s.coef * e.sp;
      var g0 = group([['Shadow Mastery', sm], ['Agonizing Flames', agf], ['Aftermath', bk === 'immolate' ? tv('aftermath', 'immoInitPct') : 0]], e.op0);
      step(hyb ? 'Base of the initial hit' : 'Base hit', s.base + ' + ' + s.coef + ' × ' + f(e.sp), f(base));
      if (e.op0) step('Talents' + (g0.n > 1 ? ' (they add up)' : ''), g0.text, x2(g0.mult));
      if (auras.length) step('Auras' + (auras.length > 1 ? ' (each multiplies)' : ''), auraText(auras), '× ' + f(am, 4));
      if (e.op0 || auras.length) step(hyb ? 'Initial hit before the boss\'s debuffs' : 'Hit before the boss\'s debuffs', f(base) + (e.op0 ? ' × ' + g0.mult.toFixed(2) : '') + (auras.length ? ' × ' + f(am, 4) : ''), f(e.directDmg));
      values.direct = e.directDmg; values.directCalc = base * g0.mult * am;
      var ob = onBoss(false), dv = e.directDmg * partsMult(ob);
      if (ob.length) step('With these on the ' + (extra ? 'target' : 'boss'), partsText(ob), f(dv));
      values.directOnBoss = dv;
      step('A crit', critCalc, f(dv * e.critMult));
      step('Average hit with crits', f(dv) + ' × (1 + ' + f(e.critPct, 2) + '% × ' + f(e.critMult - 1, 3) + ')', f(dv * (1 + e.critPct / 100 * (e.critMult - 1))));
      var od = others(false, 1 + e.op0); if (od.length) notes.push('Comes and goes: ' + od.join('; ') + '.');
    }
    if (s.tickBase != null) {                  // ticks: a DoT, a channel, Immolate's burn
      var tbase = s.tickBase + s.tickCoef * e.sp, what = s.kind === 'hybrid' ? 'burn tick' : 'tick', once = e.ticks === 1;
      var g1 = group([['Shadow Mastery', sm], ['Agonizing Flames', agf],
        ['Improved Corruption', bk === 'corruption' ? tv('improvedCorruption', 'dmgPct') : 0], ['Improved Bane of Agony', bk === 'baneOfAgony' ? tv('improvedBaneOfAgony', 'dmgPct') : 0],
        ['Improved Drains', s.drain ? tv('improvedDrains', 'dmgPct') : 0]], e.op22);
      step(once ? 'Base' : 'Base of one ' + what, s.tickBase + ' + ' + s.tickCoef + ' × ' + f(e.sp), f(tbase));
      if (e.op22) step('Talents' + (g1.n > 1 ? ' (they add up)' : ''), g1.text, x2(g1.mult));
      if (auras.length && s.base == null) step('Auras' + (auras.length > 1 ? ' (each multiplies)' : ''), auraText(auras), '× ' + f(am, 4));
      if (e.op22 || auras.length) step((once ? 'The hit' : 'One ' + what) + ' before the boss\'s debuffs', f(tbase) + (e.op22 ? ' × ' + g1.mult.toFixed(2) : '') + (auras.length ? ' × ' + f(am, 4) : ''), f(e.tickDmg));
      values.tick = e.tickDmg; values.tickCalc = tbase * g1.mult * am;
      var obp = onBoss(true), tvv = e.tickDmg * partsMult(obp);
      if (obp.length) step('With these on the ' + (extra ? 'target' : 'boss'), partsText(obp), f(tvv));
      values.tickOnBoss = tvv;
      if (!once) step('All ' + e.ticks + ' ' + what + 's', f(tvv) + ' × ' + e.ticks + ', one every ' + s.tickEvery + ' s', f(tvv * e.ticks) + ' before crits');
      step('A crit', critCalc + (once ? '' : '; every tick rolls its own'), f(tvv * e.critMult));
      if (s.ramp) notes.push('The ticks ramp up: ticks 1–4 deal 50%, ticks 5–8 100% and ticks 9–12 150% of the tick above (' + f(tvv * 0.5) + ' / ' + f(tvv) + ' / ' + f(tvv * 1.5) + ').');
      if (bk === 'baneOfAgony' && tv('amplifyCurse')) notes.push('Amplify Curse (every 3 minutes): every tick of that Bane of Agony × ' + f(1 + tv('amplifyCurse', 'boaPct') / 100, 2) + ', after everything else (' + f(tvv) + ' → ' + f(tvv * (1 + tv('amplifyCurse', 'boaPct') / 100)) + ' for the tick above).');
      if (s.aoe) notes.push('Every tick hits every target of the fight, each with its own hit, crit and resist roll.' + (s.selfDamage ? ' It also hits you for ' + f(tbase) + ' per tick (no talents, no crit; less with Molten Skin and Soul Link).' : ''));
      var op = others(true, 1 + e.op22); if (op.length) notes.push((s.base != null ? 'The burn — comes and goes: ' : 'Comes and goes: ') + op.join('; ') + '.');
      notes.push('Spell power is read at every tick: a potion or Blood Fury that starts later still counts for the ticks after it.');
    }
    var castParts = [];
    if (s.kind === 'channel') castParts.push('Channelled for ' + s.duration + ' s (haste does not shorten it)');
    else if (e.cast > 0) {
      var hf = 1 + stats.hastePct / 100, redBy = s.cast - e.cast;
      castParts.push('Cast ' + f(e.cast / hf, 2) + ' s' + (redBy > 1e-9 || stats.hastePct ? ' (' + s.cast + ' s' + (redBy > 1e-9 ? ' − ' + f(redBy, 1) + ' s ' + (bk === 'corruption' ? 'Improved Corruption' : 'Bane') : '') + (stats.hastePct ? ', ÷ ' + hf.toFixed(2) + ' haste' : '') + ')' : ''));
    } else castParts.push(s.cast > 0 ? 'Instant with your talents' : 'Instant');
    castParts.push(f(e.cost, 0) + ' mana' + (e.cost < s.cost ? ' (' + s.cost + ' − Cataclysm)' : ''));
    if (e.cd) castParts.push(f(e.cd, 0) + ' s cooldown' + (e.cd < s.cd ? ' (' + s.cd + ' s − Decimation)' : ''));
    castParts.push('misses ' + f(100 - stats.hitPct) + '% of the time' + (s.aoe ? ' (rolled for every tick and target)' : ''));
    notes.push(castParts.join(' · ') + '.');
    if (WL.levelResist(cfg) > 0 || (cb.targetResist[school] || 0) > 0 || stats.pierce > 0) {
      var pr = WL.resistProfile(cfg, stats.pierce, school, hasCoe), pr0 = WL.resistProfile(cfg, stats.pierce, school, false);
      notes.push((hasCoe && pr0.mean < 0 ? 'Before the curse is on the ' + (extra ? 'target' : 'boss') + ', ' + f(-pr0.mean * 100, 1) + '% is resisted on average. ' : '') +
        (pr.mean < 0 ? 'On average ' + f(-pr.mean * 100, 1) + '% is resisted.' : pr.mean > 0 ? 'Spell Pierce adds ' + f(pr.mean * 100, 2) + '% on average.' : hasCoe ? 'With the curse up nothing is resisted.' : ''));
    }
    if (extra) notes.push('On an extra target only its own Curse of the Elements and Improved Shadow Bolt count; Wrack\'s and Soul Siphon\'s bonuses do not apply there.');
    return { title: s.name + (s.rank ? ' (Rank ' + s.rank + ')' : ''), steps: steps, notes: notes, values: values };
  };
})();
