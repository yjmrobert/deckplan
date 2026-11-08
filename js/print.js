// Print layouts: whole-sector tiles (one letter page per 7x10 squares), the vent layer tiled the same way,
// room-by-room pieces packed onto pages, and the kit: one of each standard part, the tokens, and the parts list.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const f = (n) => (Math.round(n * 1000) / 1000).toString();
  const K = (x, y) => x + ',' + y;

  DP.pageTiles = function (sec, scale) {
    scale = scale || 1;
    const tw = Math.floor((DP.PAPER.w - 2 * DP.PAPER.bleed) / scale), th = Math.floor((DP.PAPER.h - 2 * DP.PAPER.bleed) / scale);
    const cols = Math.ceil(sec.W / tw), rows = Math.ceil(sec.H / th);
    const pages = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pages.push({ c, r, x: c * tw, y: r * th, w: Math.min(tw, sec.W - c * tw), h: Math.min(th, sec.H - r * th), label: String.fromCharCode(65 + r) + (c + 1) });
    return { tw, th, cols, rows, pages };
  };

  function sheet(inner, side, cls) { return `<section class="sheet ${cls || ''}">${inner}<div class="sheet-side">${esc(side)}</div></section>`; }
  const stamp = (ship, sec) => `${sec.label} · ${ship.className} ${ship.seed}`;

  function tileSheets(ship, sec, o) {
    const b = DP.PAPER.bleed / o.scale;
    const vents = o.layout === 'vents';
    // pages that hold nothing but space are left out
    const pages = DP.pageTiles(sec, o.scale).pages.filter(pg => { for (let y = pg.y; y < pg.y + pg.h; y++) for (let x = pg.x; x < pg.x + pg.w; x++) if (sec.hull.has(x + ',' + y)) return true; return false; });
    return pages.map((pg, i) => {
      const clip = { x: pg.x - b, y: pg.y - b, w: pg.w + 2 * b, h: pg.h + 2 * b };
      const svg = (vents ? DP.renderVents : DP.renderSector)(ship, sec, { mode: o.mode, theme: o.theme, labels: o.labels, background: o.background, clip, cut: { x: pg.x, y: pg.y, w: pg.w, h: pg.h }, widthAttr: f(clip.w * o.scale) + 'in', heightAttr: f(clip.h * o.scale) + 'in' });
      return sheet(svg, `${sec.label}${vents ? ' vents' : ''} · ${ship.className} ${ship.seed} · page ${pg.label} (${i + 1} of ${pages.length}) · ${o.scale}in squares`);
    }).join('\n');
  }

  // ---- pieces: shelf packing onto pages ---------------------------------------------------------
  // piece: { w, h (squares), tag, draw(clip, cut) -> svg }. Pieces bigger than a page come in labelled parts.
  function pageInner(o) { const b = DP.PAPER.bleed / o.scale; const PW = (DP.PAPER.w - 0.5) / o.scale, PH = DP.PAPER.h / o.scale + 1e-6; return { b, PW, PH, tw: Math.floor(PW - 2 * b), th: Math.floor(PH - 2 * b) }; }
  function splitBox(bb, tw, th) {
    const cols = Math.ceil(bb.w / tw), rows = Math.ceil(bb.h / th), out = [];
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) { const x = bb.x + cc * tw, y = bb.y + rr * th; out.push({ x, y, w: Math.min(tw, bb.x + bb.w - x), h: Math.min(th, bb.y + bb.h - y), part: cols * rows > 1 ? `${rr * cols + cc + 1}/${cols * rows}` : '' }); }
    return out;
  }
  // shelves, tallest pieces first; a piece goes on the first shelf of the current page with room for it
  function packSheets(pieces, o, sideLabel, cls) {
    const { b, PW, PH } = pageInner(o);
    pieces.sort((p, q) => (q.h - p.h) || (q.w - p.w));
    const pages = []; let page = null;
    const newPage = () => { page = { items: [], shelves: [], bottom: 0 }; pages.push(page); };
    newPage();
    for (const p of pieces) {
      const pw = p.w + 2 * b, ph = p.h + 2 * b;
      let shelf = page.shelves.find(s => s.x + pw <= PW && ph <= s.h);
      if (!shelf) {
        if (page.bottom + ph > PH && page.items.length) newPage();
        shelf = { y: page.bottom, h: ph, x: 0 }; page.shelves.push(shelf); page.bottom += ph;
      }
      page.items.push({ p, left: shelf.x, top: shelf.y });
      shelf.x += pw;
    }
    return pages.map((pg, i) => {
      const inner = pg.items.map(({ p, left, top }) => {
        const clip = { x: p.x - b, y: p.y - b, w: p.w + 2 * b, h: p.h + 2 * b };
        const svg = p.draw(clip, { x: p.x, y: p.y, w: p.w, h: p.h }, o);
        return `<div class="piece" style="left:${f(left * o.scale)}in;top:${f(top * o.scale)}in">${svg}<div class="piece-tag">${esc(p.tag)}</div></div>`;
      }).join('');
      return sheet(`<div class="pieces">${inner}</div>`, `${sideLabel} · page ${i + 1} of ${pages.length} · ${o.scale}in squares`, cls || 'sheet-pieces');
    }).join('\n');
  }
  const sizeAttrs = (clip, o) => ({ widthAttr: f(clip.w * o.scale) + 'in', heightAttr: f(clip.h * o.scale) + 'in' });

  function roomSheets(ship, sec, o) {
    const { tw, th } = pageInner(o);
    const pieces = [];
    for (const r of sec.rooms) {
      if (!r.cells.length || (r.kind !== 'room' && r.kind !== 'corridor')) continue;
      const tag = r.kind === 'corridor' ? r.name : `${r.number}. ${r.name}`;
      for (const s of splitBox({ x: r.bbox.x0, y: r.bbox.y0, w: r.bbox.w, h: r.bbox.h }, tw, th)) pieces.push({ x: s.x, y: s.y, w: s.w, h: s.h, tag: tag + (s.part ? ' · part ' + s.part : ''), draw: (clip, cut, o) => DP.renderSector(ship, sec, Object.assign({ mode: o.mode, theme: o.theme, labels: o.labels, background: 'none', clip, rooms: new Set([r.id]), cut }, sizeAttrs(clip, o))) });
    }
    return packSheets(pieces, o, `${stamp(ship, sec)} · pieces`);
  }

  // ---- kit: standard parts -----------------------------------------------------------------------
  // a loose part on its own: a one-room sector in the part's frame, with the fixed furnishing and walls all round
  DP.partSector = function (part) {
    const w = part.w, h = part.h, cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push([x, y]);
    const set = new Set(cells.map(([x, y]) => K(x, y)));
    const owner = []; for (let y = 0; y < h; y++) owner.push(new Int16Array(w).fill(0));
    const style = part.style || (part.kind === 'corridor' ? 'corridor' : 'cargo');
    const v = DP.kitVariant(style, w, h, part.variant || '');
    const room = { id: 0, type: v.type, name: part.name || v.type, kind: part.kind || 'room', cells, set, bbox: { x0: 0, y0: 0, x1: w, y1: h, w, h }, number: 0, zone: -1 };
    const sec = { W: w, H: h, d: 0, f: 0, l: 0, label: part.id, rooms: [room], owner, doors: [], props: [], decor: [], reserved: new Set(), pinned: new Set(), rubble: [], zones: [], exits: [], ladders: [], hull: set, cuts: new Map(), kit: true };
    if (room.kind === 'room' && style !== 'lift') { sec.props = v.props.map(p => Object.assign({}, p, { room: 0 })); sec.decor = v.decor.map(d => Object.assign({}, d, { room: 0 })); }
    return sec;
  };
  // the door, grille and ladder tokens a sector needs, as {id, name, w, kind, state, count}
  function chop(len) { const out = []; let left = len; for (const L of DP.KIT.corridorLengths) while (left >= L) { out.push(L); left -= L; } return out; }
  // every part the given sectors need: rooms, corridor straights, lifts, then tokens. Only one sector is on the
  // table at a time, so the count to print is the most any single sector needs; `placed` is the total over all.
  DP.kitParts = function (ship, secs) {
    const parts = new Map(), tokens = new Map();
    const add = (map, sec, id, make, where) => {
      if (!map.has(id)) map.set(id, Object.assign({ id, count: 0, placed: 0, where: new Map(), per: new Map() }, make()));
      const p = map.get(id); p.placed++; p.per.set(sec.label, (p.per.get(sec.label) || 0) + 1); p.count = Math.max(p.count, p.per.get(sec.label));
      if (where) { if (!p.where.has(sec.label)) p.where.set(sec.label, []); p.where.get(sec.label).push(where); }
      return p;
    };
    for (const sec of secs) {
      for (const r of sec.rooms) {
        if (!r.cells.length) continue;
        if (r.part) add(parts, sec, r.part.id, () => ({ name: r.part.name, style: r.part.style, w: r.part.w, h: r.part.h, variant: r.part.variant, kind: 'room' }), r.number ? r.number + ' ' + r.name : 'lift');
        else if (r.kind === 'corridor') {
          // straights where the whole width is there, the ragged ends at the hull cut to fit
          const vertical = r.bbox.h >= r.bbox.w, width = Math.min(r.bbox.w, r.bbox.h), len = Math.max(r.bbox.w, r.bbox.h);
          const full = (i) => { for (let j = 0; j < width; j++) if (!r.set.has(vertical ? K(r.bbox.x0 + j, r.bbox.y0 + i) : K(r.bbox.x0 + i, r.bbox.y0 + j))) return false; return true; };
          let run = 0, odd = 0;
          for (let i = 0; i <= len; i++) { if (i < len && full(i)) { run++; continue; } for (const L of chop(run)) add(parts, sec, `corridor-${width}x${L}`, () => ({ name: `Corridor ${width}×${L}`, style: 'corridor', w: width, h: L, variant: '', kind: 'corridor' }), null); run = 0; if (i < len) for (let j = 0; j < width; j++) if (r.set.has(vertical ? K(r.bbox.x0 + j, r.bbox.y0 + i) : K(r.bbox.x0 + i, r.bbox.y0 + j))) odd++; }
          if (odd) add(parts, sec, 'corridor-odd', () => ({ name: 'Corridor squares at the hull, cut to fit', style: 'corridor', w: 1, h: 1, variant: '', kind: 'odd' }), odd + ' squares in the ' + r.name.toLowerCase());
        }
      }
      for (const d of sec.doors) { if (d.kind === 'join' || d.kind === 'exit') continue; const st = d.state && d.state !== 'closed' ? ' ' + d.state : ''; const nm = { door: 'Door', cargo: 'Cargo door', bulkhead: 'Bulkhead', hatch: 'Hatch', airlock: 'Airlock' }[d.kind] || d.kind; add(tokens, sec, `${d.kind}-${d.w || 1}${st.trim()}`, () => ({ name: `${nm}${(d.w || 1) > 1 ? ' (double)' : ''}${st}`, kind: d.kind, w: d.w || 1, state: d.state || '', token: 'door' })); }
      for (const p of sec.props) { if (p.t === 'grille') add(tokens, sec, 'grille', () => ({ name: 'Vent grille', w: 1, token: 'grille' })); if (p.t === 'ladder') add(tokens, sec, 'ladder-' + p.dir, () => ({ name: 'Ladder ' + p.dir, w: 1, token: 'ladder', dir: p.dir })); }
    }
    const order = (p) => (p.kind === 'room' ? 0 : p.kind === 'corridor' ? 1 : 2) * 1e6 - p.w * p.h * 100;
    return { parts: [...parts.values()].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name)), tokens: [...tokens.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  };
  // sectors in scope: this sector, every live sector of its deck, or the whole ship
  DP.kitScope = function (ship, sec, scope) {
    if (scope !== 'deck' && scope !== 'ship') return [sec];
    ship._secCache = ship._secCache || new Map();
    const out = [];
    for (let d = 0; d < ship.D; d++) { if (scope === 'deck' && d !== sec.d) continue; for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) { if (!DP.sectorLive(ship, d, f, l)) continue; const k = d + '/' + f + '/' + l; if (!ship._secCache.has(k)) ship._secCache.set(k, DP.buildSector(ship, d, f, l)); out.push(ship._secCache.get(k)); } }
    return out;
  };
  // a token: a strip of floor with a door across it, or a square with a grille or ladder on it
  function tokenSector(t) {
    if (t.token === 'door') {
      const w = t.w, cells = [], owner = [new Int16Array(w).fill(0), new Int16Array(w).fill(1)];
      const rooms = [0, 1].map(i => { const c = []; for (let x = 0; x < w; x++) c.push([x, i]); return { id: i, type: 'corridor', name: '', kind: 'corridor', cells: c, set: new Set(c.map(([x, y]) => K(x, y))), bbox: { x0: 0, y0: i, x1: w, y1: i + 1, w, h: 1 }, number: 0, zone: -1 }; });
      for (let y = 0; y < 2; y++) for (let x = 0; x < w; x++) cells.push([x, y]);
      const sec = { W: w, H: 2, d: 0, f: 0, l: 0, label: t.id, rooms, owner, doors: [{ x: 0, y: 1, side: 'N', a: 0, b: 1, kind: t.kind, w, state: t.state || undefined }], props: [], decor: [], reserved: new Set(), pinned: new Set(), rubble: [], zones: [], exits: [], ladders: [], hull: new Set(cells.map(([x, y]) => K(x, y))), cuts: new Map(), kit: true };
      return { sec, clip: { x: -0.15, y: 0.55, w: w + 0.3, h: 0.9 }, w: w + 0.3, h: 0.9, rooms: new Set([0, 1]) };
    }
    const sec = DP.partSector({ id: t.id, type: 'corridor', w: 1, h: 1, kind: 'corridor' });
    sec.props.push(t.token === 'grille' ? { t: 'grille', x: 0, y: 0, w: 1, h: 1, rot: 0, room: 0 } : { t: 'ladder', x: 0, y: 0, w: 1, h: 1, rot: 0, room: 0, dir: t.dir });
    return { sec, clip: { x: -0.15, y: -0.15, w: 1.3, h: 1.3 }, w: 1.3, h: 1.3, rooms: new Set([0]) };
  }
  DP.kitPartsHTML = function (kit, title) {
    const many = kit.scope !== 'sector';
    const where = (p) => many ? `${p.placed} placed in ${p.per.size} sector${p.per.size > 1 ? 's' : ''}` : [...p.where.values()].flat().join(', ');
    const rows = kit.parts.map(p => `<tr><td class="num">${p.count}×</td><td>${esc(p.name)}</td><td class="code">${esc(p.id)}</td><td class="notes">${esc(where(p))}</td></tr>`).join('');
    const toks = kit.tokens.map(p => `<tr><td class="num">${p.count}×</td><td>${esc(p.name)}</td><td class="code">${esc(p.id)}</td><td class="notes">${many ? p.placed + ' placed' : ''}</td></tr>`).join('');
    const nParts = kit.parts.reduce((a, p) => a + p.count, 0), nUnique = kit.parts.length, nPlaced = kit.parts.reduce((a, p) => a + p.placed, 0);
    return `<h3>${esc(title || 'Parts')}</h3><p class="meta">Print ${nParts} parts of ${nUnique} kinds and ${kit.tokens.reduce((a, p) => a + p.count, 0)} tokens${many ? `: enough to lay any one sector (${nPlaced} parts placed across ${kit.sectors} sectors)` : ''}.</p>
<table><thead><tr><th>Print</th><th>Part</th><th>Code</th><th>${many ? 'Use' : 'Rooms'}</th></tr></thead><tbody>${rows}${toks}</tbody></table>`;
  };
  function kitSheets(ship, sec, o) {
    const secs = DP.kitScope(ship, sec, o.scope);
    const kit = DP.kitParts(ship, secs); kit.scope = o.scope || 'sector'; kit.sectors = secs.length;
    const { tw, th } = pageInner(o);
    const pieces = [];
    for (const p of kit.parts) {
      if (p.kind === 'odd') continue;
      const psec = DP.partSector(Object.assign({}, p, { kind: p.kind === 'corridor' ? 'corridor' : 'room' }));
      for (const s of splitBox({ x: 0, y: 0, w: p.w, h: p.h }, tw, th)) pieces.push({ x: s.x, y: s.y, w: s.w, h: s.h, tag: `${p.name} ×${p.count}` + (s.part ? ' · part ' + s.part : ''), draw: (clip, cut, o) => DP.renderSector(null, psec, Object.assign({ mode: o.mode, theme: o.theme, labels: 'none', background: 'none', plain: true, clip, rooms: new Set([0]), cut }, sizeAttrs(clip, o))) });
    }
    const tokens = [];
    for (const t of kit.tokens) { const tk = tokenSector(t); for (let i = 0; i < t.count; i++) tokens.push({ x: tk.clip.x, y: tk.clip.y, w: tk.w, h: tk.h, tag: '', draw: (clip, cut, o) => DP.renderSector(null, tk.sec, Object.assign({ mode: o.mode, theme: o.theme, labels: 'none', background: 'none', plain: true, clip: tk.clip, rooms: tk.rooms, grid: false }, sizeAttrs(tk.clip, o))) }); }
    const scopeLabel = kit.scope === 'ship' ? 'whole ship' : kit.scope === 'deck' ? 'deck ' + (sec.d + 1) : sec.label;
    const head = `${ship.className} ${ship.seed} · kit for ${scopeLabel}`;
    return packSheets(pieces, o, head + ' · parts') + packSheets(tokens, o, head + ' · tokens', 'sheet-pieces sheet-tokens') + sheet(`<div class="key"><h2>${esc(head)}</h2>${DP.kitPartsHTML(kit, 'Parts list')}</div>`, head + ' · parts list', 'sheet-key');
  }

  DP.roomNotes = function (ship, sec, r) {
    const notes = [];
    const mine = sec.doors.filter(d => d.a === r.id || d.b === r.id);
    const sealed = mine.filter(d => d.state === 'sealed').length, jam = mine.filter(d => d.state === 'jammed').length, open = mine.filter(d => d.state === 'open' && d.kind !== 'join').length;
    if (sealed) notes.push(sealed + ' sealed door' + (sealed > 1 ? 's' : ''));
    if (jam) notes.push(jam + ' jammed');
    if (open) notes.push(open + ' open');
    if (mine.some(d => d.kind === 'hatch')) notes.push('maintenance hatch');
    if (mine.some(d => d.kind === 'airlock')) notes.push('airlock to space');
    if (r.ladders) for (const dir of r.ladders) notes.push(dir === 'up' ? 'ladder up to deck ' + sec.d : 'ladder down to deck ' + (sec.d + 2));
    if (r.type === 'lift') notes.push('lift to deck' + (r.liftDecks && r.liftDecks.length > 1 ? 's ' : ' ') + (r.liftDecks ? r.liftDecks.filter(x => x !== sec.d).map(x => x + 1).join(', ') : '?'));
    if (r.spaceEdges && r.spaceEdges.some(e => e.torn)) notes.push('open to a torn section');
    if (r.collapsed) notes.push('collapsed wall');
    if (r.grille) notes.push('vent grille');
    if (r.displaced) notes.push('a door sits where the part has furniture; leave that piece off');
    const doorsTo = mine.filter(d => d.b >= 0).map(d => sec.rooms[d.a === r.id ? d.b : d.a]).filter(o => o.kind === 'room' && o.number).map(o => o.number);
    if (doorsTo.length) notes.push('doors to ' + doorsTo.sort((a, b) => a - b).join(', '));
    return notes.join('; ');
  };

  DP.keyHTML = function (ship, sec, opts) {
    const rooms = sec.rooms.filter(r => r.number).sort((a, b) => a.number - b.number);
    const zones = sec.zones.map(z => `<li><b>${z.letter}</b> ${esc(z.name)}</li>`).join('');
    const rows = rooms.map(r => `<tr><td class="num">${r.number}</td><td>${esc(r.name)}${r.part ? ` <span class="code">${esc(r.part.code + (r.part.rot ? ' ↻' : ''))}</span>` : ''}</td><td>${r.zone >= 0 ? sec.zones[r.zone].letter : '–'}</td><td>${r.bbox.w}×${r.bbox.h}</td><td class="notes">${esc(DP.roomNotes(ship, sec, r))}</td></tr>`).join('');
    const exits = sec.exits.map(e => { const nf = e.side === 'N' ? sec.f - 1 : e.side === 'S' ? sec.f + 1 : sec.f, nl = e.side === 'W' ? sec.l - 1 : e.side === 'E' ? sec.l + 1 : sec.l; return `${e.hatch ? 'hatch, ' : ''}${{ N: 'fore', S: 'aft', W: 'port', E: 'starboard' }[e.side]} edge at square ${e.w > 1 ? (e.t + 1) + '–' + (e.t + e.w) : e.t + 1} → ${DP.sectorLabel(ship, sec.d, nf, nl)}`; });
    const hull = sec.rooms.some(r => r.spaceEdges && r.spaceEdges.length) ? ['hull'] : [];
    const kit = sec.kit ? DP.kitParts(ship, [sec]) : null; if (kit) { kit.scope = 'sector'; kit.sectors = 1; }
    return `<div class="key">
<h2>${esc(sec.label)} — ${esc(ship.className)} <span class="seed">${esc(ship.seed)}</span></h2>
<p class="meta">Deck ${sec.d + 1} of ${ship.D} · frame ${sec.f + 1} of ${ship.F} · ${sec.W}×${sec.H} squares · ${DP.CONDITIONS[ship.condition]}${sec.kit ? ' · kit build' : ''} · ${rooms.length} rooms${hull.length ? ' · outer hull exposed' : ''}</p>
<h3>Zones</h3><ul class="zones">${zones}</ul>
<h3>Exits</h3>${exits.length ? '<ul>' + exits.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '<p>None through the walls; use the ladders or lift.</p>'}
<h3>Between decks</h3><ul>${[...(sec.rooms.filter(r => r.type === 'lift' && r.cells.length).map(r => 'Lift in room ' + r.number + ' serving decks ' + (r.liftDecks || []).map(x => x + 1).join(', '))), ...sec.ladders.map(L => 'Ladder ' + L.dir + ' to deck ' + (L.dir === 'up' ? sec.d : sec.d + 2) + (L.repair ? ' (through the damage)' : '') + ' near square ' + ((L.px != null ? L.px : L.x) + 1) + ',' + ((L.py != null ? L.py : L.y) + 1))].map(t => '<li>' + esc(t) + '</li>').join('') || '<li>None</li>'}</ul>
<h3>Rooms</h3>
<table><thead><tr><th>#</th><th>Room</th><th>Zone</th><th>Size</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
${DP.ventsKeyHTML(ship, sec)}
${kit ? DP.kitPartsHTML(kit, 'Parts for this sector') : ''}
</div>`;
  };
  // the vent layer's entry points, and where each one crawls to
  DP.ventsKeyHTML = function (ship, sec) {
    const V = sec.vents; if (!V || !V.ports.length) return '';
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const items = V.ports.map(p => { const to = p.links.slice(0, 3).map(L => DP.ventPortName(sec, L.to) + ' (' + L.dist + ' sq)').join(', '); return `<li>${esc(cap(DP.ventPortName(sec, p)))} at ${p.x + 1},${p.y + 1}${to ? ' → ' + esc(to) : ' — a dead end'}</li>`; });
    return `<h3>Vents</h3><p class="meta">${V.cells.size} squares of crawlway. Grilles open into the rooms named; shafts climb to the deck named.</p><ul class="vents">${items.join('')}</ul>`;
  };

  // o: { layout 'tiles'|'rooms'|'vents'|'placement'|'kit', scope 'sector'|'deck'|'ship', scale, mode, theme, labels, background, key }
  DP.buildPrint = function (ship, sec, o) {
    if (o.layout === 'placement') o = Object.assign({}, o, { labels: 'parts' });
    const sheets = o.layout === 'rooms' ? roomSheets(ship, sec, o) : o.layout === 'kit' ? kitSheets(ship, sec, o) : tileSheets(ship, sec, o);
    const key = o.key ? sheet(DP.keyHTML(ship, sec, o), `${sec.label} · key`, 'sheet-key') : '';
    return sheets + key;
  };
})();
