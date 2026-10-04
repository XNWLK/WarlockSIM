// Warlock-relevant consumables in WoW: Forever. Values from the Forever item tooltips
// (https://www.wowhead.com/forever/item=<id>&xml, retrieved 2026-09-24). `text` = the tooltip's "Use:" line.
// group: only one consumable per group can be active (Classic-style categories; Forever rules unknown) [A57].
// Effect fields: sp, schoolSp{shadow,fire}, int, spi, sta, critPct, hitPct, hastePct, mp5, maxMana (flat, after %),
//   oil (weapon oil; stacks with the Spellstone/Firestone), spPotion {sp, duration} (popped with the other cooldowns:
//   options.activesPolicy, then on cooldown),
//   manaRestore {amount | pct} (used when the missing mana ≥ the amount), cd (s), cdGroup ('potion' | 'rune').
// Not included: Elixir of Greater Firepower (only its recipe exists in Forever; item 21546 is now Elixir of Holy Power),
//   Blessed Wizard Oil (undead only), healing/melee/protection consumables, world buffs (not consumables),
//   Superior Mana Potion (user round 12: not needed), smaller versions of a consumable (user, round 87: only the biggest of
//   each — removed Arcane Elixir, Minor Arcane Elixir, Mageblood Elixir, Sagefish Delight, Wizard Oil; the smaller
//   Spellblasting potions were never added), Flask of Distilled Wisdom, Elixir of Greater Intellect, Elixir of Cunning,
//   Elixir of Greater Spirit and Brilliant Mana Oil (user, round 90: not wanted), Elixir of the Sages (+18 Int / Spi; user,
//   round 91 — Elixir of Sages, +25 Spirit +2% crit, stays), Dark Iron Bomb (Forever tooltip says 9661 Fire vs Classic 344–456:
//   a data error, removed by the user in round 16).
// Icons: Forever item XML `icon`, except 4 elixirs whose Forever DB icon differs from the in-game one (user, round 12):
//   Greater Arcane, Shadow Power, Fire Power, Mageblood use the Wowhead CLASSIC icon (/classic/item=<id>&xml).
window.WL = window.WL || {};

WL.CONSUMABLES = {
  // ---------------- Flasks (one at a time) ----------------
  flaskSupremePower:   { on: false, id: 13512, icon: 'inv_potion_41', cat: 'Flask', group: 'flask', name: 'Flask of Supreme Power', desc: '+150 spell damage', sp: 150,
                         text: 'Increases damage done by magical spells and effects by up to 150 for 2 hrs.' },
  flaskNaturalAccuracy:{ on: false, id: 274273, icon: 'inv_potionc_5', cat: 'Flask', group: 'flask', name: 'Flask of Natural Accuracy', desc: '+60 Sta, +5% hit (Hyjal / Barrow Deeps only)', sta: 60, hitPct: 5,
                         text: 'Increases your Stamina by 60. While in Mount Hyjal, Hyjal Summit, and the Barrow Deeps, you also gain 5% Hit Chance. Lasts for 2 hrs.' },
  flaskNaturalAggression:{ on: false, id: 274274, icon: 'inv_potionc_1', cat: 'Flask', group: 'flask', name: 'Flask of Natural Aggression', desc: '+60 Sta, +4% crit (Hyjal / Barrow Deeps only)', sta: 60, critPct: 4,
                         text: 'Increases your Stamina by 60. While in Mount Hyjal, Hyjal Summit, and the Barrow Deeps, you also gain 4% Critical Strike Chance. Lasts for 2 hrs.' },
  flaskNaturalSwiftness:{ on: false, id: 274276, icon: 'inv_potionc_4', cat: 'Flask', group: 'flask', name: 'Flask of Natural Swiftness', desc: '+60 Sta, +5% haste (Hyjal / Barrow Deeps only)', sta: 60, hastePct: 5,
                         text: 'Increases your Stamina by 60. While in Mount Hyjal, Hyjal Summit, and the Barrow Deeps, you also gain 5% Haste. Lasts for 2 hrs.' },

  // ---------------- Elixirs ----------------
  greaterArcaneElixir: { on: false, id: 13454, icon: 'inv_potion_25', cat: 'Elixir', group: 'spElixir', name: 'Greater Arcane Elixir', desc: '+35 spell damage', sp: 35,
                         text: 'Increases spell damage by up to 35 for 1 hour.' },
  shadowPower:         { on: false, id: 9264, icon: 'inv_potion_46', cat: 'Elixir', group: 'shadowElixir', name: 'Elixir of Shadow Power', desc: '+40 Shadow spell damage', schoolSp: { shadow: 40 },
                         text: 'Increases spell shadow damage by up to 40 for 30 min.' },
  firePower:           { on: false, id: 6373, icon: 'inv_potion_33', cat: 'Elixir', group: 'fireElixir', name: 'Elixir of Fire Power', desc: '+10 Fire spell damage', schoolSp: { fire: 10 },
                         text: 'Increases spell fire damage by up to 10 for 30 min.' },
  elixirOwl:           { on: false, id: 250337, icon: 'inv_potion_164', cat: 'Elixir', group: 'intElixir', name: 'Elixir of the Owl', desc: '+25 Intellect, +2% crit', int: 25, critPct: 2,
                         text: 'Drink to increase your Intellect by 25 and chance to critically hit by 2%. Lasts for 30 min.' },
  elixirSages:         { on: false, id: 250338, icon: 'inv_potion_165', cat: 'Elixir', group: 'spiElixir', name: 'Elixir of Sages', desc: '+25 Spirit, +2% crit', spi: 25, critPct: 2,
                         text: 'Drink to increase your Spirit by 25 and chance to critically hit by 2%. Lasts for 30 min.' },
  greaterMageblood:    { on: false, id: 250341, icon: 'inv_potion_168', cat: 'Elixir', group: 'manaElixir', name: 'Greater Mageblood Elixir', desc: '20 mana every 5 s', mp5: 20,
                         text: 'Drink to regenerate 20 mana every 5 seconds. Lasts for 30 min.' },
  spiritOfZanza:       { on: false, id: 20079, icon: 'inv_potion_30', cat: 'Elixir', group: 'zanza', name: 'Spirit of Zanza', desc: '+50 Spirit, +50 Stamina', spi: 50, sta: 50,
                         text: "Increases the player's Spirit by 50 and Stamina by 50 for 2 hrs." },
  cerebralCortex:      { on: false, id: 8423, icon: 'inv_potion_32', cat: 'Elixir', group: 'cortex', name: 'Cerebral Cortex Compound', desc: '+25 Intellect', int: 25,
                         text: 'Increases Intellect by 25 when consumed. Effect lasts for 60 minutes.' },

  // ---------------- Food & drink (one well-fed buff) ----------------
  nightfinSoup:        { on: false, id: 13931, icon: 'inv_drink_17', cat: 'Food', group: 'food', name: 'Nightfin Soup', desc: 'Well fed: +22 spell damage', sp: 22,
                         text: 'If you spend at least 10 seconds eating you will become well fed and gain 22 Spell Damage for 15 min.' },
  runnTumTuber:        { on: false, id: 18254, icon: 'inv_misc_food_63', cat: 'Food', group: 'food', name: 'Runn Tum Tuber Surprise', desc: 'Well fed: +15 Intellect', int: 15,
                         text: 'If you spend at least 10 seconds eating you will become well fed and gain 15 Intellect for 15 min.' },
  kreegsStout:         { on: false, id: 18284, icon: 'inv_drink_05', cat: 'Food', group: 'drink', name: "Kreeg's Stout Beatdown", desc: '+25 Spirit, −5 Intellect', spi: 25, int: -5,
                         text: 'Increases Spirit by 25, but decreases Intelligence by 5 for 15 min.' },

  // ---------------- Weapon: stone + oil ----------------
  // Round 86 (user, found in game): the Spellstone / Firestone and a weapon oil are NOT exclusive in Forever — you can
  // have both up. So the stone is its own group ('stone') and the oils are another ('weapon'); one of each counts. [A33]
  buildOil:            { on: true, id: 17728, icon: 'inv_misc_gem_sapphire_01', cat: 'Weapon', group: 'stone', name: 'Spellstone / Firestone (per build)', desc: 'Shadow builds: +2% haste, +21 Shadow SP · Fire builds: +2% crit, +21 Fire SP', buildOil: true,
                         text: 'Major Spellstone: +2% spell haste and up to 21 Shadow damage. Major Firestone: +2% spell crit and up to 21 Fire damage. Each build uses the one listed in its details. Stacks with a weapon oil.' },
  brilliantWizardOil:  { on: false, id: 20749, icon: 'inv_potion_105', cat: 'Weapon', group: 'weapon', name: 'Brilliant Wizard Oil', desc: '+36 spell damage, +1% crit', oil: { sp: 36, critPct: 1 },
                         text: 'While applied to target weapon it increases spell damage and healing by up to 36 and increases Spell Critical chance by 1%. Lasts for 30 minutes.' },

  // ---------------- Potions (shared 2 min cooldown) ----------------
  majorManaPotion:     { on: false, id: 13444, icon: 'inv_potion_76', cat: 'Potion', group: 'potion', name: 'Major Mana Potion', desc: '1800 mana, 2 min cooldown', manaRestore: { amount: 1800 }, cd: 120, cdGroup: 'potion',
                         text: 'Restores 1800 mana. (2 Min Cooldown)' },
  restoredManaPotion:  { on: false, id: 282013, icon: 'inv_potion_17', cat: 'Potion', group: 'potion', name: 'Restored Mana Potion', desc: '20% of maximum mana, 2 min cooldown', manaRestore: { pct: 20 }, cd: 120, cdGroup: 'potion',
                         text: 'Restores 20% mana. (2 Min Cooldown)' },
  majorSpellblasting:  { on: false, id: 250937, icon: 'inv_potione_4', cat: 'Potion', group: 'potion', name: 'Major Spellblasting Potion', desc: '+47 spell damage for 30 s (2 min cooldown); popped with your other cooldowns', spPotion: { sp: 47, duration: 30 }, cd: 120, cdGroup: 'potion',
                         text: 'Increases Spell Damage by 47 for 30 sec.' },   // 47 since the Wowhead Forever tooltip of 2026-10-04 (40 before)

  // ---------------- Engineering explosives (require the Engineering profession, W14 / A59) ----------------
  // Damage is fixed (no spell power / talents); explosives share a 1 min cooldown, the Sapper has its own 5 min cooldown.
  goblinSapper:        { on: false, id: 10646, icon: 'spell_fire_selfdestruct', cat: 'Engineering', group: 'sapper', requires: 'engineering', name: 'Goblin Sapper Charge', desc: '450–750 Fire, 5 min cooldown (self-damage ignored)', explosive: { min: 450, max: 750, cd: 300, cdGroup: 'sapper' },
                         text: 'Explodes when triggered dealing 450 to 750 Fire damage to all enemies nearby and 375 to 625 damage to you. (5 Min Cooldown)' },
  denseDynamite:       { on: false, id: 18641, icon: 'inv_misc_bomb_06', cat: 'Engineering', group: 'explosive', requires: 'engineering', name: 'Dense Dynamite', desc: '340–460 Fire, 1 min cooldown', explosive: { min: 340, max: 460, cd: 60, cdGroup: 'explosive' },
                         text: 'Inflicts 340 to 460 Fire damage in a 5 yard radius. (1 Min Cooldown)' },
  thoriumGrenade:      { on: false, id: 15993, icon: 'inv_misc_bomb_08', cat: 'Engineering', group: 'explosive', requires: 'engineering', name: 'Thorium Grenade', desc: '300–500 Fire, 1 min cooldown', explosive: { min: 300, max: 500, cd: 60, cdGroup: 'explosive' },
                         text: 'Inflicts 300 to 500 Fire damage and stuns targets for 3 sec in a 3 yard radius. Any damage will break the effect. (1 Min Cooldown)' },

  // ---------------- Runes (own 2 min cooldown) ----------------
  demonicRune:         { on: false, id: 12662, icon: 'inv_misc_rune_04', cat: 'Rune', group: 'rune', name: 'Demonic / Dark Rune', desc: '1200 mana for 800 health, 2 min cooldown', manaRestore: { amount: 1200 }, cd: 120, cdGroup: 'rune',
                         text: 'Restores 1200 mana at the cost of 800 life. (2 Min Cooldown)' },
};
