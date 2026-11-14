// Content phases of the items (round 210, user: "need a checkbox in the gear builder with phase 1, phase 2, all items etc.
// right now we only need phase 1 and all items, because we're in phase 1. then i need to sort out which items are in game
// right now and which aren't available").
// Every item of the gear builder carries a phase in data/item-db.js (`phase`, missing = 1). tools/gen-items.js works it
// out from where the item comes from (WL.PHASE_RULES below: the zone of its drop or quest, a world boss, PvP rank gear,
// the Darkmoon Faire); WL.ITEM_PHASE_SET (the user's own review) wins over the rules.
// Phase 9 = not in the game (the user's review); it is shown under "All items" only.
window.WL = window.WL || {};

WL.PHASE_NOW = 1;                                          // the phase the game is in now
// The gear builder's choice (data/items.js): only the items of that phase and earlier, or every item (v = 0).
WL.PHASE_CHOICES = [{ v: 1, name: 'Phase 1 (now)' }, { v: 0, name: 'All items' }];
WL.PHASE_NAMES = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3', 4: 'Phase 4', 5: 'Phase 5', 6: 'Phase 6', 9: 'Not in the game' };

// The first guess, from the classic order of content (the user's review corrects it item by item).
WL.PHASE_RULES = {
  zones: {                                                 // Wowhead zone id of the drop / the quest → phase
    2557: 2,                                               // Dire Maul
    3277: 3, 2597: 3, 3358: 3,                             // Warsong Gulch, Alterac Valley, Arathi Basin (reputation gear)
    2677: 3,                                               // Blackwing Lair
    1977: 4,                                               // Zul'Gurub
    3429: 5, 3428: 5, 1377: 5,                             // Ruins / Temple of Ahn'Qiraj, Silithus (Cenarion Circle)
    3456: 6,                                               // Naxxramas
  },
  npcs: { 'Azuregos': 2, 'Lord Kazzak': 2, 'Ysondre': 4, 'Lethon': 4, 'Emeriss': 4, 'Taerar': 4 },   // world bosses
  pvpRank: 2,                                              // PvP rank gear (the honor system)
  darkmoon: 3,                                             // Darkmoon Faire (cards and their rewards)
};

// The user's review: item id → phase (1–6, or 9 = not in the game), from the review page (https://claude.ai/artifact/LBpagDshmT6unZzAefThhV,
// saved 2026-11-14: 184 items changed, 86 of 87 groups checked; the rest of a checked group keeps the first guess).
WL.ITEM_PHASE_SET = {
  9644: 5,   // Thermotastic Egg Timer
  10826: 5,   // Staff of Lore
  13249: 1,   // Argent Crusader
  14462: 1,   // Elunarian Sarong
  15856: 9,   // Archlight Talisman
  16738: 5,   // Witherseed Gloves
  16980: 2,   // Flarecore Mantle
  16997: 9,   // Stormrager
  17004: 9,   // Sarah's Guide
  18263: 2,   // Flarecore Wraps
  18289: 1,   // Barbed Thorn Necklace
  18295: 1,   // Phasing Boots
  18301: 1,   // Lethtendris's Wand
  18302: 1,   // Band of Vigor
  18306: 1,   // Gloves of Shadowy Mist
  18307: 1,   // Riptide Shoes
  18311: 1,   // Quel'dorai Channeling Rod
  18314: 1,   // Ring of Demonic Guile
  18317: 1,   // Tempest Talisman
  18327: 1,   // Whipvine Cord
  18337: 1,   // Orphic Bracers
  18345: 1,   // Murmuring Ring
  18346: 1,   // Threadbare Trousers
  18350: 1,   // Amplifying Cloak
  18353: 1,   // Stoneflower Staff
  18354: 1,   // Pimgib's Collar
  18369: 1,   // Gordok's Handwraps
  18371: 1,   // Mindtap Talisman
  18372: 1,   // Blade of the New Moon
  18385: 1,   // Robe of Everlasting Night
  18386: 1,   // Padre's Trousers
  18387: 1,   // Brightspark Gloves
  18389: 1,   // Cloak of the Cosmos
  18395: 1,   // Emerald Flame Ring
  18396: 1,   // Mind Carver
  18397: 1,   // Elder Magus Pendant
  18398: 9,   // Tidal Loop
  18403: 2,   // Dragonslayer's Signet
  18404: 2,   // Onyxia Tooth Pendant
  18425: 1,   // Kreeg's Mug
  18450: 1,   // Robe of Combustion
  18467: 1,   // Royal Seal of Eldre'Thalas
  18475: 1,   // Oddly Magical Belt
  18483: 1,   // Mana Channeling Wand
  18491: 1,   // Lorespinner
  18496: 1,   // Heliotrope Cloak
  18497: 1,   // Sublime Wristguards
  18500: 1,   // Tarnished Elven Ring
  18507: 1,   // Boots of the Full Moon
  18523: 1,   // Brightly Glowing Stone
  18526: 1,   // Crown of the Ogre King
  18532: 1,   // Mindsurge Robe
  18534: 1,   // Rod of the Ogre Magi
  18678: 5,   // Tempestria's Frozen Necklace
  18814: 9,   // Choker of the Fire Lord
  18820: 9,   // Talisman of Ephemeral Power
  18821: 9,   // Quick Strike Ring
  19138: 9,   // Band of Sulfuras
  19140: 9,   // Cauterizing Band
  19147: 9,   // Ring of Spell Power
  19156: 2,   // Flarecore Robe
  19165: 2,   // Flarecore Leggings
  19366: 9,   // Master Dragonslayer's Orb
  19384: 9,   // Master Dragonslayer's Ring
  19682: 4,   // Bloodvine Vest
  19683: 4,   // Bloodvine Leggings
  19684: 4,   // Bloodvine Boots
  19957: 4,   // Hazza'rah's Charm of Destruction
  19999: 4,   // Bloodvine Goggles
  20537: 5,   // Runed Stygian Boots
  20538: 5,   // Runed Stygian Leggings
  20539: 5,   // Runed Stygian Belt
  20641: 5,   // Southsea Mojo Boots
  21201: 5,   // Signet Ring of the Bronze Dragonflight
  21202: 5,   // Signet Ring of the Bronze Dragonflight
  21203: 5,   // Signet Ring of the Bronze Dragonflight
  21204: 5,   // Signet Ring of the Bronze Dragonflight
  21205: 5,   // Signet Ring of the Bronze Dragonflight
  21206: 5,   // Signet Ring of the Bronze Dragonflight
  21207: 5,   // Signet Ring of the Bronze Dragonflight
  21208: 5,   // Signet Ring of the Bronze Dragonflight
  21209: 5,   // Signet Ring of the Bronze Dragonflight
  21210: 5,   // Signet Ring of the Bronze Dragonflight
  21517: 5,   // Gnomish Turban of Psychic Might
  21527: 5,   // Darkwater Robes
  21531: 5,   // Drake Tooth Necklace
  22062: 9,   // Sorcerer's Belt
  22063: 9,   // Sorcerer's Bindings
  22064: 9,   // Sorcerer's Boots
  22065: 9,   // Sorcerer's Crown
  22066: 9,   // Sorcerer's Gloves
  22067: 9,   // Sorcerer's Leggings
  22068: 9,   // Sorcerer's Mantle
  22069: 9,   // Sorcerer's Robes
  22078: 9,   // Virtuous Belt
  22079: 9,   // Virtuous Bracers
  22080: 9,   // Virtuous Crown
  22081: 9,   // Virtuous Gloves
  22082: 9,   // Virtuous Mantle
  22083: 9,   // Virtuous Robe
  22084: 9,   // Virtuous Sandals
  22085: 9,   // Virtuous Skirt
  22149: 1,   // Beads of Ogre Mojo
  22150: 1,   // Beads of Ogre Might
  22304: 1,   // Ironweave Gloves
  22630: 9,   // Atiesh, Greatstaff of the Guardian
  22657: 9,   // Amulet of the Dawn
  22659: 9,   // Medallion of the Dawn
  22667: 9,   // Bracers of Hope
  22678: 9,   // Talisman of Ascendance
  22681: 9,   // Band of Piety
  22688: 9,   // Verimonde's Last Resort
  22756: 5,   // Sylvan Vest
  22757: 5,   // Sylvan Crown
  22758: 5,   // Sylvan Shoulders
  23084: 9,   // Gloves of Undead Cleansing
  227808: 9,   // Rugged Mantle of the Timbermaw
  227862: 9,   // Incandescent Mooncloth Boots
  228190: 9,   // Knowledge of the Timbermaw
  234016: 5,   // Signet Ring of the Bronze Dragonflight
  234017: 5,   // Signet Ring of the Bronze Dragonflight
  234019: 5,   // Signet Ring of the Bronze Dragonflight
  234020: 5,   // Signet Ring of the Bronze Dragonflight
  234021: 5,   // Signet Ring of the Bronze Dragonflight
  234023: 5,   // Signet Ring of the Bronze Dragonflight
  234024: 5,   // Signet Ring of the Bronze Dragonflight
  234025: 5,   // Signet Ring of the Bronze Dragonflight
  234026: 5,   // Signet Ring of the Bronze Dragonflight
  234028: 5,   // Signet Ring of the Bronze Dragonflight
  234029: 5,   // Signet Ring of the Bronze Dragonflight
  234030: 5,   // Signet Ring of the Bronze Dragonflight
  234032: 5,   // Signet Ring of the Bronze Dragonflight
  234033: 5,   // Signet Ring of the Bronze Dragonflight
  234034: 5,   // Signet Ring of the Bronze Dragonflight
  234198: 5,   // Signet Ring of the Bronze Dragonflight
  234199: 5,   // Signet Ring of the Bronze Dragonflight
  234200: 5,   // Signet Ring of the Bronze Dragonflight
  234201: 5,   // Signet Ring of the Bronze Dragonflight
  234202: 5,   // Signet Ring of the Bronze Dragonflight
  234436: 5,   // Signet Ring of the Bronze Dragonflight
  234437: 5,   // Signet Ring of the Bronze Dragonflight
  234438: 5,   // Signet Ring of the Bronze Dragonflight
  234439: 5,   // Signet Ring of the Bronze Dragonflight
  234440: 5,   // Signet Ring of the Bronze Dragonflight
  234964: 5,   // Signet Ring of the Bronze Dragonflight
  234965: 5,   // Signet Ring of the Bronze Dragonflight
  234966: 5,   // Signet Ring of the Bronze Dragonflight
  234967: 5,   // Signet Ring of the Bronze Dragonflight
  234968: 5,   // Signet Ring of the Bronze Dragonflight
  240138: 9,   // Heretic Robe
  240139: 9,   // Heretic Sandals
  240140: 9,   // Heretic Gloves
  240141: 9,   // Heretic Cowl
  240142: 9,   // Heretic Leggings
  240143: 9,   // Heretic Shoulderpads
  240144: 9,   // Heretic Belt
  240145: 9,   // Heretic Bindings
  240146: 9,   // Heretic Garb
  240147: 9,   // Heretic Handguards
  240148: 9,   // Heretic Hood
  240149: 9,   // Heretic Pants
  240150: 9,   // Heretic Mantle
  240151: 9,   // Heretic Waistguard
  240152: 9,   // Heretic Wristguards
  240153: 9,   // Heretic Boots
  270127: 1,   // Incanter's Pantaloons
  274752: 5,   // Sandstorm Cover
  279246: 2,   // Torch of Light
  279259: 2,   // Ironwood Blade
  279266: 2,   // Robes of Fiery Devastation
  279267: 2,   // Mana-infused Cord
  279268: 2,   // Rime-encrusted Boots
  279269: 2,   // Fel Cape
  281286: 9,   // High Order Pendant
  281288: 9,   // Shen'dorei Signet
  286569: 5,   // Firebird Leggings
  286572: 5,   // Ogre Casting Cloak
  288832: 9,   // Felheart Bracers
  288833: 9,   // Felheart Gloves
  288834: 9,   // Felheart Belt
  288835: 9,   // Felheart Shoulder Pads
  288836: 9,   // Felheart Horns
  288838: 9,   // Felheart Pants
  288925: 9,   // Fireproof Cloak
  19426: 1,   // Orb of the Darkmoon — round 211: the user picked it for every build's Phase 1 pre-raid list (data/pre-raid-bis.js)
};
