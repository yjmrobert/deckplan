// Sector layout. The ship-level network (hull.js) fixes the thoroughfare and cross passages that run through
// this sector; the blocks between them are split into side corridors and rooms, rooms are grouped into suites
// that make sense together, and doors follow rules about what may open into what.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const K = (x, y) => x + ',' + y;
  const unK = (k) => k.split(',').map(Number);

  const SINGLETON = new Set(['bridge', 'nave', 'reactor', 'engines', 'crypt', 'reliquary', 'morgue', 'surgery', 'pharmacy', 'customs', 'menagerie', 'yard', 'maproom', 'comms', 'firecon', 'furnace', 'interview', 'refectory', 'range', 'drill', 'crane', 'sensor', 'quarantine', 'gym', 'laundry', 'infirmary', 'clean', 'sump']);
  const PRIVATE = new Set(['airlock', 'brig', 'contain', 'wash', 'cells', 'cell', 'magazine', 'reactor', 'lift', 'quarantine', 'confessional', 'void', 'stateroom', 'cabin', 'morgue', 'surgery', 'interview', 'specimen', 'cold', 'pharmacy', 'reliquary', 'crypt', 'fuel', 'nest']);
  const HALL_FALLBACK = { command: 'bridge', habitation: 'mess', enginarium: 'engines', cargo: 'hold', medicae: 'ward', armoury: 'weapons', sanctum: 'nave', science: 'hydro', maintenance: 'sump', brig: 'cells', hangar: 'hangar', void: 'void' };
  const FILLER = { command: ['office', 'storage', 'wash', 'cabin'], habitation: ['cabin', 'wash', 'storage', 'cabins'], enginarium: ['tools', 'storage', 'wash'], cargo: ['storage', 'locker', 'office'], medicae: ['storage', 'wash', 'office'], armoury: ['storage', 'locker', 'wash'], sanctum: ['cell', 'shrine', 'storage'], science: ['storage', 'office', 'wash'], maintenance: ['storage', 'tools', 'locker'], brig: ['cell', 'storage', 'guard'], hangar: ['storage', 'locker', 'tools'], void: ['void', 'storage', 'nest'] };
  // Suites: a front room that opens onto a corridor and the support rooms that sit behind it.
  const SUITES = {
    command: [['bridge', ['ready', 'comms', 'maproom', 'office', 'wash']], ['firecon', ['office', 'archive', 'wash']], ['control', ['office', 'storage']], ['security', ['cell', 'office', 'armory']], ['archive', ['office', 'storage']], ['lounge', ['cabin', 'cabin', 'wash']]],
    habitation: [['mess', ['galley', 'cold', 'wash', 'storage']], ['barracks', ['wash', 'locker', 'armory']], ['commons', ['cabin', 'cabin', 'cabin', 'wash']], ['cabins', ['wash', 'locker']], ['lounge', ['stateroom', 'stateroom', 'wash']], ['gym', ['wash', 'locker']], ['infirmary', ['pharmacy', 'wash']], ['laundry', ['storage']], ['galley', ['cold', 'storage']]],
    enginarium: [['engines', ['control', 'tools', 'coolant', 'workshop']], ['reactor', ['control', 'coolant', 'pump', 'storage']], ['workshop', ['tools', 'storage', 'wash']], ['generator', ['tanks', 'control']], ['life', ['vents', 'tanks']], ['furnace', ['fuel', 'tools']], ['pump', ['tanks', 'storage']]],
    cargo: [['hold', ['storage', 'office', 'locker']], ['loading', ['customs', 'office', 'storage']], ['storage', ['cold', 'locker']], ['crane', ['tools', 'storage']], ['tanks', ['pump']], ['hold', ['cold', 'storage']]],
    medicae: [['ward', ['surgery', 'pharmacy', 'wash', 'morgue']], ['medbay', ['pharmacy', 'wash', 'office']], ['lab', ['quarantine', 'specimen', 'cold']], ['quarantine', ['wash', 'morgue']], ['surgery', ['pharmacy', 'wash']]],
    armoury: [['weapons', ['magazine', 'magazine', 'control', 'tools']], ['armory', ['magazine', 'locker', 'office']], ['barracks', ['wash', 'armory', 'locker']], ['range', ['armory', 'storage']], ['drill', ['locker', 'wash']], ['guard', ['brig', 'cell', 'armory']]],
    sanctum: [['nave', ['reliquary', 'shrine', 'confessional', 'cell', 'cell']], ['scriptorium', ['archive', 'cell', 'cell']], ['refectory', ['galley', 'cell', 'cell', 'wash']], ['shrine', ['cell']], ['crypt', ['shrine', 'reliquary']], ['archive', ['cell', 'storage']]],
    science: [['lab', ['contain', 'specimen', 'clean', 'cold', 'office']], ['hydro', ['tanks', 'storage', 'lab']], ['sensor', ['comms', 'archive', 'office']], ['menagerie', ['specimen', 'lab', 'wash']], ['clean', ['lab', 'storage']]],
    maintenance: [['workshop', ['tools', 'storage', 'pump']], ['sump', ['pump', 'tanks']], ['vents', ['tanks', 'pump', 'storage']], ['scrap', ['storage', 'tools']], ['crew', ['wash', 'storage', 'locker']], ['generator', ['tanks', 'control']], ['tanks', ['pump', 'storage']]],
    brig: [['guard', ['cells', 'cell', 'cell', 'interview', 'armory']], ['cells', ['cell', 'cell', 'wash', 'guard']], ['security', ['interview', 'cell', 'office', 'morgue']], ['yard', ['guard', 'wash', 'cells']], ['guard', ['cell', 'cell', 'cell']]],
    hangar: [['hangar', ['ready', 'fuel', 'workshop', 'locker', 'control', 'magazine']], ['workshop', ['tools', 'fuel', 'storage']], ['ready', ['locker', 'wash', 'office']], ['control', ['office', 'storage']]],
    void: [['void', ['void', 'nest', 'scrap', 'storage']], ['nest', ['nest', 'void']], ['scrap', ['storage', 'void']], ['hold', ['void', 'storage']]],
  };
  function roomName(type) { return (DP.ROOMS[type] || { name: type }).name; }
  function typeSize(zone, type) { const z = DP.ZONES[zone]; const e = z && z.pool.find(p => p[0] === type); if (e) return e[2]; for (const k in DP.ZONES) { const f = DP.ZONES[k].pool.find(p => p[0] === type); if (f) return f[2]; } return 'mid'; }
  function sizeClass(area) { return area <= 6 ? 'small' : area >= 36 ? 'hall' : 'mid'; }
  const fits = (want, have) => want === 'any' || want === have || (want === 'mid' && have === 'hall') || (want === 'small' && have === 'mid');

  // ---- ship ---------------------------------------------------------------------
  DP.makeShip = function (params) {
    const seed = params.seed || DP.newSeed();
    const cls = DP.CLASSES[params.cls] ? params.cls : 'W';
    const C = DP.CLASSES[cls];
    const size = DP.SECTOR_SIZES[params.size] ? params.size : 'm';
    const condition = C.forceCondition || (DP.CONDITIONS[params.condition] ? params.condition : 'intact');
    const ship = { seed, cls, className: C.name, C, F: C.frames, Lat: C.laterals, D: C.decks, size, W: DP.SECTOR_SIZES[size].w, H: DP.SECTOR_SIZES[size].h, condition };
    DP.shipGeometry(ship); DP.shipNet(ship);
    return ship;
  };
  DP.sectorLabel = function (ship, d, f, l) {
    const lat = ship.Lat === 1 ? '' : (l < Math.floor(ship.Lat / 2) ? 'P' : l > Math.floor(ship.Lat / 2) ? 'S' : 'C');
    return `D${d + 1}-F${String(f + 1).padStart(2, '0')}${lat}`;
  };

  // ---- sector scaffolding ---------------------------------------------------------
  function newSector(ship, d, f, l) {
    const owner = [];
    for (let y = 0; y < ship.H; y++) owner.push(new Int16Array(ship.W).fill(-1));
    const sh = DP.sectorHull(ship, d, f, l), conn = DP.shipConnections(ship);
    const hull = new Set(sh.hull), cuts = new Map(sh.cuts);
    sh.islands.forEach((cells, i) => { if (conn.dead.has(d + '/' + f + '/' + l + '#' + i)) for (const k of cells) { hull.delete(k); cuts.delete(k); } });
    const sec = { d, f, l, label: DP.sectorLabel(ship, d, f, l), W: ship.W, H: ship.H, rooms: [], owner, doors: [], props: [], decor: [], reserved: new Set(), rubble: [], zones: [], exits: [], ladders: [], hull, cuts, islands: sh.islands.length, rows: [] };
    for (let y = 0; y < ship.H; y++) { let a = -1, b = -1; for (let x = 0; x < ship.W; x++) if (sh.hull.has(K(x, y))) { if (a < 0) a = x; b = x + 1; } sec.rows.push(a < 0 ? null : [a, b]); }
    return sec;
  }
  function addRoom(sec, type, cells, extra) {
    const room = Object.assign({ id: sec.rooms.length, type, name: roomName(type), kind: 'room', cells: [], set: new Set(), number: 0, zone: -1, block: -1 }, extra || {});
    for (const [x, y] of cells) {
      if (x < 0 || y < 0 || x >= sec.W || y >= sec.H || !sec.hull.has(K(x, y))) continue;
      const prev = sec.owner[y][x];
      if (prev >= 0) { const pr = sec.rooms[prev]; pr.cells = pr.cells.filter(([cx, cy]) => !(cx === x && cy === y)); pr.set.delete(K(x, y)); }
      sec.owner[y][x] = room.id; room.cells.push([x, y]); room.set.add(K(x, y));
    }
    sec.rooms.push(room);
    return room;
  }
  const rectCells = (r) => { const c = []; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) c.push([x, y]); return c; };
  function computeBbox(r) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of r.cells) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + 1 > x1) x1 = x + 1; if (y + 1 > y1) y1 = y + 1; }
    r.bbox = { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }
  function components(cells, set) {
    const seen = new Set(), comps = [];
    for (const [x, y] of cells) {
      const k = K(x, y); if (seen.has(k)) continue;
      const q = [[x, y]], comp = []; seen.add(k);
      while (q.length) { const [cx, cy] = q.pop(); comp.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = K(cx + dx, cy + dy); if (set.has(nk) && !seen.has(nk)) { seen.add(nk); q.push([cx + dx, cy + dy]); } } }
      comps.push(comp);
    }
    return comps;
  }
  function mergeInto(sec, from, to) {
    for (const [x, y] of from.cells) { sec.owner[y][x] = to.id; to.cells.push([x, y]); to.set.add(K(x, y)); }
    from.cells = []; from.set = new Set();
  }
  function neighboursOf(sec, room) {
    const m = new Map();
    for (const [x, y] of room.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= sec.W || ny >= sec.H) continue; const o = sec.owner[ny][nx]; if (o >= 0 && o !== room.id) m.set(o, (m.get(o) || 0) + 1); }
    return m;
  }
  // after clipping and carving: split rooms cut in two, merge slivers, give every hull square an owner
  function tidy(sec) {
    const n = sec.rooms.length;
    for (let i = 0; i < n; i++) {
      const r = sec.rooms[i]; if (!r.cells.length) continue;
      const comps = components(r.cells, r.set).sort((a, b) => b.length - a.length);
      for (const c of comps.slice(1)) { const nr = addRoom(sec, r.type, c, { zone: r.zone, block: r.block, depth: r.depth, kind: r.kind }); if (r.kind === 'corridor') nr.name = r.name; }
    }
    let changed = true, guard = 0;
    while (changed && guard++ < 10) {
      changed = false;
      for (const k of sec.hull) { const [x, y] = unK(k); if (sec.owner[y][x] >= 0) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const o = (sec.owner[y + dy] || [])[x + dx]; if (o >= 0 && sec.rooms[o].kind === 'room') { sec.owner[y][x] = o; sec.rooms[o].cells.push([x, y]); sec.rooms[o].set.add(k); changed = true; break; } } }
    }
    for (const k of sec.hull) { const [x, y] = unK(k); if (sec.owner[y][x] >= 0) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const o = (sec.owner[y + dy] || [])[x + dx]; if (o >= 0) { sec.owner[y][x] = o; sec.rooms[o].cells.push([x, y]); sec.rooms[o].set.add(k); break; } } }
    for (const r of sec.rooms) computeBbox(r);
    for (const r of sec.rooms) {
      if (!r.cells.length || r.type === 'lift') continue;
      const sliver = r.kind === 'room' && Math.min(r.bbox.w, r.bbox.h) === 1 && r.cells.length <= 12;
      if (r.cells.length >= 3 && !sliver) continue;
      const nb = [...neighboursOf(sec, r)].filter(([o]) => sec.rooms[o].type !== 'lift').sort((a, b) => (b[1] + (sec.rooms[b[0]].kind === r.kind ? 100 : 0)) - (a[1] + (sec.rooms[a[0]].kind === r.kind ? 100 : 0)));
      if (nb.length) mergeInto(sec, r, sec.rooms[nb[0][0]]);
    }
    for (const r of sec.rooms) computeBbox(r);
  }

  // ---- BSP inside a block ---------------------------------------------------------
  function bsp(rect, depth, rng, ctx, out) {
    const area = rect.w * rect.h;
    const minChild = depth < 2 ? 3 : 2;
    const canV = rect.w >= 2 * minChild + 1, canH = rect.h >= 2 * minChild + 1;
    let leaf = !canV && !canH || depth >= 7;
    if (!leaf && depth >= 2) {
      if (rect.w <= 8 && rect.h <= 8 && area <= 40) leaf = true;
      else if (area >= 36 && area <= 160 && Math.max(rect.w, rect.h) <= 16 && rng.chance(ctx.hallP)) leaf = true;
    }
    if (leaf) { out.leaves.push(rect); return; }
    let vertical = canV && (!canH || rect.w > rect.h * 1.2 || (rect.h <= rect.w * 1.2 && rng.chance(0.5)));
    const len = vertical ? rect.w : rect.h;
    let cw = 0;
    if (depth === 1 && Math.min(rect.w, rect.h) >= 9 && rng.chance(0.7)) cw = rng.chance(0.6) ? 2 : 1;
    else if (depth === 2 && Math.min(rect.w, rect.h) >= 8 && rng.chance(0.35)) cw = 1;
    if (len - cw < 2 * minChild) cw = 0;
    const lo = minChild, hi = len - cw - minChild;
    let pos;
    if (hi - lo >= 4) { const a = lo + Math.round((hi - lo) * 0.25), b = lo + Math.round((hi - lo) * 0.75); pos = rng.int(a, b); } else pos = rng.int(lo, hi);
    const r = rect;
    const c1 = vertical ? { x: r.x, y: r.y, w: pos, h: r.h } : { x: r.x, y: r.y, w: r.w, h: pos };
    const c2 = vertical ? { x: r.x + pos + cw, y: r.y, w: r.w - pos - cw, h: r.h } : { x: r.x, y: r.y + pos + cw, w: r.w, h: r.h - pos - cw };
    if (cw > 0) out.corridors.push(vertical ? { x: r.x + pos, y: r.y, w: cw, h: r.h, depth } : { x: r.x, y: r.y + pos, w: r.w, h: cw, depth });
    bsp(c1, depth + 1, rng, ctx, out); bsp(c2, depth + 1, rng, ctx, out);
  }

  // ---- build ------------------------------------------------------------------------
  function buildSector(ship, d, f, l) {
    const rng = DP.makeRng(`${ship.seed}/${ship.cls}/${ship.size}/${d}/${f}/${l}`);
    const sec = newSector(ship, d, f, l);
    const W = ship.W, H = ship.H;
    const conn = DP.shipConnections(ship);
    const ckey = d + '/' + f + '/' + l;
    const { bands, spineX, crosses, sw } = DP.sectorBands(ship, f, l);

    // 1. thoroughfare and cross passages
    const spineRooms = [];
    bands.forEach(([ya, yb], bi) => {
      if (yb <= ya) return;
      const sx = spineX(bi);
      const r = addRoom(sec, 'corridor', rectCells({ x: sx, y: ya, w: sw, h: yb - ya }), { kind: 'corridor', depth: 0, name: sw === 3 ? 'Grand Thoroughfare' : 'Main Thoroughfare', lane: 'spine' });
      spineRooms.push(r);
    });
    for (const cy of crosses) addRoom(sec, 'corridor', rectCells({ x: 0, y: cy, w: W, h: 2 }), { kind: 'corridor', depth: 0, name: 'Cross Passage', lane: 'cross' });

    // 2. blocks between them, each split into side corridors and rooms
    const dominant = DP.sectorZone(ship, d, f, l);
    const blocks = [];
    bands.forEach(([ya, yb], bi) => {
      if (yb <= ya) return;
      const sx = spineX(bi);
      for (const [bx0, bx1] of [[0, sx], [sx + sw, W]]) {
        if (bx1 - bx0 < 3) continue;
        // skip blocks with no hull in them
        let any = false; for (let yy = ya; yy < yb && !any; yy++) { const r = sec.rows[yy]; if (r && r[1] > bx0 && r[0] < bx1) any = true; }
        if (!any) continue;
        blocks.push({ id: blocks.length, rect: { x: bx0, y: ya, w: bx1 - bx0, h: yb - ya } });
      }
    });
    const zrng = rng.fork('zones');
    const zoneTypes = blocks.map(() => (zrng.chance(0.68) ? dominant : zrng.pick(DP.ZONE_SUPPORT[dominant] || ['maintenance'])));
    if (ship.condition === 'derelict' && !zoneTypes.includes('void') && zrng.chance(ship.cls === 'K' ? 0.8 : 0.4) && blocks.length > 1) zoneTypes[zrng.int(0, blocks.length - 1)] = 'void';
    const zoneIndex = new Map();
    for (const b of blocks) {
      const zt = zoneTypes[b.id];
      if (!zoneIndex.has(zt)) { zoneIndex.set(zt, sec.zones.length); sec.zones.push({ id: sec.zones.length, type: zt, name: DP.ZONES[zt].name, letter: String.fromCharCode(65 + sec.zones.length), blocks: [] }); }
      b.zone = zoneIndex.get(zt); sec.zones[b.zone].blocks.push(b.rect);
      const hallP = ({ cargo: 0.5, hangar: 0.6, enginarium: 0.4, void: 0.4, brig: 0.3 })[zt] || 0.25;
      const out = { leaves: [], corridors: [] };
      bsp(b.rect, 1, rng.fork('bsp' + b.id), { hallP }, out);
      for (const c of out.corridors) addRoom(sec, 'corridor', rectCells(c), { kind: 'corridor', depth: c.depth, name: c.depth === 1 ? 'Corridor' : 'Passage', lane: 'side', block: b.id, zone: b.zone });
      for (const leaf of out.leaves) addRoom(sec, 'storage', rectCells(leaf), { zone: b.zone, block: b.id });
    }
    tidy(sec);
    // side corridors that connect to nothing become part of the rooms beside them
    for (const r of sec.rooms) {
      if (r.kind !== 'corridor' || r.lane !== 'side' || !r.cells.length) continue;
      const nb = [...neighboursOf(sec, r)];
      if (!nb.some(([o]) => sec.rooms[o].kind === 'corridor')) { const best = nb.filter(([o]) => sec.rooms[o].kind === 'room').sort((a, b) => b[1] - a[1])[0]; if (best) mergeInto(sec, r, sec.rooms[best[0]]); }
    }
    tidy(sec);

    // 3. exits: thoroughfare and cross passages through the borders, plus repair hatches the ship plan asked for
    for (const e of conn.exits.get(ckey) || []) {
      const cell = e.side === 'N' ? [e.t, 0] : e.side === 'S' ? [e.t, H - 1] : e.side === 'W' ? [0, e.t] : [W - 1, e.t];
      const id = sec.owner[cell[1]][cell[0]]; if (id < 0) continue;
      const room = sec.rooms[id];
      const door = e.side === 'N' ? { x: e.t, y: 0, side: 'N' } : e.side === 'S' ? { x: e.t, y: H, side: 'N' } : e.side === 'W' ? { x: 0, y: e.t, side: 'W' } : { x: W, y: e.t, side: 'W' };
      sec.doors.push(Object.assign(door, { a: room.id, b: -2, kind: 'exit', w: e.w, exitSide: e.side, hatch: e.kind === 'hatch' }));
      for (const [x, y] of doorCells(door)) sec.reserved.add(K(x, y));
      sec.exits.push({ side: e.side, t: e.t, w: e.w, room: room.id, hatch: e.kind === 'hatch' });
    }

    // 4. lift lobby beside the thoroughfare, shared by every deck of this column where the shaft survives
    {
      const lift = conn.lifts.get(f + '/' + l);
      if (lift && lift.decks.includes(d)) {
        const cells = lift.cells.filter(([x, y]) => sec.hull.has(K(x, y)));
        if (cells.length === 4) { const r = addRoom(sec, 'lift', cells, { zone: -1 }); r.name = 'Lift'; r.liftDecks = lift.decks; tidy(sec); }
      }
    }
    sec.ladders = (conn.ladders.get(ckey) || []).map(L => Object.assign({}, L));

    // 5. room types: suites per block
    assignSuites(ship, sec, blocks, rng.fork('suites'));
    // airlocks on rooms against the hull
    const arng = rng.fork('airlocks');
    spaceEdges(sec, ship);
    if (arng.chance(0.5)) {
      const cands = sec.rooms.filter(r => r.kind === 'room' && r.type !== 'lift' && r.cells.length >= 4 && r.cells.length <= 30 && r.spaceEdges.length >= 2 && !r.parent);
      if (cands.length) { const r = arng.pick(cands); r.type = 'airlock'; r.name = 'Airlock'; }
    }
    applyDamage(ship, sec, rng.fork('damage'));
    connect(ship, sec, rng.fork('doors'));
    DP.furnishSector(ship, sec, rng.fork('furnish'));
    numberRooms(sec);
    return sec;
  }

  function spaceEdges(sec, ship) {
    const ox = sec.l * sec.W, oy = sec.f * sec.H;
    const kind = (x, y) => DP.hullKind(ship, sec.d, ox + x, oy + y);
    for (const r of sec.rooms) {
      r.spaceEdges = [];
      for (const [x, y] of r.cells) {
        if (sec.cuts.has(K(x, y))) continue;
        const k = [[x - 1, y, { x, y, side: 'W' }], [x + 1, y, { x: x + 1, y, side: 'W' }], [x, y - 1, { x, y, side: 'N' }], [x, y + 1, { x, y: y + 1, side: 'N' }]];
        for (const [nx, ny, e] of k) { const hk = kind(nx, ny); if (hk !== 1) r.spaceEdges.push(Object.assign(e, { torn: hk === 2, cx: x, cy: y })); }
      }
    }
  }

  // ---- suites ---------------------------------------------------------------------------
  function assignSuites(ship, sec, blocks, rng) {
    const adj = adjacency(sec);
    const byRoom = new Map();
    for (const [a, b, edges] of adj) { if (!byRoom.has(a)) byRoom.set(a, []); if (!byRoom.has(b)) byRoom.set(b, []); byRoom.get(a).push([b, edges.length]); byRoom.get(b).push([a, edges.length]); }
    const isCorr = (id) => sec.rooms[id].kind === 'corridor';
    const used = new Set(); const frontCount = new Map();
    // a hall type from the zone's pool, least used first
    const hallType = (zt) => { const halls = DP.ZONES[zt].pool.filter(p => p[2] === 'hall' && !(SINGLETON.has(p[0]) && used.has(p[0]))).map(p => p[0]); if (!halls.length) return HALL_FALLBACK[zt]; halls.sort((a, b) => (frontCount.get(a) || 0) - (frontCount.get(b) || 0)); return halls[0]; };
    const setType = (r, t) => { if (SINGLETON.has(t) && used.has(t)) return false; r.type = t; r.name = roomName(t); used.add(t); return true; };
    for (const b of blocks) {
      const zt = sec.zones[b.zone].type;
      const leaves = sec.rooms.filter(r => r.kind === 'room' && r.block === b.id && r.cells.length && r.type !== 'lift');
      const assigned = new Set();
      const touches = (r) => (byRoom.get(r.id) || []).some(([o]) => isCorr(o));
      const fronts = leaves.filter(touches).sort((p, q) => q.cells.length - p.cells.length);
      const templates = SUITES[zt] || SUITES.cargo;
      for (const front of fronts) {
        if (assigned.has(front.id)) continue;
        const sc = sizeClass(front.cells.length);
        let cand = templates.filter(([ft]) => fits(typeSize(zt, ft), sc) && !(SINGLETON.has(ft) && used.has(ft)));
        if (!cand.length) cand = templates.filter(([ft]) => !(SINGLETON.has(ft) && used.has(ft)));
        let ft, supports;
        if (cand.length) { [ft, supports] = rng.weighted(cand.map(c => [c, 1 / (1 + 4 * (frontCount.get(c[0]) || 0))])); } else { ft = sc === 'hall' ? hallType(zt, sc) : rng.pick(FILLER[zt]); supports = FILLER[zt]; }
        if (sc === 'hall' && typeSize(zt, ft) !== 'hall') { const h = hallType(zt, sc); if (h) ft = h; }
        frontCount.set(ft, (frontCount.get(ft) || 0) + 1);
        setType(front, ft) || setType(front, rng.pick(FILLER[zt]));
        assigned.add(front.id); front.suite = front.id;
        // claim support rooms behind the front, breadth first, deeper rooms behind nearer ones
        const q = [front.id]; const pool = supports.slice();
        while (q.length && pool.length) {
          const cur = q.shift();
          const nbs = (byRoom.get(cur) || []).filter(([o, n]) => n >= 2 && !isCorr(o) && !assigned.has(o) && sec.rooms[o].block === b.id && sec.rooms[o].type !== 'lift').sort((p, q2) => q2[1] - p[1]);
          for (const [o] of nbs) {
            if (!pool.length) break;
            const r = sec.rooms[o]; const rsc = sizeClass(r.cells.length);
            let idx = pool.findIndex(t => fits(typeSize(zt, t), rsc) && !(SINGLETON.has(t) && used.has(t)));
            if (idx < 0 && touches(r)) continue;                     // a front room with no fitting role starts its own suite
            let t = idx >= 0 ? pool.splice(idx, 1)[0] : rng.pick(FILLER[zt].filter(ff => fits(typeSize(zt, ff), rsc)) .concat(['storage']));
            if (!setType(r, t)) setType(r, 'storage');
            r.parent = cur; r.suite = front.id; assigned.add(o); q.push(o);
          }
        }
      }
      // anything left over: filler, attached to the neighbour with the longest shared wall that is already placed
      for (const r of leaves) {
        if (assigned.has(r.id)) continue;
        const rsc = sizeClass(r.cells.length);
        const t = rsc === 'hall' ? hallType(zt) : rng.pick(FILLER[zt].filter(ff => fits(typeSize(zt, ff), rsc)).concat(['storage']));
        if (!setType(r, t)) setType(r, 'storage');
        if (rsc === 'hall') frontCount.set(t, (frontCount.get(t) || 0) + 1);
        const nbs = (byRoom.get(r.id) || []).filter(([o]) => !isCorr(o) && sec.rooms[o].kind === 'room' && !PRIVATE.has(sec.rooms[o].type)).sort((p, q) => q[1] - p[1]);
        if (nbs.length && !touches(r)) r.parent = nbs[0][0];
        assigned.add(r.id);
      }
    }
  }

  // ---- damage -----------------------------------------------------------------------------
  function applyDamage(ship, sec, rng) {
    if (ship.condition !== 'derelict') return;
    const cands = sec.rooms.filter(r => r.kind === 'room' && r.type !== 'lift' && r.type !== 'airlock' && r.cells.length >= 4 && r.cells.length <= 60);
    cands.sort((a, b) => (b.spaceEdges.length > 0) - (a.spaceEdges.length > 0) || rng.next() - 0.5);
    const n = ship.cls === 'K' ? rng.int(2, 4) : rng.int(1, 2);
    for (const r of cands.slice(0, n)) { r.type = 'void'; r.name = roomName('void'); }
    if (ship.cls === 'K') {
      const pairs = adjacency(sec).filter(([a, b, edges]) => sec.rooms[a].kind === 'room' && sec.rooms[b].kind === 'room' && sec.rooms[a].type !== 'lift' && sec.rooms[b].type !== 'lift' && edges.length >= 2);
      rng.shuffle(pairs);
      for (const [a, b, edges] of pairs.slice(0, rng.int(2, 4))) {
        const ra = sec.rooms[a], rb = sec.rooms[b]; if (!ra.cells.length || !rb.cells.length) continue;
        mergeInto(sec, rb, ra);
        for (const e of edges) sec.rubble.push(e);
        ra.collapsed = true; ra.name = ra.name + ' (collapsed wall)';
        computeBbox(ra);
      }
    }
  }

  // ---- doors ------------------------------------------------------------------------------
  function adjacency(sec) {
    const map = new Map(); const H = sec.H, W = sec.W;
    const add = (a, b, e) => { if (a > b) [a, b] = [b, a]; const k = a + ':' + b; if (!map.has(k)) map.set(k, [a, b, []]); map.get(k)[2].push(e); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = sec.owner[y][x]; if (a < 0 || sec.cuts.has(K(x, y))) continue;
      const e = x + 1 < W ? sec.owner[y][x + 1] : -1, s = y + 1 < H ? sec.owner[y + 1][x] : -1;
      if (e >= 0 && e !== a && !sec.cuts.has(K(x + 1, y))) add(a, e, { x: x + 1, y, side: 'W' });
      if (s >= 0 && s !== a && !sec.cuts.has(K(x, y + 1))) add(a, s, { x, y: y + 1, side: 'N' });
    }
    return [...map.values()];
  }
  function longestRun(edges) {
    const runs = []; const byKey = new Map();
    for (const e of edges) { const k = e.side + ':' + (e.side === 'N' ? e.y : e.x); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(e); }
    for (const [, list] of byKey) {
      list.sort((a, b) => (a.side === 'N' ? a.x - b.x : a.y - b.y));
      let run = [list[0]];
      for (let i = 1; i < list.length; i++) { const p = list[i - 1], c = list[i]; const consecutive = c.side === 'N' ? c.x === p.x + 1 : c.y === p.y + 1; if (consecutive) run.push(c); else { runs.push(run); run = [c]; } }
      runs.push(run);
    }
    runs.sort((a, b) => b.length - a.length);
    return runs;
  }
  function doorCells(d) {
    const cells = [];
    for (let i = 0; i < (d.w || 1); i++) {
      const x = d.side === 'N' ? d.x + i : d.x, y = d.side === 'N' ? d.y : d.y + i;
      if (d.side === 'N') cells.push([x, y], [x, y - 1]); else cells.push([x, y], [x - 1, y]);
    }
    return cells;
  }
  function addDoor(sec, a, b, run, kind, width, rng) {
    const w = Math.min(width || 1, run.length);
    const start = rng ? Math.max(0, Math.min(run.length - w, Math.floor((run.length - w) / 2) + rng.int(-1, 1))) : Math.floor((run.length - w) / 2);
    const e = run[start];
    const d = { x: e.x, y: e.y, side: e.side, a, b, kind: kind || 'door', w };
    sec.doors.push(d);
    for (const [x, y] of doorCells(d)) sec.reserved.add(K(x, y));
    return d;
  }
  const WIDE = new Set(['hold', 'hangar', 'weapons', 'barracks', 'engines', 'reactor', 'nave', 'loading', 'crane', 'mess', 'ward', 'cells', 'drill', 'range', 'hydro', 'sump', 'scrap', 'furnace', 'refectory', 'commons']);
  const corrRank = (r) => r.lane === 'spine' || r.lane === 'cross' ? 0 : (r.depth || 1);
  function connect(ship, sec, rng) {
    const adj = adjacency(sec);
    const isCorr = (id) => sec.rooms[id].kind === 'corridor';
    const doorBetween = new Set();
    const key = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
    const byRoom = new Map();
    for (const [a, b, edges] of adj) { if (!byRoom.has(a)) byRoom.set(a, []); if (!byRoom.has(b)) byRoom.set(b, []); byRoom.get(a).push([b, edges]); byRoom.get(b).push([a, edges]); }
    const edgesBetween = (a, b) => { const e = (byRoom.get(a) || []).find(([o]) => o === b); return e ? e[1] : null; };
    // corridor junctions
    for (const [a, b, edges] of adj) {
      if (!isCorr(a) || !isCorr(b)) continue;
      const run = longestRun(edges)[0];
      const minor = Math.max(corrRank(sec.rooms[a]), corrRank(sec.rooms[b])) >= 1;
      if (minor && run.length <= 2 && rng.chance(0.3)) { const d = addDoor(sec, a, b, run, 'bulkhead', run.length, null); d.state = rng.weighted([['open', 5], ['closed', 3], ['sealed', 2]]); }
      else addDoor(sec, a, b, run, 'join', run.length, null);
      doorBetween.add(key(a, b));
    }
    // room doors: to the parent in its suite, and to the best corridor it touches (private rooms keep to their suite)
    for (const r of sec.rooms) {
      if (!r.cells.length || r.kind !== 'room') continue;
      const corrs = (byRoom.get(r.id) || []).filter(([o]) => isCorr(o));
      let parentDoor = false;
      if (r.parent != null && sec.rooms[r.parent].cells.length) { const e = edgesBetween(r.id, r.parent); if (e) { addDoor(sec, r.id, r.parent, longestRun(e)[0], 'door', 1, rng); doorBetween.add(key(r.id, r.parent)); parentDoor = true; } }
      if (!corrs.length) continue;
      if (parentDoor && PRIVATE.has(r.type)) continue;
      if (parentDoor && r.type !== 'void' && rng.chance(0.45)) continue;
      corrs.sort((p, q) => corrRank(sec.rooms[p[0]]) - corrRank(sec.rooms[q[0]]) || longestRun(q[1])[0].length - longestRun(p[1])[0].length);
      const [o, edges] = corrs[0];
      const run = longestRun(edges)[0];
      const wide = WIDE.has(r.type) && run.length >= 3;
      addDoor(sec, r.id, o, run, wide ? 'cargo' : 'door', wide ? 2 : 1, rng);
      doorBetween.add(key(r.id, o));
      if (r.cells.length >= 40 && corrs.length > 1 && rng.chance(0.7)) { const [o2, e2] = corrs[1]; addDoor(sec, r.id, o2, longestRun(e2)[0], 'door', 1, rng); doorBetween.add(key(r.id, o2)); }
    }
    // reachability: patch unreachable rooms through public neighbours first
    // the hull may split this sector into islands (a waist, a bite); each island is walked from its own start
    const islands = components([...sec.hull].map(unK), sec.hull);
    const islandOf = new Map(); islands.forEach((cells, i) => { for (const [x, y] of cells) islandOf.set(K(x, y), i); });
    const starts = islands.map(cells => { let best = -1; for (const [x, y] of cells) { const id = sec.owner[y][x]; if (id >= 0 && sec.rooms[id].kind === 'corridor') { best = id; break; } if (best < 0 && id >= 0) best = id; } return best; }).filter(i => i >= 0);
    sec.islands = islands.length;
    const reach = () => {
      const seen = new Set();
      const start = starts.slice();
      const q = start.slice(); start.forEach(s => seen.add(s));
      while (q.length) {
        const cur = q.pop();
        for (const dr of sec.doors) { if (dr.b < 0) continue; const o = dr.a === cur ? dr.b : dr.b === cur ? dr.a : -1; if (o >= 0 && !seen.has(o)) { seen.add(o); q.push(o); } }
        if (isCorr(cur)) for (const [o] of (byRoom.get(cur) || [])) if (isCorr(o) && !seen.has(o)) { seen.add(o); q.push(o); }
      }
      return seen;
    };
    for (let iter = 0; iter < 400; iter++) {
      const seen = reach();
      const missing = sec.rooms.filter(r => r.cells.length && !seen.has(r.id));
      if (!missing.length) break;
      let patched = false;
      for (const r of missing) {
        const nbs = (byRoom.get(r.id) || []).filter(([o]) => seen.has(o) && sec.rooms[o].cells.length);
        if (!nbs.length) continue;
        const score = ([o, e]) => { const ro = sec.rooms[o]; return (isCorr(o) ? 0 : PRIVATE.has(ro.type) ? 40 : ro.zone === r.zone ? 10 : 20) - Math.min(9, longestRun(e)[0].length); };
        nbs.sort((p, q) => score(p) - score(q));
        const [o, edges] = nbs[0];
        addDoor(sec, r.id, o, longestRun(edges)[0], 'door', 1, rng); doorBetween.add(key(r.id, o));
        patched = true; break;
      }
      if (!patched) break;
    }
    // loops between compatible public rooms, and the odd maintenance hatch
    for (const [a, b, edges] of adj) {
      const ra = sec.rooms[a], rb = sec.rooms[b];
      if (ra.kind !== 'room' || rb.kind !== 'room' || !ra.cells.length || !rb.cells.length) continue;
      if (doorBetween.has(key(a, b)) || PRIVATE.has(ra.type) || PRIVATE.has(rb.type)) continue;
      const run = longestRun(edges)[0]; if (run.length < 2) continue;
      const same = ra.suite != null && ra.suite === rb.suite;
      if (rng.chance(same ? 0.3 : ra.zone === rb.zone ? 0.12 : 0.03)) { addDoor(sec, a, b, run, 'door', 1, rng); doorBetween.add(key(a, b)); }
      else if (rng.chance(0.03)) { addDoor(sec, a, b, run, 'hatch', 1, rng); doorBetween.add(key(a, b)); }
    }
    // airlocks open onto space
    for (const r of sec.rooms) {
      if (r.type !== 'airlock' || !r.cells.length) continue;
      const runs = longestRun(r.spaceEdges || []);
      if (runs.length && runs[0]) addDoor(sec, r.id, -1, runs[0], 'airlock', 1, null);
    }
    // locks and damage
    for (const dr of sec.doors) {
      if (dr.state || dr.kind === 'join' || dr.kind === 'exit' || dr.b < 0) continue;
      const ra = sec.rooms[dr.a], rb = sec.rooms[dr.b];
      if (ra.type === 'void' || rb.type === 'void') { dr.state = 'open'; continue; }
      const sealP = ship.condition === 'derelict' ? 0.1 : 0.07, openP = ship.condition === 'derelict' ? 0.3 : ship.condition === 'rundown' ? 0.12 : 0;
      if (rng.chance(sealP) && !(ra.type === 'lift' || rb.type === 'lift')) dr.state = 'sealed';
      else if (rng.chance(openP)) dr.state = rng.chance(0.6) ? 'open' : 'jammed';
    }
  }

  function numberRooms(sec) {
    const rooms = sec.rooms.filter(r => r.cells.length && r.kind === 'room').sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
    rooms.forEach((r, i) => { r.number = i + 1; });
  }

  DP.buildSector = buildSector;
  DP._layout = { adjacency, longestRun, doorCells, components, K, unK };
})();
