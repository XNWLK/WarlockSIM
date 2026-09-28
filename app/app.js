// UI for Xn's Forever Warlock Sim: stat bar -> run every build × race (+ "No race" baseline) -> stat weights -> ranked table with expandable details.
(function () {
  var cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
  // raceOpen[buildKey]: the build's other races are shown under its row (round 44: one row per build, best race first).
  // dirty: settings changed after the last run → the results are marked as out of date (round 44).
  var results = [], weights = {}, open = {}, raceOpen = {}, logMode = {}, runCfg = cfg, running = false, dirty = false;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (x, d) { return (x == null || !isFinite(x)) ? '–' : x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };

  // One colour per damage source (shadow = violets, fire = warm, pet = greens). Used by the split bar, spell table and log.
  var COLORS = {
    shadowBolt: '#7B4FD6', shadowBoltR2: '#9A74E8', corruption: '#4B3AA6', baneOfAgony: '#A27BEA', baneOfDoom: '#35286F', siphonLife: '#C4A6F5',
    wrack: '#6A2D9E', drainLife: '#8C7CC9', shadowburn: '#D0B0FF', deathCoil: '#5C4B8C',
    immolate: '#E0662F', incinerate: '#F2A03D', conflagrate: '#B8401C', soulFire: '#F5CD5E', searingPain: '#D98530',
    'pet:melee': '#2F8F5F', 'pet:lashOfPain': '#5CC08A', 'pet:firebolt': '#3AA776', 'pet:brand': '#8FD6A8', touchOfTheGrave: '#8A8F98',
  };
  var ACTION_ICON = { curseOfElements: 'curseOfElements', shadowBoltR2: 'shadowBolt', shadowTrance: 'shadowTrance', bane: 'baneOfDoom', baneOfAgony: 'baneOfAgony', corruption: 'corruption',
    siphonLife: 'siphonLife', immolate: 'immolate', conflagrate: 'conflagrate', shadowburn: 'shadowburn', soulFire: 'soulFire',
    wrack: 'wrack', shadowBolt: 'shadowBolt', incinerate: 'incinerate', drainLife: 'drainLife', searingPain: 'searingPain',
    lifeTapPet: 'lifeTap', soulFireShards: 'soulFire', searingPainBrand: 'searingPain', shadowburnSnF: 'shadowburn', conflagrateSnF: 'conflagrate', multiDot: 'corruption', shadowBoltSpread: 'talent_improvedShadowBolt', isbUpkeep: 'talent_improvedShadowBolt', havocAuto: 'baneOfHavoc',
    swapToImp: 'pet_imp', swapToSuccubus: 'pet_succubus', searingPainExecute: 'searingPain' };
  // Stat weights (round 44): the table shows SP first (DPS per 1 SP), the others as spell-power equivalents
  // (weight ÷ SP weight: "1% hit is worth 12 SP"); Spell Pierce only in the details.
  var STATS = [
    { k: 'sp', label: 'per 1 SP', unit: '1 SP', c: '--c-sp' }, { k: 'hitPct', label: 'per 1% hit', unit: '1% hit', c: '--c-hit' },
    { k: 'critPct', label: 'per 1% crit', unit: '1% crit', c: '--c-crit' }, { k: 'hastePct', label: 'per 1% haste', unit: '1% haste', c: '--c-haste' },
    { k: 'int', label: 'per 1 Int', unit: '1 Int', c: '--c-int' },
  ];
  var STATS_ALL = STATS.concat([{ k: 'pierce', label: 'per 1 Spell Pierce', unit: '1 Spell Pierce', c: '--c-pierce' }]);
  var RACIAL_ICON = { 'Blood Fury': 'racial_bloodFury', 'Berserking': 'racial_berserking', 'Eureka!': 'racial_eureka' };
  // Dark or light label text depending on the segment colour (relative luminance).
  function textOn(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#1E1A2B' : '#FFFFFF';
  }
  // icon(key, title, cls, tipHtml): with tipHtml the icon gets a rich hover tooltip instead of the plain title.
  function icon(key, title, cls, tip) {
    var src = WL.ICONS[key];
    if (!src) return '';
    return '<img class="ico' + (cls ? ' ' + cls : '') + '" src="' + src + '" alt="' + esc(title) + '"' +
      (tip ? ' data-tip="' + esc(tip) + '"' : ' title="' + esc(title) + '"') + '>';
  }

  // ---------- tooltips (text generated from Wowhead data by tools/gen-tooltips.ps1) ----------
  var PET_TEXT = {   // pet spells are not in the archived raw file; text from research/wowhead_spell_details.md
    firebolt: 'Deals (57.1% of Spell Power) Fire damage to a target.',
    lashOfPain: 'An instant attack that lashes the target, causing (42.9% of Spell Power) Shadow damage.',
  };
  var ACTION_SPELLS = { bane: ['baneOfDoom', 'baneOfAgony'], shadowTrance: ['shadowBolt'], lifeTapPet: ['lifeTap'],
    multiDot: ['curseOfElements', 'corruption', 'baneOfAgony', 'immolate', 'siphonLife'], shadowburnSnF: ['shadowburn'], conflagrateSnF: ['conflagrate'], shadowBoltSpread: ['shadowBolt'], isbUpkeep: ['shadowBolt'],
    searingPainBrand: ['searingPain'], soulFireShards: ['soulFire'], searingPainExecute: ['searingPain'] };
  function para(s) { return esc(s).replace(/\n/g, '<br>'); }
  function spellMeta(s) {
    var parts = [];
    if (s.kind === 'channel') parts.push('Channeled ' + s.duration + ' s');
    else parts.push(s.cast ? s.cast + ' s cast' : 'Instant');
    if (s.cost) parts.push(s.cost + ' mana');
    if (s.cd) parts.push(s.cd >= 60 ? (s.cd / 60) + ' min cooldown' : s.cd + ' s cooldown');
    if (s.duration && s.kind !== 'channel' && s.kind !== 'direct') parts.push(s.duration >= 60 ? (s.duration / 60) + ' min' : s.duration + ' s');
    return parts.join(' · ');
  }
  function spellBlock(key) {
    var s = WL.spellsFor(cfg)[key];                       // the rank in use (book ranks option, round 42)
    if (!s) return '';
    return '<div class="tt-name">' + esc(s.name) + (s.rank ? ' <span class="meta">Rank ' + s.rank + '</span>' : '') + '</div><div class="tt-meta">' + esc(spellMeta(s)) + '</div>' +
      '<div class="tt-body">' + para((WL.SPELL_TEXT || {})[s.id] || '') + '</div>';
  }
  // Bane of Havoc is not a priority action: with 2+ targets the engine casts it on target 2 by itself (off the GCD). It is
  // shown at the top of the priority list anyway, so the Destruction builds visibly use it (user report, round 40).
  var HAVOC_LABEL = 'Bane of Havoc on target 2 (automatic with 2+ targets: at the pull and whenever it is missing, off the GCD)';
  function shownRotation(b, c) {
    var rot = WL.effectiveRotation(b, c);
    return (c.fight.targets || 1) >= 2 && b.talents.baneOfHavoc ? ['havocAuto'].concat(rot) : rot;
  }
  function actLabel(a) { return a === 'havocAuto' ? HAVOC_LABEL : WL.ACTIONS[a].label; }
  function actionTip(a) {
    if (a === 'havocAuto') return spellBlock('baneOfHavoc') + '<div class="tt-rule">' + esc(HAVOC_LABEL) + '</div>';
    if (a === 'swapToImp' || a === 'swapToSuccubus') {             // mid-fight pet swap (round 35)
      var to = a === 'swapToImp' ? 'Imp' : 'Succubus';
      return '<div class="tt-name">Pet swap at execute → ' + to + '</div><div class="tt-meta">Once per fight · needs Demonic Sacrifice, Demonic Pact, Fel Domination</div>' +
        '<div class="tt-body">Demonic Sacrifice on the active pet (instant, off the GCD — its buff replaces the old one), Fel Domination (off the GCD), ' +
        'Summon ' + to + ' (10 s − 6 s Fel Domination − 4 s Master Summoner 2/2 = instant, one GCD; mana −50% −40%). From then on the new pet fights and the new sacrifice buff applies.</div>' +
        '<div class="tt-rule">Priority rule: ' + esc(WL.ACTIONS[a].label) + '</div>';
    }
    return (ACTION_SPELLS[a] || [a]).map(spellBlock).join('<hr>') + '<div class="tt-rule">Priority rule: ' + esc(WL.ACTIONS[a].label) + '</div>';
  }
  function racialTip(rc) {
    return '<div class="tt-name">' + esc(rc.name) + '</div><div class="tt-meta">Racial · ' + (rc.cd ? (rc.cd / 60) + ' min cooldown' : 'passive') + '</div>' +
      '<div class="tt-body">' + para((WL.SPELL_TEXT || {})[rc.id] || '') + '</div>' +
      '<div class="tt-rule">' + esc(racialRule(rc)) + '</div>';
  }
  // How the sim uses a racial cooldown (Eureka!: live +10% aura, pop timing from options.eurekaPolicy — round 38).
  function racialRule(rc) {
    if (!rc.charges) return 'Used on cooldown, right before a damaging spell (never before a curse or Life Tap)';
    var pol = (runCfg.options || {}).eurekaPolicy || 'doom';
    return 'A +10% damage aura on all your damage (DoTs included) until 3 spells have been cast. Popped ' +
      (pol === 'any' ? 'on cooldown, right before any damaging spell' : pol === 'long' ? 'on cooldown, right before a long cast (Shadow Bolt, Searing Pain, Incinerate, Soul Fire, a channel)' :
        'right before a long cast; while Bane of Doom ticks, held until its explosion falls inside the aura');
  }
  function talentTip(t, n) {
    var txt = (WL.TALENT_TEXT || {})[t.key] || [];
    var h = '<div class="tt-name">' + esc(t.name) + '</div><div class="tt-meta">Rank ' + n + '/' + t.ranks + ' · ' + WL.TREES[t.tree].name + '</div>';
    h += n ? '<div class="tt-body">' + para(txt[n - 1] || '') + '</div>' : '<div class="tt-body tt-dim">' + para(txt[0] || '') + '</div>';
    if (n && n < t.ranks) h += '<div class="tt-next">Next rank:</div><div class="tt-body tt-dim">' + para(txt[n] || '') + '</div>';
    if (!n) h += '<div class="tt-next">Not taken in this build</div>';
    return h;
  }
  function spellTipByKey(k) {
    if (k === 'pet:firebolt') return '<div class="tt-name">Firebolt (Imp)</div><div class="tt-meta">2 s cast · 115 mana</div><div class="tt-body">' + para(PET_TEXT.firebolt) + '</div>';
    if (k === 'pet:lashOfPain') return '<div class="tt-name">Lash of Pain (Succubus)</div><div class="tt-meta">Instant · 160 mana · 12 s cooldown</div><div class="tt-body">' + para(PET_TEXT.lashOfPain) + '</div>';
    if (k === 'pet:brand') return talentTip(WL.TALENT_BY_KEY.demonicBrand, 3);
    return WL.SPELLS[k] ? spellBlock(k) : '';
  }
  var tipEl = null;
  function tipShow(e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) return;
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    tipEl.innerHTML = t.getAttribute('data-tip');
    tipEl.hidden = false;
    tipMove(e);
  }
  function tipMove(e) {
    if (!tipEl || tipEl.hidden) return;
    var pad = 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > window.innerWidth - 8) x = Math.max(8, e.clientX - w - pad);
    if (y + h > window.innerHeight - 8) y = Math.max(8, e.clientY - h - pad);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function tipHide(e) {
    if (!tipEl) return;
    var to = e.relatedTarget;
    if (to && to.closest && to.closest('[data-tip]')) return;
    tipEl.hidden = true;
  }
  document.addEventListener('mouseover', tipShow);
  document.addEventListener('mousemove', tipMove);
  document.addEventListener('mouseout', tipHide);
  // Keep settings (armor note, total stats, tab counts) in sync while editing; the next Run uses them.
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!(t.closest && t.closest('#settings'))) return;
    // The preset stays shown after choosing it (it used to jump back to "— choose —", which looked like it did nothing —
    // user report, round 40); editing one of the fields it sets shows "— choose —" again.
    if (t.id === 'encPreset') applyEncounter(t.value);
    else if (['duration', 'durVar', 'latencyMs', 'moveEvery', 'moveDuration', 'targets', 'o_multiDot'].indexOf(t.id) >= 0) $('encPreset').value = '';
    // Consumables: one per group - ticking one unticks the rest of its group [A57]
    if (t.id && t.id.indexOf('c_') === 0 && t.checked) {
      var g = cfg.consumables[t.id.slice(2)].group;
      Object.keys(cfg.consumables).forEach(function (k) { if (cfg.consumables[k].group === g && 'c_' + k !== t.id) $('c_' + k).checked = false; });
    }
    // Boss debuffs of the same group do not stack (Sunder / Expose Armor, Faerie Fire / Curse of Recklessness — round 68):
    // ticking one unticks the other.
    if (t.id && t.id.indexOf('d_') === 0 && t.checked) {
      var dg = (cfg.debuffs[t.id.slice(2)] || {}).group;
      if (dg) Object.keys(cfg.debuffs).forEach(function (k) { if (cfg.debuffs[k].group === dg && 'd_' + k !== t.id) $('d_' + k).checked = false; });
    }
    readSettings();
    if (t.id === 'showPct') { if (results.length && !running) { render(); showStale(); } return; }   // display only (round 66)
    if (t.id !== 't_race' && t.id !== 'gearSel') markDirty();   // the Stats race only changes the Total column, not the run
  });
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#totalTable')) { readSettings(); markDirty(); } });
  // Out-of-date results (round 44, after the Havoc report in round 40): any settings change after a run marks the
  // table as stale until the next Sim!.
  // Round 55: "changed" = the settings differ from the run's (changing a value back clears it again).
  function markDirty() { if (!results.length || running) return; dirty = !sameSettings(); showStale(); }
  function showStale() {
    var pend = running || dirty ? [] : pendingBuilds();                 // round 55: new builds with unchanged settings
    var noW = running || dirty || pend.length || !results.length ? [] : bestRaceJobs(WL.BUILDS).filter(function (x) { return !weights[x.b.key]; });   // round 66
    $('stale').hidden = running || !(dirty || pend.length || noW.length);
    $('results').classList.toggle('stale', dirty && !running);
    $('staleMsg').innerHTML = dirty
      ? '<b>Settings changed since this run.</b> The results below are from the previous settings; Sim! reruns every build.'
      : noW.length ? '<b>' + noW.length + ' shown build' + (noW.length === 1 ? '' : 's') + ' without stat weights:</b> ' + noW.map(function (x) { return esc(x.b.short); }).join(', ') +
        '. The settings are unchanged, so Sim! only measures ' + (noW.length === 1 ? 'its' : 'their') + ' stat weights.'
      : '<b>' + pend.length + ' build' + (pend.length === 1 ? '' : 's') + ' not simulated yet:</b> ' + pend.map(function (b) { return esc(b.short); }).join(', ') +
        '. The settings are unchanged, so Sim! only simulates ' + (pend.length === 1 ? 'this build' : 'these') + ' and adds ' + (pend.length === 1 ? 'it' : 'them') + ' to the list.';
  }
  // Settings tabs
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tabs [role=tab]');
    if (!b) return;
    Array.prototype.forEach.call(document.querySelectorAll('.tabs [role=tab]'), function (x) {
      var on = x === b; x.setAttribute('aria-selected', on); $(x.getAttribute('aria-controls')).hidden = !on;
    });
  });

  // ---------- settings ----------
  var numFields = [
    ['duration', 'fight', 'duration'], ['durVar', 'fight', 'durationVarPct'], ['iterations', 'fight', 'iterations'], ['weightIterations', 'fight', 'weightIterations'],
    ['executePct', 'fight', 'executePct'], ['seed', 'fight', 'seed'],
    ['g_sp', 'gear', 'sp'], ['g_hitPct', 'gear', 'hitPct'], ['g_critPct', 'gear', 'critPct'], ['g_hastePct', 'gear', 'hastePct'],
    ['g_pierce', 'gear', 'pierce'], ['g_int', 'gear', 'int'], ['g_spi', 'gear', 'spi'], ['g_mp5', 'gear', 'mp5'],
    ['g_sta', 'gear', 'sta'], ['g_shadowSp', 'gear', 'shadowSp'], ['g_fireSp', 'gear', 'fireSp'],
    ['showPct', 'options', 'showWithinPct'],
    ['latencyMs', 'fight', 'latencyMs'], ['travelMs', 'fight', 'travelMs'], ['moveEvery', 'fight', 'moveEvery'], ['moveDuration', 'fight', 'moveDuration'], ['targets', 'fight', 'targets'],
  ];
  // Encounter presets (W11): fill the fight fields; everything else stays as it is.
  var ENCOUNTERS = {
    default:    { duration: 180, durationVarPct: 10, latencyMs: 0, moveEvery: 0, moveDuration: 0, targets: 1 },
    short:      { duration: 90, durationVarPct: 10, latencyMs: 0, moveEvery: 0, moveDuration: 0, targets: 1 },
    long:       { duration: 300, durationVarPct: 10, latencyMs: 0, moveEvery: 0, moveDuration: 0, targets: 1 },
    move:       { duration: 180, durationVarPct: 10, latencyMs: 0, moveEvery: 20, moveDuration: 3, targets: 1 },
    heavyMove:  { duration: 180, durationVarPct: 10, latencyMs: 0, moveEvery: 15, moveDuration: 5, targets: 1 },
    twoTargets: { duration: 180, durationVarPct: 10, latencyMs: 0, moveEvery: 0, moveDuration: 0, targets: 2 },
    twoDots:    { duration: 180, durationVarPct: 10, latencyMs: 0, moveEvery: 0, moveDuration: 0, targets: 2, multiDot: true },
    threeDots:  { duration: 180, durationVarPct: 10, latencyMs: 0, moveEvery: 0, moveDuration: 0, targets: 3, multiDot: true },
    latency:    { duration: 180, durationVarPct: 10, latencyMs: 150, moveEvery: 0, moveDuration: 0, targets: 1 },
  };
  function applyEncounter(k) {
    var p = ENCOUNTERS[k]; if (!p) return;
    Object.keys(p).forEach(function (f) { cfg.fight[f] = p[f]; });
    cfg.fight.multiDot = !!p.multiDot;                  // presets without multi-DoT switch it off
    numFields.forEach(function (f) { if (f[1] === 'fight') $(f[0]).value = cfg.fight[f[2]]; });
    $('o_multiDot').checked = cfg.fight.multiDot;
  }
  var boxFields = [['o_coe', 'options', 'useCurseOfElements'], ['o_pet', 'options', 'includePetDamage'], ['o_critAll', 'gear', 'critIncludesAll'], ['o_sword', 'gear', 'weaponIsSword'],
    ['o_multiDot', 'fight', 'multiDot'], ['o_ltMove', 'fight', 'lifeTapWhileMoving'], ['o_bookRanks', 'options', 'bookRanks'], ['o_dotEnd', 'options', 'dotEndCheck'],
    ['o_eng', 'professions', 'engineering']];
  function initSettings() {
    // Stats table: editable Sheet (gear) inputs + read-only Total, built once so typing keeps focus
    $('totalTable').innerHTML = '<thead><tr><th>Stat</th><th class="n">Sheet (gear)</th><th class="n">Total</th><th>Added on top of the sheet</th></tr></thead><tbody>' +
      TOTAL_ROWS.map(function (r) {
        return '<tr><td class="stat" style="--c:var(' + (r.c || '--line') + ')"><b></b><label for="g_' + r.k + '">' + r.label + '</label></td>' +
          '<td class="n gin">' + (r.gear ? '<input id="g_' + r.k + '" type="number"' + (r.d ? ' step="0.1"' : '') + '>' : '–') + '</td>' +
          '<td class="n tv" id="tv_' + r.k + '"></td><td class="src" id="ts_' + r.k + '"></td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="4" class="src" id="totNote"></td></tr></tfoot>';
    numFields.forEach(function (f) { $(f[0]).value = cfg[f[1]][f[2]]; });
    boxFields.forEach(function (f) { $(f[0]).checked = !!cfg[f[1]][f[2]]; });
    $('encPreset').value = '';                            // loaded / reset settings: no preset shown
    $('p_spPct').value = cfg.petSpPct; $('p_succAp').value = cfg.pets.succubus.melee.apPerSp; $('p_succBase').value = cfg.pets.succubus.melee.baseDps;
    function box(prefix, k, o) {
      var iconKey = ({ b_: 'buff_', d_: 'debuff_', c_: 'consumable_' })[prefix] + k;
      var isCon = prefix === 'c_', text = isCon ? o.text : (WL.SPELL_TEXT || {})[o.id];
      var tip = '<div class="tt-name">' + esc(o.name) + '</div><div class="tt-meta">' + esc(isCon ? o.cat : o.cls || '') +
        (o.id ? ' · Wowhead ' + (isCon ? 'item ' : 'spell ') + o.id : '') + '</div>' +
        (text ? '<div class="tt-body">' + para(text) + '</div>' : '') +
        '<div class="tt-rule">Simulated as: ' + esc(o.desc || '') + '</div>';
      return '<label class="c" for="' + prefix + k + '"><input id="' + prefix + k + '" type="checkbox"' + (o.on ? ' checked' : '') + '> ' +
        icon(iconKey, o.name, '', tip) + '<span class="cls">' + esc(isCon ? o.cat : o.cls || '') + '</span><span>' + esc(o.name) + ' <span class="eff">' + esc(o.desc || '') + '</span></span></label>';
    }
    $('buffBoxes').innerHTML = Object.keys(cfg.buffs).map(function (k) { return box('b_', k, cfg.buffs[k]); }).join('');
    $('debuffBoxes').innerHTML = Object.keys(cfg.debuffs).map(function (k) { return box('d_', k, cfg.debuffs[k]); }).join('');
    // Consumables, one block per exclusive group (order = first appearance in data/consumables.js)
    var groups = [];
    Object.keys(cfg.consumables).forEach(function (k) {
      var g = cfg.consumables[k].group, blk = groups.filter(function (x) { return x.g === g; })[0];
      if (!blk) groups.push(blk = { g: g, keys: [] });
      blk.keys.push(k);
    });
    $('consBoxes').innerHTML = groups.map(function (blk) {
      var req = cfg.consumables[blk.keys[0]].requires;
      return '<div class="cgroup checks"' + (req ? ' data-req="' + req + '"' : '') + '><h3>' + esc(CON_GROUPS[blk.g] || blk.g) +
        (req ? ' <span class="reqnote">needs Engineering (Stats panel)</span>' : '') + '</h3>' +
        blk.keys.map(function (k) { return box('c_', k, cfg.consumables[k]); }).join('') + '</div>';
    }).join('');
    $('t_race').innerHTML = WL.SIM_RACE_KEYS.map(function (r) { return '<option value="' + r + '">' + esc(WL.RACES[r].name) + (WL.RACES[r].baseline ? ' (baseline)' : '') + '</option>'; }).join('');
    $('bossArmor').value = cfg.combat.bossArmor;
    $('resShadow').value = cfg.combat.targetResist.shadow; $('resFire').value = cfg.combat.targetResist.fire;
    $('o_levelRes').checked = !!(cfg.combat.levelResist && cfg.combat.levelResist.on);
    $('o_eureka').value = cfg.options.eurekaPolicy || 'doom';
    armorNote(); renderTotals(); tabCounts();
  }
  var CON_GROUPS = { flask: 'Flask', spElixir: 'Spell power elixir', shadowElixir: 'Shadow elixir', fireElixir: 'Fire elixir',
    intElixir: 'Intellect elixir', spiElixir: 'Spirit elixir', manaElixir: 'Mana regeneration elixir', zanza: 'Zanza', cortex: 'Cerebral Cortex',
    food: 'Food (well fed)', drink: 'Drink', weapon: 'Weapon oil', potion: 'Potion (shared cooldown)', rune: 'Rune (own cooldown)',
    sapper: 'Engineering: Sapper (own 5 min cooldown)', explosive: 'Engineering: explosive (shared 1 min cooldown)' };
  function tabCounts() {
    var on = function (o) { return Object.keys(o).filter(function (k) { return o[k].on; }).length; };
    $('cnt_cons').textContent = on(cfg.consumables);
    Array.prototype.forEach.call(document.querySelectorAll('.cgroup[data-req]'), function (g) {   // dim items whose profession is off
      g.classList.toggle('off', !(cfg.professions || {})[g.getAttribute('data-req')]);
    });
    var nb = on(cfg.buffs), nd = on(cfg.debuffs);
    $('cnt_stats').textContent = nb + (nb === 1 ? ' buff · ' : ' buffs · ') + nd + (nd === 1 ? ' debuff' : ' debuffs');
  }

  // ---------- total stats (gear + raid buffs + consumables + oil + passive racials; no talents) ----------
  var TOTAL_ROWS = [
    { k: 'sp', label: 'Spell power', c: '--c-sp', gear: function (g) { return g.sp; }, tot: function (s) { return s.sp; } },
    { k: 'shadowSp', label: 'Shadow spell power', c: '--c-sp', gear: function (g) { return g.shadowSp || 0; }, tot: function (s) { return s.schoolSp.shadow; } },
    { k: 'fireSp', label: 'Fire spell power', c: '--c-sp', gear: function (g) { return g.fireSp || 0; }, tot: function (s) { return s.schoolSp.fire; } },
    { k: 'hitPct', label: 'Hit %', c: '--c-hit', d: 1, gear: function (g) { return g.hitPct; }, tot: function (s, c) { return s.hitPctUncapped - c.combat.baseHitPct; } },
    { k: 'critPct', label: 'Crit %', c: '--c-crit', d: 1, gear: function (g) { return g.critPct; }, tot: function (s) { return s.critPct; } },
    { k: 'hastePct', label: 'Haste %', c: '--c-haste', d: 1, gear: function (g) { return g.hastePct; }, tot: function (s) { return s.hastePct; } },
    { k: 'pierce', label: 'Spell Pierce', c: '--c-pierce', gear: function (g) { return g.pierce; }, tot: function (s) { return s.pierce; } },
    { k: 'int', label: 'Intellect', c: '--c-int', gear: function (g) { return g.int; }, tot: function (s) { return s.int; } },
    { k: 'spi', label: 'Spirit', gear: function (g) { return g.spi; }, tot: function (s) { return s.spi; } },
    { k: 'sta', label: 'Stamina', gear: function (g) { return g.sta; }, tot: function (s) { return s.sta; } },
    { k: 'maxMana', label: 'Maximum mana', gear: null, tot: function (s) { return s.maxMana; } },
    { k: 'mp5', label: 'MP5', gear: function (g) { return g.mp5; }, tot: function (s) { return s.mp5; } },
  ];
  function renderTotals() {
    // Weapon slot comes from the Consumables tab. The per-build Spellstone/Firestone depends on the build,
    // so it is left out of the total and named in the note instead.
    var race = $('t_race').value || 'human';
    var wc = WL.activeConsumables(cfg).filter(function (c) { return c.group === 'weapon'; })[0];
    var perBuild = !!(wc && wc.buildOil);
    var s = WL.computeStats({ talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: [] }, race, cfg);
    var hide = /^(Gear|Stat-weight test)$/;
    TOTAL_ROWS.forEach(function (r) {
      var gv = r.gear ? r.gear(cfg.gear) : null, tv = r.tot(s, cfg), d = r.d || 0;
      var src = s.breakdown.filter(function (b) { return b.stat === r.k && !hide.test(b.source) && !/^Character sheet/.test(b.source); })
        .map(function (b) { return esc(b.source.replace(/ \[A\d+\]/g, '')) + ' ' + (b.value > 0 ? '+' : '') + fmt(b.value, d || (Math.abs(b.value) < 10 && b.value % 1 ? 1 : 0)); });
      if (r.k === 'hitPct') src = src.filter(function (x) { return !/^Base vs/.test(x); });
      $('tv_' + r.k).textContent = fmt(tv, d);
      $('tv_' + r.k).classList.toggle('up', gv != null && Math.abs(tv - gv) > 1e-9);
      $('ts_' + r.k).innerHTML = src.join(' · ');
    });
    $('totNote').textContent = 'Hit chance vs a level-63 boss: ' + fmt(Math.min(cfg.combat.maxHitPct, s.hitPctUncapped), 1) + '% (cap ' +
      cfg.combat.maxHitPct + '%, before Suppression). Weapon slot: ' + (perBuild ? 'Spellstone / Firestone per build, not in the total ' +
      '(Spellstone +2% haste, +21 Shadow SP · Firestone +2% crit, +21 Fire SP).' : s.oilName + '.');
  }
  function armorNote() {
    $('armorNote').textContent = 'Boss armor after debuffs: ' + fmt(WL.bossArmor(cfg)) + ' → pet melee damage reduced by ' + (100 * WL.armorReduction(cfg)).toFixed(1) + '%';
  }
  function readSettings() {
    numFields.forEach(function (f) { var v = parseFloat($(f[0]).value); if (isFinite(v)) cfg[f[1]][f[2]] = v; });
    boxFields.forEach(function (f) { cfg[f[1]][f[2]] = $(f[0]).checked; });
    Object.keys(cfg.buffs).forEach(function (k) { cfg.buffs[k].on = $('b_' + k).checked; });
    Object.keys(cfg.debuffs).forEach(function (k) { cfg.debuffs[k].on = $('d_' + k).checked; });
    Object.keys(cfg.consumables).forEach(function (k) { cfg.consumables[k].on = $('c_' + k).checked; });
    var ba = parseFloat($('bossArmor').value); if (isFinite(ba)) cfg.combat.bossArmor = ba;
    ['Shadow', 'Fire'].forEach(function (s) { var v = parseFloat($('res' + s).value); if (isFinite(v)) cfg.combat.targetResist[s.toLowerCase()] = Math.max(0, v); });
    cfg.combat.levelResist.on = $('o_levelRes').checked;
    cfg.options.eurekaPolicy = $('o_eureka').value;
    armorNote(); renderTotals(); tabCounts();
    var num = function (id, fallback) { var v = parseFloat($(id).value); return isFinite(v) ? v : fallback; };
    cfg.petSpPct = num('p_spPct', cfg.petSpPct);
    cfg.pets.succubus.melee.apPerSp = num('p_succAp', cfg.pets.succubus.melee.apPerSp);
    cfg.pets.succubus.melee.baseDps = num('p_succBase', cfg.pets.succubus.melee.baseDps);
    cfg.fight.iterations = Math.max(1, Math.round(cfg.fight.iterations));
    cfg.fight.weightIterations = Math.max(1, Math.round(cfg.fight.weightIterations));
  }

  // ---------- stat bar ----------
  function chip(c, value, label) { return '<span class="chip" style="--c:var(' + c + ')"><b>' + value + '</b><span>' + label + '</span></span>'; }
  function renderStatbar() {
    var g = runCfg.gear, f = runCfg.fight, buffs = Object.keys(runCfg.buffs).filter(function (k) { return runCfg.buffs[k].on; }).length;
    $('statbar').innerHTML =
      chip('--c-sp', fmt(g.sp), 'spell power') + chip('--c-hit', fmt(g.hitPct, 1) + '%', 'hit (gear)') +
      chip('--c-crit', fmt(g.critPct, 1) + '%', 'crit (sheet)') + chip('--c-haste', fmt(g.hastePct, 1) + '%', 'haste') +
      chip('--c-pierce', fmt(g.pierce), 'spell pierce') + chip('--c-int', fmt(g.int) + ' / ' + fmt(g.spi), 'int / spi (gear)') +
      '<span class="sep"></span>' +
      chip('--c-fight', f.duration + ' s' + (f.durationVarPct ? ' ±' + f.durationVarPct + '%' : ''), 'fight') + chip('--c-fight', fmt(f.iterations), 'fights / combo') +
      chip('--c-fight', 'L63', 'boss · ' + fmt(runCfg.combat.maxHitPct - runCfg.combat.baseHitPct) + '% hit to cap') + chip('--c-fight', runCfg.options.useCurseOfElements ? 'on' : 'off', 'CoE') +
      chip('--c-fight', runCfg.options.includePetDamage ? runCfg.petSpPct + '%' : 'off', 'pet SP') + chip('--c-fight', buffs, 'raid buffs') + chip('--c-fight', WL.activeConsumables(runCfg).length, 'consumables') +
      ((runCfg.professions || {}).engineering ? chip('--c-fight', 'on', 'engineering') : '') +chip('--c-fight', Object.keys(runCfg.debuffs).filter(function (k) { return runCfg.debuffs[k].on; }).length, 'boss debuffs') +
      (runCfg.options.bookRanks ? chip('--c-fight', 'on', 'AQ20 ranks') : '') +
      (runCfg.options.dotEndCheck === false ? chip('--c-fight', 'off', 'end-of-fight DoT check') : '') +
      '<span class="end">' +
      // Round 44 (user): "Pin as reference" merged into batch compare — the run is saved there as a frozen entry.
      '<button type="button" id="addRunBtn"' + (running || !results.length ? ' disabled' : '') + ' title="Save this run (settings + results) as an entry in Batch compare, to compare later runs against it">Add this run to compare</button>' +
      '<button class="primary" id="runBtn" type="button"' + (running ? ' disabled' : '') + '>' + (running ? 'Simming…' : 'Sim!') + '</button></span>';
  }

  // ---------- run ----------
  // Round 55 (user): with the same settings as the last run, Sim! only simulates builds that have no results yet (added
  // or edited in the build editor) and slots them into the list; every other row keeps its numbers — they depend on the
  // settings, not on which other builds are on the sheet. Any change to stats, buffs / debuffs, consumables or fight /
  // pets (anything in the settings) reruns every build.
  // Compared as the settings snapshot (engine/settings-code.js: everything the user can change in the UI), not the raw
  // config: ticking a consumable and unticking it again leaves "on: false" where the default had no flag at all.
  // Round 66: the display cut-off (options.showWithinPct) only filters the table, so it does not make results stale.
  function snapNoCut(c) { var s = WL.settingsSnapshot(c); if (s.options) { s.options = Object.assign({}, s.options); delete s.options.showWithinPct; } return s; }
  function sameSettings() { return results.length > 0 && JSON.stringify(snapNoCut(cfg)) === JSON.stringify(snapNoCut(runCfg)); }
  function pendingBuilds() {         // builds on the sheet without results yet
    if (!results.length) return [];
    var have = {}; results.forEach(function (r) { have[r.build.key] = 1; });
    return WL.BUILDS.filter(function (b) { return !have[b.key]; });
  }
  function run() {
    readSettings();
    if (running) return;
    // Snapshot of the build list: builds added/removed in the editor during a run only count from the next run.
    var builds = WL.BUILDS.slice(), keep = sameSettings(), todo = keep ? pendingBuilds() : builds;
    if (keep) {                                                          // drop rows / weights of removed builds
      var keys = builds.map(function (b) { return b.key; });
      results = results.filter(function (r) { return keys.indexOf(r.build.key) >= 0; });
      Object.keys(weights).forEach(function (k) { if (keys.indexOf(k) < 0) delete weights[k]; });
    } else { runCfg = JSON.parse(JSON.stringify(cfg)); weights = {}; }
    var jobs = [];
    todo.forEach(function (b) { WL.SIM_RACE_KEYS.forEach(function (r) { jobs.push({ kind: 'combo', b: b, r: r }); }); });   // 5 races + "No race" baseline
    var nCombos = jobs.length, out = keep ? results.slice() : [], i = 0, t0 = performance.now();
    running = true; dirty = false; showStale();
    renderStatbar();
    function queueWeights() {                                            // shown builds without stat weights yet
      bestRaceJobs(builds).filter(function (x) { return !weights[x.b.key]; }).forEach(function (x) { jobs.push(x); });
    }
    if (!nCombos) { results = out.slice(); queueWeights(); }
    function step() {
      var until = performance.now() + 60;
      while (i < jobs.length && performance.now() < until) {
        var j = jobs[i];
        if (j.kind === 'combo') out.push(WL.simulate(j.b, j.r, runCfg));
        else weights[j.b.key] = { race: j.r, w: WL.statWeights(j.b, j.r, runCfg, runCfg.fight.weightIterations) };
        i++;
        if (i === nCombos) {                                            // combos done → show table, queue stat weights
          results = out.slice();
          queueWeights();
          render();
        }
      }
      $('runMeta').textContent = (i < nCombos ? 'Simulating ' + (keep ? 'new builds ' : 'builds ') : 'Stat weights ') + i + ' / ' + jobs.length + '…';
      if (i < jobs.length) { setTimeout(step, 0); return; }
      running = false; dirty = !sameSettings();                          // settings edited during the run → stale
      renderStatbar(); render(); showStale(); renderCompareOptions();
      var secs = ((performance.now() - t0) / 1000).toFixed(1);
      $('runMeta').textContent = !keep
        ? results.length + ' combos × ' + fmt(runCfg.fight.iterations) + ' fights + stat weights (' + fmt(runCfg.fight.weightIterations) +
          ' fights each) in ' + secs + ' s · seed ' + runCfg.fight.seed
        : !jobs.length ? 'Nothing new to simulate: the settings are unchanged and every build has results · seed ' + runCfg.fight.seed
        : 'Added ' + todo.length + ' build' + (todo.length === 1 ? '' : 's') + ' (' + nCombos + ' combos × ' + fmt(runCfg.fight.iterations) +
          ' fights' + (jobs.length > nCombos ? ' + stat weights' : '') + ') in ' + secs + ' s; the other builds keep their results (same settings) · seed ' + runCfg.fight.seed;
    }
    setTimeout(step, 0);
  }
  function bestRaceJobs(builds) {   // stat weights only for builds that are shown (best race within the display cut-off)
    return builds.map(function (b) {
      var best = bestRow(b.key);
      return best && withinCut(best) ? { kind: 'weights', b: b, r: best.race } : null;
    }).filter(Boolean);
  }
  // "No race" baseline rows (user, round 28, A62): one per build, never a build's best race, shown whenever the build is.
  function isBase(r) { return r.race === WL.BASELINE_RACE; }
  function bestRow(key) {           // a build's best row among the real races
    return results.filter(function (x) { return x.build.key === key && !isBase(x); }).sort(function (a, c) { return c.dps - a.dps; })[0];
  }
  function baseRow(key) { return results.filter(function (x) { return x.build.key === key && isBase(x); })[0]; }
  // Best build of each tree (at least minPoints in it) is always shown, however far behind it is, and tagged
  // (user: Affliction in round 28, Demonology and Destruction in round 29). [options.alwaysShowBestTrees]
  // Returns [{ tree, minPoints, key }] for the trees that have a qualifying build in this run (cached per results list).
  function treePoints(b, tree) { return Object.keys(b.talents).reduce(function (s, k) { return s + (WL.TALENT_BY_KEY[k].tree === tree ? b.talents[k] : 0); }, 0); }
  var anchorCache = { res: null, len: -1, val: [] };
  function anchors() {
    if (anchorCache.res === results && anchorCache.len === results.length) return anchorCache.val;
    var val = ((runCfg.options || {}).alwaysShowBestTrees || []).map(function (o) {
      var top = null;
      results.forEach(function (r) {
        if (isBase(r) || treePoints(r.build, o.tree) < o.minPoints) return;
        if (!top || r.dps > top.dps) top = r;
      });
      return top ? { tree: o.tree, minPoints: o.minPoints, key: top.build.key } : null;
    }).filter(Boolean);
    anchorCache = { res: results, len: results.length, val: val };
    return val;
  }
  function isAnchor(b) { return anchors().some(function (a) { return a.key === b.key; }); }
  // Display cut-off (user, round 17): only rows within options.showWithinPct % of the best DPS are shown.
  // Every build is still simulated, so a build comes back as soon as the settings make it competitive.
  // Always shown: your builds, the best Affliction build (round 28). Baseline rows follow their build's best race row.
  function cutPct() { var p = (cfg.options || {}).showWithinPct; return p > 0 ? p : 0; }   // live (round 66): applies at once
  // Pins (round 66, user): the 📌 button on a row keeps that build shown whatever the cut-off; kept in this browser.
  var pins = {};
  try { (JSON.parse(localStorage.getItem('wfs.pins') || '[]') || []).forEach(function (k) { pins[k] = 1; }); } catch (e) { pins = {}; }
  function savePins() { try { localStorage.setItem('wfs.pins', JSON.stringify(Object.keys(pins))); } catch (e) { /* page only */ } }
  function withinCut(r) {
    var p = cutPct();
    if (r.build.custom || pins[r.build.key] || isAnchor(r.build)) return true;
    if (isBase(r)) { var br = bestRow(r.build.key); return !!br && withinCut(br); }
    return !p || r.dps >= best() * (1 - p / 100) - 1e-9;
  }
  function hiddenBuilds() {
    var by = {};
    results.forEach(function (r) { if (!isBase(r) && (!by[r.build.key] || r.dps > by[r.build.key].dps)) by[r.build.key] = r; });
    return Object.keys(by).map(function (k) { return by[k]; }).filter(function (r) { return !withinCut(r); }).sort(function (a, b) { return b.dps - a.dps; });
  }

  // ---------- helpers ----------
  function split(b) {
    var s = { affliction: 0, demonology: 0, destruction: 0 };
    Object.keys(b.talents).forEach(function (k) { s[WL.TALENT_BY_KEY[k].tree] += b.talents[k]; });
    return s.affliction + '/' + s.demonology + '/' + s.destruction;
  }
  // twoLines (results table, round 29 compaction): split + name on the first line, race + tags on a second, smaller line.
  function buildName(r, twoLines) {
    var tags = anchors().filter(function (a) { return a.key === r.build.key; }).map(function (a) {
      var tn = WL.TREES[a.tree].name;
      return '<span class="ctag t-' + a.tree + '" title="Best build with at least ' + a.minPoints + ' ' + esc(tn) + ' points: always shown, however far behind it is">best ' + esc(tn) + '</span>';
    }).join('') + (r.build.custom ? '<span class="ctag">yours</span>' : '');
    var race = esc(WL.RACES[r.race].name) + (isBase(r) ? ' — baseline' : '');
    if (twoLines) return '<span class="split">' + split(r.build) + '</span>' + esc(r.build.short) + '<span class="bsub">' + race + tags + '</span>';
    return '<span class="split">' + split(r.build) + '</span>' + esc(r.build.short) + tags + ' <span class="meta">(' + race + ')</span>';
  }
  function spellName(k) {
    if (WL.SPELLS[k]) return WL.SPELLS[k].name + (WL.SPELLS[k].family ? ' (Rank ' + WL.SPELLS[k].rank + ')' : '');   // Shadow Bolt Rank 2 (round 57)
    if (k === 'pet:melee') return 'Pet melee';
    if (k === 'pet:lashOfPain') return 'Lash of Pain (Succubus)';
    if (k === 'pet:firebolt') return 'Firebolt (Imp)';
    if (k === 'pet:brand') return 'Demonic Brand (pet bonus)';
    if (k === 'touchOfTheGrave') return 'Touch of the Grave';
    if (k === 'demonicSacrifice') return 'Demonic Sacrifice';                                     // pet swap (round 35)
    if (k === 'felDomination') return 'Fel Domination';
    if (k.indexOf('summon:') === 0) return 'Summon ' + (PET_NAMES[k.slice(7)] || k.slice(7));
    if (k.indexOf('pet_') === 0) return (PET_NAMES[k.slice(4)] || k.slice(4)) + ' arrives';
    if (k.indexOf('item:') === 0) { var c = WL.CONSUMABLES[k.slice(5)]; return c ? c.name : k; }   // Engineering explosives
    if (k === 'isb') return 'Improved Shadow Bolt';                                               // per-target ISB (round 39)
    var xt = /^x(\d):(\w+)$/.exec(k);                                                              // multi-DoT extra target
    if (xt) return spellName(xt[2]) + ' (target ' + xt[1] + ')';
    return k;
  }
  function baseKey(k) { var xt = /^x\d:(\w+)$/.exec(k); return xt ? xt[1] : k; }
  function colorOf(k) { k = baseKey(k); return COLORS[k] || (k.indexOf('item:') === 0 ? '#C9A227' : '#8A8F98'); }
  function iconKeyOf(k) { k = baseKey(k);
    if (WL.SPELLS[k] && WL.SPELLS[k].family) return WL.SPELLS[k].family;   // other ranks share the icon (round 57)
    if (k === 'demonicSacrifice' || k === 'felDomination') return 'talent_' + k;
    if (k.indexOf('summon:') === 0) return 'pet_' + k.slice(7);
    if (k === 'pet:brand') return 'talent_demonicBrand';            // round 45: the brand bonus had no icon
    return k === 'pet:lashOfPain' ? 'lashOfPain' : k === 'pet:firebolt' ? 'firebolt' : k === 'pet:melee' ? 'pet_succubus' : k.indexOf('item:') === 0 ? 'consumable_' + k.slice(5) : k; }
  // Tracked auras (engine keys) → label, icon, group. Buffs on you vs effects on the boss. (W4, W5)
  var AURAS = {
    coe: ['Curse of the Elements', 'curseOfElements', 'boss'], isb: ['Improved Shadow Bolt', 'talent_improvedShadowBolt', 'boss'],
    brand: ['Demonic Brand (charges left)', 'talent_demonicBrand', 'boss'],
    'dot:corruption': ['Corruption', 'corruption', 'boss'], 'dot:immolate': ['Immolate (DoT)', 'immolate', 'boss'],
    'dot:baneOfAgony': ['Bane of Agony', 'baneOfAgony', 'boss'], 'dot:baneOfDoom': ['Bane of Doom', 'baneOfDoom', 'boss'],
    'dot:siphonLife': ['Siphon Life', 'siphonLife', 'boss'],
    shadowTrance: ['Shadow Trance (Nightfall)', 'shadowTrance', 'you'], decimation: ['Decimation', 'talent_decimation', 'you'],
    snfShadow: ['Shadow and Flame: Shadow +10%', 'talent_shadowAndFlame', 'you'], snfFire: ['Shadow and Flame: Fire +10%', 'talent_shadowAndFlame', 'you'],
    eureka: ['Eureka! (charges left)', 'racial_eureka', 'you'], bloodFury: ['Blood Fury', 'racial_bloodFury', 'you'], berserking: ['Berserking', 'racial_berserking', 'you'],
    spPotion: ['Spellblasting Potion', 'consumable_majorSpellblasting', 'you'], powerInfusion: ['Power Infusion', 'buff_powerInfusion', 'you'],
  };
  // [label, icon, group] for an aura key; 'dot2:corruption' = a DoT on extra target 2 (multi-DoT, group 'extra').
  function auraInfo(k) {
    if (AURAS[k]) return AURAS[k];
    var xt = /^dot(\d):(\w+)$/.exec(k);
    if (xt) { var base = AURAS['dot:' + xt[2]]; return [(base ? base[0] : spellName(xt[2])) + ' (target ' + xt[1] + ')', base ? base[1] : xt[2], 'extra']; }
    var xd = /^deb(\d):(\w+)$/.exec(k);                              // CoE / ISB on an extra target (round 39)
    if (xd) { var bd = AURAS[xd[2]]; return [(bd ? bd[0] : xd[2]) + ' (target ' + xd[1] + ')', bd ? bd[1] : '', 'extra']; }
    return null;
  }
  function auraName(k) { var a = auraInfo(k); return a ? a[0] : k; }
  function auraKeys(obj) {   // boss effects, extra targets, then your buffs, each in AURAS order; unknown keys last
    var order = Object.keys(AURAS);
    var ord = function (k) {
      var xt = /^dot(\d):(\w+)$/.exec(k); if (xt) return xt[1] * 100 + order.indexOf('dot:' + xt[2]);
      var xd = /^deb(\d):(\w+)$/.exec(k); if (xd) return xd[1] * 100 - 10 + order.indexOf(xd[2]);   // debuffs before that target's DoTs
      return order.indexOf(k);
    };
    return Object.keys(obj).sort(function (a, b) {
      var ia = auraInfo(a), ib = auraInfo(b), ga = ia ? ia[2] : 'z', gb = ib ? ib[2] : 'z';
      return ga !== gb ? (ga < gb ? -1 : 1) : ord(a) - ord(b);
    });
  }
  function best() { return results.reduce(function (m, r) { return !isBase(r) && r.dps > m ? r.dps : m; }, 0); }   // real races only
  // One row per build = its best race (round 44, user; replaces the "Best race / All races" switch). The other races and
  // the "No race" baseline open underneath with the race toggle.
  function rowsForView() {
    var by = {};
    results.forEach(function (r) { if (!isBase(r) && (!by[r.build.key] || r.dps > by[r.build.key].dps)) by[r.build.key] = r; });
    return Object.keys(by).map(function (k) { return by[k]; }).filter(withinCut).sort(function (a, b) { return b.dps - a.dps; });
  }
  function otherRaces(r) {           // the build's other real races (best first), then its baseline
    var rest = results.filter(function (x) { return x.build.key === r.build.key && x !== r && !isBase(x); }).sort(function (a, c) { return c.dps - a.dps; });
    var b0 = baseRow(r.build.key);
    return b0 ? rest.concat([b0]) : rest;
  }
  function id(r) { return r.build.key + '|' + r.race; }
  function dmgKeys(r) {
    return Object.keys(r.bySpell).filter(function (k) { return r.bySpell[k].dmg > 0; }).sort(function (a, c) { return r.bySpell[c].dmg - r.bySpell[a].dmg; });
  }

  // ---------- table ----------
  function ncols() { return 13; }
  // "Spells & damage" (round 45, user — replaces the separate priority strip and damage split bar; renamed in round 46):
  // the damaging spells in priority order (left = checked first), each once at its first place (Shadow Trance + the
  // Shadow Bolt filler = one Shadow Bolt; damage on extra targets counts toward the spell), with a bar in the spell's
  // colour (length = its share relative to the row's biggest source) and the % below. Non-damaging actions (curses,
  // Life Tap, pet swaps, racial cooldowns) are left out — the full priority is in the details. Pet, Demonic Brand, Touch of
  // the Grave and explosives come after a divider.
  // Round 46 (user): the Warlock part has a fixed width of 8 slots, so the pet part lines up in every row; Bane of Doom
  // and Bane of Agony (mutually exclusive: one Bane per target) share ONE slot with a diagonally split icon (Doom top
  // left, Agony bottom right), their damage added together; the bar shows both parts in their own colours.
  var ACTION_DMG = { havocAuto: ['baneOfHavoc'] };
  var OWN_SLOTS = 8;
  function prioDamage(r, dur) {
    var b = r.build, byBase = {}, total = 0;
    Object.keys(r.bySpell).forEach(function (k) {
      var d = r.bySpell[k].dmg; if (!(d > 0)) return;
      var bk = baseKey(k); byBase[bk] = (byBase[bk] || 0) + d; total += d;
    });
    if (!total) return '';
    var BANES = ['baneOfDoom', 'baneOfAgony'], hasBane = BANES.filter(function (k) { return byBase[k]; });
    var slotOf = function (k) { return hasBane.length > 1 && BANES.indexOf(k) >= 0 ? 'bane' : k; };   // both banes → one slot
    var amount = function (s) { return s === 'bane' ? hasBane.reduce(function (a, k) { return a + byBase[k]; }, 0) : byBase[s]; };
    var shown = {}, own = [], rules = {};
    shownRotation(b, runCfg).forEach(function (a) {
      (ACTION_DMG[a] || ACTION_SPELLS[a] || [a]).forEach(function (k) {
        if (!byBase[k]) return;
        var s = slotOf(k);
        (rules[s] = rules[s] || []).indexOf(actLabel(a)) < 0 && rules[s].push(actLabel(a));
        if (!shown[s]) { shown[s] = 1; own.push(s); }
      });
    });
    var rest = [];
    Object.keys(byBase).forEach(function (k) { var s = slotOf(k); if (!shown[s] && rest.indexOf(s) < 0) rest.push(s); });
    rest.sort(function (x, y) { return amount(y) - amount(x); });
    var mine = rest.filter(function (k) { return k.indexOf('pet:') !== 0 && k !== 'touchOfTheGrave' && k.indexOf('item:') !== 0; });
    var other = rest.filter(function (k) { return mine.indexOf(k) < 0; });
    var slots = own.concat(mine, other), max = Math.max.apply(null, slots.map(amount));
    var extra = function (k) {                        // damage on the extra targets, for the tooltip
      var xs = Object.keys(r.bySpell).filter(function (x) { return x !== k && baseKey(x) === k && r.bySpell[x].dmg > 0; });
      return xs.length ? ' (incl. ' + xs.map(function (x) { return spellName(x).replace(/^.*\(/, '').replace(')', '') + ' ' + fmt(r.bySpell[x].dmg / dur, 1); }).join(', ') + ')' : '';
    };
    var cell = function (s, i) {
      var amt = amount(s), pct = 100 * amt / total, rule = rules[s] ? '<br>Priority #' + (i + 1) + ': ' + esc(rules[s].join(' · ')) : '';
      var ico, bar;
      if (s === 'bane') {
        var parts = hasBane.map(function (k) { return { k: k, amt: byBase[k] }; });
        var tip = spellTipByKey('baneOfDoom') + '<hr>' + spellTipByKey('baneOfAgony') + '<div class="tt-rule">Together ' + fmt(pct, 1) + '% of the damage · ' + fmt(amt / dur, 1) + ' DPS: ' +
          parts.map(function (p) { return spellName(p.k) + ' ' + fmt(100 * p.amt / total, 1) + '% (' + fmt(p.amt / dur, 1) + ' DPS' + extra(p.k) + ')'; }).join(' · ') +
          '<br>One Bane per target: Doom while it will explode in time, Agony otherwise — so they share one slot.' + rule + '</div>';
        ico = '<span class="ico ico2" role="img" aria-label="Bane of Doom / Bane of Agony" data-tip="' + esc(tip) + '">' +
          '<img src="' + (WL.ICONS.baneOfDoom || '') + '" alt=""><img class="cut" src="' + (WL.ICONS.baneOfAgony || '') + '" alt=""></span>';
        bar = '<i class="pbar"><span class="pbarin" style="width:' + (100 * amt / max).toFixed(1) + '%">' + parts.map(function (p) {
          return '<b style="width:' + (100 * p.amt / amt).toFixed(1) + '%;background:' + colorOf(p.k) + '"></b>'; }).join('') + '</span></i>';
      } else {
        var tip1 = spellTipByKey(s) + '<div class="tt-rule">' + fmt(pct, 1) + '% of the damage · ' + fmt(amt / dur, 1) + ' DPS' + extra(s) + rule + '</div>';
        ico = icon(iconKeyOf(s), spellName(s), '', tip1);
        bar = '<i class="pbar"><b style="width:' + (100 * amt / max).toFixed(1) + '%;background:' + colorOf(s) + '"></b></i>';
      }
      return '<span class="pd">' + ico + bar + '<span class="pct">' + (pct < 0.95 ? '<1' : Math.round(pct)) + '%</span></span>';
    };
    return '<span class="pdown">' + own.concat(mine).map(cell).join('') + '</span>' +
      (other.length ? '<span class="pdsep" aria-hidden="true"></span>' + other.map(function (k) { return cell(k, -1); }).join('') : '');
  }
  // Stat weight cells (round 44): SP = DPS per 1 SP; the others as spell-power equivalents (weight ÷ SP weight).
  function weightCells(b) {
    var w = weights[b.key];
    if (!w) return STATS.map(function () { return '<td class="wt"><span class="meta">…</span></td>'; }).join('');
    var sp = w.w.sp, wbest = null;
    ['hitPct', 'critPct', 'hastePct'].forEach(function (k) { if (!wbest || w.w[k] > w.w[wbest]) wbest = k; });   // same unit (per 1%) only
    return STATS.map(function (s) {
      var v = w.w[s.k], eq = s.k !== 'sp' && sp > 1e-9 ? v / sp : null;
      var shown = s.k === 'sp' ? v.toFixed(2) : eq != null ? eq.toFixed(s.k === 'int' ? 2 : 1) : v.toFixed(2);
      return '<td class="wt' + (s.k === wbest ? ' top' : '') + '" style="--c:var(' + s.c + ')" title="' +
        esc(s.unit + ' = ' + v.toFixed(3) + ' DPS' + (eq != null ? ' = ' + eq.toFixed(2) + ' spell power' : '') + ' · computed on ' + WL.RACES[w.race].name) + '">' + shown + '</td>';
    }).join('');
  }
  // Relative DPS bar under the DPS number (round 45, user): full = the best build, empty = the display cut-off
  // (default 10% behind), so differences of a few % are visible. Rows further behind (always-shown builds) get a stub.
  function dpsBar(dps, top) {
    var win = cutPct() || 10, floor = top * (1 - win / 100), f = Math.max(0.02, Math.min(1, (dps - floor) / (top - floor)));
    return '<span class="dbar" title="Bar: from ' + win + '% behind the best (empty) to the best build (full)"><i style="width:' + (100 * f).toFixed(1) + '%"></i></span>';
  }
  var PIN_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M10.5 1.5l4 4-2 1-2.5 2.5.5 3-1.5 1.5-3-3-3.5 3.5-.9-.9L5.1 9.6l-3-3L3.6 5.1l3 .5L9.1 3.1z" fill="currentColor"/></svg>';
  function render() {
    var tb = document.querySelector('#results tbody'), top = best(), rows = rowsForView();
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="' + ncols() + '" class="meta">Simulating…</td></tr>'; return; }
    var rank = 0;
    tb.innerHTML = rows.map(function (r) {
      var d = (r.dps / top - 1) * 100, key = id(r), isOpen = !!open[key], b = r.build, bk = b.key;
      rank++;
      var pets = (b.sacrifice ? '<span class="sac" title="Sacrificed: ' + esc(b.sacrifice) + '">' + icon('pet_' + b.sacrifice, 'Sacrificed ' + b.sacrifice) + '</span>' : '') +
                 (b.pet ? icon('pet_' + b.pet, 'Active: ' + b.pet) : '');
      var others = otherRaces(r), rOpen = !!raceOpen[bk];
      var raceTd = '<td><div class="racecell">' + icon('race_' + r.race, WL.RACES[r.race].name + ' (best race for this build)', 'lg') +
        (others.length ? '<button type="button" class="rtog" data-races="' + esc(bk) + '" aria-expanded="' + rOpen + '" title="' + (rOpen ? 'Hide' : 'Show') +
          ' the other races and the no-race baseline">' + (rOpen ? '▾' : '▸') + ' ' + others.length + '</button>' : '') + '</div></td>';
      var h = '<tr class="row' + (isOpen ? ' open' : '') + '" tabindex="0" data-id="' + esc(key) + '" aria-expanded="' + isOpen + '">' +
        '<td class="n meta rankcell"><button type="button" class="pinbtn" data-pin="' + esc(bk) + '" aria-pressed="' + !!pins[bk] + '" title="' +
          (pins[bk] ? 'Pinned: always shown, whatever the cut-off. Click to unpin.' : 'Pin: keep this build shown when a cut-off hides builds behind the best') +
          '" aria-label="' + (pins[bk] ? 'Unpin ' : 'Pin ') + esc(b.short) + '">' + PIN_SVG + '</button>' + rank + '</td>' +
        '<td class="bname">' + buildName(r, true) + '</td>' + raceTd +
        '<td><div class="pets">' + (pets || '<span class="none">–</span>') + '</div></td>' +
        '<td><div class="pdrow">' + prioDamage(r, r.avgDuration || r.firstFight.duration) + '</div></td>' +
        '<td class="n dps" title="Mean of ' + fmt(r.iterations) + ' fights; ± = 95% confidence of the mean"><b>' + fmt(r.dps, 1) + '</b><span class="err">±' + fmt(r.dpsErr, 1) + '</span>' + dpsBar(r.dps, top) + '</td>' +
        '<td class="n delta ' + (Math.abs(d) < 1e-9 ? 'best' : 'neg') + '">' + (Math.abs(d) < 1e-9 ? 'best' : d.toFixed(2) + '%') + '</td>' +
        raceCell(r) + weightCells(b) + '</tr>';
      if (isOpen) h += '<tr class="detail"><td colspan="' + ncols() + '">' + detail(r) + '</td></tr>';
      if (rOpen) others.forEach(function (x) { h += raceRow(x, r, top); });
      return h;
    }).join('') + hiddenNote();
  }
  // A race sub-row under its build (round 44): race, DPS, vs the build's best race, vs best overall, vs no race.
  function raceRow(x, bestOfBuild, top) {
    var key = id(x), isOpen = !!open[key], base = isBase(x), dB = (x.dps / bestOfBuild.dps - 1) * 100, d = (x.dps / top - 1) * 100;
    var h = '<tr class="row racerow' + (base ? ' baserow' : '') + (isOpen ? ' open' : '') + '" tabindex="0" data-id="' + esc(key) + '" aria-expanded="' + isOpen + '">' +
      '<td></td><td class="rname">' + esc(WL.RACES[x.race].name) + (base ? ' <span class="meta">— baseline: Human base stats, no racials</span>' :
        ' <span class="meta">' + WL.RACES[x.race].racials.map(function (y) { return esc(y.name); }).join(', ') + '</span>') + '</td>' +
      '<td>' + (base ? '<span class="norace" title="No race: Human base stats, no racials (baseline)">–</span>' : icon('race_' + x.race, WL.RACES[x.race].name)) + '</td>' +
      '<td></td><td class="meta rvs">' + dB.toFixed(2) + '% vs ' + esc(WL.RACES[bestOfBuild.race].name) + '</td>' +
      '<td class="n dps"><b>' + fmt(x.dps, 1) + '</b><span class="err">±' + fmt(x.dpsErr, 1) + '</span>' + dpsBar(x.dps, top) + '</td>' +
      '<td class="n delta neg">' + d.toFixed(2) + '%</td>' + raceCell(x) + '<td colspan="' + STATS.length + '"></td></tr>';
    if (isOpen) h += '<tr class="detail"><td colspan="' + ncols() + '">' + detail(x) + '</td></tr>';
    return h;
  }
  // What the race adds (racials + stat offsets): this row vs the same build's "No race" baseline row (round 28).
  function racePct(r) { var b0 = baseRow(r.build.key); return b0 && !isBase(r) ? (r.dps / b0.dps - 1) * 100 : null; }
  function raceCell(r) {
    if (isBase(r)) return '<td class="n meta basecell" title="This row is the baseline: Human base stats, no racials">baseline</td>';
    var d = racePct(r);
    if (d == null) return '<td class="n meta">–</td>';
    return '<td class="n" title="' + esc(WL.RACES[r.race].name) + ' vs no race (' + fmt(baseRow(r.build.key).dps, 1) + ' DPS): racials + stat offsets" style="color:var(' +
      (Math.abs(d) < 0.005 ? '--muted' : d > 0 ? '--good' : '--bad') + ')">' + (d > 0 ? '+' : '') + d.toFixed(2) + '%</td>';
  }
  function hiddenNote() {
    var hid = hiddenBuilds(), top = best();
    if (!hid.length) return '';
    return '<tr class="hidnote"><td colspan="' + ncols() + '" class="meta">' + hid.length + ' more build' + (hid.length > 1 ? 's are' : ' is') + ' simulated but hidden (more than ' +
      cutPct() + '% behind the best): ' + hid.map(function (r) { return split(r.build) + ' ' + esc(r.build.short) + ' ' + fmt(r.dps, 1) + ' (' + ((r.dps / top - 1) * 100).toFixed(1) + '%)'; }).join(' · ') +
      '. Change the cut-off in Fight &amp; pets → Advanced (0 = show all), or show a build again by pinning it (📌) while the cut-off is 0.</td></tr>';
  }

  // ---------- detail ----------
  // Details of one row (round 45 layout, user): actions → three cards (summary · stat weights · races) → the fight
  // pictures (DoT chart, timeline) → stats table with every source inline → spells → talents → smaller cards (priority,
  // vs the others, mana, distribution, uptime) → how the build was found (folded) → event log.
  function detail(r) {
    var b = r.build, st = r.stats, top = best(), dur = (r.avgDuration || r.firstFight.duration);
    var total = Object.keys(r.bySpell).reduce(function (a, k) { return a + r.bySpell[k].dmg; }, 0);
    var h = '<div class="dgrid">';
    // edit a copy of this build / compare it with another one (round 44)
    h += '<div class="wide dactions">' +
      '<button type="button" data-editcopy="' + esc(b.key) + '">' + (b.custom ? 'Edit this build' : 'Edit a copy in the build editor') + '</button>' +
      '<button type="button" data-cmp="' + esc(id(r)) + '">Compare with another build</button></div>';

    // ---- row 1: summary · stat weights · races ----
    var exP = r.execPct != null ? r.execPct : 35, exGain = r.dpsPre ? (r.dpsExec / r.dpsPre - 1) * 100 : null;
    h += '<div class="dcard"><h2>Summary</h2><div class="kv">' +
      kv('Mean DPS (' + fmt(r.iterations) + ' fights)', '<b>' + fmt(r.dps, 1) + '</b> ± ' + fmt(r.dpsErr, 1)) +
      (r.dpsPre != null ? kv('Above ' + exP + '% boss health', fmt(r.dpsPre, 1)) +
        kv('Execute (below ' + exP + '%)', fmt(r.dpsExec, 1) + ' <span style="color:var(' + (exGain >= 0 ? '--good' : '--bad') + ')">(' + (exGain >= 0 ? '+' : '') + exGain.toFixed(1) + '%)</span>') : '') +
      kv('Median · worst – best fight', fmt(r.dpsMedian, 1) + ' · ' + fmt(r.dpsMin, 0) + ' – ' + fmt(r.dpsMax, 0)) +
      kv('vs best overall', ((r.dps / top - 1) * 100).toFixed(2) + '%') + kv('Life Taps per fight', fmt(r.lifeTaps, 1)) +
      (r.clipped > 0.05 ? kv('Channels clipped per fight', fmt(r.clipped, 1)) : '') +
      (b.pet ? kv('Pet out of mana (fight #1)', fmt(r.firstFight.petOomTime, 0) + ' s') : '') +
      (r.firstFight.swapAt != null ? kv('Pet swap (fight #1)', clock(r.firstFight.swapAt) + ' → ' + (PET_NAMES[(b.rotation.indexOf('swapToImp') >= 0 ? 'imp' : 'succubus')])) : '') +
      kv('Weapon oil', WL.OILS[b.oil].name) + '</div></div>';
    h += weightsBlock(r);
    var same = results.filter(function (x) { return x.build.key === b.key; }).sort(function (a, c) { return c.dps - a.dps; });
    var sameTop = same.filter(function (x) { return !isBase(x); })[0];
    h += '<div class="dcard"><h2>Races for this build</h2><div class="kv">' + same.map(function (x) {
      var rp = racePct(x), me = x.race === r.race;
      return '<span>' + (isBase(x) ? '<span class="norace">–</span>' : icon('race_' + x.race, WL.RACES[x.race].name)) + ' ' + (me ? '<b>' : '') + esc(WL.RACES[x.race].name) + (me ? '</b>' : '') +
        (isBase(x) ? ' <span class="meta">baseline</span>' : '') + '</span><span class="n">' + fmt(x.dps, 1) + ' <span class="meta">' + (x === sameTop ? 'best' : ((x.dps / sameTop.dps - 1) * 100).toFixed(2) + '%') + '</span>' +
        (rp != null ? ' <span style="color:var(' + (rp >= 0 ? '--good' : '--bad') + ')" title="What the race adds vs no race">' + (rp >= 0 ? '+' : '') + rp.toFixed(2) + '%</span>' : '') + '</span>';
    }).join('') + '</div><p class="meta">DPS · vs this build\'s best race · <span style="color:var(--good)">what the race adds</span> vs the no-race baseline.</p></div>';

    // ---- the fight: DoT chart, timeline ----
    h += dotChartBlock(r);
    h += dotEndBlock(r);
    h += timelineBlock(r);

    // ---- stats table: value + every source inline (round 45) ----
    var pctOf = function (m) { return (m - 1) * 100; };
    var statRows = [['Intellect', st.int, 'int', 1], ['Spirit', st.spi, 'spi', 1], ['Maximum mana', st.maxMana, 'maxMana', 0],
      ['Spell power', st.sp, 'sp', 0], ['+ Shadow spell power', st.schoolSp.shadow, 'shadowSp', 0], ['+ Fire spell power', st.schoolSp.fire, 'fireSp', 0],
      ['Hit chance %', st.hitPct, 'hitPct', 1], ['Crit % (before talents)', st.critPct, 'critPct', 2], ['Haste %', st.hastePct, 'hastePct', 1],
      ['Spell Pierce', st.pierce, 'pierce', 0],
      ['Shadow damage (auras)', pctOf(st.mult.shadow), 'shadowDmgPct', 1, true], ['Fire damage (auras)', pctOf(st.mult.fire), 'fireDmgPct', 1, true], ['All damage (auras)', pctOf(st.mult.all), 'allDmgPct', 1, true]];
    h += '<div class="wide"><h2>Stats used in the fight</h2><div class="scroll"><table class="stattab"><thead><tr><th>Stat</th><th class="n">Value</th><th>Where it comes from</th></tr></thead><tbody>' +
      statRows.filter(function (s) { return !(s[4] || /Sp$|pierce|haste/.test(s[2])) || Math.abs(s[1]) > 1e-9; }).map(function (s) {
        var src = st.breakdown.filter(function (x) { return x.stat === s[2]; }).map(function (x) {
          return '<span class="src">' + esc(x.source.replace(/ \[A\d+\]/g, '')) + ' <b>' + (x.value > 0 ? '+' : '') + fmt(x.value, Math.abs(x.value) < 10 && x.value % 1 ? 1 : 0) + (s[4] ? '%' : '') + '</b></span>';
        }).join('');
        var val = s[4] ? (s[1] > 0 ? '+' : '') + fmt(s[1], 1) + '%' : fmt(s[1], s[3]);
        return '<tr><td>' + esc(s[0]) + '</td><td class="n"><b>' + val + '</b></td><td class="srcs">' + (src || '<span class="meta">–</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="meta">Talent damage modifiers (Shadow Mastery, Malediction, …) are not in these rows: they add up per spell (A68).</p></div>';

    // ---- spells ----
    var keys = Object.keys(r.bySpell).sort(function (a, c) { return r.bySpell[c].dmg - r.bySpell[a].dmg; });
    h += '<div class="wide"><h2>Spells (average per fight)</h2><div class="scroll"><table><thead><tr>' +
      '<th>Spell</th><th class="n">% dmg</th><th class="n">DPS</th>' +
      '<th class="n" title="Damage per execute time: damage ÷ seconds spent casting it (cast time, channel time, or the GCD for instants). DoTs count all their ticks.">DPET</th>' +
      '<th class="n">Casts</th><th class="n">Hits</th><th class="n">Ticks</th>' +
      '<th class="n">Crit %</th><th class="n">Miss %</th><th class="n">Dmg / cast</th><th class="n">Busy s</th></tr></thead><tbody>' +
      keys.map(function (k) {
        var x = r.bySpell[k], att = x.landed + x.misses, crits = x.crits + x.tickCrits, ev = x.hits + x.ticks;
        return '<tr><td><span class="sw" style="background:' + colorOf(k) + '"></span>' + icon(iconKeyOf(k), spellName(k), '', spellTipByKey(k)) + ' ' + esc(spellName(k)) + '</td>' +
          '<td class="n">' + (total ? fmt(100 * x.dmg / total, 1) : '–') + '</td><td class="n">' + fmt(x.dmg / dur, 1) + '</td>' +
          '<td class="n">' + (x.castTime > 1e-9 && x.dmg ? fmt(x.dmg / x.castTime, 0) : '–') + '</td>' +
          '<td class="n">' + (x.casts ? fmt(x.casts, 1) : '–') + '</td><td class="n">' + (x.hits ? fmt(x.hits, 1) : '–') + '</td>' +
          '<td class="n">' + (x.ticks ? fmt(x.ticks, 1) : '–') + '</td><td class="n">' + (ev ? fmt(100 * crits / ev, 1) : '–') + '</td>' +
          '<td class="n">' + (att ? fmt(100 * x.misses / att, 1) : '–') + '</td><td class="n">' + (x.casts && x.dmg ? fmt(x.dmg / x.casts, 0) : '–') + '</td>' +
          '<td class="n">' + (x.castTime ? fmt(x.castTime, 1) : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    // ---- talents ----
    // Talent trees laid out like the in-game calculator (7 rows × 4 columns); untaken talents are greyed out.
    h += '<div class="wide"><h2>Talents · ' + split(b) + '</h2><div class="trees">' + ['affliction', 'demonology', 'destruction'].map(function (tr) {
      var pts = 0, cells = '';
      WL.TALENTS.filter(function (t) { return t.tree === tr; }).forEach(function (t) {
        var n = b.talents[t.key] || 0; pts += n;
        cells += '<div class="tcell' + (n ? (n === t.ranks ? ' max' : ' part') : ' off') + '" style="grid-row:' + (t.row + 1) + ';grid-column:' + (t.col + 1) + '">' + icon('talent_' + t.key, t.name + ' ' + n + '/' + t.ranks, '', talentTip(t, n)) + '<span class="rk">' + n + '/' + t.ranks + '</span></div>';
      });
      return '<div class="tree"><div class="thead">' + icon('tree_' + tr, WL.TREES[tr].name) + ' <b>' + WL.TREES[tr].name + '</b> <span class="meta">' + pts + '</span></div>' +
        '<div class="tgrid">' + cells + '</div></div>';
    }).join('') + '</div></div>';

    // ---- smaller cards ----
    var rcd = WL.RACES[r.race].racials.filter(function (x) { return x.effect === 'cooldown'; })[0];
    h += '<div class="dcard"><h2>Rotation priority</h2><ol class="prio">' +
      (rcd ? '<li>' + icon(RACIAL_ICON[rcd.name], rcd.name, '', racialTip(rcd)) + ' ' + esc(rcd.name) + ': ' + esc(racialRule(rcd).replace(/^Used /, '')) + '</li>' : '') +
      shownRotation(b, runCfg).map(function (a) {
      return '<li>' + icon(ACTION_ICON[a], actLabel(a), '', actionTip(a)) + ' ' + esc(actLabel(a)) +
        (a === 'havocAuto' ? ' <span class="meta">(added by Targets ≥ 2)</span>' :
         b.rotation.indexOf(a) < 0 ? ' <span class="meta">(added by the Multi-DoT option)</span>' : '') + '</li>';
    }).join('') + '<li>' + icon('lifeTap', 'Life Tap') + ' Life Tap whenever mana is below the next spell\'s cost</li></ol>' +
      '<p class="meta">Racial cooldowns are used on cooldown; channels are clipped when a higher-priority action is ready.' +
      (WL.activeConsumables(runCfg).some(function (c) { return c.manaRestore || c.spPotion; }) ? ' Mana potions / runes are used when at least their amount of mana is missing; Spellblasting at the pull and on cooldown.' : '') + '</p></div>';
    var others = {};
    results.forEach(function (x) { if (x.build.key !== b.key && !isBase(x) && (!others[x.build.key] || x.dps > others[x.build.key].dps)) others[x.build.key] = x; });
    h += '<div class="dcard"><h2>This build vs the others</h2><div class="kv">' + Object.keys(others).map(function (k) { return others[k]; })
      .sort(function (a, c) { return c.dps - a.dps; }).map(function (x) {
        var d = (r.dps / x.dps - 1) * 100;
        return '<span>' + buildName(x) + '</span><span class="n" style="color:var(' + (d >= 0 ? '--good' : '--bad') + ')">' + (d >= 0 ? '+' : '') + d.toFixed(2) + '%</span>';
      }).join('') + '</div></div>';
    h += manaBlock(r) + histBlock(r) + uptimeBlock(r);

    // ---- how the build was found (folded: it is our research history, not needed to read the build) ----
    if (b.notes) h += '<div class="wide"><details class="bd"><summary>How this build was found</summary><p class="meta notes">' + esc(b.notes) + '</p></details></div>';

    var mode = logMode[id(r)] || 'casts';
    var ev = r.log.filter(function (e) { return mode === 'all' || e.type === 'cast' || e.type === 'racial' || e.type === 'consumable' || e.type === 'clip' || e.type === 'miss' || e.type === 'skip'; });
    h += '<div class="wide"><h2>Rotation log · fight #1 (' + ev.length + ' events)</h2>' +
      '<div class="seg" role="group" aria-label="Log detail" style="margin-bottom:8px">' +
      '<button type="button" data-log="casts" data-id="' + esc(id(r)) + '" aria-pressed="' + (mode === 'casts') + '">Casts only</button>' +
      '<button type="button" data-log="all" data-id="' + esc(id(r)) + '" aria-pressed="' + (mode === 'all') + '">Every event</button></div>' +
      '<div class="log"><table><thead><tr><th class="n">Time</th><th>Event</th><th>Spell</th><th class="n">Damage</th><th class="n">Mana</th><th>Note</th></tr></thead><tbody>' +
      ev.map(function (e) {
        var cls = e.type === 'cast' ? 'cast' : (e.type === 'tick' || e.type === 'apply' || e.type === 'debuff' || e.type === 'pet') ? 'minor' : '';
        var note = [];
        if (e.castTime != null) note.push(e.castTime ? e.castTime.toFixed(2) + ' s cast' : 'instant');
        if (e.trance) note.push('Shadow Trance'); if (e.moving) note.push('while moving'); if (e.eureka) note.push('Eureka!');
        if (e.n) note.push('tick ' + e.n + '/' + e.of); if (e.gain) note.push('+' + e.gain + ' mana');
        if (e.for) note.push('for ' + spellName(e.for));
        if (e.type === 'skip') note.push('not recast: ' + e.left + ' s left, would add ' + fmt(e.value) + ' < ' + fmt(e.cost) + ' from ' + spellName(e.filler));
        return '<tr class="' + cls + '"><td class="n">' + clock(e.t) + '</td><td>' + esc(e.type) + '</td>' +
          '<td><span class="sw" style="background:' + colorOf(e.spell) + '"></span>' + esc(spellName(e.spell)) + '</td>' +
          '<td class="n' + (e.crit ? ' crit' : '') + '">' + (e.dmg != null ? fmt(e.dmg) + (e.crit ? ' crit' : '') : '') +
          (e.vulnPct ? '<span class="vuln" title="Spell Pierce: +' + e.vulnPct + '% vulnerable damage — ' + fmt(e.vulnDmg) + ' of the ' + fmt(e.dmg) + ' damage">+' + e.vulnPct + '% vuln (' + fmt(e.vulnDmg) + ')</span>' : '') +
          (e.resistPct ? '<span class="resisted" title="Partial resist (boss resistance): ' + e.resistPct + '% of this hit was resisted' + (e.resistDmg != null ? ' — ' + fmt(e.resistDmg) + ' damage lost' : '') + '">−' + e.resistPct + '% resisted' + (e.resistDmg != null ? ' (' + fmt(e.resistDmg) + ')' : '') + '</span>' : '') + '</td>' +
          '<td class="n">' + fmt(e.mana) + '</td><td class="meta">' + esc(note.join(' · ')) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    return h + '</div>';
  }
  // W4: average uptime of every tracked buff / debuff over all fights.
  function uptimeBlock(r) {
    var u = r.uptimePct || {}, keys = auraKeys(u).filter(function (k) { return u[k] > 0.05; });
    if (!keys.length) return '';
    var grp = '';
    return '<div><h2>Buff &amp; debuff uptime (average of ' + fmt(r.iterations) + ' fights)</h2><div class="uptime">' + keys.map(function (k) {
      var ai = auraInfo(k), g = ai ? ai[2] : 'you', head = g !== grp ? '<span class="uhead">' + (g === 'boss' ? 'On the boss' : g === 'extra' ? 'On the extra targets' : 'On you') + '</span>' : '';
      grp = g;
      return head + '<span class="ulabel">' + icon(ai ? ai[1] : '', auraName(k)) + ' ' + esc(auraName(k)) + '</span>' +
        '<span class="ubar"><span style="width:' + Math.min(100, u[k]).toFixed(1) + '%"></span></span><span class="n">' + fmt(u[k], 1) + '%</span>';
    }).join('') + '</div></div>';
  }
  // W6: histogram of the per-fight DPS (24 bins), mean marked.
  function histBlock(r) {
    var hg = r.dpsHist; if (!hg) return '';
    var W = 360, H = 110, pad = 18, max = Math.max.apply(null, hg.counts), bw = (W - 2 * pad) / hg.counts.length;
    var x = function (v) { return pad + (hg.max > hg.min ? (v - hg.min) / (hg.max - hg.min) : 0.5) * (W - 2 * pad); };
    var bars = hg.counts.map(function (c, i) {
      var bh = max ? (H - 36) * c / max : 0, lo = hg.min + i * hg.width;
      return '<rect x="' + (pad + i * bw + 0.5).toFixed(1) + '" y="' + (H - 20 - bh).toFixed(1) + '" width="' + Math.max(1, bw - 1).toFixed(1) + '" height="' + bh.toFixed(1) + '" class="hbar"><title>' +
        fmt(lo, 0) + '–' + fmt(lo + hg.width, 0) + ' DPS: ' + c + ' fights</title></rect>';
    }).join('');
    var mx = x(r.dps);
    return '<div><h2>DPS distribution · ' + fmt(r.iterations) + ' fights</h2><svg class="hist" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Histogram of fight DPS">' + bars +
      '<line x1="' + mx.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y1="8" y2="' + (H - 20) + '" class="hmean"/>' +
      '<text x="' + mx.toFixed(1) + '" y="7" text-anchor="middle" class="hlab">mean ' + fmt(r.dps, 1) + '</text>' +
      '<text x="' + pad + '" y="' + (H - 6) + '" class="hlab">' + fmt(hg.min, 0) + '</text>' +
      '<text x="' + (W - pad) + '" y="' + (H - 6) + '" text-anchor="end" class="hlab">' + fmt(hg.max, 0) + '</text></svg>' +
      '<p class="meta">Mean ' + fmt(r.dps, 1) + ' ± ' + fmt(r.dpsErr, 1) + ' (95% confidence) · spread (1 SD) ' + fmt(r.dpsSd, 1) + ' · median ' + fmt(r.dpsMedian, 1) + '</p></div>';
  }
  // W3: mana summary (all fights) + mana over time in fight #1 (you, and the pet if it casts spells).
  function manaBlock(r) {
    var m = r.mana || {}, log = r.log || [], D = r.firstFight.duration, maxM = r.stats.maxMana;
    var W = 420, H = 130, padL = 34, padR = 8, padT = 8, padB = 18;
    var x = function (t) { return padL + (t / D) * (W - padL - padR); };
    var y = function (v, max) { return padT + (1 - Math.max(0, Math.min(1, v / max))) * (H - padT - padB); };
    function line(key, max) {
      var pts = [[0, key === 'mana' ? maxM : (log[0] && log[0][key]) || 0]];
      log.forEach(function (e) { if (e[key] != null) pts.push([e.t, e[key]]); });
      return pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1], max).toFixed(1); }).join(' ');
    }
    var hasPet = log.some(function (e) { return e.petMana != null; });
    var petMax = hasPet ? Math.max.apply(null, log.map(function (e) { return e.petMana || 0; })) || 1 : 1;
    var grid = [0, 0.5, 1].map(function (f) { var yy = y(f * maxM, maxM); return '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" class="tlgrid"/>' +
      '<text x="' + (padL - 4) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end" class="hlab">' + Math.round(100 * f) + '%</text>'; }).join('');
    var svg = '<svg class="hist" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Mana over time in fight 1">' + grid +
      '<path d="' + line('mana', maxM) + '" class="mline"/>' + (hasPet ? '<path d="' + line('petMana', petMax) + '" class="mline pet"/>' : '') +
      '<text x="' + padL + '" y="' + (H - 4) + '" class="hlab">0 s</text><text x="' + (W - padR) + '" y="' + (H - 4) + '" text-anchor="end" class="hlab">' + fmt(D, 0) + ' s</text></svg>';
    return '<div><h2>Mana</h2><div class="kv">' +
      kv('Life Taps per fight', fmt(r.lifeTaps, 1)) + (r.movingTaps > 0.05 ? kv('… of them while moving', fmt(r.movingTaps, 1)) : '') + kv('Time spent Life Tapping', fmt(m.tapTimePct, 1) + '% of the fight') +
      kv('Lowest mana in any fight', fmt(r.minMana, 0) + ' / ' + fmt(maxM, 0)) +
      (r.firstFight.manaFromJow || r.firstFight.petManaFromJow ? kv('Judgement of Wisdom (fight #1)', '+' + fmt(r.firstFight.manaFromJow || 0) + ' you' +
        (r.build.pet ? ' · +' + fmt(r.firstFight.petManaFromJow || 0) + ' pet' : '')) : '') +
      (r.build.pet ? kv('Fights where the pet ran out of mana', fmt(m.petOomFightsPct, 0) + '%' + (m.petOomFightsPct > 0 ? ' (avg ' + fmt(m.petOomSecAvg, 0) + ' s)' : '')) : '') +
      (m.idleSecAvg > 0.05 ? kv('Idle time per fight (e.g. moving)', fmt(m.idleSecAvg, 1) + ' s') : '') +
      '</div>' + svg + '<p class="meta"><span class="sw" style="background:var(--accent)"></span>your mana (% of max, fight #1)' +
      (hasPet ? ' · <span class="sw" style="background:var(--c-hit)"></span>pet mana' : '') + '</p></div>';
  }
  // W5: timeline of fight #1 — your casts (instants drawn as their GCD), pet hits, and every tracked aura.
  var TL_PX = 8;   // pixels per second
  function timelineBlock(r) {
    var ff = r.firstFight, log = r.log || [], D = ff.duration, rowH = 16, gap = 4, lanes = [];
    var casts = [], clips = log.filter(function (e) { return e.type === 'clip'; });
    log.forEach(function (e) {
      if (e.type !== 'cast') return;
      // off-GCD instants (gcd 0: Bane of Havoc, Demonic Sacrifice, Fel Domination) are drawn as a thin marker
      var end = e.t + (e.channel || (e.castTime > 1e-9 ? e.castTime : (e.gcd != null ? e.gcd : 1.5)));
      if (e.channel) { var c = clips.filter(function (x) { return x.spell === e.spell && x.t > e.t - 1e-9 && x.t < end; })[0]; if (c) end = c.t; }
      casts.push({ a: e.t, b: Math.min(end, D), k: e.spell, instant: !e.channel && !(e.castTime > 1e-9), tip: clock(e.t) + ' ' + spellName(e.spell) + (e.channel ? ' (channel)' : e.castTime > 1e-9 ? ' (' + e.castTime.toFixed(2) + ' s cast)' : e.gcd === 0 ? ' (instant, off the GCD)' : ' (instant, GCD)') });
    });
    // Boss health (round 34): HP falls linearly 100% → 0% over the fight [A24]; the execute phase (below executePct,
    // Decimation's range) is drawn in red and marked by a dashed line through every lane.
    var exPct = (runCfg.fight && runCfg.fight.executePct != null) ? runCfg.fight.executePct : 35, exT = D * (1 - exPct / 100);
    lanes.push({ label: 'Boss health (execute < ' + exPct + '% from ' + clock(exT).replace(/\.\d+$/, '') + ')', hp: true, h: 24 });
    lanes.push({ label: 'Your casts', items: casts });
    var pets = log.filter(function (e) { return e.type === 'pet'; });
    if (pets.length) lanes.push({ label: 'Pet hits', ticks: pets.map(function (e) { return { t: e.t, k: e.spell, tip: clock(e.t) + ' ' + spellName(e.spell) + ' ' + fmt(e.dmg) + (e.crit ? ' crit' : '') }; }) });
    var au = ff.auras || {};
    auraKeys(au).forEach(function (k) { var ai = auraInfo(k); lanes.push({ label: auraName(k), icon: ai ? ai[1] : '', aura: k, items: au[k].map(function (x) { return { a: x[0], b: x[1], tip: auraName(k) + ' ' + clock(x[0]) + ' – ' + clock(x[1]) }; }) }); });
    var ys = [], yAcc = 16;
    lanes.forEach(function (L) { ys.push(yAcc); yAcc += (L.h || rowH) + gap; });
    var W = Math.ceil(D * TL_PX) + 10, Hh = yAcc;
    var svg = '<svg class="tl" width="' + W + '" height="' + Hh + '" role="img" aria-label="Timeline of fight 1">';
    for (var s = 0; s <= D; s += 10) svg += '<line x1="' + (s * TL_PX).toFixed(1) + '" x2="' + (s * TL_PX).toFixed(1) + '" y1="12" y2="' + Hh + '" class="tlgrid"/>' +
      '<text x="' + (s * TL_PX + 2).toFixed(1) + '" y="10" class="hlab">' + (s >= 60 ? Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) : s + 's') + '</text>';
    lanes.forEach(function (L, i) {
      var y = ys[i];
      if (L.hp) {                                   // boss health lane: area under the HP line, execute part in red
        var h = L.h, xe = exT * TL_PX, xEnd = D * TL_PX, yAt = function (p) { return (y + h * (1 - p / 100)).toFixed(1); };
        svg += '<polygon class="hp-ok" points="0,' + y + ' ' + xe.toFixed(1) + ',' + yAt(exPct) + ' ' + xe.toFixed(1) + ',' + (y + h) + ' 0,' + (y + h) + '"/>' +
          '<polygon class="hp-ex" points="' + xe.toFixed(1) + ',' + yAt(exPct) + ' ' + xEnd.toFixed(1) + ',' + (y + h) + ' ' + xe.toFixed(1) + ',' + (y + h) + '"/>';
        for (var hs = 0; hs < D; hs += 5) {         // hover: HP at each 5 s step
          var p0 = 100 * (1 - hs / D);
          svg += '<rect x="' + (hs * TL_PX).toFixed(1) + '" y="' + y + '" width="' + (Math.min(5, D - hs) * TL_PX).toFixed(1) + '" height="' + h + '" fill="transparent"><title>' +
            esc(clock(hs).replace(/\.\d+$/, '') + ' — boss at ' + p0.toFixed(0) + '% health' + (p0 < exPct ? ' (execute phase)' : '')) + '</title></rect>';
        }
        for (var ls = 30; ls < D - 8; ls += 30) svg += '<text x="' + (ls * TL_PX + 2).toFixed(1) + '" y="' + (y + h - 3) + '" class="hptxt">' + (100 * (1 - ls / D)).toFixed(0) + '%</text>';
        return;
      }
      (L.items || []).forEach(function (it) {
        var fill = L.aura ? 'var(--accent)' : colorOf(it.k);
        svg += '<rect x="' + (it.a * TL_PX).toFixed(1) + '" y="' + y + '" width="' + Math.max(1.5, (it.b - it.a) * TL_PX - (L.aura ? 0 : 1)).toFixed(1) + '" height="' + rowH + '" rx="2" fill="' + fill + '"' +
          (L.aura ? ' opacity=".55"' : it.instant ? ' opacity=".6"' : '') + '><title>' + esc(it.tip) + '</title></rect>';
      });
      (L.ticks || []).forEach(function (tk) {
        svg += '<rect x="' + (tk.t * TL_PX - 1).toFixed(1) + '" y="' + (y + 2) + '" width="2" height="' + (rowH - 4) + '" fill="' + colorOf(tk.k) + '"><title>' + esc(tk.tip) + '</title></rect>';
      });
    });
    // execute marker through every lane (drawn last so it sits on top)
    svg += '<line x1="' + (exT * TL_PX).toFixed(1) + '" x2="' + (exT * TL_PX).toFixed(1) + '" y1="12" y2="' + Hh + '" class="exline"><title>' +
      esc('Execute phase from ' + clock(exT) + ' (boss below ' + exPct + '% health)') + '</title></line>';
    svg += '</svg>';
    var labels = '<div class="tl-labels" style="padding-top:16px">' + lanes.map(function (L) {
      return '<div style="height:' + (L.h || rowH) + 'px;margin-bottom:' + gap + 'px"' + (L.hp ? ' class="hplab" title="' + esc(L.label) + '"' : '') + '>' +
        (L.icon ? icon(L.icon, L.label) + ' ' : '') + esc(L.hp ? 'Boss health' : L.label) + (L.hp ? '<span class="meta"> · execute ' + clock(exT).replace(/\.\d+$/, '') + '</span>' : '') + '</div>';
    }).join('') + '</div>';
    return '<div class="wide"><h2>Timeline · fight #1 (' + fmt(D, 1) + ' s)</h2><div class="tl-wrap">' + labels + '<div class="tl-scroll">' + svg + '</div></div>' +
      '<p class="meta">Boss health falls evenly over the fight (A24); red = execute phase (below ' + exPct + '%, Decimation\'s range), dashed line = when it starts. ' +
      'Bars in "Your casts" use the spell colours from the damage split; faded bars are instants (their GCD). Hover any bar for details.</p></div>';
  }
  // Stat weights of this build (round 44): raw DPS per unit incl. Spell Pierce, and each as spell-power equivalent.
  function weightsBlock(r) {
    var w = weights[r.build.key];
    if (!w) return '<div class="dcard"><h2>Stat weights</h2><p class="meta">' + (running ? 'Being computed…' : 'Only computed for builds shown in the table.') + '</p></div>';
    var sp = w.w.sp;
    return '<div class="dcard"><h2>Stat weights · ' + esc(WL.RACES[w.race].name) + '</h2><div class="kv wkv">' + STATS_ALL.map(function (s) {
      var v = w.w[s.k], eq = s.k !== 'sp' && sp > 1e-9 ? v / sp : null;
      return '<span><span class="sw" style="background:var(' + s.c + ')"></span>' + esc(s.unit) + '</span><span class="n">' + v.toFixed(3) + ' DPS' +
        (eq != null ? ' <span class="meta">= ' + eq.toFixed(2) + ' SP</span>' : '') + '</span>';
    }).join('') + '</div><p class="meta">Computed on the build\'s best race with ' + fmt(runCfg.fight.weightIterations) + ' fights per stat (common random numbers). ' +
      'The table shows hit / crit / haste / Int as spell power: "1% hit = 12 SP" means 1% hit adds as much DPS as 12 spell power. ' +
      'Spell Pierce rests on an assumption flagged as likely wrong (A44), so it is only listed here.</p></div>';
  }

  // DoT uptime chart of fight #1 (round 44, user): one lane per DoT (and Curse of the Elements) on the boss — and on the
  // extra targets with multi-DoT — coloured by spell, with tick marks (tall = crit), ▲ applications, red gaps, early
  // refreshes (a DoT re-applied while it still had time left) and the execute line. Positions in % → fits any width.
  var DOT_KEYS = ['corruption', 'immolate', 'siphonLife', 'baneOfAgony', 'baneOfDoom'];
  // End-of-fight DoT check (round 53, A69): which DoT recasts were skipped near the end, how often, and why.
  function dotEndBlock(r) {
    var on = !(runCfg.options && runCfg.options.dotEndCheck === false), sk = r.dotSkips || {};
    var keys = Object.keys(sk).sort(function (a, c) { return sk[c].fightsPct - sk[a].fightsPct; });
    var h = '<div class="wide"><h2>DoTs at the end of the fight</h2>';
    if (!on) return h + '<p class="meta">The end-of-fight DoT check is off (Fight &amp; pets → Options): DoTs are recast while at least 2 ticks fit (Bane of Agony: 12 s).</p></div>';
    h += '<p class="meta">Near the end a DoT recast can no longer run its full duration. It is skipped when the ticks that still land before the boss dies (plus what the DoT enables) are worth less than the next spell in the priority would do in the same time.</p>';
    if (!keys.length) return h + '<p class="meta">No DoT recast was skipped in these fights.</p></div>';
    return h + '<div class="scroll"><table><thead><tr><th>DoT</th><th class="n" title="Share of the fights in which this recast was skipped">Skipped in</th>' +
      '<th class="n" title="Average fight time left at the first skip">Time left</th><th class="n" title="Expected damage the recast would still have added (ticks in time + what it enables)">Recast would add</th>' +
      '<th class="n" title="Expected damage of the next spell in the priority in the same time">Instead</th><th>Next spell</th></tr></thead><tbody>' +
      keys.map(function (k) {
        var x = sk[k], alts = Object.keys(x.alt).sort(function (a, c) { return x.alt[c] - x.alt[a]; });
        return '<tr><td><span class="sw" style="background:' + colorOf(k) + '"></span>' + icon(iconKeyOf(k), spellName(k), '', spellTipByKey(k)) + ' ' + esc(spellName(k)) + '</td>' +
          '<td class="n">' + fmt(x.fightsPct, 0) + '%</td><td class="n">' + fmt(x.left, 1) + ' s</td><td class="n">' + fmt(x.value, 0) + '</td>' +
          '<td class="n">' + fmt(x.cost, 0) + '</td><td>' + alts.map(function (a) { return esc(spellName(a)); }).join(', ') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="meta">Averages over the fights with a skip, at the moment of the first skip.</p></div>';
  }
  function dotChartBlock(r) {
    var ff = r.firstFight, log = r.log || [], D = ff.duration, au = ff.auras || {}, SP = WL.spellsFor(runCfg);
    var exPct = (runCfg.fight && runCfg.fight.executePct != null) ? runCfg.fight.executePct : 35, exT = D * (1 - exPct / 100);
    var pos = function (t) { return (100 * Math.max(0, Math.min(D, t)) / D).toFixed(3) + '%'; };
    // A lane = one or more parts (the two Banes share a lane: only one Bane per target, Doom then Agony at the end).
    var lanes = [];
    if (au.coe) lanes.push({ label: 'Curse of the Elements', icon: 'curseOfElements', aKeys: ['coe'], parts: [{ color: '#9A86D8', iv: au.coe,
      applies: log.filter(function (e) { return e.type === 'debuff' && e.spell === 'curseOfElements'; }).map(function (e) { return e.t; }), consumes: [], ticks: [], dur: SP.curseOfElements.duration }] });
    [1, 2, 3].forEach(function (ti) {
      var part = function (k) {
        var aKey = ti === 1 ? 'dot:' + k : 'dot' + ti + ':' + k, lk = ti === 1 ? k : 'x' + ti + ':' + k;
        if (!au[aKey]) return null;
        return { k: k, aKey: aKey, color: colorOf(k), iv: au[aKey], dur: SP[k].duration,
          applies: log.filter(function (e) { return (e.type === 'apply' && e.spell === lk) || (ti === 1 && k === 'immolate' && e.type === 'hit' && e.spell === 'immolate'); }).map(function (e) { return e.t; }),
          consumes: ti === 1 ? log.filter(function (e) { return e.type === 'consume' && e.spell === k; }).map(function (e) { return e.t; }) : [],
          ticks: log.filter(function (e) { return e.type === 'tick' && e.spell === lk; }) };
      };
      var suffix = ti > 1 ? ' (target ' + ti + ')' : '';
      ['corruption', 'immolate', 'siphonLife'].forEach(function (k) {
        var p = part(k); if (p) lanes.push({ label: spellName(k) + suffix, icon: k, aKeys: [p.aKey], parts: [p] });
      });
      var banes = ['baneOfDoom', 'baneOfAgony'].map(part).filter(Boolean);
      if (banes.length) lanes.push({ label: (banes.length > 1 ? 'Bane (Doom / Agony)' : spellName(banes[0].k)) + suffix, icon: banes[0].k,
        aKeys: banes.map(function (p) { return p.aKey; }), parts: banes });
    });
    if (!lanes.length) return '';
    var axis = '';
    for (var s = 0; s <= D; s += 30) axis += '<span style="left:' + pos(s) + '">' + (s >= 60 ? Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) : s + 's') + '</span>';
    var rows = lanes.map(function (L) {
      // union of the parts' up-intervals (for uptime and gaps)
      var all = [];
      L.parts.forEach(function (p) { p.iv.forEach(function (x) { all.push([x[0], Math.min(D, x[1])]); }); });
      all.sort(function (a, b) { return a[0] - b[0]; });
      var iv = [];
      all.forEach(function (x) { var last = iv[iv.length - 1]; if (last && x[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], x[1]); else iv.push([x[0], x[1]]); });
      var up = iv.reduce(function (a, x) { return a + (x[1] - x[0]); }, 0);
      var avg = L.aKeys.reduce(function (a, k) { return a + ((r.uptimePct || {})[k] || 0); }, 0);
      // early refreshes: re-applied while the previous application still had time left (Conflagrate ends Immolate early)
      var early = 0, clipped = 0, marks = '', segs = '', ticks = '', applied = 0;
      L.parts.forEach(function (p) {
        var prevEnd = -1, events = p.applies.map(function (t) { return { t: t, a: 1 }; }).concat(p.consumes.map(function (t) { return { t: t, c: 1 }; }))
          .sort(function (a, b) { return a.t - b.t; });
        events.forEach(function (e) {
          if (e.c) { prevEnd = e.t; return; }
          var left = prevEnd - e.t, isEarly = left > 0.05;
          if (isEarly) { early++; clipped += left; }
          applied++;
          marks += '<i class="dapp' + (isEarly ? ' early' : '') + '" style="left:' + pos(e.t) + '" title="' + esc(clock(e.t) + ' ' + (p.k ? spellName(p.k) : L.label) + ' applied' + (isEarly ? ' — early refresh, ' + left.toFixed(1) + ' s were left' : '')) + '"></i>';
          prevEnd = e.t + p.dur;
        });
        segs += p.iv.map(function (x) {
          return '<b style="left:' + pos(x[0]) + ';width:' + ((100 * (Math.min(D, x[1]) - x[0]) / D).toFixed(3)) + '%;background:' + p.color + '" title="' + esc((p.k ? spellName(p.k) : L.label) + ' up ' + clock(x[0]) + ' – ' + clock(x[1])) + '"></b>';
        }).join('');
        ticks += p.ticks.map(function (e) { return '<s class="' + (e.crit ? 'crit' : '') + '" style="left:' + pos(e.t) + '" title="' + esc(clock(e.t) + ' ' + (p.k ? spellName(p.k) + ' ' : '') + 'tick ' + fmt(e.dmg) + (e.crit ? ' crit' : '')) + '"></s>'; }).join('');
      });
      var gaps = '', first = iv.length ? iv[0][0] : D, prev = first;
      iv.forEach(function (x) {
        if (x[0] > prev + 0.05) gaps += '<u style="left:' + pos(prev) + ';width:' + ((100 * (x[0] - prev) / D).toFixed(3)) + '%" title="' + esc('down ' + clock(prev) + ' – ' + clock(x[0]) + ' (' + (x[0] - prev).toFixed(1) + ' s)') + '"></u>';
        prev = Math.max(prev, x[1]);
      });
      if (prev < D - 0.05) gaps += '<u class="endgap" style="left:' + pos(prev) + ';width:' + ((100 * (D - prev) / D).toFixed(3)) + '%" title="' + esc('down for the last ' + (D - prev).toFixed(1) + ' s (near the end a DoT is only re-applied while it still pays off, see "DoTs at the end of the fight")') + '"></u>';
      return '<div class="dlabel">' + icon(L.icon, L.label) + ' ' + esc(L.label) + '</div>' +
        '<div class="dtrack">' + segs + gaps + ticks + marks + '<em style="left:' + pos(exT) + '"></em></div>' +
        '<span class="n" title="Uptime in fight #1 (from the first second of the fight)">' + fmt(100 * up / D, 1) + '%</span>' +
        '<span class="n meta" title="Average uptime over all ' + fmt(r.iterations) + ' fights">' + fmt(avg, 1) + '%</span>' +
        '<span class="n meta">' + applied + '×</span>' +
        '<span class="n' + (early ? '' : ' meta') + '" title="Re-applied while it still had time left: the rest of the old one is lost">' + (early ? early + ' (' + clipped.toFixed(1) + ' s)' : '–') + '</span>';
    }).join('');
    return '<div class="wide"><h2>DoTs on the target · fight #1 (' + fmt(D, 1) + ' s)</h2><div class="dotchart">' +
      '<div class="dhead"></div><div class="daxis">' + axis + '</div><span class="dh">fight #1</span><span class="dh">all fights</span><span class="dh">applied</span><span class="dh">early refresh</span>' +
      rows + '</div><p class="meta">Coloured = DoT up; red = down after it was first applied (faint red at the end: not re-applied because it no longer paid off ' +
      'before the boss dies); ▲ = applied (orange ▲ = early refresh); tick marks under the bar (tall = crit); dashed line = execute phase (below ' + exPct + '%).</p></div>';
  }

  // ---------- round 44: edit a copy / compare two builds ----------
  function editFromResults(key) {
    var src = WL.BUILDS.filter(function (b) { return b.key === key; })[0]; if (!src) return;
    edStart(src); $('editor').open = true;
    edMsg(src.custom ? 'Editing "' + src.short + '" — press "Update on the sheet" when done.' : 'Loaded a copy of "' + src.short + '" — change it and press "Add to the sheet".');
    $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function compareFrom(rid) {
    renderCompareOptions();
    $('cmpA').value = rid;
    if ($('cmpB').value === rid) {                      // pick the best other build as B
      var other = rowsForView().filter(function (x) { return id(x) !== rid && x.build.key !== rid.split('|')[0]; })[0];
      if (other) $('cmpB').value = id(other);
    }
    $('compare').open = true; renderCompare();
    $('compare').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderCompareOptions() {
    var a = $('cmpA').value, b = $('cmpB').value;
    var rows = results.filter(function (r) { return !isBase(r); }).sort(function (x, y) { return y.dps - x.dps; });
    var opts = rows.map(function (r) { return '<option value="' + esc(id(r)) + '">' + split(r.build) + ' ' + esc(r.build.short) + ' · ' + esc(WL.RACES[r.race].name) + ' · ' + fmt(r.dps, 1) + '</option>'; }).join('');
    $('cmpA').innerHTML = opts; $('cmpB').innerHTML = opts;
    var has = function (v) { return rows.some(function (r) { return id(r) === v; }); };
    var tops = rowsForView();
    $('cmpA').value = has(a) ? a : (tops[0] ? id(tops[0]) : '');
    $('cmpB').value = has(b) ? b : (tops[1] ? id(tops[1]) : $('cmpA').value);
    if ($('compare').open) renderCompare();
  }
  function rowById(v) { return results.filter(function (r) { return id(r) === v; })[0]; }
  function renderCompare() {
    var A = rowById($('cmpA').value), B = rowById($('cmpB').value), out = $('cmpOut');
    if (!A || !B) { out.innerHTML = '<p class="meta">Run the sim first, then pick two builds.</p>'; return; }
    var dd = function (a, b, d) { var x = (b / a - 1) * 100; return '<span style="color:var(' + (Math.abs(x) < 0.005 ? '--muted' : x > 0 ? '--good' : '--bad') + ')">' + (x > 0 ? '+' : '') + x.toFixed(d == null ? 2 : d) + '%</span>'; };
    var nm = function (r) { return '<span class="split">' + split(r.build) + '</span>' + esc(r.build.short) + ' <span class="meta">' + esc(WL.RACES[r.race].name) + '</span>'; };
    var h = '<div class="cmpgrid">';
    // headline
    h += '<div class="cmphead"><div><h2>A</h2><div class="bname">' + nm(A) + '</div><div class="dps"><b>' + fmt(A.dps, 1) + '</b> <span class="meta">±' + fmt(A.dpsErr, 1) + '</span></div></div>' +
      '<div><h2>B</h2><div class="bname">' + nm(B) + '</div><div class="dps"><b>' + fmt(B.dps, 1) + '</b> <span class="meta">±' + fmt(B.dpsErr, 1) + '</span> ' + dd(A.dps, B.dps) + '</div></div></div>';
    // key numbers
    var row = function (label, a, b, d, noPct) { return '<tr><td>' + esc(label) + '</td><td class="n">' + a + '</td><td class="n">' + b + '</td><td class="n">' + (noPct ? '' : d) + '</td></tr>'; };
    var wA = weights[A.build.key], wB = weights[B.build.key];
    h += '<div><h2>Numbers</h2><div class="scroll"><table class="cmpt"><thead><tr><th></th><th class="n">A</th><th class="n">B</th><th class="n">B vs A</th></tr></thead><tbody>' +
      row('DPS', fmt(A.dps, 1), fmt(B.dps, 1), dd(A.dps, B.dps)) +
      (A.dpsPre != null ? row('DPS above ' + (A.execPct || 35) + '%', fmt(A.dpsPre, 1), fmt(B.dpsPre, 1), dd(A.dpsPre, B.dpsPre)) +
        row('DPS in execute', fmt(A.dpsExec, 1), fmt(B.dpsExec, 1), dd(A.dpsExec, B.dpsExec)) : '') +
      row('Life Taps per fight', fmt(A.lifeTaps, 1), fmt(B.lifeTaps, 1), '', true) +
      row('Pet / sacrificed', esc((PET_NAMES[A.build.pet] || '–') + ' / ' + (PET_NAMES[A.build.sacrifice] || '–')), esc((PET_NAMES[B.build.pet] || '–') + ' / ' + (PET_NAMES[B.build.sacrifice] || '–')), '', true) +
      row('Weapon', esc(WL.OILS[A.build.oil].name), esc(WL.OILS[B.build.oil].name), '', true) +
      (wA && wB ? STATS.map(function (s) {
        var ea = s.k === 'sp' ? wA.w.sp.toFixed(2) + ' DPS' : (wA.w[s.k] / wA.w.sp).toFixed(1) + ' SP', eb = s.k === 'sp' ? wB.w.sp.toFixed(2) + ' DPS' : (wB.w[s.k] / wB.w.sp).toFixed(1) + ' SP';
        return row('Weight ' + s.unit, ea, eb, '', true);
      }).join('') : '') + '</tbody></table></div></div>';
    // talents that differ
    var keys = {}; Object.keys(A.build.talents).concat(Object.keys(B.build.talents)).forEach(function (k) { keys[k] = 1; });
    var diff = WL.TALENTS.filter(function (t) { return keys[t.key] && (A.build.talents[t.key] || 0) !== (B.build.talents[t.key] || 0); });
    h += '<div><h2>Talents that differ · ' + split(A.build) + ' vs ' + split(B.build) + '</h2>' + (diff.length ? '<div class="scroll"><table class="cmpt"><thead><tr><th>Talent</th><th class="n">A</th><th class="n">B</th></tr></thead><tbody>' +
      diff.map(function (t) { var a = A.build.talents[t.key] || 0, b = B.build.talents[t.key] || 0;
        return '<tr><td>' + icon('talent_' + t.key, t.name, '', talentTip(t, Math.max(a, b))) + ' ' + esc(t.name) + ' <span class="meta">' + esc(WL.TREES[t.tree].name) + '</span></td>' +
          '<td class="n' + (a > b ? ' more' : '') + '">' + a + '/' + t.ranks + '</td><td class="n' + (b > a ? ' more' : '') + '">' + b + '/' + t.ranks + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<p class="meta">Same talents.</p>') + '</div>';
    // priority lists side by side
    var ra = shownRotation(A.build, runCfg), rb = shownRotation(B.build, runCfg);
    var lst = function (rot, other) { return '<ol class="cmprot">' + rot.map(function (a) { return '<li' + (other.indexOf(a) < 0 ? ' class="only"' : '') + '>' + icon(ACTION_ICON[a], actLabel(a)) + ' ' + esc(actLabel(a)) + '</li>'; }).join('') + '</ol>'; };
    h += '<div class="wide"><h2>Priority (highlighted = only in that build)</h2><div class="cmp2"><div><b>A</b>' + lst(ra, rb) + '</div><div><b>B</b>' + lst(rb, ra) + '</div></div></div>';
    // damage per source
    var src = {}; Object.keys(A.bySpell).concat(Object.keys(B.bySpell)).forEach(function (k) { if ((A.bySpell[k] || {}).dmg || (B.bySpell[k] || {}).dmg) src[k] = 1; });
    var dA = A.avgDuration || A.firstFight.duration, dB = B.avgDuration || B.firstFight.duration;
    var dps = function (r, k, d) { return r.bySpell[k] ? r.bySpell[k].dmg / d : 0; };
    var list = Object.keys(src).sort(function (x, y) { return (dps(B, y, dB) - dps(A, y, dA)) - (dps(B, x, dB) - dps(A, x, dA)); });
    h += '<div class="wide"><h2>DPS per source (sorted by B − A)</h2><div class="scroll"><table class="cmpt"><thead><tr><th>Source</th><th class="n">A</th><th class="n">B</th><th class="n">B − A</th></tr></thead><tbody>' +
      list.map(function (k) { var a = dps(A, k, dA), b = dps(B, k, dB), x = b - a;
        return '<tr><td><span class="sw" style="background:' + colorOf(k) + '"></span>' + esc(spellName(k)) + '</td><td class="n">' + fmt(a, 1) + '</td><td class="n">' + fmt(b, 1) + '</td>' +
          '<td class="n" style="color:var(' + (Math.abs(x) < 0.05 ? '--muted' : x > 0 ? '--good' : '--bad') + ')">' + (x > 0 ? '+' : '') + fmt(x, 1) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
    out.innerHTML = h + '</div>';
  }

  // ---------- round 44: gear sets (Stats panel) ----------
  // Built-in: the shipped default and the round-2 reference gear; your own sets are kept in this browser. A set = the
  // editable "Sheet (gear)" values incl. the sword and crit options (config.gear).
  var userGear = [];
  try { userGear = JSON.parse(localStorage.getItem('wfs.gearSets') || '[]') || []; } catch (e) { userGear = []; }
  function builtinGear() {
    var d = JSON.parse(JSON.stringify(WL.SHIPPED_GEAR || WL.DEFAULT_CONFIG.gear));
    var ref = JSON.parse(JSON.stringify(d)); ref.sp = 700; ref.hitPct = 5; ref.critPct = 20; ref.int = 200; ref.spi = 80; ref.sta = 200; ref.mp5 = 0;
    return [{ name: 'Default: ' + d.sp + ' SP / ' + d.hitPct + '% hit / ' + d.critPct + '% crit (A58)', gear: d },
            { name: 'Reference: 700 SP / 5% hit / 20% crit (round 2)', gear: ref }];
  }
  function renderGear(sel) {
    $('gearSel').innerHTML = '<optgroup label="Built-in">' + builtinGear().map(function (g, i) { return '<option value="b' + i + '">' + esc(g.name) + '</option>'; }).join('') + '</optgroup>' +
      (userGear.length ? '<optgroup label="Yours">' + userGear.map(function (g, i) { return '<option value="u' + i + '">' + esc(g.name) + '</option>'; }).join('') + '</optgroup>' : '');
    if (sel) $('gearSel').value = sel;
  }
  function gearMsg(s, bad) { $('gearMsg').textContent = s; $('gearMsg').style.color = bad ? 'var(--bad)' : ''; }
  function loadGear() {
    var v = $('gearSel').value, g = v[0] === 'b' ? builtinGear()[+v.slice(1)] : userGear[+v.slice(1)]; if (!g) return;
    readSettings();
    var race = $('t_race').value;
    Object.keys(g.gear).forEach(function (k) { cfg.gear[k] = g.gear[k]; });
    initSettings(); $('t_race').value = race; renderTotals(); markDirty();
    gearMsg('Loaded "' + g.name + '" — press Sim!');
  }
  function saveGear() {
    readSettings();
    var name = ($('gearName').value || '').trim();
    if (!name) { gearMsg('Give the gear set a name first.', true); return; }
    var i = userGear.map(function (g) { return g.name; }).indexOf(name), g = { name: name, gear: JSON.parse(JSON.stringify(cfg.gear)) };
    if (i >= 0) userGear[i] = g; else userGear.push(g);
    try { localStorage.setItem('wfs.gearSets', JSON.stringify(userGear)); } catch (e) { /* page only */ }
    renderGear('u' + (i >= 0 ? i : userGear.length - 1)); $('gearName').value = '';
    gearMsg((i >= 0 ? 'Updated' : 'Saved') + ' "' + name + '".');
  }
  function deleteGear() {
    var v = $('gearSel').value;
    if (v[0] !== 'u') { gearMsg('Built-in gear sets cannot be deleted.', true); return; }
    var g = userGear.splice(+v.slice(1), 1)[0];
    try { localStorage.setItem('wfs.gearSets', JSON.stringify(userGear)); } catch (e) { /* page only */ }
    renderGear(); gearMsg('Deleted "' + g.name + '".');
  }

  function kv(k, v) { return '<span>' + esc(k) + '</span><span class="n">' + v + '</span>'; }
  function clock(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }

  // ---------- reset buttons (two clicks — no confirm() in artifacts: the first click arms the button for 3 s) ----------
  var resetTimers = {};
  function armed(id) {                  // true on the confirming second click
    var btn = $(id);
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Click again to reset';
      resetTimers[id] = setTimeout(function () { btn.classList.remove('armed'); btn.textContent = 'Reset to defaults'; }, 3000);
      return false;
    }
    clearTimeout(resetTimers[id]); btn.classList.remove('armed'); btn.textContent = 'Reset to defaults';
    return true;
  }
  // Stats panel: gear values, race, sword, crit option, Engineering. The right-hand tabs are left alone.
  function resetStats() {
    if (!armed('resetStats')) return;
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    cfg.gear = D.gear; cfg.professions = D.professions;
    initSettings();                     // refills every input from cfg; the race list starts at its first entry
    $('t_race').value = WL.RACE_KEYS[0]; renderTotals(); markDirty();
    $('runMeta').textContent = 'Stats reset to the defaults — press Sim! to simulate.';
  }
  // Right-hand tabs (buffs & debuffs, consumables, fight & pets). The Stats panel is left alone.
  function resetSide() {
    if (!armed('resetSide')) return;
    var D = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), race = $('t_race').value;
    ['buffs', 'debuffs', 'consumables', 'fight', 'options', 'pets', 'petSpPct'].forEach(function (k) { cfg[k] = D[k]; });
    cfg.combat.bossArmor = D.combat.bossArmor; cfg.combat.targetResist = D.combat.targetResist; cfg.combat.levelResist = D.combat.levelResist;
    initSettings();                     // rebuilds the check boxes and refills every input from cfg
    $('t_race').value = race; renderTotals(); markDirty();
    $('runMeta').textContent = 'Buffs, debuffs, consumables and fight settings reset to the defaults — press Sim! to simulate.';
  }

  // ---------- W8: share settings as a code ----------
  function codeMsg(s, bad) { $('codeMsg').textContent = s; $('codeMsg').style.color = bad ? 'var(--bad)' : ''; }
  function makeCode() { readSettings(); $('codeBox').value = WL.encodeSettings(cfg); codeMsg('Code for the current settings (' + $('codeBox').value.length + ' characters).'); }
  function copyCode() {
    if (!$('codeBox').value) makeCode();
    var box = $('codeBox');
    var fallback = function () { box.focus(); box.select(); codeMsg('Selected — press Ctrl+C to copy.'); };
    try { navigator.clipboard.writeText(box.value).then(function () { codeMsg('Copied.'); }, fallback); } catch (e) { fallback(); }
  }
  function loadCode() {
    try {
      var o = WL.decodeSettings($('codeBox').value), unknown = WL.applySettings(cfg, o);
      initSettings(); markDirty();
      codeMsg('Loaded: ' + WL.describeSettings(o) + '. Press Sim! to simulate.' + (unknown.length ? ' Ignored (not in this version): ' + unknown.join(', ') + '.' : ''));
    } catch (e) { codeMsg(e.message, true); }
  }

  // ---------- W7: build editor (custom builds) ----------
  var ed = { editing: null, b: null };
  // "Add to the priority" dropdown (round 57): categories and short names.
  var ACTION_GROUPS = [
    ['Curses & DoTs', ['curseOfElements', 'bane', 'baneOfAgony', 'corruption', 'siphonLife', 'immolate']],
    ['Multi-target', ['multiDot', 'shadowBoltSpread']],
    ['Cooldowns & procs', ['shadowTrance', 'isbUpkeep', 'conflagrate', 'conflagrateSnF', 'shadowburn', 'shadowburnSnF', 'soulFire', 'searingPainBrand', 'searingPainExecute']],
    ['Pet & mana', ['lifeTapPet', 'swapToImp', 'swapToSuccubus']],
    ['Fillers (the last entry)', ['shadowBolt', 'shadowBoltR2', 'incinerate', 'searingPain', 'drainLife', 'wrack']],
  ];
  var ACTION_SHORT = {
    curseOfElements: 'Curse of the Elements', bane: 'Bane of Doom, else Bane of Agony', baneOfAgony: 'Bane of Agony only (never Doom)',
    corruption: 'Corruption', siphonLife: 'Siphon Life', immolate: 'Immolate',
    multiDot: 'Keep DoTs on the extra targets', shadowBoltSpread: 'Shadow Bolt an extra target (for its ISB)',
    shadowTrance: 'Shadow Bolt (max rank) on Shadow Trance (Nightfall)', isbUpkeep: 'Shadow Bolt (max rank) to keep ISB up', conflagrate: 'Conflagrate', shadowburn: 'Shadowburn on cooldown',
    shadowburnSnF: 'Shadowburn for Shadow and Flame', conflagrateSnF: 'Conflagrate for Shadow and Flame', soulFire: 'Soul Fire during Decimation', searingPainBrand: 'Searing Pain for Demonic Brand',
    searingPainExecute: 'Searing Pain in the execute phase', lifeTapPet: 'Life Tap to feed the pet',
    swapToImp: 'Pet swap at execute → Imp', swapToSuccubus: 'Pet swap at execute → Succubus',
    shadowBolt: 'Shadow Bolt (Rank 9)', shadowBoltR2: 'Shadow Bolt (Rank 2)', incinerate: 'Incinerate', searingPain: 'Searing Pain',
    drainLife: 'Drain Life', wrack: 'Wrack',
  };
  var PET_NAMES = { imp: 'Imp', succubus: 'Succubus', felhunter: 'Felhunter', voidwalker: 'Voidwalker' };
  function customBuilds() { return WL.BUILDS.filter(function (b) { return b.custom; }); }
  function saveCustoms() {
    try { localStorage.setItem('wfs.customBuilds', JSON.stringify(customBuilds().map(function (b) { return { key: b.key, code: WL.encodeBuild(b) }; }))); } catch (e) { /* page only */ }
  }
  function loadCustoms() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem('wfs.customBuilds') || '[]') || []; } catch (e) { list = []; }
    list.forEach(function (x) {
      try { var b = WL.decodeBuild(x.code); if (!WL.validateBuild(b).length) WL.BUILDS.push(makeCustom(b, x.key)); } catch (e) { /* skip damaged entries */ }
    });
  }
  function makeCustom(b, key) {
    return { key: key || 'custom_' + Date.now().toString(36), short: b.short || 'Custom build', name: 'Custom: ' + (b.short || 'Custom build'),
      notes: 'Your own build (build editor). Build code: ' + WL.encodeBuild(b), talents: JSON.parse(JSON.stringify(b.talents)),
      pet: b.pet || null, sacrifice: b.sacrifice || null, oil: b.oil, rotation: b.rotation.slice(), custom: true };
  }
  function edStart(src) {
    ed.b = src ? { short: src.custom ? src.short : src.short + ' (copy)', talents: JSON.parse(JSON.stringify(src.talents)), pet: src.pet || null,
      sacrifice: src.sacrifice || null, oil: src.oil, rotation: src.rotation.slice() }
      : { short: 'My build', talents: {}, pet: null, sacrifice: null, oil: 'spellstone', rotation: ['bane', 'curseOfElements', 'corruption', 'immolate', 'shadowBolt'] };
    ed.editing = src && src.custom ? src.key : null;
    $('edFrom').value = src ? src.key : '';
    renderEditor();
  }
  function edOptions() {
    $('edFrom').innerHTML = '<option value="">Empty (0 points)</option>' + WL.BUILDS.map(function (b) {
      return '<option value="' + esc(b.key) + '">' + split(b) + ' ' + esc(b.short) + (b.custom ? ' (yours)' : '') + '</option>'; }).join('');
    $('edPet').innerHTML = '<option value="">none</option>' + WL.PET_KEYS.map(function (k) { return '<option value="' + k + '">' + PET_NAMES[k] + '</option>'; }).join('');
    $('edSac').innerHTML = '<option value="">none</option><option value="imp">Imp (+15% Shadow)</option><option value="succubus">Succubus (+15% Fire)</option>';
    $('edOil').innerHTML = Object.keys(WL.OILS).map(function (k) { return '<option value="' + k + '">' + esc(WL.OILS[k].name) + '</option>'; }).join('');
    // Round 57 (user: the list got crowded): grouped by kind, short names; the full rule is the option's hover text and
    // stays in the priority list. Actions missing from the groups land in "Other", so a new action is never hidden.
    var acts = WL.editorActions(), used = {};
    var groups = ACTION_GROUPS.map(function (g) {
      var ks = g[1].filter(function (k) { return acts.indexOf(k) >= 0; }); ks.forEach(function (k) { used[k] = 1; });
      return [g[0], ks];
    }).concat([['Other', acts.filter(function (k) { return !used[k]; })]]).filter(function (g) { return g[1].length; });
    $('edAddAct').innerHTML = groups.map(function (g) {
      return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (k) {
        return '<option value="' + k + '" title="' + esc(WL.ACTIONS[k].label) + '">' + esc(ACTION_SHORT[k] || WL.ACTIONS[k].label) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  }
  function renderEditor() {
    var b = ed.b, t = b.talents, total = 0;
    $('edName').value = b.short; $('edPet').value = b.pet || ''; $('edSac').value = b.sacrifice || ''; $('edOil').value = b.oil;
    $('edTrees').innerHTML = ['affliction', 'demonology', 'destruction'].map(function (tr) {
      var pts = 0, cells = '';
      WL.TALENTS.filter(function (x) { return x.tree === tr; }).forEach(function (x) {
        var n = t[x.key] || 0; pts += n;
        cells += '<div class="tcell' + (n ? (n === x.ranks ? ' max' : ' part') : ' off') + '" data-ed="' + x.key + '" style="grid-row:' + (x.row + 1) + ';grid-column:' + (x.col + 1) + '">' +
          icon('talent_' + x.key, x.name + ' ' + n + '/' + x.ranks, '', talentTip(x, n)) + '<span class="rk">' + n + '/' + x.ranks + '</span></div>';
      });
      total += pts;
      return '<div class="tree"><div class="thead">' + icon('tree_' + tr, WL.TREES[tr].name) + ' <b>' + WL.TREES[tr].name + '</b> <span class="meta">' + pts + '</span>' +
        '<button type="button" class="treereset" data-edresettree="' + tr + '"' + (pts ? '' : ' disabled') + ' title="Remove every point in ' + WL.TREES[tr].name + '">Reset</button></div>' +
        '<div class="tgrid">' + cells + '</div></div>';
    }).join('');
    $('edPts').textContent = split(b) + ' · ' + total + ' / 51 points';
    $('edResetAll').disabled = !total;
    // Round 44: drag an entry by its row (⠿ grip) to reorder; the ↑ ↓ buttons stay for keyboard / touch.
    $('edRot').innerHTML = b.rotation.map(function (a, i) {
      var A = WL.ACTIONS[a];
      return '<li draggable="true" data-drag="' + i + '"><span class="grip" aria-hidden="true" title="Drag to reorder">⠿</span>' + icon(ACTION_ICON[a], A ? A.label : a) + '<span class="lbl">' + esc(A ? A.label : a) + '</span>' +
        '<button type="button" data-edup="' + i + '" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button>' +
        '<button type="button" data-eddown="' + i + '" aria-label="Move down"' + (i < b.rotation.length - 1 ? '' : ' disabled') + '>↓</button>' +
        '<button type="button" data-edrm="' + i + '" aria-label="Remove">✕</button></li>';
    }).join('') + '<li class="meta">' + icon('lifeTap', 'Life Tap') + ' Life Tap whenever mana is below the next spell\'s cost (automatic)</li>';
    var errs = WL.validateBuild(b);
    $('edErrs').innerHTML = errs.length ? errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') : '<li class="ok">Legal build — ready to add.</li>';
    $('edSave').disabled = !!errs.length;
    $('edSave').textContent = ed.editing ? 'Update on the sheet' : 'Add to the sheet';
    $('edList').innerHTML = customBuilds().length ? customBuilds().map(function (c) {
      return '<li><b>' + split(c) + ' ' + esc(c.short) + '</b><button type="button" data-edit="' + esc(c.key) + '">Edit</button><button type="button" data-edremove="' + esc(c.key) + '">Remove</button></li>';
    }).join('') : '<li class="meta" style="list-style:none;margin-left:-20px">None yet.</li>';
  }
  function edTalent(key, delta) {
    var t = ed.b.talents, x = WL.TALENT_BY_KEY[key], n = (t[key] || 0) + delta;
    var total = Object.keys(t).reduce(function (s, k) { return s + t[k]; }, 0);
    if (n < 0 || n > x.ranks || (delta > 0 && total >= 51)) return;
    if (n) t[key] = n; else delete t[key];
    renderEditor();
  }
  function edMsg(s, bad) { $('edMsg').textContent = s; $('edMsg').style.color = bad ? 'var(--bad)' : ''; }
  function edSave() {
    var b = ed.b; if (WL.validateBuild(b).length) return;
    if (ed.editing) {
      var i = WL.BUILDS.map(function (x) { return x.key; }).indexOf(ed.editing);
      WL.BUILDS[i] = makeCustom(b, ed.editing);
      results = results.filter(function (r) { return r.build.key !== ed.editing; });
      delete weights[ed.editing];                                        // re-measured with the edited talents (round 55)
    } else { var c = makeCustom(b); WL.BUILDS.push(c); ed.editing = c.key; }
    saveCustoms(); edOptions(); renderEditor(); render(); showStale();   // a build change does not invalidate the other rows (round 55)
    edMsg('Saved "' + b.short + '" — press Sim! to simulate it' + (sameSettings() ? ' (settings unchanged: only this build is simulated)' : '') +
      '. Custom builds are always shown, whatever the cut-off.');
  }
  function edRemove(key) {
    var i = WL.BUILDS.map(function (x) { return x.key; }).indexOf(key); if (i < 0) return;
    var b = WL.BUILDS.splice(i, 1)[0];
    results = results.filter(function (r) { return r.build.key !== key; }); delete weights[key];
    if (ed.editing === key) ed.editing = null;
    saveCustoms(); edOptions(); renderEditor(); render(); showStale(); edMsg('Removed "' + b.short + '".');
  }
  // Drag and drop in the priority list (round 44).
  var dragFrom = null;
  $('edRot').addEventListener('dragstart', function (e) {
    var li = e.target.closest && e.target.closest('li[data-drag]'); if (!li) return;
    dragFrom = +li.getAttribute('data-drag'); li.classList.add('dragging');
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (x) { /* some browsers */ }
  });
  $('edRot').addEventListener('dragover', function (e) {
    var li = e.target.closest && e.target.closest('li[data-drag]'); if (!li || dragFrom == null) return;
    e.preventDefault();
    Array.prototype.forEach.call($('edRot').querySelectorAll('.dropabove,.dropbelow'), function (x) { x.classList.remove('dropabove', 'dropbelow'); });
    var r = li.getBoundingClientRect(); li.classList.add(e.clientY < r.top + r.height / 2 ? 'dropabove' : 'dropbelow');
  });
  $('edRot').addEventListener('drop', function (e) {
    var li = e.target.closest && e.target.closest('li[data-drag]'); if (!li || dragFrom == null) return;
    e.preventDefault();
    var to = +li.getAttribute('data-drag'), r = li.getBoundingClientRect();
    if (e.clientY >= r.top + r.height / 2) to++;                  // dropped on the lower half → after that entry
    var rot = ed.b.rotation, item = rot.splice(dragFrom, 1)[0];
    if (to > dragFrom) to--;
    rot.splice(to, 0, item); dragFrom = null; renderEditor();
  });
  $('edRot').addEventListener('dragend', function () { dragFrom = null; renderEditor(); });

  // Quick sim of the build in the editor (round 44): 300 fights per race with the current settings, next to the
  // sheet's best build simulated with exactly the same fights, so the difference is like for like.
  var quickRunning = false;
  function quickSim() {
    if (quickRunning || running || batchRunning) { edMsg('Wait for the current run to finish.', true); return; }
    var errs = WL.validateBuild(ed.b);
    if (errs.length) { edMsg('Fix the checks first: ' + errs[0], true); return; }
    readSettings();
    var c = JSON.parse(JSON.stringify(cfg)), n = 300, b = makeCustom(ed.b, 'quick_preview');
    var top = rowsForView()[0], jobs = WL.RACE_KEYS.map(function (rk) { return { b: b, r: rk }; });
    if (top && top.build.key !== ed.editing) jobs.push({ b: top.build, r: top.race, ref: true });
    var out = [], i = 0; quickRunning = true; $('edQuick').disabled = true;
    $('edQuickOut').innerHTML = '<p class="meta">Simulating…</p>';
    (function step() {
      var j = jobs[i++], res = WL.simulate(j.b, j.r, c, { iterations: n, log: false });
      out.push({ job: j, dps: res.dps, err: res.dpsErr });
      $('edQuickOut').innerHTML = '<p class="meta">Simulating… ' + i + ' / ' + jobs.length + '</p>';
      if (i < jobs.length) { setTimeout(step, 0); return; }
      quickRunning = false; $('edQuick').disabled = false;
      var mine = out.filter(function (o) { return !o.job.ref; }).sort(function (a, z) { return z.dps - a.dps; }), ref = out.filter(function (o) { return o.job.ref; })[0];
      var bestM = mine[0];
      $('edQuickOut').innerHTML = '<div class="quick"><div><b>' + esc(ed.b.short) + '</b> · best race ' + esc(WL.RACES[bestM.job.r].name) + ': <b class="big">' + fmt(bestM.dps, 1) + '</b> <span class="meta">±' + fmt(bestM.err, 1) + '</span>' +
        (ref ? ' · vs ' + split(ref.job.b) + ' ' + esc(ref.job.b.short) + ' (' + esc(WL.RACES[ref.job.r].name) + ', same fights): <b style="color:var(' + (bestM.dps >= ref.dps ? '--good' : '--bad') + ')">' +
          ((bestM.dps / ref.dps - 1) * 100 >= 0 ? '+' : '') + ((bestM.dps / ref.dps - 1) * 100).toFixed(2) + '%</b>' : '') + '</div>' +
        '<div class="meta">' + mine.map(function (o) { return esc(WL.RACES[o.job.r].name) + ' ' + fmt(o.dps, 1); }).join(' · ') + ' — ' + n + ' fights per race, current settings' +
        (dirty ? ' (changed since the last Sim!)' : '') + '. Quick look only: ± is about ±' + fmt(bestM.err, 0) + ' DPS; "Add to the sheet" + Sim! for the full run.</div></div>';
    })();
  }

  $('edTrees').addEventListener('contextmenu', function (e) {
    var c = e.target.closest('[data-ed]'); if (!c) return; e.preventDefault(); edTalent(c.getAttribute('data-ed'), -1);
  });
  document.addEventListener('change', function (e) {
    if (!ed.b) return;
    if (e.target.id === 'edPet') { ed.b.pet = e.target.value || null; renderEditor(); }
    if (e.target.id === 'edSac') { ed.b.sacrifice = e.target.value || null; renderEditor(); }
    if (e.target.id === 'edOil') { ed.b.oil = e.target.value; renderEditor(); }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'edName' && ed.b) ed.b.short = e.target.value.slice(0, 40); });
  function editorClick(t, ev) {
    var c = t.closest('#edTrees [data-ed]'); if (c) { edTalent(c.getAttribute('data-ed'), ev.shiftKey ? -1 : 1); return true; }
    var b = ed.b, x;
    if ((x = t.closest('[data-edresettree]'))) {       // clear one tree
      var tr = x.getAttribute('data-edresettree');
      Object.keys(b.talents).forEach(function (k) { if (WL.TALENT_BY_KEY[k].tree === tr) delete b.talents[k]; });
      renderEditor(); edMsg(WL.TREES[tr].name + ' talents reset.'); return true;
    }
    if (t.closest('#edResetAll')) { b.talents = {}; renderEditor(); edMsg('All talents reset.'); return true; }
    if ((x = t.closest('[data-edup]'))) { var i = +x.getAttribute('data-edup'); b.rotation.splice(i - 1, 0, b.rotation.splice(i, 1)[0]); renderEditor(); return true; }
    if ((x = t.closest('[data-eddown]'))) { var j = +x.getAttribute('data-eddown'); b.rotation.splice(j + 1, 0, b.rotation.splice(j, 1)[0]); renderEditor(); return true; }
    if ((x = t.closest('[data-edrm]'))) { b.rotation.splice(+x.getAttribute('data-edrm'), 1); renderEditor(); return true; }
    if (t.closest('#edAdd')) {   // new actions go in front of the filler so they can fire
      var a = $('edAddAct').value, fi = b.rotation.map(function (k) { return WL.ACTIONS[k] && WL.ACTIONS[k].filler; }).indexOf(true);
      if (WL.ACTIONS[a].filler || fi < 0) b.rotation.push(a); else b.rotation.splice(fi, 0, a);
      renderEditor(); return true;
    }
    if (t.closest('#edLoadFrom')) { var src = WL.BUILDS.filter(function (y) { return y.key === $('edFrom').value; })[0]; edStart(src || null); edMsg(src ? 'Loaded "' + src.short + '".' : 'Empty build.'); return true; }
    if (t.closest('#edNew')) { edStart(null); edMsg('Empty build.'); return true; }
    if (t.closest('#edSave')) { edSave(); return true; }
    if (t.closest('#edQuick')) { quickSim(); return true; }
    if ((x = t.closest('[data-edit]'))) { edStart(WL.BUILDS.filter(function (y) { return y.key === x.getAttribute('data-edit'); })[0]); edMsg('Editing — press "Update on the sheet" when done.'); return true; }
    if ((x = t.closest('[data-edremove]'))) { edRemove(x.getAttribute('data-edremove')); return true; }
    if (t.closest('#edCopy')) {
      $('edCode').value = WL.encodeBuild(b);
      try { navigator.clipboard.writeText($('edCode').value).then(function () { edMsg('Build code copied.'); }, function () { $('edCode').select(); edMsg('Selected — press Ctrl+C.'); }); }
      catch (e2) { $('edCode').select(); edMsg('Selected — press Ctrl+C.'); }
      return true;
    }
    if (t.closest('#edLoadCode')) {
      try { var d = WL.decodeBuild($('edCode').value); ed.b = d; ed.editing = null; renderEditor(); edMsg('Build code loaded' + (WL.validateBuild(d).length ? ' — see the checks.' : '.')); }
      catch (e3) { edMsg(e3.message, true); }
      return true;
    }
    return false;
  }

  // ---------- W9: saved presets (built-in + yours, stored as settings codes) ----------
  var userPresets = [];
  try { userPresets = JSON.parse(localStorage.getItem('wfs.presets') || '[]') || []; } catch (e) { userPresets = []; }
  function builtinPresets() {
    var d = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    var raid = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(raid.buffs).forEach(function (k) { raid.buffs[k].on = true; });
    ['flaskSupremePower', 'greaterArcaneElixir', 'shadowPower', 'elixirOwl', 'nightfinSoup', 'majorManaPotion', 'demonicRune']
      .forEach(function (k) { if (raid.consumables[k]) raid.consumables[k].on = true; });
    // Round 60: the defaults have 7 raid buffs + Curse of Recklessness + Judgement of Wisdom on; "self-buffed" = the old
    // defaults (every raid buff off, only Sunder Armor + Faerie Fire on the boss).
    var self = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    Object.keys(self.buffs).forEach(function (k) { self.buffs[k].on = false; });
    Object.keys(self.debuffs).forEach(function (k) { self.debuffs[k].on = k === 'sunderArmor' || k === 'faerieFire'; });
    return [{ name: 'Default (7 raid buffs, Curse of Recklessness, Judgement of Wisdom)', code: WL.encodeSettings(d), builtin: true },
            { name: 'Self-buffed (no raid buffs; Sunder Armor + Faerie Fire only)', code: WL.encodeSettings(self), builtin: true },
            { name: 'Full raid buffs + caster consumables', code: WL.encodeSettings(raid), builtin: true }];
  }
  function savePresets() { try { localStorage.setItem('wfs.presets', JSON.stringify(userPresets)); } catch (e) { /* page only */ } }
  function renderPresets(sel) {
    var b = builtinPresets();
    $('presetSel').innerHTML = '<optgroup label="Built-in">' + b.map(function (p, i) { return '<option value="b' + i + '">' + esc(p.name) + '</option>'; }).join('') + '</optgroup>' +
      (userPresets.length ? '<optgroup label="Yours">' + userPresets.map(function (p, i) { return '<option value="u' + i + '">' + esc(p.name) + '</option>'; }).join('') + '</optgroup>' : '');
    if (sel) $('presetSel').value = sel;
  }
  function presetMsg(s, bad) { $('presetMsg').textContent = s; $('presetMsg').style.color = bad ? 'var(--bad)' : ''; }
  function selectedPreset() { var v = $('presetSel').value; return v[0] === 'b' ? builtinPresets()[+v.slice(1)] : userPresets[+v.slice(1)]; }
  function loadPreset() {
    var p = selectedPreset(); if (!p) return;
    var race = $('t_race').value;
    try { var o = WL.decodeSettings(p.code); WL.applySettings(cfg, o); initSettings(); $('t_race').value = race; renderTotals(); markDirty();
      presetMsg('Loaded "' + p.name + '": ' + WL.describeSettings(o) + '. Press Sim!'); } catch (e) { presetMsg(e.message, true); }
  }
  function savePreset() {
    readSettings();
    var name = ($('presetName').value || '').trim();
    if (!name) { presetMsg('Give the preset a name first.', true); return; }
    var i = userPresets.map(function (p) { return p.name; }).indexOf(name), p = { name: name, code: WL.encodeSettings(cfg) };
    if (i >= 0) userPresets[i] = p; else userPresets.push(p);
    savePresets(); renderPresets('u' + (i >= 0 ? i : userPresets.length - 1)); $('presetName').value = '';
    presetMsg((i >= 0 ? 'Updated' : 'Saved') + ' "' + name + '".');
  }
  function deletePreset() {
    var v = $('presetSel').value;
    if (v[0] !== 'u') { presetMsg('Built-in presets cannot be deleted.', true); return; }
    var p = userPresets.splice(+v.slice(1), 1)[0]; savePresets(); renderPresets(); presetMsg('Deleted "' + p.name + '".');
  }

  // ---------- W13: batch compare (+ round 44: "Add this run to compare" replaces "Pin as reference") ----------
  // A setup is { name, code } (simulated by "Sim batch") or, added from a finished run, { name, code, when, res } where
  // res = { buildKey: { dps, err, race } } is that run's best race per build — a frozen snapshot that is never re-simulated.
  var setups = [], batchRunning = false, lastBatch = null;
  try { setups = JSON.parse(localStorage.getItem('wfs.batchSetups') || '[]') || []; } catch (e) { setups = []; }
  try { localStorage.removeItem('wfs.pinned'); } catch (e) { /* the old pinned run (no settings code) cannot become a setup */ }
  function saveSetups() { try { localStorage.setItem('wfs.batchSetups', JSON.stringify(setups)); } catch (e) { /* storage unavailable: list lives in this page only */ } }
  function renderSetups() {
    $('batchList').innerHTML = setups.length ? setups.map(function (s, i) {
      var d = ''; try { d = WL.describeSettings(WL.decodeSettings(s.code)); } catch (e) { d = 'damaged code'; }
      return '<li><b>' + esc(s.name) + '</b>' + (s.res ? ' <span class="ctag snap" title="Results saved from a run — not simulated again">run · ' + esc(s.when || '') + '</span>' : '') +
        '<button type="button" data-bload="' + i + '" title="Load into the settings">Load</button>' +
        '<button type="button" data-brm="' + i + '" aria-label="Remove ' + esc(s.name) + '">Remove</button><span class="meta">' + esc(d) + '</span></li>';
    }).join('') : '<li class="meta" style="list-style:none;margin-left:-20px">No setups yet — "Add current settings", or "Add this run to compare" in the bar above the results. Add at least two.</li>';
  }
  function addSetup() {
    readSettings();
    var name = ($('batchName').value || '').trim() || 'Setup ' + (setups.length + 1);
    setups.push({ name: name, code: WL.encodeSettings(cfg) }); saveSetups(); renderSetups();
    $('batchName').value = ''; $('batchStatus').textContent = 'Added "' + name + '".';
  }
  function bestOfRun() {
    var res = {};
    results.forEach(function (r) { if (!isBase(r) && (!res[r.build.key] || r.dps > res[r.build.key].dps)) res[r.build.key] = { dps: r.dps, err: r.dpsErr, race: r.race }; });
    return res;
  }
  function addRunToCompare() {
    if (running || !results.length) return;
    var d = new Date(), when = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var name = ($('batchName').value || '').trim() || 'Run ' + when;
    setups.push({ name: name, code: WL.encodeSettings(runCfg), when: when, res: bestOfRun() });
    saveSetups(); renderSetups(); $('batchName').value = '';
    $('tools').open = true;
    var needSim = setups.some(function (s) { return !s.res; });
    $('batchStatus').textContent = 'Added "' + name + '" (this run\'s results, frozen).' + (needSim ? ' Press "Sim batch" to simulate the other setups.' : '');
    if (!needSim) renderBatch(setups.map(function (s) { return s.res; }), setups.slice(), WL.BUILDS.slice());
    $('runMeta').textContent = 'Run saved to Batch compare as "' + name + '".';
  }
  function runBatch() {
    if (batchRunning || running) { $('batchStatus').textContent = 'Wait for the current run to finish.'; return; }
    if (!setups.length) { $('batchStatus').textContent = 'Add at least one setup first.'; return; }
    var bSetups = setups.slice(), builds = WL.BUILDS.slice();   // snapshots: edits during the batch count from the next one
    var cfgs = bSetups.map(function (s) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); WL.applySettings(c, WL.decodeSettings(s.code)); return c; });
    var best = bSetups.map(function (s) { return s.res ? JSON.parse(JSON.stringify(s.res)) : {}; });
    var jobs = [];
    cfgs.forEach(function (c, si) {
      if (bSetups[si].res) return;                                 // saved runs keep their results
      builds.forEach(function (b) { WL.RACE_KEYS.forEach(function (r) { jobs.push({ si: si, b: b, r: r }); }); });
    });
    var i = 0, t0 = performance.now();
    batchRunning = true; $('batchRun').disabled = true;
    (function step() {
      var until = performance.now() + 60;
      while (i < jobs.length && performance.now() < until) {
        var j = jobs[i++], r = WL.simulate(j.b, j.r, cfgs[j.si], { log: false });
        var cur = best[j.si][j.b.key];
        if (!cur || r.dps > cur.dps) best[j.si][j.b.key] = { dps: r.dps, err: r.dpsErr, race: j.r };
      }
      $('batchStatus').textContent = 'Batch: ' + i + ' / ' + jobs.length + ' combos…';
      if (i < jobs.length) { setTimeout(step, 0); return; }
      batchRunning = false; $('batchRun').disabled = false;
      $('batchStatus').textContent = 'Batch done: ' + jobs.length + ' combos simulated in ' + ((performance.now() - t0) / 1000).toFixed(1) +
        ' s' + (bSetups.some(function (s) { return s.res; }) ? ' (saved runs shown as they were)' : '') + '. Best race per build; Δ vs the first setup.';
      renderBatch(best, bSetups, builds);
    })();
  }
  function renderBatch(best, bSetups, builds) {
    lastBatch = { best: best, setups: bSetups, builds: builds };
    var ref = function (b) { var x = best[0][b.key]; return x ? x.dps : -1; };
    var order = builds.slice().sort(function (a, b) { return ref(b) - ref(a); });
    $('batchOut').innerHTML = '<thead><tr><th>Build</th>' + bSetups.map(function (s) { return '<th class="n">' + esc(s.name) + (s.res ? '<span class="sub">saved run</span>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      order.map(function (b) {
        return '<tr><td class="bname"><span class="split">' + split(b) + '</span>' + esc(b.short) + (b.custom ? '<span class="ctag">yours</span>' : '') + '</td>' + bSetups.map(function (s, si) {
          var x = best[si][b.key], x0 = best[0][b.key];
          if (!x) return '<td class="n meta" title="Not in this saved run (the build was added later)">–</td>';
          var d = si && x0 ? (x.dps / x0.dps - 1) * 100 : null;
          return '<td class="n"><b>' + fmt(x.dps, 1) + '</b> <span class="meta">±' + fmt(x.err, 1) + ' ' + esc(WL.RACES[x.race].name) + '</span>' +
            (d != null ? '<br><span style="color:var(' + (d >= 0 ? '--good' : '--bad') + ')">' + (d >= 0 ? '+' : '') + d.toFixed(2) + '%</span>' : '') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#runBtn')) { if (batchRunning) return; run(); return; }
    if (t.closest('#resetSide')) { resetSide(); return; }
    if (t.closest('#resetStats')) { resetStats(); return; }
    if (t.closest('#editor') && editorClick(t, e)) return;
    if (t.closest('#presetLoad')) { loadPreset(); return; }
    if (t.closest('#presetSave')) { savePreset(); return; }
    if (t.closest('#presetDel')) { deletePreset(); return; }
    if (t.closest('#addRunBtn')) { addRunToCompare(); return; }
    if (t.closest('#staleRun')) { if (!batchRunning) run(); return; }
    if (t.closest('#gearLoad')) { loadGear(); return; }
    if (t.closest('#gearSave')) { saveGear(); return; }
    if (t.closest('#gearDel')) { deleteGear(); return; }
    if (t.closest('#cmpSwap')) { var a0 = $('cmpA').value; $('cmpA').value = $('cmpB').value; $('cmpB').value = a0; renderCompare(); return; }
    var ec = t.closest('button[data-editcopy]');
    if (ec) { editFromResults(ec.getAttribute('data-editcopy')); return; }
    var cb = t.closest('button[data-cmp]');
    if (cb) { compareFrom(cb.getAttribute('data-cmp')); return; }
    if (t.closest('#codeMake')) { makeCode(); return; }
    if (t.closest('#codeCopy')) { copyCode(); return; }
    if (t.closest('#codeLoad')) { loadCode(); return; }
    if (t.closest('#batchAdd')) { addSetup(); return; }
    if (t.closest('#batchRun')) { runBatch(); return; }
    var brm = t.closest('button[data-brm]');
    if (brm) { setups.splice(+brm.getAttribute('data-brm'), 1); saveSetups(); renderSetups(); return; }
    var bld = t.closest('button[data-bload]');
    if (bld) { $('codeBox').value = setups[+bld.getAttribute('data-bload')].code; loadCode(); return; }
    var pn = t.closest('button[data-pin]');                             // pin / unpin a build (round 66)
    if (pn) { var pk = pn.getAttribute('data-pin'); if (pins[pk]) delete pins[pk]; else pins[pk] = 1; savePins(); render(); showStale(); return; }
    var rt = t.closest('button[data-races]');
    if (rt) { var rk = rt.getAttribute('data-races'); raceOpen[rk] = !raceOpen[rk]; render(); return; }
    var lb = t.closest('button[data-log]');
    if (lb) { logMode[lb.getAttribute('data-id')] = lb.getAttribute('data-log'); render(); return; }
    var tr = t.closest('tr.row');
    if (tr) { var k = tr.getAttribute('data-id'); open[k] = !open[k]; render(); }
  });
  document.addEventListener('keydown', function (e) {
    var tr = e.target.closest && e.target.closest('tr.row');
    if (tr && e.target.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tr.click(); }
  });

  loadCustoms();                        // your saved builds join the sheet before the first run (W7)
  initSettings();
  renderSetups();
  renderPresets();
  renderGear();
  ['cmpA', 'cmpB'].forEach(function (x) { $(x).addEventListener('change', renderCompare); });
  $('compare').addEventListener('toggle', function () { if ($('compare').open) renderCompare(); });
  edOptions(); edStart(WL.BUILDS[0]);
  render();
  run();   // open in a working state with the default stats
})();
