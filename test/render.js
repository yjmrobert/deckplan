// Render one sector (and optionally its print sheets) to files for a visual check.
const fs = require('fs'), vm = require('vm'), path = require('path');
globalThis.DP = {};
for (const f of ['rng', 'data', 'hull', 'geom', 'layout', 'furnish', 'vents', 'render', 'print']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
const DP = globalThis.DP;
const [seed = 'ALPHA1', cls = 'W', size = 'm', cond = 'intact', d = 2, f = 3, l = 1, mode = 'color', theme = 'fleet', out = 'out'] = process.argv.slice(2);
const ship = DP.makeShip({ seed, cls, size, condition: cond, build: process.env.BUILD || 'organic' });
const sec = DP.buildSector(ship, +d, +f, +l);
fs.mkdirSync(out, { recursive: true });
const px = 40;
fs.writeFileSync(path.join(out, 'sector.svg'), DP.renderSector(ship, sec, { mode, theme, labels: 'numbers', widthAttr: (sec.W + 1) * px + 'px', heightAttr: (sec.H + 1) * px + 'px' }));
fs.writeFileSync(path.join(out, 'vents.svg'), DP.renderVents(ship, sec, { mode, theme, widthAttr: (sec.W + 1) * px + 'px', heightAttr: (sec.H + 1) * px + 'px' }));
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const sheets = DP.buildPrint(ship, sec, { layout: process.env.LAYOUT || 'tiles', scope: process.env.SCOPE || 'sector', scale: 1, mode, theme, labels: process.env.LABELS || 'numbers', background: 'white', key: true });
fs.writeFileSync(path.join(out, 'print.html'), `<!doctype html><html><head><meta charset="utf-8"><style>${css}\n#print-root{display:block}.sheet{position:relative;width:8in;height:10.5in;overflow:hidden;border:1px solid #f00;margin:10px;background:#fff}.sheet svg{position:absolute;left:0;top:0}.sheet-side{position:absolute;right:0;top:0;width:.45in;height:10.5in;writing-mode:vertical-rl;font-size:9pt;color:#333}.sheet-pieces .pieces{position:relative;width:7.5in;height:10.4in}.piece{position:absolute}.piece svg{position:static;display:block}.piece-tag{position:absolute;left:.27in;top:.02in;font-size:7pt;background:rgba(255,255,255,.85)}.sheet-key{padding:.1in .6in .1in .1in;font-size:10pt;color:#000}</style></head><body style="background:#888"><div id="print-root">${sheets}</div></body></html>`);
console.log('wrote', out, sec.label, sec.rooms.filter(r => r.number).length, 'rooms', sec.props.length, 'props');
