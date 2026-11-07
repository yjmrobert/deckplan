// Node smoke test: build many sectors and check the invariants the renderer relies on.
const fs = require('fs'), vm = require('vm'), path = require('path');
globalThis.DP = {};
for (const f of ['rng', 'data', 'hull', 'geom', 'layout', 'furnish']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
const DP = globalThis.DP;
let fails = 0, built = 0, stats = { rooms: 0, doors: 0, props: 0, sealed: 0, deadRooms: 0, exits: 0, repairs: 0, voids: 0, ladders: 0 };
const seeds = process.argv[2] ? [process.argv[2]] : ['ALPHA1', 'BRAVO2', 'CHRLY3', 'DELTA4', 'ECHO55', 'FXTROT'];
for (const seed of seeds) for (const cls of DP.CLASS_ORDER) for (const size of ['s', 'm', 'l']) for (const cond of ['intact', 'derelict']) {
  const ship = DP.makeShip({ seed, cls, size, condition: cond });
  const conn = DP.shipConnections(ship);
  if (conn.components !== 1) { console.log('SHIP NOT CONNECTED', seed, cls, size, cond, 'components', conn.components); fails++; }
  stats.repairs += [...conn.ladders.values()].flat().filter(L => L.repair && L.dir === 'down').length + [...conn.exits.values()].flat().filter(e => e.kind === 'hatch').length / 2;
  stats.voids += (ship.geo.voids || []).length;
  for (const [d, f, l] of [[0, 2, 1], [1, 0, 1], [2, 3, 0], [ship.D - 1, ship.F - 1, 2], [1, 4, 1], [3, 5, 2], [2, 6, 1]]) {
    if (!DP.sectorExists(ship, d, f, l)) continue;
    let sec;
    try { sec = DP.buildSector(ship, d, f, l); } catch (e) { console.log('THROW', seed, cls, size, cond, d, f, l, e.stack); fails++; continue; }
    built++;
    // every cell owned
    for (const k of sec.hull) { const [x, y] = k.split(',').map(Number); if (sec.owner[y][x] < 0) { console.log('UNOWNED', seed, cls, size, d, f, l, x, y); fails++; break; } }
    for (let y = 0; y < sec.H; y++) for (let x = 0; x < sec.W; x++) if (sec.owner[y][x] >= 0 && !sec.hull.has(x + ',' + y)) { console.log('OUTSIDE HULL', seed, cls, size, d, f, l, x, y); fails++; y = sec.H; break; }
    // reachability through doors (sealed count as passable for this check)
    const rooms = sec.rooms.filter(r => r.cells.length);
    const adj = new Map(); rooms.forEach(r => adj.set(r.id, new Set()));
    for (const dr of sec.doors) if (dr.b >= 0) { adj.get(dr.a).add(dr.b); adj.get(dr.b).add(dr.a); }
    // corridor touch
    const { adjacency } = DP._layout;
    for (const [a, b] of adjacency(sec)) if (sec.rooms[a].kind === 'corridor' && sec.rooms[b].kind === 'corridor') { adj.get(a).add(b); adj.get(b).add(a); }
    // one start per hull island
    const islands = DP._layout.components([...sec.hull].map(k => k.split(',').map(Number)), sec.hull);
    const seen = new Set(); const q = [];
    for (const cells of islands) { for (const [x, y] of cells) { const id = sec.owner[y][x]; if (id >= 0) { seen.add(id); q.push(id); break; } } }
    while (q.length) { const c = q.pop(); for (const o of adj.get(c)) if (!seen.has(o)) { seen.add(o); q.push(o); } }
    const dead = rooms.filter(r => !seen.has(r.id));
    if (dead.length) { stats.deadRooms += dead.length; console.log('UNREACHABLE', seed, cls, size, cond, d, f, l, 'islands', islands.length, dead.map(r => r.name + '#' + r.id + '(' + r.cells.length + ')').join(', ')); fails++; }
    // props inside their rooms and not overlapping
    const occ = new Set();
    for (const p of sec.props) for (let yy = p.y; yy < p.y + p.h; yy++) for (let xx = p.x; xx < p.x + p.w; xx++) { const k = xx + ',' + yy; if (occ.has(k)) { console.log('OVERLAP', seed, cls, d, f, l, p.t, xx, yy); fails++; } occ.add(k); if (sec.owner[yy][xx] !== p.room) { console.log('PROP OUTSIDE', seed, cls, d, f, l, p.t); fails++; } if (sec.reserved.has(k)) { console.log('PROP ON DOOR', seed, cls, d, f, l, p.t); fails++; } }
    stats.rooms += rooms.length; stats.doors += sec.doors.length; stats.props += sec.props.length; stats.sealed += sec.doors.filter(x => x.state === 'sealed').length;
    // exits match the neighbour (build the neighbour and compare)
    for (const ex of sec.exits) {
      const nf = ex.side === 'N' ? f - 1 : ex.side === 'S' ? f + 1 : f, nl = ex.side === 'W' ? l - 1 : ex.side === 'E' ? l + 1 : l;
      const opp = { N: 'S', S: 'N', W: 'E', E: 'W' }[ex.side];
      const nsec = DP.buildSector(ship, d, nf, nl);
      if (!nsec.exits.some(e => e.side === opp && e.t === ex.t)) { console.log('EXIT MISMATCH', seed, cls, size, cond, d, f, l, ex.side, ex.t); fails++; }
    }
    stats.exits += sec.exits.length; stats.ladders += sec.ladders.length;
    // ladders and lifts agree with the deck above and below
    for (const L of sec.ladders) {
      const dd = L.dir === 'down' ? d + 1 : d - 1; const other = DP.buildSector(ship, dd, f, l);
      if (!other.ladders.some(o => o.x === L.x && o.y === L.y && o.dir !== L.dir)) { console.log('LADDER MISMATCH', seed, cls, size, cond, d, f, l, L); fails++; }
      if (!sec.props.some(p => p.t === 'ladder' && p.dir === L.dir)) { console.log('LADDER NOT PLACED', seed, cls, size, cond, d, f, l, L); fails++; }
    }
    const lift = sec.rooms.find(r => r.type === 'lift' && r.cells.length);
    if (lift) for (const dd of lift.liftDecks) { if (dd === d) continue; const other = DP.buildSector(ship, dd, f, l); const ol = other.rooms.find(r => r.type === 'lift' && r.cells.length); if (!ol || ol.bbox.x0 !== lift.bbox.x0 || ol.bbox.y0 !== lift.bbox.y0) { console.log('LIFT MISMATCH', seed, cls, size, cond, d, f, l, dd); fails++; } }
  }
}
console.log('built', built, 'sectors; fails', fails, stats, 'avg rooms', (stats.rooms / built).toFixed(1), 'avg props', (stats.props / built).toFixed(1));
// print one sector as ascii
const ship = DP.makeShip({ seed: 'ALPHA1', cls: 'W', size: 'm', condition: 'intact' });
const sec = DP.buildSector(ship, 2, 3, 1);
const glyph = (r) => !r ? ' ' : r.kind === 'corridor' ? '.' : (r.type === 'lift' ? 'L' : String.fromCharCode(97 + (r.id % 26)));
const occ = new Set(sec.props.flatMap(p => { const o = []; for (let yy = p.y; yy < p.y + p.h; yy++) for (let xx = p.x; xx < p.x + p.w; xx++) o.push(xx + ',' + yy); return o; }));
for (let y = 0; y < sec.H; y++) { let s = ''; for (let x = 0; x < sec.W; x++) { const id = sec.owner[y][x]; const r = id >= 0 ? sec.rooms[id] : null; s += occ.has(x + ',' + y) ? '#' : glyph(r); } console.log(s); }
console.log(sec.zones.map(z => z.letter + ':' + z.name).join('  '));
console.log(sec.rooms.filter(r => r.number).map(r => r.number + ' ' + r.name).join(', '));
console.log('doors', sec.doors.length, 'exits', sec.exits.length, 'ladders', sec.ladders.length);
process.exit(fails ? 1 : 0);
