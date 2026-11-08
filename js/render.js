// SVG renderer. One square = one user unit. Works for the screen, print tiles and room pieces.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const K = (x, y) => x + ',' + y;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const f = (n) => (Math.round(n * 1000) / 1000).toString();

  // ---- props ------------------------------------------------------------------
  // Each drawer gets (w, h, P) where P has fill/stroke helpers; returns SVG in local coords with the back wall at the top.
  function propBody(p, P) {
    const w = (p.rot === 90 || p.rot === 270) ? p.h : p.w, h = (p.rot === 90 || p.rot === 270) ? p.w : p.h;
    const R = (x, y, ww, hh, extra) => `<rect x="${f(x)}" y="${f(y)}" width="${f(ww)}" height="${f(hh)}" ${extra || P.box}/>`;
    const C = (x, y, r, extra) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${extra || P.box}/>`;
    const L = (x1, y1, x2, y2, extra) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${extra || P.line}/>`;
    const X = (x, y, ww, hh) => L(x, y, x + ww, y + hh) + L(x + ww, y, x, y + hh);
    const acc = P.acc, acc2 = P.acc2;
    switch (p.t) {
      case 'console': return R(0.1, 0.12, w - 0.2, 0.5) + R(0.2, 0.18, w - 0.4, 0.16, acc);
      case 'chair': return C(0.5, 0.52, 0.26) + R(0.22, 0.18, 0.56, 0.12);
      case 'captain': return R(0.2, 0.2, 0.6, 0.6, P.round) + R(0.2, 0.12, 0.6, 0.16);
      case 'holo': return C(w / 2, h / 2, Math.min(w, h) / 2 - 0.25) + C(w / 2, h / 2, Math.min(w, h) / 2 - 0.5, acc) + C(w / 2, h / 2, 0.15, acc2);
      case 'table': return w === 1 && h === 1 ? C(0.5, 0.5, 0.38) : R(0.12, 0.15, w - 0.24, h - 0.3, P.round);
      case 'desk': return R(0.12, 0.12, w - 0.24, 0.55) + R(w - 0.75, 0.18, 0.45, 0.16, acc);
      case 'crate': case 'ammo': return R(0.12, 0.12, 0.76, 0.76) + X(0.12, 0.12, 0.76, 0.76) + (p.t === 'ammo' ? R(0.12, 0.42, 0.76, 0.16, acc2) : '');
      case 'bigcrate': return R(0.15, 0.15, w - 0.3, h - 0.3) + X(0.15, 0.15, w - 0.3, h - 0.3) + R(0.6, 0.6, w - 1.2, h - 1.2) + (p.broken ? L(0.3, 1.1, 1.7, 0.6, P.crack) : '');
      case 'barrel': case 'drum': return C(0.5, 0.5, 0.38) + C(0.5, 0.5, 0.2) + (p.t === 'drum' ? C(0.5, 0.5, 0.08, acc2) : '');
      case 'pallet': case 'mat': return R(0.1, 0.1, w - 0.2, h - 0.2, p.t === 'mat' ? P.soft : P.hatch) + (p.t === 'mat' ? '' : R(0.1, 0.1, w - 0.2, h - 0.2, P.outline));
      case 'bunk': case 'bed': return R(0.12, 0.1, w - 0.24, h - 0.2, p.t === 'bed' ? P.white : P.box) + R(0.22, 0.18, w - 0.44, 0.3, P.soft) + (p.t === 'bed' ? L(0.5, 1.1, 0.5, 1.6, P.red) + L(0.25, 1.35, 0.75, 1.35, P.red) : L(0.12, 0.6, w - 0.12, 0.6));
      case 'locker': case 'cabinet': case 'drawer': case 'booth': case 'suit': case 'fridge': case 'machine': case 'cryo':
        return R(0.12, 0.1, w - 0.24, h - 0.3) + (p.t === 'suit' ? C(0.5, 0.42, 0.16, acc) : p.t === 'cryo' ? C(0.5, 0.42, 0.18, acc) : p.t === 'machine' ? C(0.5, 0.45, 0.2) : p.t === 'drawer' ? L(0.2, 0.45, 0.8, 0.45) : L(0.5, 0.1, 0.5, 0.8)) + (p.t === 'fridge' ? L(0.65, 0.3, 0.65, 0.6) : '');
      case 'bench': case 'workbench': case 'counter': case 'stove': case 'slab': {
        const hh = p.t === 'counter' || p.t === 'stove' ? 0.5 : h - 0.25;
        return R(0.1, 0.1, w - 0.2, hh, p.t === 'slab' ? P.white : P.box) + (p.t === 'stove' ? C(0.3, 0.35, 0.1) + C(0.7, 0.35, 0.1) : p.t === 'workbench' ? C(0.4, 0.4, 0.08) + R(1.2, 0.3, 0.4, 0.15) : p.t === 'slab' ? R(0.3, 0.3, w - 0.6, h - 0.6, P.soft) : '');
      }
      case 'tank': case 'tubes': case 'target': case 'pump': return (p.t === 'tubes' ? R(0.1, 0.1, 0.8, 0.8) : '') + C(0.5, 0.5, 0.36, p.t === 'tubes' ? acc : P.box) + (p.t === 'target' ? C(0.5, 0.5, 0.2, P.white) + C(0.5, 0.5, 0.07, P.red) : p.t === 'pump' ? R(0.35, 0.1, 0.3, 0.35) : L(0.5, 0.14, 0.5, 0.86) + L(0.14, 0.5, 0.86, 0.5));
      case 'bigtank': return C(w / 2, h / 2, w / 2 - 0.15) + C(w / 2, h / 2, w / 2 - 0.45) + L(w / 2, 0.15, w / 2, h - 0.15) + L(0.15, h / 2, w - 0.15, h / 2);
      case 'core': case 'furnace': {
        const r = Math.min(w, h) / 2, cx = w / 2, cy = h / 2;
        let s = C(cx, cy, r - 0.1) + C(cx, cy, r - 0.45, P.glowFill);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += L(cx + Math.cos(a) * (r - 0.45), cy + Math.sin(a) * (r - 0.45), cx + Math.cos(a) * (r - 0.1), cy + Math.sin(a) * (r - 0.1)); }
        return s + C(cx, cy, r * 0.3, P.glowCore);
      }
      case 'generator': return R(0.15, 0.15, w - 0.3, h - 0.3) + C(w / 2, h / 2, 0.5) + L(0.35, 0.4, 0.35, h - 0.4) + L(w - 0.35, 0.4, w - 0.35, h - 0.4) + C(w / 2, h / 2, 0.15, acc2);
      case 'toilet': return R(0.3, 0.1, 0.4, 0.3) + C(0.5, 0.62, 0.24, P.white);
      case 'sink': return R(0.2, 0.1, 0.6, 0.45) + C(0.5, 0.33, 0.14, P.white);
      case 'shower': return R(0.15, 0.15, 0.7, 0.7, P.dashed) + C(0.5, 0.5, 0.08);
      case 'planter': return R(0.1, 0.1, w - 0.2, h - 0.2) + C(0.5, 0.5, 0.25, P.green) + C(1.5, 0.5, 0.25, P.green) + C(1.0, 0.5, 0.18, P.green);
      case 'cannon': case 'turret': return R(0.2, 1.2, w - 0.4, h - 1.4) + C(w / 2, h - 0.9, 0.55) + R(w / 2 - 0.2, 0.1, 0.4, 1.6) + C(w / 2, h - 0.9, 0.2, acc2);
      case 'rack': return R(0.12, 0.1, 0.76, 0.5) + L(0.3, 0.1, 0.3, 0.6) + L(0.5, 0.1, 0.5, 0.6) + L(0.7, 0.1, 0.7, 0.6);
      case 'couch': case 'pew': return R(0.1, 0.12, w - 0.2, 0.3) + R(0.1, 0.42, w - 0.2, p.t === 'pew' ? 0.28 : 0.42, P.soft) + (p.t === 'couch' ? R(0.1, 0.12, w - 0.2, 0.72, P.outline) : '');
      case 'dish': return C(w / 2, h / 2, w / 2 - 0.15) + C(w / 2, h / 2, w / 2 - 0.45, P.soft) + C(w / 2, h / 2, 0.12) + L(w / 2, 0.15, w / 2, h - 0.15) + L(0.15, h / 2, w - 0.15, h / 2);
      case 'pod': return R(0.15, 0.12, w - 0.3, h - 0.24, P.round) + C(0.5, 0.55, 0.22, acc);
      case 'ladder': return R(0.2, 0.15, 0.6, 0.7) + L(0.3, 0.3, 0.7, 0.3) + L(0.3, 0.48, 0.7, 0.48) + L(0.3, 0.66, 0.7, 0.66) + (p.dir !== 'down' ? `<path d="M0.5 0.05 L0.68 0.28 L0.32 0.28Z" ${acc2}/>` : '') + (p.dir !== 'up' ? `<path d="M0.5 1.0 L0.68 0.78 L0.32 0.78Z" ${acc2}/>` : '');
      case 'altar': return R(0.15, 0.12, w - 0.3, h - 0.3) + L(w / 2, 0.25, w / 2, h - 0.35, acc2) + L(w / 2 - 0.2, 0.42, w / 2 + 0.2, 0.42, acc2);
      case 'lectern': return R(0.3, 0.3, 0.4, 0.4) + R(0.2, 0.15, 0.6, 0.3);
      case 'cage': { let s = R(0.1, 0.1, w - 0.2, h - 0.2, P.outline); for (let i = 1; i < 8; i++) s += L(0.1 + i * (w - 0.2) / 8, 0.1, 0.1 + i * (w - 0.2) / 8, h - 0.1, P.thin); return s + R(0.25, 0.3, 0.5, 1.4, P.box); }
      case 'shelf': return R(0.1, 0.1, 0.8, 0.5) + L(0.1, 0.27, 0.9, 0.27) + L(0.1, 0.44, 0.9, 0.44);
      case 'server': return R(0.15, 0.1, 0.7, 0.75) + L(0.25, 0.3, 0.75, 0.3) + L(0.25, 0.5, 0.75, 0.5) + C(0.72, 0.68, 0.05, acc) + C(0.6, 0.68, 0.05, acc2);
      case 'pillar': return `<path d="M0.3 0.2 L0.7 0.2 L0.8 0.3 L0.8 0.7 L0.7 0.8 L0.3 0.8 L0.2 0.7 L0.2 0.3Z" ${P.box}/>`;
      case 'shuttle': return `<path d="M${f(w / 2)} 0.2 L${f(w - 0.4)} 1.6 L${f(w - 0.2)} ${f(h - 1.2)} L${f(w - 0.6)} ${f(h - 0.3)} L0.6 ${f(h - 0.3)} L0.2 ${f(h - 1.2)} L0.4 1.6Z" ${P.box}/>` + C(w / 2, 1.3, 0.35, acc) + R(0.8, h - 1.1, w - 1.6, 0.4, P.soft);
      case 'coffin': return `<path d="M0.3 0.15 L0.7 0.15 L0.88 0.6 L0.75 ${f(h - 0.15)} L0.25 ${f(h - 0.15)} L0.12 0.6Z" ${P.box}/>`;
      case 'egg': case 'cocoon': return `<ellipse cx="0.5" cy="0.52" rx="0.3" ry="0.38" ${P.alien}/>` + (p.t === 'cocoon' ? L(0.3, 0.3, 0.7, 0.75, P.thin) : '');
      case 'forklift': return R(0.2, 0.7, 0.6, 1.1) + L(0.3, 0.1, 0.3, 0.7) + L(0.7, 0.1, 0.7, 0.7) + C(0.5, 1.25, 0.12, acc2);
      case 'vent': return R(0.15, 0.1, 0.7, 0.6) + L(0.25, 0.25, 0.75, 0.25, P.thin) + L(0.25, 0.4, 0.75, 0.4, P.thin) + L(0.25, 0.55, 0.75, 0.55, P.thin);
      case 'reliquary': return `<path d="M0.5 0.1 L0.9 0.5 L0.5 0.9 L0.1 0.5Z" ${P.box}/>` + C(0.5, 0.5, 0.15, acc2);
      case 'scanner': return R(0.15, 0.15, w - 0.3, h - 0.3, P.white) + C(w / 2, h / 2, 0.7) + C(w / 2, h / 2, 0.45, acc) + R(0.4, h / 2 - 0.3, w - 0.8, 0.6, P.soft);
      default: return R(0.12, 0.12, w - 0.24, h - 0.24);
    }
  }

  function decorBody(d, mode, T) {
    const dark = mode === 'plan' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)';
    switch (d.t) {
      case 'stain': return `<ellipse cx="${f(d.x)}" cy="${f(d.y)}" rx="${f(d.r)}" ry="${f(d.r * 0.7)}" transform="rotate(${f(d.a)} ${f(d.x)} ${f(d.y)})" fill="${mode === 'plan' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.28)'}"/>`;
      case 'scorch': return `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="url(#scorch)"/>`;
      case 'gore': return `<ellipse cx="${f(d.x)}" cy="${f(d.y)}" rx="${f(d.r)}" ry="${f(d.r * 0.6)}" transform="rotate(${f(d.a)} ${f(d.x)} ${f(d.y)})" fill="${mode === 'plan' ? 'rgba(0,0,0,0.12)' : 'rgba(120,10,20,0.55)'}"/>`;
      case 'goo': return `<ellipse cx="${f(d.x)}" cy="${f(d.y)}" rx="${f(d.r)}" ry="${f(d.r * 0.75)}" transform="rotate(${f(d.a)} ${f(d.x)} ${f(d.y)})" fill="${mode === 'plan' ? 'rgba(0,0,0,0.1)' : 'rgba(150,60,170,0.45)'}"/>`;
      case 'pool': return `<ellipse cx="${f(d.x)}" cy="${f(d.y)}" rx="${f(d.r)}" ry="${f(d.r * 0.6)}" transform="rotate(${f(d.a)} ${f(d.x)} ${f(d.y)})" fill="${mode === 'plan' ? 'rgba(0,0,0,0.08)' : 'rgba(40,90,120,0.6)'}" stroke="${dark}" stroke-width="0.03"/>`;
      case 'debris': { let s = ''; for (let i = 0; i < 3; i++) { const a = d.a + i * 120, r = d.r * 0.6; const x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r; s += `<path d="M${f(x)} ${f(y)} l0.12 -0.08 l0.1 0.12 l-0.14 0.1Z" fill="${mode === 'plan' ? '#888' : 'rgba(20,20,20,0.7)'}"/>`; } return s; }
      case 'rubble': { let s = ''; for (let i = 0; i < 5; i++) { const a = (d.a + i * 72) * Math.PI / 180, r = d.r * (0.3 + (i % 3) * 0.25); const x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r; const k = 0.12 + (i % 2) * 0.1; s += `<path d="M${f(x)} ${f(y)} l${f(k)} -${f(k * 0.6)} l${f(k * 0.8)} ${f(k)} l-${f(k * 1.3)} ${f(k * 0.7)}Z" fill="${mode === 'plan' ? '#bbb' : '#6a6a6a'}" stroke="${dark}" stroke-width="0.02"/>`; } return s; }
      case 'girder': return `<line x1="${f(d.x - d.r)}" y1="${f(d.y)}" x2="${f(d.x + d.r)}" y2="${f(d.y)}" transform="rotate(${f(d.a)} ${f(d.x)} ${f(d.y)})" stroke="${mode === 'plan' ? '#555' : '#2a2a2a'}" stroke-width="0.18" stroke-dasharray="0.3 0.12"/>`;
      case 'bones': return `<g transform="rotate(${f(d.a)} ${f(d.x)} ${f(d.y)})" stroke="${mode === 'plan' ? '#777' : '#e8e0cc'}" stroke-width="0.05" fill="none"><line x1="${f(d.x - 0.3)}" y1="${f(d.y)}" x2="${f(d.x + 0.3)}" y2="${f(d.y)}"/><circle cx="${f(d.x - 0.3)}" cy="${f(d.y)}" r="0.06"/><circle cx="${f(d.x + 0.3)}" cy="${f(d.y)}" r="0.06"/></g>`;
      case 'candles': return `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="0.07" fill="${mode === 'plan' ? '#444' : '#ffd35c'}"/><circle cx="${f(d.x + 0.2)}" cy="${f(d.y + 0.1)}" r="0.06" fill="${mode === 'plan' ? '#444' : '#ffb347'}"/>`;
      case 'hazardfloor': return `<rect x="${f(d.x - d.r)}" y="${f(d.y - d.r * 0.5)}" width="${f(d.r * 2)}" height="${f(d.r)}" fill="url(#hazard)" opacity="${mode === 'plan' ? 0.5 : 0.8}"/>`;
      case 'landing': return `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="none" stroke="${mode === 'plan' ? '#999' : T.hazard}" stroke-width="0.12" stroke-dasharray="0.5 0.3"/>`;
      case 'chevron': return `<path d="M${f(d.x - 0.35)} ${f(d.y + 0.2)} L${f(d.x)} ${f(d.y - 0.2)} L${f(d.x + 0.35)} ${f(d.y + 0.2)}" fill="none" stroke="${mode === 'plan' ? '#bbb' : 'rgba(255,255,255,0.18)'}" stroke-width="0.12"/>`;
      case 'pillar': return `<rect x="${f(d.x - 0.18)}" y="${f(d.y - 0.18)}" width="0.36" height="0.36" fill="${mode === 'plan' ? '#777' : T.wall}" stroke="${T.wallEdge}" stroke-width="0.03"/>`;
      case 'pipe': { const off = { N: [0, 0.25], S: [0, 0.75], W: [0.25, 0], E: [0.75, 0] }[d.side]; const vert = d.side === 'W' || d.side === 'E'; const x1 = d.x + (vert ? off[0] : 0.0), y1 = d.y + (vert ? 0 : off[1]), x2 = d.x2 + (vert ? off[0] : 1), y2 = d.y2 + (vert ? 1 : off[1]); return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${mode === 'plan' ? '#999' : 'rgba(0,0,0,0.5)'}" stroke-width="0.1"/><line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${mode === 'plan' ? '#ddd' : T.prop}" stroke-width="0.05"/>`; }
      case 'rails': return '';
      default: return '';
    }
  }

  // ---- doors ------------------------------------------------------------------
  function doorSVG(d, mode, T, floorFill) {
    const horiz = d.side === 'N'; const w = d.w || 1;
    const len = w - 0.3; const thick = d.kind === 'airlock' || d.kind === 'bulkhead' ? 0.34 : 0.26;
    const cx = horiz ? d.x + w / 2 : d.x, cy = horiz ? d.y : d.y + w / 2;
    const rot = horiz ? 0 : 90;
    const g = (inner) => `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${rot})">${inner}</g>`;
    const cut = `<rect x="${f(-len / 2)}" y="-0.2" width="${f(len)}" height="0.4" fill="${floorFill}"/>`;
    const edge = mode === 'plan' ? '#000' : T.doorEdge, face = mode === 'plan' ? '#fff' : T.door;
    const sw = 0.045;
    if (d.kind === 'join') return g(`<rect x="${f(-w / 2 + 0.05)}" y="-0.2" width="${f(w - 0.1)}" height="0.4" fill="${floorFill}"/>`);
    if (d.kind === 'exit' && d.hatch) {
      const arrow = d.exitSide === 'N' || d.exitSide === 'W' ? -1 : 1;
      return `<g class="exit" data-side="${d.exitSide}" style="cursor:pointer">` + g(cut + `<rect x="-0.28" y="-0.17" width="0.56" height="0.34" fill="url(#hazard)" stroke="${edge}" stroke-width="${sw}"/><path d="M-0.15 ${f(arrow * 0.22)} L0 ${f(arrow * 0.42)} L0.15 ${f(arrow * 0.22)}" fill="none" stroke="${mode === 'plan' ? '#000' : T.accent}" stroke-width="0.08"/>`) + '</g>';
    }
    if (d.kind === 'exit') {
      const arrow = d.exitSide === 'N' || d.exitSide === 'W' ? -1 : 1;
      return `<g class="exit" data-side="${d.exitSide}" style="cursor:pointer">` + g(`<rect x="${f(-w / 2 + 0.05)}" y="-0.3" width="${f(w - 0.1)}" height="0.6" fill="${floorFill}"/>` +
        `<path d="M-0.3 ${f(arrow * 0.05)} L0 ${f(arrow * 0.35)} L0.3 ${f(arrow * 0.05)}" fill="none" stroke="${mode === 'plan' ? '#000' : T.accent}" stroke-width="0.1"/>` +
        `<line x1="${f(-w / 2 + 0.05)}" y1="0" x2="${f(w / 2 - 0.05)}" y2="0" stroke="${mode === 'plan' ? '#000' : T.accent}" stroke-width="0.06" stroke-dasharray="0.25 0.15"/>`) + '</g>';
    }
    if (d.kind === 'hatch') return g(cut + `<rect x="-0.25" y="-0.14" width="0.5" height="0.28" fill="${face}" stroke="${edge}" stroke-width="${sw}" stroke-dasharray="0.08 0.06"/>`);
    let s = cut;
    if (d.state === 'open') {
      // door slid open: a stub at each end
      s += `<rect x="${f(-len / 2)}" y="${f(-thick / 2)}" width="0.18" height="${f(thick)}" fill="${face}" stroke="${edge}" stroke-width="${sw}"/><rect x="${f(len / 2 - 0.18)}" y="${f(-thick / 2)}" width="0.18" height="${f(thick)}" fill="${face}" stroke="${edge}" stroke-width="${sw}"/>`;
      if (d.kind === 'airlock' || d.kind === 'bulkhead') s += `<rect x="${f(-len / 2)}" y="${f(-thick / 2)}" width="${f(len)}" height="${f(thick)}" fill="none" stroke="${edge}" stroke-width="${sw}" stroke-dasharray="0.1 0.08"/>`;
      return g(s);
    }
    const fill = d.kind === 'airlock' || d.kind === 'bulkhead' ? 'url(#hazard)' : face;
    s += `<rect x="${f(-len / 2)}" y="${f(-thick / 2)}" width="${f(len)}" height="${f(thick)}" fill="${fill}" stroke="${edge}" stroke-width="${sw}"/>`;
    if (d.kind === 'cargo' || d.kind === 'bay' || (d.kind === 'bulkhead' && w >= 2)) s += `<line x1="0" y1="${f(-thick / 2)}" x2="0" y2="${f(thick / 2)}" stroke="${edge}" stroke-width="${sw}"/>`;
    if (d.kind === 'door' && mode !== 'plan') s += `<rect x="${f(-len / 2 + 0.06)}" y="-0.04" width="0.08" height="0.08" fill="${T.accent}"/><rect x="${f(len / 2 - 0.14)}" y="-0.04" width="0.08" height="0.08" fill="${T.accent}"/>`;
    if (d.state === 'sealed') s += `<line x1="-0.2" y1="-0.2" x2="0.2" y2="0.2" stroke="${mode === 'plan' ? '#000' : T.accent2}" stroke-width="0.08"/><line x1="0.2" y1="-0.2" x2="-0.2" y2="0.2" stroke="${mode === 'plan' ? '#000' : T.accent2}" stroke-width="0.08"/>`;
    else if (d.state === 'jammed') s += `<path d="M${f(-len / 2 + 0.1)} -0.05 L-0.1 0.08 L0.05 -0.1 L${f(len / 2 - 0.1)} 0.06" fill="none" stroke="${edge}" stroke-width="0.05"/>`;
    else if (d.state === 'closed' && d.kind === 'bulkhead') s += `<circle cx="0" cy="0" r="0.08" fill="${edge}"/>`;
    return g(s);
  }

  // ---- main ---------------------------------------------------------------------
  // opts: mode 'color'|'plan', theme, labels 'numbers'|'names'|'both'|'none', background 'space'|'white'|'none',
  //       clip {x,y,w,h} in squares, rooms Set(ids) or null, widthAttr/heightAttr strings, pages [{x,y,w,h,label}], zones bool
  DP.renderSector = function (ship, sec, opts) {
    opts = opts || {};
    const mode = opts.mode || 'color';
    const T = DP.THEMES[opts.theme] || DP.THEMES.fleet;
    const clip = opts.clip || { x: -0.5, y: -0.5, w: sec.W + 1, h: sec.H + 1 };
    const only = opts.rooms || null;
    const show = (r) => r.cells.length && (!only || only.has(r.id));
    const tint = (r) => mode === 'plan' ? '#ffffff' : (r.type === 'void' ? T.tints.void : T.tints[(DP.ROOMS[r.type] || { tint: 'cargo' }).tint] || T.tints.cargo);
    const out = [];
    const sizeAttr = (opts.widthAttr ? `width="${opts.widthAttr}" height="${opts.heightAttr}"` : '');
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(clip.x)} ${f(clip.y)} ${f(clip.w)} ${f(clip.h)}" ${sizeAttr} font-family="'IBM Plex Sans Condensed','Arial Narrow',Arial,sans-serif">`);
    const gridStroke = mode === 'plan' ? '#c8c8c8' : T.grid;
    out.push(`<defs>
<pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0 L0 0 0 1" fill="none" stroke="${gridStroke}" stroke-width="${mode === 'plan' ? 0.025 : 0.035}"/></pattern>
<pattern id="hazard" width="0.4" height="0.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.4" height="0.4" fill="${mode === 'plan' ? '#fff' : T.hazard}"/><rect width="0.2" height="0.4" fill="${mode === 'plan' ? '#000' : '#1a1a1a'}"/></pattern>
<pattern id="hatch" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="0.3" stroke="${mode === 'plan' ? '#555' : T.propEdge}" stroke-width="0.05"/></pattern>
<pattern id="voidfill" width="0.5" height="0.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="0.5" stroke="${mode === 'plan' ? '#999' : 'rgba(255,255,255,0.08)'}" stroke-width="0.08"/></pattern>
<radialGradient id="scorch"><stop offset="0" stop-color="#000" stop-opacity="${mode === 'plan' ? 0.35 : 0.75}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${T.glow}" stop-opacity="0.9"/><stop offset="1" stop-color="${T.glow}" stop-opacity="0"/></radialGradient>
</defs>`);
    // background
    const bg = opts.background || 'space';
    if (bg !== 'none') {
      out.push(`<rect x="${f(clip.x)}" y="${f(clip.y)}" width="${f(clip.w)}" height="${f(clip.h)}" fill="${mode === 'plan' || bg === 'white' ? '#ffffff' : T.space}"/>`);
      if (mode === 'plan') out.push(`<rect x="${f(clip.x)}" y="${f(clip.y)}" width="${f(clip.w)}" height="${f(clip.h)}" fill="url(#grid)"/>`);
      else if (bg === 'space') { const g = DP.makeRng(sec.label + '/stars'); for (let i = 0; i < 60; i++) out.push(`<circle cx="${f(clip.x + g.next() * clip.w)}" cy="${f(clip.y + g.next() * clip.h)}" r="${f(0.03 + g.next() * 0.05)}" fill="${T.star}" opacity="${f(0.3 + g.next() * 0.6)}"/>`); }
    }
    // prop paint
    const P = mode === 'plan'
      ? { box: 'fill="#e6e6e6" stroke="#000" stroke-width="0.04"', line: 'stroke="#000" stroke-width="0.04" fill="none"', thin: 'stroke="#000" stroke-width="0.025" fill="none"', acc: 'fill="#9a9a9a" stroke="#000" stroke-width="0.03"', acc2: 'fill="#6a6a6a" stroke="#000" stroke-width="0.03"', round: 'rx="0.15" fill="#e6e6e6" stroke="#000" stroke-width="0.04"', soft: 'fill="#cfcfcf" stroke="none"', white: 'fill="#fff" stroke="#000" stroke-width="0.04"', hatch: 'fill="url(#hatch)" stroke="none"', outline: 'fill="none" stroke="#000" stroke-width="0.04"', dashed: 'fill="none" stroke="#000" stroke-width="0.04" stroke-dasharray="0.1 0.08"', red: 'stroke="#000" stroke-width="0.06"', green: 'fill="#bdbdbd" stroke="#000" stroke-width="0.03"', glowFill: 'fill="#bbb" stroke="#000" stroke-width="0.04"', glowCore: 'fill="#555" stroke="none"', alien: 'fill="#d0d0d0" stroke="#000" stroke-width="0.04"', crack: 'stroke="#000" stroke-width="0.05" fill="none"' }
      : { box: `fill="${T.propFill}" stroke="${T.propEdge}" stroke-width="0.04"`, line: `stroke="${T.propEdge}" stroke-width="0.04" fill="none"`, thin: `stroke="${T.propEdge}" stroke-width="0.025" fill="none"`, acc: `fill="${T.accent}" stroke="${T.propEdge}" stroke-width="0.03"`, acc2: `fill="${T.accent2}" stroke="${T.propEdge}" stroke-width="0.03"`, round: `rx="0.15" fill="${T.propFill}" stroke="${T.propEdge}" stroke-width="0.04"`, soft: `fill="${T.prop}" stroke="none"`, white: `fill="#f2f4f6" stroke="${T.propEdge}" stroke-width="0.04"`, hatch: 'fill="url(#hatch)" stroke="none"', outline: `fill="none" stroke="${T.propEdge}" stroke-width="0.04"`, dashed: `fill="none" stroke="${T.propEdge}" stroke-width="0.04" stroke-dasharray="0.1 0.08"`, red: 'stroke="#c0392b" stroke-width="0.06"', green: `fill="#5e9c4a" stroke="${T.propEdge}" stroke-width="0.03"`, glowFill: `fill="url(#glow)" stroke="${T.propEdge}" stroke-width="0.04"`, glowCore: `fill="${T.glow}" stroke="none"`, alien: `fill="#8a4f9e" stroke="${T.propEdge}" stroke-width="0.04"`, crack: `stroke="${T.propEdge}" stroke-width="0.05" fill="none"` };

    // floors
    const loopsOf = new Map();
    for (const r of sec.rooms) { if (!show(r)) continue; const loops = DP.traceLoops(r.set, sec.cuts); loopsOf.set(r.id, loops); const d = loops.map(DP.loopPath).join(' ');
      out.push(`<path d="${d}" fill="${tint(r)}" fill-rule="evenodd"/>`);
      if (r.type === 'void') out.push(`<path d="${d}" fill="url(#voidfill)" fill-rule="evenodd"/>`);
      if (opts.grid !== false) out.push(`<path d="${d}" fill="url(#grid)" fill-rule="evenodd"/>`);
      if (r.type === 'lift') { const b = r.bbox; out.push(`<rect x="${f(b.x0 + 0.2)}" y="${f(b.y0 + 0.2)}" width="${f(b.w - 0.4)}" height="${f(b.h - 0.4)}" fill="none" stroke="${mode === 'plan' ? '#000' : T.accent}" stroke-width="0.06" stroke-dasharray="0.2 0.1"/><text x="${f(b.x0 + b.w / 2)}" y="${f(b.y0 + b.h / 2 + 0.12)}" text-anchor="middle" font-size="0.4" font-weight="700" fill="${mode === 'plan' ? '#000' : T.textOnDark}">LIFT</text>` + (r.liftDecks ? `<text x="${f(b.x0 + b.w / 2)}" y="${f(b.y0 + b.h / 2 + 0.5)}" text-anchor="middle" font-size="0.24" fill="${mode === 'plan' ? '#000' : T.textOnDark}">D${r.liftDecks[0] + 1}–D${r.liftDecks[r.liftDecks.length - 1] + 1}</text>` : '')); }
    }
    // zone overlay for the key
    if (opts.zones) for (const z of sec.zones) out.push(`<rect x="${f(z.rect.x + 0.15)}" y="${f(z.rect.y + 0.15)}" width="${f(z.rect.w - 0.3)}" height="${f(z.rect.h - 0.3)}" fill="none" stroke="${T.accent2}" stroke-width="0.12" stroke-dasharray="0.6 0.3" opacity="0.8"/><text x="${f(z.rect.x + 0.5)}" y="${f(z.rect.y + 1.1)}" font-size="0.9" font-weight="700" fill="${T.accent2}" opacity="0.9">${z.letter}</text>`);
    // decor, then props
    for (const d of sec.decor) if (!only || only.has(d.room)) out.push(decorBody(d, mode, T));
    for (const p of sec.props) {
      if (only && !only.has(p.room)) continue;
      const lw = (p.rot === 90 || p.rot === 270) ? p.h : p.w, lh = (p.rot === 90 || p.rot === 270) ? p.w : p.h;
      out.push(`<g transform="translate(${f(p.x + p.w / 2)} ${f(p.y + p.h / 2)}) rotate(${p.rot}) translate(${f(-lw / 2)} ${f(-lh / 2)})">${propBody(p, P)}</g>`);
    }
    // walls
    const wallEdge = mode === 'plan' ? '#000' : T.wallEdge, wallFace = mode === 'plan' ? '#000' : T.wall;
    const ox = sec.l * sec.W, oy = sec.f * sec.H;
    const cls = (e) => { const hk = DP.hullKind(ship, sec.d, ox + e.nx, oy + e.ny); if (hk === 2) return 'torn'; if (e.diag || hk === 0) return 'hull'; const outside = e.nx < 0 || e.ny < 0 || e.nx >= sec.W || e.ny >= sec.H; if (!outside && !sec.hull.has(K(e.nx, e.ny))) return 'torn'; return outside ? 'section' : 'wall'; };
    const segs = { wall: [], section: [], hull: [], torn: [] };
    for (const r of sec.rooms) { if (!show(r)) continue; for (const loop of loopsOf.get(r.id)) for (const run of DP.mergeRuns(loop, cls)) segs[run.cls].push(`M${run.x1} ${run.y1}L${run.x2} ${run.y2}`); }
    const widths = { wall: [0.22, 0.12], section: [0.34, 0.2], hull: [0.55, 0.36], torn: [0.4, 0.22] };
    for (const k of ['wall', 'section', 'hull', 'torn']) {
      if (!segs[k].length) continue; const d = segs[k].join('');
      if (k === 'torn') { out.push(`<path d="${d}" stroke="${mode === 'plan' ? '#000' : wallEdge}" stroke-width="${f(widths[k][0])}" fill="none" stroke-linecap="butt" stroke-dasharray="0.55 0.2 0.3 0.15"/><path d="${d}" stroke="${mode === 'plan' ? '#777' : wallFace}" stroke-width="${f(widths[k][1])}" fill="none" stroke-linecap="butt" stroke-dasharray="0.4 0.35 0.2 0.3"/>`); continue; }
      if (mode === 'plan') out.push(`<path d="${d}" stroke="#000" stroke-width="${f(widths[k][1] * (k === 'wall' ? 1.1 : 1))}" fill="none" stroke-linecap="square"/>`);
      else out.push(`<path d="${d}" stroke="${wallEdge}" stroke-width="${f(widths[k][0])}" fill="none" stroke-linecap="square"/><path d="${d}" stroke="${wallFace}" stroke-width="${f(widths[k][1])}" fill="none" stroke-linecap="square"/>`);
    }
    // collapsed walls
    for (const e of sec.rubble) { const horiz = e.side === 'N'; out.push(`<line x1="${f(e.x)}" y1="${f(e.y)}" x2="${f(e.x + (horiz ? 1 : 0))}" y2="${f(e.y + (horiz ? 0 : 1))}" stroke="${mode === 'plan' ? '#666' : '#6a6460'}" stroke-width="0.22" stroke-dasharray="0.15 0.12"/>`); }
    // doors (skip those between a shown and a hidden room only when rendering single pieces)
    for (const d of sec.doors) {
      if (only && !(only.has(d.a) || (d.b >= 0 && only.has(d.b)))) continue;
      const ra = sec.rooms[d.a]; const floorFill = tint(ra);
      out.push(doorSVG(d, mode, T, floorFill));
    }
    // exit labels, painted on the floor of the boarding passage so they survive page clipping
    for (const ex of sec.exits) {
      if (only && !only.has(ex.room)) continue;
      const nf = ex.side === 'N' ? sec.f - 1 : ex.side === 'S' ? sec.f + 1 : sec.f, nl = ex.side === 'W' ? sec.l - 1 : ex.side === 'E' ? sec.l + 1 : sec.l;
      const label = (ex.hatch ? 'hatch to ' : 'to ') + DP.sectorLabel(ship, sec.d, nf, nl);
      let x, y, rot = 0;
      const mid = ex.t + (ex.w || 2) / 2;
      if (ex.side === 'N') { x = mid; y = 1.75; } else if (ex.side === 'S') { x = mid; y = sec.H - 1.55; } else if (ex.side === 'W') { x = 1.6; y = mid; rot = -90; } else { x = sec.W - 1.6; y = mid; rot = 90; }
      out.push(`<text class="exit" data-side="${ex.side}" style="cursor:pointer" x="${f(x)}" y="${f(y)}" transform="rotate(${rot} ${f(x)} ${f(y)})" text-anchor="middle" font-size="${ex.hatch ? 0.26 : 0.36}" font-weight="700" fill="${mode === 'plan' ? '#000' : T.textOnDark}" stroke="${mode === 'plan' ? '#fff' : 'rgba(0,0,0,0.7)'}" stroke-width="0.09" paint-order="stroke">${esc(label)}</text>`);
    }
    // labels
    const labels = opts.labels || 'numbers';
    if (labels !== 'none') for (const r of sec.rooms) {
      if (!show(r) || r.kind !== 'room' || !r.number || !r.labelCell) continue;
      const [lx, ly] = r.labelCell; const cx = lx + 0.5, cy = ly + 0.5;
      if (labels === 'numbers' || labels === 'both') out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="0.34" fill="${mode === 'plan' ? '#fff' : '#ffffff'}" stroke="${mode === 'plan' ? '#000' : T.wallEdge}" stroke-width="0.04"/><text x="${f(cx)}" y="${f(cy + 0.15)}" text-anchor="middle" font-size="${r.number >= 100 ? 0.3 : 0.42}" font-weight="700" fill="#000">${r.number}</text>`);
      if (labels === 'names' || labels === 'both') { const dy = labels === 'both' ? 0.75 : 0.12; out.push(`<text x="${f(cx)}" y="${f(cy + dy)}" text-anchor="middle" font-size="0.32" font-weight="600" fill="${mode === 'plan' ? '#000' : T.textOnDark}" stroke="${mode === 'plan' ? '#fff' : 'rgba(0,0,0,0.6)'}" stroke-width="0.08" paint-order="stroke">${esc(r.name)}</text>`); }
    }
    if (opts.cut) out.push(`<rect x="${f(opts.cut.x)}" y="${f(opts.cut.y)}" width="${f(opts.cut.w)}" height="${f(opts.cut.h)}" fill="none" stroke="#000" stroke-width="0.02" stroke-dasharray="0.25 0.12"/>`);
    // page overlay
    if (opts.pages) for (const pg of opts.pages) out.push(`<rect x="${f(pg.x)}" y="${f(pg.y)}" width="${f(pg.w)}" height="${f(pg.h)}" fill="none" stroke="${T.accent2}" stroke-width="0.08" stroke-dasharray="0.4 0.25"/><text x="${f(pg.x + 0.3)}" y="${f(pg.y + 0.9)}" font-size="0.8" font-weight="700" fill="${T.accent2}" opacity="0.85">${pg.label}</text>`);
    out.push('</svg>');
    return out.join('\n');
  };
})();
