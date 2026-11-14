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
    neck: 19426,        // Orb of the Darkmoon
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void
    wrist: 18497,       // Sublime Wristguards
    hands: 13253,       // Hands of Power
    waist: 11662,       // Ban'thok Sash
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 12543,     // Songstone of Ironforge
    finger2: 272407,    // Blessed Band of Light
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 11904,     // Spirit of Aquementas
    ranged: 13938,      // Bonecreeper Stylus
  },
  demo_pact_fire: { // Demonology – Pact, Imp out, Fire
    head: 22267,        // Spellweaver's Turban
    neck: 19426,        // Orb of the Darkmoon
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void
    wrist: 18497,       // Sublime Wristguards
    hands: 22077,       // Deathmist Wraps
    waist: 11662,       // Ban'thok Sash
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 272407,    // Blessed Band of Light
    finger2: 12543,     // Songstone of Ironforge
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 11904,     // Spirit of Aquementas
    ranged: 13938,      // Bonecreeper Stylus
  },
  destro_incin_succ: { // Destruction – Incinerate, Succubus out
    head: 22267,        // Spellweaver's Turban
    neck: 19426,        // Orb of the Darkmoon
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void
    wrist: 18497,       // Sublime Wristguards
    hands: 22077,       // Deathmist Wraps
    waist: 11662,       // Ban'thok Sash
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 12543,     // Songstone of Ironforge
    finger2: 272407,    // Blessed Band of Light
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 11904,     // Spirit of Aquementas
    ranged: 13938,      // Bonecreeper Stylus
  },
  destro_incin_ds: { // Destruction – Incinerate, Succubus sacrificed
    head: 22267,        // Spellweaver's Turban
    neck: 19426,        // Orb of the Darkmoon
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void
    wrist: 18497,       // Sublime Wristguards
    hands: 22077,       // Deathmist Wraps
    waist: 11662,       // Ban'thok Sash
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 272407,    // Blessed Band of Light
    finger2: 12543,     // Songstone of Ironforge
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 13964,    // Witchblade
    offHand: 11904,     // Spirit of Aquementas
    ranged: 13938,      // Bonecreeper Stylus
  },
  wrack_ds: { // Wrack DS – Affliction (Wrack), Imp sacrificed
    head: 22267,        // Spellweaver's Turban (round 211, user: "change wrack ds to turban as well"; was Bad Hat)
    neck: 19426,        // Orb of the Darkmoon
    shoulder: 19050,    // Mantle of the Timbermaw
    back: 272411,       // Arcanoweave Cloak
    chest: 14153,       // Robe of the Void
    wrist: 18497,       // Sublime Wristguards
    hands: 18407,       // Felcloth Gloves
    waist: 254087,      // Black Waistcord
    legs: 13170,        // Skyshroud Leggings
    feet: 11822,        // Omnicast Boots
    finger1: 12543,     // Songstone of Ironforge
    finger2: 22433,     // Don Mauricio's Band of Domination
    trinket1: 18467,    // Royal Seal of Eldre'Thalas
    trinket2: 272438,   // Weakness Analyzer
    mainHand: 18372,    // Blade of the New Moon
    offHand: 11904,     // Spirit of Aquementas
    ranged: 13396,      // Skul's Ghastly Touch
  },
};
