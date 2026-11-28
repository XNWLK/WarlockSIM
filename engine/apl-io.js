// Round 278 (user: "create an import/export APL button in our build creator and in the talents & rotation tab of the builds
// that creates a code to import/export the rotation so that it can be used with [another Forever sim]. you'll have to find out
// how their format works."): a build's rotation as the APL text of another Forever sim, and back. [A134]
//
// Their rotation is an APL list (protobuf JSON: { type, prepullActions, priorityList: [{ hide, notes, action }], groups,
// valueVariables }). Its rotation text starts "siml 1" / "spec warlock" / "priority:", one row per line, and any row can be its
// raw JSON in backticks — the export writes every row that way, so it needs no name tables on their side. The same list as
// JSON ({"player":{"rotation":{"type":"TypeAPL",…}}}) loads through their JSON import and replaces only the rotation.
//
//   WL.aplExport(build, cfg)    → { text, json, warnings, notes, rotation }   (cfg optional: book ranks, Targets ≥ 2, Precast)
//   WL.aplImport(text, cfg)     → { lines, warnings, notes, error }   lines: { spell, when } (a rule) or
//                                 { act, params, extra } (one of this sim's actions, restored from its marker, see below)
//   WL.aplToBuild(lines, base)  → { build, warnings, errors }   a copy of `base` with the imported rotation
//   WL.aplEntry(b, r, others)   → { key, simple }   an APL line → a priority entry (the build editor uses it too)
//
// Markers: every row made from one of this sim's actions carries the action in its notes, "<label> [key:params+n #hash]", the
// hash over the row's JSON. A row that comes back unchanged is that action again (with its numbers and its own extra
// condition: the last n parts of the row's condition), so a round trip loses nothing even where the other sim has no
// equivalent; a row edited there is read from its APL like any other.
// Not part of the simulation: not in engine/worker.js or tools/load-wl.js (no result changes).
window.WL = window.WL || {};
(function () {
  // ---------- tables ----------
  var OPS = { '<': 'OpLt', '<=': 'OpLe', '>': 'OpGt', '>=': 'OpGe', '=': 'OpEq' };
  var OPS_BACK = { OpLt: '<', OpLe: '<=', OpGt: '>', OpGe: '>=', OpEq: '=', OpNe: '!=' };
  var FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '=': '=', '!=': '!=' };
  var INV = { '<': '>=', '<=': '>', '>': '<=', '>=': '<' };
  // buffs / debuffs of the conditions (WL.RULE_AURAS) → aura ids there; spPotion: no aura id is known (left out)
  var SELF_AURAS = { shadowTrance: 17941, decimation: 440873, snfFire: 426311, snfShadow: 1293816, bloodFury: 20572, berserking: 20554, eureka: 1259821, powerInfusion: [10060, -1] };
  var TARGET_AURAS = { isb: 17794, coe: 1311680, brand: 1293696 };
  // talents → their talent spell ids (the other sim's warlock talent table; talentRank reads the points)
  var TALENT_IDS = { improvedLifeTap: 18182, suppression: 18174, improvedCorruption: 17810, grimReach: 18218, soulHarvesting: 437032, improvedDrains: 403511,
    improvedBaneOfAgony: 18827, felConcentration: 17783, amplifyCurse: 18288, pandemic: 427712, malevolence: 1310949, nightfall: 18094, curseOfExhaustion: 18223,
    siphonLife: 18265, soulSiphon: 17804, shadowMastery: 18271, wrack: 1316697, improvedHealthFunnel: 18703, improvedImp: 18694, demonicEmbrace: 18697,
    unholyPower: 18769, demonicAegis: 1235316, improvedVoidwalker: 18705, felVitality: 18731, demonicEnergies: 1225214, improvedSayaad: 18754,
    demonicSacrifice: 18788, masterSummoner: 18709, decimation: 440870, felDomination: 18708, demonicBrand: 1293695, improvedFelhunter: 1225217,
    soulLink: 19028, demonicKnowledge: 412732, masterDemonologist: 23785, demonicPact: 425464, destructiveReach: 17917, improvedShadowBolt: 17793,
    bane: 17788, moltenSkin: 1225220, cataclysm: 17778, aftermath: 18119, ruin: 17959, shadowburn: 17877, intensity: 18135, agonizingFlames: 17927,
    conflagrate: 1293817, pyroclasm: 18073, baneOfHavoc: 1225228, fireAndBrimstone: 412751, shadowAndFlame: 426316, incinerate: 412758 };
  // The other sim's warlock names (name=spellId[:tag]) for its rotation text: spells, your own buffs, buffs / debuffs on the target.
  var NAME_TEXT = {
    spell: 'aftermath=18119 agonizing_flames=17927 amplify_curse=18288 bane=17788 bane_of_agony=11713 bane_of_doom=603 bane_of_havoc=1225228 bane_of_havoc_tag1=1225228:1 berserking=20554 blood_fury=20572 cataclysm=17778 conflagrate=18932 conflagrate_1293817=1293817 corruption=11672 corruption_rank7=25311 curse_of_exhaustion=18223 curse_of_recklessness=11717 curse_of_the_elements=1311680 curse_of_weakness=11708 death_coil=17926 decimation=440870 demonic_aegis=1235316 demonic_brand=1293695 demonic_embrace=18697 demonic_energies=1225214 demonic_knowledge=412732 demonic_pact=425464 demonic_sacrifice=18788 destructive_reach=17917 drain_life_rank6=11700 drain_soul=11675 eureka=1259821 fel_concentration=17783 fel_domination=18708 fel_vitality=18731 fire_and_brimstone=412751 grim_reach=18218 hellfire=11684 hellfire_effect=11682 immolate=11668 immolate_rank8=25309 improved_bane_of_agony=18827 improved_corruption=17810 improved_drains=403511 improved_felhunter=1225217 improved_health_funnel=18703 improved_imp=18694 improved_life_tap=18182 improved_sayaad=18754 improved_shadow_bolt=17793 improved_voidwalker=18705 incinerate=1293813 incinerate_412758=412758 innervate=29166:-1 intensity=18135 judgement_of_light=20343 life_tap=11689 malevolence=1310949 mana_tide=1325257:-1 master_demonologist=23785 master_summoner=18709 molten_skin=1225220 nightfall=18094 pandemic=427712 power_infusion=10060:-1 pyroclasm=18073 rain_of_fire=11678 rain_of_fire_1282385=1282385 rain_of_fire_tag1=11678:1 retribution_aura=10301:1 ruin=17959 searing_pain=17923 shadow_and_flame=426316 shadow_bolt_rank10=25307 shadow_bolt_rank2=695 shadow_bolt_rank9=11661 shadow_mastery=18271 shadowburn=18871 shadowburn_17877=17877 shatter_curse=1299026 shoot=5019 shoot_tag1=5019:1 siphon_life=18881 siphon_life_18265=18265 soul_fire=17924 soul_harvest=437032 soul_link=19028 soul_siphon=17804 summon_felhunter=691 summon_imp=688 summon_succubus=712 summon_voidwalker=697 suppression=18174 thorns=9910:1 touch_of_the_grave=1260198 unholy_power=18769 windfury_totem=10610 wrack=1316697',
    aura: 'admirals_hat=12022:-1 amplify_curse=18288 ancestors_vengeance=16939:-1 arcane_brilliance=23028:-1 arcane_intellect=10157:-1 aspect_of_the_wild=20190:-1 battle_shout=11551:-1 battle_shout_25289=25289:-1 berserking=20554 blood_fury=20572 blood_pact=11767:-1 blood_pact_tag0=11767 burning_shadow=18789 concentration_aura=19746:-1 dark_inspiration=1326168:-1 decimation=440873 demon_armor=11735 demonic_knowledge=412732 devotion_aura=10293:-1 eureka=1259821 fel_domination=18708 fel_energy=18792 fel_stamina=18790 fire_resistance=10535:-1 fire_resistance_aura=19900:-1 flame=426311 frost_resistance=10477:-1 frost_resistance_aura=19898:-1 furious_howl=24597:-1 gift_of_the_wild=21850:-1 grace_of_air=10626:-1 grace_of_air_25360=25360:-1 greater_blessing_of_kings=25898:-1 greater_blessing_of_light=25890:-1 greater_blessing_of_might=25782:-1 greater_blessing_of_might_25916=25916:-1 greater_blessing_of_wisdom=25894:-1 greater_blessing_of_wisdom_25918=25918:-1 headmasters_charge=18264:-1 hellfire=11684 innervate=29166:-1 leader_of_the_pack=24932:-1 mana_spring=10494:-1 mana_tide=1325257:-1 mark_of_the_wild=9885:-1 mass_salvation=25895:-1 master_demonologist=23785:1 master_demonologist_tag2=23785:2 master_demonologist_tag3=23785:3 master_demonologist_tag4=23785:4 moonkin_aura=24907:-1 nature_resistance=10599:-1 power_infusion=10060:-1 power_of_the_guardian=28142:-1 power_of_the_guardian_28143=28143:-1 power_of_the_guardian_28144=28144:-1 power_of_the_guardian_28145=28145:-1 power_word_fortitude=10938:-1 prayer_of_fortitude=21564:-1 prayer_of_shadow_protection=27683:-1 prayer_of_spirit=27681:-1 rain_of_fire=11678 retribution_aura=10301:-1 shadow=1293816 shadow_protection_external=10958:-1 shadow_resistance_aura=19896:-1 shadow_trance=17941 shatter_curse=1299026 soul_harvest=1242853 soul_link=19028 spell_1260201=1260201 stoneskin=10405:-1 strength_of_earth=10441:-1 strength_of_earth_25362=25362:-1 thorns=9910:-1 touch_of_fire=18791 trueshot_aura=20906:-1 windfury_totem=10610:-1 windfury_totem_10612=10612:-1 windfury_totem_10614=10614:-1',
    target_aura: 'armor_shatter=16928:-1 bane_of_agony=11713 bane_of_doom=603 bane_of_havoc=1225228 corruption=11672 corruption_25311=25311 curse_of_recklessness=11717 curse_of_recklessness_external=11717:-1 curse_of_the_elements=1311680 curse_of_the_elements_external=1311680:-1 curse_of_weakness=11708 curse_of_weakness_external=11708:-1 curse_of_weakness_tag1=11708:1 demonic_brand=1293696 demoralizing_roar=9898:-1 demoralizing_screech=24579:-1 demoralizing_shout=11556:-1 drain_life_11700=11700 drain_soul=11675 dust_cloud=1265904:-1 expose_armor=11198:-1 faerie_fire=9907:-1 gift_of_arthas=11374:-1 hex_of_weakness=19285:-1 hunters_mark=14325:-1 immolate=11668 immolate_25309=25309 insect_swarm=24977:-1 judgement_of_light=20346:-1 judgement_of_the_crusader=20303 judgement_of_wisdom=20355:-1 puncture_armor_external=17315:-1 scorpid_sting=3043:-1 shadow_vulnerability=17794 shoot=5019 siphon_life=18881 sunder_armor=11597:-1 thunder_clap=11581:-1 thunderfury=21992:-1 thunderfury_27648_external=27648:-1 vindication=440667:-1 wrack=1316697',
  };
  var NAMES = null, NAME_OF = null;            // name → [id, tag] per namespace; "id:tag" → a name
  function names() {
    if (NAMES) return NAMES;
    NAMES = {}; NAME_OF = {};
    Object.keys(NAME_TEXT).forEach(function (ns) {
      var o = NAMES[ns] = {};
      NAME_TEXT[ns].split(' ').forEach(function (e) {
        var m = /^([a-z0-9_]+)=(\d+)(?::(-?\d+))?$/.exec(e); if (!m) return;
        o[m[1]] = [+m[2], m[3] ? +m[3] : 0];
        var k = m[2] + ':' + (m[3] || 0); if (!NAME_OF[k]) NAME_OF[k] = m[1];
      });
    });
    return NAMES;
  }
  var ID_KEY = null;                           // spell id → this sim's spell key (trainer and book ranks)
  function idKey() {
    if (ID_KEY) return ID_KEY;
    ID_KEY = {};
    Object.keys(WL.SPELLS).forEach(function (k) { ID_KEY[WL.SPELLS[k].id] = k; });
    Object.keys(WL.BOOK_RANKS || {}).forEach(function (k) { if (WL.BOOK_RANKS[k].id) ID_KEY[WL.BOOK_RANKS[k].id] = k; });
    ID_KEY[695] = 'shadowBolt';                // Shadow Bolt rank 2 (removed here, round 81): read as the max rank
    return ID_KEY;
  }
  function idName(a) { names(); if (!a) return '?'; if (a.itemName) return 'item.' + a.itemName; if (a.itemId) return 'item ' + a.itemId; if (a.unknownName) return a.unknownName; if (a.otherId) return String(a.otherId); return NAME_OF[(a.spellId || 0) + ':' + (a.tag || 0)] || 'spell ' + a.spellId; }

  // ---------- small JSON helpers ----------
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function C(val) { return { const: { val: String(val) } }; }
  function fmtN(x) { var r = Math.round(x * 1e6) / 1e6; return String(r); }
  function secs(x) { return C(fmtN(x) + 's'); }
  function pctC(x) { return C(fmtN(x) + '%'); }
  function cmpV(op, l, r) { return { cmp: { op: OPS[op], lhs: l, rhs: r } }; }
  function NOT(v) { return v.not ? v.not.val : { not: { val: v } }; }
  function AND(vals) { return vals.length === 1 ? vals[0] : { and: { vals: vals } }; }
  function OR(vals) { return vals.length === 1 ? vals[0] : { or: { vals: vals } }; }
  var TGT = { type: 'CurrentTarget' };
  function aid(id) { return Array.isArray(id) ? { spellId: id[0], tag: id[1] } : { spellId: id }; }
  function canon(x) {                          // key order, ranks and UI ids do not count (for the markers' hash)
    if (Array.isArray(x)) return x.map(canon);
    if (!x || typeof x !== 'object') return x;
    var o = {};
    Object.keys(x).sort().forEach(function (k) { if (k === 'rank' || k === 'uuid' || x[k] === false || x[k] === 0 || x[k] === '') return; o[k] = canon(x[k]); });   // defaults (false, 0, "") are not written there
    return o;
  }
  function hash(x) {                           // FNV-1a over the canonical JSON → 6 characters
    var s = JSON.stringify(canon(x)), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('00000' + h.toString(36)).slice(-6);
  }
  var MARK = /\[([A-Za-z]+)(?::([-\d.,]+))?(?:\+(\d+))? #([0-9a-z]{6})\]\s*$/;

  // ======================================== export ========================================
  function sid(k, cfg) { var b = cfg && cfg.options && cfg.options.bookRanks && WL.BOOK_RANKS && WL.BOOK_RANKS[k]; return b && b.id ? b.id : WL.SPELLS[k].id; }
  var TRUE = { __true: 1 };                    // "holds there by itself" (the other sim checks it when it casts)

  function Exporter(build, cfg) {
    this.b = build; this.cfg = cfg || null; this.warnings = []; this.notes = []; this.where = '';
    this.vars = {}; this.varOrder = [];
    var rot = WL.expandGroups(build), d = [];
    rot.forEach(function (a) { var x = WL.DOT_ACTIONS[a]; if (x && d.indexOf(x) < 0) d.push(x); });
    this.dots = d;                             // the DoTs this priority keeps up (as WL.minDotLeft)
  }
  Exporter.prototype.warn = function (s) { var m = (this.where ? this.where + ': ' : '') + s; if (this.warnings.indexOf(m) < 0) this.warnings.push(m); };
  Exporter.prototype.note = function (s) { if (this.notes.indexOf(s) < 0) this.notes.push(s); };
  Exporter.prototype.id = function (k) { return aid(sid(k, this.cfg)); };
  Exporter.prototype.execPct = function () { var c = this.cfg || WL.DEFAULT_CONFIG; return c && c.fight && c.fight.executePct != null ? c.fight.executePct : 35; };
  // A number of a condition (seconds, a percentage or a plain number) → a value there, or null.
  Exporter.prototype.val = function (v, kind) {
    if (v && typeof v === 'object') {
      if (v.cast != null) {
        if (!WL.SPELLS[v.cast]) return null;
        if (kind !== 'time') { this.warn('a cast time compared with a percentage or a count has no equivalent — left out'); return null; }
        return { spellCastTime: { spellId: this.id(v.cast) } };
      }
      if (v.exec) v = this.execPct();
      else if (v.var != null) { v = WL.ruleNum(v, this.b); if (!isFinite(v)) { this.warn('a named number is missing — left out'); return null; } }
      else return null;
    }
    v = +v; if (!isFinite(v)) return null;
    return kind === 'time' ? secs(v) : kind === 'pct' ? pctC(v) : C(fmtN(v));
  };
  Exporter.prototype.leaf = function (op, lhs, v, kind) { var r = this.val(v, kind); return r ? cmpV(op, lhs, r) : null; };
  // A condition → a value there; TRUE (holds there by itself); or null (no equivalent: left out, with a warning).
  Exporter.prototype.node = function (n) {
    var self = this, x;
    if (!n) return TRUE;
    var zero = n.v === 0 || n.v === '0';
    switch (n.t) {
      case 'all': {
        var r = this.list(n.c || []);
        if (!r.vals.length) return r.lost ? null : TRUE;
        return AND(r.vals);
      }
      case 'any': {
        if (!(n.c || []).length) return C('false');
        var vals = [], lost = false, always = false;
        n.c.forEach(function (c) { var e = self.node(c); if (e === null) lost = true; else if (e === TRUE) always = true; else vals.push(e); });
        if (always) return TRUE;
        if (lost) { this.warn('one part of an "or" has no equivalent, so the whole "or" is left out'); return null; }
        return OR(vals);
      }
      case 'not': {
        x = this.node(n.c);
        if (x === null) return null;
        if (x === TRUE) { this.warn('"not" of a check the other sim makes by itself has no equivalent — left out'); return null; }
        return NOT(x);
      }
      case 'dot': {
        if (!WL.SPELLS[n.spell]) return null;
        x = { spellId: this.id(n.spell) };
        if (zero && n.op === '<=') return NOT({ dotIsActive: x });
        if (zero && n.op === '>') return { dotIsActive: x };
        return this.leaf(n.op, { dotRemainingTime: x }, n.v, 'time');
      }
      case 'aura': {
        var a = SELF_AURAS[n.aura] != null ? { auraId: aid(SELF_AURAS[n.aura]) } : TARGET_AURAS[n.aura] != null ? { sourceUnit: TGT, auraId: aid(TARGET_AURAS[n.aura]) } : null;
        if (!a) { this.warn('"' + WL.condText(n, this.b) + '": that buff has no aura id there — left out'); return null; }
        if (zero && n.op === '<=') return NOT({ auraIsActive: a });
        if (zero && n.op === '>') return { auraIsActive: a };
        return this.leaf(n.op, { auraRemainingTime: a }, n.v, 'time');
      }
      case 'cd': {
        if (!WL.SPELLS[n.spell]) return null;
        x = { spellId: this.id(n.spell) };
        if (zero && n.op === '<=') return { spellIsReady: x };
        if (zero && n.op === '>') return NOT({ spellIsReady: x });
        return this.leaf(n.op, { spellTimeToReady: x }, n.v, 'time');
      }
      case 'fight': {
        if (n.what === 'remaining') return this.leaf(n.op, { remainingTime: {} }, n.v, 'time');
        if (n.what === 'elapsed') return this.leaf(n.op, { currentTime: {} }, n.v, 'time');
        if (n.what === 'bossHp') {
          var ex = this.execPct();
          if (n.v && n.v.exec && (ex === 20 || ex === 35) && (n.op === '<' || n.op === '>=')) {
            var ie = { isExecutePhase: { threshold: 'E' + ex } };
            return n.op === '<' ? ie : NOT(ie);
          }
          return this.leaf(n.op, { currentHealthPercent: { sourceUnit: TGT } }, n.v, 'pct');
        }
        return null;
      }
      case 'mana': return this.leaf(n.op, { currentManaPercent: {} }, n.v, 'pct');
      case 'shards':
        if ((n.op === '>' && zero) || (n.op === '>=' && +n.v === 1)) { this.warn('"Soul Shards > 0": no APL value for shards there — left to the spell\'s own check (it needs a shard to be cast)'); return TRUE; }
        this.warn('"' + WL.condText(n, this.b) + '": no APL value for Soul Shards there — left out'); return null;
      case 'brand': return this.leaf(n.op, { auraNumStacks: { sourceUnit: TGT, auraId: aid(TARGET_AURAS.brand) } }, n.v, 'plain');
      case 'var': {
        var V = (this.b.vars || {})[n.name];
        if (!V || !V.cond) { this.warn('no condition named "' + n.name + '" — left out'); return null; }
        if (!this.vars.hasOwnProperty(n.name)) {
          this.vars[n.name] = 'pending';
          var w = this.where; this.where = 'Condition "' + n.name + '"';
          var e = this.node(V.cond); this.where = w;
          this.vars[n.name] = e;
          if (e !== null && e !== TRUE) this.varOrder.push(n.name);
        }
        x = this.vars[n.name];
        if (x === 'pending') { this.warn('the condition "' + n.name + '" refers to itself — left out'); return null; }
        return x === null || x === TRUE ? x : { variableRef: { name: n.name } };
      }
      case 'known': return WL.SPELLS[n.spell] ? { spellIsKnown: { spellId: this.id(n.spell) } } : null;
      case 'talent': {
        var tid = TALENT_IDS[n.talent];
        if (!tid) { this.warn('talent "' + n.talent + '" has no id there — left out'); return null; }
        return this.leaf(n.op, { talentRank: { talentId: { spellId: tid } } }, n.v, 'plain');
      }
      case 'pet': return NOT({ warlockActivePet: {} });   // summon left out = NoSummon (the enum's default, as their printer writes it)
      case 'setting': return n.key === 'coe' ? { warlockIsAssignedCurse: {} } : null;   // curseType left out = Elements (the default)
      case 'refresh': case 'paysOff': {
        var s = WL.SPELLS[n.spell]; if (!s) return null;
        var id = this.id(n.spell), pays;
        if (n.spell === 'baneOfAgony') pays = cmpV('>=', { remainingTime: {} }, secs(12));
        else pays = cmpV('>=', { remainingTime: {} }, { math: { op: 'OpAdd', lhs: { spellCastTime: { spellId: id } }, rhs: secs(2 * (s.tickEvery || 3)) } });
        this.warn('"' + WL.condText(n, this.b) + '": the end-of-fight check (does the DoT still pay off) is exported as "' +
          (n.spell === 'baneOfAgony' ? 'at least 12 s left' : 'the cast and 2 ticks still fit') + '"');
        if (n.t === 'paysOff') return pays;
        return AND([cmpV('<=', { dotRemainingTime: { spellId: id } }, { spellCastTime: { spellId: id } }), pays]);
      }
      case 'manaNeed': this.warn('"the rest of the fight needs more mana than you have" has no equivalent — left out'); return null;
      case 'freeMana': this.warn('"free mana is ready" (Innervate, Mana Tide, runes, potions) has no equivalent — left out'); return null;
      case 'fsr': this.warn('"time since you last spent mana" (the 5-second rule) has no equivalent — left out'); return null;
      case 'minDot': {
        var v = this.val(n.v, 'time'); if (!v) return null;
        var ds = this.dots;
        if (!ds.length) return n.op === '>' || n.op === '>=' ? TRUE : C('false');
        if (n.op === '=') this.warn('"shortest DoT time left = …" is exported as "a DoT has that much left"');
        if (n.op === '>' || n.op === '>=') return AND(ds.map(function (d) { var i = { spellId: self.id(d) }; return OR([NOT({ dotIsActive: i }), cmpV(n.op, { dotRemainingTime: i }, v)]); }));
        return OR(ds.map(function (d) { var i = { spellId: self.id(d) }; return AND([{ dotIsActive: i }, cmpV(n.op, { dotRemainingTime: i }, v)]); }));
      }
      case 'check': {
        if (n.act === 'deathCoilFinisher') {
          var f = fillerSpell(this.b), fs = f && WL.SPELLS[f];
          this.warn('"the filler would not land before the boss dies" is exported as "fight time left < ' + (fs ? fs.name + (fs.kind === 'channel' ? ' tick' : ' cast time') : 'one GCD') + '"');
          if (!fs) return cmpV('<', { remainingTime: {} }, secs(1.5));
          return cmpV('<', { remainingTime: {} }, fs.kind === 'channel' ? secs(fs.tickEvery) : { spellCastTime: { spellId: this.id(f) } });
        }
        if (n.act === 'searingPainDecimation') {
          this.warn('"the next Soul Fire needs Decimation" is exported as "execute phase, Decimation not up and Soul Fire ready within one Searing Pain"');
          var e1 = this.node({ t: 'fight', what: 'bossHp', op: '<', v: { exec: 1 } });
          return AND([e1, NOT({ auraIsActive: { auraId: aid(SELF_AURAS.decimation) } }), cmpV('<=', { spellTimeToReady: { spellId: this.id('soulFire') } }, { spellCastTime: { spellId: this.id('searingPain') } })]);
        }
        this.warn('"' + (WL.APL_CHECKS[n.act] || n.act) + '" has no equivalent — left out'); return null;
      }
    }
    this.warn('a condition of an unknown kind — left out'); return null;
  };
  // Parts of an "and": { vals, lost: a part had no equivalent }
  Exporter.prototype.list = function (conj) {
    var self = this, vals = [], lost = false;
    conj.forEach(function (c) { var e = self.node(c); if (e === null) lost = true; else if (e !== TRUE) { if (e.and) vals.push.apply(vals, e.and.vals); else vals.push(e); } });
    return { vals: vals, lost: lost };
  };
  // The spell the priority casts as its filler (the first entry that is one).
  function fillerSpell(b) {
    var rot = WL.expandGroups(b);
    for (var i = 0; i < rot.length; i++) {
      var A = WL.actionOf(rot[i], b); if (!A || !(A.filler || A.preFiller)) continue;
      if (A.rule) return A.rule.spell;
      var L = WL.aplLines(rot[i], b); if (L && L[0] && L[0].spell) return L[0].spell;
    }
    return null;
  }
  // One row: cast `spell` when the parts hold. tpl / extra: lists of condition parts (extra = the action's own extra
  // condition, build.actWhen). → { item, k } or null (left out).
  Exporter.prototype.row = function (spell, tpl, extra, notes) {
    var a = this.list(tpl), e = this.list(extra || []), vals = a.vals.concat(e.vals);
    if (!vals.length && (a.lost || e.lost)) { this.warn('left out: nothing of its condition has an equivalent there, so it would be cast at any time'); return null; }
    var act = {};
    if (vals.length) act.condition = AND(vals);
    act.castSpell = { spellId: this.id(spell) };
    var item = { action: act };
    if (notes) item.notes = notes;
    if (WL.SPELLS[spell] && WL.SPELLS[spell].kind === 'channel') this.note(WL.SPELLS[spell].name + ' is cast in full there; here a higher-priority action that becomes ready clips the channel.');
    return { item: item, k: e.vals.length };
  };
  function conjOf(w) { return !w ? [] : w.t === 'all' ? (w.c || []).slice() : [w]; }
  function tagged(item, key, params, k) {
    var p = params ? ':' + params.join(',') : '';
    item.notes = (item.notes || '') + ' [' + key + p + (k ? '+' + k : '') + ' #' + hash(item.action) + ']';
    return item;
  }

  WL.aplExport = function (build, cfg) {
    var X = new Exporter(build, cfg), items = [], prepull = [], b = build, rot = WL.expandGroups(b), self = X;
    var plain = Object.assign({}, b); delete plain.actWhen;
    var auto = function (item, label) { item.notes = label; return tagged(item, 'auto'); };
    // Bane of Havoc on the second target (automatic here with 2+ targets and the talent)
    if (cfg && cfg.fight && (cfg.fight.targets || 1) >= 2 && b.talents && b.talents.baneOfHavoc) {
      var t2 = { type: 'Target', index: 1 };
      items.push(auto({ action: { condition: NOT({ auraIsActive: { sourceUnit: t2, auraId: aid(WL.SPELLS.baneOfHavoc.id) } }), castSpell: { spellId: aid(WL.SPELLS.baneOfHavoc.id), target: t2 } } },
        'Bane of Havoc on the second target (automatic here with 2+ targets)'));
      X.note('Added: Bane of Havoc on target 2 (this sim casts it by itself with 2 or more targets).');
    }
    // Cooldowns: racials, potions, Power Infusion and on-use trinkets are settings here, used by themselves
    if (rot.indexOf('activateTrinket') < 0) {
      items.push(auto({ action: { autocastOtherCooldowns: {} } }, 'Cooldowns, racials, potions and on-use trinkets (settings in this sim, used by themselves)'));
      X.note('Added "autocast other cooldowns" at the top: racials, potions and on-use trinkets are settings in this sim, used by themselves.');
    }
    // An action's own extra condition (build.actWhen) with a part that has no equivalent there: kept whole in a hidden row
    // after the action's rows, so that it comes back on import.
    var extraRow = function (key, label, aw) {
      if (!aw.length) return;
      var w = X.where, lost; X.where = ''; var W0 = X.warnings.length; lost = X.list(aw).lost; X.warnings.length = W0; X.where = w;
      if (!lost) return;
      var cw = b.actWhen[key];
      items.push({ hide: true, action: {}, notes: 'This sim\'s extra condition of "' + label + '" (kept for the way back): ' + JSON.stringify(cw) + ' [when #' + hash(cw) + ']' });
    };
    var filled = false;
    rot.forEach(function (key, idx) {
      if (filled) return;
      var A = WL.actionOf(key, b), m = /^rule:(\d+)$/.exec(key);
      X.where = 'Priority ' + (idx + 1) + ' (' + (A ? WL.actionLabel(b, key).replace(/_/g, '…') : key) + ')';
      if (m) {
        var r = (b.rules || [])[+m[1]]; if (!r) return;
        var o = X.row(r.spell, conjOf(r.when), [], WL.ruleText(r, b));
        if (o) items.push(o.item);
        if (A && A.filler) filled = true;
        return;
      }
      if (!WL.ACTIONS[key]) return;
      var L = WL.aplLines(key, plain) || [], aw = conjOf(b.actWhen && b.actWhen[key]);
      var P = WL.ACTIONS[key].params, pv = P ? WL.actionParams(b, key) : null, pl = P ? P.map(function (p) { return pv[p.key]; }) : null;
      var label = WL.actionLabel(b, key);
      if (L[0] && L[0].special) {
        if (key === 'activateTrinket') {
          var ex = X.list(aw), act = {};
          if (ex.vals.length) act.condition = AND(ex.vals);
          act.autocastOtherCooldowns = {};
          items.push(tagged({ action: act, notes: label }, key, pl, ex.vals.length));
          X.warn('exported as "autocast other cooldowns": there it also pops racials and potions at this place (here those are settings)');
          return;
        }
        items.push(tagged({ hide: true, action: {}, notes: label + ' (this sim\'s own action, no equivalent there: kept as a hidden row)' }, key, pl, 0));
        X.warn('no equivalent there (' + (key === 'multiDot' ? 'multi-target DoTs are a Fight setting here' : key === 'shadowBoltSpread' ? 'it picks its own target' : 'a mid-fight pet swap') + ') — kept as a hidden row');
        extraRow(key, label, aw);
        return;
      }
      var n0 = items.length;
      L.forEach(function (l) {
        var o = X.row(l.spell, conjOf(l.when), aw, label);
        if (o) items.push(tagged(o.item, key, pl, o.k));
      });
      if (items.length === n0) items.push(tagged({ hide: true, action: {}, notes: label + ' (no equivalent there: kept as a hidden row)' }, key, pl, 0));
      extraRow(key, label, aw);
      if (A && A.filler) filled = true;
    });
    X.where = '';
    // The automatic Life Tap (mana below the next spell's cost): a Life Tap row under the filler there
    items.push(auto({ action: { castSpell: { spellId: aid(WL.SPELLS.lifeTap.id) } } }, 'Life Tap when nothing above can be cast (this sim does that by itself)'));
    X.note('Added Life Tap under the filler: this sim taps by itself when mana is short.');
    if (b.timeline && b.timeline.length) X.warn('The fight timeline (' + b.timeline.length + ' spells at fixed times) is not exported');
    // Precast (Fight & pets): a prepull row that ends as the fight starts
    if (cfg && cfg.fight && cfg.fight.precast) {
      var pk = null;
      try { pk = WL.precastOf(b, cfg, WL.buildSpellTable(b, WL.computeStats(b, 'human', cfg), cfg)); } catch (e) { pk = null; }
      if (pk) {
        var pid = X.id(pk);
        prepull.push({ action: { castSpell: { spellId: pid } }, doAtValue: { math: { op: 'OpMul', lhs: { spellCastTime: { spellId: pid } }, rhs: C('-1') } } });
        X.note('Precast ' + WL.SPELLS[pk].name + ' (Fight & pets) is a prepull row.');
      }
    }
    var vv = X.varOrder.map(function (k) { return { name: k, value: X.vars[k] }; });
    var R = { type: 'TypeAPL' };
    if (prepull.length) R.prepullActions = prepull;
    R.priorityList = items;
    if (vv.length) R.valueVariables = vv;
    var raw = function (o) { return '`' + JSON.stringify(o).replace(/`/g, '\\u0060') + '`'; };
    var t = ['siml 1', 'spec warlock', '', '// ' + String(b.name || b.short || 'Build').replace(/[\r\n]+/g, ' ') + ' — the rotation from Xn\'s Forever Warlock Sim'];
    vv.forEach(function (v) { t.push('var ${' + v.name.replace(/[}\\]/g, '') + '} = ' + raw(v.value)); });
    if (prepull.length) { t.push('', 'prepull:'); prepull.forEach(function (p) { t.push('  ' + raw(p)); }); }
    t.push('', 'priority:');
    items.forEach(function (it) { t.push('  ' + raw(it)); });
    return { text: t.join('\n') + '\n', json: JSON.stringify({ player: { rotation: R } }, null, 2), warnings: X.warnings, notes: X.notes, rotation: R };
  };

  // ======================================== import: the rotation text → APL JSON ========================================
  var UNIT_WORDS = { self: { type: 'Self' }, target: { type: 'CurrentTarget' }, previous_target: { type: 'PreviousTarget' }, next_target: { type: 'NextTarget' },
    all_targets: { type: 'AllTargets' }, all_players: { type: 'AllPlayers' }, unknown_unit: {} };
  function unitWord(w) {
    if (UNIT_WORDS[w]) return clone(UNIT_WORDS[w]);
    var m = /^(target|player|pet)(\d+)$/.exec(w); if (!m || +m[2] < 1) return null;
    var u = { type: m[1] === 'target' ? 'Target' : m[1] === 'player' ? 'Player' : 'Pet' };
    if (+m[2] > 1) u.index = +m[2] - 1;
    if (m[1] === 'pet') u.owner = { type: 'Self' };
    return u;
  }
  function camel(s) { return s.replace(/_([a-z0-9])/g, function (a, c) { return c.toUpperCase(); }); }
  function pascal(s) { var c = camel(s); return c.charAt(0).toUpperCase() + c.slice(1); }
  function identifier(n) { return String(n).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }

  function lex(src) {
    var toks = [], i = 0, n = src.length, m;
    var LIT_D = /^(?:\d+(?:\.\d+)?(?:h|ms|us|µs|ns|m|s))+(?![A-Za-z0-9_µ])/, LIT_N = /^\d+(?:\.\d+)?%?(?![A-Za-z0-9_µ])/;
    while (i < n) {
      var ch = src.charAt(i), rest;
      if (/\s/.test(ch)) { i++; continue; }
      rest = src.slice(i);
      if (ch === '`') {
        var j = src.indexOf('`', i + 1); if (j < 0) throw new Error('raw JSON without its closing backtick');
        var v; try { v = JSON.parse(src.slice(i + 1, j)); } catch (e) { throw new Error('the raw JSON in backticks is not valid JSON'); }
        toks.push({ t: 'raw', v: v }); i = j + 1; continue;
      }
      if (ch === '"') { m = /^"(?:[^"\\\n]|\\.)*"/.exec(rest); if (!m) throw new Error('a string without its closing "'); toks.push({ t: 'str', v: JSON.parse(m[0]) }); i += m[0].length; continue; }
      if ((ch === '$' || ch === '%') && (m = /^[$%](?:\{((?:[^}\\\n]|\\[}\\n])*)\}|([A-Za-z_][A-Za-z0-9_]*))/.exec(rest))) {
        var nm = m[1] != null ? m[1].replace(/\\([}\\n])/g, function (a, c) { return c === 'n' ? '\n' : c; }) : m[2];
        toks.push({ t: ch === '$' ? 'var' : 'ph', v: nm, ident: m[1] == null }); i += m[0].length; continue;
      }
      if (/[0-9]/.test(ch)) { m = LIT_D.exec(rest) || LIT_N.exec(rest); if (!m) throw new Error('"' + rest.split(/[\s,)]/)[0] + '" is not a number'); toks.push({ t: 'lit', v: m[0] }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { toks.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
      if ((m = /^(>=|<=|==|!=)/.exec(rest))) { toks.push({ t: 'p', v: m[0] }); i += 2; continue; }
      if ('<>+-*/()[],=.:#'.indexOf(ch) >= 0) { toks.push({ t: 'p', v: ch }); i++; continue; }
      throw new Error('"' + ch + '" is not allowed here' + (ch === '!' || ch === '&' || ch === '|' ? ' (write not / and / or)' : ''));
    }
    return toks;
  }
  // ---- the expression grammar (loosest first: or, and, not, comparisons, + -, * /) → an AST ----
  function Parser(toks) { this.k = toks; this.i = 0; }
  Parser.prototype.peek = function (o) { return this.k[this.i + (o || 0)]; };
  Parser.prototype.is = function (t, v, o) { var x = this.peek(o); return !!x && x.t === t && (v == null || x.v === v); };
  Parser.prototype.take = function (t, v) { var x = this.peek(); if (!x || x.t !== t || (v != null && x.v !== v)) throw new Error('expected ' + (v || t) + (x ? ' before "' + (x.v != null && typeof x.v !== 'object' ? x.v : x.t) + '"' : ' at the end')); this.i++; return x; };
  Parser.prototype.end = function () { return this.i >= this.k.length; };
  Parser.prototype.expr = function () {
    var a = [this.conj()];
    while (this.is('id', 'or')) { this.i++; a.push(this.conj()); }
    return a.length === 1 ? a[0] : { k: 'or', a: a };
  };
  Parser.prototype.conj = function () {
    var a = [this.neg()];
    while (this.is('id', 'and')) { this.i++; a.push(this.neg()); }
    return a.length === 1 ? a[0] : { k: 'and', a: a };
  };
  Parser.prototype.neg = function () {
    if (this.is('id', 'not') && !this.is('p', '(', 1)) { this.i++; return { k: 'not', a: this.neg() }; }
    if (this.is('id', 'not') && this.is('p', '(', 1)) { this.i++; return { k: 'not', a: this.operand() }; }
    return this.cmp();
  };
  Parser.prototype.cmp = function () {
    var l = this.sum(), x = this.peek();
    if (x && x.t === 'p' && /^(==|!=|>=|<=|<|>)$/.test(x.v)) { this.i++; return { k: 'cmp', op: x.v, l: l, r: this.sum() }; }
    return l;
  };
  Parser.prototype.sum = function () {
    var l = this.prod();
    while (this.is('p', '+') || this.is('p', '-')) { var op = this.take('p').v; l = { k: 'math', op: op, l: l, r: this.prod() }; }
    return l;
  };
  Parser.prototype.prod = function () {
    var l = this.unary();
    while (this.is('p', '*') || this.is('p', '/')) { var op = this.take('p').v; l = { k: 'math', op: op, l: l, r: this.unary() }; }
    return l;
  };
  Parser.prototype.unary = function () {
    if (this.is('p', '-') && this.is('lit', null, 1)) { this.i++; return { k: 'lit', v: '-' + this.take('lit').v }; }
    return this.operand();
  };
  Parser.prototype.args = function () {               // ( [name=]term, … )
    var out = [];
    this.take('p', '(');
    while (!this.is('p', ')')) {
      var name = null;
      if (this.is('id') && this.is('p', '=', 1)) { name = this.take('id').v; this.i++; }
      out.push({ name: name, v: this.term() });
      if (!this.is('p', ',')) break;
      this.i++;
    }
    this.take('p', ')');
    return out;
  };
  Parser.prototype.term = function () {
    if (this.is('p', '[')) { this.i++; var l = []; while (!this.is('p', ']')) { l.push(this.term()); if (!this.is('p', ',')) break; this.i++; } this.take('p', ']'); return { k: 'list', a: l }; }
    if (this.is('id') && /^(cast|channel|wait|move|group)$/.test(this.peek().v)) return { k: 'action', a: this.action() };
    var e = this.expr();
    if (this.is('id', 'if')) { this.i++; return { k: 'action', a: { step: { k: 'callstep', e: e }, cond: this.expr() } }; }
    return e;
  };
  Parser.prototype.ref = function () {                // a spell / aura / item name
    if (this.is('raw')) return { k: 'raw', v: this.take('raw').v };
    var x = this.take('id').v;
    if ((x === 'item' || x === 'other') && this.is('p', '.')) { this.i++; return { k: x, v: this.take('id').v }; }
    return x === 'none' ? { k: 'none' } : { k: 'name', v: x };
  };
  Parser.prototype.operand = function () {
    var x = this.peek(); if (!x) throw new Error('a value is missing');
    if (x.t === 'p' && x.v === '(') { this.i++; var e = this.expr(); this.take('p', ')'); return { k: 'paren', a: e }; }
    if (x.t === 'lit') { this.i++; return { k: 'lit', v: x.v }; }
    if (x.t === 'str') { this.i++; return { k: 'str', v: x.v }; }
    if (x.t === 'raw') { this.i++; return { k: 'raw', v: x.v }; }
    if (x.t === 'var') { this.i++; return { k: 'var', v: x.v, ident: x.ident }; }
    if (x.t === 'ph') { this.i++; return { k: 'ph', v: x.v, ident: x.ident }; }
    if (x.t !== 'id') throw new Error('unexpected "' + x.v + '"');
    if (x.v === 'true' || x.v === 'false') { this.i++; return { k: 'lit', v: x.v }; }
    if (x.v === 'none' && !this.is('p', '.', 1)) { this.i++; return { k: 'none' }; }
    this.i++;
    var unit = null, head = x.v;
    if (this.is('p', '.') && this.is('id', null, 1)) { unit = head; this.i++; head = this.take('id').v; }
    if (this.is('p', '(')) {
      // head(subject).prop[(args)] — an accessor — or kind(args)
      var save = this.i, depth = 0, j = this.i;
      for (; j < this.k.length; j++) { var t = this.k[j]; if (t.t === 'p' && t.v === '(') depth++; else if (t.t === 'p' && t.v === ')' && --depth === 0) break; }
      if (this.k[j + 1] && this.k[j + 1].t === 'p' && this.k[j + 1].v === '.' && this.k[j + 2] && this.k[j + 2].t === 'id') {
        this.i++;
        var subj = this.is('str') ? { k: 'str', v: this.take('str').v } : this.ref();
        this.take('p', ')'); this.take('p', '.');
        var prop = this.take('id').v, args = this.is('p', '(') ? this.args() : [];
        return { k: 'acc', unit: unit, head: head, subj: subj, prop: prop, args: args };
      }
      this.i = save;
      return { k: 'call', unit: unit, name: head, args: this.args() };
    }
    return { k: 'call', unit: unit, name: head, args: null };
  };
  // A row's step: cast / channel / wait / move / group / schedule / sequence / none / kind(args) / raw
  Parser.prototype.step = function () {
    var x = this.peek(); if (!x) throw new Error('the row is empty');
    if (x.t === 'raw') { this.i++; return { k: 'raw', v: x.v }; }
    if (x.t !== 'id') throw new Error('a row starts with an action (cast …, group "…", …)');
    var w = x.v, on = null;
    if (w === 'none') { this.i++; return { k: 'none' }; }
    if (w === 'cast' || w === 'channel') {
      this.i++; var ref = this.ref(), until = null, recast = false;
      if (this.is('id', 'on')) { this.i++; on = this.is('raw') ? { k: 'raw', v: this.take('raw').v } : { k: 'unit', v: this.take('id').v }; }
      if (w === 'channel' && this.is('id', 'until')) { this.i++; until = this.expr(); }
      if (w === 'channel' && this.is('id', 'recast')) { this.i++; recast = true; }
      return { k: w, ref: ref, on: on, until: until, recast: recast };
    }
    if (w === 'wait') { this.i++; var u = false; if (this.is('id', 'until')) { this.i++; u = true; } return { k: u ? 'waitUntil' : 'wait', e: this.expr() }; }
    if (w === 'move') { this.i++; if (this.is('id', 'for')) { this.i++; return { k: 'moveFor', e: this.expr() }; } var me = this.expr(); if (this.is('id', 'recheck')) this.i++; return { k: 'move', e: me }; }
    if (w === 'group' && this.is('str', null, 1)) {
      this.i++; var gname = this.take('str').v, binds = [];
      if (this.is('id', 'with')) { this.i++; do { var ph = this.take('ph'); this.take('p', '='); binds.push({ name: ph.v, v: this.expr() }); } while (this.is('p', ',') && this.is('ph', null, 1) && this.i++); }
      return { k: 'group', name: gname, binds: binds };
    }
    if (w === 'schedule' && this.is('str', null, 1)) { this.i++; var sch = this.take('str').v; return { k: 'schedule', s: sch, inner: this.step() }; }
    if (w === 'sequence' && this.is('str', null, 1)) { this.i++; var sn = this.take('str').v; this.take('p', '['); var depth = 1; while (depth && !this.end()) { var tk = this.take(this.peek().t); if (tk.t === 'p' && tk.v === '[') depth++; if (tk.t === 'p' && tk.v === ']') depth--; } return { k: 'sequence', name: sn }; }
    this.i++;
    return { k: 'kind', name: w, args: this.is('p', '(') ? this.args() : [] };
  };
  Parser.prototype.action = function () {             // a step with its "if"
    var s = this.step(), c = null;
    if (this.is('id', 'if')) { this.i++; c = this.expr(); }
    return { step: s, cond: c };
  };

  // ---- the AST → APL JSON (names from the table, defs put in place) ----
  function Lower(defs, warn) { this.defs = defs; this.warn = warn; this.depth = 0; }
  Lower.prototype.nameId = function (w, nss) {
    names();
    for (var i = 0; i < nss.length; i++) { var e = NAMES[nss[i]][w]; if (e) { var o = { spellId: e[0] }; if (e[1]) o.tag = e[1]; return o; } }
    return null;
  };
  Lower.prototype.ref = function (r, env, nss) {
    if (!r) return {};
    if (r.k === 'raw') return r.v;
    if (r.k === 'none') return {};
    if (r.k === 'item') return { itemId: 0, itemName: r.v };
    if (r.k === 'other') return { otherId: r.v };
    if (r.k === 'str') return r.v;
    var w = r.v;
    if (env && env.params && env.params[w]) { var p = env.params[w]; var pa = p.ast; if (pa.k === 'call' && !pa.args && !pa.unit) return this.ref({ k: 'name', v: pa.name }, p.env, nss); if (pa.k === 'raw') return pa.v; return { unknownName: w }; }
    var d = this.defs[w];
    if (d && !d.params.length && d.ast.k === 'call' && !d.ast.args && !d.ast.unit) return this.ref({ k: 'name', v: d.ast.name }, null, nss);
    var id = this.nameId(w, nss || ['spell', 'aura', 'target_aura']);
    return id || { unknownName: w };
  };
  Lower.prototype.unit = function (u, env) {
    if (!u) return null;
    if (u.k === 'raw') return u.v;
    var w = u.v != null ? u.v : u;
    if (env && env.params && env.params[w]) { var p = env.params[w]; if (p.ast.k === 'call' && !p.ast.args) return this.unit({ v: p.ast.name }, p.env); }
    var x = unitWord(w); if (x) return x;
    if (w === 'none') return {};
    return { unknownUnit: w };
  };
  Lower.prototype.flat = function (a, op, env) {
    var self = this, out = [];
    a.forEach(function (x) { if (x.k === op) out.push.apply(out, self.flat(x.a, op, env)); else out.push(self.v(x, env)); });
    return out;
  };
  Lower.prototype.v = function (n, env) {
    var self = this;
    if (++this.depth > 400) throw new Error('the defs nest too deep');
    try {
      switch (n.k) {
        case 'or': return { or: { vals: this.flat(n.a, 'or', env) } };
        case 'and': return { and: { vals: this.flat(n.a, 'and', env) } };
        case 'not': return { not: { val: this.v(n.a, env) } };
        case 'paren': return this.v(n.a, env);
        case 'cmp': return { cmp: { op: { '==': 'OpEq', '!=': 'OpNe', '<': 'OpLt', '<=': 'OpLe', '>': 'OpGt', '>=': 'OpGe' }[n.op], lhs: this.v(n.l, env), rhs: this.v(n.r, env) } };
        case 'math': return { math: { op: { '+': 'OpAdd', '-': 'OpSub', '*': 'OpMul', '/': 'OpDiv' }[n.op], lhs: this.v(n.l, env), rhs: this.v(n.r, env) } };
        case 'lit': return C(n.v);
        case 'str': return C(n.v);
        case 'none': return {};
        case 'raw': return n.v;
        case 'var': return { variableRef: n.ident ? { name: n.v, byIdentifier: true } : { name: n.v } };
        case 'ph': return { variablePlaceholder: n.ident ? { name: n.v, byIdentifier: true } : { name: n.v } };
        case 'list': return { list: n.a.map(function (x) { return self.v(x, env); }) };
        case 'action': return { actionValue: true };
        case 'acc': {
          var ns = n.head === 'aura' ? (n.unit && n.unit !== 'self' ? ['target_aura', 'aura', 'spell'] : ['aura', 'target_aura', 'spell']) : n.head === 'dot' ? ['spell', 'target_aura'] : ['spell'];
          var o = {}, sf = n.head === 'aura' ? 'auraId' : n.head === 'sequence' ? 'sequenceName' : 'spellId';
          o[sf] = this.ref(n.subj, env, ns);
          if (n.unit) o[n.head === 'aura' ? 'sourceUnit' : 'targetUnit'] = this.unit({ v: n.unit }, env);
          n.args.forEach(function (x) { if (x.name) o[camel(x.name)] = self.argVal(x.v, env); else if (x.v.k === 'call' && !x.v.args) o[camel(x.v.name)] = true; });
          var r = {}; r[camel(n.head + '_' + n.prop)] = o; return r;
        }
        case 'call': return this.call(n, env);
      }
      throw new Error('could not read a value');
    } finally { this.depth--; }
  };
  Lower.prototype.argVal = function (t, env) {        // a field's value: a word (an enum, a unit, a name) stays a word
    if (t.k === 'call' && !t.args && !t.unit) { var w = t.name; if (w === 'true' || w === 'false') return w === 'true'; return { word: w }; }
    if (t.k === 'lit' && /^-?\d+$/.test(t.v)) return +t.v;
    return this.v(t, env);
  };
  Lower.prototype.call = function (n, env) {
    var self = this, w = n.name, r = {};
    if (!n.unit && env && env.params && env.params[w] && !n.args) { var p = env.params[w]; return this.v(p.ast, p.env); }
    var d = !n.unit && this.defs[w];
    if (d) {
      var a = n.args || [];
      if (a.length !== d.params.length) throw new Error('def ' + w + ' takes ' + d.params.length + ' argument' + (d.params.length === 1 ? '' : 's'));
      var penv = { params: {} };
      d.params.forEach(function (pn, i) { penv.params[pn] = { ast: a[i].v, env: env }; });
      return this.v(d.ast, penv);
    }
    var args = n.args || [];
    var pos = args.filter(function (x) { return !x.name; }), named = args.filter(function (x) { return x.name; });
    if (w === 'min' || w === 'max' || ((w === 'and' || w === 'or') && n.args)) { r[w] = { vals: args.map(function (x) { return self.v(x.v, env); }) }; return r; }
    var o = {};
    if (w === 'is_execute_phase' && pos[0]) o.threshold = String(this.word(pos[0].v)).toUpperCase();
    else if (w === 'warlock_is_assigned_curse' && pos[0]) o.curseType = pascal(this.word(pos[0].v));
    else if (w === 'warlock_active_pet' && pos[0]) o.summon = pascal(this.word(pos[0].v));
    else if ((w === 'talent_rank' || w === 'talent_is_known') && pos[0]) o.talentId = this.ref(this.refOf(pos[0].v), env, ['spell']);
    else if (pos[0]) {                                         // a kind with its subject first: aura_is_active(x, …), multidot(x, …)
      var sub = this.refOf(pos[0].v);
      if (sub) o[/^aura/.test(w) ? 'auraId' : 'spellId'] = this.ref(sub, env, /^aura/.test(w) ? ['aura', 'target_aura', 'spell'] : ['spell', 'target_aura']);
    }
    named.forEach(function (x) { o[camel(x.name)] = self.argVal(x.v, env); });
    if (n.unit) o[/^warlock_/.test(w) || /^dot/.test(w) ? 'targetUnit' : 'sourceUnit'] = this.unit({ v: n.unit }, env);
    r[camel(w)] = o; return r;
  };
  Lower.prototype.word = function (t) { return t.k === 'call' && !t.args ? t.name : t.k === 'lit' ? t.v : ''; };
  Lower.prototype.refOf = function (t) { return t.k === 'call' && !t.args && !t.unit ? { k: 'name', v: t.name } : t.k === 'raw' ? { k: 'raw', v: t.v } : null; };
  Lower.prototype.step = function (s, env) {
    var self = this, o;
    switch (s.k) {
      case 'none': return {};
      case 'raw': return s.v;
      case 'cast': case 'channel':
        o = { spellId: this.ref(s.ref, env, ['spell']) };
        if (s.on) o.target = s.on.k === 'raw' ? s.on.v : this.unit(s.on, env);
        if (s.k === 'channel') { if (s.until) o.interruptIf = this.v(s.until, env); if (s.recast) o.allowRecast = true; return { channelSpell: o }; }
        return { castSpell: o };
      case 'wait': return { wait: { duration: this.v(s.e, env) } };
      case 'waitUntil': return { waitUntil: { condition: this.v(s.e, env) } };
      case 'move': return { move: { rangeFromTarget: this.v(s.e, env) } };
      case 'moveFor': return { moveDuration: { duration: this.v(s.e, env) } };
      case 'group': return { groupReference: { groupName: s.name, variables: s.binds.map(function (b) { return { name: b.name, value: self.v(b.v, env) }; }) } };
      case 'schedule': return { schedule: { schedule: s.s, innerAction: this.step(s.inner, env) } };
      case 'sequence': return { sequence: { name: s.name } };
      case 'callstep': return { unknownStep: true };
      case 'kind': {
        var pos = s.args.filter(function (x) { return !x.name; }), named = s.args.filter(function (x) { return x.name; });
        o = {};
        if (pos[0]) { var sub = this.refOf(pos[0].v); if (sub) o.spellId = this.ref(sub, env, ['spell']); }
        named.forEach(function (x) { o[camel(x.name)] = self.argVal(x.v, env); });
        var r = {}; r[camel(s.name)] = o; return r;
      }
    }
    return { unknownStep: true };
  };

  // Lines → statements (SPEC §3.1: brackets, deeper-indented continuation lines, "when …:" ends at its colon).
  function stripLine(line, st) {
    var out = '', i = 0;
    for (; i < line.length; i++) {
      var ch = line.charAt(i);
      if (st.raw) { out += ch; if (ch === '`') st.raw = false; continue; }
      if (st.str) { out += ch; if (ch === '\\') { out += line.charAt(++i); continue; } if (ch === '"') st.str = false; continue; }
      if (ch === '/' && line.charAt(i + 1) === '/' && line.charAt(i + 2) !== '/') break;
      if (ch === '/' && line.charAt(i + 1) === '/' && line.charAt(i + 2) === '/' && line.slice(0, i).trim()) break;
      if (ch === '`') st.raw = true; else if (ch === '"') st.str = true;
      else if (ch === '(' || ch === '[') st.depth++; else if ((ch === ')' || ch === ']') && st.depth > 0) st.depth--;
      out += ch;
    }
    st.str = false;
    return out;
  }
  function indentOf(l) { var m = /^[ \t]*/.exec(l); return m[0].length; }
  var HEADER = /^(?:group\s+"(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_]*)\s*:/;
  function statements(text) {
    var L = text.split('\n'), out = [], notes = [], i = 0;
    while (i < L.length) {
      var probe = { raw: false, str: false, depth: 0 }, c0 = stripLine(L[i], probe);
      if (!c0.trim()) { if (!L[i].trim()) notes = []; i++; continue; }
      if (/^\s*\/\/\//.test(L[i])) { notes.push(L[i].replace(/^\s*\/\/\/ ?/, '')); i++; continue; }
      var st = { raw: false, str: false, depth: 0 }, ind = indentOf(L[i]), first = stripLine(L[i], st), text2 = first, line0 = i + 1;
      var isHeader = ind === 0 && HEADER.test(first) && !/^(when|#)\b/.test(first), isWhen = /^\s*(#\s*)?when\b(?!\s*=)/.test(first);
      i++;
      if (isHeader) {
        var hm = HEADER.exec(first), body = first.slice(hm[0].length);
        out.push({ header: hm[0].replace(/\s*:$/, '').trim(), line: line0 });
        if (body.trim()) out.push({ text: body, indent: 1, notes: [], line: line0 });
        notes = []; continue;
      }
      var endsColon = function (s) { return /:\s*$/.test(s); };
      while (i < L.length) {
        if (st.raw || st.depth > 0) { text2 += '\n' + stripLine(L[i], st); i++; continue; }
        if (isWhen) { if (endsColon(text2)) break; text2 += '\n' + stripLine(L[i], st); i++; continue; }
        var j = i, nx;
        while (j < L.length) { var p2 = { raw: false, str: false, depth: 0 }; nx = stripLine(L[j], p2); if (nx.trim() && !/^\s*\/\/\//.test(L[j])) break; if (/^\s*\/\/\//.test(L[j])) { j = L.length; break; } j++; }
        if (j >= L.length || indentOf(L[j]) <= ind) break;
        for (; i < j; i++) text2 += '\n';
        text2 += '\n' + stripLine(L[i], st); i++;
      }
      out.push({ text: text2, indent: ind, notes: notes, line: line0, when: isWhen });
      notes = [];
    }
    return out;
  }
  // The rotation text → { rotation (APL JSON), warnings }
  function parseText(text, W) {
    var st = statements(String(text).replace(/\r\n?/g, '\n')), defs = {}, R = { type: 'TypeAPL', priorityList: [], groups: [], valueVariables: [] };
    var section = 'top', group = null, seenSiml = false, whens = [], prepullWarned = false, otherWarned = false;
    var low = new Lower(defs, W.warn);
    // defs first: a def may be called before its line
    st.forEach(function (s) {
      if (s.header) return;
      try { var t = lex(s.text); if (t[0] && t[0].t === 'id' && t[0].v === 'def' && !(t[1] && t[1].t === 'p' && t[1].v === '=')) {
        var P = new Parser(t); P.i = 1; var name = P.take('id').v, params = [];
        if (P.is('p', '(')) { P.i++; while (!P.is('p', ')')) { params.push(P.take('id').v); if (!P.is('p', ',')) break; P.i++; } P.take('p', ')'); }
        P.take('p', '='); defs[name] = { params: params, ast: P.expr() }; s.done = true;
      } } catch (e) { W.warn('Line ' + s.line + ': the def could not be read (' + e.message + ')'); s.done = true; }
    });
    st.forEach(function (s) {
      if (s.header) {
        var g = /^group\s+("(?:[^"\\]|\\.)*")$/.exec(s.header);
        whens = [];
        if (g) { group = { name: JSON.parse(g[1]), actions: [], variables: [] }; R.groups.push(group); section = 'group'; return; }
        group = null; section = s.header;
        if (['priority', 'prepull', 'apl'].indexOf(section) < 0 && !otherWarned) { otherWarned = true; W.note('Only the rotation is read (sections like "' + section + ':" are left out).'); }
        return;
      }
      if (s.done) return;
      var toks;
      try { toks = lex(s.text); } catch (e) { W.warn('Line ' + s.line + ': ' + e.message + ' — left out'); return; }
      if (!toks.length) return;
      var f = toks[0], P = new Parser(toks), word = f.t === 'id' && !(toks[1] && toks[1].t === 'p' && toks[1].v === '=') ? f.v : null;
      try {
        if (word === 'siml') { seenSiml = true; return; }
        if (word === 'spec') { var sp = toks[1] && toks[1].v; if (sp && sp !== 'warlock') W.warn('This rotation is for "' + sp + '", not a Warlock: only the spells a Warlock has are read'); return; }
        if (word === 'talents' || word === 'use') { W.note('"' + word + '" lines are left out (only the rotation is read).'); return; }
        if (word === 'type') { var ty = toks[1] && toks[1].v; if (ty === 'auto' || ty === 'simple') W.warn('"type ' + ty + '": that rotation is the other sim\'s automatic one — export its APL list ("type apl") to bring it here'); R.type = ty === 'auto' ? 'TypeAuto' : ty === 'simple' ? 'TypeSimple' : R.type; return; }
        if (word === 'var') {
          P.i = 1; var vt = P.take('var'), val = null;
          if (P.is('p', '=')) { P.i++; val = low.v(P.expr(), null); }
          (section === 'group' && group ? group.variables : R.valueVariables).push({ name: vt.v, byIdentifier: vt.ident, value: val });
          return;
        }
        if (section === 'top' || section === 'apl') { W.warn('Line ' + s.line + ': not part of a rotation section — left out'); return; }
        if (section !== 'priority' && section !== 'group' && section !== 'prepull') return;
        while (whens.length && whens[whens.length - 1].indent >= s.indent) whens.pop();
        var hide = false;
        if (P.is('p', '#')) { P.i++; hide = true; }
        if (s.when) {
          P.take('id', 'when'); var we = P.expr(); P.take('p', ':');
          whens.push({ indent: s.indent, cond: low.v(we, null), paren: we.k === 'paren', hide: hide || whens.some(function (x) { return x.hide; }) });
          return;
        }
        if (section === 'prepull') { if (!prepullWarned) { prepullWarned = true; W.warn('Prepull rows are left out (a precast is set in Fight & pets → Precast here)'); } return; }
        var item;
        if (!hide && toks.length === 1 && f.t === 'raw' && !s.notes.length) item = clone(f.v);
        else {
          var A = P.action(); if (!P.end()) throw new Error('unexpected "' + P.peek().v + '" after the action');
          var act = low.step(A.step, null);
          if (A.cond) act.condition = low.v(A.cond, null);
          item = { action: act };
          if (hide) item.hide = true;
          if (s.notes.length) item.notes = s.notes.join('\n');
        }
        if (whens.length && !(f.t === 'raw' && toks.length === 1)) {
          var wc = [];
          whens.forEach(function (w) { if (w.cond.and && !w.paren) wc.push.apply(wc, w.cond.and.vals); else wc.push(w.cond); });
          var own = item.action.condition, all = wc.concat(own ? (own.and ? own.and.vals : [own]) : []);
          item.action.condition = all.length === 1 ? all[0] : { and: { vals: all } };
          if (whens.some(function (w) { return w.hide; })) item.hide = true;
        }
        (section === 'group' && group ? group.actions : R.priorityList).push(item);
      } catch (e) { W.warn('Line ' + s.line + ': could not be read (' + e.message + ') — left out'); }
    });
    if (!seenSiml) W.warn('The text does not start with "siml 1"');
    return R;
  }

  // ======================================== import: APL JSON → this sim's lines ========================================
  function Reader(rot, cfg, W) {
    this.R = rot; this.cfg = cfg || WL.DEFAULT_CONFIG; this.W = W; this.where = '';
    this.vars = {}; this.varId = {};
    var self = this;
    (rot.valueVariables || []).forEach(function (v) { if (v && v.name != null) { self.vars[v.name] = v.value; self.varId[identifier(v.name)] = v.name; } });
    this.groups = {};
    (rot.groups || []).forEach(function (g) { if (g && g.name != null) self.groups[g.name] = g; });
  }
  Reader.prototype.warn = function (s) { this.W.warn((this.where ? this.where + ': ' : '') + s); };
  Reader.prototype.note = function (s) { this.W.note(s); };
  function U(why) { return { u: why }; }
  function parseConst(s) {
    s = String(s == null ? '' : s).trim();
    if (s === 'true' || s === 'false') return { b: s === 'true' };
    var m = /^(-?)(\d+(?:\.\d+)?)%$/.exec(s); if (m) return { n: (m[1] ? -1 : 1) * +m[2], unit: '%' };
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return { n: +s, unit: '' };
    var d = /^(-?)((?:\d+(?:\.\d+)?(?:h|ms|us|µs|ns|m|s))+)$/.exec(s);
    if (d) { var tot = 0, F = { h: 3600, m: 60, s: 1, ms: 1e-3, us: 1e-6, 'µs': 1e-6, ns: 1e-9 }; d[2].replace(/(\d+(?:\.\d+)?)(h|ms|us|µs|ns|m|s)/g, function (a, x, u) { tot += +x * F[u]; }); return { n: (d[1] ? -1 : 1) * tot, unit: 's' }; }
    return U('the value "' + s + '"');
  }
  function okTarget(u) { return !u || !u.type || u.type === 'Unknown' || u.type === 'CurrentTarget' || (u.type === 'Target' && !u.index); }
  function okSelf(u) { return !u || !u.type || u.type === 'Unknown' || u.type === 'Self' || (u.type === 'Player' && !u.index); }
  var TIME_Q = { dot: 1, aura: 1, cd: 1, fight: 1, cast: 1 }, PCT_Q = { hp: 1, mana: 1 };
  function rnd(x) { return Math.round(x * 1e9) / 1e9; }
  function leafNode(Q, op, v) {
    switch (Q.kind) {
      case 'dot': return { t: 'dot', spell: Q.spell, op: op, v: v };
      case 'aura': return { t: 'aura', aura: Q.aura, op: op, v: v };
      case 'cd': return { t: 'cd', spell: Q.spell, op: op, v: v };
      case 'fight': return { t: 'fight', what: Q.what, op: op, v: v };
      case 'hp': return { t: 'fight', what: 'bossHp', op: op, v: v };
      case 'mana': return { t: 'mana', op: op, v: v };
      case 'brand': return { t: 'brand', op: op, v: v };
      case 'talent': return { t: 'talent', talent: Q.talent, op: op, v: v };
    }
    return null;
  }
  function neg(n) {
    if (!n) return n;
    if (n.t === 'not') return n.c;
    if (n.op && INV[n.op] && n.t !== 'minDot') { var o = clone(n); o.op = INV[n.op]; return o; }
    return { t: 'not', c: n };
  }
  Reader.prototype.spellKey = function (a) {
    if (!a || a.tag) return null;
    if (a.spellId == null) return null;
    return idKey()[a.spellId] || null;
  };
  Reader.prototype.auraOf = function (a, unit) {          // an aura id → a quantity: our buff, or one of our DoTs on the boss
    if (!a || a.spellId == null) return null;
    var id = a.spellId, tag = a.tag || 0, k;
    for (k in SELF_AURAS) { var s = SELF_AURAS[k], sid2 = Array.isArray(s) ? s[0] : s, st = Array.isArray(s) ? s[1] : 0; if (sid2 === id && st === tag) return okSelf(unit) ? { kind: 'aura', aura: k } : null; }
    for (k in TARGET_AURAS) if (TARGET_AURAS[k] === id && !tag) return okTarget(unit) ? { kind: 'aura', aura: k } : null;
    var key = !tag && idKey()[id];
    if (key && WL.RULE_DOTS.indexOf(key) >= 0) return okTarget(unit) ? { kind: 'dot', spell: key } : null;
    return null;
  };
  Reader.prototype.once = function (k, s) { this.W.once(k, s); };
  Reader.prototype.exec = function (thr) {
    var p = +String(thr || 'E20').replace(/\D/g, '') || 20;
    var ex = this.cfg && this.cfg.fight && this.cfg.fight.executePct;
    return p === ex ? { exec: 1 } : p;
  };
  Reader.prototype.varVal = function (r, ph) {
    var name = r.name;
    if (ph && r.byIdentifier == null && ph.hasOwnProperty(name)) return ph[name];
    if (this.vars.hasOwnProperty(name)) return this.vars[name];
    if (r.byIdentifier && this.varId[name]) return this.vars[this.varId[name]];
    if (r.byIdentifier && this.varId[identifier(name)]) return this.vars[this.varId[identifier(name)]];
    return undefined;
  };
  // An APL value → { b } (true / false here), { c } (a condition), { n, unit }, { q } (a number this sim reads), { mm }, or { u } (no equivalent)
  Reader.prototype.val = function (v, E) {
    var self = this;
    E = E || {}; if ((E.depth || 0) > 40) return U('variables that refer to themselves');
    if (!v || typeof v !== 'object') return U('an empty value');
    var kind = Object.keys(v).filter(function (k) { return k !== 'uuid'; })[0], x = v[kind] || {};
    if (!kind) return U('an empty value');
    var sub = function (y) { return self.val(y, { depth: (E.depth || 0) + 1, ph: E.ph }); };
    switch (kind) {
      case 'const': return parseConst(x.val);
      case 'and': case 'or': return this.logic(kind, (x.vals || []).map(sub));
      case 'not': { var r = this.asBool(sub(x.val)); if (r.b != null) return { b: !r.b }; if (r.u) return r; return { c: neg(r.c) }; }
      case 'cmp': return this.cmp(OPS_BACK[x.op] || '?', sub(x.lhs), sub(x.rhs));
      case 'math': {
        var l = sub(x.lhs), rr = sub(x.rhs);
        if (l.n != null && rr.n != null) {
          var o = x.op, n = o === 'OpAdd' ? l.n + rr.n : o === 'OpSub' ? l.n - rr.n : o === 'OpMul' ? l.n * rr.n : o === 'OpDiv' && rr.n ? l.n / rr.n : NaN;
          if (isFinite(n)) return { n: rnd(n), unit: l.unit || rr.unit };
        }
        return U('arithmetic on values that change in the fight');
      }
      case 'min': case 'max': {
        var it = (x.vals || []).map(sub);
        if (it.length && it.every(function (y) { return y.n != null; })) return { n: Math[kind].apply(null, it.map(function (y) { return y.n; })), unit: it[0].unit };
        if (it.length && it.every(function (y) { return y.q && y.q.kind === it[0].q.kind && y.q.kind !== 'cast'; })) return { mm: kind, qs: it.map(function (y) { return y.q; }) };
        return U('min / max of mixed values');
      }
      case 'variableRef': { var vv = this.varVal(x, E.ph); if (vv === undefined) return U('the variable "' + x.name + '" is not defined'); return sub(vv); }
      case 'variablePlaceholder': { var pv = E.ph && E.ph[x.name]; if (pv === undefined) return U('the placeholder "' + x.name + '" has no value'); return sub(pv); }
      // the boss and the fight
      case 'remainingTime': case 'timeUntilTargetDies': return { q: { kind: 'fight', what: 'remaining' } };
      case 'currentTime': return { q: { kind: 'fight', what: 'elapsed' } };
      case 'isExecutePhase': return { c: leafNode({ kind: 'hp' }, '<', this.exec(x.threshold)) };
      case 'currentHealthPercent': return okSelf(x.sourceUnit) && !(x.sourceUnit && x.sourceUnit.type) ? U('your own health') : okTarget(x.sourceUnit) ? { q: { kind: 'hp' } } : U('the health of another target');
      case 'currentManaPercent': return okSelf(x.sourceUnit) ? { q: { kind: 'mana' } } : U('the mana of another unit (a pet)');
      case 'numberTargets':
        this.once('targets', 'number_targets is read as 1: this sim decides on the boss; extra targets are a Fight setting (Targets, Multi-DoT).');
        return { n: 1, unit: '' };
      // spells, DoTs, buffs
      case 'dotIsActive': case 'dotRemainingTime': case 'dotIsActiveOnAllTargets': case 'dotIsActiveOnAnyTarget': {
        var dk = this.spellKey(x.spellId);
        if (!dk || WL.RULE_DOTS.indexOf(dk) < 0) return U('"' + idName(x.spellId) + '" is not a DoT this sim keeps');
        if (kind !== 'dotIsActive' && kind !== 'dotRemainingTime') this.once('targets', 'number_targets is read as 1: this sim decides on the boss; extra targets are a Fight setting (Targets, Multi-DoT).');
        else if (!okTarget(x.targetUnit)) return U('a DoT on another target');
        return kind === 'dotRemainingTime' ? { q: { kind: 'dot', spell: dk } } : { c: leafNode({ kind: 'dot', spell: dk }, '>', 0) };
      }
      case 'dotBaseDuration': { var bk = this.spellKey(x.spellId); return bk && WL.SPELLS[bk].duration ? { n: WL.SPELLS[bk].duration, unit: 's' } : U('the duration of "' + idName(x.spellId) + '"'); }
      case 'auraIsActive': case 'auraIsInactive': case 'auraRemainingTime': case 'auraIsActiveOnAllTargets': case 'auraIsActiveOnAnyTarget': {
        var aq = this.auraOf(x.auraId, kind === 'auraIsActiveOnAllTargets' || kind === 'auraIsActiveOnAnyTarget' ? null : x.sourceUnit);
        if (!aq) return U('the buff / debuff "' + idName(x.auraId) + '"' + (x.sourceUnit && x.sourceUnit.type && !okTarget(x.sourceUnit) && !okSelf(x.sourceUnit) ? ' on another unit' : '') + ' is not one this sim reads');
        if (kind === 'auraRemainingTime') return { q: aq };
        return { c: leafNode(aq, kind === 'auraIsInactive' ? '<=' : '>', 0) };
      }
      case 'auraNumStacks':
        if (x.auraId && x.auraId.spellId === TARGET_AURAS.brand && okTarget(x.sourceUnit)) return { q: { kind: 'brand' } };
        return U('the stacks of "' + idName(x.auraId) + '"');
      case 'spellIsReady': case 'spellCanCast': case 'spellTimeToReady': case 'spellCastTime': case 'spellIsKnown': {
        var sk = this.spellKey(x.spellId);
        if (!sk) return U('the spell "' + idName(x.spellId) + '" is not one this sim casts');
        if (kind === 'spellTimeToReady') return { q: { kind: 'cd', spell: sk } };
        if (kind === 'spellCastTime') return { q: { kind: 'cast', spell: sk } };
        if (kind === 'spellIsKnown') return { c: { t: 'known', spell: sk } };
        if (kind === 'spellCanCast') this.once('cancast', '"can cast" is read as "the cooldown is ready" (the cast checks mana and the talent itself).');
        return { c: leafNode({ kind: 'cd', spell: sk }, '<=', 0) };
      }
      case 'spellIsCasting': case 'spellIsChanneling':
        this.once('casting', '"is casting" is read as false: this sim decides between casts.');
        return { b: false };
      case 'unitIsMoving': return { b: false };
      case 'gcdIsReady': return { b: true };
      case 'talentRank': case 'talentIsKnown': {
        var tk = null, tid = x.talentId && x.talentId.spellId;
        Object.keys(TALENT_IDS).forEach(function (k) { if (TALENT_IDS[k] === tid) tk = k; });
        if (!tk || !WL.TALENT_BY_KEY[tk]) return U('the talent "' + idName(x.talentId) + '"');
        return kind === 'talentRank' ? { q: { kind: 'talent', talent: tk } } : { c: { t: 'talent', talent: tk, op: '>=', v: Math.max(1, (x.talentId && x.talentId.rank) || 1) } };
      }
      // the Warlock's own values
      case 'warlockAssignedCurseIsActive': case 'warlockAssignedCurseIsActiveOnAllTargets':
        if (kind === 'warlockAssignedCurseIsActive' && !okTarget(x.targetUnit)) return U('the curse on another target');
        return { c: leafNode({ kind: 'aura', aura: 'coe' }, '>', 0) };
      case 'warlockIsAssignedCurse': {
        var ct = x.curseType || 'Elements';
        if (ct === 'Elements') return { c: { t: 'setting', key: 'coe' } };
        if (ct === 'NoCurse') return { c: { t: 'not', c: { t: 'setting', key: 'coe' } } };
        return { b: false };
      }
      case 'warlockBaneIsActiveOnAllTargets': return { c: { t: 'any', c: [leafNode({ kind: 'dot', spell: 'baneOfDoom' }, '>', 0), leafNode({ kind: 'dot', spell: 'baneOfAgony' }, '>', 0)] } };
      case 'warlockActivePet':
        if (!x.summon || x.summon === 'NoSummon') return { c: { t: 'not', c: { t: 'pet' } } };
        this.once('pet', '"the active pet is ' + x.summon + '" is read as "a demon is out" (the demon is the build\'s pet here).');
        return { c: { t: 'pet' } };
      case 'currentMana': return U('mana in points (conditions here use % of your maximum)');
      case 'spellTravelTime': return U('a spell\'s travel time');
      case 'remainingTimePercent': case 'currentTimePercent': return U('fight time in %');
    }
    return U('"' + kind.replace(/([A-Z])/g, '_$1').toLowerCase() + '"');
  };
  Reader.prototype.asBool = function (r) {
    if (r.b != null || r.c || r.u) return r;
    if (r.n != null) return { b: r.n !== 0 };
    if (r.q && r.q.kind !== 'cast') return this.leaf(r.q, '>', { n: 0, unit: '' });
    if (r.mm) return this.mmLeaf(r, '>', { n: 0, unit: '' });
    return U('a number where a condition belongs');
  };
  Reader.prototype.logic = function (op, items) {
    var conds = [], unk = [], self = this;
    for (var i = 0; i < items.length; i++) {
      var r = this.asBool(items[i]);
      if (r.b === (op === 'or')) return { b: op === 'or' };
      if (r.b != null) continue;
      if (r.u) { unk.push(r.u); continue; }
      var t = op === 'and' ? 'all' : 'any';
      if (r.c.t === t) conds.push.apply(conds, r.c.c); else conds.push(r.c);
    }
    if (unk.length) return U(unk.join('; '));
    if (!conds.length) return { b: op === 'and' };
    return { c: conds.length === 1 ? conds[0] : { t: op === 'and' ? 'all' : 'any', c: conds } };
  };
  Reader.prototype.num = function (Q, R) {                // the compared number in this sim's unit, or null
    if (R.exec) return R.exec;
    if (R.n == null) return null;
    if (PCT_Q[Q.kind]) return R.unit === '%' ? R.n : R.unit === '' ? rnd(R.n * 100) : null;
    if (TIME_Q[Q.kind]) return R.unit === '%' ? null : R.n;
    return R.unit === '%' ? null : R.n;
  };
  Reader.prototype.leaf = function (Q, op, R) {
    var v;
    if (R.q) { if (R.q.kind !== 'cast' || !TIME_Q[Q.kind] || Q.kind === 'cast') return U('two values that change in the fight compared with each other'); v = { cast: R.q.spell }; }
    else { v = this.num(Q, R); if (v == null) return U('a number in the wrong unit (seconds / %)'); }
    if (Q.kind === 'cast') return U('a cast time on the left');
    if (op === '!=') return { c: { t: 'not', c: leafNode(Q, '=', v) } };
    return { c: leafNode(Q, op, v) };
  };
  Reader.prototype.mmLeaf = function (M, op, R) {
    var self = this, parts = M.qs.map(function (q) { return self.leaf(q, op, R); });
    if (parts.some(function (p) { return p.u; })) return parts.filter(function (p) { return p.u; })[0];
    var all = (M.mm === 'min') === (op === '>' || op === '>=');
    if (op === '=' || op === '!=') return U('min / max compared with =');
    return { c: { t: all ? 'all' : 'any', c: parts.map(function (p) { return p.c; }) } };
  };
  Reader.prototype.cmp = function (op, L, R) {
    if (op === '?') return U('an unknown comparison');
    if (L.u) return L; if (R.u) return R;
    if (L.exec || R.exec) return U('the execute threshold');
    if (L.n != null && R.n != null) {
      var a = L.n, b = R.n;
      return { b: op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : op === '>=' ? a >= b : op === '=' ? Math.abs(a - b) < 1e-9 : Math.abs(a - b) >= 1e-9 };
    }
    if ((L.n != null || (L.q && L.q.kind === 'cast')) && (R.q || R.mm) && !(R.q && R.q.kind === 'cast')) { var t = L; L = R; R = t; op = FLIP[op]; }
    if (L.mm && R.n != null) return this.mmLeaf(L, op, R);
    if (L.q) return this.leaf(L.q, op, R);
    return U('a comparison of these values');
  };

  // The rows of a list → lines. env: { when: [conditions of the groups around], ph, depth, gname }
  Reader.prototype.rows = function (list, env, out) {
    var self = this;
    (list || []).forEach(function (item, i) { self.where = (env.gname ? 'Group "' + env.gname + '" row ' : 'Row ') + (i + 1) + rowName(item); self.item(item || {}, env, out); });
  };
  function rowName(item) {
    var a = (item && item.action) || {}, k = Object.keys(a).filter(function (x) { return x !== 'condition'; })[0];
    if (!k) return '';
    var o = a[k] || {};
    if (k === 'castSpell' || k === 'channelSpell') return ' (cast ' + idName(o.spellId) + ')';
    if (k === 'groupReference') return ' (group "' + o.groupName + '")';
    return ' (' + k.replace(/([A-Z])/g, '_$1').toLowerCase() + ')';
  }
  Reader.prototype.marker = function (item) {
    var m = MARK.exec(item.notes || ''); if (!m || m[1] === 'when') return null;
    if (m[4] !== hash(item.action || {})) { if (m[1] !== 'auto') this.note('Rows changed in the other sim are read from their APL (their marker no longer fits).'); return null; }
    return { key: m[1], params: m[2] ? m[2].split(',').map(Number) : null, k: m[3] ? +m[3] : 0 };
  };
  Reader.prototype.item = function (item, env, out) {
    var self = this, a = item.action || {};
    var mk = this.marker(item);
    if (mk && mk.key === 'auto') return;                       // a row the export added (Life Tap, cooldowns, Havoc): automatic here
    var wm = /: (\{.*\}) \[when #([0-9a-z]{6})\]\s*$/.exec(item.notes || '');
    if (wm && item.hide) {                                     // an action's extra condition, kept whole by the export
      var prev = out[out.length - 1], cw = null;
      try { cw = JSON.parse(wm[1]); } catch (e) { cw = null; }
      if (cw && hash(cw) === wm[2] && prev && prev.act) prev.extra = cw;
      return;
    }
    if (mk && WL.ACTIONS[mk.key] && !env.when.length) {
      var last = out[out.length - 1];
      if (last && last.act === mk.key && last.mk) return;       // the action's next line (Bane of Doom, else Bane of Agony)
      var o = { act: mk.key, mk: true }, P = WL.ACTIONS[mk.key].params;
      if (P && mk.params) { o.params = {}; P.forEach(function (p, j) { if (isFinite(mk.params[j])) o.params[p.key] = mk.params[j]; }); }
      if (mk.k) {
        var cj = a.condition ? (a.condition.and ? a.condition.and.vals : [a.condition]) : [], ex = cj.slice(cj.length - mk.k), kept = [];
        ex.forEach(function (c) { var r = self.asBool(self.val(c, { ph: env.ph })); if (r.c) kept.push(r.c); else if (r.u) self.warn('its extra condition: ' + r.u + ' — left out'); });
        if (kept.length) o.extra = kept.length === 1 ? kept[0] : { t: 'all', c: kept };
      }
      out.push(o); return;
    }
    if (item.hide) { this.once('hidden', 'Hidden rows are left out.'); return; }
    var kind = Object.keys(a).filter(function (k) { return k !== 'condition' && k !== 'uuid'; })[0];
    var conj = env.when.concat(a.condition ? (a.condition.and ? a.condition.and.vals : [a.condition]) : []);
    // the condition first: a row that can never be true here is left out quietly
    var parts = [], unk = [], self2 = this;
    for (var i = 0; i < conj.length; i++) {
      var r = this.asBool(this.val(conj[i], { ph: env.ph }));
      if (r.b === false) { this.once('never', 'Rows whose condition is never true here (one target, no movement) are left out.'); return; }
      if (r.b === true) continue;
      if (r.u) unk.push(r.u); else if (r.c.t === 'all') parts.push.apply(parts, r.c.c); else parts.push(r.c);
    }
    var spell = null;
    if (!kind) return;
    var o2 = a[kind] || {};
    if (kind === 'groupReference') {
      var g = this.groups[o2.groupName];
      if (!g) { this.warn('no group named "' + o2.groupName + '" — left out'); return; }
      if ((env.depth || 0) > 4) { this.warn('groups nested too deep — left out'); return; }
      var ph = Object.assign({}, env.ph || {});
      (o2.variables || []).forEach(function (v) { ph[v.name] = v.value; });
      (g.variables || []).forEach(function (v) { if (!ph.hasOwnProperty(v.name)) ph[v.name] = v.value; });
      var w = this.where;
      this.rows(g.actions, { when: conj, ph: ph, depth: (env.depth || 0) + 1, gname: g.name }, out);
      this.where = w; return;
    }
    if (kind === 'castSpell' || kind === 'channelSpell') {
      var id = o2.spellId || {};
      if (id.itemId != null || id.itemName) { this.warn((id.itemName ? 'item "' + id.itemName + '"' : 'item ' + id.itemId) + ': on-use trinkets and potions are settings here (Trinkets, Consumables) — left out'); return; }
      if (id.otherId) { this.warn('"' + id.otherId + '": potions and the like are settings here — left out'); return; }
      if (id.unknownName) { this.warn('unknown name "' + id.unknownName + '" — left out'); return; }
      if (o2.target && !okTarget(o2.target)) { this.warn('cast on another target: extra targets are a Fight setting here (Targets, Multi-DoT) — left out'); return; }
      spell = this.spellKey(id);
      if (kind === 'channelSpell' && o2.interruptIf) this.once('interrupt', 'Channel interrupt conditions are left out: here a channel is clipped when a higher-priority action becomes ready.');
    } else if (kind === 'castWarlockAssignedCurse') spell = 'curseOfElements';
    else if (kind === 'multidot' || kind === 'strictMultidot') {
      spell = this.spellKey(o2.spellId);
      if (spell && WL.RULE_DOTS.indexOf(spell) >= 0) {
        var ov = o2.maxOverlap ? this.val(o2.maxOverlap, { ph: env.ph }) : { n: 0, unit: 's' };
        var lf = this.leaf({ kind: 'dot', spell: spell }, '<=', ov.q ? ov : ov.n != null ? ov : { n: 0, unit: 's' });
        if (lf.c) parts.push(lf.c);
        this.once('multidot', 'Multi-DoT rows are read for the boss (recast when the DoT is missing or about to end); the extra targets are a Fight setting here (Multi-DoT).');
      }
    } else if (kind === 'autocastOtherCooldowns' || kind === 'castAllStatBuffCooldowns' || kind === 'activateAllStatBuffProcAuras') {
      this.once('cds', 'Cooldown rows (autocast other cooldowns) are left out: racials, potions, Power Infusion and on-use trinkets are settings here, used by themselves.'); return;
    } else { this.warn('"' + kind.replace(/([A-Z])/g, '_$1').toLowerCase() + '" has no equivalent here — left out'); return; }
    if (!spell) { var nm = idName(o2.spellId); this.warn('"' + nm + '" is not a spell this sim casts in its priority' + (/^summon_|fel_domination|demonic_sacrifice/.test(nm) ? ' (pets are a build setting here)' : /blood_fury|berserking|power_infusion|eureka|innervate|mana_tide/.test(nm) ? ' (racials and outside buffs are settings here)' : '') + ' — left out'); return; }
    if (spell === 'baneOfHavoc') { this.note('Bane of Havoc rows are left out: this sim casts it by itself with 2 or more targets (and the talent).'); return; }
    if (WL.RULE_SPELLS.indexOf(spell) < 0) { this.warn(WL.SPELLS[spell].name + ' is not used in this sim\'s priority — left out'); return; }
    if (o2.spellId && o2.spellId.spellId === 695) this.once('r2', 'Shadow Bolt Rank 2 is read as the max rank (Rank 2 is not in this sim).');
    if (unk.length) {
      if (spell === 'lifeTap') { this.warn('part of its condition has no equivalent here (' + unk.join('; ') + '), so this Life Tap is left out (this sim taps by itself when mana is short)'); return; }
      if (!parts.length) { this.warn('nothing of its condition has an equivalent here (' + unk.join('; ') + '), so it would be cast at any time — left out'); return; }
      this.warn('left out of its condition: ' + unk.join('; '));
    }
    if (!parts.length && WL.SPELLS[spell].cd) parts.push({ t: 'cd', spell: spell, op: '<=', v: 0 });   // "cast X" = X on cooldown (not a filler)
    var line = { spell: spell }; if (parts.length) line.when = parts.length === 1 ? parts[0] : { t: 'all', c: parts };
    line.where = this.where;
    out.push(line);
  };
  function warnBag() {
    var W = { warnings: [], notes: [], seen: {} };
    W.warn = function (s) { if (W.warnings.indexOf(s) < 0) W.warnings.push(s); };
    W.note = function (s) { if (W.notes.indexOf(s) < 0) W.notes.push(s); };
    W.once = function (k, s) { if (!W.seen[k]) { W.seen[k] = 1; W.note(s); } };
    return W;
  }
  // JSON in any of the forms → an APL rotation
  function rotationOf(o) {
    if (Array.isArray(o)) return { type: 'TypeAPL', priorityList: o.map(function (x) { return x && (x.action || x.hide != null || x.notes != null) ? x : { action: x }; }) };
    if (!o || typeof o !== 'object') return null;
    if (o.player) return o.player.rotation || null;
    if (o.rotation && typeof o.rotation === 'object' && !o.priorityList) return o.rotation;
    if (o.priorityList || o.prepullActions || o.groups) return o;
    if (o.kind && o.value) return o.kind === 'group' ? { priorityList: [{ action: { groupReference: { groupName: o.value.name } } }], groups: [o.value] } : o.kind === 'action' ? { priorityList: [o.value] } : null;
    if (o.action) return { priorityList: [o] };
    return null;
  }
  WL.aplImport = function (text, cfg) {
    var W = warnBag(), s = String(text == null ? '' : text).replace(/^﻿/, '').trim(), rot = null;
    var done = function (lines, err) { return { lines: lines || [], warnings: W.warnings, notes: W.notes, error: err || null }; };
    if (!s) return done([], 'Paste the APL text (it starts with "siml 1") or the JSON first.');
    if (/^[[{]/.test(s)) {
      var o; try { o = JSON.parse(s); } catch (e) { return done([], 'That is not valid JSON (' + e.message + ').'); }
      rot = rotationOf(o);
      if (!rot) return done([], 'No rotation in that JSON (it needs "priorityList", a "rotation" or "player": { "rotation" }).');
    } else if (/^(?:\s*\/\/[^\n]*\n)*\s*siml\b/.test(s)) rot = parseText(s, W);
    else return done([], 'That is not an APL rotation: it should start with "siml 1" (the rotation text) or be JSON.');
    if (rot.type === 'TypeAuto' || rot.type === 'TypeSimple') W.warn('The rotation is the other sim\'s automatic one (' + rot.type + '): only its APL list is read');
    if ((rot.prepullActions || []).length && !/prepull/i.test(W.warnings.join())) W.warn('Prepull rows are left out (a precast is set in Fight & pets → Precast here)');
    var RD = new Reader(rot, cfg, W), out = [];
    RD.rows(rot.priorityList || [], { when: [], ph: {} }, out);
    RD.where = '';
    // the first line that is always cast is the filler: the rest is never reached
    var fi = -1;
    for (var i = 0; i < out.length; i++) {
      var l = out[i];
      if (l.act ? WL.ACTIONS[l.act] && WL.ACTIONS[l.act].filler && !l.extra : !l.when) {
        if (!l.act && l.spell === 'lifeTap') { W.warn((l.where || 'A row') + ': Life Tap with no condition would tap all fight — left out (this sim taps by itself when mana is short)'); out.splice(i--, 1); continue; }
        fi = i; break;
      }
    }
    if (fi >= 0 && fi < out.length - 1) {
      out.slice(fi + 1).forEach(function (l) {
        if (!l.act && l.spell === 'lifeTap' && !l.when) W.note('The Life Tap under the filler is left out: this sim taps by itself when mana is short.');
        else W.warn((l.where || 'A row') + ': comes after the filler (a row that is always cast), so it is never reached — left out');
      });
      out = out.slice(0, fi + 1);
    }
    out.forEach(function (l) { delete l.where; delete l.mk; });
    if (!out.length) return done([], 'Nothing in it is a spell this sim casts in its priority.');
    return done(out);
  };

  // ======================================== lines → a build ========================================
  // An APL line → its priority entry: the simple action it matches (its numbers and extra condition set on the build), or a
  // line of your own (a rule). A named line stays yours. others = the other entries of the priority. (Was app.js aplEntry.)
  WL.aplEntry = function (b, r, others) {
    var m = r.name ? null : WL.aplMatch(r, b, WL.expandGroups(b, others));
    if (m) {
      if (m.params) { b.params = b.params || {}; b.params[m.key] = Object.assign({}, WL.actionParams(b, m.key), m.params); }
      if (m.extra) { b.actWhen = b.actWhen || {}; b.actWhen[m.key] = m.extra; }
      else if (b.actWhen) { delete b.actWhen[m.key]; if (!Object.keys(b.actWhen).length) delete b.actWhen; }
      return { key: m.key, simple: true };
    }
    b.rules = b.rules || []; b.rules.push(r); return { key: 'rule:' + (b.rules.length - 1), simple: false };
  };
  WL.aplToBuild = function (lines, base) {
    var warnings = [], warn = function (s) { if (warnings.indexOf(s) < 0) warnings.push(s); }, t = (base && base.talents) || {};
    var fresh = function () {
      var b = { short: base.short, talents: clone(t), pet: base.pet || null, sacrifice: base.sacrifice || null, oil: base.oil, rotation: [] };
      if (base.timeline && base.timeline.length) b.timeline = clone(base.timeline);
      return b;
    };
    var pass = function (ctxRot) {
      var b = fresh(), keys = [];
      b.rotation = ctxRot.slice();                              // what the actions' lines read while matching (Immolate and conflagrateExpire)
      // a line with no condition keeps its plain action (the filler): an earlier line of the same spell with a condition is not
      // matched to that action with an extra condition (it would take the filler's action)
      var later = lines.map(function (l) { if (l.act || l.when) return null; var m = WL.aplMatch({ spell: l.spell }, b, []); return m && !m.extra ? m.key : null; });
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        if (l.act) {
          var need = (WL.ACTION_TALENTS[l.act] || []).filter(function (k) { return !t[k]; });
          if (need.length) { warn('"' + WL.ACTIONS[l.act].label.replace(/_/g, '…') + '" needs ' + need.map(function (k) { return WL.TALENT_BY_KEY[k].name; }).join(' and ') + ', which this build does not have — left out'); continue; }
          keys.push(l.act);
          if (l.params) { b.params = b.params || {}; b.params[l.act] = Object.assign({}, WL.actionParams(b, l.act), l.params); }
          if (l.extra) { b.actWhen = b.actWhen || {}; b.actWhen[l.act] = l.extra; }
          continue;
        }
        var s = WL.SPELLS[l.spell];
        if (!s || WL.RULE_SPELLS.indexOf(l.spell) < 0) { warn('"' + l.spell + '" is not a spell of this sim — left out'); continue; }
        if (s.talent && !t[s.talent]) { warn(s.name + ' needs the ' + WL.TALENT_BY_KEY[s.talent].name + ' talent, which this build does not have — left out'); continue; }
        var bl = WL.aplLines('bane', b), nx = lines[i + 1];     // two lines that are "Bane of Doom, else Bane of Agony"
        if (nx && !nx.act && keys.indexOf('bane') < 0 && JSON.stringify([{ spell: l.spell, when: l.when }, { spell: nx.spell, when: nx.when }]) === JSON.stringify(bl)) { keys.push('bane'); i++; continue; }
        var r = { spell: l.spell }; if (l.when) r.when = clone(l.when);
        keys.push(WL.aplEntry(b, r, keys.concat(later.slice(i + 1).filter(Boolean))).key);
      }
      b.rotation = keys;
      return b;
    };
    var b1 = pass([]), b = pass(b1.rotation);
    var rot = WL.expandGroups(b);
    if (!rot.some(function (a) { var A = WL.actionOf(a, b); return A && A.filler; })) {
      var bf = WL.expandGroups(base).filter(function (a) { var A = WL.actionOf(a, base); return A && A.filler && WL.ACTIONS[a]; })[0] || 'shadowBolt';
      b.rotation.push(bf);
      warn('No row is always cast (a filler): "' + WL.ACTIONS[bf].label + '" from the build was added at the end');
    }
    b.params = WL.cleanParams(b.params, b.rotation);
    if (b.actWhen && !Object.keys(b.actWhen).length) delete b.actWhen;
    if (b.rules && !b.rules.length) delete b.rules;
    return { build: b, warnings: warnings, errors: WL.validateBuild(b) };
  };
  WL.APL_IO = { hash: hash, canon: canon, parseText: function (t) { var W = warnBag(); return { rotation: parseText(t, W), warnings: W.warnings }; }, SELF_AURAS: SELF_AURAS, TARGET_AURAS: TARGET_AURAS, TALENT_IDS: TALENT_IDS };
})();
