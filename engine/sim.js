// Event-driven fight simulation: one boss, optionally 1-2 extra targets (Bane of Havoc / multi-DoT, A60/A61).
// One call to WL.simulateOnce = one fight. WL.simulate = many fights (Monte-Carlo) averaged.
// Event order at equal timestamps: periodic ticks (0) -> cast completions (1) -> player decisions (2).
window.WL = window.WL || {};

(function () {
  // ---------- tiny binary heap ----------
  function Heap() { this.a = []; this.seq = 0; }
  Heap.prototype.push = function (ev) {
    ev.seq = this.seq++; var a = this.a; a.push(ev); var i = a.length - 1;
    while (i > 0) { var p = (i - 1) >> 1; if (less(a[i], a[p])) { var x = a[i]; a[i] = a[p]; a[p] = x; i = p; } else break; }
  };
  Heap.prototype.pop = function () {
    var a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; var i = 0;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && less(a[l], a[m])) m = l;
        if (r < a.length && less(a[r], a[m])) m = r;
        if (m === i) break; var x = a[i]; a[i] = a[m]; a[m] = x; i = m;
      }
    }
    return top;
  };
  function less(x, y) { var d = x.t - y.t; if (d < -1e-9) return true; if (d > 1e-9) return false; return x.o < y.o || (x.o === y.o && x.seq < y.seq); }

  var EPS = 1e-9;

  // Custom cooldown timeline (options.activesTimeline, rounds 92–93) as { slot: [sorted times ≥ 0] }. Slots: 'racial', 'pi',
  // and one per consumable key. The round 92 names are mapped: potion → the ticked potion (else the Spellblasting
  // potion), rune → Demonic Rune, sapper → Goblin Sapper, explosive → the ticked explosive (else Dense Dynamite);
  // a list under the item's own key wins. Used by the engine and the page.
  WL.activesTimelineOf = function (cfg) {
    var src = (cfg.options && cfg.options.activesTimeline) || {}, C = cfg.consumables || {}, out = {};
    var first = function (test, fallback) { var k = Object.keys(C).filter(function (x) { return C[x].on && test(C[x]); })[0]; return k || fallback; };
    var legacy = { potion: first(function (c) { return c.cdGroup === 'potion'; }, 'majorSpellblasting'), rune: 'demonicRune', sapper: 'goblinSapper',
                   explosive: first(function (c) { return c.explosive && c.explosive.cdGroup !== 'sapper'; }, 'denseDynamite') };
    var put = function (k, v) {
      var a = (Array.isArray(v) ? v : []).map(Number).filter(function (x) { return isFinite(x) && x >= 0; }).sort(function (x, y) { return x - y; });
      if (a.length) out[k] = a;
    };
    Object.keys(src).forEach(function (k) { if (legacy[k]) put(legacy[k], src[k]); });
    Object.keys(src).forEach(function (k) { if (!legacy[k]) put(k, src[k]); });
    return out;
  };

  WL.simulateOnce = function (build, raceKey, cfg, opt) {
    opt = opt || {};
    var stats = opt.stats || WL.computeStats(build, raceKey, cfg);
    var table = opt.table || WL.buildSpellTable(build, stats, cfg);
    var SPELLS = WL.spellsFor(cfg);                                      // trainer ranks, or the AQ20 book ranks (round 42)
    var isSB = WL.isShadowBolt;                                          // Shadow Bolt (only Rank 9 since round 81)
    // Independent random streams per roll type (common random numbers for stat weights):
    // changing hit only moves hit rolls, changing crit only moves crit rolls, etc.
    var seed0 = opt.seed != null ? opt.seed : Math.floor((opt.rng || WL.makeRng(cfg.fight.seed))() * 4294967296);
    var R = { hit: WL.makeRng(seed0 ^ 0x1B873593), crit: WL.makeRng(seed0 ^ 0x85EBCA6B), proc: WL.makeRng(seed0 ^ 0xC2B2AE35),
              vuln: WL.makeRng(seed0 ^ 0x27D4EB2F), pet: WL.makeRng(seed0 ^ 0x165667B1),
              jow: WL.makeRng(seed0 ^ 0x3C6EF372),                                                     // Judgement of Wisdom (own stream, round 38)
              isb: WL.makeRng(seed0 ^ 0x9E3779B9),                                                     // ISB debuff hit roll (own stream, round 54)
              push: WL.makeRng(seed0 ^ 0x61C88647) };                                                  // damage taken / pushback (own stream, round 78)
    var dur = opt.duration || cfg.fight.duration, cb = cfg.combat;                                    // per-fight length [A56]
    var race = WL.RACES[raceKey];
    var TVC = {};
    var tv = function (k, f) { var c = TVC[k] || (TVC[k] = {}), q = f || '', v = c[q]; if (v === undefined) v = c[q] = WL.talentValue(build, k, f); return v; };
    var logOn = !!opt.log, log = [];
    var H = new Heap();

    // ---------- state ----------
    var S = {
      t: 0, remaining: dur, cfg: cfg, build: build,
      mana: stats.maxMana, shards: cfg.fight.startingShards,
      busyUntil: 0, gcdReady: 0, lastRegen: 0,
      cds: {}, dots: {}, buffs: {}, channel: null, eurekaCharges: 0, eurekaPending: 0,
      targetHpPct: 100,
    };
    var inst = 0, decideToken = 0;
    var res = { bySpell: {}, lifeTaps: 0, manaFromTaps: 0, minMana: stats.maxMana, total: 0, oom: 0, clipped: 0, idle: 0, pushbacks: 0, pushbackTime: 0, pushResisted: 0, vulnHits: {}, petOomTime: 0, exDmg: 0 };

    function row(key) {
      return res.bySpell[key] || (res.bySpell[key] = { casts: 0, landed: 0, misses: 0, crits: 0, hits: 0, ticks: 0, tickCrits: 0, dmg: 0, castTime: 0, glances: 0 });
    }
    function L(type, spell, extra) {
      if (!logOn) return;
      var e = { t: +S.t.toFixed(3), type: type, spell: spell, mana: Math.round(S.mana) };
      if (P && P.c.spell) { petRegen(); e.petMana = Math.round(P.mana); }       // mana graph (W3)
      if (extra) for (var k in extra) e[k] = extra[k];
      log.push(e);
    }

    // ---------- helpers exposed to rotation conditions ----------
    S.has = function (k) { return !!table[k]; };
    S.ready = function (k) { return !S.cds[k] || S.cds[k] <= S.t + EPS; };
    S.buff = function (n) { return S.buffs[n] != null && S.buffs[n] > S.t + EPS; };
    S.dotLeft = function (k) { var d = S.dots[k]; return d && d.expires > S.t + EPS ? d.expires - S.t : 0; };
    S.hasteFactor = function () { return (1 + stats.hastePct / 100) * (S.buff('berserking') ? 1 + racialOf('cooldown').hastePct / 100 : 1); };
    S.castTime = function (k) {
      var c = table[k].cast;
      if (k === 'soulFire' && S.buff('decimation')) c *= 1 - tv('decimation', 'sfCastRedPct') / 100;   // [A23]
      if (isSB(k) && S.buff('shadowTrance')) c = 0;                                          // [A21]
      return c / S.hasteFactor();
    };
    S.gcd = function () { return Math.max(cb.minGcd, cb.gcd / S.hasteFactor()); };                    // [A08]
    function racialOf(effect) { return race.racials.filter(function (r) { return r.effect === effect; })[0] || null; }

    // ---------- aura tracking: uptime seconds (W4) and exact intervals for the fight-#1 timeline (W5) ----------
    // State only changes at events, so between two events every buff/DoT is either on or off until its expiry.
    var up = {}, iv = logOn ? {} : null, DOTK = {};
    function auraAdd(k, a, b) {
      if (b <= a + EPS) return;
      up[k] = (up[k] || 0) + (b - a);
      if (iv) { var l = iv[k] || (iv[k] = []), last = l[l.length - 1]; if (last && Math.abs(last[1] - a) < 1e-6) last[1] = b; else l.push([a, b]); }
    }
    function trackAuras(prev, t) {
      if (t <= prev + EPS) return;
      for (var k in S.buffs) { var e = S.buffs[k]; if (e > prev + EPS && (k !== 'brand' || S.brandCharges > 0)) auraAdd(k, prev, Math.min(t, e)); }
      for (var d in S.dots) { var x = S.dots[d]; if (x.expires > prev + EPS) auraAdd(DOTK[d] || (DOTK[d] = 'dot:' + d), prev, Math.min(t, x.expires)); }
      for (var tj in S.xdots) for (var d2 in S.xdots[tj]) { var y = S.xdots[tj][d2]; if (y.expires > prev + EPS) auraAdd('dot' + tj + ':' + d2, prev, Math.min(t, y.expires)); }
      for (var tk in S.xdeb) for (var nm in S.xdeb[tk]) { var ex = S.xdeb[tk][nm]; if (ex > prev + EPS) auraAdd('deb' + tk + ':' + nm, prev, Math.min(t, ex)); }
      if (eurekaUp()) auraAdd('eureka', prev, t);
    }

    function updateTime(t) {
      trackAuras(S.t, Math.min(t, dur));
      S.t = t; S.remaining = Math.max(0, dur - t);
      S.targetHpPct = 100 * (1 - t / dur);                                                               // [A24]
      if (stats.mp5) { S.mana = Math.min(stats.maxMana, S.mana + stats.mp5 / 5 * (t - S.lastRegen)); }  // [A11]
      S.lastRegen = t;
    }

    // ---------- damage ----------
    // Eureka! (Gnome) is a live aura (user, round 38): +10% to your direct hits and channel ticks — round 80 (user, Forever
    // patch): "Eureka! no longer benefits periodic effects at all. Channeled spells do not count as periodics." → DoT ticks
    // (Corruption, Banes, Siphon Life, Immolate's burn) get nothing; rounds 38–79 they got +10% too — from the pop until the
    // 3rd empowered spell has been cast (landed; a channel: ended).
    // Nothing is snapshotted. Its mana discount still applies to those 3 casts. [A31]
    // Round 42: the buff lasts at most 15 s (spell 1259821 "Duration 15 seconds"): an 'eurekaEnd' event at pop + 15 s
    // removes unused charges and the aura (casts still in flight then land without it).
    function eurekaUp() { return S.eurekaCharges > 0 || S.eurekaPending > 0; }
    function eurekaRelease() { if (S.eurekaPending > 0) S.eurekaPending--; }
    // Eureka!'s +10% is a talent-style spell modifier (spell 1259821: "Modifies Damage/Healing Done" + "Modifies Periodic
    // Damage/Healing Done"), so it ADDS to the spell's own modifier group (op0 for hits, op22 for ticks) instead of
    // multiplying on top (round 43, A68): factor = (1 + group + 10%) / (1 + group).
    function eurekaMult(key, periodic) {
      var cd = racialOf('cooldown');
      if (!(cd && cd.charges && eurekaUp())) return 1;
      if (periodic && SPELLS[key].kind !== 'channel') return 1;                          // DoT ticks: no bonus (round 80) [A31]
      var e = table[key], g = e ? (periodic ? e.op22 : e.op0) || 0 : 0;
      return (1 + g + cd.dmgPct / 100) / (1 + g);
    }
    // Additive spell-modifier bonus applied live (Decimation, round 43): (1 + group + pct) / (1 + group).
    function addOp0(key, pct) { var g = (table[key] && table[key].op0) || 0; return (1 + g + pct / 100) / (1 + g); }
    function liveMult(key, periodic) {
      var s = SPELLS[key], m = eurekaMult(key, periodic);
      if (S.buff('coe')) m *= 1 + SPELLS.curseOfElements.dmgTakenPct / 100;                          // [A34]
      if (PI && S.buff('powerInfusion')) m *= 1 + PI.spellDmgPct / 100;                                    // Power Infusion
      if (s.school === 'shadow' && S.buff('isb')) m *= 1 + tv('improvedShadowBolt', 'debuffPct') / 100;  // [A20]
      if (s.school === 'shadow' && S.buff('snfShadow')) m *= 1 + tv('shadowAndFlame', 'schoolPct') / 100; // [A22]
      if (s.school === 'fire' && S.buff('snfFire')) m *= 1 + tv('shadowAndFlame', 'schoolPct') / 100;
      if (periodic && S.channel && S.channel.key === 'wrack' && SPELLS.wrack.debuffSpells.indexOf(key) >= 0)
        m *= 1 + SPELLS.wrack.debuffPct / 100;                                                        // [A18]
      if (s.drain && tv('soulSiphon')) {                                                                 // [A19]
        var n = 0;
        WL.SOUL_SIPHON_EFFECTS.forEach(function (e) { if (e === 'curseOfElements' ? S.buff('coe') : S.dotLeft(e) > 0) n++; });
        m *= 1 + Math.min(n * tv('soulSiphon', 'perEffectPct'), tv('soulSiphon', 'maxPct')) / 100;
      }
      return m;
    }
    // Raid buffs / boss debuffs from other players. [A53][A54][A55]
    var armorRed = WL.armorReduction(cfg);
    var buffList = WL.activeBuffs(cfg);
    var PI = buffList.filter(function (b) { return b.spellDmgPct; })[0] || null;
    var manaBuffs = buffList.filter(function (b) { return b.tide || b.innervate; }).map(function (b) { return { b: b, used: false }; });
    function manaBuffCheck() {
      if (!manaBuffs.length || S.mana >= 0.5 * stats.maxMana) return;
      manaBuffs.forEach(function (mb) {
        if (mb.used) return; mb.used = true;
        if (mb.b.tide) for (var i = 0; i < mb.b.tide.ticks; i++) H.push({ t: S.t + i * mb.b.tide.every, o: 0, type: 'mana', amount: mb.b.tide.amount, src: mb.b.name });
        if (mb.b.innervate) {
          var perTick = (cb.spiritRegenBase + cb.spiritRegenPerSpi * stats.spi) * mb.b.innervate.mult;   // per 2 s
          for (var j = 1; j <= mb.b.innervate.duration / 2; j++) H.push({ t: S.t + j * 2, o: 0, type: 'mana', amount: perTick, src: mb.b.name });
        }
        L('buff', mb.b.name);
      });
    }
    // Consumables used during the fight: Spellblasting Potion (SP), mana potions / runes (mana). [A57]
    var conList = WL.activeConsumables(cfg);
    var spPot = conList.filter(function (c) { return c.spPotion; })[0] || null;
    var manaItems = conList.filter(function (c) { return c.manaRestore; });
    function potSp() { return spPot && S.buff('spPotion') ? spPot.spPotion.sp : 0; }
    // When the short cooldowns are popped for the first time (round 87, user; options.activesPolicy, A77): racial
    // cooldown, Spellblasting potion, Power Infusion. Once open, each is used again whenever it is ready.
    //   'pull'    right before the first damaging spell (the rule until round 86)
    //   'doom'    when the first Bane of Doom explodes: right before the cast the explosion falls into (so live effects
    //             cover it) or the first cast after it. At the pull if this build never casts Doom, if a Bane of Agony
    //             went up instead, or if Doom will not explode before the fight ends.
    //   'execute' once the boss is below fight.executePct
    //   'custom'  (round 92, user) a cooldown timeline, options.activesTimeline: per slot — racial (or racial_orc /
    //             racial_troll / racial_gnome with options.activesRacialSplit, round 95), pi and one per consumable key
    //             (round 93) — the times at which you use it. A slot is held until its next placed time and used at
    //             the first chance from then on; after its last placed use it is automatic again (whenever ready / the
    //             usual mana rule / on cooldown). Slots without a placed use: as usual — buffs by the 'doom' rule.
    var ACT_POL = (cfg.options && cfg.options.activesPolicy) || 'pull', actOpen = ACT_POL === 'pull', doomSeen = false;
    var ACT_DOOM = null;                                                   // does this build ever cast Bane of Doom? (set on first use: ROT is built below)
    var ACT_TL = null;                                                     // custom timeline: slot → { t: sorted times, i: next one }
    if (ACT_POL === 'custom') {
      ACT_TL = {};
      var tlSrc = WL.activesTimelineOf(cfg);
      Object.keys(tlSrc).forEach(function (k) { ACT_TL[k] = { t: tlSrc[k], i: 0 }; });
    }
    // 0 = hold (a placed use is still ahead) · 1 = a placed time has come: use it now · 2 = automatic (nothing placed, or
    // every placed use is done). Without a custom timeline always 2.
    var RSLOT = cfg.options && cfg.options.activesRacialSplit ? 'racial_' + raceKey : 'racial';   // racial slot: shared, or one per race (round 95)
    function slotGate(k) { var sl = ACT_TL && ACT_TL[k]; if (!sl || sl.i >= sl.t.length) return 2; return S.t >= sl.t[sl.i] - EPS ? 1 : 0; }
    function slotUsed(k) { var sl = ACT_TL && ACT_TL[k]; if (sl && sl.i < sl.t.length && S.t >= sl.t[sl.i] - EPS) sl.i++; }
    // Racial cooldown, Spellblasting potion and Power Infusion, right before a damaging cast.
    function popActives(key) {
      if (!ACT_TL) { if (activesOk(key)) { useRacials(key); useSpPotion(); usePowerInfusion(); } return; }
      var g = slotGate(RSLOT);
      if (g === 1 || (g === 2 && (ACT_TL[RSLOT] || activesOk(key)))) { if (useRacials(key)) slotUsed(RSLOT); }
      if (spPot) {
        g = slotGate(spPot.key);
        if (g === 1 || (g === 2 && (ACT_TL[spPot.key] || activesOk(key)))) { if (useSpPotion()) slotUsed(spPot.key); }
      }
      g = slotGate('pi');
      if (g === 1 || (g === 2 && (ACT_TL.pi || activesOk(key)))) { if (usePowerInfusion()) slotUsed('pi'); }
    }
    function activesOk(key) {
      if (actOpen) return true;
      if (ACT_POL === 'execute') return actOpen = S.targetHpPct < cfg.fight.executePct;
      if (ACT_DOOM === null) ACT_DOOM = ROT.indexOf('bane') >= 0 || (build.timeline || []).some(function (e) { return e.k === 'baneOfDoom'; });
      var d = S.dots.baneOfDoom;                                           // 'doom'
      if (d) doomSeen = true;
      if (!d || d.expires <= S.t + EPS) return actOpen = doomSeen || !ACT_DOOM || !!S.dots.baneOfAgony;
      var toBoom = d.expires - S.t, sp = SPELLS[key], len = sp.kind === 'channel' ? sp.duration : Math.max(S.castTime(key), S.gcd());
      return actOpen = toBoom > S.remaining || toBoom <= len + EPS;
    }
    function usePowerInfusion() {
      if (!PI || !S.ready('powerInfusion')) return false;
      S.cds.powerInfusion = S.t + PI.cd; S.buffs.powerInfusion = S.t + PI.duration;
      L('buff', PI.name);
      return true;
    }
    function useSpPotion() {
      if (!spPot || !S.ready('cd:' + spPot.cdGroup)) return false;
      S.cds['cd:' + spPot.cdGroup] = S.t + spPot.cd; S.buffs.spPotion = S.t + spPot.spPotion.duration;
      L('consumable', spPot.name);
      return true;
    }
    // Mana potion / rune: when at least their amount of mana is missing. On a custom timeline (round 92) a placed use is
    // taken at its time as soon as any mana is missing (the gain is capped at the missing mana).
    function useManaItems() {
      manaItems.forEach(function (c) {
        var amt = c.manaRestore.amount || stats.maxMana * c.manaRestore.pct / 100, miss = stats.maxMana - S.mana;
        var slot = c.key, g = slotGate(slot);
        if (g === 0 || !S.ready('cd:' + c.cdGroup) || (g === 1 ? miss <= EPS : miss < amt)) return;
        if (amt > miss) amt = miss;
        S.cds['cd:' + c.cdGroup] = S.t + c.cd; S.mana += amt;
        res.manaFromConsumables = (res.manaFromConsumables || 0) + amt;
        L('consumable', c.name, { gain: Math.round(amt) });
        slotUsed(slot);
      });
    }
    // Engineering explosives (W14, A59): thrown on cooldown; instant, 1 s item GCD; fixed damage (no spell power or
    // talents), spell hit roll, crit at the character-sheet crit ×1.5, Curse of the Elements applies.
    var explosives = conList.filter(function (c) { return c.explosive; });
    function useExplosive() {
      if (S.t >= dur - EPS) return false;
      for (var i = 0; i < explosives.length; i++) {
        var c = explosives[i], x = c.explosive, key = 'item:' + c.key, r = row(key), xslot = c.key;
        if (!S.ready('cd:' + x.cdGroup) || slotGate(xslot) === 0) continue;           // custom timeline: held for its placed time
        S.cds['cd:' + x.cdGroup] = S.t + x.cd; slotUsed(xslot);
        r.casts++; r.castTime += cb.minGcd;
        S.busyUntil = S.t; S.gcdReady = S.t + cb.minGcd;
        L('cast', key, { castTime: 0, gcd: cb.minGcd });
        if (R.hit() * 100 >= stats.hitPct) { r.misses++; L('miss', key); }
        else {
          r.landed++;
          var amt = x.min + (x.max - x.min) * R.proc();
          if (S.buff('coe')) amt *= 1 + SPELLS.curseOfElements.dmgTakenPct / 100;
          var crit = R.crit() * 100 < cfg.gear.critPct;
          if (crit) amt *= cb.critMultiplier;
          deal(key, amt, crit, false);
          L('hit', key, { dmg: Math.round(amt), crit: crit });
        }
        scheduleDecide(S.gcdReady);
        return true;
      }
      return false;
    }
    // Your spell power right now for this spell: sheet + school + Spellblasting potion, × Blood Fury. [A32]
    // Round 96 (user: in Forever every DoT is dynamic, unlike Classic): periodic ticks — DoTs incl. the Bane of Doom explosion,
    // and channels — read it when the tick lands, like a direct hit does when it is cast; nothing is kept from the cast. [A13]
    function spNow(e) { return (e.sp + potSp()) * (S.buff('bloodFury') ? 1 + racialOf('cooldown').spPct / 100 : 1); }

    // Resistance / Spell Pierce roll for one Warlock damage event. [A43][A44]
    var resCache = {}, lastVulnPct = 0;                 // vulnerable (+) / partially resisted (−) step of the last roll (log marker)
    // `ti` > 1 = an extra target: its own Curse of the Elements counts (round 39; the boss's CoE does not carry over).
    function vulnMult(school, ti) {
      var coe = ti > 1 ? S.xDebLeft(ti, 'coe') > 0 : S.buff('coe'), key = school + (coe ? '1' : '0');
      var pr = resCache[key] || (resCache[key] = WL.resistProfile(cfg, stats.pierce, school, coe));
      var m = pr.flat;
      lastVulnPct = 0;
      if (pr.dist.length > 1) {
        var x = R.vuln(), acc = 0;
        for (var i = 0; i < pr.dist.length; i++) { acc += pr.dist[i].p; if (x < acc || i === pr.dist.length - 1) { m *= 1 + pr.dist[i].pct / 100; lastVulnPct = pr.dist[i].pct; res.vulnHits[pr.dist[i].pct] = (res.vulnHits[pr.dist[i].pct] || 0) + 1; break; } }
      }
      return m;
    }
    // Log fields for a hit: the vulnerable part of the final damage (crit included) = dmg × pct / (100 + pct);
    // a partial resist (round 39): the resisted part = dmg × r / (100 − r) (a full resist: dmg is 0, amount unknown).
    function vulnLog(amt) {
      if (lastVulnPct > 0) return { vulnPct: lastVulnPct, vulnDmg: Math.round(amt * lastVulnPct / (100 + lastVulnPct)) };
      if (lastVulnPct < 0) { var r = -lastVulnPct; return { resistPct: r, resistDmg: r < 100 ? Math.round(amt * r / (100 - r)) : null }; }
      return {};
    }

    // Second target (W11, A60): with 2 targets and the Bane of Havoc talent, 15% of all damage the Warlock (not the pet)
    // deals to the main target is also dealt to the Havoc target. Counted as its own damage line; no AoE/multi-DoT modelled.
    var HAV = (cfg.fight.targets || 1) >= 2 && tv('baneOfHavoc') > 0 && table.baneOfHavoc ? SPELLS.baneOfHavoc.havocPct / 100 : 0;
    // Multi-DoT (round 27, A61): up to 3 targets. Extra targets (2, 3) get their own DoTs via the `multiDot` action
    // (added before the filler when fight.multiDot is on). Havoc sits on target 2 and only copies damage dealt to OTHER
    // targets; target 2 cannot also carry Bane of Agony (one Bane per target). Extra targets live the whole fight and
    // carry none of the boss's debuffs (Curse of the Elements, Improved Shadow Bolt); your own buffs still apply.
    var NT = Math.max(1, Math.min(3, cfg.fight.targets || 1));
    var HAV_T = HAV ? 2 : 0;
    var ROT = WL.effectiveRotation(build, cfg);
    // Fight timeline (round 70, user; A73): an optional list of spells at fixed start times, built in the editor's
    // "super advanced" mode. A due entry is cast before the priority; the priority fills the gaps (only casts that end before
    // the next entry is due) and takes over after the timeline ends; a timeline cast that misses gives the priority one
    // turn (e.g. to recast a missed Immolate). Short on mana → Life Tap first, the rest of the timeline runs later.
    var TL = build.timeline && build.timeline.length
      ? { list: build.timeline.slice().sort(function (a, b) { return a.t - b.t; }), i: 0, turn: false, wake: null } : null;
    S.xdots = {}; S.xdeb = {}; for (var ti0 = 2; ti0 <= NT; ti0++) { S.xdots[ti0] = {}; S.xdeb[ti0] = {}; }
    S.multiTargets = NT; S.havocTarget = HAV_T; S.nextTarget = 0;
    S.xDotLeft = function (ti, key) { var d = S.xdots[ti] && S.xdots[ti][key]; return d && d.expires > S.t + EPS ? d.expires - S.t : 0; };
    // Per-target debuffs on extra targets (round 39): 'coe' = your Curse of the Elements there, 'isb' = Improved Shadow
    // Bolt from a Shadow Bolt crit on that target. Values are expiry times.
    S.xDebLeft = function (ti, name) { var e = S.xdeb[ti] && S.xdeb[ti][name]; return e && e > S.t + EPS ? e - S.t : 0; };
    function xkey(ti, key) { return 'x' + ti + ':' + key; }   // damage / log key of a spell on an extra target
    function deal(key, amount, crit, isTick, target) {
      var r = row(key);
      r.dmg += amount; res.total += amount;
      if (isTick) { r.ticks++; if (crit) r.tickCrits++; } else { r.hits++; if (crit) r.crits++; }
      var copied = 0;
      if (HAV && key.indexOf('pet:') !== 0 && target !== HAV_T && S.buff('havoc')) { var h = row('baneOfHavoc'); copied = amount * HAV; h.dmg += copied; h.hits++; res.total += copied; }
      if (S.targetHpPct < cfg.fight.executePct) res.exDmg += amount + copied;       // execute-phase damage (round 44)
    }

    // ---------- scheduling ----------
    // Encounter options (W11, A60): reaction latency after each of your actions, movement phases, second target.
    var LAT = Math.max(0, (cfg.fight.latencyMs || 0) / 1000);
    // Travel time of projectile spells (round 39, A65): Shadow Bolt, Soul Fire, Incinerate, Death Coil and the Imp's
    // Firebolt hit `travelMs` after they leave the caster. Default 0 = standing right in front of the boss (user).
    var TRAVEL = Math.max(0, (cfg.fight.travelMs || 0) / 1000);
    function scheduleDecide(t) { decideToken++; H.push({ t: t > EPS ? t + LAT : t, o: 2, type: 'decide', token: decideToken }); }
    // Movement: from `moveEvery` s on, every `moveEvery` s you move for `moveDuration` s. While moving only instants can be
    // cast; a cast or channel is only started if it ends before the next movement phase (you plan around it).
    var MV = cfg.fight.moveEvery > 0 && cfg.fight.moveDuration > 0 ? { every: cfg.fight.moveEvery, dur: cfg.fight.moveDuration } : null;
    function isMoving(t) { if (!MV) return false; var k = Math.floor((t + EPS) / MV.every); return k >= 1 && t + EPS - k * MV.every < MV.dur; }
    function canCastNow(k) {
      if (!MV) return true;
      var s = SPELLS[k], len = s && s.kind === 'channel' ? s.duration : S.castTime(k);
      if (len <= EPS) return true;                                            // instants are fine while moving
      if (isMoving(S.t)) return false;
      var next = (Math.floor((S.t + EPS) / MV.every) + 1) * MV.every;
      return S.t + len <= next + EPS;
    }
    S.isMoving = function () { return isMoving(S.t); };

    // Damage taken → pushback (round 78, user; A76). Every `hitEvery` s (first hit at a random point of the first
    // interval) you take a direct hit. Casting: the cast is pushed back 1.0 / 0.8 / 0.6 / 0.4 / 0.2 s, then 0.2 s for
    // every later hit of the same cast (no cap on the number of hits), but never further back than its start.
    // Channeling: the channel loses 25% of its full duration per hit (and the ticks in it). Instants / idle: no effect.
    // Protection: Intensity (Destruction spells), Fel Concentration (Drain Life, Drain Soul, Wrack) and Concentration
    // Aura (all spells) add up, at most 100%; one roll per hit.
    var HIT = cfg.fight.hitEvery > 0 ? cfg.fight.hitEvery : 0;
    var AURA_PUSH = Object.keys(cfg.buffs || {}).reduce(function (a, k) { var b = cfg.buffs[k]; return a + (b.on && b.pushbackResistPct ? b.pushbackResistPct : 0); }, 0);
    var FEL_CONC = { drainLife: 1, drainSoul: 1, wrack: 1 };
    S.cast = null;                                                            // the cast-time spell being cast (pushback)
    function pushResistPct(key) {
      var s = SPELLS[key], p = AURA_PUSH;
      if (s.tree === 'destruction') p += tv('intensity', 'resistPct');
      if (FEL_CONC[key]) p += tv('felConcentration', 'resistPct');
      return Math.min(100, p);
    }
    function takeHit() {
      var c = S.channel, k = c ? c.key : (S.cast && S.t < S.cast.end - EPS ? S.cast.key : null);
      if (!k) return;
      var pr = pushResistPct(k);
      if (pr > 0 && R.push() * 100 < pr) { res.pushResisted++; L('pushResist', k, { pct: pr }); return; }
      var lost;
      if (c) {
        var newEnd = Math.max(S.t, c.end - 0.25 * SPELLS[k].duration);
        lost = c.end - newEnd; c.end = newEnd;
        row(k).castTime -= lost;
        H.push({ t: c.end, o: 1, type: 'chanEnd', inst: c.inst });
        L('pushback', k, { cut: +lost.toFixed(3) });
      } else {
        var cs = S.cast, step = Math.max(0.2, 1 - 0.2 * cs.n), end = Math.min(cs.end + step, S.t + cs.full);
        lost = end - cs.end; cs.n++;
        if (lost <= EPS) return;
        cs.end = end; cs.ev.dead = true;
        if (table[cs.key] && table[cs.key].cd && S.cds[cs.key]) S.cds[cs.key] += lost;   // its cooldown starts at the later cast end (round 107)
        cs.ev = Object.assign({}, cs.ev, { t: cs.ev.t + lost, dead: false });
        H.push(cs.ev);
        row(cs.rk).castTime += lost;
        L('pushback', k, { delay: +lost.toFixed(3) });
      }
      res.pushbacks++; res.pushbackTime += lost;
      S.busyUntil = c ? c.end : S.cast.end;
      scheduleDecide(Math.max(S.busyUntil, S.gcdReady));
    }

    function applyDot(key, snap) {
      var s = SPELLS[key], e = table[key], id = ++inst;
      if (s.bane) { delete S.dots.baneOfAgony; delete S.dots.baneOfDoom; }                               // one Bane per target
      S.dots[key] = { inst: id, applied: S.t, expires: S.t + s.duration, tick: 0, ticks: e.ticks, snap: snap };
      for (var i = 1; i <= e.ticks; i++) H.push({ t: S.t + i * s.tickEvery, o: 0, type: 'dotTick', key: key, inst: id, i: i - 1 });
    }

    // ---------- extra targets (multi-DoT, round 27; per-target CoE / ISB, round 39) ----------
    // Your own buffs apply there (Eureka!, Power Infusion, Shadow and Flame) plus that target's own Curse of the Elements
    // and Improved Shadow Bolt; the boss's debuffs and channel-based effects (Wrack, Soul Siphon) do not.
    function liveMultX(key, ti, periodic) {
      var s = SPELLS[key], m = eurekaMult(key, periodic);
      if (S.xDebLeft(ti, 'coe') > 0) m *= 1 + SPELLS.curseOfElements.dmgTakenPct / 100;
      if (s.school === 'shadow' && S.xDebLeft(ti, 'isb') > 0) m *= 1 + tv('improvedShadowBolt', 'debuffPct') / 100;
      if (PI && S.buff('powerInfusion')) m *= 1 + PI.spellDmgPct / 100;
      if (s.school === 'shadow' && S.buff('snfShadow')) m *= 1 + tv('shadowAndFlame', 'schoolPct') / 100;
      if (s.school === 'fire' && S.buff('snfFire')) m *= 1 + tv('shadowAndFlame', 'schoolPct') / 100;
      return m;
    }
    function applyDotX(ti, key, snap) {
      var s = SPELLS[key], e = table[key], id = ++inst;
      S.xdots[ti][key] = { inst: id, applied: S.t, expires: S.t + s.duration, ticks: e.ticks, snap: snap };
      for (var i = 1; i <= e.ticks; i++) H.push({ t: S.t + i * s.tickEvery, o: 0, type: 'dotTickX', ti: ti, key: key, inst: id, i: i - 1 });
    }
    function periodicTickX(ti, key, snap, i) {
      var s = SPELLS[key], e = table[key], rk = xkey(ti, key);
      var amt = (s.tickBase * (snap.baseMult || 1) + s.tickCoef * spNow(e)) * e.periodicMult * liveMultX(key, ti, true) * (snap.eureka || 1);
      if (s.ramp) amt *= s.ramp[i];
      amt *= vulnMult(s.school, ti);
      var crit = R.crit() * 100 < e.critPct;
      if (crit) amt *= e.critMult;
      deal(rk, amt, crit, true, ti);
      if (logOn) L('tick', rk, Object.assign({ dmg: Math.round(amt), crit: crit, n: i + 1, of: e.ticks }, vulnLog(amt)));
      if (WL.NIGHTFALL_SPELLS.indexOf(key) >= 0 && tv('nightfall') && R.proc() * 100 < tv('nightfall', 'procPct')) {
        S.buffs.shadowTrance = S.t + 10; L('proc', 'shadowTrance');
      }
    }
    // A spell landing on an extra target: Curse of the Elements (round 39), a DoT, Immolate, or a direct spell (Shadow Bolt
    // spread for Improved Shadow Bolt, round 39).
    function landExtra(key, eureka, baseMult, ti) {
      var s = SPELLS[key], e = table[key], rk = xkey(ti, key), r = row(rk);
      if (R.hit() * 100 >= stats.hitPct) { r.misses++; L('miss', rk); return false; }
      r.landed++;
      if (s.kind === 'utility') {                                         // your Curse of the Elements on this target
        if (key === 'curseOfElements') { S.xdeb[ti].coe = S.t + s.duration; L('debuff', rk); }
        return true;
      }
      if (s.kind === 'hybrid' || s.kind === 'direct') {                   // Immolate's direct part / a direct spell
        var amt = (s.base + s.coef * spNow(e)) * e.directMult * liveMultX(key, ti, false) * (eureka || 1);
        var execute = S.targetHpPct < cfg.fight.executePct;               // extra targets follow the boss's health line [A24]
        if ((isSB(key) || key === 'searingPain') && execute && tv('decimation')) {
          amt *= addOp0(key, tv('decimation', 'dmgPct')); S.buffs.decimation = S.t + 10;   // additive spell mod (round 43)
        }
        amt *= vulnMult(s.school, ti);
        var crit = R.crit() * 100 < e.critPct;
        if (crit) amt *= e.critMult;
        deal(rk, amt, crit, false, ti);
        if (logOn) L('hit', rk, Object.assign({ dmg: Math.round(amt), crit: crit }, vulnLog(amt)));
        if (isSB(key) && crit && tv('improvedShadowBolt') && isbLands(xkey(ti, 'isb'))) { S.xdeb[ti].isb = S.t + 12; L('debuff', xkey(ti, 'isb')); }
      }
      if (s.kind !== 'direct') { applyDotX(ti, key, makeSnap(key, eureka, baseMult)); L('apply', rk); }
      touchOfTheGrave(ti);                                                // any landed damaging cast, as on the boss [A29]
      return true;
    }

    // baseMult scales only the spell's base value, not its spell-power part (Amplify Curse, A52).
    function makeSnap(key, eureka, baseMult) {
      return { eureka: eureka, baseMult: baseMult || 1 };   // what belongs to this cast; spell power and crit are read live per tick (round 96) [A13]
    }

    function periodicTick(key, snap, i, isChannel) {
      var s = SPELLS[key], e = table[key];
      var amt = (s.tickBase * (snap.baseMult || 1) + s.tickCoef * spNow(e)) * e.periodicMult * liveMult(key, true) * (snap.eureka || 1);
      if (s.ramp) amt *= s.ramp[i];                                                                     // [A15]
      amt *= vulnMult(s.school);
      var crit = R.crit() * 100 < e.critPct;                                                               // [A07]
      if (crit) amt *= e.critMult;
      deal(key, amt, crit, true);
      if (logOn) L('tick', key, Object.assign({ dmg: Math.round(amt), crit: crit, n: i + 1, of: e.ticks }, vulnLog(amt)));
      if (WL.NIGHTFALL_SPELLS.indexOf(key) >= 0 && tv('nightfall') && R.proc() * 100 < tv('nightfall', 'procPct')) { // [A21]
        S.buffs.shadowTrance = S.t + 10; L('proc', 'shadowTrance');
      }
    }

    // A tick of an area channel (Hellfire, Rain of Fire; round 100, user; A79): every target of the fight (1–3) takes its
    // own damage event — own hit, resist / Spell Pierce and crit roll, that target's own Curse of the Elements. The
    // damage is live like every tick (A13); Eureka! counts it as a channel tick; Bane of Havoc copies what the other
    // targets take. Extra targets' damage is booked under x2: / x3: like the multi-DoT rows.
    function aoeTick(key, i) {
      var s = SPELLS[key], e = table[key];
      for (var ti = 1; ti <= NT; ti++) {
        var rk = ti > 1 ? xkey(ti, key) : key, r = row(rk);
        if (R.hit() * 100 >= stats.hitPct) { r.misses++; L('miss', rk, { n: i + 1, of: e.ticks }); continue; }
        var amt = (s.tickBase + s.tickCoef * spNow(e)) * e.periodicMult * (ti > 1 ? liveMultX(key, ti, true) : liveMult(key, true));
        amt *= vulnMult(s.school, ti);
        var crit = R.crit() * 100 < e.critPct;
        if (crit) amt *= e.critMult;
        deal(rk, amt, crit, true, ti);
        if (logOn) L('tick', rk, Object.assign({ dmg: Math.round(amt), crit: crit, n: i + 1, of: e.ticks }, vulnLog(amt)));
      }
    }

    // Improved Shadow Bolt (round 54, user; A20): after a Shadow Bolt crit the debuff rolls its own spell-hit check with
    // your hit chance, so not every crit applies it. Own random stream: the other rolls stay the same.
    function isbLands(logKey) {
      var ok = R.isb() * 100 < stats.hitPct;
      if (!ok) { res.isbMissed = (res.isbMissed || 0) + 1; L('miss', logKey); }
      return ok;
    }
    // Direct-damage landing (cast finished or instant). Returns true if it hit.
    function land(key, eureka, baseMult, target) {
      if (target > 1) return landExtra(key, eureka, baseMult, target);
      var s = SPELLS[key], e = table[key], r = row(key);
      if (R.hit() * 100 >= stats.hitPct) { r.misses++; L('miss', key); return false; }                  // [A01][A17]
      r.landed++;
      if (s.kind === 'utility') {
        if (key === 'curseOfElements') { S.buffs.coe = S.t + s.duration; L('debuff', key); }
        jowProc(false);                                                                                   // [A64]
        return true;
      }
      if (s.kind === 'dot') { applyDot(key, makeSnap(key, eureka, baseMult)); L('apply', key); touchOfTheGrave(); jowProc(false); return true; }
      // direct or hybrid
      var sp = spNow(e);
      var amt = (s.base + s.coef * sp) * e.directMult * liveMult(key, false) * (eureka || 1);
      if (key === 'incinerate' && S.dotLeft('immolate') > 0) amt *= 1 + s.immolateBonusPct / 100;
      var execute = S.targetHpPct < cfg.fight.executePct;
      if ((isSB(key) || key === 'searingPain') && execute && tv('decimation')) {              // [A23]
        amt *= addOp0(key, tv('decimation', 'dmgPct'));   // "Modifies Damage/Healing Done": adds to the spell's op0 (round 43)
        S.buffs.decimation = S.t + 10;
      }
      amt *= vulnMult(s.school);
      var crit = R.crit() * 100 < e.critPct;
      if (crit) amt *= e.critMult;
      deal(key, amt, crit, false);
      if (logOn) L('hit', key, Object.assign({ dmg: Math.round(amt), crit: crit }, vulnLog(amt)));
      if (isSB(key) && crit && tv('improvedShadowBolt') && isbLands('isb')) { S.buffs.isb = S.t + 12; L('debuff', 'isb'); }
      if (key === 'searingPain' && tv('demonicBrand') && P) {                                            // [A51] Demonic Brand
        S.buffs.brand = S.t + cfg.demonicBrand.duration; S.brandCharges = tv('demonicBrand', 'charges');
      }
      if (key === 'conflagrate') {
        if (tv('shadowAndFlame')) S.buffs.snfShadow = S.t + 20;                                          // [A22]
        if (!(tv('shadowAndFlame') && R.proc() * 100 < tv('shadowAndFlame', 'procPct'))) { delete S.dots.immolate; L('consume', 'immolate'); }
      }
      if (key === 'shadowburn' && tv('shadowAndFlame')) {
        S.buffs.snfFire = S.t + 20;
        if (R.proc() * 100 < tv('shadowAndFlame', 'procPct')) { S.shards++; L('refund', 'soulShard'); }
      }
      if (s.kind === 'hybrid') applyDot(key, makeSnap(key, eureka, baseMult));
      touchOfTheGrave();
      jowProc(false);                                                                                     // [A64]
      return true;
    }
    // Judgement of Wisdom on the boss (Paladin debuff, round 38) [A64]: each landed spell you cast at the boss (not DoT or
    // channel ticks, not Life Tap) and each landed pet attack has a chance to restore mana to the attacker (you / the pet).
    var JOW = cfg.debuffs && cfg.debuffs.judgementOfWisdom && cfg.debuffs.judgementOfWisdom.on ? cfg.debuffs.judgementOfWisdom.jow : null;
    function jowProc(pet) {
      if (!JOW || R.jow() * 100 >= JOW.chancePct) return;
      if (pet) { if (!P) return; petRegen(); var pb = P.mana; P.mana = Math.min(P.maxMana, P.mana + JOW.mana); res.petManaFromJow = (res.petManaFromJow || 0) + (P.mana - pb); return; }
      var before = S.mana; S.mana = Math.min(stats.maxMana, S.mana + JOW.mana);
      res.manaFromJow = (res.manaFromJow || 0) + (S.mana - before);
      L('mana', 'Judgement of Wisdom', { gain: Math.round(S.mana - before) });
    }
    // Touch of the Grave (Undead) [A29]: rolls once per landed cast of a spell with a damage component — direct spells,
    // DoTs and channels on cast, never on periodic ticks, never on curses / Life Tap (beta build 2026-09-24, S12:
    // "Shadow Word: Pain activates it on cast, but not on periodic damage"). Before round 30: direct casts only.
    // Damage (round 108, user): 5% of your maximum health — so it scales with Stamina — times every Shadow damage %:
    // your Shadow auras (Demonic Sacrifice, Master Demonologist, Soul Link) and, on the target it hits, Improved Shadow
    // Bolt and Curse of the Elements, plus Shadow and Flame and Power Infusion. No spell power, no talent spell
    // modifiers (Shadow Mastery lists its own spells), no crit, no resist / Spell Pierce roll. `ti` > 1 = an extra target.
    function togMult(ti) {
      var x = ti > 1, m = (stats.mult.shadow || 1) * stats.mult.all;
      if (x ? S.xDebLeft(ti, 'coe') > 0 : S.buff('coe')) m *= 1 + SPELLS.curseOfElements.dmgTakenPct / 100;
      if (x ? S.xDebLeft(ti, 'isb') > 0 : S.buff('isb')) m *= 1 + tv('improvedShadowBolt', 'debuffPct') / 100;
      if (PI && S.buff('powerInfusion')) m *= 1 + PI.spellDmgPct / 100;
      if (S.buff('snfShadow')) m *= 1 + tv('shadowAndFlame', 'schoolPct') / 100;
      return m;
    }
    function touchOfTheGrave(ti) {
      var tog = racialOf('proc');
      if (tog && R.proc() * 100 < tog.chancePct) {
        var td = stats.maxHealth * tog.maxHealthPct / 100 * togMult(ti);
        deal('touchOfTheGrave', td, false, false, ti > 1 ? ti : undefined); row('touchOfTheGrave').casts++;
        L('hit', 'touchOfTheGrave', { dmg: Math.round(td) });
      }
    }

    // ---------- casting ----------
    function effectiveCost(key) {
      var c = table[key].cost;
      if (S.eurekaCharges > 0 && SPELLS[key].kind !== 'utility') c *= 1 - racialOf('cooldown').costRedPct / 100; // [A31]
      return c;
    }

    // Cost if Eureka! were popped now (used to decide whether popping racials is worthwhile before this cast).
    function discountedCost(key) {
      var cd = racialOf('cooldown'), c = table[key].cost;
      if (cd && cd.costRedPct && (S.eurekaCharges > 0 || S.ready('racial'))) c *= 1 - cd.costRedPct / 100;
      return c;
    }

    function startCast(key, target, fromTL, actIdx) {   // actIdx: place of the priority action that picked it (channel clipping)
      var s = SPELLS[key], e = table[key], rk = target > 1 ? xkey(target, key) : key;
      var castT = S.castTime(key), gcdT = S.gcd();
      var instantTrance = isSB(key) && S.buff('shadowTrance');
      S.mana -= effectiveCost(key);
      // Eureka!: a damaging cast spends a charge; the aura stays up until this cast lands (channel: ends). The damage bonus
      // is applied live (liveMult), so `eureka` passed on below is always 1 now (round 38; was a snapshot multiplier).
      var eureka = 1;
      var eurekaUsed = false;
      if (S.eurekaCharges > 0 && s.kind !== 'utility') { S.eurekaCharges--; S.eurekaPending++; eurekaUsed = true; }
      // Amplify Curse: off the GCD, next Bane of Agony +50%; 3 min cooldown. [A52] Its aura is "Modifies Spell
      // Effectiveness" (spell 18288), which scales the base value only — the spell-power part is not amplified (user, round 25).
      var baseMult = 1;
      if (key === 'baneOfAgony' && tv('amplifyCurse') && S.ready('amplifyCurse')) {
        baseMult = 1 + tv('amplifyCurse', 'boaPct') / 100; S.cds.amplifyCurse = S.t + 180; L('buff', 'amplifyCurse');
      }
      if (s.shards && !(key === 'soulFire' && S.buff('decimation'))) S.shards -= s.shards;
      if (key === 'soulFire' && S.buff('decimation')) delete S.buffs.decimation;
      if (instantTrance) delete S.buffs.shadowTrance;
      // A cooldown starts when the cast is COMPLETE, not when it begins (round 107, user) — matters for Soul Fire, the only
      // spell with both a cast time and a cooldown. Instants: castT = 0. Pushback moves it along with the cast (takeHit).
      if (e.cd) S.cds[key] = S.t + castT + e.cd;
      row(rk).casts++;
      S.minManaCheck();
      L('cast', rk, { castTime: +castT.toFixed(3), gcd: +gcdT.toFixed(3), channel: s.kind === 'channel' ? s.duration : undefined,
                       eureka: eurekaUsed || undefined, trance: instantTrance || undefined, timeline: fromTL || undefined });

      S.cast = null;
      if (s.kind === 'channel') {
        var r = row(key);
        if (!s.aoe && R.hit() * 100 >= stats.hitPct) {                    // area channels always start; their ticks roll per target (round 100)
          if (eurekaUsed) eurekaRelease();
          r.misses++; L('miss', key); if (fromTL) TL.turn = true; S.busyUntil = S.t; S.gcdReady = S.t + gcdT; scheduleDecide(S.gcdReady); return;
        }
        r.landed++;
        touchOfTheGrave();                                                // on cast, not on the channel's ticks [A29]
        jowProc(false);                                                   // [A64]
        var id = ++inst;
        S.channel = { key: key, inst: id, snap: makeSnap(key, eureka), start: S.t, end: S.t + s.duration, eurekaHeld: eurekaUsed, tl: !!fromTL, idx: actIdx };   // timeline channels run to the end
        for (var i = 1; i <= e.ticks; i++) H.push({ t: S.t + i * s.tickEvery, o: 0, type: 'chanTick', key: key, inst: id, i: i - 1 });
        S.busyUntil = S.t + s.duration; S.gcdReady = S.t + gcdT;
        r.castTime += s.duration;
        scheduleDecide(S.busyUntil);
      } else if (castT > EPS) {
        S.busyUntil = S.t + castT; S.gcdReady = S.t + gcdT;
        row(rk).castTime += castT;
        // projectiles land `TRAVEL` s after the cast ends (round 39; the caster is free at cast end)
        var ce = { t: S.busyUntil + (s.projectile ? TRAVEL : 0), o: 1, type: 'castEnd', key: key, eureka: eureka, baseMult: baseMult, target: target, eurekaHeld: eurekaUsed, tl: fromTL };
        H.push(ce);
        S.cast = { key: key, rk: rk, full: castT, end: S.busyUntil, ev: ce, n: 0 };     // pushback (round 78)
        scheduleDecide(Math.max(S.busyUntil, S.gcdReady));
      } else {
        S.busyUntil = S.t; S.gcdReady = S.t + gcdT;
        row(rk).castTime += gcdT;
        if (s.projectile && TRAVEL > EPS) H.push({ t: S.t + TRAVEL, o: 1, type: 'castEnd', key: key, eureka: eureka, baseMult: baseMult, target: target, eurekaHeld: eurekaUsed, tl: fromTL });
        else {
          if (!land(key, eureka, baseMult, target) && fromTL) TL.turn = true;
          if (eurekaUsed) eurekaRelease();                              // instant: the aura part of this cast ends now
        }
        scheduleDecide(S.gcdReady);
      }
    }
    S.minManaCheck = function () { if (S.mana < res.minMana) res.minMana = S.mana; };

    function lifeTap(moving) {
      var gain = (SPELLS.lifeTap.manaBase + stats.spi) * (1 + tv('improvedLifeTap', 'manaPct') / 100); // [A12]
      var before = S.mana;
      S.mana = Math.min(stats.maxMana, S.mana + gain);
      res.lifeTaps++; res.manaFromTaps += S.mana - before; row('lifeTap').casts++;
      S.busyUntil = S.t; S.gcdReady = S.t + S.gcd();
      res.tapTime = (res.tapTime || 0) + S.gcd();                           // GCD time spent on Life Tap (W3)
      if (moving) res.movingTaps = (res.movingTaps || 0) + 1;
      L('cast', 'lifeTap', { gain: Math.round(S.mana - before), castTime: 0, gcd: +(S.gcdReady - S.t).toFixed(3), moving: moving || undefined });
      if (P && tv('demonicEnergies')) {   // Demonic Energies: the pet gains X% of "the Mana you gain" (actual gain, after the cap)
        petRegen(); P.mana = Math.min(P.maxMana, P.mana + (S.mana - before) * tv('demonicEnergies', 'tapPct') / 100);
      }
      scheduleDecide(S.gcdReady);
    }

    // Eureka! (Gnome): once the cooldown setting allows it (activesOk), it is popped right before a long cast — a direct
    // spell or channel of ≥ 1.4 s — so none of its 3 charges goes to a DoT or an instant, which get nothing from it.
    // Round 88 (user): its own pop-timing option (rounds 38–87: 'any' / 'long' / 'doom') is gone — Eureka! no longer
    // affects DoTs at all (round 80), so there is nothing left to time separately. [A31]
    function eurekaPopOk(key) {
      var s = SPELLS[key], len = s.kind === 'channel' ? s.duration : S.castTime(key);
      return (s.kind === 'direct' || s.kind === 'channel') && len >= 1.4;
    }
    function useRacials(key) {
      var cd = racialOf('cooldown');
      if (!cd || !S.ready('racial')) return false;
      if (cd.charges && key && !eurekaPopOk(key)) return false;
      S.cds.racial = S.t + cd.cd;
      if (cd.spPct) S.buffs.bloodFury = S.t + cd.duration;
      if (cd.hastePct) S.buffs.berserking = S.t + cd.duration;
      if (cd.charges) {
        S.eurekaCharges = cd.charges; S.eurekaPending = 0;
        if (cd.duration) H.push({ t: S.t + cd.duration, o: 0, type: 'eurekaEnd', pop: S.cds.racial });   // 15 s cap (round 42)
      }
      L('racial', cd.name);
      return true;
    }

    // ---------- pet actor [A26][A45][A46] ----------
    // Pet spell power = cfg.petSpPct (default 10%, measured in Forever, round 31) of the Warlock's spell power (incl. Blood
    // Fury and the potion) + Demonic Knowledge's bonus in full (it names the pet). Pet hit = Warlock hit; pet spell crit =
    // the Warlock's crit (character sheet incl. Int, buffs, consumables, oil — "increased by 100% of master's crit",
    // round 31; was gear crit only), ×1.5. Not affected by ISB / Shadow and Flame / Spell Pierce.
    // Each pet gets a generation number; its scheduled events carry it, so a pet swapped out mid-fight (round 35) stops.
    var P = null, petGen = 0;
    function makePet(key) {
      if (!key || !cfg.options.includePetDamage) return null;
      var pc = cfg.pets[key];
      var p = { key: key, c: pc, maxMana: pc.mana * (1 + tv('felVitality', 'manaPct') / 100), lastRegen: S.t, lashReady: 0, gen: ++petGen };
      p.mana = p.maxMana;
      return p;
    }
    P = makePet(build.pet);
    // Exposed to rotation conditions.
    S.petManaPct = function () { if (!P) return 100; petRegen(); return 100 * P.mana / P.maxMana; };
    S.petSpellCost = function () { return P && P.c.spell ? P.c.spell.cost : Infinity; };
    S.petMana = function () { if (!P) return Infinity; petRegen(); return P.mana; };
    S.tapGain = function () { return (SPELLS.lifeTap.manaBase + stats.spi) * (1 + tv('improvedLifeTap', 'manaPct') / 100); };
    S.maxMana = stats.maxMana;
    function petRegen() { P.mana = Math.min(P.maxMana, P.mana + P.c.manaRegen * (S.t - P.lastRegen)); P.lastRegen = S.t; }
    function petMult(school) {
      var m = (1 + tv('unholyPower', 'petDmgPct') / 100) * stats.mult.all;                             // Soul Link lives in mult.all
      if ((build.pet === 'succubus' && school === 'shadow') || (build.pet === 'imp' && school === 'fire'))
        m *= 1 + tv('masterDemonologist', 'schoolPct') / 100;
      if (school !== 'physical' && S.buff('coe')) m *= 1 + SPELLS.curseOfElements.dmgTakenPct / 100;
      return m;
    }
    function warlockSpNow() { return (stats.sp + potSp()) * (S.buff('bloodFury') ? 1 + racialOf('cooldown').spPct / 100 : 1); }
    function petSp() { return warlockSpNow() * (cfg.petSpPct != null ? cfg.petSpPct : 100) / 100 + (stats.dkSp || 0); }   // [A26][A27] pet spells
    function petSpellHit(sp) {
      var key = 'pet:' + sp.key, r = row(key);
      r.casts++;
      if (R.pet() * 100 >= stats.hitPct) { r.misses++; L('miss', key); return; }
      r.landed++;
      jowProc(true);                                                     // pet attack on the judged boss → pet mana [A64]
      // Improved Imp = "Modifies Damage/Healing Done" on Firebolt (whole hit); Improved Sayaad = "Modifies Spell
      // Effectiveness" on Lash of Pain → base value only, like Amplify Curse (round 43, A68). Unholy Power scales the
      // pet's passive damage aura → a separate multiplier (petMult).
      var base = sp.base * (sp.key === 'lashOfPain' ? 1 + tv('improvedSayaad', 'lashPct') / 100 : 1);
      var amt = (base + sp.coef * petSp()) * petMult(sp.school);
      if (sp.key === 'firebolt') amt *= 1 + tv('improvedImp', 'firebolt') / 100;
      var crit = R.pet() * 100 < stats.critPct;                          // master's crit (round 31) [A26]
      if (crit) amt *= cb.critMultiplier;
      deal(key, amt, crit, false);
      L('pet', key, { dmg: Math.round(amt), crit: crit });
      brandProc();
    }
    // Demonic Brand: a landed pet attack on a branded target spends a charge and adds bonus damage (cannot miss, no crit).
    // Scales with the Warlock's Shadow spell power and the pet's damage modifiers — the same petMult as every other pet
    // hit: Unholy Power, Soul Link (+3%, since round 42 — was missing), Master Demonologist, Curse of the Elements.
    // School follows the pet (Imp = Fire, Succubus = Shadow). [A51]
    function brandProc() {
      if (!S.buff('brand') || !(S.brandCharges > 0)) return;
      S.brandCharges--;
      var db = cfg.demonicBrand, school = build.pet === 'imp' ? 'fire' : 'shadow';
      var m = petMult(school);
      var amt = ((db.baseMin + db.baseMax) / 2 + db.shadowSpCoef * (warlockSpNow() + (stats.schoolSp.shadow || 0))) * m;
      deal('pet:brand', amt, false, false); row('pet:brand').casts++;
      L('pet', 'pet:brand', { dmg: Math.round(amt) });
    }
    function petAct() {                                   // spell-casting decision (Firebolt spam / Lash on cooldown)
      if (!P || !P.c.spell || S.t >= dur - EPS) return;   // no new pet actions at/after the end of the fight
      petRegen();
      var sp = P.c.spell;
      if (sp.cd && P.lashReady > S.t + EPS) { H.push({ t: P.lashReady, o: 2, type: 'petAct', gen: P.gen }); return; }
      if (P.mana < sp.cost) {                             // out of mana: wait for regen
        var wait = Math.max(0.1, (sp.cost - P.mana) / P.c.manaRegen);
        res.petOomTime += Math.min(wait, dur - S.t);
        H.push({ t: S.t + wait, o: 2, type: 'petAct', gen: P.gen }); return;
      }
      P.mana -= sp.cost;
      if (sp.cd) P.lashReady = S.t + sp.cd;
      if (sp.cast) { H.push({ t: S.t + sp.cast + (sp.projectile ? TRAVEL : 0), o: 1, type: 'petLand', gen: P.gen }); H.push({ t: S.t + sp.cast, o: 2, type: 'petAct', gen: P.gen }); }
      else { petSpellHit(sp); H.push({ t: P.lashReady || S.t + 1.5, o: 2, type: 'petAct', gen: P.gen }); }
    }
    function petSwing() {
      if (S.t >= dur - EPS) return;
      var m = P.c.melee, r = row('pet:melee'), tb = cb.petMelee;
      r.casts++;
      // One-roll attack table (round 42) [A46]: miss (8% − your hit above base, first 1% ignored) → dodge 6.5% →
      // glancing 40% at 65% damage → crit (own + your MELEE crit − 4.8%; round 75, was your spell crit since round 32) → hit.
      var hitBonus = Math.max(0, stats.hitPct - cb.baseHitPct - tb.hitSuppressionPct);
      var miss = Math.max(0, tb.missPct - hitBonus), roll = R.pet() * 100;
      var critCh = Math.max(0, m.critPct + (m.inheritMeleeCrit ? stats.meleeCritPct : 0) - tb.critSuppressionPct);
      if (roll >= miss + tb.dodgePct) {
        r.landed++;
        jowProc(true);                                                   // [A64]
        var dps = m.baseDps + m.apPerSp * warlockSpNow() / m.apPerDps;                                  // [A46] own AP rule
        var amt = dps * m.swing * (1 - armorRed) * petMult('physical');                                  // [A54] boss armor − debuffs
        var glance = roll < miss + tb.dodgePct + tb.glancePct;
        var crit = !glance && roll < miss + tb.dodgePct + tb.glancePct + critCh;
        if (glance) { amt *= tb.glanceDmgPct / 100; r.glances++; }
        if (crit) amt *= 2;
        deal('pet:melee', amt, crit, false);
        brandProc();
      } else r.misses++;
      H.push({ t: S.t + m.swing, o: 0, type: 'petSwing', gen: P.gen });
    }

    // ---------- mid-fight pet swap (round 35, A63) ----------
    // At execute: Demonic Sacrifice on the active pet (off the GCD; its buff replaces the old sacrifice buff), Fel
    // Domination (off the GCD), summon the other demon (10 s − 6 s Fel Domination − 2/4 s Master Summoner; one GCD).
    // Afterwards the build's pet / sacrifice are changed and the static stats and spell values are rebuilt, so every
    // multiplier (sacrifice, Master Demonologist, Soul Link, Demonic Knowledge) follows the new setup; running DoTs keep
    // their snapshot but tick with the new multipliers.
    var PS = cfg.petSwap || null;
    S.swapped = false;
    S.canSwap = function (to) {
      return !!PS && !S.swapped && !!build.pet && build.pet !== to && S.targetHpPct < cfg.fight.executePct &&
        tv('felDomination') > 0 && tv('demonicSacrifice') > 0 && tv('demonicPact') > 0 && S.ready('felDomination');
    };
    function summonCost(to) {
      var ms = tv('masterSummoner'), red = PS.felDom.costRedPct + (ms ? PS.masterSummoner.costRedPct[ms - 1] : 0);
      return WL.WARLOCK_BASE_60.mana * PS.summonCostPctBase[to] / 100 * Math.max(0, 1 - red / 100);
    }
    function summonCast(to) { var ms = tv('masterSummoner'); return Math.max(0, PS.summonCast - PS.felDom.castRed - (ms ? PS.masterSummoner.castRed[ms - 1] : 0)); }
    function rebuild(b) {
      build = b; S.build = b;
      stats = WL.computeStats(b, raceKey, cfg); table = WL.buildSpellTable(b, stats, cfg);
      S.maxMana = stats.maxMana; S.mana = Math.min(S.mana, stats.maxMana);
    }
    function doSwap(to) {
      var cost = summonCost(to);
      if (S.mana < cost) { lifeTap(); return; }
      var from = build.pet, nb = JSON.parse(JSON.stringify(build));
      S.swapped = true; res.swapAt = S.t;
      nb.sacrifice = from; nb.pet = null; P = null; rebuild(nb);                 // 1. Demonic Sacrifice (off the GCD)
      L('cast', 'demonicSacrifice', { castTime: 0, gcd: 0, pet: from });
      S.cds.felDomination = S.t + PS.felDom.cd;                                   // 2. Fel Domination (off the GCD)
      L('cast', 'felDomination', { castTime: 0, gcd: 0 });
      S.mana -= cost; S.minManaCheck();                                           // 3. summon: one GCD
      var castT = summonCast(to) / S.hasteFactor(), gcdT = S.gcd();
      S.busyUntil = S.t + castT; S.gcdReady = S.t + gcdT;
      L('cast', 'summon:' + to, { castTime: +castT.toFixed(3), gcd: +gcdT.toFixed(3), cost: Math.round(cost) });
      if (castT > EPS) H.push({ t: S.busyUntil, o: 1, type: 'summonEnd', to: to });
      else finishSummon(to);
      scheduleDecide(Math.max(S.busyUntil, S.gcdReady));
    }
    function finishSummon(to) {
      var nb = JSON.parse(JSON.stringify(build)); nb.pet = to; rebuild(nb);
      P = makePet(to);
      if (P && P.c.spell) H.push({ t: S.t, o: 2, type: 'petAct', gen: P.gen });
      if (P && P.c.melee) H.push({ t: S.t, o: 0, type: 'petSwing', gen: P.gen });
      L('summon', 'pet_' + to);
    }

    // ---------- end-of-fight DoT check (round 53, A69) ----------
    // A DoT recast that cannot run its full duration before the boss dies is only worth it if the damage it still adds
    // beats what the filler does in the same time. Everything is an expected value at this moment (hit, crit, resists,
    // live buffs, SP snapshot) — the same formulas as the real hits and ticks.
    var DOT_END = !(cfg.options && cfg.options.dotEndCheck === false);
    res.dotSkips = {};
    function expVuln(school, ti) {
      var coe = ti > 1 ? S.xDebLeft(ti, 'coe') > 0 : S.buff('coe'), key = school + (coe ? '1' : '0');
      var pr = resCache[key] || (resCache[key] = WL.resistProfile(cfg, stats.pierce, school, coe));
      return pr.flat * pr.dist.reduce(function (a, d) { return a + d.p * (1 + d.pct / 100); }, 0);
    }
    function expCrit(critPct, critMult) { return 1 + Math.max(0, Math.min(100, critPct)) / 100 * (critMult - 1); }
    function lmult(key, ti, periodic) { return ti > 1 ? liveMultX(key, ti, periodic) : liveMult(key, periodic); }
    function hitChance() { return Math.min(100, stats.hitPct) / 100; }
    // Time a cast takes away from other casts: cast time or GCD, a channel its full duration.
    function occupies(key) { return SPELLS[key].kind === 'channel' ? SPELLS[key].duration : Math.max(S.castTime(key), S.gcd()); }
    // Expected damage of one cast of a direct spell or a full channel right now.
    function expCast(key, ti, noImmolate) {
      var s = SPELLS[key], e = table[key], amt;
      if (s.aoe) {                                                          // area channel: the same ticks on every target (round 100)
        var sum = 0;
        for (var tj = 1; tj <= NT; tj++) sum += e.ticks * (s.tickBase + s.tickCoef * spNow(e)) * e.periodicMult * lmult(key, tj, true) * expVuln(s.school, tj);
        return hitChance() * sum * expCrit(e.critPct, e.critMult);
      }
      if (s.kind === 'channel') {
        amt = 0;
        for (var i = 0; i < e.ticks; i++) amt += (s.tickBase + s.tickCoef * spNow(e)) * e.periodicMult * lmult(key, ti, true) * (s.ramp ? s.ramp[i] : 1);
      } else {
        amt = (s.base + s.coef * spNow(e)) * e.directMult * lmult(key, ti, false);
        if (key === 'incinerate' && !noImmolate && S.dotLeft('immolate') > 0) amt *= 1 + s.immolateBonusPct / 100;
        if ((isSB(key) || key === 'searingPain') && S.targetHpPct < cfg.fight.executePct && tv('decimation')) amt *= addOp0(key, tv('decimation', 'dmgPct'));
      }
      return hitChance() * amt * expVuln(s.school, ti) * expCrit(e.critPct, e.critMult);
    }
    // What the rotation would cast instead of the DoT: the first action below it that picks a damaging direct spell or
    // channel right now (Soul Fire under Decimation, Conflagrate, a Shadow Trance bolt, the filler, …). Actions that
    // apply DoTs / curses / Life Tap / pet swaps are passed over (they are not the damage the DoT's time is taken from).
    var NOT_ALT = { bane: 1, baneOfAgony: 1, corruption: 1, siphonLife: 1, immolate: 1, multiDot: 1, curseOfElements: 1, lifeTapPet: 1, lifeTapBelow: 1,
                    swapToImp: 1, swapToSuccubus: 1, shadowBoltSpread: 1, isbUpkeep: 1, deathCoilFinisher: 1 };
    function altBelow(idx) {
      for (var i = (idx == null ? -1 : idx) + 1; i < ROT.length; i++) {
        var a = WL.ACTIONS[ROT[i]];
        if (!a || NOT_ALT[ROT[i]]) continue;
        var k = a.pick(S), s = k && SPELLS[k];
        if (s && table[k] && (s.kind === 'direct' || s.kind === 'channel')) return k;
      }
      return table.shadowBolt ? 'shadowBolt' : null;
    }
    // Value of recasting DoT `key` on target `ti` now vs the filler in the same time. { worth, value, cost, filler }.
    function dotValue(key, ti) {
      var s = SPELLS[key], e = table[key], castT = S.castTime(key), tL = S.t + castT;
      // Cost = the damage rate of the alternative × the time the DoT cast takes. A smooth rate, not whole casts: counting
      // only casts that still land made the cost jump between decisions, so DoTs were skipped and then cast a few
      // seconds later with fewer ticks (−0.1…−0.35%; round 53 experiments).
      var f = altBelow(S.actionIndex), fRate = f ? expCast(f, 0, key === 'immolate') / (occupies(f) + LAT) : 0;
      var cost = (occupies(key) + LAT) * fRate;
      var end = Math.min(dur, tL + s.duration), gcd = S.gcd(), value = 0;
      var baseMult = key === 'baneOfAgony' && tv('amplifyCurse') && S.ready('amplifyCurse') ? 1 + tv('amplifyCurse', 'boaPct') / 100 : 1;
      var tickAmt = (s.tickBase * baseMult + s.tickCoef * spNow(e)) * e.periodicMult * lmult(key, ti, true) * expVuln(s.school, ti) * expCrit(e.critPct, e.critMult);
      if (f === 'wrack' && SPELLS.wrack.debuffSpells.indexOf(key) >= 0) tickAmt *= 1 + SPELLS.wrack.debuffPct / 100;   // ticks during the Wrack filler
      // Conflagrate (Destruction): a new Immolate lets the next Conflagrate happen, which then consumes it (unless
      // Shadow and Flame keeps it) — so ticks after that moment count only with the keep chance.
      var hit = hitChance(), tConf = Infinity, keep = 1;
      var cfx = ROT.indexOf('conflagrateExpire') >= 0 && ROT.indexOf('conflagrate') < 0;   // only near Immolate's end (round 97)
      if (key === 'immolate' && ti <= 1 && (ROT.indexOf('conflagrate') >= 0 || ROT.indexOf('conflagrateSnF') >= 0 || cfx) && S.has('conflagrate')) {
        tConf = Math.max(cfx ? tL + s.duration - WL.CONFLAG_EXPIRE_S : tL, S.cds.conflagrate || 0);
        if (tConf < end - 1e-6 && tConf <= dur - gcd + EPS) {
          keep = tv('shadowAndFlame') ? tv('shadowAndFlame', 'procPct') / 100 : 0;
          value += hit * (expCast('conflagrate', 0) - gcd * fRate);        // a Conflagrate instead of one filler GCD (needs the Immolate)
        } else tConf = Infinity;
      }
      var nTicks = 0, ticks = 0;
      for (var i = 1; i <= e.ticks; i++) {
        var tt = tL + i * s.tickEvery;
        if (tt > dur + EPS) break;
        nTicks++;
        ticks += tickAmt * (s.ramp ? s.ramp[i - 1] : 1) * (tt > tConf + EPS ? keep : 1);
      }
      value += hit * ticks;                                                // ticks need the DoT to land
      if (s.kind === 'hybrid') value += expCast(key, ti);                  // Immolate's direct hit (hit chance inside)
      var up = Math.max(0, end - (S.t + occupies(key)));                   // time the new DoT is up after this cast
      if (key === 'immolate' && ti <= 1 && f === 'incinerate')             // Incinerate +25% while Immolate is up
        value += hit * up / occupies('incinerate') * expCast('incinerate', 0, true) * SPELLS.incinerate.immolateBonusPct / 100;
      // Nightfall: a proc makes the next Shadow Bolt instant — always the max-rank bolt (round 59, `shadowBolt`), with the
      // Shadow Trance action or a Shadow Bolt filler of any rank (round 57) — so one filler GCD turns into that bolt.
      var sbKey = table.shadowBolt && (ROT.indexOf('shadowTrance') >= 0 || (f && isSB(f))) ? 'shadowBolt' : null;
      if (WL.NIGHTFALL_SPELLS.indexOf(key) >= 0 && tv('nightfall') && sbKey) {
        var procTicks = 0;
        for (var j = 1; j <= nTicks; j++) if (tL + j * s.tickEvery <= dur - gcd + EPS) procTicks++;
        var sbNow = expCast(sbKey, 0), sbCast = table[sbKey].cast / S.hasteFactor();
        value += hit * procTicks * tv('nightfall', 'procPct') / 100 * Math.max(0, sbNow - gcd * (sbKey === f ? sbNow / Math.max(sbCast, gcd) : fRate));
      }
      if (f && SPELLS[f].drain && tv('soulSiphon') && ti <= 1 && WL.SOUL_SIPHON_EFFECTS.indexOf(key) >= 0) {   // Soul Siphon on the drain
        var others = 0, per = tv('soulSiphon', 'perEffectPct'), cap = tv('soulSiphon', 'maxPct');
        WL.SOUL_SIPHON_EFFECTS.forEach(function (x) { if (x !== key && (x === 'curseOfElements' ? S.buff('coe') : S.dotLeft(x) > 0)) others++; });
        var now = 1 + Math.min((others + (S.dotLeft(key) > 0 ? 1 : 0)) * per, cap) / 100;
        var gain = (Math.min((others + 1) * per, cap) - Math.min(others * per, cap)) / 100;
        value += hit * up * fRate / now * gain;
      }
      return { worth: value >= cost, value: value, cost: cost, filler: f };
    }
    // Used by the rotation (dotNeeded, bane, multiDot): true = recast. The whole DoT fitting before the end is always worth it.
    S.dotWorth = function (key, ti) {
      if (!DOT_END) return null;                                           // null = check off: the rotation uses the old rule
      var s = SPELLS[key];
      if (!table[key] || S.t + S.castTime(key) + s.duration <= dur + EPS) return true;
      var v = dotValue(key, ti || 0), id = (ti > 1 ? 'x' + ti + ':' : '') + key;
      if (!v.worth && !res.dotSkips[id]) {                                 // first skip of this DoT in the fight
        res.dotSkips[id] = { key: key, target: ti || 1, t: S.t, left: S.remaining, value: v.value, cost: v.cost, filler: v.filler };
        L('skip', id, { left: +S.remaining.toFixed(2), value: Math.round(v.value), cost: Math.round(v.cost), filler: v.filler });
      }
      return v.worth;
    };

    function pickAction(excludeFrom, fitBy) {   // fitBy (timeline gaps, round 70): only casts that end by then (channels are clipped)
      var list = ROT;                                                    // build priority (+ multiDot if the option is on)
      for (var i = 0; i < list.length; i++) {
        if (excludeFrom != null && i >= excludeFrom) return null;
        var a = WL.ACTIONS[list[i]];
        if (!a) throw new Error('Unknown rotation action: ' + list[i]);
        S.nextTarget = 0;                                                // set by multiDot to 2 / 3
        S.actionIndex = i;                                               // lets the DoT check find the filler below (round 53)
        var k = a.pick(S);
        if (k && k.indexOf('swap:') === 0) return { key: k, index: i, target: 0 };   // pet swap (instant summon, round 35)
        if (k && fitBy != null && table[k] && SPELLS[k].kind !== 'channel' && S.t + tlOccupies(k) > fitBy + EPS) continue;   // does not fit the gap
        if (k && table[k] && canCastNow(k)) return { key: k, index: i, target: S.nextTarget || 0 };   // movement: only instants while moving (W11)
      }
      return null;
    }

    function decide() {
      if (S.t >= dur - EPS) return;
      if (HAV && !S.buff('havoc')) {                                       // 2 targets: Bane of Havoc on the second one (off the GCD)
        S.mana -= table.baneOfHavoc.cost; S.buffs.havoc = S.t + SPELLS.baneOfHavoc.duration;
        row('baneOfHavoc').casts++; L('cast', 'baneOfHavoc', { castTime: 0, gcd: 0 });
      }
      manaBuffCheck();
      useManaItems();
      if (explosives.length && useExplosive()) return;
      if (TL && !TL.turn && timelineStep()) return;
      var fit = TL && !TL.turn && TL.wake != null ? TL.wake : null;       // a gap before the next timeline entry
      var p = pickAction(null, fit);
      if (TL && TL.turn) TL.turn = false;                                  // the priority's one turn after a timeline miss
      if (!p && TL && TL.wake != null && TL.wake > S.t + EPS) { res.idle += TL.wake - S.t; scheduleDecide(TL.wake); return; }
      // Life Tap while moving (round 62, user; A71): when movement leaves nothing castable (moving: only instants; just before
      // a movement phase: no cast would finish in time) and the priority has no instant to cast, Life Tap (instant) instead of
      // waiting — whenever it restores any mana.
      if (!p && MV && cfg.fight.lifeTapWhileMoving && S.mana < stats.maxMana - EPS) { lifeTap(true); return; }
      if (!p) { res.idle += 0.1; scheduleDecide(S.t + 0.1); return; }
      if (p.key === 'lifeTap') { lifeTap(); return; }                      // explicit Life Tap action (e.g. to feed the pet)
      if (p.key.indexOf('swap:') === 0) { doSwap(p.key.slice(5)); return; } // mid-fight pet swap (round 35)
      // Racial cooldowns fire only right before an actual damaging cast (never before a curse or a Life Tap).
      // Checked with Eureka's cost reduction in mind: pop it only if we can then afford the spell.
      var damaging = SPELLS[p.key].kind !== 'utility';
      if (damaging && S.mana >= discountedCost(p.key)) popActives(p.key);
      if (S.mana < effectiveCost(p.key)) {
        if (stats.maxMana < effectiveCost(p.key)) { res.oom++; scheduleDecide(S.t + 1); return; }
        lifeTap(); return;
      }
      startCast(p.key, p.target, false, p.index);
    }

    // ---------- fight timeline (round 70, A73) ----------
    // Time a priority spell takes before the next decision (cast or GCD, whichever is longer).
    function tlOccupies(k) { if (k === 'lifeTap' || !SPELLS[k] || k.indexOf('swap:') === 0) return S.gcd(); return Math.max(S.castTime(k), S.gcd()); }
    function tlUsable(k) {
      if (k === 'conflagrate') return S.dotLeft('immolate') > 0;
      if (k === 'shadowburn') return S.shards > 0;
      if (k === 'soulFire') return S.buff('decimation') || S.shards > 0;
      return true;
    }
    // Casts the next due timeline entry (true = handled). Sets TL.wake = when the timeline needs the caster next.
    function timelineStep() {
      TL.wake = null;
      while (TL.i < TL.list.length) {
        var e = TL.list[TL.i], k = e.k;
        if (e.t > dur - EPS) { TL.i = TL.list.length; break; }
        if (S.t + EPS < e.t) { TL.wake = e.t; return false; }                              // not due yet: the priority may fill the gap
        if (k === 'lifeTap') { TL.i++; lifeTap(); return true; }
        if (!table[k] || !S.has(k) || (SPELLS[k].talent && !tv(SPELLS[k].talent)) || !tlUsable(k)) {
          TL.i++; L('skip', k, { timeline: true }); continue;                               // cannot be cast (talent, Immolate, shard): skipped
        }
        if (!S.ready(k)) { TL.wake = S.cds[k]; return false; }                            // on cooldown: wait (the priority may fill)
        if (!canCastNow(k)) { TL.wake = S.t + 0.1; return false; }                         // moving: wait for the phase to end
        if (S.mana < effectiveCost(k)) {
          if (stats.maxMana < effectiveCost(k)) { TL.i++; L('skip', k, { timeline: true }); continue; }
          lifeTap(); return true;                                                           // Life Tap first; the rest runs later
        }
        TL.i++;
        if (SPELLS[k].kind !== 'utility' && S.mana >= discountedCost(k)) popActives(k);
        startCast(k, 0, true);
        return true;
      }
      return false;
    }

    // ---------- main loop ----------
    // Pre-pull: Demonic Sacrifice is handled statically in computeStats (buff lasts 2 h).
    if (cfg.debuffs && cfg.debuffs.coeOther && cfg.debuffs.coeOther.on) S.buffs.coe = dur + 1;   // another Warlock keeps CoE up
    scheduleDecide(0);
    if (HIT) H.push({ t: R.push() * HIT, o: 1, type: 'dmgTaken' });             // first hit at a random point of the first interval
    if (P) {
      if (P.c.spell) H.push({ t: 0, o: 2, type: 'petAct', gen: P.gen });
      if (P.c.melee) H.push({ t: 0, o: 0, type: 'petSwing', gen: P.gen });
    }
    var ev;
    while (H.a.length) {
      ev = H.pop();
      if (ev.t > dur + EPS) break;
      updateTime(ev.t);
      if (ev.type === 'decide') {
        if (ev.token !== decideToken) continue;
        decide();
      } else if (ev.type === 'castEnd') {
        if (ev.dead) continue;                                // pushed back: a later copy of this event lands it (round 78)
        if (!land(ev.key, ev.eureka, ev.baseMult, ev.target) && ev.tl && TL) TL.turn = true;   // missed timeline cast → priority turn
        if (ev.eurekaHeld) eurekaRelease();                   // Eureka!'s aura part of this cast ends when it lands
      } else if (ev.type === 'eurekaEnd') {                    // 15 s after the pop (round 42)
        if (ev.pop === S.cds.racial && eurekaUp()) { S.eurekaCharges = 0; S.eurekaPending = 0; L('expire', 'eureka'); }
      } else if (ev.type === 'mana') {
        var before = S.mana; S.mana = Math.min(stats.maxMana, S.mana + ev.amount); res.manaFromBuffs = (res.manaFromBuffs || 0) + (S.mana - before);
        L('mana', ev.src, { gain: Math.round(S.mana - before) });
      } else if (ev.type === 'petAct') {
        if (P && ev.gen === P.gen) petAct();                  // events of a pet that was swapped out are ignored
      } else if (ev.type === 'petLand') {
        if (P && ev.gen === P.gen) petSpellHit(P.c.spell);
      } else if (ev.type === 'petSwing') {
        if (P && ev.gen === P.gen) petSwing();
      } else if (ev.type === 'summonEnd') {
        finishSummon(ev.to);
      } else if (ev.type === 'dotTick') {
        var d = S.dots[ev.key];
        if (!d || d.inst !== ev.inst) continue;               // refreshed or consumed [A14]
        periodicTick(ev.key, d.snap, ev.i, false);
        if (ev.i === d.ticks - 1) delete S.dots[ev.key];
      } else if (ev.type === 'dotTickX') {                     // DoT tick on an extra target (multi-DoT)
        var dx = S.xdots[ev.ti][ev.key];
        if (!dx || dx.inst !== ev.inst) continue;
        periodicTickX(ev.ti, ev.key, dx.snap, ev.i);
        if (ev.i === dx.ticks - 1) delete S.xdots[ev.ti][ev.key];
      } else if (ev.type === 'dmgTaken') {                          // damage taken (round 78)
        takeHit();
        H.push({ t: S.t + HIT, o: 1, type: 'dmgTaken' });
      } else if (ev.type === 'chanEnd') {                      // a channel shortened by pushback ends (round 78)
        var ch = S.channel;
        if (!ch || ch.inst !== ev.inst || ch.end > S.t + EPS) continue;
        if (ch.eurekaHeld) eurekaRelease();
        S.channel = null;
      } else if (ev.type === 'chanTick') {
        var c = S.channel;
        if (!c || c.inst !== ev.inst) continue;               // clipped
        if (ev.t > c.end + EPS) continue;                     // cut off by pushback (round 78); chanEnd closes the channel
        if (SPELLS[ev.key].aoe) aoeTick(ev.key, ev.i); else periodicTick(ev.key, c.snap, ev.i, true);
        var last = ev.i === table[ev.key].ticks - 1;
        if (last) { if (c.eurekaHeld) eurekaRelease(); S.channel = null; continue; }
        // A priority channel in a timeline gap ends when the next timeline entry is due (round 70).
        if (TL && TL.i < TL.list.length && TL.list[TL.i].t <= S.t + EPS && !c.tl) {
          if (c.eurekaHeld) eurekaRelease();
          S.channel = null; res.clipped++; row(ev.key).castTime -= (c.end - S.t);
          S.busyUntil = S.t; L('clip', ev.key, { for: 'timeline' }); scheduleDecide(S.t); continue;
        }
        // Clip the channel when something higher in the priority list is ready (and the GCD allows it).
        if (S.t >= S.gcdReady - EPS && !c.tl) {
          var idx = c.idx != null ? c.idx : ROT.indexOf(ev.key);   // the action that started it (round 106: an action's key need not be the spell's)
          var higher = pickAction(idx >= 0 ? idx : ROT.length);
          if (higher) {
            if (c.eurekaHeld) eurekaRelease();                // a clipped channel ends here
            S.channel = null; res.clipped++;
            row(ev.key).castTime -= (c.end - S.t);
            S.busyUntil = S.t; L('clip', ev.key, { for: higher.key });
            scheduleDecide(S.t);
          }
        }
      }
    }

    trackAuras(S.t, dur);                                   // close the last interval at the end of the fight
    res.uptime = up; res.auras = iv;
    res.petDmg = Object.keys(res.bySpell).filter(function (k) { return k.indexOf('pet:') === 0; })
      .reduce(function (a, k) { return a + res.bySpell[k].dmg; }, 0);
    res.dps = res.total / dur;
    res.duration = dur;
    // Execute split (round 44): health falls linearly [A24], so the boss is below executePct for the last executePct% of the fight.
    res.exTime = dur * cfg.fight.executePct / 100; res.preTime = dur - res.exTime; res.preDmg = res.total - res.exDmg;
    res.log = log;
    res.endMana = S.mana;
    res.shardsLeft = S.shards;
    return res;
  };

  // Monte-Carlo wrapper: averages `iterations` fights; keeps the log of the first fight.
  // Seed and length of fight i of a run (round 76: shared by WL.simulate and WL.firstFight, so fight #1 can be rebuilt
  // exactly). Fight length varies per fight (uniform ±durationVarPct) so results don't hinge on one exact length [A56].
  WL.fightParams = function (cfg, i) {
    var fseed = (cfg.fight.seed * 7919 + i) >>> 0, vp = cfg.fight.durationVarPct || 0;
    return { seed: fseed, duration: cfg.fight.duration * (1 + vp / 100 * (2 * WL.makeRng(fseed ^ 0x5bd1e995)() - 1)) };
  };
  // Fight #1 of a run with its full event log — the same fight WL.simulate keeps as firstFight / log.
  WL.firstFight = function (build, raceKey, cfg, stats, table) {
    stats = stats || WL.computeStats(build, raceKey, cfg);
    var fp = WL.fightParams(cfg, 0);
    return WL.simulateOnce(build, raceKey, cfg, { stats: stats, table: table || WL.buildSpellTable(build, stats, cfg), seed: fp.seed, duration: fp.duration, log: true });
  };
  // Round 76 (performance): a result without the parts that can be rebuilt on the page — the build, stats and spell
  // table (recomputed in a blink) and fight #1 with its log (~45 KB, rebuilt from its seed when a detail view needs it).
  // Used for results sent back by the Web Workers and for the default results shipped with the page.
  var HEAVY = { build: 1, stats: 1, table: 1, log: 1, firstFight: 1 };
  WL.stripResult = function (r) {
    var o = {}; Object.keys(r).forEach(function (k) { if (!HEAVY[k]) o[k] = r[k]; }); return o;
  };
  WL.hydrateResult = function (r, build, cfg) {
    r.build = build; r.stats = WL.computeStats(build, r.race, cfg); r.table = WL.buildSpellTable(build, r.stats, cfg);
    var ff = null, get = function () { return ff || (ff = WL.firstFight(build, r.race, cfg, r.stats, r.table)); };
    Object.defineProperty(r, 'firstFight', { get: get, enumerable: false, configurable: true });
    Object.defineProperty(r, 'log', { get: function () { return get().log; }, enumerable: false, configurable: true });
    return r;
  };

  WL.simulate = function (build, raceKey, cfg, opt) {
    opt = opt || {};
    var n = opt.iterations || cfg.fight.iterations;
    var stats = WL.computeStats(build, raceKey, cfg);
    var table = WL.buildSpellTable(build, stats, cfg);
    var dpsList = [], agg = {}, first = null, lifeTaps = 0, movingTaps = 0, minMana = Infinity, clipped = 0, durSum = 0, push = { n: 0, time: 0, resisted: 0 }, upPct = {};
    var tapPct = 0, petOomFights = 0, petOomSec = 0, idleSec = 0;             // W3 mana / pet-mana summary
    var exDmg = 0, exTime = 0, preDmg = 0, preTime = 0;                        // execute split (round 44)
    var skipAgg = {};                                                          // end-of-fight DoT skips (round 53)
    for (var i = 0; i < n; i++) {
      var fp = WL.fightParams(cfg, i);
      var r = WL.simulateOnce(build, raceKey, cfg, { stats: stats, table: table, seed: fp.seed, duration: fp.duration, log: i === 0 && opt.log !== false });
      if (i === 0) first = r;
      dpsList.push(r.dps); durSum += r.duration; lifeTaps += r.lifeTaps; movingTaps += r.movingTaps || 0; clipped += r.clipped; push.n += r.pushbacks; push.time += r.pushbackTime; push.resisted += r.pushResisted; minMana = Math.min(minMana, r.minMana);
      Object.keys(r.uptime).forEach(function (k) { upPct[k] = (upPct[k] || 0) + 100 * r.uptime[k] / r.duration; });
      tapPct += 100 * (r.tapTime || 0) / r.duration; idleSec += r.idle;
      exDmg += r.exDmg; exTime += r.exTime; preDmg += r.preDmg; preTime += r.preTime;
      Object.keys(r.dotSkips || {}).forEach(function (k) {
        var x = r.dotSkips[k], a = skipAgg[k] || (skipAgg[k] = { key: x.key, target: x.target, fights: 0, left: 0, value: 0, cost: 0, alt: {} });
        a.fights++; a.left += x.left; a.value += x.value; a.cost += x.cost; a.alt[x.filler] = (a.alt[x.filler] || 0) + 1;
      });
      if (r.petOomTime > 1e-9) { petOomFights++; petOomSec += r.petOomTime; }
      Object.keys(r.bySpell).forEach(function (k) {
        var a = agg[k] || (agg[k] = { casts: 0, landed: 0, misses: 0, crits: 0, hits: 0, ticks: 0, tickCrits: 0, dmg: 0, castTime: 0, glances: 0 });
        var b = r.bySpell[k];
        Object.keys(a).forEach(function (f) { a[f] += b[f] || 0; });
      });
    }
    Object.keys(agg).forEach(function (k) { Object.keys(agg[k]).forEach(function (f) { agg[k][f] /= n; }); });
    var mean = dpsList.reduce(function (a, b) { return a + b; }, 0) / n;
    var sorted = dpsList.slice().sort(function (a, b) { return a - b; });
    var median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    var sd = Math.sqrt(dpsList.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / Math.max(1, n - 1));
    Object.keys(upPct).forEach(function (k) { upPct[k] /= n; });                      // mean uptime % per fight (W4)
    // Per skipped DoT: share of fights with a skip, and the mean time left / value / cost at the first skip.
    Object.keys(skipAgg).forEach(function (k) { var a = skipAgg[k]; a.fightsPct = 100 * a.fights / n; a.left /= a.fights; a.value /= a.fights; a.cost /= a.fights; });
    // DPS distribution (W6): 24 equal bins between the lowest and highest fight
    var nb = 24, lo = sorted[0], hi = sorted[n - 1], w = (hi - lo) / nb || 1, counts = [];
    for (var b = 0; b < nb; b++) counts.push(0);
    dpsList.forEach(function (x) { counts[Math.min(nb - 1, Math.floor((x - lo) / w))]++; });
    return {
      uptimePct: upPct, dpsHist: { min: lo, max: hi, width: w, counts: counts },
      mana: { tapTimePct: tapPct / n, petOomFightsPct: 100 * petOomFights / n, petOomSecAvg: petOomFights ? petOomSec / petOomFights : 0, idleSecAvg: idleSec / n },
      build: build, race: raceKey, stats: stats, table: table, iterations: n,
      dps: mean, dpsMedian: median, dpsSd: sd, dpsMin: sorted[0], dpsMax: sorted[n - 1],
      dpsErr: 1.96 * sd / Math.sqrt(n),
      dpsPre: preTime ? preDmg / preTime : null, dpsExec: exTime ? exDmg / exTime : null,   // above / below the execute threshold
      execPct: cfg.fight.executePct,
      bySpell: agg, avgDuration: durSum / n, lifeTaps: lifeTaps / n, movingTaps: movingTaps / n, minMana: minMana, clipped: clipped / n,
      pushback: { n: push.n / n, time: push.time / n, resisted: push.resisted / n },   // per fight (round 78)
      dotSkips: skipAgg,
      log: first.log, firstFight: first,
    };
  };

  // Stat weights: DPS gained per 1 SP, per 1% hit, per 1% crit, per 1% haste, per 1 Int, per 1 Spell Pierce.
  // Common random numbers: baseline and every +stat run use the same seed, so noise largely cancels.
  WL.STAT_WEIGHT_KEYS = ['sp', 'hitPct', 'critPct', 'hastePct', 'int', 'pierce'];
  // One stat-weight run: the baseline DPS (k = null) or the DPS with +weightDeltas[k] of stat k (round 76: split out so
  // the Web Workers can run the 7 runs of a build in parallel; WL.statWeights combines them exactly as before).
  WL.statWeightRun = function (build, raceKey, cfg, n, k) {
    var c = cfg;
    if (k) { c = JSON.parse(JSON.stringify(cfg)); c.extra = c.extra || {}; c.extra[k] = (c.extra[k] || 0) + cfg.weightDeltas[k]; }
    return WL.simulate(build, raceKey, c, { iterations: n, log: false }).dps;
  };
  WL.combineWeights = function (cfg, base, dpsByKey) {
    var out = { base: base };
    WL.STAT_WEIGHT_KEYS.forEach(function (k) { out[k] = (dpsByKey[k] - base) / cfg.weightDeltas[k]; });
    return out;
  };
  WL.statWeights = function (build, raceKey, cfg, n) {
    var base = WL.statWeightRun(build, raceKey, cfg, n, null), by = {};
    WL.STAT_WEIGHT_KEYS.forEach(function (k) { by[k] = WL.statWeightRun(build, raceKey, cfg, n, k); });
    return WL.combineWeights(cfg, base, by);
  };
})();
