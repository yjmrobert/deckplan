# Deckplan

A static, procedural map generator for boarding a giant starship, one sector at a time.
Built in the spirit of [Derelict Maps](https://derelictmaps.com): numbered rooms, a key,
1-inch squares, a black-and-white plan mode and a full-colour mode, and nothing but a seed
behind every map.

The ship is enormous. Each class is a grid of **decks × frames × laterals** (port, centre,
starboard), and every cell of that grid is a sector: a 28×40 square map (tiny 14×20, small 21×30,
large 35×50) full of corridors and rooms. Exits on a sector's borders line up with the sectors next
to it, lift shafts sit in the same place on every deck of a column, and ladders connect each
deck to the one below. Above every deck runs a vent layer, a maze of crawlways with its own map.
Walk the party in through an airlock on the outer hull and let them spend sessions digging toward
the enginarium.

For a quick playtest pick the **Cutter**: three sectors long, one wide, two decks, so the whole ship
prints in a sitting at the tiny sector size.

No build step, no server. Open `index.html` in a browser.

## Controls

- **Seed** — six characters. The same seed, class, size and condition always give the same ship,
  and the same sector of it always lays out the same way.
- **Class** — Battlecruiser, Bulk freighter, Pilgrim liner, Survey vessel, Prison barge, Space hulk,
  Cutter. The class sets the ship's dimensions and which zones you tend to find where (command toward
  the prow and upper decks, enginarium aft, cargo and maintenance low, hangars on the flanks).
- **Condition** — Intact, Rundown (stains, debris, a few jammed doors) or Derelict (collapsed
  sections, more sealed and open doors, scorching and gore). Hulks are always derelict and also
  have walls that have given way between rooms.
- **Build** — *Organic* carves every room to fit, so no two are alike. *Kit* lays every room out of a
  fixed catalogue of standard parts (see below), for a table that reuses printed pieces.
- **Sector** — pick a deck, then a cell in the overview grid, or click an exit arrow on the map to
  walk through. Visited sectors are remembered in the browser, per ship.
- **Layer** — the deck itself, or the vents above it. Duct crossings on the vent map are clickable too.
- **Look** — colour or plan, five colour themes, numbers / names / both / part codes, zone outlines,
  page grid.

The map code in the URL hash is the whole state; copy the link to share the exact sector.

## Printing

Letter paper, ¼-inch margins, portrait. Five layouts:

- **Whole sector, tiled pages** — 7×10 squares per page at 1 inch, so a medium sector is a 4×4
  grid of 16 pages labelled A1…D4. Pages have a ¼-inch bleed past the dashed cut line so walls
  are not clipped.
- **Room by room pieces** — every room and corridor on its own piece with its walls and doors,
  packed onto as few pages as possible. Rooms bigger than a page come in labelled parts.
  Print this and hand out rooms as the party opens doors.
- **Vent layer, tiled pages** — the crawlways above the deck on the same page grid, with the rooms
  below ghosted in so the two maps line up.
- **Kit: placement sheet** — the sector tiles with every room labelled by its part code and a ↻ where
  the part is laid turned a quarter. The GM's map for laying out the kit.
- **Kit: one of each part, tokens, parts list** — each standard part the scope needs (this sector,
  this deck or the whole ship), printed once with its fixed furnishing and walls all round; door,
  grille and ladder tokens to lay on top; and a parts list saying how many of each to print. For a
  deck or a ship the count is the most any one sector needs at once, since only one sector is on
  the table at a time.

Squares can also be ¾ or ½ inch. A key page lists every room with its zone, size, door states,
ladders and what it connects to, where every vent grille and shaft leads and how far the crawl is,
and in a kit build the parts the sector needs. Background defaults to white to save ink.

## The kit

In the kit build rooms come only in these footprints: 3×3, 3×5, 4×4, 4×6, 5×5, 5×7, 7×7, 7×10, 7×14
and 10×14, laid either way round; corridors are two- or three-wide straights of 5, 3, 2 and 1
squares. A part is a footprint and a *style* (Cargo, Engineering, Quarters, Mess, Medical, Command,
Military, Science, Sacred, Utility…), and every part has one fixed furnishing that never changes
between ships, so a Cargo 7×10 printed once serves every hold, bulk store and loading bay of that
size on every ship. Halls of 35 squares and more come in two variants. The key and placement sheet
still name each room (hold, cold store, galley…); the part is the physical piece.

Each part has door slots, a symmetric set of wall squares the furnishing keeps clear, and doors go
nowhere else. Blocks are tiled with streets (side corridors off the thoroughfare) so that every
shelf of parts stands against a corridor, and whatever hull is left between the parts is drawn as
solid structure. Where structure would cut a group off, a one-square passage is carved through it.
Corridor squares at the hull's ragged edge are listed separately as cut-to-fit.

PNG export renders at 100 px per square; SVG export is the live drawing.

## How the ship is made

1. **Silhouette.** The class picks a hull: a 45° prow (one or two stages), an optional waist, a 45° stern
   and an engine block, narrower on the top and bottom decks so the cross-section is a lens. Hulks are
   asymmetric with bites out of the hull. Sectors exist where the hull covers enough of them; inside a
   sector the hull edge is drawn with chamfered squares and space beyond it.
2. **Zone plan.** The ship is divided into regions (prow, fore, mid, aft, stern × top, mid, bottom decks ×
   centre or flank) and each region is given a dominant zone by class: command forward and high,
   enginarium aft, cargo and maintenance low, hangars on the flanks, detention in the bilges. Every
   sector in a region shares that zone; its blocks are that zone or a supporting one.
3. **Network.** A fore-aft thoroughfare runs through every sector of a lateral column, shifting sideways
   only along a cross passage so it still meets the border where the next sector expects it. Cross
   passages at hashed rows link port, centre and starboard. Exits are wherever these meet a border with
   hull on both sides, so passages are never carved through rooms.
4. **Blocks.** The rectangles between thoroughfare and cross passages are split by BSP into side
   corridors and rooms; side corridors that connect to nothing become room space. Rooms are clipped to
   the hull.
5. **Suites.** Within a block, rooms that touch a corridor become front rooms (bridge, ward, mess,
   hangar…) and the rooms behind them take matching support roles (surgery and morgue behind a ward,
   galley and cold store behind a mess, cells behind a guard post). Repeated fronts are discouraged and
   singletons enforced per sector.
6. **Doors.** Support rooms door into their suite; front rooms door onto the best corridor (thoroughfare
   over side passage); private rooms keep to their suite. Anything still unreachable is linked through a
   public neighbour of the same zone. A few loop doors join compatible rooms, hatches are rare,
   bulkheads cross minor junctions, some doors are sealed or jammed.
7. **Lifts and ladders.** The lift lobby sits beside the thoroughfare at the same spot on every deck of a
   column. Ladders stand in the thoroughfare, which runs at the same squares on every deck of a column, and
   their squares are pinned: doors keep off them and the furnisher places them first, so both ends always
   line up.
8. **Damage in three dimensions.** Derelicts carry void volumes at ship scale: craters that taper through
   several decks, slabs sheared off a flank, and whole sections gone across two or three decks. Hulks get
   many. Sectors and rooms are clipped to what is left, torn edges are drawn ragged with debris drifting
   in the void, and the overview shows the holes per deck.
9. **Walkability proof.** Every hull island on every deck is a node; exits, lift shafts and ladders are
   edges. Where the graph falls apart the plan adds a ladder through the deck or a hazard hatch through a
   sector wall until the whole ship is one piece, so players can always get everywhere, often only by
   changing decks. Scraps too small to stand on, and anything that still cannot be reached, are written
   off as destroyed.
10. **Furnishing** per room type, keeping the squares in front of doors free and never cutting a room in
   two. Decor (stains, pipes, rubble) never blocks a square.
11. **Vents.** A lattice of odd squares over the sector is carved into a maze by a randomised spanning
   tree, pared back to about half the lattice while keeping every route between its entry points, then given
   a few loops. Grilles drop into rooms below (always the vent plant and life support, about four in ten
   other rooms, the odd corridor). Shafts are planned per column at ship level as a chain of two- or
   three-deck climbs handing over on a shared deck, so lifts remain the way to cross many decks. Crossings
   carry the maze into the next sector through hashed border squares.

## Files

- `js/rng.js` seeded RNG · `js/data.js` classes, zones, rooms, kit catalogue, themes · `js/hull.js` silhouette,
  network, zone plan · `js/layout.js` sectors, suites, kit tiler, doors · `js/furnish.js` props and decor, kit
  variants · `js/vents.js` the vent layer · `js/geom.js` wall tracing · `js/render.js` SVG for decks, vents and
  parts · `js/print.js` page tiling, pieces, kit sheets and parts lists · `js/app.js` UI.
- `test/smoke.js` builds thousands of sectors in Node, in both builds, and checks ownership, reachability per
  hull island, prop overlap, that every exit, ladder, lift, vent shaft and duct crossing has its twin in the
  neighbouring sector, that ladders land on their planned square, and in the kit build that every room is a
  catalogue part and every door sits on a door slot. `test/render.js` writes a sector SVG, its vent map and a
  print preview HTML.

```
node test/smoke.js                       # all seeds, sizes and builds (several minutes)
node test/smoke.js ALPHA1 xs,m kit       # one seed, two sizes, kit build only
node test/render.js ALPHA1 W m intact 2 3 1 color fleet out/demo
BUILD=kit LAYOUT=kit SCOPE=deck node test/render.js ALPHA1 C xs intact 1 1 0 plan fleet out/kit
```
