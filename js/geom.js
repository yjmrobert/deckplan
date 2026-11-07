// Cell geometry: trace the boundary of a set of squares (some chamfered) into loops of unit edges.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const K = (x, y) => x + ',' + y;
  // which sides a chamfered square is missing
  const MISSING = { NW: ['N', 'W'], NE: ['N', 'E'], SW: ['S', 'W'], SE: ['S', 'E'] };

  // set: Set of "x,y". cuts: Map "x,y" -> 'NW'|'NE'|'SW'|'SE' (optional).
  // Returns loops: arrays of edges {x1,y1,x2,y2,nx,ny,diag} where (nx,ny) is the square beyond the edge.
  DP.traceLoops = function (set, cuts) {
    cuts = cuts || new Map();
    const edges = new Map();
    const add = (x1, y1, x2, y2, nx, ny, diag) => { const k = K(x1, y1); if (!edges.has(k)) edges.set(k, []); edges.get(k).push({ x1, y1, x2, y2, nx, ny, diag: !!diag }); };
    const hasSide = (x, y, side) => { const k = K(x, y); if (!set.has(k)) return false; const c = cuts.get(k); return !(c && MISSING[c].includes(side)); };
    for (const k of set) {
      const [x, y] = k.split(',').map(Number);
      const c = cuts.get(k); const miss = c ? MISSING[c] : [];
      if (!miss.includes('N') && !hasSide(x, y - 1, 'S')) add(x, y, x + 1, y, x, y - 1);
      if (!miss.includes('E') && !hasSide(x + 1, y, 'W')) add(x + 1, y, x + 1, y + 1, x + 1, y);
      if (!miss.includes('S') && !hasSide(x, y + 1, 'N')) add(x + 1, y + 1, x, y + 1, x, y + 1);
      if (!miss.includes('W') && !hasSide(x - 1, y, 'E')) add(x, y + 1, x, y, x - 1, y);
      // the diagonal, clockwise, with the outside square taken as the missing corner's neighbour
      if (c === 'NW') add(x, y + 1, x + 1, y, x - 1, y - 1, true);
      else if (c === 'NE') add(x, y, x + 1, y + 1, x + 1, y - 1, true);
      else if (c === 'SE') add(x + 1, y, x, y + 1, x + 1, y + 1, true);
      else if (c === 'SW') add(x + 1, y + 1, x, y, x - 1, y + 1, true);
    }
    const loops = [];
    const take = (k, prev) => {
      const list = edges.get(k); if (!list || !list.length) return null;
      let idx = 0;
      if (list.length > 1 && prev) {
        const dx = prev.x2 - prev.x1, dy = prev.y2 - prev.y1;
        idx = list.findIndex(e => (e.x2 - e.x1) === -dy && (e.y2 - e.y1) === dx);
        if (idx < 0) idx = 0;
      }
      const e = list.splice(idx, 1)[0]; if (!list.length) edges.delete(k); return e;
    };
    for (const startKey of [...edges.keys()]) {
      if (!edges.has(startKey)) continue;
      const loop = []; let e = take(startKey, null);
      let guard = 0;
      while (e && guard++ < 100000) { loop.push(e); const nk = K(e.x2, e.y2); if (nk === startKey) break; e = take(nk, e); }
      if (loop.length) loops.push(loop);
    }
    return loops;
  };

  // Merge consecutive collinear edges that share a class. cls(e) -> string.
  DP.mergeRuns = function (loop, cls) {
    const runs = [];
    const colinear = (a, b) => ((a.x2 - a.x1) * (b.y2 - b.y1) - (a.y2 - a.y1) * (b.x2 - b.x1)) === 0;
    for (const e of loop) {
      const c = cls(e); const last = runs[runs.length - 1];
      if (last && last.cls === c && last.x2 === e.x1 && last.y2 === e.y1 && colinear(last, e)) { last.x2 = e.x2; last.y2 = e.y2; }
      else runs.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, cls: c });
    }
    if (runs.length > 1) { const a = runs[0], b = runs[runs.length - 1]; if (a.cls === b.cls && b.x2 === a.x1 && b.y2 === a.y1 && colinear(b, a)) { a.x1 = b.x1; a.y1 = b.y1; runs.pop(); } }
    return runs;
  };

  DP.loopPath = function (loop) {
    if (!loop.length) return '';
    const pts = []; let ldx = null, ldy = null;
    for (const e of loop) { const dx = e.x2 - e.x1, dy = e.y2 - e.y1; if (dx !== ldx || dy !== ldy) pts.push([e.x1, e.y1]); ldx = dx; ldy = dy; }
    return 'M' + pts.map(p => p[0] + ' ' + p[1]).join('L') + 'Z';
  };
})();
