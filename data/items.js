// Items for the gear builder (round 147, user: "a character style layout where you click on every slot and input the item
// you want"). The builder adds up the stats of what you wear into the Stats panel's Sheet (gear) values; the fight engine
// never reads this file. The item list itself comes later, from the Wowhead Forever database, once there is enough data
// there — until then WL.ITEMS is empty and every slot takes an item you type in yourself.
window.WL = window.WL || {};

// The stats an item can carry: the same values as the Sheet (gear) column of the Stats panel (cfg.gear), in its units —
// spell power in points, hit / crit / haste in %, the rest in points. Order = the order the page lists them in.
WL.GEAR_STAT_KEYS = ['sp', 'shadowSp', 'fireSp', 'hitPct', 'critPct', 'hastePct', 'pierce', 'int', 'spi', 'sta', 'agi', 'mp5'];

// The character window's slots: a column on the left, one on the right and the weapons under them, top to bottom as in
// the game. `fits` = the item slot types that can go in (a Warlock wears no shield and cannot hold a weapon in the off hand).
WL.GEAR_SLOTS = [
  { key: 'head',     name: 'Head',      col: 'left',  fits: ['head'] },
  { key: 'neck',     name: 'Neck',      col: 'left',  fits: ['neck'] },
  { key: 'shoulder', name: 'Shoulder',  col: 'left',  fits: ['shoulder'] },
  { key: 'back',     name: 'Back',      col: 'left',  fits: ['back'] },
  { key: 'chest',    name: 'Chest',     col: 'left',  fits: ['chest'] },
  { key: 'shirt',    name: 'Shirt',     col: 'left',  fits: ['shirt'] },
  { key: 'tabard',   name: 'Tabard',    col: 'left',  fits: ['tabard'] },
  { key: 'wrist',    name: 'Wrist',     col: 'left',  fits: ['wrist'] },
  { key: 'hands',    name: 'Hands',     col: 'right', fits: ['hands'] },
  { key: 'waist',    name: 'Waist',     col: 'right', fits: ['waist'] },
  { key: 'legs',     name: 'Legs',      col: 'right', fits: ['legs'] },
  { key: 'feet',     name: 'Feet',      col: 'right', fits: ['feet'] },
  { key: 'finger1',  name: 'Ring',      col: 'right', fits: ['finger'] },
  { key: 'finger2',  name: 'Ring',      col: 'right', fits: ['finger'] },
  { key: 'trinket1', name: 'Trinket',   col: 'right', fits: ['trinket'] },
  { key: 'trinket2', name: 'Trinket',   col: 'right', fits: ['trinket'] },
  { key: 'mainHand', name: 'Main Hand', col: 'weapons', fits: ['oneHand', 'mainHand', 'twoHand'] },
  { key: 'offHand',  name: 'Off Hand',  col: 'weapons', fits: ['offHand'] },
  { key: 'ranged',   name: 'Wand',      col: 'weapons', fits: ['ranged'] },
];

// The item list, keyed by the game's item id (the in-game addon recognises what you wear by that id). Format:
//   12345: { name: 'Item name', slot: 'head', quality: 'epic', stats: { sp: 20, int: 15, critPct: 1 }, weapon: 'sword' }
// slot = one of the `fits` types above · quality = poor / common / uncommon / rare / epic / legendary (colour only) ·
// stats = WL.GEAR_STAT_KEYS, missing = 0 · weapon (weapons only) = 'sword', 'dagger', 'staff', 'mace' … — a sword in the
// main hand ticks Sword Specialization for Humans. "Use:" and "Chance on hit:" effects are not simulated yet.
WL.ITEMS = {};
