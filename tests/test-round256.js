// Round 256 tests — the user, 2026-11-26: "make it say vendor: pix xizzix" (Magician's Cord's source read "Drop: Pix Xizzix").
//  * tools/gen-items.js from(): Wowhead names the NPC of a vendor item as its source; with a vendor source and no drop
//    source the text is now "Vendor: <name>" instead of "Drop: <name>" — 259 items (Pix Xizzix, Anachronos, the PvP rank
//    vendors, …). Only these labels changed in data/item-db.js.
(function () {
  T.run('round 256: vendor items say "Vendor: <name>"', function () {
    var I = WL.ITEMS;
    T.ok(I[272393] && I[272393].from === 'Vendor: Pix Xizzix', 'Magician\'s Cord: "Vendor: Pix Xizzix" (got ' + (I[272393] && I[272393].from) + ')');
    T.ok(I[272438] && I[272438].from === 'Vendor: Pix Xizzix', 'Weakness Analyzer: "Vendor: Pix Xizzix"');
    var bad = Object.keys(I).filter(function (id) { return I[id].src === 'vendor' && /^Drop: /.test(I[id].from || ''); });
    T.ok(bad.length === 0, 'no vendor item says "Drop: …" (' + bad.slice(0, 5).join(', ') + ')');
    var vend = Object.keys(I).filter(function (id) { return /^Vendor: /.test(I[id].from || ''); }).length;
    T.ok(vend >= 259, 'at least 259 items say "Vendor: <name>" (' + vend + ')');
    T.ok(I[10255] && I[10255].from === 'World drop', 'FROM_FIX still wins (Master\'s Belt: World drop)');
  });
})();
