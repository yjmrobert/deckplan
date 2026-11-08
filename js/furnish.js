// Furnishing: props on the grid (they block squares) and decor (stains, pipes, rubble; they never block).
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const K = (x, y) => x + ',' + y;
  const unK = (k) => k.split(',').map(Number);
  const ROT = { N: 0, E: 90, S: 180, W: 270 };

  const DENSITY = 0.65;
  const dens = (n) => (n >= 1 ? Math.max(1, Math.round(n * DENSITY)) : 0);
  function makeApi(sec, room, rng, occ) {
    const inRoom = (x, y) => room.set.has(K(x, y));
    const blocked = (x, y) => !inRoom(x, y) || sec.reserved.has(K(x, y)) || occ.has(K(x, y)) || sec.cuts.has(K(x, y));
    const sideOf = (x, y) => { const s = []; if (!inRoom(x, y - 1)) s.push('N'); if (!inRoom(x, y + 1)) s.push('S'); if (!inRoom(x - 1, y)) s.push('W'); if (!inRoom(x + 1, y)) s.push('E'); return s; };
    const cellsOf = (x, y, w, h) => { const out = []; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) out.push([xx, yy]); return out; };
    // would the free squares still form one connected region with every door reachable?
    const keepsPaths = (cells) => {
      const tmp = new Set(cells.map(([x, y]) => K(x, y)));
      const free = room.cells.filter(([x, y]) => !occ.has(K(x, y)) && !tmp.has(K(x, y)));
      if (!free.length) return false;
      const doorCells = room.cells.filter(([x, y]) => sec.reserved.has(K(x, y)));
      if (doorCells.some(([x, y]) => tmp.has(K(x, y)))) return false;
      const freeSet = new Set(free.map(([x, y]) => K(x, y)));
      const start = doorCells.length ? doorCells[0] : free[0];
      const seen = new Set([K(start[0], start[1])]); const q = [start];
      while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = K(cx + dx, cy + dy); if (freeSet.has(k) && !seen.has(k)) { seen.add(k); q.push([cx + dx, cy + dy]); } } }
      return seen.size === free.length;
    };
    const put = (t, x, y, w, h, rot, extra) => {
      const cells = cellsOf(x, y, w, h);
      if (cells.some(([cx, cy]) => blocked(cx, cy))) return null;
      if (!keepsPaths(cells)) return null;
      for (const [cx, cy] of cells) occ.add(K(cx, cy));
      const p = Object.assign({ t, x, y, w, h, rot: rot || 0, room: room.id }, extra || {});
      sec.props.push(p); return p;
    };
    const wallLists = () => {
      const lists = { N: [], S: [], W: [], E: [] };
      for (const [x, y] of room.cells) for (const s of sideOf(x, y)) lists[s].push([x, y]);
      lists.N.sort((a, b) => a[0] - b[0] || a[1] - b[1]); lists.S.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      lists.W.sort((a, b) => a[1] - b[1] || a[0] - b[0]); lists.E.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      return lists;
    };
    const api = {
      rng, room, area: room.cells.length, bw: room.bbox.w, bh: room.bbox.h, put,
      // props with their back to a wall. w along the wall, h into the room.
      wall(t, w, h, n, opts) {
        opts = opts || {}; const lists = wallLists(); n = dens(n);
        let sides = opts.sides || ['N', 'S', 'W', 'E'].sort((a, b) => lists[b].length - lists[a].length);
        if (opts.shuffle) sides = rng.shuffle(sides.slice());
        const spacing = opts.spacing || 0; let placed = 0;
        for (const s of sides) {
          const list = lists[s]; let skip = 0;
          const start = opts.offset ? opts.offset % (w + spacing) : 0;
          for (let i = start; i < list.length && placed < n; i++) {
            if (skip > 0) { skip--; continue; }
            const [x, y] = list[i];
            let fx = x, fy = y, fw = w, fh = h;
            if (s === 'S') { fy = y - h + 1; } else if (s === 'W') { fw = h; fh = w; } else if (s === 'E') { fw = h; fh = w; fx = x - h + 1; }
            // the prop must sit flush: every square of its wall-side row touches the wall
            const flush = [];
            for (let k = 0; k < w; k++) flush.push(s === 'N' || s === 'S' ? [x + k, y] : [x, y + k]);
            if (!flush.every(([cx, cy]) => inRoom(cx, cy) && sideOf(cx, cy).includes(s))) continue;
            if (put(t, fx, fy, fw, fh, ROT[s], opts.extra)) { placed++; skip = w - 1 + spacing; }
          }
          if (placed >= n && !opts.allSides) break;
        }
        return placed;
      },
      centre(t, w, h, extra) {
        const cx = (room.bbox.x0 + room.bbox.x1) / 2 - w / 2, cy = (room.bbox.y0 + room.bbox.y1) / 2 - h / 2;
        const tries = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]];
        for (const [dx, dy] of tries) { const p = put(t, Math.round(cx) + dx, Math.round(cy) + dy, w, h, 0, extra); if (p) return p; }
        return null;
      },
      scatter(t, n, w, h, extra) {
        w = w || 1; h = h || 1; let placed = 0; n = dens(n);
        const cells = rng.shuffle(room.cells.slice());
        for (const [x, y] of cells) { if (placed >= n) break; if (put(t, x, y, w, h, rng.pick([0, 90, 180, 270]) * (w === h ? 1 : 0), extra)) placed++; }
        return placed;
      },
      // rows of w x h props with an aisle between rows, like bunks, pews or planters
      rows(t, w, h, aisle, opts) {
        opts = opts || {}; let placed = 0;
        const b = room.bbox;
        for (let y = b.y0 + (opts.top || 0); y + h <= b.y1; y += h + aisle) {
          for (let x = b.x0 + (opts.left || 0); x + w <= b.x1; x += w + (opts.gap || 0)) {
            if (opts.aisleX && Math.abs(x + w / 2 - (b.x0 + b.x1) / 2) < 1.01) continue;
            if (put(t, x, y, w, h, opts.rot || 0, opts.extra)) placed++;
          }
        }
        return placed;
      },
      chairsAround(p) {
        if (!p) return;
        const spots = p.w >= p.h ? [[p.x, p.y - 1, 180], [p.x + 1, p.y - 1, 180], [p.x, p.y + p.h, 0], [p.x + 1, p.y + p.h, 0]] : [[p.x - 1, p.y, 90], [p.x - 1, p.y + 1, 90], [p.x + p.w, p.y, 270], [p.x + p.w, p.y + 1, 270]];
        for (const [x, y, r] of spots) if (rng.chance(0.75)) put('chair', x, y, 1, 1, r);
      },
      tables(n) { for (let i = 0; i < n; i++) { const cells = rng.shuffle(room.cells.slice()); for (const [x, y] of cells) { const p = put('table', x, y, 2, 1, 0); if (p) { api.chairsAround(p); break; } } } },
      decor(t, n, opts) {
        opts = opts || {};
        for (let i = 0; i < n; i++) { const [x, y] = rng.pick(room.cells); sec.decor.push(Object.assign({ t, x: x + 0.2 + rng.next() * 0.6, y: y + 0.2 + rng.next() * 0.6, r: (opts.r || 0.5) * (0.7 + rng.next() * 0.6), a: rng.next() * 360, room: room.id }, opts.extra || {})); }
      },
      // pillars every few squares along the two longest walls (decor, they do not block)
      pillars(step) {
        const lists = wallLists(); step = step || 3;
        const sides = ['N', 'S', 'W', 'E'].sort((a, b) => lists[b].length - lists[a].length).slice(0, 2);
        for (const s of sides) { const l = lists[s]; for (let i = 1; i < l.length - 1; i += step) { const [x, y] = l[i]; const o = { N: [0.5, 0.18], S: [0.5, 0.82], W: [0.18, 0.5], E: [0.82, 0.5] }[s]; sec.decor.push({ t: 'pillar', x: x + o[0], y: y + o[1], r: 0.3, a: 0, room: room.id }); } }
      },
      pipes(n) {
        const lists = wallLists();
        for (const s of rng.shuffle(['N', 'S', 'W', 'E']).slice(0, n)) { const l = lists[s]; if (l.length < 3) continue; const a = l[0], b = l[l.length - 1]; sec.decor.push({ t: 'pipe', x: a[0], y: a[1], x2: b[0], y2: b[1], side: s, room: room.id }); }
      },
    };
    return api;
  }

  const R = {};
  R.bridge = (a) => { a.wall('console', 1, 1, Math.max(3, Math.round(a.area / 4)), { sides: ['N', 'W', 'E', 'S'] }); if (a.area >= 24) a.centre('holo', 2, 2); else a.centre('captain', 1, 1); a.scatter('chair', 2); };
  R.firecon = R.control = R.security = R.customs = (a) => { a.wall('console', 1, 1, Math.max(2, Math.round(a.area / 5))); const t = a.centre('table', 2, 1); a.chairsAround(t); };
  R.comms = (a) => { a.wall('server', 1, 1, Math.max(2, Math.round(a.area / 5))); a.wall('console', 1, 1, 2); a.scatter('chair', 1); };
  R.maproom = (a) => { a.centre('holo', 2, 2) || a.centre('table', 2, 1); a.wall('console', 1, 1, 2); a.wall('shelf', 1, 1, 2); };
  R.office = R.purser = (a) => { const d = a.wall('desk', 2, 1, 1, { extra: { chairSide: true } }); a.scatter('chair', 1); a.wall('locker', 1, 1, Math.min(2, Math.round(a.area / 4))); };
  R.ready = (a) => { a.tables(Math.max(1, Math.round(a.area / 12))); a.wall('locker', 1, 1, 2); a.wall('console', 1, 1, 1); };
  R.archive = (a) => { a.wall('shelf', 1, 1, Math.round(a.area / 3), { allSides: true }); if (a.area >= 12) a.tables(1); };
  R.scriptorium = (a) => { a.wall('shelf', 1, 1, Math.round(a.area / 4)); a.wall('desk', 2, 1, Math.max(1, Math.round(a.area / 10))); a.scatter('chair', 2); a.centre('lectern', 1, 1); a.decor('candles', 2, { r: 0.25 }); };
  R.cabins = (a) => { a.wall('bunk', 1, 2, Math.round(a.area / 4)); a.wall('locker', 1, 1, Math.round(a.area / 8)); };
  R.barracks = (a) => { a.wall('bunk', 1, 2, Math.round(a.area / 3)); if (a.area >= 30) a.tables(1); a.wall('locker', 1, 1, Math.round(a.area / 10)); };
  R.cabin = (a) => { a.wall('bed', 1, 2, 1); a.wall('locker', 1, 1, 1); a.wall('desk', 2, 1, a.area >= 6 ? 1 : 0); a.scatter('chair', a.area >= 6 ? 1 : 0); };
  R.stateroom = (a) => { a.wall('bed', 2, 2, 1); a.wall('couch', 2, 1, 1); a.wall('locker', 1, 1, 1); a.centre('table', 1, 1); };
  R.crew = (a) => { a.wall('bunk', 1, 2, 2); a.wall('couch', 2, 1, 1); a.scatter('crate', 2); a.decor('stain', 2); };
  R.galley = (a) => { a.wall('counter', 1, 1, Math.round(a.area / 3), { sides: ['N', 'W', 'E', 'S'] }); a.wall('fridge', 1, 1, 1); a.wall('stove', 1, 1, 1); if (a.area >= 12) a.tables(1); };
  R.mess = R.refectory = R.commons = (a) => { a.tables(Math.max(1, Math.round(a.area / 9))); a.wall('counter', 1, 1, a.area >= 30 ? 3 : 0); if (a.room.type === 'commons') a.wall('planter', 2, 1, 2); };
  R.lounge = (a) => { a.wall('couch', 2, 1, Math.max(1, Math.round(a.area / 8))); a.centre('table', 1, 1); a.wall('planter', 2, 1, 1); a.scatter('chair', 2); };
  R.wash = (a) => { a.wall('toilet', 1, 1, Math.max(1, Math.round(a.area / 4)), { sides: ['W', 'E', 'N', 'S'] }); a.wall('sink', 1, 1, Math.max(1, Math.round(a.area / 6))); if (a.area >= 6) a.wall('shower', 1, 1, 1); };
  R.laundry = (a) => { a.wall('machine', 1, 1, Math.round(a.area / 3)); a.centre('table', 2, 1); };
  R.gym = (a) => { a.scatter('bench', 2, 2, 1); a.wall('rack', 1, 1, 2); a.centre('mat', 2, 2); };
  R.engines = (a) => { (a.area >= 40 && a.centre('core', 3, 3)) || a.centre('generator', 2, 2); a.wall('bigtank', 2, 2, 2); a.wall('console', 1, 1, 3); a.scatter('barrel', 2); a.pipes(2); };
  R.reactor = (a) => { (a.area >= 160 && a.centre('core', 5, 5)) || (a.area >= 80 && a.centre('core', 4, 4)) || a.centre('core', 3, 3) || a.centre('generator', 2, 2); a.wall('console', 1, 1, Math.max(4, Math.round(a.area / 20))); a.wall('bigtank', 2, 2, a.area >= 120 ? 2 : 0); a.wall('tank', 1, 1, 4); a.pipes(3); a.decor('hazardfloor', Math.max(1, Math.round(a.area / 80)), { r: 1 }); a.pillars(4); };
  R.machinehall = (a) => { a.rows('generator', 2, 2, 2, { left: 1, top: 1, gap: 1 }); a.wall('console', 1, 1, 3); a.wall('workbench', 2, 1, 2); a.scatter('drum', 2); a.pipes(2); a.pillars(4); a.decor('stain', Math.round(a.area / 30)); };
  R.fuelbay = (a) => { a.rows('bigtank', 2, 2, 1, { left: 1, top: 1, gap: 1 }); a.wall('pump', 1, 1, 3); a.scatter('drum', Math.max(2, Math.round(a.area / 15))); a.pipes(3); a.decor('hazardfloor', 2, { r: 1 }); };
  R.conduit = (a) => { const long = a.bw >= a.bh ? ['N', 'S'] : ['W', 'E']; a.wall('tank', 1, 1, Math.max(2, Math.round(a.area / 6)), { sides: long, spacing: 1 }); a.wall('console', 1, 1, 1); a.pipes(4); a.decor('hazardfloor', Math.max(1, Math.round(a.area / 20)), { r: 0.8 }); a.pillars(3); };
  R.capacitor = (a) => { a.wall('server', 1, 1, Math.round(a.area / 3), { allSides: true }); a.wall('console', 1, 1, 2); a.decor('hazardfloor', 1, { r: 0.8 }); };
  R.bulkstore = (a) => { a.rows('bigcrate', 2, 2, 1, { left: 1, top: 1, gap: 0 }); a.scatter('forklift', 1, 1, 2); a.scatter('pallet', Math.round(a.area / 25), 2, 1); a.wall('crate', 1, 1, Math.round(a.area / 10)); a.pillars(4); };
  R.shipbay = (a) => { a.scatter('shuttle', Math.max(1, Math.round(a.area / 60)), 3, 5); a.wall('crate', 1, 1, 4); a.scatter('drum', 3); a.scatter('pallet', 2, 2, 1); a.wall('bigtank', 2, 2, 1); a.decor('landing', 2, { r: 1.5 }); a.decor('hazardfloor', 2, { r: 1 }); a.pillars(4); };
  R.generator = (a) => { a.scatter('generator', Math.max(1, Math.round(a.area / 20)), 2, 2); a.wall('console', 1, 1, 2); a.scatter('barrel', 2); a.pipes(1); };
  R.workshop = R.tools = (a) => { a.wall('workbench', 2, 1, 2); a.wall('locker', 1, 1, 2); a.scatter('crate', 2); a.scatter('drum', 1); a.decor('stain', 1); };
  R.life = R.vents = (a) => { a.wall('bigtank', 2, 2, 2); a.wall('vent', 1, 1, 3); a.wall('console', 1, 1, 1); a.pipes(2); };
  R.pump = R.coolant = R.tanks = R.fuel = (a) => { a.wall('bigtank', 2, 2, Math.max(1, Math.round(a.area / 15))); a.wall('pump', 1, 1, 2); a.pipes(2); a.decor('stain', 1); };
  R.sump = (a) => { a.decor('pool', Math.max(1, Math.round(a.area / 20)), { r: 2 }); a.wall('pump', 1, 1, 3); a.pipes(3); a.decor('debris', 3); };
  R.furnace = (a) => { a.centre('furnace', 3, 3) || a.centre('generator', 2, 2); a.scatter('drum', 3); a.wall('crate', 1, 1, 3); a.decor('scorch', 2); };
  R.hold = R.loading = R.storage = (a) => { a.scatter('bigcrate', Math.round(a.area / 14), 2, 2); a.wall('crate', 1, 1, Math.round(a.area / 5)); a.scatter('barrel', Math.round(a.area / 12)); a.scatter('pallet', Math.round(a.area / 20), 2, 1); if (a.room.type === 'loading') a.scatter('forklift', 1, 1, 2); };
  R.crane = (a) => { R.hold(a); a.decor('rails', 1); };
  R.cold = (a) => { a.wall('cryo', 1, 1, Math.round(a.area / 3)); a.scatter('crate', 2); };
  R.locker = (a) => { a.wall('locker', 1, 1, Math.round(a.area / 3), { allSides: true }); if (a.area >= 8) a.centre('bench', 2, 1); };
  R.scrap = (a) => { a.scatter('bigcrate', Math.round(a.area / 20), 2, 2, { broken: true }); a.decor('rubble', Math.round(a.area / 4), { r: 0.6 }); a.decor('debris', Math.round(a.area / 5)); a.scatter('drum', 2); };
  R.hangar = (a) => { if (a.area >= 100) a.scatter('shuttle', 2, 3, 5); else if (a.area >= 40) a.centre('shuttle', 3, 5); a.scatter('barrel', 3); a.wall('crate', 1, 1, 3); a.scatter('pallet', 2, 2, 1); a.decor('landing', 1, { r: 1.5 }); };
  R.ward = R.medbay = R.infirmary = (a) => { a.wall('bed', 1, 2, Math.max(1, Math.round(a.area / 5)), { spacing: 1 }); a.wall('cabinet', 1, 1, 2); if (a.room.type !== 'ward' && a.area >= 20) a.centre('scanner', 2, 2); a.wall('sink', 1, 1, 1); };
  R.surgery = (a) => { a.centre('slab', 2, 1); a.wall('console', 1, 1, 2); a.wall('cabinet', 1, 1, 2); a.wall('sink', 1, 1, 1); };
  R.morgue = (a) => { a.wall('drawer', 1, 1, Math.round(a.area / 3), { sides: ['W', 'E', 'N', 'S'] }); a.scatter('slab', a.area >= 12 ? 2 : 1, 2, 1); };
  R.pharmacy = R.specimen = (a) => { a.wall('shelf', 1, 1, Math.round(a.area / 3)); a.wall('counter', 1, 1, 1); a.scatter('tank', 1); };
  R.quarantine = R.contain = (a) => { a.wall('pod', 1, 2, Math.max(1, Math.round(a.area / 6)), { spacing: 1 }); if (a.room.type === 'contain') a.centre('cage', 2, 2); a.wall('console', 1, 1, 1); a.decor('hazardfloor', 1, { r: 0.8 }); };
  R.lab = R.clean = (a) => { a.wall('workbench', 2, 1, Math.max(1, Math.round(a.area / 8))); a.scatter('tubes', 2); a.wall('console', 1, 1, 2); a.scatter('tank', 1); };
  R.hydro = (a) => { a.rows('planter', 2, 1, 1, { left: 1, top: 1 }); a.wall('tank', 1, 1, 2); };
  R.sensor = (a) => { a.centre('dish', 2, 2); a.wall('console', 1, 1, 3); a.wall('server', 1, 1, 2); };
  R.menagerie = (a) => { a.wall('cage', 2, 2, Math.max(1, Math.round(a.area / 12))); a.scatter('tank', 1); a.decor('stain', 2); };
  R.armory = (a) => { a.wall('rack', 1, 1, Math.round(a.area / 3)); a.scatter('ammo', 2); if (a.area >= 10) a.centre('table', 2, 1); a.wall('locker', 1, 1, 2); };
  R.magazine = (a) => { a.wall('ammo', 1, 1, Math.round(a.area / 3), { allSides: true }); a.scatter('bigcrate', 1, 2, 2); a.decor('hazardfloor', 1, { r: 0.8 }); };
  R.range = (a) => { const tall = a.bh > a.bw; a.wall('target', 1, 1, 4, { sides: tall ? ['N'] : ['W'], spacing: 1 }); a.wall('counter', 1, 1, 4, { sides: tall ? ['S'] : ['E'], spacing: 1 }); };
  R.weapons = (a) => { const side = a.bw >= a.bh ? ['N', 'S'] : ['W', 'E']; a.wall('cannon', 2, 3, Math.max(1, Math.round(a.area / 18)), { sides: side, spacing: 1 }); a.scatter('ammo', 3); a.wall('console', 1, 1, 2); };
  R.drill = (a) => { a.wall('rack', 1, 1, 2); a.centre('mat', 2, 2); a.decor('pillar', 4, { r: 0.3 }); };
  R.cells = (a) => { a.wall('cage', 2, 2, Math.round(a.area / 8), { spacing: 0 }); a.wall('desk', 2, 1, 1); a.scatter('chair', 1); };
  R.brig = (a) => { a.wall('cage', 2, 2, 2); a.wall('desk', 2, 1, 1); a.scatter('chair', 1); };
  R.cell = (a) => { a.wall('bunk', 1, 2, 1); a.wall('toilet', 1, 1, 1); };
  R.guard = (a) => { a.wall('desk', 2, 1, 1); a.scatter('chair', 1); a.wall('locker', 1, 1, 1); a.wall('rack', 1, 1, 1); };
  R.interview = (a) => { const t = a.centre('table', 2, 1); a.chairsAround(t); a.decor('stain', 1); };
  R.yard = (a) => { a.wall('bench', 2, 1, 3); a.pillars(3); a.centre('mat', 2, 2); };
  R.nave = (a) => { a.wall('altar', 2, 1, 1, { sides: ['N'] }); a.rows('pew', 2, 1, 1, { top: 3, left: 1, aisleX: true, gap: 0 }); a.decor('candles', 4, { r: 0.25 }); a.pillars(3); };
  R.shrine = (a) => { a.wall('altar', 1, 1, 1, { sides: ['N', 'W', 'E', 'S'] }); if (a.area >= 6) a.wall('pew', 2, 1, 1, { sides: ['S'] }); a.decor('candles', 3, { r: 0.2 }); };
  R.reliquary = (a) => { a.centre('reliquary', 1, 1); a.wall('shelf', 1, 1, 3); a.decor('candles', 3, { r: 0.2 }); };
  R.confessional = (a) => { a.wall('booth', 1, 1, 2); a.scatter('chair', 1); };
  R.crypt = (a) => { a.wall('coffin', 1, 2, Math.round(a.area / 4), { spacing: 1 }); a.wall('altar', 1, 1, 1); a.decor('candles', 3, { r: 0.2 }); a.pillars(3); };
  R.airlock = (a) => { const s = a.room.airlockSide; const sides = ['N', 'S', 'W', 'E'].filter(x => x !== s); a.wall('suit', 1, 1, Math.max(2, Math.round(a.area / 3)), { sides }); a.decor('hazardfloor', 1, { r: 0.9 }); };
  R.nest = (a) => { a.scatter('egg', Math.round(a.area / 5)); a.decor('goo', Math.round(a.area / 5), { r: 0.8 }); a.decor('bones', 2); a.wall('cocoon', 1, 1, 2); };
  R.void = (a) => { a.decor('rubble', Math.round(a.area / 3), { r: 0.7 }); a.decor('scorch', Math.max(1, Math.round(a.area / 12)), { r: 1.2 }); a.decor('girder', Math.max(1, Math.round(a.area / 15)), { r: 1.5 }); a.scatter('crate', 1, 1, 1, { broken: true }); };
  R.lift = () => {};
  const TINT_FALLBACK = { command: R.firecon, living: R.cabins, mess: R.mess, utility: R.workshop, cargo: R.hold, medical: R.medbay, science: R.lab, military: R.armory, sacred: R.shrine, engineering: R.generator, alien: R.nest, void: R.void, airlock: R.locker, corridor: () => {} };

  function furnishCorridor(sec, room, rng, occ, api) {
    const width = Math.min(room.bbox.w, room.bbox.h);
    if (room.type === 'passage') { api.decor('chevron', Math.max(1, Math.round(room.cells.length / 6)), { r: 0.4 }); return; }
    if (width >= 2) api.scatter('crate', Math.round(room.cells.length / 40));
    if (width >= 3) api.pillars(3);
    if (width >= 2 && room.depth === 0) api.decor('chevron', Math.round(room.cells.length / 12), { r: 0.4 });
  }

  DP.furnishSector = function (ship, sec, rng) {
    const occ = new Set(); sec.occ = occ;
    // ladders first, on their pinned squares, before anything else can take the space. A ladder is a floor hatch
    // with rungs: it can share a square with a junction opening, so a reserved square does not stop it.
    for (const L of sec.ladders) {
      const k = K(L.x, L.y); const id = sec.owner[L.y] ? sec.owner[L.y][L.x] : -1;
      if (id < 0 || sec.cuts.has(k)) continue;
      const room = sec.rooms[id];
      const twin = sec.props.find(p => p.t === 'ladder' && p.x === L.x && p.y === L.y);
      if (twin) { if (twin.dir !== L.dir) twin.dir = 'both'; }   // one well, rungs up and down
      else { occ.add(k); sec.props.push({ t: 'ladder', x: L.x, y: L.y, w: 1, h: 1, rot: 0, room: room.id, dir: L.dir }); }
      room.ladders = room.ladders || []; room.ladders.push(L.dir); L.px = L.x; L.py = L.y; L.placed = true;
    }
    for (const room of sec.rooms) {
      if (!room.cells.length) continue;
      const api = makeApi(sec, room, rng.fork('r' + room.id), occ);
      if (room.kind === 'corridor') furnishCorridor(sec, room, rng, occ, api);
      else { const fn = R[room.type] || TINT_FALLBACK[(DP.ROOMS[room.type] || {}).tint] || R.hold; fn(api); }
      // wear and tear
      const wear = ship.condition === 'derelict' ? 2 : ship.condition === 'rundown' ? 1 : 0;
      if (wear && room.type !== 'void') { api.decor('stain', Math.round(room.cells.length / (wear === 2 ? 10 : 20)), { r: 0.6 }); api.decor('debris', Math.round(room.cells.length / (wear === 2 ? 12 : 30)), { r: 0.4 }); if (wear === 2 && rng.chance(0.3)) api.decor('scorch', 1, { r: 1 }); if (wear === 2 && rng.chance(0.15)) api.decor('gore', 1, { r: 0.8 }); }
    }
    // scorching along torn edges, debris drifting in the voids
    for (const room of sec.rooms) for (const e of (room.spaceEdges || [])) if (e.torn && rng.chance(0.35)) sec.decor.push({ t: 'scorch', x: e.cx + 0.5, y: e.cy + 0.5, r: 0.7 + rng.next() * 0.6, a: 0, room: room.id });
    {
      const ox = sec.l * sec.W, oy = sec.f * sec.H;
      for (let y = 0; y < sec.H; y++) for (let x = 0; x < sec.W; x++) if (DP.hullKind(ship, sec.d, ox + x, oy + y) === 2 && rng.chance(0.08)) sec.decor.push({ t: rng.chance(0.7) ? 'rubble' : 'girder', x: x + rng.next(), y: y + rng.next(), r: 0.5 + rng.next() * 0.8, a: rng.next() * 360, room: -1 });
    }
    // a ladder whose square was taken after all (a repair ladder on a door square) is nudged to the nearest free square
    for (const L of sec.ladders) {
      if (L.placed) continue;
      const cands = [...sec.hull].map(unK).filter(([x, y]) => { const k = K(x, y); return !occ.has(k) && !sec.reserved.has(k) && !sec.cuts.has(k) && sec.owner[y][x] >= 0; })
        .map(([x, y]) => [x, y, Math.abs(x - L.x) + Math.abs(y - L.y)]).filter(c => c[2] <= 8).sort((a, b) => a[2] - b[2]);
      const apis = new Map();
      for (const [x, y] of cands) {
        const room = sec.rooms[sec.owner[y][x]];
        if (!apis.has(room.id)) apis.set(room.id, makeApi(sec, room, rng, occ));
        const p = apis.get(room.id).put('ladder', x, y, 1, 1, 0, { dir: L.dir });
        if (p) { room.ladders = room.ladders || []; room.ladders.push(L.dir); L.px = x; L.py = y; break; }
      }
    }
    // label squares: a free square near the middle of each room
    for (const room of sec.rooms) {
      if (!room.cells.length) continue;
      const cx = (room.bbox.x0 + room.bbox.x1) / 2 - 0.5, cy = (room.bbox.y0 + room.bbox.y1) / 2 - 0.5;
      let best = null, bd = 1e9;
      for (const [x, y] of room.cells) { const k = K(x, y); const pen = (occ.has(k) ? 100 : 0) + (sec.reserved.has(k) ? 50 : 0) + (sec.cuts.has(k) ? 200 : 0); const d = Math.hypot(x - cx, y - cy) + pen; if (d < bd) { bd = d; best = [x, y]; } }
      room.labelCell = best;
    }
  };
})();
