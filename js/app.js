// UI glue: state in the URL hash, controls, preview, navigation, print and export.
(function () {
  const DP = globalThis.DP;
  const $ = (id) => document.getElementById(id);
  const DEFAULTS = { s: '', c: 'W', z: 'm', k: 'intact', d: 1, f: 1, l: 1, m: 'color', t: 'fleet', n: 'numbers' };
  let state = Object.assign({}, DEFAULTS);
  let ship = null, sec = null, cache = new Map();

  function readHash() {
    const h = location.hash.replace(/^#/, '');
    const q = new URLSearchParams(h);
    for (const k of Object.keys(DEFAULTS)) if (q.has(k)) state[k] = q.get(k);
    ['d', 'f', 'l'].forEach(k => state[k] = parseInt(state[k], 10) || 0);
    if (!state.s) state.s = DP.newSeed();
  }
  function writeHash() {
    const q = new URLSearchParams();
    for (const k of Object.keys(DEFAULTS)) q.set(k, state[k]);
    history.replaceState(null, '', '#' + q.toString());
    $('code').textContent = q.toString();
  }
  function shipKey() { return `${state.s}|${state.c}|${state.z}|${state.k}`; }
  function visited() { try { return JSON.parse(localStorage.getItem('deckplan:visited:' + shipKey()) || '[]'); } catch (e) { return []; } }
  function markVisited() { try { const v = new Set(visited()); v.add(`${state.d},${state.f},${state.l}`); localStorage.setItem('deckplan:visited:' + shipKey(), JSON.stringify([...v])); } catch (e) { } }

  function rebuild() {
    ship = DP.makeShip({ seed: state.s, cls: state.c, size: state.z, condition: state.k });
    state.k = ship.condition; state.c = ship.cls;
    if (!DP.sectorLive(ship, state.d, state.f, state.l)) { let found = false; for (let d = 1; d < ship.D && !found; d++) for (let f = 1; f < ship.F && !found; f++) for (let l = 0; l < ship.Lat && !found; l++) if (DP.sectorLive(ship, d, f, l)) { state.d = d; state.f = f; state.l = l; found = true; } }
    const key = shipKey() + `|${state.d},${state.f},${state.l}`;
    if (!cache.has(key)) { if (cache.size > 40) cache.clear(); cache.set(key, DP.buildSector(ship, state.d, state.f, state.l)); }
    sec = cache.get(key);
    markVisited();
    writeHash();
    renderAll();
  }

  function renderOpts(extra) {
    return Object.assign({ mode: state.m, theme: state.t, labels: state.n, background: 'space', zones: $('zones').checked, pages: $('pagegrid').checked ? DP.pageTiles(sec, +$('pscale').value).pages : null }, extra || {});
  }
  function renderAll() {
    $('seed').value = state.s; $('cls').value = state.c; $('size').value = state.z; $('condition').value = state.k; $('mode').value = state.m; $('theme').value = state.t; $('labels').value = state.n;
    $('condition').disabled = !!ship.C.forceCondition;
    const zoom = +$('zoom').value;
    $('map').innerHTML = DP.renderSector(ship, sec, renderOpts({ widthAttr: (sec.W + 1) * zoom + 'px', heightAttr: (sec.H + 1) * zoom + 'px' }));
    $('seclabel').textContent = sec.label;
    $('secmeta').textContent = `· ${ship.className} · deck ${sec.d + 1} of ${ship.D} · ${sec.zones.map(z => z.name).join(', ')}`;
    $('keypanel').innerHTML = DP.keyHTML(ship, sec, {});
    renderOverview();
  }
  function renderOverview() {
    const decks = $('decks'); decks.innerHTML = '';
    for (let d = 0; d < ship.D; d++) { const b = document.createElement('button'); b.textContent = 'D' + (d + 1); if (d === state.d) b.className = 'current'; b.onclick = () => go(d, state.f, state.l); decks.appendChild(b); }
    // the deck seen from above, prow to the left, port at the bottom; sectors are the grid cells
    const g = ship.geo, vis = new Set(visited());
    const W = ship.W, H = ship.H;
    const pts = [];
    for (let Y = 0; Y < g.TL; Y++) if (g.halfL[state.d][Y] > 0) pts.push([Y, g.XC - g.halfL[state.d][Y]]);
    for (let Y = g.TL - 1; Y >= 0; Y--) if (g.halfL[state.d][Y] > 0) pts.push([Y + 1, g.XC + g.halfR[state.d][Y]]);
    const hull = pts.length ? 'M' + pts.map(p => p[0] + ' ' + (g.TW - p[1])).join('L') + 'Z' : '';
    let cells = '';
    for (let f = 0; f < ship.F; f++) for (let l = 0; l < ship.Lat; l++) {
      if (!DP.sectorLive(ship, state.d, f, l)) continue;
      const cur = f === state.f && l === state.l, v = vis.has(`${state.d},${f},${l}`);
      cells += `<rect class="sec${cur ? ' current' : v ? ' visited' : ''}" data-f="${f}" data-l="${l}" x="${f * H}" y="${g.TW - (l + 1) * W}" width="${H}" height="${W}"><title>${DP.sectorLabel(ship, state.d, f, l)}</title></rect>`;
    }
    let labels = '';
    for (let f = 0; f < ship.F; f++) labels += `<text x="${f * H + H / 2}" y="${g.TW + 9}" text-anchor="middle" font-size="7">F${f + 1}</text>`;
    const latNames = ship.Lat === 3 ? ['P', 'C', 'S'] : [];
    latNames.forEach((n, l) => { labels += `<text x="-4" y="${g.TW - (l + 0.5) * W + 2.5}" text-anchor="end" font-size="7">${n}</text>`; });
    $('overview').innerHTML = `<svg viewBox="-12 -4 ${g.TL + 16} ${g.TW + 16}" class="ovsvg"><path d="${hull}" class="hull"/>${cells}${labels}</svg>`;
    $('overview').querySelectorAll('rect.sec').forEach(r => r.addEventListener('click', () => go(state.d, +r.getAttribute('data-f'), +r.getAttribute('data-l'))));
  }
  function go(d, f, l) { if (!DP.sectorLive(ship, d, f, l)) return; state.d = d; state.f = f; state.l = l; rebuild(); $('map').parentElement.scrollTop = 0; }

  // ---- export -----------------------------------------------------------------
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function fullSVG() { return DP.renderSector(ship, sec, renderOpts({ widthAttr: (sec.W + 1) * 100 + 'px', heightAttr: (sec.H + 1) * 100 + 'px', pages: null })); }
  function exportPNG() {
    const svg = fullSVG();
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = (sec.W + 1) * 100; c.height = (sec.H + 1) * 100; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => download(`deckplan-${state.s}-${sec.label}.png`, b), 'image/png'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function exportSVG() { download(`deckplan-${state.s}-${sec.label}.svg`, new Blob([fullSVG()], { type: 'image/svg+xml' })); }
  function doPrint() {
    const o = { layout: $('playout').value, scale: +$('pscale').value, mode: state.m, theme: state.t, labels: state.n, background: $('pbg').value, key: $('pkey').checked };
    $('print-root').innerHTML = DP.buildPrint(ship, sec, o);
    setTimeout(() => window.print(), 50);
  }

  // ---- wiring -------------------------------------------------------------------
  function fill(sel, entries) { const el = $(sel); el.innerHTML = ''; for (const [v, t] of entries) { const o = document.createElement('option'); o.value = v; o.textContent = t; el.appendChild(o); } }
  function init() {
    fill('cls', DP.CLASS_ORDER.map(k => [k, DP.CLASSES[k].name]));
    fill('size', Object.entries(DP.SECTOR_SIZES).map(([k, v]) => [k, v.name]));
    fill('condition', Object.entries(DP.CONDITIONS));
    fill('theme', DP.THEME_ORDER.map(k => [k, DP.THEMES[k].name]));
    fill('pscale', Object.entries(DP.SCALES));
    readHash();
    const bind = (id, key, fn) => $(id).addEventListener('change', () => { state[key] = $(id).value; (fn || rebuild)(); });
    bind('cls', 'c'); bind('size', 'z'); bind('condition', 'k'); bind('mode', 'm', renderAll); bind('theme', 't', renderAll); bind('labels', 'n', renderAll);
    $('seed').addEventListener('change', () => { state.s = $('seed').value.trim().toUpperCase() || DP.newSeed(); rebuild(); });
    $('newseed').onclick = () => { state.s = DP.newSeed(); rebuild(); };
    $('randomship').onclick = () => { state.s = DP.newSeed(); const r = DP.makeRng(state.s); state.c = r.pick(DP.CLASS_ORDER); state.k = r.weighted([['intact', 3], ['rundown', 3], ['derelict', 2]]); state.d = 1; state.f = 1; state.l = 1; rebuild(); };
    ['zones', 'pagegrid'].forEach(id => $(id).addEventListener('change', renderAll));
    $('pscale').addEventListener('change', renderAll);
    $('zoom').addEventListener('input', renderAll);
    $('prevdeck').onclick = () => go(state.d - 1, state.f, state.l);
    $('nextdeck').onclick = () => go(state.d + 1, state.f, state.l);
    $('print').onclick = doPrint; $('png').onclick = exportPNG; $('svg').onclick = exportSVG;
    $('copy').onclick = () => { navigator.clipboard.writeText(location.href).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => $('copy').textContent = 'Copy link', 1200); }); };
    $('map').addEventListener('click', (e) => {
      const ex = e.target.closest('.exit'); if (!ex) return;
      const side = ex.getAttribute('data-side');
      go(state.d + 0, state.f + (side === 'N' ? -1 : side === 'S' ? 1 : 0), state.l + (side === 'W' ? -1 : side === 'E' ? 1 : 0));
    });
    $('keypanel').addEventListener('mouseover', (e) => { const tr = e.target.closest('tr'); if (!tr) return; });
    window.addEventListener('hashchange', () => { readHash(); rebuild(); });
    rebuild();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
