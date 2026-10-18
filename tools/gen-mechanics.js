// Fills the generated blocks of MECHANICS.md - the tables of spells, talents, races, pets, buffs, debuffs, consumables,
// builds and priority actions, and the worked examples - from the data and engine files, so the document cannot drift
// from what the sim uses.
//   node tools/gen-mechanics.js           rewrites the blocks between <!-- gen:NAME --> and <!-- /gen:NAME -->
//   node tools/gen-mechanics.js --check   changes nothing; exit code 1 if a block is out of date
// Every talent, spell and priority action needs a note below: the script stops if one is missing, so nothing new can
// be left out of the document. Every worked example is compared with the engine's own value before it is written.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const WL = require('./load-wl.js').load(ROOT);
const FILE = path.join(ROOT, 'MECHANICS.md');
const cfg = WL.DEFAULT_CONFIG;

// ---------- small helpers ----------
const n = (x, d) => Number(x).toLocaleString('en-US', { maximumFractionDigits: d == null ? 1 : d });
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const tv = (b, k, f) => WL.talentValue(b, k, f);
const clean = s => String(s).replace(/\s*\[A\d+\]/g, '').replace(/\|/g, '/');
function near(a, b, what) { if (!(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)))) throw new Error('worked example differs from the engine: ' + what + ' ' + a + ' vs ' + b); }
function table(head, rows) {
  return ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|'].concat(rows.map(r => '| ' + r.join(' | ') + ' |')).join('\n');
}

// ---------- notes: what the sim does with each talent ----------
const TALENT_NOTES = {
  improvedLifeTap: 'Life Tap gives (430 + Spirit) × 1.10 / 1.20 mana. Its health cost stays 430.',
  suppression: 'Adds to your hit chance. Your pet\'s spells use your hit chance too, and its melee misses less (see Pets). Also lowers all the threat you cause.',
  improvedCorruption: 'Shortens Corruption\'s 2 s cast (instant at 5 points) and adds to Corruption\'s periodic talent group.',
  grimReach: 'No effect on damage: the boss is always in range. The longer range (Affliction spells) is only listed.',
  soulHarvesting: 'Not simulated: it needs an enemy dying under your Drain Soul.',
  improvedDrains: 'Adds to the periodic talent group of Drain Life, Drain Soul and Wrack.',
  improvedBaneOfAgony: 'Adds to Bane of Agony\'s periodic talent group.',
  felConcentration: 'Only matters when "Take a hit every (s)" is set: chance to ignore the pushback on Drain Life, Drain Soul and Wrack.',
  amplifyCurse: 'Used with every Bane of Agony cast while its 3-minute cooldown is ready (off the global cooldown). Every tick of that Bane of Agony is multiplied by 1.5 after everything else (talents, auras, curse, crit). Never used on Bane of Doom.',
  pandemic: 'Crits of Corruption, Bane of Agony, Bane of Doom, Drain Soul, Drain Life, Siphon Life and Wrack deal ×1.665 / ×1.835 / ×2.0 instead of ×1.5.',
  malevolence: 'Adds to the crit chance of every Shadow spell of yours. Not added when "Sheet crit % already includes talents, racials & oil" is ticked.',
  nightfall: 'Every tick of Corruption, Drain Soul, Drain Life and Wrack has this chance to give Shadow Trance for 10 s: your next Shadow Bolt has no cast time (it still costs its mana and a global cooldown).',
  curseOfExhaustion: 'Not simulated (a movement slow).',
  siphonLife: 'Gives the spell Siphon Life.',
  soulSiphon: 'Multiplies the ticks of Drain Life, Drain Soul and Wrack by 1 + this much for each of these on the target: Corruption, Bane of Agony, Bane of Doom, Siphon Life, Curse of the Elements - up to the maximum. A multiplier of its own.',
  shadowMastery: 'Adds to the direct and the periodic talent group of every Shadow spell of yours. Not applied to Touch of the Grave or to pets.',
  wrack: 'Gives the spell Wrack.',
  improvedHealthFunnel: 'Not simulated (Health Funnel is never cast).',
  improvedImp: 'Multiplies the Imp\'s whole Firebolt hit by 1.10 / 1.20 / 1.30. Fire Shield is not simulated.',
  demonicEmbrace: 'Multiplies your Stamina. That only matters for your health and for Touch of the Grave.',
  unholyPower: 'Multiplies everything your demon deals: melee, Firebolt, Lash of Pain and the Demonic Brand hit.',
  demonicAegis: 'Not simulated (armor spells).',
  improvedVoidwalker: 'Not simulated.',
  felVitality: 'Multiplies your maximum mana (it adds with the Gnome\'s Expansive Mind) and your demon\'s maximum mana. Demon health is not simulated.',
  demonicEnergies: 'When you Life Tap, your demon gains 50 / 100% of the mana you actually gained (after the cap at your maximum mana). The healing part is not simulated.',
  improvedSayaad: 'Raises Lash of Pain\'s base value by 10 / 20 / 30%; its spell-power part is not raised. The other spells are not simulated.',
  demonicSacrifice: 'The demon is sacrificed before the pull. Imp: +15% Shadow damage. Succubus: +15% Fire damage (auras: they multiply). Voidwalker: 2% of your maximum mana every 4 s. Felhunter: 3% of your maximum health every 4 s. Without Demonic Pact it only counts with no demon out.',
  masterSummoner: 'Only used by the mid-fight pet swap: summon 2 / 4 s faster and 20 / 40% cheaper.',
  decimation: 'Soul Fire\'s cooldown is 45 / 90% shorter (60 s becomes 33 s / 6 s). A Shadow Bolt or Searing Pain that lands while the boss is below 35% health deals 3 / 6% more (added to the direct talent group) and gives a 10 s buff: the next Soul Fire casts 20 / 40% faster and needs no soul shard.',
  felDomination: 'Only used by the mid-fight pet swap: summon 6 s faster and 50% cheaper, 5 min cooldown.',
  demonicBrand: 'With a demon out, a landed Searing Pain brands the boss for 10 s with 2 / 4 / 6 charges. Each landed attack of your demon spends a charge and adds a bonus hit (see Pets). Searing Pain causes 17 / 33 / 50% less threat.',
  improvedFelhunter: 'Not simulated.',
  soulLink: 'While a demon is out: you and the demon deal 3% more (an aura: it multiplies), and the damage you do to yourself (Hellfire, Demonic Rune, Goblin Sapper) is 30% lower. Nothing of it after the demon is sacrificed.',
  demonicKnowledge: 'While a demon is out: +20 / 40 / 60 spell power for you, and the same amount on top of the demon\'s own spell power.',
  masterDemonologist: 'Succubus out: more Shadow damage for you and for her. Imp out: more Fire damage for you and for the Imp. An aura: it multiplies. Voidwalker and Felhunter: no damage effect.',
  demonicPact: 'Keeps the Demonic Sacrifice bonus while a different demon is out.',
  destructiveReach: 'No effect on damage: the boss is always in range. The longer range (Destruction spells) is only listed.',
  improvedShadowBolt: 'Every Shadow Bolt crit puts the debuff on that target for 12 s: your Shadow damage on it is this much higher - hits and ticks. No charges; a new crit restarts the 12 s. Another Warlock\'s debuff does not count for you, and demons do not benefit.',
  bane: 'Shorter cast of Shadow Bolt, Immolate and Incinerate (first values) and of Soul Fire (second values), before haste.',
  moltenSkin: 'Lowers the damage you do to yourself (Hellfire, Demonic Rune, Goblin Sapper). Multiplies with Soul Link. Life Tap is not reduced.',
  cataclysm: 'Lowers the mana cost of every Destruction spell.',
  aftermath: 'Adds to the direct talent group of Immolate\'s initial hit (not its burn). The daze is not simulated.',
  ruin: 'Crits of Destruction spells deal ×1.6 / 1.7 / 1.8 / 1.9 / 2.0 instead of ×1.5.',
  shadowburn: 'Gives the spell Shadowburn.',
  intensity: 'Only matters when "Take a hit every (s)" is set: chance to ignore the pushback on Destruction spells.',
  agonizingFlames: 'More crit chance for Searing Pain, and the damage value is added to both talent groups of every Destruction spell: direct hits and ticks (Immolate\'s burn, Rain of Fire) - except Hellfire.',
  conflagrate: 'Gives the spell Conflagrate.',
  pyroclasm: 'Not simulated (stuns).',
  baneOfHavoc: 'Only with 2 or 3 targets: Bane of Havoc sits on target 2, and 15% of everything you (not your demon) deal to the other targets is dealt to it as well.',
  fireAndBrimstone: 'Adds to Conflagrate\'s crit chance.',
  shadowAndFlame: 'A landed Conflagrate gives this much more Shadow damage for 20 s, a landed Shadowburn this much more Fire damage for 20 s (auras: they multiply). Second values: the chance that Conflagrate does not consume Immolate, and that Shadowburn refunds its soul shard.',
  incinerate: 'Gives the spell Incinerate.',
};
// label of each talent value: [text before the numbers, text after them]
const VALUE_LABELS = {
  'improvedLifeTap.manaPct': ['Life Tap mana +', '%'], 'suppression.hitPct': ['hit +', '%'], 'suppression.threatPct': ['threat −', '%'],
  'improvedCorruption.castRed': ['Corruption cast −', ' s'], 'improvedCorruption.dmgPct': ['Corruption damage +', '%'],
  'grimReach.rangePct': ['range +', '%'], 'improvedDrains.dmgPct': ['drain damage +', '%'],
  'improvedBaneOfAgony.dmgPct': ['Bane of Agony damage +', '%'], 'felConcentration.resistPct': ['pushback ignored ', '%'],
  'amplifyCurse.boaPct': ['Bane of Agony +', '%'], 'pandemic.critBonusPct': ['crit bonus +', '%'],
  'malevolence.shadowCritPct': ['Shadow crit +', '%'], 'nightfall.procPct': ['chance per tick ', '%'],
  'soulSiphon.perEffectPct': ['per effect +', '%'], 'soulSiphon.maxPct': ['maximum +', '%'], 'shadowMastery.shadowPct': ['Shadow damage +', '%'],
  'improvedImp.firebolt': ['Firebolt +', '%'], 'demonicEmbrace.staPct': ['Stamina +', '%'], 'unholyPower.petDmgPct': ['demon damage +', '%'],
  'felVitality.manaPct': ['maximum mana +', '%'], 'demonicEnergies.healPct': ['heal (not simulated) ', '%'], 'demonicEnergies.tapPct': ['Life Tap mana to the demon ', '%'],
  'improvedSayaad.lashPct': ['Lash of Pain base +', '%'], 'demonicSacrifice.schoolPct': ['Shadow / Fire damage +', '%'],
  'decimation.sfCdRedPct': ['Soul Fire cooldown −', '%'], 'decimation.dmgPct': ['damage below 35% +', '%'], 'decimation.sfCastRedPct': ['Soul Fire cast −', '%'],
  'demonicBrand.threatRedPct': ['Searing Pain threat −', '%'], 'demonicBrand.charges': ['charges ', ''],
  'soulLink.dmgPct': ['damage +', '%'], 'soulLink.toPetPct': ['damage to yourself −', '%'], 'demonicKnowledge.levelPct': ['spell power: ', '% of your level'],
  'masterDemonologist.schoolPct': ['Shadow / Fire damage +', '%'], 'destructiveReach.rangePct': ['range +', '%'],
  'improvedShadowBolt.debuffPct': ['Shadow damage taken +', '%'], 'bane.castRed': ['cast −', ' s'], 'bane.sfCastRed': ['Soul Fire cast −', ' s'],
  'moltenSkin.dmgTakenPct': ['damage to yourself −', '%'], 'cataclysm.costRedPct': ['mana cost −', '%'], 'aftermath.immoInitPct': ['Immolate hit +', '%'],
  'ruin.critBonusPct': ['crit bonus +', '%'], 'intensity.resistPct': ['pushback ignored ', '%'],
  'agonizingFlames.spCritPct': ['Searing Pain crit +', '%'], 'agonizingFlames.dmgPct': ['Destruction damage +', '%'],
  'fireAndBrimstone.conflagCritPct': ['Conflagrate crit +', '%'], 'shadowAndFlame.schoolPct': ['Shadow / Fire damage +', '%'], 'shadowAndFlame.procPct': ['chance ', '%'],
};

// ---------- notes: how each spell behaves in the sim ----------
const SPELL_NOTES = {
  shadowBolt: 'A crit applies Improved Shadow Bolt (with the talent). No cast time under Shadow Trance. A hit while the boss is below 35% health triggers Decimation (with the talent). Projectile.',
  immolate: 'A direct hit plus a 15 s burn. Aftermath only raises the hit. Conflagrate needs it on the target, and Incinerate deals 25% more while it is there.',
  incinerate: '25% more damage if your Immolate is on the target when it lands. Projectile.',
  searingPain: 'Causes twice its damage as threat. Applies Demonic Brand (with the talent and a demon out). A hit while the boss is below 35% health triggers Decimation (with the talent).',
  conflagrate: 'Can only be cast with your Immolate on the target and consumes it - unless Shadow and Flame keeps it.',
  shadowburn: 'Uses a soul shard; shards never run out in the sim.',
  soulFire: 'Its cooldown starts when the cast is complete. Uses a soul shard (unlimited). With the Decimation buff: faster cast, no shard. Projectile.',
  hellfire: 'Channel. Every tick hits every target of the fight (each with its own hit, crit and resist roll) and hits you for the tick\'s value before talents (206 + 0.022 × SP), without a crit, reduced by Molten Skin and Soul Link. Only started when your health covers the whole channel, counting the heals due during it; it stops early if the next tick would kill you. Agonizing Flames does not apply.',
  rainOfFire: 'Channel. Every tick hits every target of the fight (each with its own hit, crit and resist roll). Agonizing Flames applies.',
  corruption: 'A DoT with a cast time, unless Improved Corruption makes it instant.',
  baneOfAgony: 'The ticks ramp up: ticks 1-4 deal 50%, ticks 5-8 100% and ticks 9-12 150% of the tick value in the table. One Bane per target.',
  baneOfDoom: 'One hit after 60 s. It counts as a periodic tick (periodic talent group, it can crit). Only cast when at least 60 s of the fight are left. One Bane per target.',
  baneOfHavoc: 'Off the global cooldown; only cast with 2 or 3 targets, on target 2. While it is up, 15% of what you deal to the other targets is also dealt to target 2.',
  siphonLife: 'A DoT that heals you for the damage it deals.',
  drainLife: 'Channel; heals you for the damage it deals.',
  drainSoul: 'Listed because talents name it. No priority action casts it.',
  wrack: 'Channel. While it runs, the ticks of your Corruption, Bane of Agony, Siphon Life and Bane of Doom deal 10% more. It counts as a drain for Improved Drains, Soul Siphon, Fel Concentration and Nightfall.',
  deathCoil: 'Heals you for the damage it deals. Projectile.',
  curseOfElements: 'Has to hit. On the target for 5 minutes: it takes 10% more damage from your spells, your demon\'s spells and your explosives, and its resistance drops by 75 (which removes the level resistance).',
  lifeTap: 'Instant, one global cooldown: 430 health become (430 + Spirit) mana, more with Improved Life Tap. It does not restart the 5-second rule.',
};

// ---------- notes: when each priority action casts ----------
const ACTION_NOTES = {
  curseOfElements: 'The option "Keep Curse of the Elements up" is on, the curse is not on the boss and more than 10 s of the fight are left.',
  shadowTrance: 'Shadow Trance (Nightfall) is up: an instant Shadow Bolt.',
  bane: 'No Bane of yours is on the boss. Bane of Doom if it is off cooldown and at least 60 s are left; otherwise Bane of Agony, near the end only while it still pays off.',
  baneOfAgony: 'No Bane of yours is on the boss; near the end only while it still pays off. Never casts Bane of Doom.',
  corruption: 'Corruption is missing or would run out before a new cast lands; near the end only while it still pays off.',
  siphonLife: 'Siphon Life is missing or about to run out; near the end only while it still pays off.',
  immolate: 'Immolate is missing or would run out before a new cast lands; near the end only while it still pays off. With "Conflagrate only when Immolate is about to expire" in the list, a running Immolate is not refreshed while Conflagrate is ready.',
  conflagrate: 'Conflagrate is off cooldown and Immolate is on the boss.',
  conflagrateExpire: 'Conflagrate is off cooldown and Immolate has at most 3 s left.',
  shadowburn: 'Shadowburn is off cooldown.',
  shadowburnSnF: 'Shadow and Flame is talented, Shadowburn is off cooldown, and its Fire buff is missing or has at most 3 s left.',
  conflagrateSnF: 'Shadow and Flame is talented, Conflagrate is off cooldown, Immolate is on the boss, and the Shadow buff is missing or has at most 3 s left.',
  multiDot: 'With 2 or 3 targets: on each extra target, first your Curse of the Elements (if the option is on), then Corruption, Siphon Life, Bane of Agony and Immolate when missing or about to run out. No Bane of Agony on the Bane of Havoc target. Added by itself right above the filler when "Multi-DoT the extra targets" is ticked.',
  shadowBoltSpread: 'With 2 or 3 targets and Improved Shadow Bolt: a Shadow Bolt at an extra target that carries one of your DoTs and whose own Improved Shadow Bolt is missing or runs out before the bolt lands.',
  isbUpkeep: 'Improved Shadow Bolt is talented and the debuff on the boss is missing or runs out within one Shadow Bolt cast.',
  deathCoil: 'Death Coil is off cooldown.',
  deathCoilFinisher: 'Death Coil is off cooldown, less time is left than the filler\'s cast (a channel: one tick) and the coil can still land.',
  swapToImp: 'Once, at the first decision below 35% boss health: Demonic Sacrifice on the demon that is out, Fel Domination, then the Imp is summoned. Needs Demonic Sacrifice, Demonic Pact, Fel Domination and another demon out.',
  swapToSuccubus: 'The same, summoning the Succubus.',
  searingPainExecute: 'The boss is below 35% health.',
  searingPainDecimation: 'Below 35% health, with Decimation and a Soul Fire action in the list: one Searing Pain when Soul Fire comes off cooldown within one Searing Pain cast, the Decimation buff would not be up by then, and the Soul Fire still fits before the end.',
  soulFire: 'The Decimation buff is up and Soul Fire is off cooldown.',
  lifeTapPet: 'With Demonic Energies and a demon out: the demon has less mana than two of its spells cost, and you are missing at least one full Life Tap of mana.',
  lifeTapBelow: 'Your mana is below the first number (% of maximum) and more than the second number of seconds are left. Each build sets its own two numbers.',
  searingPainBrand: 'With Demonic Brand and a demon out: the brand is not on the boss or has no charges left.',
  soulFireShards: 'Soul Fire is off cooldown, with or without the Decimation buff.',
  wrackDots: 'The shortest of the DoTs this list keeps up (Corruption, Immolate, Siphon Life, Bane of Agony; not Bane of Doom) has more than the build\'s number of seconds left. Otherwise the list goes on to the filler below.',
  wrack: 'Always (filler).',
  shadowBolt: 'Always (filler).',
  incinerate: 'Always (filler).',
  drainLife: 'Always (filler).',
  hellfire: 'Always (filler), if your health covers the whole channel.',
  rainOfFire: 'Always (filler).',
  searingPain: 'Always (filler).',
};

// ---------- blocks ----------
const B = {};
const SP = WL.SPELLS;
function ticksOf(s) { return s.tickBase != null ? Math.round(s.duration / s.tickEvery) : 0; }
function spellDamage(s) {
  const t = ticksOf(s), tick = s.tickBase + ' + ' + s.tickCoef + ' × SP';
  if (s.kind === 'direct') return s.base + ' + ' + s.coef + ' × SP';
  if (s.kind === 'hybrid') return s.base + ' + ' + s.coef + ' × SP, then ' + t + ' ticks of ' + tick + ', one every ' + s.tickEvery + ' s';
  if (s.kind === 'dot' || s.kind === 'channel') return t === 1 ? tick + ', once, after ' + s.duration + ' s' : t + ' ticks of ' + tick + ', one every ' + s.tickEvery + ' s';
  return '—';
}
function spellName(s) { return s.name + (s.rank ? ' (Rank ' + s.rank + ')' : ''); }
B.spells = (function () {
  const rows = Object.keys(SP).map(k => {
    const s = SP[k];
    if (!SPELL_NOTES[k]) throw new Error('no note for the spell ' + k);
    return [spellName(s), cap(s.school), cap(s.tree), spellDamage(s),
      s.kind === 'channel' ? 'channel, ' + s.duration + ' s' : s.cast ? s.cast + ' s' : 'instant',
      s.healthCost ? s.healthCost + ' health' : String(s.cost), s.cd ? s.cd + ' s' : '—', s.range ? s.range + ' yd' : 'self'];
  });
  const fam = t => Object.keys(SP).filter(k => SP[k].tree === t && SP[k].kind !== 'utility').map(k => SP[k].name).join(', ');
  return table(['Spell', 'School', 'Family', 'Damage', 'Cast', 'Mana', 'Cooldown', 'Range'], rows) +
    '\n\n**Destruction spells** (Ruin, Agonizing Flames, Cataclysm, Intensity): ' + fam('destruction') + '.\n' +
    '**Affliction spells:** ' + fam('affliction') + '.\n\n' +
    Object.keys(SP).map(k => '- **' + SP[k].name + '.** ' + SPELL_NOTES[k]).join('\n');
})();
B.bookranks = table(['Spell', 'Trainer rank (default)', 'Book rank (option)'], Object.keys(WL.BOOK_RANKS).map(k => {
  const a = SP[k], b = Object.assign({}, a, WL.BOOK_RANKS[k]);
  return [a.name, 'Rank ' + a.rank + ': ' + spellDamage(a) + '; ' + a.cost + ' mana', 'Rank ' + b.rank + ': ' + spellDamage(b) + '; ' + b.cost + ' mana'];
}));

Object.keys(WL.TREES).forEach(tree => {
  B['talents-' + tree] = table(['Talent', 'Points', 'Value per point', 'What it does in the sim'], WL.TALENTS.filter(t => t.tree === tree).map(t => {
    if (!TALENT_NOTES[t.key]) throw new Error('no note for the talent ' + t.key);
    const vals = Object.keys(t.v).map(f => {
      const l = VALUE_LABELS[t.key + '.' + f];
      if (!l) throw new Error('no label for the talent value ' + t.key + '.' + f);
      return l[0] + t.v[f].join(' / ') + l[1];
    });
    return [t.name, String(t.ranks), vals.join('; ') || '—', TALENT_NOTES[t.key]];
  }));
});
Object.keys(TALENT_NOTES).forEach(k => { if (!WL.TALENT_BY_KEY[k]) throw new Error('note for an unknown talent ' + k); });

B.races = (function () {
  const b = WL.WARLOCK_BASE_60, sign = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
  const rows = WL.RACE_KEYS.map(k => {
    const r = WL.RACES[k], o = r.offset;
    return [r.name, sign(o.int), sign(o.spi), sign(o.sta), r.racials.map(x => x.name).join(', ')];
  });
  return 'Level-60 Warlock before the race: Intellect ' + b.int + ', Spirit ' + b.spi + ', Stamina ' + b.sta + ', base mana ' + n(b.mana, 0) + ', base health ' + n(b.health, 0) + '.\n\n' +
    table(['Race', 'Intellect', 'Spirit', 'Stamina', 'Racials in the sim'], rows);
})();

B.gear = (function () {
  const g = cfg.gear, f = cfg.fight;
  return '- **Gear (character sheet, before talents, racials and weapon stone):** ' + g.sp + ' spell power, ' + g.hitPct + '% hit, ' + g.critPct + '% crit, ' + g.hastePct + '% haste, Intellect ' + g.int +
    ', Spirit ' + g.spi + ', Stamina ' + g.sta + ', MP5 ' + g.mp5 + ', Spell Pierce ' + g.pierce + ', Spell Penetration ' + (g.spellPen || 0) + '.\n' +
    '- **Fight:** ' + f.duration + ' s ± ' + f.durationVarPct + '%, ' + n(f.iterations, 0) + ' fights per build and race, ' + f.targets + ' target, execute phase below ' + f.executePct +
    '% boss health, healing on you ' + n(f.healAmount, 0) + ' every ' + f.healEvery + ' s.\n' +
    '- **Hit-capped preset:** 1,000 spell power, 17% hit, 20% crit, Intellect 250, Spirit 100, Stamina 300.';
})();

B.pets = table(['Demon', 'Spell', 'Melee', 'Mana'], Object.keys(cfg.pets).map(k => {
  const p = cfg.pets[k], s = p.spell, m = p.melee;
  return [p.name,
    s ? s.name + ': ' + s.base + ' + ' + s.coef + ' × demon SP, ' + cap(s.school) + ', ' + (s.cast ? s.cast + ' s cast' : 'instant') + (s.cd ? ', ' + s.cd + ' s cooldown' : '') + ', ' + s.cost + ' mana' : '—',
    m ? m.baseDps + ' base DPS, one swing every ' + m.swing + ' s, crit = your spell crit' + (m.range ? ', ' + m.range + ' yd range' : '') : '—',
    n(p.mana, 0) + ', +' + p.manaRegen + ' per second'];
}));

function onOff(x) { return x.on ? 'on' : 'off'; }
B.buffs = table(['Buff', 'From', 'Default', 'Effect in the sim'], Object.keys(cfg.buffs).map(k => { const b = cfg.buffs[k]; return [b.name, b.cls, onOff(b), clean(b.desc)]; }));
B.debuffs = table(['Debuff', 'From', 'Default', 'Effect in the sim'], Object.keys(cfg.debuffs).map(k => { const d = cfg.debuffs[k]; return [d.name, d.cls, onOff(d), clean(d.desc)]; }));
B.consumables = (function () {
  const C = WL.CONSUMABLES, keys = Object.keys(C);
  return table(['Consumable', 'Kind', 'Default', 'Effect in the sim', 'Cannot be combined with'], keys.map(k => {
    const c = C[k], same = keys.filter(x => x !== k && C[x].group === c.group).map(x => C[x].name);
    return [c.name, c.cat, onOff(c), clean(c.desc), same.join(', ') || '—'];
  }));
})();

function actionLabel(b, a) {
  const A = WL.ACTIONS[a], p = (b.params || {})[a] || {};
  let i = 0;
  return A.label.replace(/_/g, () => { const q = A.params[i++]; return p[q.key] != null ? p[q.key] : q.def; });
}
B.builds = WL.BUILDS.map(b => {
  const pts = { affliction: 0, demonology: 0, destruction: 0 }, names = { affliction: [], demonology: [], destruction: [] };
  Object.keys(b.talents).forEach(k => { const t = WL.TALENT_BY_KEY[k]; pts[t.tree] += b.talents[k]; });
  WL.TALENTS.forEach(t => { if (b.talents[t.key]) names[t.tree].push(t.name + ' ' + b.talents[t.key] + '/' + t.ranks); });
  const pet = b.pet ? cfg.pets[b.pet].name + ' out' : 'no demon out', sac = b.sacrifice ? cfg.pets[b.sacrifice].name + ' sacrificed' : 'nothing sacrificed';
  return '### ' + b.short + ' (' + pts.affliction + '/' + pts.demonology + '/' + pts.destruction + ')\n' +
    '- ' + pet + ', ' + sac + ', ' + WL.OILS[b.oil].name + '.\n' +
    Object.keys(names).filter(t => names[t].length).map(t => '- ' + cap(t) + ': ' + names[t].join(', ') + '.').join('\n') + '\n' +
    '- Priority: ' + b.rotation.map((a, i) => (i + 1) + '. ' + actionLabel(b, a)).join(' · ') + '.';
}).join('\n\n');

B.actions = table(['Priority action', 'It casts when'], Object.keys(WL.ACTIONS).map(k => {
  if (!ACTION_NOTES[k]) throw new Error('no note for the priority action ' + k);
  return [WL.ACTIONS[k].label.replace(/_/g, '…'), ACTION_NOTES[k]];
}));
Object.keys(ACTION_NOTES).forEach(k => { if (!WL.ACTIONS[k]) throw new Error('note for an unknown priority action ' + k); });

// ---------- worked examples ----------
B.examples = (function () {
  const out = [], P = s => out.push(s);
  const build = WL.BUILDS.filter(b => b.key === 'demo_pact_succ_sb')[0], race = 'undead';
  const st = WL.computeStats(build, race, cfg), tb = WL.buildSpellTable(build, st, cfg), cb = cfg.combat, g = cfg.gear;
  const coe = 1 + SP.curseOfElements.dmgTakenPct / 100, isb = 1 + tv(build, 'improvedShadowBolt', 'debuffPct') / 100;
  const bd = stat => st.breakdown.filter(e => e.stat === stat);
  const src = e => clean(e.source).replace(/^Base \(L60 Warlock\)$/, 'base').replace(/ offset$/, '').replace(/^Gear$/, 'gear');
  function statLine(stat, total) {
    const all = bd(stat), flat = all.filter(e => !/^Blessing of Kings/.test(e.source)), kings = all.filter(e => /^Blessing of Kings/.test(e.source))[0];
    if (flat.some(e => /%/.test(e.source))) throw new Error('worked example: ' + stat + ' has a percentage bonus this text does not cover');
    const sum = flat.reduce((a, e) => a + e.value, 0), kp = WL.activeBuffs(cfg).reduce((a, x) => a + (x.statPct || 0), 0);
    near(sum * (1 + kp / 100), total, stat);
    return '(' + flat.map((e, i) => (i ? (e.value < 0 ? '− ' : '+ ') : '') + Math.abs(e.value) + ' ' + src(e)).join(' ') + ')' + (kings ? ' × ' + (1 + kp / 100).toFixed(2) + ' Blessing of Kings' : '') + ' = **' + n(total) + '**';
  }
  const auras = bd('shadowDmgPct').concat(bd('allDmgPct'));
  const auraMult = auras.reduce((a, e) => a * (1 + e.value / 100), 1);
  const auraText = auras.map(e => (1 + e.value / 100).toFixed(2) + ' ' + src(e)).join(' × ');
  near(auraMult, st.mult.shadow * st.mult.all, 'Shadow auras');

  P('The examples use the build **' + build.short + '** as an Undead with the default gear, raid buffs and boss debuffs. Every number below is checked against the sim\'s own value when this document is generated.');
  P('');
  P('#### 1. The character\'s stats');
  P('- Intellect: ' + statLine('int', st.int));
  P('- Spirit: ' + statLine('spi', st.spi));
  P('- Stamina: ' + statLine('sta', st.sta));
  const manaFlat = WL.WARLOCK_BASE_60.mana + 20 + cb.manaPerInt * (st.int - 20), manaPct = tv(build, 'felVitality', 'manaPct');
  near(manaFlat * (1 + manaPct / 100), st.maxMana, 'mana');
  P('- Maximum mana: (' + n(WL.WARLOCK_BASE_60.mana, 0) + ' + 20 + ' + cb.manaPerInt + ' × (' + n(st.int) + ' − 20)) × ' + (1 + manaPct / 100).toFixed(2) + ' Fel Vitality = **' + n(st.maxMana) + '**');
  near(WL.WARLOCK_BASE_60.health + 20 + 10 * (st.sta - 20), st.maxHealth, 'health');
  P('- Maximum health: ' + n(WL.WARLOCK_BASE_60.health, 0) + ' + 20 + 10 × (' + n(st.sta) + ' − 20) = **' + n(st.maxHealth) + '**');
  const spE = bd('sp'), shE = bd('shadowSp');
  near(spE.reduce((a, e) => a + e.value, 0), st.sp, 'sp');
  P('- Spell power: ' + spE.map(e => e.value + ' ' + src(e).replace(/ \(.*\)$/, '')).join(' + ') + ' = **' + n(st.sp) + '**' + (shE.length ? '; Shadow spells: + ' + shE.map(e => e.value + ' ' + src(e)).join(' + ') + ' = **' + n(st.sp + st.schoolSp.shadow) + '**' : ''));
  const hitE = bd('hitPct');
  P('- Hit: ' + hitE.map(e => e.value + ' ' + src(e).replace(/^Base vs L63 boss$/, 'base against a level-63 boss')).join(' + ') + ' = **' + n(st.hitPct) + '%**');
  const critE = bd('critPct');
  near(critE.reduce((a, e) => a + e.value, 0), st.critPct, 'crit');
  P('- Crit: ' + critE.map(e => n(e.value, 2) + ' ' + src(e).replace(/^Character sheet \(base \+ Int \+ gear\)$/, 'sheet').replace(/^Extra Int (.*) \/ 60$/, 'from $1 Intellect above the sheet ÷ 60')).join(' + ') + ' = **' + n(st.critPct, 2) + '%**');
  P('- Haste: **' + n(st.hastePct) + '%** (' + st.oilName + ').');
  P('');

  // Shadow Bolt
  const sb = tb.shadowBolt, sbS = SP.shadowBolt, sbBase = sbS.base + sbS.coef * sb.sp;
  const grp = [['Shadow Mastery', tv(build, 'shadowMastery', 'shadowPct')], ['Agonizing Flames', tv(build, 'agonizingFlames', 'dmgPct')]].filter(x => x[1]);
  near(sbBase * (1 + sb.op0) * auraMult, sb.directDmg, 'Shadow Bolt');
  near(grp.reduce((a, x) => a + x[1], 0) / 100, sb.op0, 'Shadow Bolt talent group');
  P('#### 2. Shadow Bolt');
  P('1. Base hit: ' + sbS.base + ' + ' + sbS.coef + ' × ' + n(sb.sp) + ' = ' + n(sbBase));
  P('2. Direct talent group (these add up): ' + grp.map(x => x[0] + ' +' + x[1] + '%').join(', ') + ' → × ' + (1 + sb.op0).toFixed(2));
  P('3. Auras (each multiplies): ' + auraText + ' = × ' + n(auraMult, 4));
  P('4. Hit before the boss\'s debuffs: ' + n(sbBase) + ' × ' + (1 + sb.op0).toFixed(2) + ' × ' + n(auraMult, 4) + ' = **' + n(sb.directDmg) + '**');
  P('5. With Curse of the Elements (× ' + coe.toFixed(2) + ') and Improved Shadow Bolt (× ' + isb.toFixed(2) + ') on the boss: **' + n(sb.directDmg * coe * isb) + '**');
  P('6. A crit (chance ' + n(sb.critPct, 2) + '%) deals × ' + n(sb.critMult, 3) + ' with Ruin: **' + n(sb.directDmg * coe * isb * sb.critMult) + '**');
  P('7. Cast time: ' + sbS.cast + ' s − ' + tv(build, 'bane', 'castRed') + ' s Bane = ' + sb.cast + ' s, ÷ ' + (1 + st.hastePct / 100).toFixed(2) + ' haste = ' + n(sb.cast / (1 + st.hastePct / 100), 2) + ' s. It misses ' + n(100 - st.hitPct) + '% of the time.');
  P('');

  // Corruption
  const co = tb.corruption, coS = SP.corruption, coBase = coS.tickBase + coS.tickCoef * co.sp;
  const cgrp = [['Shadow Mastery', tv(build, 'shadowMastery', 'shadowPct')], ['Improved Corruption', tv(build, 'improvedCorruption', 'dmgPct')]].filter(x => x[1]);
  near(coBase * (1 + co.op22) * auraMult, co.tickDmg, 'Corruption');
  near(cgrp.reduce((a, x) => a + x[1], 0) / 100, co.op22, 'Corruption talent group');
  P('#### 3. Corruption');
  P('1. Base tick: ' + coS.tickBase + ' + ' + coS.tickCoef + ' × ' + n(co.sp) + ' = ' + n(coBase));
  P('2. Periodic talent group: ' + cgrp.map(x => x[0] + ' +' + x[1] + '%').join(', ') + ' → × ' + (1 + co.op22).toFixed(2));
  P('3. Auras: × ' + n(auraMult, 4) + ' as above → **' + n(co.tickDmg) + '** per tick');
  P('4. With the curse and Improved Shadow Bolt on the boss: **' + n(co.tickDmg * coe * isb) + '** per tick, ' + co.ticks + ' ticks = ' + n(co.tickDmg * coe * isb * co.ticks) + ' before crits');
  P('5. Every tick rolls its own crit (' + n(co.critPct, 2) + '%, × ' + n(co.critMult, 3) + '). The spell power is read at each tick, so a potion or Blood Fury that starts later still counts for the ticks after it.');
  P('');

  // Bane of Doom
  const bo = tb.baneOfDoom, boS = SP.baneOfDoom;
  near((boS.tickBase + boS.tickCoef * bo.sp) * (1 + bo.op22) * auraMult, bo.tickDmg, 'Bane of Doom');
  P('#### 4. Bane of Doom');
  P('(' + n(boS.tickBase, 0) + ' + ' + boS.tickCoef + ' × ' + n(bo.sp) + ') × ' + n(auraMult, 4) + ' auras = **' + n(bo.tickDmg) + '**; with the curse and Improved Shadow Bolt on the boss **' + n(bo.tickDmg * coe * isb) + '**; a crit deals × ' + n(bo.critMult, 3) + '.');
  P('');

  // Touch of the Grave
  const tog = WL.RACES.undead.racials.filter(r => r.effect === 'proc')[0], togBase = st.maxHealth * tog.maxHealthPct / 100;
  P('#### 5. Touch of the Grave');
  P(n(st.maxHealth) + ' health × ' + tog.maxHealthPct + '% = **' + n(togBase) + '**. Nothing multiplies it: no aura, no curse, no Improved Shadow Bolt, no Power Infusion. No spell power, no crit, no resist roll. ' + tog.chancePct + '% chance per landed damaging cast, then nothing for ' + tog.icd + ' s.');
  P('');

  // Succubus
  const pc = cfg.pets.succubus, m = pc.melee, pm = cb.petMelee, lash = pc.spell;
  const up = 1 + tv(build, 'unholyPower', 'petDmgPct') / 100, md = 1 + tv(build, 'masterDemonologist', 'schoolPct') / 100, all = st.mult.all;
  const hitBonus = Math.max(0, st.hitPct - cb.baseHitPct - pm.hitSuppressionPct), miss = Math.max(0, pm.missPct - hitBonus);
  const critCh = Math.max(0, st.critPct - pm.critSuppressionPct), plain = 100 - miss - pm.dodgePct - pm.glancePct - critCh;
  const ap = m.apPerSp * st.sp, dps = m.baseDps + ap / m.apPerDps, armor = WL.bossArmor(cfg), red = WL.armorReduction(cfg), swing = dps * m.swing * (1 - red) * up * all;
  const petSp = st.sp * cfg.petSpPct / 100 + st.dkSp, lashBase = lash.base * (1 + tv(build, 'improvedSayaad', 'lashPct') / 100);
  const petShadow = up * all * md * coe, lashHit = (lashBase + lash.coef * petSp) * petShadow;
  const db = cfg.demonicBrand, brandBase = (db.baseMin + db.baseMax) / 2, brand = (brandBase + db.shadowSpCoef * (st.sp + st.schoolSp.shadow)) * petShadow;
  P('#### 6. The Succubus');
  P('- Attack table of one swing: miss ' + pm.missPct + '% − (' + n(st.hitPct) + ' − ' + cb.baseHitPct + ' − ' + pm.hitSuppressionPct + ')% = **' + n(miss) + '%**, dodge **' + pm.dodgePct + '%**, glancing blow **' + pm.glancePct + '%** (at ' + pm.glanceDmgPct + '% damage), crit ' +
    'your spell crit ' + n(st.critPct, 2) + ' − ' + pm.critSuppressionPct + ' = **' + n(critCh, 2) + '%** (× 2), normal hit the remaining **' + n(plain, 2) + '%**.');
  P('- Attack power from you: ' + n(st.sp) + ' spell power ÷ 6 = ' + n(ap) + '. Damage per second: ' + m.baseDps + ' + ' + n(ap) + ' ÷ ' + m.apPerDps + ' = ' + n(dps, 2) + '.');
  P('- Boss armor: ' + n(cb.bossArmor, 0) + ' − armor debuffs = ' + n(armor, 0) + ' → ' + n(armor, 0) + ' ÷ (' + n(armor, 0) + ' + 5,500) = ' + n(red * 100, 2) + '% less physical damage.');
  P('- One normal swing: ' + n(dps, 2) + ' × ' + m.swing + ' s × (1 − ' + n(red, 4) + ') × ' + up.toFixed(2) + ' Unholy Power × ' + all.toFixed(2) + ' Soul Link = **' + n(swing) + '**. Master Demonologist and Curse of the Elements do not apply to melee.');
  P('- Her spell power: ' + cfg.petSpPct + '% of ' + n(st.sp) + ' + ' + st.dkSp + ' Demonic Knowledge = ' + n(petSp) + '.');
  P('- Lash of Pain: (' + lash.base + ' × ' + (1 + tv(build, 'improvedSayaad', 'lashPct') / 100).toFixed(2) + ' Improved Sayaad + ' + lash.coef + ' × ' + n(petSp) + ') × ' + up.toFixed(2) + ' × ' + all.toFixed(2) + ' × ' + md.toFixed(2) + ' Master Demonologist × ' + coe.toFixed(2) + ' curse = **' + n(lashHit) + '**; it crits with your spell crit (' + n(st.critPct, 2) + '%) for × ' + cb.critMultiplier + '.');
  P('- Demonic Brand hit: (' + brandBase + ' + ' + db.shadowSpCoef + ' × ' + n(st.sp + st.schoolSp.shadow) + ' Shadow spell power) × the same four multipliers = **' + n(brand) + '**. It cannot miss or crit.');
  P('');

  // Life Tap
  const tap = (SP.lifeTap.manaBase + st.spi) * (1 + tv(build, 'improvedLifeTap', 'manaPct') / 100);
  P('#### 7. Life Tap');
  const ilt = tv(build, 'improvedLifeTap', 'manaPct');
  P((ilt ? '(' : '') + SP.lifeTap.manaBase + ' + ' + n(st.spi) + ' Spirit' + (ilt ? ') × ' + (1 + ilt / 100).toFixed(2) + ' Improved Life Tap' : '') + ' = **' + n(tap) + ' mana** for ' + SP.lifeTap.healthCost +
    ' health and one global cooldown' + (ilt ? '.' : ' (this build has no Improved Life Tap; with 2/2 it would be ' + n(tap * 1.2) + ').'));
  P('');

  // Destruction: additive talent group
  const b2 = WL.BUILDS.filter(b => b.key === 'destro_incin_succ')[0], st2 = WL.computeStats(b2, race, cfg), t2 = WL.buildSpellTable(b2, st2, cfg);
  if (Math.abs(st2.mult.fire * st2.mult.all - 1) > 1e-9) throw new Error('worked example: the Destruction build has Fire auras this text does not cover');
  const im = t2.immolate, imS = SP.immolate, inc = t2.incinerate, inS = SP.incinerate;
  const agf = tv(b2, 'agonizingFlames', 'dmgPct'), aft = tv(b2, 'aftermath', 'immoInitPct'), snf = 1 + tv(b2, 'shadowAndFlame', 'schoolPct') / 100;
  near((imS.base + imS.coef * im.sp) * (1 + (agf + aft) / 100), im.directDmg, 'Immolate hit');
  near((imS.tickBase + imS.tickCoef * im.sp) * (1 + agf / 100), im.tickDmg, 'Immolate tick');
  near((inS.base + inS.coef * inc.sp) * (1 + agf / 100), inc.directDmg, 'Incinerate');
  P('#### 8. Talents of one group add up: Immolate and Incinerate');
  P('Build **' + b2.short + '**, Undead, default settings; Fire spell power ' + n(st2.sp) + ' + ' + st2.schoolSp.fire + ' ' + st2.oilName + ' = ' + n(im.sp) + '. No auras: this build has no Demonology points.');
  P('- Immolate\'s hit: (' + imS.base + ' + ' + imS.coef + ' × ' + n(im.sp) + ') × (1 + ' + agf + '% Agonizing Flames + ' + aft + '% Aftermath) = ' + n(imS.base + imS.coef * im.sp) + ' × ' + (1 + (agf + aft) / 100).toFixed(2) + ' = **' + n(im.directDmg) + '**. The two talents add to 60%; they do not multiply to 65%.');
  P('- Immolate\'s burn, per tick: (' + imS.tickBase + ' + ' + imS.tickCoef + ' × ' + n(im.sp) + ') × (1 + ' + agf + '% Agonizing Flames) = **' + n(im.tickDmg) + '**; ' + im.ticks + ' ticks.');
  P('- Incinerate: (' + inS.base + ' + ' + inS.coef + ' × ' + n(inc.sp) + ') × ' + (1 + agf / 100).toFixed(2) + ' Agonizing Flames = ' + n(inc.directDmg) + '; × ' + (1 + inS.immolateBonusPct / 100).toFixed(2) + ' with Immolate on the boss × ' + coe.toFixed(2) + ' curse × ' + snf.toFixed(2) + ' Shadow and Flame (after a Shadowburn) = **' +
    n(inc.directDmg * (1 + inS.immolateBonusPct / 100) * coe * snf) + '**; a crit (' + n(inc.critPct, 2) + '%) deals × ' + n(inc.critMult, 3) + '.');
  P('');

  // Resistance
  const lr = WL.levelResist(cfg), pr = WL.resistProfile(cfg, 0, 'shadow', false), pv = WL.resistProfile(cfg, 15, 'shadow', true);
  P('#### 9. Resistance before the curse, and Spell Pierce');
  P('- Before Curse of the Elements is up the boss has ' + lr + ' level resistance: on average ' + n(-pr.mean * 100, 2) + '% of each hit or tick is resisted - ' +
    pr.dist.map(d => n(d.p * 100) + '% of them lose ' + (-d.pct) + '%').join(', ') + '.');
  P('- With the curse the resistance is 0 and nothing is resisted. With 15 Spell Pierce on top it is −15: on average +' + n(pv.mean * 100, 2) + '% - ' +
    pv.dist.map(d => n(d.p * 100) + '% of hits gain ' + n(d.pct, 0) + '%').join(', ') + '.');
  return out.join('\n');
})();

// ---------- write / check ----------
let text = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n'), stale = [], seen = {};
text = text.replace(/<!-- gen:([\w-]+) -->\n([\s\S]*?)<!-- \/gen:\1 -->/g, (all, name, old) => {
  if (B[name] == null) throw new Error('MECHANICS.md has an unknown block: ' + name);
  seen[name] = 1;
  const fresh = B[name] + '\n';
  if (fresh !== old) stale.push(name);
  return '<!-- gen:' + name + ' -->\n' + fresh + '<!-- /gen:' + name + ' -->';
});
Object.keys(B).forEach(k => { if (!seen[k]) throw new Error('MECHANICS.md has no block for: ' + k); });
if (process.argv.indexOf('--check') >= 0) {
  if (stale.length) { console.log('MECHANICS.md is out of date: ' + stale.join(', ') + '. Run: node tools/gen-mechanics.js'); process.exit(1); }
  console.log('MECHANICS.md is up to date (' + Object.keys(B).length + ' blocks).');
} else {
  fs.writeFileSync(FILE, text);
  console.log(stale.length ? 'MECHANICS.md updated: ' + stale.join(', ') : 'MECHANICS.md was already up to date.');
}
