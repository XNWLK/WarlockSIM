// Pre-raid best-in-slot lists, Phase 1 (round 211). User (round 210): "find the best phase 1 gear setup for every build …
// give me the top 3 for every slot for every build and i will pick. the reason is that i want to build a pre-raid bis list
// but it has to be realistic so sometimes difficult reputation grinds give you good items but i want to leave them out.
// it's gonna be a case by case basis". The user's picks from the picking page (https://claude.ai/artifact/7DkzkEpdnzt1gyKVho8rYB,
// saved 2026-11-14): gear search over every Phase 1 item not from a raid, top 3 (+ 5 more) per slot, then picked by hand;
// the neck (Orb of the Darkmoon) typed in by the user for every build.
// The gear builder offers each list under its saved gear sets ("Pre-raid BiS · build"): items only, enchants stay.
// Format: build key → { gear slot key: item id (data/item-db.js) }.
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
    finger1: 12543,     // Songstone of Ironforge
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 18316,     // Obsidian Bauble (round 216: +1.4 DPS over Spirit of Aquementas, 8 seeds × 4000; user: "go with your suggestion")
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
    finger1: 12543,     // Songstone of Ironforge (round 216, user: "put the songstone always in the top slot")
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 11904,     // Spirit of Aquementas
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
    finger1: 12543,     // Songstone of Ironforge
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 11904,     // Spirit of Aquementas
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
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 12543,     // Songstone of Ironforge (round 216, user: "put the songstone always in the top slot")
    finger2: 272406,    // Channeler's Ring (round 216, user; was Blessed Band of Light)
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 11904,     // Spirit of Aquementas
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
    finger1: 12543,     // Songstone of Ironforge
    finger2: 22433,     // Don Mauricio's Band of Domination
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 18372,    // Blade of the New Moon
    offHand: 18316,     // Obsidian Bauble (round 216: +1.5 DPS over Spirit of Aquementas, 8 seeds × 4000; user: "go with your suggestion")
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
  mainHand: 8217,     // Revelation
  offHand: 7659,      // +9 Intellect: Enchant Off-Hand - Superior Intellect (round 216, user: "add this enchant to the offhands")
};
// Round 214 (user: "use mystic rugged armor kits for the available slots … except boots. use 16 spell power on bracers" →
// "it replaces the enchant. calculate if it's better than the haste. for legs keep 8 spellpower. for boots keep speed"):
// chest kit and +16 bracers above for every build; gloves per build — kit (+6 Spell Power) or Haste +1%, whichever simmed
// higher on that build's list (page defaults, 4 seeds × 5000 fights, kit − haste: Shadow Demo −1.7, Fire Demo +6.2,
// Incinerate −0.7, Incinerate DS −4.2, Wrack DS +2.4).
WL.PRE_RAID_BIS_ENCHANTS_BY_BUILD = {
  demo_pact_fire: { hands: 8492 },
  wrack_ds: { hands: 8492 },
};
WL.preRaidBisEnchants = function (buildKey) {
  var r = {}, o = WL.PRE_RAID_BIS_ENCHANTS_BY_BUILD[buildKey] || {};
  Object.keys(WL.PRE_RAID_BIS_ENCHANTS).forEach(function (s) { r[s] = WL.PRE_RAID_BIS_ENCHANTS[s]; });
  Object.keys(o).forEach(function (s) { r[s] = o[s]; });
  return r;
};
