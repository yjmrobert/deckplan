# Deckplan

A static, procedural map generator for boarding a giant starship, one sector at a time.
Built in the spirit of [Derelict Maps](https://derelictmaps.com): numbered rooms, a key,
1-inch squares, a black-and-white plan mode and a full-colour mode, and nothing but a seed
behind every map.

The ship is enormous. Each class is a grid of **decks × frames × laterals** (port, centre,
starboard), and every cell of that grid is a sector: a 28×40 square map (small 21×30, large
35×50) full of corridors and rooms. Exits on a sector's borders line up with the sectors next
to it, lift shafts sit in the same place on every deck of a column, and ladders connect each
deck to the one below. Walk the party in through an airlock on the outer hull and let them
spend sessions digging toward the enginarium.

No build step, no server. Open `index.html` in a browser.

## Controls

- **Seed** — six characters. The same seed, class, size and condition always give the same ship,
  and the same sector of it always lays out the same way.
- **Class** — Battlecruiser, Bulk freighter, Pilgrim liner, Survey vessel, Prison barge, Space hulk.
  The class sets the ship's dimensions and which zones you tend to find where (command toward the
  prow and upper decks, enginarium aft, cargo and maintenance low, hangars on the flanks).
- **Condition** — Intact, Rundown (stains, debris, a few jammed doors) or Derelict (collapsed
  sections, more sealed and open doors, scorching and gore). Hulks are always derelict and also
  have walls that have given way between rooms.
- **Sector** — pick a deck, then a cell in the overview grid, or click an exit arrow on the map to
  walk through. Visited sectors are remembered in the browser, per ship.
- **Look** — colour or plan, five colour themes, numbers / names / both, zone outlines, page grid.

The map code in the URL hash is the whole state; copy the link to share the exact sector.

## Printing

Letter paper, ¼-inch margins, portrait. Two layouts:

- **Whole sector, tiled pages** — 7×10 squares per page at 1 inch, so a medium sector is a 4×4
  grid of 16 pages labelled A1…D4. Pages have a ¼-inch bleed past the dashed cut line so walls
  are not clipped.
- **Room by room pieces** — every room and corridor on its own piece with its walls and doors,
  packed onto as few pages as possible. Rooms bigger than a page come in labelled parts.
  Print this and hand out rooms as the party opens doors.

Squares can also be ¾ or ½ inch. A key page lists every room with its zone, size, door states,
ladders and what it connects to. Background defaults to white to save ink.

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
   column; ladders are hashed per pair of decks so both ends agree.
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

## Files

- `js/rng.js` seeded RNG · `js/data.js` classes, zones, rooms, themes · `js/hull.js` silhouette, network,
  zone plan · `js/layout.js` sectors, suites, doors · `js/furnish.js` props and decor · `js/geom.js` wall tracing · `js/render.js`
  SVG · `js/print.js` page tiling and room pieces · `js/app.js` UI.
- `test/smoke.js` builds hundreds of sectors in Node and checks ownership, reachability per hull island, prop
  overlap and that every exit has its twin in the neighbouring sector. `test/render.js` writes a sector SVG and a print preview HTML.

```
node test/smoke.js
node test/render.js ALPHA1 W m intact 2 3 1 color fleet out/demo
```
