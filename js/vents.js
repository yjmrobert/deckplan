// The vent layer: a maze of one-square crawlways running above every deck. Grilles drop into the rooms below,
// shafts climb two or three decks, and crossings carry the maze into the next sector. It is drawn and printed as
// its own map, the same size as the deck, so a party can crawl the ducts on the table.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const K = (x, y) => x + ',' + y;
  const unK = (k) => k.split(',').map(Number);
  const lastOdd = (n) => (n % 2 === 1 ? n : n - 1);
  const key = (d, f, l) => d + '/' + f + '/' + l;

  // Crawlways run on a lattice: nodes on odd squares, one connector square between neighbouring nodes.
  // The squares a border crossing occupies on one side: the node nearest the edge and the connectors out to it.
  DP.ventCrossingCells = function (W, H, side, t) {
    if (side === 'N') return [[t, 1], [t, 0]];
    if (side === 'W') return [[1, t], [0, t]];
    if (side === 'S') { const y = lastOdd(H - 1); const c = [[t, y]]; for (let yy = y + 1; yy <= H - 1; yy++) c.push([t, yy]); return c; }
    const x = lastOdd(W - 1); const c = [[x, t]]; for (let xx = x + 1; xx <= W - 1; xx++) c.push([xx, t]); return c;
  };

  // ---- ship plan: shafts per column, crossings per border -------------------------------------------
  DP.shipVents = function (ship) {
    if (ship.vents) return ship.vents;
    const W = ship.W, H = ship.H;
    const push = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };
    const ok = (d, f, l, x, y) => DP.sectorExists(ship, d, f, l) && DP.hullKind(ship, d, l * W + x, f * H + y) === 1 && !DP.sectorHull(ship, d, f, l).cuts.has(K(x, y));
    const shafts = new Map(), crossings = new Map();
    const oddIn = (g, lo, hi) => { lo = lo % 2 ? lo : lo + 1; hi = hi % 2 ? hi : hi - 1; return lo + 2 * g.int(0, (hi - lo) >> 1); };
    for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) {
      const g = DP.makeRng(`${ship.seed}/vents/${f}/${l}`);
      // a chain of shafts down the column, each two or three decks tall, handing over on a shared deck
      let d0 = 0;
      while (d0 < ship.D - 1) {
        let placed = null;
        for (const len of [g.int(2, 3), 2]) {
          const d1 = Math.min(ship.D - 1, d0 + len - 1);
          if (d1 <= d0) break;
          for (let i = 0; i < 24 && !placed; i++) {
            const x = oddIn(g, 1, W - 2), y = oddIn(g, 1, H - 2);
            let good = true; for (let d = d0; d <= d1 && good; d++) if (!ok(d, f, l, x, y)) good = false;
            if (good) placed = { x, y, d0, d1 };
          }
          if (placed) break;
        }
        if (!placed) { d0++; continue; }
        for (let d = placed.d0; d <= placed.d1; d++) push(shafts, key(d, f, l), placed);
        d0 = placed.d1;
      }
      // the odd extra shaft, for a second way between a pair of decks
      if (ship.D > 2 && g.chance(0.5)) {
        const a = g.int(0, ship.D - 2), b = a + 1;
        for (let i = 0; i < 12; i++) { const x = oddIn(g, 1, W - 2), y = oddIn(g, 1, H - 2); if (ok(a, f, l, x, y) && ok(b, f, l, x, y) && !(shafts.get(key(a, f, l)) || []).some(s => s.x === x && s.y === y)) { const s = { x, y, d0: a, d1: b }; push(shafts, key(a, f, l), s); push(shafts, key(b, f, l), s); break; } }
      }
    }
    // crossings: aft (S) into the next frame, starboard (E) into the next lateral
    for (let d = 0; d < ship.D; d++) for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) {
      if (!DP.sectorExists(ship, d, f, l)) continue;
      const g = DP.makeRng(`${ship.seed}/ventx/${d}/${f}/${l}`);
      const tryCross = (side, opp, f2, l2, lo, hi) => {
        if (!DP.sectorExists(ship, d, f2, l2) || !g.chance(0.65)) return;
        for (let i = 0; i < 10; i++) {
          const t = oddIn(g, lo, hi);
          if (DP.ventCrossingCells(W, H, side, t).every(([x, y]) => ok(d, f, l, x, y)) && DP.ventCrossingCells(W, H, opp, t).every(([x, y]) => ok(d, f2, l2, x, y))) { push(crossings, key(d, f, l), { side, t }); push(crossings, key(d, f2, l2), { side: opp, t }); return; }
        }
      };
      tryCross('S', 'N', f + 1, l, 1, W - 2);
      tryCross('E', 'W', f, l + 1, 1, H - 2);
    }
    ship.vents = { shafts, crossings };
    return ship.vents;
  };

  // ---- one sector's maze -----------------------------------------------------------------------------
  DP.buildVents = function (ship, sec, rng) {
    const W = sec.W, H = sec.H, d = sec.d, f = sec.f, l = sec.l;
    const sv = DP.shipVents(ship);
    const open = (x, y) => sec.hull.has(K(x, y)) && !sec.cuts.has(K(x, y));
    const isNode = (x, y) => x % 2 === 1 && y % 2 === 1 && open(x, y);
    const nodeSet = new Set();
    for (let y = 1; y < H; y += 2) for (let x = 1; x < W; x += 2) if (isNode(x, y)) nodeSet.add(K(x, y));
    const nbrs = (x, y) => [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nodeSet.has(K(nx, ny)) && open((x + nx) / 2, (y + ny) / 2));
    const liveOpen = (dd, ff, ll, x, y) => DP.liveAt(ship, dd, ff, ll, x, y) && !DP.sectorHull(ship, dd, ff, ll).cuts.has(K(x, y));

    // ports: shafts, crossings, grilles
    const ports = [];
    for (const s of sv.shafts.get(key(d, f, l)) || []) {
      if (!nodeSet.has(K(s.x, s.y))) continue;
      const up = d > s.d0 && liveOpen(d - 1, f, l, s.x, s.y), down = d < s.d1 && liveOpen(d + 1, f, l, s.x, s.y);
      if (up || down) ports.push({ kind: 'shaft', x: s.x, y: s.y, up, down, d0: s.d0, d1: s.d1 });
    }
    for (const c of sv.crossings.get(key(d, f, l)) || []) {
      const cells = DP.ventCrossingCells(W, H, c.side, c.t);
      if (!cells.every(([x, y]) => open(x, y))) continue;
      const nf = c.side === 'N' ? f - 1 : c.side === 'S' ? f + 1 : f, nl = c.side === 'W' ? l - 1 : c.side === 'E' ? l + 1 : l;
      const opp = { N: 'S', S: 'N', W: 'E', E: 'W' }[c.side];
      if (!DP.ventCrossingCells(W, H, opp, c.t).every(([x, y]) => liveOpen(d, nf, nl, x, y))) continue;
      ports.push({ kind: 'cross', side: c.side, t: c.t, x: cells[0][0], y: cells[0][1], cells, to: DP.sectorLabel(ship, d, nf, nl) });
    }
    const occ = sec.occ || new Set();
    const free = (x, y) => !occ.has(K(x, y)) && !sec.reserved.has(K(x, y)) && !sec.pinned.has(K(x, y)) && !sec.slots.has(K(x, y));
    const grilleCands = (r) => {
      const c = r.cells.filter(([x, y]) => nodeSet.has(K(x, y)) && free(x, y));
      const byWall = (x, y) => (r.set.has(K(x - 1, y)) && r.set.has(K(x + 1, y)) && r.set.has(K(x, y - 1)) && r.set.has(K(x, y + 1))) ? 1 : 0;
      return rng.shuffle(c).sort((a, b) => byWall(a[0], a[1]) - byWall(b[0], b[1]));
    };
    const eligible = sec.rooms.filter(r => r.cells.length && r.kind !== 'structure' && r.type !== 'lift' && r.type !== 'void' && r.type !== 'airlock' && (r.kind === 'room' ? r.cells.length >= 6 : r.cells.length >= 12));
    const grilles = [];
    const addGrille = (r) => { const c = grilleCands(r); if (!c.length) return false; const [x, y] = c[0]; occ.add(K(x, y)); sec.props.push({ t: 'grille', x, y, w: 1, h: 1, rot: 0, room: r.id }); r.grille = true; const p = { kind: 'grille', x, y, room: r.id }; ports.push(p); grilles.push(p); return true; };
    for (const r of eligible) {
      const p = r.type === 'vents' || r.type === 'life' ? 1 : r.kind === 'corridor' ? 0.2 : r.cells.length >= 40 ? 0.55 : 0.4;
      if (rng.chance(p)) addGrille(r);
    }
    if (grilles.length < 2) for (const r of eligible.filter(r => !r.grille).sort((a, b) => b.cells.length - a.cells.length)) { if (grilles.length >= 2) break; addGrille(r); }

    // a maze over the lattice: randomised depth-first spanning forest, ports visited first
    const inMaze = new Set(), links = new Set();   // links: connector squares that are open
    const starts = rng.shuffle(ports.map(p => K(p.x, p.y))).concat(rng.shuffle([...nodeSet]));
    for (const s of starts) {
      if (inMaze.has(s) || !nodeSet.has(s)) continue;
      const stack = [unK(s)]; inMaze.add(s);
      while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const next = rng.shuffle(nbrs(x, y).filter(([nx, ny]) => !inMaze.has(K(nx, ny))));
        if (!next.length) { stack.pop(); continue; }
        const [nx, ny] = next[0]; inMaze.add(K(nx, ny)); links.add(K((x + nx) / 2, (y + ny) / 2)); stack.push([nx, ny]);
      }
    }
    const portSet = new Set(ports.map(p => K(p.x, p.y)));
    const degree = (k) => { const [x, y] = unK(k); return nbrs(x, y).filter(([nx, ny]) => inMaze.has(K(nx, ny)) && links.has(K((x + nx) / 2, (y + ny) / 2))).length; };
    const dropLeaf = (k) => { const [x, y] = unK(k); for (const [nx, ny] of nbrs(x, y)) links.delete(K((x + nx) / 2, (y + ny) / 2)); inMaze.delete(k); };
    // the required part is what is left when every non-port dead end is pared away; the rest is optional branches
    const required = new Set(inMaze), reqLinks = new Set(links);
    {
      const deg = (k) => { const [x, y] = unK(k); return nbrs(x, y).filter(([nx, ny]) => required.has(K(nx, ny)) && reqLinks.has(K((x + nx) / 2, (y + ny) / 2))).length; };
      let again = true;
      while (again) { again = false; for (const k of [...required]) if (!portSet.has(k) && deg(k) <= 1) { const [x, y] = unK(k); for (const [nx, ny] of nbrs(x, y)) reqLinks.delete(K((x + nx) / 2, (y + ny) / 2)); required.delete(k); again = true; } }
    }
    // prune optional dead ends at random until the maze is about half the lattice
    const target = Math.max(required.size, Math.round(nodeSet.size * 0.48));
    for (let round = 0; round < 60 && inMaze.size > target; round++) {
      const leaves = rng.shuffle([...inMaze].filter(k => !required.has(k) && degree(k) <= 1));
      if (!leaves.length) break;
      for (const k of leaves) { if (inMaze.size <= target) break; if (rng.chance(0.7)) dropLeaf(k); }
    }
    // a few loops, so the ducts are not a pure tree
    for (const k of inMaze) { const [x, y] = unK(k); for (const [nx, ny] of [[x + 2, y], [x, y + 2]]) { const ck = K((x + nx) / 2, (y + ny) / 2); if (inMaze.has(K(nx, ny)) && !links.has(ck) && open((x + nx) / 2, (y + ny) / 2) && rng.chance(0.07)) links.add(ck); } }
    // isolated grilles are not worth a grate
    for (let i = ports.length - 1; i >= 0; i--) { const p = ports[i]; if (p.kind === 'grille' && degree(K(p.x, p.y)) === 0) { ports.splice(i, 1); grilles.splice(grilles.indexOf(p), 1); inMaze.delete(K(p.x, p.y)); const pi = sec.props.findIndex(q => q.t === 'grille' && q.x === p.x && q.y === p.y); if (pi >= 0) sec.props.splice(pi, 1); occ.delete(K(p.x, p.y)); sec.rooms[p.room].grille = false; } }

    const cells = new Set([...inMaze, ...links]);
    for (const p of ports) if (p.kind === 'cross') for (const [x, y] of p.cells) cells.add(K(x, y));
    // crawl distances between ports, for the key
    const portAt = new Map(ports.map(p => [K(p.x, p.y), p]));
    for (const p of ports) {
      const dist = new Map([[K(p.x, p.y), 0]]); const q = [[p.x, p.y]]; p.links = [];
      while (q.length) { const [x, y] = q.shift(); const dd = dist.get(K(x, y)); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = K(x + dx, y + dy); if (cells.has(nk) && !dist.has(nk)) { dist.set(nk, dd + 1); q.push([x + dx, y + dy]); } } }
      for (const [k, o] of portAt) if (o !== p && dist.has(k)) p.links.push({ to: o, dist: dist.get(k) });
      p.links.sort((a, b) => a.dist - b.dist);
    }
    sec.vents = { cells, nodes: inMaze, ports, grilles, shafts: ports.filter(p => p.kind === 'shaft'), crossings: ports.filter(p => p.kind === 'cross') };
    return sec.vents;
  };

  DP.ventPortName = function (sec, p) {
    if (p.kind === 'grille') { const r = sec.rooms[p.room]; return r.kind === 'corridor' ? 'grille in the ' + r.name.toLowerCase() : 'grille in room ' + r.number; }
    if (p.kind === 'shaft') return 'shaft ' + [p.up ? 'up to deck ' + sec.d : '', p.down ? 'down to deck ' + (sec.d + 2) : ''].filter(Boolean).join(' and ');
    return 'crossing to ' + p.to;
  };
})();
