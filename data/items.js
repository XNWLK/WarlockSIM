// Items for the gear builder (round 147, user: "a character style layout where you click on every slot and input the item
// you want"). The builder adds up the stats of what you wear into the Stats panel's Sheet (gear) values; the fight engine
// never reads this file. The item list itself is data/item-db.js (round 154), made from the Wowhead Forever database by
// tools/gen-items.js; any slot also takes an item you type in yourself or one from a gear code.
window.WL = window.WL || {};

// The stats an item can carry: the same values as the Sheet (gear) column of the Stats panel (cfg.gear), in its units —
// spell power in points, hit / crit / haste in %, the rest in points. Order = the order the page lists them in.
WL.GEAR_STAT_KEYS = ['sp', 'shadowSp', 'fireSp', 'hitPct', 'critPct', 'hastePct', 'pierce', 'int', 'spi', 'sta', 'mp5'];   // round 152: no Agility (it does nothing) [A95]

// The character window's slots: a column on the left, one on the right and the weapons under them, top to bottom as in
// the game. `fits` = the item slot types that can go in (a Warlock wears no shield and cannot hold a weapon in the off hand).
// `inv` = the game's inventory slot number (round 148, for gear codes from the in-game addon). `enchant` = the slot can
// carry an enchant (round 148: the slots Classic enchants exist for; rings, neck, trinkets, the held off-hand item and the
// wand cannot be enchanted there).
WL.GEAR_SLOTS = [
  { key: 'head',     name: 'Head',      col: 'left',  inv:  1, enchant: true,  fits: ['head'] },
  { key: 'neck',     name: 'Neck',      col: 'left',  inv:  2, enchant: false, fits: ['neck'] },
  { key: 'shoulder', name: 'Shoulder',  col: 'left',  inv:  3, enchant: true,  fits: ['shoulder'] },
  { key: 'back',     name: 'Back',      col: 'left',  inv: 15, enchant: true,  fits: ['back'] },
  { key: 'chest',    name: 'Chest',     col: 'left',  inv:  5, enchant: true,  fits: ['chest'] },
  { key: 'shirt',    name: 'Shirt',     col: 'left',  inv:  4, enchant: false, fits: ['shirt'] },
  { key: 'tabard',   name: 'Tabard',    col: 'left',  inv: 19, enchant: false, fits: ['tabard'] },
  { key: 'wrist',    name: 'Wrist',     col: 'left',  inv:  9, enchant: true,  fits: ['wrist'] },
  { key: 'hands',    name: 'Hands',     col: 'right', inv: 10, enchant: true,  fits: ['hands'] },
  { key: 'waist',    name: 'Waist',     col: 'right', inv:  6, enchant: false, fits: ['waist'] },
  { key: 'legs',     name: 'Legs',      col: 'right', inv:  7, enchant: true,  fits: ['legs'] },
  { key: 'feet',     name: 'Feet',      col: 'right', inv:  8, enchant: true,  fits: ['feet'] },
  { key: 'finger1',  name: 'Ring',      col: 'right', inv: 11, enchant: false, fits: ['finger'] },
  { key: 'finger2',  name: 'Ring',      col: 'right', inv: 12, enchant: false, fits: ['finger'] },
  { key: 'trinket1', name: 'Trinket',   col: 'right', inv: 13, enchant: false, fits: ['trinket'] },
  { key: 'trinket2', name: 'Trinket',   col: 'right', inv: 14, enchant: false, fits: ['trinket'] },
  { key: 'mainHand', name: 'Main Hand', col: 'weapons', inv: 16, enchant: true,  fits: ['oneHand', 'mainHand', 'twoHand'] },
  { key: 'offHand',  name: 'Off Hand',  col: 'weapons', inv: 17, enchant: false, fits: ['offHand'] },
  { key: 'ranged',   name: 'Wand',      col: 'weapons', inv: 18, enchant: false, fits: ['ranged'] },
];

// The item list, keyed by the game's item id (the in-game addon recognises what you wear by that id). Format:
//   12345: { name: 'Item name', slot: 'head', quality: 'epic', stats: { sp: 20, int: 15, critPct: 1 }, weapon: 'sword' }
// Round 154 (data/item-db.js) adds: ilvl (item level), req (required level), icon (position in WL.ITEM_ICONS.names), set (item
// set id), unique, side ('Alliance' / 'Horde' when only one can wear it), from (where it comes from, when known).
// slot = one of the `fits` types above · quality = poor / common / uncommon / rare / epic / legendary (colour only) ·
// stats = WL.GEAR_STAT_KEYS, missing = 0 · weapon (weapons only) = 'sword', 'dagger', 'staff', 'mace' … — kept for the
// record (until round 149 a sword in the main hand ticked Sword Specialization for Humans). "Use:" and "Chance on hit:" effects are not simulated yet.
WL.ITEMS = {};                                            // filled by data/item-db.js (loaded after this file)

// Enchants (round 148), keyed by the game's enchant id. Format:
//   2543: { name: 'Enchant name', slots: ['head', 'legs'], stats: { sp: 8, hitPct: 1 } }
// slots = the WL.GEAR_SLOTS keys it can go on · stats as for items. Empty until the Wowhead Forever data is there: until
// then each enchant is typed in by hand (or comes with a gear code).
WL.ENCHANTS = {};
