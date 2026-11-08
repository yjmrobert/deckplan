// Ship-scale geometry and plan: the hull silhouette per deck, which sectors exist, the corridor network
// that crosses sector borders, and the zone each region of the ship is given.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Per-class silhouette parameters (fractions of the deck's half-width unless noted).
  const SHAPE = {
    W: { lens: 0.38, nose: 0.08, twoStage: 0.8, neck: 0.2, waist: 0.5, aftIn: 0.28, engine: [12, 22], prowSetback: 0.6 },
    T: { lens: 0.2,  nose: 0.4,  twoStage: 0.2, neck: 0.12, waist: 0.2, aftIn: 0.15, engine: [10, 16], prowSetback: 0.4 },
    L: { lens: 0.42, nose: 0.1,  twoStage: 0.7, neck: 0.18, waist: 0.6, aftIn: 0.3,  engine: [10, 18], prowSetback: 0.8 },
    R: { lens: 0.35, nose: 0.18, twoStage: 0.4, neck: 0.25, waist: 0.3, aftIn: 0.3,  engine: [8, 14],  prowSetback: 0.6 },
    P: { lens: 0.22, nose: 0.45, twoStage: 0.1, neck: 0.1,  waist: 0.1, aftIn: 0.12, engine: [10, 16], prowSetback: 0.3 },
    K: { lens: 0.3,  nose: 0.2,  twoStage: 0.5, neck: 0.2,  waist: 0.5, aftIn: 0.2,  engine: [8, 20],  prowSetback: 0.5 },
    C: { lens: 0.25, nose: 0.35, twoStage: 0,   neck: 0,    waist: 0,   aftIn: 0.2,  engine: [5, 9],   prowSetback: 0.4 },
    G: { lens: 0.3,  nose: 0.25, twoStage: 0.3, neck: 0.15, waist: 0.2, aftIn: 0.25, engine: [6, 10],  prowSetback: 0.5 },
    M: { lens: 0.15, nose: 0.5,  twoStage: 0,   neck: 0,    waist: 0.5, aftIn: 0.1,  engine: [8, 12],  prowSetback: 0.2 },
    F: { lens: 0.2,  nose: 0.4,  twoStage: 0,   neck: 0,    waist: 0.1, aftIn: 0.15, engine: [6, 10],  prowSetback: 0.3 },
    E: { lens: 0.35, nose: 0.15, twoStage: 0.6, neck: 0.2,  waist: 0.3, aftIn: 0.3,  engine: [8, 14],  prowSetback: 0.6 },
  };

  function profile(ship, d, side, params, rng) {
    const { TL, fullHalf } = ship.geo;
    const D = ship.D;
    const t = D > 1 ? (2 * d / (D - 1) - 1) : 0;
    const inset = Math.round(fullHalf * params.lens * t * t);
    const fh = fullHalf - inset;
    const y0 = Math.round(inset * params.prowSetback), yEnd = TL - Math.round(inset * 0.35);
    const noseHalf = Math.max(2, Math.round(fh * params.noseFrac));
    const shoulder = params.twoStage ? Math.max(noseHalf + 4, fh - Math.round(fh * params.neck)) : fh;
    const engineHalf = Math.max(noseHalf, fh - Math.round(fh * params.aftInFrac));
    const half = new Int16Array(TL);
    for (let Y = y0; Y < yEnd; Y++) {
      const u = Y - y0;
      let h = noseHalf + u;                                        // 45 degree prow
      if (params.twoStage && h > shoulder) { const past = u - (shoulder - noseHalf); h = past < params.neckLen ? shoulder : shoulder + (past - params.neckLen); }
      h = Math.min(h, fh);
      const fromEnd = yEnd - 1 - Y;                                 // 45 degree stern then the engine block
      h = Math.min(h, fromEnd < params.engineLen ? engineHalf : engineHalf + (fromEnd - params.engineLen));
      if (params.waist) { const dy = Y - params.waistY; if (dy >= 0 && dy < params.waistLen) h = Math.min(h, fh - Math.min(params.waistDepth, dy, params.waistLen - 1 - dy)); }
      for (const b of params.bites[side] || []) { const dy = Y - b.y; if (dy >= 0 && dy < b.len) h = Math.min(h, fh - Math.min(b.depth, dy, b.len - 1 - dy)); }
      half[Y] = clamp(h, 1, fh);
    }
    return half;
  }

  // hull extent of a row in ship squares: [xL, xR)
  const xL = (g, d, Y) => Math.ceil(g.XC - g.halfL[d][Y]);
  const xR = (g, d, Y) => Math.floor(g.XC + g.halfR[d][Y]);
  DP.shipGeometry = function (ship) {
    if (ship.geo) return ship.geo;
    const TW = ship.Lat * ship.W, TL = ship.F * ship.H;
    const geo = ship.geo = { TW, TL, XC: TW / 2, fullHalf: TW / 2, halfL: [], halfR: [], count: [] };
    const rng = DP.makeRng(ship.seed + '/hull');
    const S = SHAPE[ship.cls] || SHAPE.W;
    const mk = () => ({ lens: S.lens, noseFrac: S.nose * (0.8 + rng.next() * 0.5), twoStage: rng.chance(S.twoStage), neck: S.neck, neckLen: rng.int(10, 28), aftInFrac: S.aftIn * (0.8 + rng.next() * 0.5), engineLen: rng.int(S.engine[0], S.engine[1]), prowSetback: S.prowSetback,
      waist: rng.chance(S.waist), waistDepth: rng.int(5, 12), waistY: Math.round(TL * (0.42 + rng.next() * 0.2)), waistLen: rng.int(14, 30), bites: {} });
    const pL = mk();
    const pR = ship.cls === 'K' ? mk() : pL;
    if (ship.cls === 'K') for (const side of ['L', 'R']) { const p = side === 'L' ? pL : pR; p.bites[side] = []; for (let i = rng.int(1, 3); i > 0; i--) p.bites[side].push({ y: rng.int(20, TL - 40), len: rng.int(8, 24), depth: rng.int(4, 14) }); }
    for (let d = 0; d < ship.D; d++) { geo.halfL.push(profile(ship, d, 'L', pL, rng)); geo.halfR.push(profile(ship, d, 'R', pR, rng)); }
    // damage volumes: craters that taper through the decks, sheared slabs, whole collapsed sections
    geo.voids = [];
    if (ship.condition === 'derelict') {
      const v = DP.makeRng(ship.seed + '/voids');
      const hulk = ship.cls === 'K';
      const n = hulk ? v.int(6, 10) : v.int(1, 3);
      for (let i = 0; i < n; i++) {
        const kind = hulk ? v.weighted([['crater', 4], ['slab', 3], ['section', 5]]) : 'crater';
        const dc = v.int(0, ship.D - 1), Y = v.int(Math.round(TL * 0.08), Math.round(TL * 0.92));
        if (kind === 'crater') geo.voids.push({ kind, X: v.int(Math.round(TW * 0.15), Math.round(TW * 0.85)), Y, dc, rx: v.int(hulk ? 9 : 6, hulk ? 22 : 12), ry: v.int(hulk ? 10 : 7, hulk ? 30 : 14), depth: v.int(1, hulk ? 3 : 2) });
        else if (kind === 'slab') { const side = v.chance(0.5) ? 'L' : 'R'; const d0 = v.int(0, ship.D - 2); geo.voids.push({ kind, side, Y, len: v.int(16, 44), depth: v.int(10, 30), d0, d1: Math.min(ship.D - 1, d0 + v.int(1, 3)) }); }
        else { const f = v.int(1, ship.F - 2), l = v.int(0, ship.Lat - 1); const d0 = v.int(0, ship.D - 2); geo.voids.push({ kind, X0: l * ship.W + v.int(-4, 4), Y0: f * ship.H + v.int(-6, 6), w: ship.W + v.int(-6, 10), h: ship.H + v.int(-8, 12), d0, d1: Math.min(ship.D - 1, d0 + v.int(1, 3)) }); }
      }
    }
    for (let d = 0; d < ship.D; d++) {
      const cnt = [];
      for (let f = 0; f < ship.F; f++) { const row = []; for (let l = 0; l < ship.Lat; l++) { let n = 0; for (let Y = f * ship.H; Y < (f + 1) * ship.H; Y++) { const a = Math.max(l * ship.W, xL(geo, d, Y)), b = Math.min((l + 1) * ship.W, xR(geo, d, Y)); if (geo.halfL[d][Y] > 0) for (let X = a; X < b; X++) if (!inVoid(geo, d, X, Y)) n++; } row.push(n); } cnt.push(row); }
      geo.count.push(cnt);
    }
    return geo;
  };
  function inVoid(geo, d, X, Y) {
    for (const v of geo.voids) {
      if (v.kind === 'crater') { const dd = Math.abs(d - v.dc); if (dd > v.depth) continue; const k = 1 - dd / (v.depth + 1); const ex = (X - v.X) / (v.rx * k), ey = (Y - v.Y) / (v.ry * k); if (ex * ex + ey * ey <= 1) return true; }
      else if (v.kind === 'slab') { if (d < v.d0 || d > v.d1 || Y < v.Y || Y >= v.Y + v.len) continue; const edge = v.side === 'L' ? xL(geo, d, Y) : xR(geo, d, Y) - 1; const ramp = Math.min(Y - v.Y, v.Y + v.len - 1 - Y, v.depth); if (v.side === 'L' ? X < edge + ramp : X > edge - ramp) return true; }
      else if (v.kind === 'section') { if (d >= v.d0 && d <= v.d1 && X >= v.X0 && X < v.X0 + v.w && Y >= v.Y0 && Y < v.Y0 + v.h) return true; }
    }
    return false;
  }
  // 0 = beyond the hull, 1 = hull, 2 = torn away by damage
  DP.hullKind = function (ship, d, X, Y) {
    const g = DP.shipGeometry(ship);
    if (d < 0 || d >= ship.D || Y < 0 || Y >= g.TL || X < 0 || X >= g.TW) return 0;
    if (g.halfL[d][Y] <= 0 || X < xL(g, d, Y) || X >= xR(g, d, Y)) return 0;
    return inVoid(g, d, X, Y) ? 2 : 1;
  };
  DP.inHull = function (ship, d, X, Y) { return DP.hullKind(ship, d, X, Y) === 1; };
  DP.sectorExists = function (ship, d, f, l) {
    if (d < 0 || d >= ship.D || f < 0 || f >= ship.F || l < 0 || l >= ship.Lat) return false;
    const g = DP.shipGeometry(ship);
    return g.count[d][f][l] >= 0.2 * ship.W * ship.H;
  };
  // Hull squares of one sector, their chamfers and their islands (regions not joined within the sector). Cached.
  DP.sectorHull = function (ship, d, f, l) {
    ship._hullCache = ship._hullCache || new Map();
    const key = d + '/' + f + '/' + l;
    if (ship._hullCache.has(key)) return ship._hullCache.get(key);
    const W = ship.W, H = ship.H, ox = l * W, oy = f * H;
    const hull = new Set(), cuts = new Map();
    const K = (x, y) => x + ',' + y;
    const at = (x, y) => DP.hullKind(ship, d, ox + x, oy + y) === 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y)) hull.add(K(x, y));
    for (const k of hull) {
      const [x, y] = k.split(',').map(Number);
      const n = at(x, y - 1), s2 = at(x, y + 1), w = at(x - 1, y), e = at(x + 1, y);
      const missing = (!n) + (!s2) + (!w) + (!e);
      if (missing !== 2) continue;
      if (!n && !w) cuts.set(k, 'NW'); else if (!n && !e) cuts.set(k, 'NE'); else if (!s2 && !w) cuts.set(k, 'SW'); else if (!s2 && !e) cuts.set(k, 'SE');
    }
    // islands
    const islandOf = new Map(), islands = [];
    for (const k of hull) {
      if (islandOf.has(k)) continue;
      const id = islands.length, cells = []; const q = [k]; islandOf.set(k, id);
      while (q.length) { const c = q.pop(); cells.push(c); const [x, y] = c.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = K(x + dx, y + dy); if (hull.has(nk) && !islandOf.has(nk)) { islandOf.set(nk, id); q.push(nk); } } }
      islands.push(cells);
    }
    // scraps too small to stand on are gone
    for (let i = islands.length - 1; i >= 0; i--) if (islands[i].length < 6) { for (const k of islands[i]) { hull.delete(k); cuts.delete(k); islandOf.delete(k); } islands.splice(i, 1); }
    islands.forEach((cells, i) => { for (const k of cells) islandOf.set(k, i); });
    const out = { hull, cuts, islands, islandOf };
    ship._hullCache.set(key, out);
    return out;
  };
  // is this square standing floor: hull, on an island that survived the walkability proof
  DP.liveAt = function (ship, d, f, l, x, y) {
    if (!DP.sectorExists(ship, d, f, l)) return false;
    const sh = DP.sectorHull(ship, d, f, l); const i = sh.islandOf.get(x + ',' + y);
    return i != null && !DP.shipConnections(ship).dead.has(d + '/' + f + '/' + l + '#' + i);
  };
  // a sector with floor left in it once dead islands are removed
  DP.sectorLive = function (ship, d, f, l) {
    if (!DP.sectorExists(ship, d, f, l)) return false;
    const conn = DP.shipConnections(ship); const sh = DP.sectorHull(ship, d, f, l);
    return sh.islands.some((_, i) => !conn.dead.has(d + '/' + f + '/' + l + '#' + i));
  };

  // ---- corridor network shared across sectors --------------------------------------
  // cross[f]: cross-passage rows (local y, width 2) for every frame; spine[l][f]: thoroughfare local x at the
  // border between frames f-1 and f (index F is the stern end); spineW[l]: its width.
  DP.shipNet = function (ship) {
    if (ship.net) return ship.net;
    const H = ship.H, W = ship.W, mid = Math.floor(ship.Lat / 2);
    const cross = [];
    for (let f = 0; f < ship.F; f++) {
      const r = DP.makeRng(ship.seed + '/cross/' + f);
      const n = f === 0 ? 1 : r.weighted([[0, 1], [1, 5], [2, 3]]);
      const ys = [];
      for (let i = 0; i < 30 && ys.length < n; i++) { const y = r.int(6, H - 9); if (ys.every(o => Math.abs(o - y) >= 10)) ys.push(y); }
      cross.push(ys.sort((a, b) => a - b));
    }
    const spine = [], spineW = [];
    for (let l = 0; l < ship.Lat; l++) {
      const w = l === mid ? ((ship.cls === 'L' || ship.cls === 'W') ? 3 : 2) : 2;
      spineW.push(w);
      const r = DP.makeRng(ship.seed + '/spine/' + l);
      const pos = () => r.int(Math.floor(W / 2) - 5, Math.floor(W / 2) + 5 - w);
      const arr = [pos()];
      for (let f = 0; f < ship.F; f++) arr.push(cross[f].length && r.chance(0.55) ? pos() : arr[f]);
      spine.push(arr);
    }
    ship.net = { cross, spine, spineW };
    return ship.net;
  };
  // row bands between cross passages, and where the thoroughfare jogs, for one column of sectors
  DP.sectorBands = function (ship, f, l) {
    const net = DP.shipNet(ship), crosses = net.cross[f];
    const bands = []; let y = 0;
    for (const cy of crosses) { bands.push([y, cy]); y = cy + 2; }
    bands.push([y, ship.H]);
    const jogAt = crosses.length ? DP.makeRng(ship.seed + '/jog/' + f + '/' + l).int(0, crosses.length - 1) : -1;
    const spineX = (bi) => (jogAt >= 0 && bi > jogAt) ? net.spine[l][f + 1] : net.spine[l][f];
    return { bands, jogAt, spineX, crosses, sw: net.spineW[l] };
  };
  const crossRow = (ship, f, y) => DP.shipNet(ship).cross[f].some(cy => y === cy || y === cy + 1);

  // ---- connections: exits, lifts, ladders, and the repairs that keep the whole ship walkable -----------
  DP.shipConnections = function (ship) {
    if (ship.conn) return ship.conn;
    const W = ship.W, H = ship.H, net = DP.shipNet(ship);
    const key = (d, f, l) => d + '/' + f + '/' + l;
    const exists = (d, f, l) => DP.sectorExists(ship, d, f, l);
    const hullAt = (d, f, l, x, y) => DP.hullKind(ship, d, l * W + x, f * H + y) === 1;
    const conn = { exits: new Map(), ladders: new Map(), lifts: new Map() };
    const push = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };
    // exits from the shared network
    for (let d = 0; d < ship.D; d++) for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) {
      if (!exists(d, f, l)) continue;
      const sxN = net.spine[l][f], sxS = net.spine[l][f + 1], sw = net.spineW[l];
      const span = (ff, x0, w, yy) => { for (let x = x0; x < x0 + w; x++) if (!hullAt(d, ff, l, x, yy)) return false; return true; };
      if (f > 0 && exists(d, f - 1, l) && span(f, sxN, sw, 0) && span(f - 1, sxN, sw, H - 1)) push(conn.exits, key(d, f, l), { side: 'N', t: sxN, w: sw, kind: 'spine' });
      if (f < ship.F - 1 && exists(d, f + 1, l) && span(f, sxS, sw, H - 1) && span(f + 1, sxS, sw, 0)) push(conn.exits, key(d, f, l), { side: 'S', t: sxS, w: sw, kind: 'spine' });
      for (const cy of net.cross[f]) {
        if (l > 0 && exists(d, f, l - 1) && hullAt(d, f, l, 0, cy) && hullAt(d, f, l, 0, cy + 1) && hullAt(d, f, l - 1, W - 1, cy) && hullAt(d, f, l - 1, W - 1, cy + 1)) push(conn.exits, key(d, f, l), { side: 'W', t: cy, w: 2, kind: 'cross' });
        if (l < ship.Lat - 1 && exists(d, f, l + 1) && hullAt(d, f, l, W - 1, cy) && hullAt(d, f, l, W - 1, cy + 1) && hullAt(d, f, l + 1, 0, cy) && hullAt(d, f, l + 1, 0, cy + 1)) push(conn.exits, key(d, f, l), { side: 'E', t: cy, w: 2, kind: 'cross' });
      }
    }
    // lift shaft per column: beside the thoroughfare, wherever it survives on the most decks
    for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) {
      const { bands, spineX, sw } = DP.sectorBands(ship, f, l);
      const g = DP.makeRng(`${ship.seed}/lift/${f}/${l}`);
      let best = null;
      for (let k = 0; k < 24; k++) {
        const ly = g.int(3, H - 5); const bi = bands.findIndex(([a, b]) => ly >= a && ly + 1 < b); if (bi < 0) continue;
        const sx = spineX(bi); const side = g.chance(0.5) ? -1 : 1; const lx = side < 0 ? sx - 2 : sx + sw;
        if (lx < 0 || lx + 1 >= W) continue;
        const cells = [[lx, ly], [lx + 1, ly], [lx, ly + 1], [lx + 1, ly + 1]];
        const decks = []; for (let d = 0; d < ship.D; d++) if (exists(d, f, l) && cells.every(([x, y]) => hullAt(d, f, l, x, y))) decks.push(d);
        if (decks.length >= 2 && (!best || decks.length > best.decks.length)) best = { cells, decks };
        if (best && best.decks.length === ship.D) break;
      }
      if (best) conn.lifts.set(f + '/' + l, best);
    }
    // ladders between neighbouring decks, hashed per pair. They stand in the thoroughfare, which runs at the same
    // squares on every deck of a column, so the two ends always line up; the squares are pinned in the sector build.
    for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) for (let d = 0; d < ship.D - 1; d++) {
      if (!exists(d, f, l) || !exists(d + 1, f, l)) continue;
      const g = DP.makeRng(`${ship.seed}/ladder/${f}/${l}/${d}`);
      const { bands, spineX, sw, crosses } = DP.sectorBands(ship, f, l);
      const nearCross = (y) => crosses.some(cy => y >= cy - 1 && y <= cy + 2);
      const n = g.int(1, 2); let placed = 0;
      for (let i = 0; i < 16 && placed < n; i++) {
        const y = g.int(2, H - 3); if (nearCross(y)) continue;
        const bi = bands.findIndex(([a, b]) => y >= a && y < b); if (bi < 0) continue;
        const x = spineX(bi) + g.int(0, sw - 1);
        if (!hullAt(d, f, l, x, y) || !hullAt(d + 1, f, l, x, y)) continue;
        if ((conn.ladders.get(key(d, f, l)) || []).some(L => Math.abs(L.y - y) < 3)) continue;
        push(conn.ladders, key(d, f, l), { x, y, dir: 'down' }); push(conn.ladders, key(d + 1, f, l), { x, y, dir: 'up' }); placed++;
      }
    }
    // ---- walkability over hull islands -------------------------------------------------------
    const nodes = new Map(); const nodeId = (d, f, l, i) => { const k = key(d, f, l) + '#' + i; if (!nodes.has(k)) nodes.set(k, nodes.size); return nodes.get(k); };
    const islandAt = (d, f, l, x, y) => { const sh = DP.sectorHull(ship, d, f, l); const i = sh.islandOf.get(x + ',' + y); return i == null ? -1 : i; };
    const parent = [];
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    const sectors = [];
    for (let d = 0; d < ship.D; d++) for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) if (exists(d, f, l)) { sectors.push([d, f, l]); const sh = DP.sectorHull(ship, d, f, l); sh.islands.forEach((_, i) => { const id = nodeId(d, f, l, i); parent[id] = id; }); }
    const link = (d1, f1, l1, x1, y1, d2, f2, l2, x2, y2) => { const i1 = islandAt(d1, f1, l1, x1, y1), i2 = islandAt(d2, f2, l2, x2, y2); if (i1 < 0 || i2 < 0) return; union(nodeId(d1, f1, l1, i1), nodeId(d2, f2, l2, i2)); };
    for (const [d, f, l] of sectors) {
      for (const e of conn.exits.get(key(d, f, l)) || []) {
        if (e.side === 'N') link(d, f, l, e.t, 0, d, f - 1, l, e.t, H - 1); else if (e.side === 'S') link(d, f, l, e.t, H - 1, d, f + 1, l, e.t, 0);
        else if (e.side === 'W') link(d, f, l, 0, e.t, d, f, l - 1, W - 1, e.t); else link(d, f, l, W - 1, e.t, d, f, l + 1, 0, e.t);
      }
      for (const L of conn.ladders.get(key(d, f, l)) || []) if (L.dir === 'down') link(d, f, l, L.x, L.y, d + 1, f, l, L.x, L.y);
    }
    for (const [fl, lift] of conn.lifts) { const [f, l] = fl.split('/').map(Number); for (let i = 1; i < lift.decks.length; i++) if (lift.decks[i] === lift.decks[i - 1] + 1) link(lift.decks[i - 1], f, l, lift.cells[0][0], lift.cells[0][1], lift.decks[i], f, l, lift.cells[0][0], lift.cells[0][1]); }
    // repairs: join components with a ladder through the deck, or a hatch through a sector wall
    const components = () => new Set([...nodes.values()].map(find)).size;
    for (let iter = 0; iter < 400 && components() > 1; iter++) {
      let done = false;
      for (const [d, f, l] of sectors) {
        const sh = DP.sectorHull(ship, d, f, l);
        for (let i = 0; i < sh.islands.length && !done; i++) {
          const me = find(nodeId(d, f, l, i));
          const cells = sh.islands[i];
          // through the deck below, then above
          for (const dd of [d + 1, d - 1]) {
            if (done || dd < 0 || dd >= ship.D || !exists(dd, f, l)) continue;
            for (let c = 0; c < cells.length; c += 3) {
              const [x, y] = cells[c].split(',').map(Number);
              if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || crossRow(ship, f, y) || sh.cuts.has(cells[c]) || DP.sectorHull(ship, dd, f, l).cuts.has(cells[c])) continue;
              if ((conn.ladders.get(key(d, f, l)) || []).concat(conn.ladders.get(key(dd, f, l)) || []).some(L => L.x === x && L.y === y)) continue;
              const j = islandAt(dd, f, l, x, y); if (j < 0) continue;
              const other = find(nodeId(dd, f, l, j)); if (other === me) continue;
              const lo = Math.min(d, dd), hi = Math.max(d, dd);
              push(conn.ladders, key(lo, f, l), { x, y, dir: 'down', repair: true }); push(conn.ladders, key(hi, f, l), { x, y, dir: 'up', repair: true });
              union(me, other); done = true; break;
            }
          }
          if (done) break;
          // through the wall into a neighbouring sector
          for (const k of cells) {
            const [x, y] = k.split(',').map(Number);
            const tries = [];
            if (y === 0 && f > 0) tries.push(['N', d, f - 1, l, x, H - 1]); if (y === H - 1 && f < ship.F - 1) tries.push(['S', d, f + 1, l, x, 0]);
            if (x === 0 && l > 0) tries.push(['W', d, f, l - 1, W - 1, y]); if (x === W - 1 && l < ship.Lat - 1) tries.push(['E', d, f, l + 1, 0, y]);
            for (const [side, d2, f2, l2, x2, y2] of tries) {
              if (!exists(d2, f2, l2) || sh.cuts.has(k)) continue;
              const j = islandAt(d2, f2, l2, x2, y2); if (j < 0) continue;
              const other = find(nodeId(d2, f2, l2, j)); if (other === me) continue;
              const t = side === 'N' || side === 'S' ? x : y, t2 = side === 'N' || side === 'S' ? x2 : y2;
              const opp = { N: 'S', S: 'N', W: 'E', E: 'W' }[side];
              push(conn.exits, key(d, f, l), { side, t, w: 1, kind: 'hatch' }); push(conn.exits, key(d2, f2, l2), { side: opp, t: t2, w: 1, kind: 'hatch' });
              union(me, other); done = true; break;
            }
            if (done) break;
          }
          if (done) break;
        }
        if (done) break;
      }
      if (!done) break;
    }
    // whatever is still cut off is written off as destroyed
    conn.dead = new Set();
    const sizes = new Map();
    for (const [k, id] of nodes) { const r = find(id); const n = DP.sectorHull(ship, ...k.split('#')[0].split('/').map(Number)).islands[+k.split('#')[1]].length; sizes.set(r, (sizes.get(r) || 0) + n); }
    let main = null; for (const [r, n] of sizes) if (main === null || n > sizes.get(main)) main = r;
    for (const [k, id] of nodes) if (find(id) !== main) conn.dead.add(k);
    conn.components = 1;
    ship.conn = conn;
    return conn;
  };

  // ---- zone plan ---------------------------------------------------------------------
  const SUPPORT = { command: ['sanctum', 'medicae', 'habitation'], habitation: ['medicae', 'sanctum', 'maintenance'], enginarium: ['maintenance', 'cargo'], cargo: ['maintenance', 'habitation'], medicae: ['habitation', 'science'], armoury: ['habitation', 'maintenance'], sanctum: ['habitation', 'medicae'], science: ['medicae', 'maintenance'], maintenance: ['cargo', 'habitation'], brig: ['armoury', 'maintenance'], hangar: ['maintenance', 'armoury'], void: ['maintenance', 'cargo'] };
  DP.ZONE_SUPPORT = SUPPORT;
  function band(fr) { return fr < 0.15 ? 'prow' : fr < 0.4 ? 'fore' : fr < 0.7 ? 'mid' : fr < 0.88 ? 'aft' : 'stern'; }
  function dband(dr) { return dr < 0.25 ? 'top' : dr > 0.75 ? 'bottom' : 'mid'; }
  DP.sectorZone = function (ship, d, f, l) {
    const fr = ship.F > 1 ? f / (ship.F - 1) : 0.5, dr = ship.D > 1 ? d / (ship.D - 1) : 0.5;
    const mid = Math.floor(ship.Lat / 2);
    const B = band(fr), DB = dband(dr), flank = l !== mid;
    const key = `${B}/${DB}/${flank ? 'flank' : 'centre'}`;
    const rng = DP.makeRng(ship.seed + '/plan/' + key);
    const w = Object.assign({}, ship.C.zoneW);
    const mul = (k, m) => { if (w[k] != null) w[k] *= m; };
    mul('command', ({ prow: 4, fore: 1.2, mid: 0.15, aft: 0.1, stern: 0.05 })[B] * ({ top: 2, mid: 1, bottom: 0.3 })[DB] * (flank ? 0.3 : 1));
    mul('enginarium', ({ prow: 0.05, fore: 0.1, mid: 0.15, aft: 1.5, stern: 6 })[B]);
    mul('cargo', ({ top: 0.3, mid: 1, bottom: 2.2 })[DB] * (B === 'stern' ? 0.3 : 1));
    mul('hangar', (flank ? 3 : 0.1) * ({ prow: 0.1, fore: 1, mid: 1.5, aft: 1.5, stern: 0.2 })[B]);
    mul('habitation', ({ prow: 0.4, fore: 1.5, mid: 1.5, aft: 1, stern: 0.3 })[B] * (DB === 'top' ? 1.3 : 1));
    mul('armoury', ({ prow: ship.cls === 'W' ? 1.5 : 0.6, fore: 1, mid: 1.3, aft: 1, stern: 0.3 })[B]);
    mul('medicae', ({ prow: 0.5, fore: 1.3, mid: 1.3, aft: 0.6, stern: 0.2 })[B]);
    mul('sanctum', ({ prow: 0.8, fore: 1.2, mid: 1.2, aft: 0.6, stern: 0.2 })[B] * ({ top: 1.8, mid: 1, bottom: 0.4 })[DB]);
    mul('science', ({ prow: 1.5, fore: 1.2, mid: 0.8, aft: 0.5, stern: 0.2 })[B]);
    mul('maintenance', ({ top: 0.3, mid: 1, bottom: 3 })[DB] * (B === 'stern' ? 1.5 : 1));
    mul('brig', ({ top: 0.2, mid: 1, bottom: 2 })[DB] * (B === 'stern' || B === 'prow' ? 0.3 : 1));
    if (ship.condition !== 'derelict') delete w.void; else if (w.void == null) w.void = 0.6;
    return rng.weighted(Object.entries(w));
  };
})();
