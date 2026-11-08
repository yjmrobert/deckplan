// Print layouts: whole-sector tiles (one letter page per 7x10 squares) or room-by-room pieces packed onto pages.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const f = (n) => (Math.round(n * 1000) / 1000).toString();

  DP.pageTiles = function (sec, scale) {
    scale = scale || 1;
    const tw = Math.floor((DP.PAPER.w - 2 * DP.PAPER.bleed) / scale), th = Math.floor((DP.PAPER.h - 2 * DP.PAPER.bleed) / scale);
    const cols = Math.ceil(sec.W / tw), rows = Math.ceil(sec.H / th);
    const pages = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pages.push({ c, r, x: c * tw, y: r * th, w: Math.min(tw, sec.W - c * tw), h: Math.min(th, sec.H - r * th), label: String.fromCharCode(65 + r) + (c + 1) });
    return { tw, th, cols, rows, pages };
  };

  function sheet(inner, side, cls) { return `<section class="sheet ${cls || ''}">${inner}<div class="sheet-side">${esc(side)}</div></section>`; }

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

  // shelf packing of room pieces onto pages
  function roomSheets(ship, sec, o) {
    const b = DP.PAPER.bleed / o.scale;
    const PW = (DP.PAPER.w - 0.5) / o.scale, PH = (DP.PAPER.h - 0.1) / o.scale;   // in squares; the right strip holds the label
    const tw = Math.floor(PW - 2 * b), th = Math.floor(PH - 2 * b);
    const pieces = [];
    for (const r of sec.rooms) {
      if (!r.cells.length) continue;
      const bb = r.bbox;
      const cols = Math.ceil(bb.w / tw), rows = Math.ceil(bb.h / th);
      for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
        const x = bb.x0 + cc * tw, y = bb.y0 + rr * th, w = Math.min(tw, bb.x1 - x), h = Math.min(th, bb.y1 - y);
        pieces.push({ room: r, x, y, w, h, part: cols * rows > 1 ? `${rr * cols + cc + 1}/${cols * rows}` : '' });
      }
    }
    pieces.sort((p, q) => (q.h - p.h) || (q.w - p.w));
    const pages = []; let page = null, shelfY = 0, shelfH = 0, cx = 0;
    const newPage = () => { page = { items: [] }; pages.push(page); shelfY = 0; shelfH = 0; cx = 0; };
    newPage();
    for (const p of pieces) {
      const pw = p.w + 2 * b, ph = p.h + 2 * b;
      if (cx + pw > PW) { shelfY += shelfH; shelfH = 0; cx = 0; }
      if (shelfY + ph > PH) { newPage(); }
      page.items.push({ p, left: cx, top: shelfY });
      cx += pw; shelfH = Math.max(shelfH, ph);
    }
    return pages.map((pg, i) => {
      const inner = pg.items.map(({ p, left, top }) => {
        const clip = { x: p.x - b, y: p.y - b, w: p.w + 2 * b, h: p.h + 2 * b };
        const svg = DP.renderSector(ship, sec, { mode: o.mode, theme: o.theme, labels: o.labels, background: 'none', clip, rooms: new Set([p.room.id]), cut: { x: p.x, y: p.y, w: p.w, h: p.h }, widthAttr: f(clip.w * o.scale) + 'in', heightAttr: f(clip.h * o.scale) + 'in' });
        const tag = p.room.kind === 'corridor' ? p.room.name : `${p.room.number}. ${p.room.name}`;
        return `<div class="piece" style="left:${f(left * o.scale)}in;top:${f(top * o.scale)}in">${svg}<div class="piece-tag">${esc(tag)}${p.part ? ' · part ' + p.part : ''}</div></div>`;
      }).join('');
      return sheet(`<div class="pieces">${inner}</div>`, `${sec.label} · ${ship.className} ${ship.seed} · pieces page ${i + 1} of ${pages.length} · ${o.scale}in squares`, 'sheet-pieces');
    }).join('\n');
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
    const doorsTo = mine.filter(d => d.b >= 0).map(d => sec.rooms[d.a === r.id ? d.b : d.a]).filter(o => o.kind === 'room' && o.number).map(o => o.number);
    if (doorsTo.length) notes.push('doors to ' + doorsTo.sort((a, b) => a - b).join(', '));
    return notes.join('; ');
  };

  DP.keyHTML = function (ship, sec, opts) {
    const rooms = sec.rooms.filter(r => r.number).sort((a, b) => a.number - b.number);
    const zones = sec.zones.map(z => `<li><b>${z.letter}</b> ${esc(z.name)}</li>`).join('');
    const rows = rooms.map(r => `<tr><td class="num">${r.number}</td><td>${esc(r.name)}</td><td>${r.zone >= 0 ? sec.zones[r.zone].letter : '–'}</td><td>${r.bbox.w}×${r.bbox.h}</td><td class="notes">${esc(DP.roomNotes(ship, sec, r))}</td></tr>`).join('');
    const exits = sec.exits.map(e => { const nf = e.side === 'N' ? sec.f - 1 : e.side === 'S' ? sec.f + 1 : sec.f, nl = e.side === 'W' ? sec.l - 1 : e.side === 'E' ? sec.l + 1 : sec.l; return `${e.hatch ? 'hatch, ' : ''}${{ N: 'fore', S: 'aft', W: 'port', E: 'starboard' }[e.side]} edge at square ${e.w > 1 ? (e.t + 1) + '–' + (e.t + e.w) : e.t + 1} → ${DP.sectorLabel(ship, sec.d, nf, nl)}`; });
    const hull = sec.rooms.some(r => r.spaceEdges && r.spaceEdges.length) ? ['hull'] : [];
    return `<div class="key">
<h2>${esc(sec.label)} — ${esc(ship.className)} <span class="seed">${esc(ship.seed)}</span></h2>
<p class="meta">Deck ${sec.d + 1} of ${ship.D} · frame ${sec.f + 1} of ${ship.F} · ${sec.W}×${sec.H} squares · ${DP.CONDITIONS[ship.condition]} · ${rooms.length} rooms${hull.length ? ' · outer hull exposed' : ''}</p>
<h3>Zones</h3><ul class="zones">${zones}</ul>
<h3>Exits</h3>${exits.length ? '<ul>' + exits.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '<p>None through the walls; use the ladders or lift.</p>'}
<h3>Between decks</h3><ul>${[...(sec.rooms.filter(r => r.type === 'lift' && r.cells.length).map(r => 'Lift in room ' + r.number + ' serving decks ' + (r.liftDecks || []).map(x => x + 1).join(', '))), ...sec.ladders.map(L => 'Ladder ' + L.dir + ' to deck ' + (L.dir === 'up' ? sec.d : sec.d + 2) + (L.repair ? ' (through the damage)' : '') + ' near square ' + ((L.px != null ? L.px : L.x) + 1) + ',' + ((L.py != null ? L.py : L.y) + 1))].map(t => '<li>' + esc(t) + '</li>').join('') || '<li>None</li>'}</ul>
<h3>Rooms</h3>
<table><thead><tr><th>#</th><th>Room</th><th>Zone</th><th>Size</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
${DP.ventsKeyHTML(ship, sec)}
</div>`;
  };
  // the vent layer's entry points, and where each one crawls to
  DP.ventsKeyHTML = function (ship, sec) {
    const V = sec.vents; if (!V || !V.ports.length) return '';
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const items = V.ports.map(p => { const to = p.links.slice(0, 3).map(L => DP.ventPortName(sec, L.to) + ' (' + L.dist + ' sq)').join(', '); return `<li>${esc(cap(DP.ventPortName(sec, p)))} at ${p.x + 1},${p.y + 1}${to ? ' → ' + esc(to) : ' — a dead end'}</li>`; });
    return `<h3>Vents</h3><p class="meta">${V.cells.size} squares of crawlway. Grilles open into the rooms named; shafts climb to the deck named.</p><ul class="vents">${items.join('')}</ul>`;
  };

  // o: { layout 'tiles'|'rooms'|'vents', scale, mode, theme, labels, background, key }
  DP.buildPrint = function (ship, sec, o) {
    const sheets = o.layout === 'rooms' ? roomSheets(ship, sec, o) : tileSheets(ship, sec, o);
    const key = o.key ? sheet(DP.keyHTML(ship, sec, o), `${sec.label} · key`, 'sheet-key') : '';
    return sheets + key;
  };
})();
