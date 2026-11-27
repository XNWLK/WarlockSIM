// Pre-raid best-in-slot lists, Phase 1 (round 211). User (round 210): "find the best phase 1 gear setup for every build …
// give me the top 3 for every slot for every build and i will pick. the reason is that i want to build a pre-raid bis list
// but it has to be realistic so sometimes difficult reputation grinds give you good items but i want to leave them out.
// it's gonna be a case by case basis". The user's picks from the picking page (https://claude.ai/artifact/7DkzkEpdnzt1gyKVho8rYB,
// saved 2026-11-14): gear search over every Phase 1 item not from a raid, top 3 (+ 5 more) per slot, then picked by hand;
// the neck (Orb of the Darkmoon) typed in by the user for every build.
// The gear builder offers each list under its saved gear sets ("Pre-raid BiS · build"): its items and its weapon enchant
// (+65 Spell Power on the staff, round 252); your other enchants stay.
// Format: build key → { gear slot key: item id (data/item-db.js) }.
// Round 251 (user: "change the bis weapon for every build to https://www.wowhead.com/forever/item=18534/rod-of-the-ogre-magi
// with 65 spellpower enchant. make that fix in the bis list and the sim. have the upgrade still be ironbark, remove the
// enchant remark on it. make the alternative the next best staff … basically we're dropping all 1 handers from the list.
// adjust the gear in the sim accordingly"); then, on the staff fights (every Phase 1 non-raid staff with +65 Spell Power):
// "ironbark should be the upgrade for every build. make the actual equipped item whatever the 2nd best after ironbark is. if
// it is headmasters then make that one equipped and put ogre magi as the alternative. if ogre magi is better than equip that
// and make whatever comes next the alternative". So every build wields a staff (no off hand) with +65 Spell Power (7662):
// Headmaster's Charge — Elemental Mage Staff for Incinerate DS, the clear 2nd there (+0.8 DPS over Headmaster's Charge,
// 8 seeds × 4,000, paired SE 0.13); was Witchblade / Blade of the New Moon + an off hand.
// Round 259 (user: the page's ▼ alternatives with a "+" DPS — "why isn't it listed as bis then?"): every pair of the blue rings
// (Songstone of Ironforge, Don Mauricio's Band of Domination, Maiden's Circle, Channeler's Ring) in every build, legs, waist and
// staffs, paired fights (30 × 1,000, the close ones 100 × 1,000, page defaults). Songstone of Ironforge was the weakest blue ring
// in four builds: Shadow Demo Don Mauricio's + Channeler's, Fire Demo and Incinerate Pandemic Maiden's Circle + Channeler's,
// Wrack DS Channeler's + Don Mauricio's; Incinerate DS keeps Songstone + Channeler's (every other pair loses 0.9 … 6.9 DPS) and
// wears Deathmist Leggings. Round 216's "put the songstone always in the top slot" placed the ring; where it is worn, it still is.
window.WL = window.WL || {};
WL.PRE_RAID_BIS_PHASE = 1;
WL.PRE_RAID_BIS = {
  demo_pact_succ_sb: { // Demonology – Pact, Succubus out, Shadow Bolt
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace (round 216: all blue, was Orb of the Darkmoon)
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 280057,      // Robes of Dark Summons (round 216: closest blue, was Robe of the Void)
    wrist: 13409,       // Tearfall Bracers of Shadow Wrath (round 220, user: "those bracers can roll up to 22. put them on the bis list"; +22 Shadow, +2.0 DPS over Sublime Wristguards)
    hands: 13253,       // Hands of Power
    waist: 11662,       // Ban'thok Sash
    legs: 22342,        // Leggings of Torment (round 240, user: "have torment be the default for shadow demo since it's an upgrade and skyshroud be the alternative"; was Skyshroud Leggings)
    feet: 11822,        // Omnicast Boots
    finger1: 22433,     // Don Mauricio's Band of Domination (round 259, user: "the songstone has don mauricio as an alternative but it's better than songstone. shadow demo has the same problem"; +1.53 ± 0.09 DPS over Songstone of Ironforge, 30 × 1,000 paired fights; Maiden's Circle +0.61; was Songstone of Ironforge)
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13937,    // Headmaster's Charge (round 251: 2nd best staff after Ironbark)
    ranged: 13938,      // Bonecreeper Stylus
  },
  demo_pact_fire: { // Demonology – Pact, Imp out, Fire
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace (round 216: all blue, was Orb of the Darkmoon)
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 280057,      // Robes of Dark Summons (round 216: closest blue, was Robe of the Void)
    wrist: 18497,       // Sublime Wristguards
    hands: 13253,       // Hands of Power (round 216: all blue, was Deathmist Wraps)
    waist: 11662,       // Ban'thok Sash
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 13001,     // Maiden's Circle (round 259, every pair of the blue rings: +0.38 ± 0.04 DPS over Songstone of Ironforge, 30 × 1,000 paired fights; Don Mauricio's −0.69; was Songstone of Ironforge, round 216's "put the songstone always in the top slot")
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13937,    // Headmaster's Charge (round 251: 2nd best staff after Ironbark)
    ranged: 13938,      // Bonecreeper Stylus
  },
  destro_incin_succ: { // Destruction – Incinerate, Succubus out
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace (round 216: all blue, was Orb of the Darkmoon)
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 280057,      // Robes of Dark Summons (round 216: closest blue, was Robe of the Void)
    wrist: 18497,       // Sublime Wristguards
    hands: 13253,       // Hands of Power (round 216: all blue, was Deathmist Wraps)
    waist: 11662,       // Ban'thok Sash
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 13001,     // Maiden's Circle (round 259, user: "the songstone has don mauricio as an alternative but it's better than songstone": +0.62 ± 0.04 DPS over Songstone of Ironforge, Don Mauricio's +0.32 ± 0.05, 100 × 1,000 paired fights; was Songstone of Ironforge)
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13937,    // Headmaster's Charge (round 251: 2nd best staff after Ironbark)
    ranged: 13938,      // Bonecreeper Stylus
  },
  destro_incin_ds: { // Destruction – Incinerate, Succubus sacrificed
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace (round 216: all blue, was Orb of the Darkmoon)
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 280057,      // Robes of Dark Summons (round 216: closest blue, was Robe of the Void)
    wrist: 18497,       // Sublime Wristguards
    hands: 13253,       // Hands of Power (round 216: all blue, was Deathmist Wraps)
    waist: 11662,       // Ban'thok Sash
    legs: 13170,        // Skyshroud Leggings (round 263, user: "yes" to Skyshroud as the main again: with the 8/11/32 talents it ties Deathmist Leggings, +0.17 ± 0.12, 30 × 1,000, and is far easier to get; round 259 had Deathmist +0.31 ± 0.07 on the old talents)
    feet: 11822,        // Omnicast Boots
    finger1: 12543,     // Songstone of Ironforge (round 216, user: "put the songstone always in the top slot")
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 944,      // Elemental Mage Staff (round 251: 2nd best staff after Ironbark for Incinerate DS; round 259, user: "it lists elemental mage staff as bis but the alternative is staff of sorrow and that one is a dps increase": no — Staff of Sorrow −0.35 ± 0.06 DPS, 100 × 1,000 paired fights; the page's +0.1 was noise)
    ranged: 13938,      // Bonecreeper Stylus
  },
  wrack_ds: { // Wrack DS – Affliction (Wrack), Imp sacrificed
    head: 22267,        // Spellweaver's Turban (round 211, user: "change wrack ds to turban as well"; was Bad Hat)
    neck: 22403,        // Nacreous Shell Necklace (round 216: all blue; user: "keep vectus as the upgrade and nacreous as main")
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14136,       // Robe of Winter Night (round 216: closest blue for Wrack DS, was Robe of the Void)
    wrist: 13409,       // Tearfall Bracers of Shadow Wrath (round 220, user: "those bracers can roll up to 22. put them on the bis list"; +22 Shadow, +0.8 DPS over Flameweave Cuffs of Shadow Wrath +21, round 217's pick)
    hands: 18407,       // Felcloth Gloves
    waist: 10255,       // Master's Belt of Shadow Wrath (round 218, user: "yes make the belt main for wrack, waistcord as alternative"; +30 Shadow, +6.5 DPS over Black Waistcord, 4 seeds x 4000)
    legs: 22342,        // Leggings of Torment (round 217, user: "swap wrack main to leggings of torment and the alternative to skyshroud"; +4.4 DPS, 4 seeds x 4000)
    feet: 10247,        // Master's Boots of Shadow Wrath (round 218, user: "use shadow wrath for wrack and have omnicast as the alternative"; +30 Shadow, +4.9 DPS over Omnicast Boots, 4 seeds x 4000)
    finger1: 272406,    // Channeler's Ring (round 259, every pair of the blue rings: Channeler's Ring + Don Mauricio's +0.80 ± 0.05 DPS over Songstone of Ironforge + Don Mauricio's, 100 × 1,000 paired fights; was Songstone of Ironforge)
    finger2: 22433,     // Don Mauricio's Band of Domination
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13937,    // Headmaster's Charge (round 251: 2nd best staff after Ironbark)
    ranged: 13396,      // Skul's Ghastly Touch
  },
};

// Round 213 (user: "have the gear builder also use the p1 enchants. head is 8sp, neck is 6sp, chest is 3 stats, wrist suggest
// something, i dont remember what's available. weapon revelation, gloves haste, pants 8sp, boots speed"): the enchants of every
// list (the same for each build). Enchant ids of data/item-db.js WL.ENCHANTS; the boots' run speed has no stat and no effect
// in the sim, so it is a named entry only. Wrist: +6 spell damage (8209) — my pick (the Phase 1 82xx set of the neck and
// Revelation; +7 Intellect is the classic alternative). Phases of all enchants: data/enchant-phases.js.
WL.PRE_RAID_BIS_ENCHANTS = {
  head: 2544,         // Arcanum of Focus: +8 spell damage and healing
  neck: 8218,         // +6 Spell Power
  chest: 8492,        // Mystic Rugged Armor Kit: Spell Power +6 and Armor +40 (round 214, user; replaces the enchant)
  wrist: 7665,        // +16 Spell Power (round 214, user)
  hands: 931,         // Haste +1% (casting speed)
  legs: 2544,         // Arcanum of Focus: +8 spell damage and healing
  feet: { custom: { name: 'Minor Speed', stats: {}, text: 'Run speed increased slightly (no effect in the sim).' } },
  mainHand: 7662,     // +65 Spell Power (round 251; was Revelation 8217 on a one-hander, and +9 Intellect 7659 on the off hand)
};
// Round 214 (user: "use mystic rugged armor kits for the available slots … except boots. use 16 spell power on bracers" →
// "it replaces the enchant. calculate if it's better than the haste. for legs keep 8 spellpower. for boots keep speed"):
// chest kit and +16 bracers above for every build; gloves per build — kit (+6 Spell Power) or Haste +1%, whichever simmed
// higher on that build's list (page defaults, 4 seeds × 5000 fights, kit − haste: Shadow Demo −1.7, Fire Demo +6.2,
// Incinerate −0.7, Incinerate DS −4.2, Wrack DS +2.4).
WL.PRE_RAID_BIS_ENCHANTS_BY_BUILD = {
  demo_pact_fire: { hands: 8492 },
  // Round 247 had Wrack DS's one-hander on Intellect +22 (2568); round 251: every build's staff wears +65 Spell Power.
  wrack_ds: { hands: 8492 },
};
WL.preRaidBisEnchants = function (buildKey) {
  var r = {}, o = WL.PRE_RAID_BIS_ENCHANTS_BY_BUILD[buildKey] || {};
  Object.keys(WL.PRE_RAID_BIS_ENCHANTS).forEach(function (s) { r[s] = WL.PRE_RAID_BIS_ENCHANTS[s]; });
  Object.keys(o).forEach(function (s) { r[s] = o[s]; });
  return r;
};

// ---- Max Pre-BiS (round 248) ----
// Round 248 (user: "add a gear preset to realistic pre-bis and custom, called Max Pre-BiS. that gear set should have the best
// pieces equipped from the bis list with the best enchants etc. basically the maximum power available right now, regardless of
// reputation or money constraints"): per build the strongest Phase 1 list. Made by private/bis-page-style real fights (page
// defaults, each build's default race): the Realistic list with every ▲ upgrade of the pre-raid page, then slot by slot every
// Phase 1 piece not from a raid and wearable by the Horde (reputation, crafting, PvP rank, cost: all allowed; the items the user
// took out stay out — the Demonheart pieces too, user: "they will be part of the next bis list later"), item-set combinations
// and every Phase 1 enchant of the slot, repeated until no slot improves. Screened with 2 seeds × 1,000 fights, a change kept
// only when 4 seeds × 3,000 fights had it ahead by more than 0.5 DPS (and 1.5 standard errors). No gems in Phase 1.
// tools/gen-pre-bis.js → data/pre-bis-gear.js WL.MAX_BIS_GEAR; the quick setup's "Max Pre-BiS" (cfg.gearMode 'maxBis').
// Round 251 (user: "basically we're dropping all 1 handers from the list"): no one-hander here either — every build wields
// Ironbark Staff with +65 Spell Power (Ironbark vs Rod of the Ogre Magi in each Max list: +15.6 … +20.1 DPS, 4 seeds × 3,000).
// Round 258 (Zarla's Snack Pouch from a player's combat log: 4 Fireballs of 213–254, about 60% less damage): the trinkets rerun —
// every pool trinket in each trinket slot (4 × 1,000 fights), the best 5 at 30 × 1,000, the close ones at 100 × 1,000 (paired).
// Shadow Demo and Incinerate Pandemic drop the pouch (Eye of the Beast + Weakness Analyzer); the other three keep it.
WL.MAX_PRE_RAID_BIS = {
  demo_pact_succ_sb: { // Demonology – Pact, Succubus out, Shadow Bolt
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void (▲ upgrade of the pre-raid page)
    wrist: 19595,       // Dryad's Wrist Bindings (▲ upgrade of the pre-raid page)
    hands: 226911,      // Deathmist Wraps (▲ upgrade of the pre-raid page)
    waist: 18405,       // Belt of the Archmage (▲ upgrade of the pre-raid page)
    legs: 22342,        // Leggings of Torment
    feet: 10247,        // Master's Boots of Shadow Wrath (search: +2.6 DPS over Omnicast Boots)
    finger1: 22339,     // Rune Band of Wizardry (▲ upgrade of the pre-raid page)
    finger2: 272406,    // Channeler's Ring
    trinket1: 13968,    // Eye of the Beast (round 258, Zarla's Snack Pouch from a combat log: +1.4 ± 0.2 DPS over the pouch, 100 × 1,000 paired fights; was the pouch, +7.6 over Royal Seal of Eldre'Thalas)
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 20220,    // Ironbark Staff (round 251, no one-handers: +17.4 DPS over Rod of the Ogre Magi, 4 seeds × 3,000; was Sageblade + Therazane's Touch)
    ranged: 13938,      // Bonecreeper Stylus
  },
  demo_pact_fire: { // Demonology – Pact, Imp out, Fire
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void (▲ upgrade of the pre-raid page)
    wrist: 19595,       // Dryad's Wrist Bindings (▲ upgrade of the pre-raid page)
    hands: 226911,      // Deathmist Wraps (▲ upgrade of the pre-raid page)
    waist: 18405,       // Belt of the Archmage (▲ upgrade of the pre-raid page)
    legs: 22747,        // Outrider's Silk Leggings (search: +0.8 DPS over Skyshroud Leggings)
    feet: 11822,        // Omnicast Boots
    finger1: 22339,     // Rune Band of Wizardry (▲ upgrade of the pre-raid page)
    finger2: 272406,    // Channeler's Ring
    trinket1: 276744,   // Zarla's Snack Pouch (round 258 rerun: +0.4 ± 0.1 DPS over Royal Seal of Eldre'Thalas, 100 × 1,000 paired fights; was +7.9)
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 20220,    // Ironbark Staff (▲ upgrade of the pre-raid page)
    ranged: 13938,      // Bonecreeper Stylus
  },
  destro_incin_succ: { // Destruction – Incinerate, Succubus out
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void (▲ upgrade of the pre-raid page)
    wrist: 19595,       // Dryad's Wrist Bindings (▲ upgrade of the pre-raid page)
    hands: 14146,       // Gloves of Spell Mastery (search: +2.4 DPS over Deathmist Wraps)
    waist: 18405,       // Belt of the Archmage (▲ upgrade of the pre-raid page)
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 22339,     // Rune Band of Wizardry (▲ upgrade of the pre-raid page)
    finger2: 272406,    // Channeler's Ring
    trinket1: 13968,    // Eye of the Beast (search: +0.7 DPS over Weakness Analyzer)
    trinket2: 272438,   // Weakness Analyzer (round 258, Zarla's Snack Pouch from a combat log: +1.5 ± 0.1 DPS over the pouch, 100 × 1,000 paired fights; was the pouch + Eye of the Beast)
    mainHand: 20220,    // Ironbark Staff (▲ upgrade of the pre-raid page)
    ranged: 13938,      // Bonecreeper Stylus
  },
  destro_incin_ds: { // Destruction – Incinerate, Succubus sacrificed
    head: 22267,        // Spellweaver's Turban
    neck: 22403,        // Nacreous Shell Necklace
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void (▲ upgrade of the pre-raid page)
    wrist: 19595,       // Dryad's Wrist Bindings (▲ upgrade of the pre-raid page)
    hands: 226911,      // Deathmist Wraps (▲ upgrade of the pre-raid page)
    waist: 18405,       // Belt of the Archmage (▲ upgrade of the pre-raid page)
    legs: 22747,        // Outrider's Silk Leggings (▲ upgrade of the pre-raid page)
    feet: 11822,        // Omnicast Boots
    finger1: 22339,     // Rune Band of Wizardry (▲ upgrade of the pre-raid page)
    finger2: 272406,    // Channeler's Ring
    trinket1: 276744,   // Zarla's Snack Pouch (round 258 rerun: +0.6 ± 0.1 DPS over Royal Seal of Eldre'Thalas, Eye of the Beast in its place a tie +0.0 ± 0.1, 100 × 1,000 paired fights; was +8.6)
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 20220,    // Ironbark Staff (▲ upgrade of the pre-raid page)
    ranged: 13938,      // Bonecreeper Stylus
  },
  wrack_ds: { // Wrack DS – Affliction (Wrack), Imp sacrificed
    head: 22267,        // Spellweaver's Turban
    neck: 18691,        // Dark Advisor's Pendant (▲ upgrade of the pre-raid page)
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void (▲ upgrade of the pre-raid page)
    wrist: 19595,       // Dryad's Wrist Bindings (▲ upgrade of the pre-raid page)
    hands: 18407,       // Felcloth Gloves
    waist: 18405,       // Belt of the Archmage (▲ upgrade of the pre-raid page)
    legs: 22342,        // Leggings of Torment
    feet: 10247,        // Master's Boots of Shadow Wrath
    finger1: 272406,    // Channeler's Ring (search: +0.6 DPS over Songstone of Ironforge)
    finger2: 22433,     // Don Mauricio's Band of Domination
    trinket1: 276744,   // Zarla's Snack Pouch (round 258 rerun: a tie with Royal Seal of Eldre'Thalas, the Seal +0.15 ± 0.08 DPS, 100 × 1,000 paired fights; was +7.2)
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 20220,    // Ironbark Staff (▲ upgrade of the pre-raid page)
    ranged: 13396,      // Skul's Ghastly Touch
  },
};
// The enchants of each Max list (Phase 1, data/enchant-phases.js): the best of each slot in the same fights.
WL.MAX_PRE_RAID_BIS_ENCHANTS = {
  demo_pact_succ_sb: { head: 2544, neck: 8218, chest: 8492, wrist: 7665, hands: 931, legs: 2544, feet: 8492, mainHand: 7662 },   // round 251: was Revelation + off hand +9 Intellect
  demo_pact_fire: { head: 2544, neck: 8218, chest: 8492, wrist: 7665, hands: 8492, legs: 2544, feet: 8492, mainHand: 7662 },
  destro_incin_succ: { head: 2544, neck: 8218, chest: 8492, wrist: 7665, hands: 931, legs: 2544, feet: 8492, mainHand: 7662 },
  destro_incin_ds: { head: 2544, neck: 8218, chest: 8492, wrist: 7665, hands: 931, legs: 2544, feet: 8492, mainHand: 7662 },
  wrack_ds: { head: 2544, neck: 8218, chest: 8492, wrist: 7665, hands: 8492, legs: 2544, feet: 8492, mainHand: 7662 },
};
// ---- end Max Pre-BiS ----
