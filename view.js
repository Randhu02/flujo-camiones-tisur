// ============================================================
//   Modo Vista - TISUR  (solo lectura, sin simulación)
// ============================================================

const escenario  = document.getElementById('escenario');
const mundo      = document.getElementById('mundo');
const layoutImg  = document.getElementById('layout');
const svg        = document.getElementById('capa-svg');
const zoomNivel  = document.getElementById('zoom-nivel');

const COLOR_ZONA = '#3b82f6';

const vista = { escala: 1, offsetX: 0, offsetY: 0, minEscala: 0.1, maxEscala: 8 };
const app = { elementos: [], contadorId: 0 };

let arrastrando = false;
let arrastroInicio = null;
let flujoAnimacion = 0;
let ultimoTsFlujo = 0;
let filtroActual = 'todos';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

// ============================================================
// POI_TIPOS
// ============================================================
const POI_TIPOS = {
  balanza: {
    nombre: 'Balanza', color: '#f59e0b', tituloDefault: 'Balanza',
    dibujar(color) {
      const g = el('g');
      g.appendChild(el('rect', { x:-22, y:4, width:44, height:14, rx:2, fill:'#3a3f47', stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('rect', { x:-3, y:-14, width:6, height:20, fill:'#6b7280', stroke:'#000', 'stroke-width':1.2 }));
      g.appendChild(el('line', { x1:-22, y1:-14, x2:22, y2:-14, stroke:'#000', 'stroke-width':2.5 }));
      g.appendChild(el('path', { d:'M -22,-14 L -30,-4 L -14,-4 Z', fill:color, stroke:'#000', 'stroke-width':1.2 }));
      g.appendChild(el('path', { d:'M 22,-14 L 14,-4 L 30,-4 Z', fill:color, stroke:'#000', 'stroke-width':1.2 }));
      g.appendChild(el('line', { x1:-22, y1:-14, x2:-22, y2:-10, stroke:'#000', 'stroke-width':1 }));
      g.appendChild(el('line', { x1:22, y1:-14, x2:22, y2:-10, stroke:'#000', 'stroke-width':1 }));
      g.appendChild(el('circle', { cx:0, cy:-14, r:3, fill:'#fff', stroke:'#000', 'stroke-width':1.5 }));
      return g;
    }
  },
  almacen: {
    nombre: 'Almacén', color: '#8b5cf6', tituloDefault: 'Almacén',
    dibujar(color) {
      const g = el('g');
      g.appendChild(el('rect', { x:-26, y:-8, width:52, height:24, rx:2, fill:color, stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('polygon', { points:'-30,-8 0,-26 30,-8', fill:'#4c1d95', stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('rect', { x:-22, y:-2, width:8, height:8, fill:'#fbbf24', stroke:'#000', 'stroke-width':1 }));
      g.appendChild(el('rect', { x:14, y:-2, width:8, height:8, fill:'#fbbf24', stroke:'#000', 'stroke-width':1 }));
      g.appendChild(el('rect', { x:-8, y:4, width:16, height:12, fill:'#1f2937', stroke:'#000', 'stroke-width':1.2 }));
      g.appendChild(el('rect', { x:14, y:-22, width:6, height:10, fill:'#374151', stroke:'#000', 'stroke-width':1 }));
      return g;
    }
  },
  muelle: {
    nombre: 'Muelle', color: '#0ea5e9', tituloDefault: 'Muelle',
    dibujar(color) {
      const g = el('g');
      g.appendChild(el('path', { d:'M -30,26 Q -22,22 -14,26 T 2,26 T 18,26 T 34,26', fill:'none', stroke:'#0ea5e9', 'stroke-width':2, opacity:0.7 }));
      [[-22],[-6],[10],[20]].forEach(([x]) => {
        g.appendChild(el('rect', { x, y:12, width:4, height:14, fill:'#78350f', stroke:'#000', 'stroke-width':1 }));
      });
      g.appendChild(el('rect', { x:-28, y:2, width:56, height:10, rx:2, fill:color, stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('line', { x1:-14, y1:2, x2:-14, y2:-22, stroke:'#000', 'stroke-width':2.5 }));
      g.appendChild(el('line', { x1:-14, y1:-22, x2:12, y2:-22, stroke:'#000', 'stroke-width':2.5 }));
      g.appendChild(el('line', { x1:-14, y1:-12, x2:8, y2:-22, stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('line', { x1:10, y1:-22, x2:10, y2:-14, stroke:'#000', 'stroke-width':1.5 }));
      return g;
    }
  },
  silo: {
    nombre: 'Silo', color: '#84cc16', tituloDefault: 'Silo',
    dibujar(color) {
      const g = el('g');
      g.appendChild(el('rect', { x:-14, y:-26, width:28, height:40, fill:color, stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('path', { d:'M -14,-26 Q 0,-40 14,-26 Z', fill:'#4d7c0f', stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('polygon', { points:'-14,14 14,14 0,26', fill:'#4d7c0f', stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('line', { x1:-14, y1:-14, x2:14, y2:-14, stroke:'#000', 'stroke-width':1, opacity:0.5 }));
      g.appendChild(el('line', { x1:-14, y1:-2, x2:14, y2:-2, stroke:'#000', 'stroke-width':1, opacity:0.5 }));
      g.appendChild(el('line', { x1:-14, y1:8, x2:14, y2:8, stroke:'#000', 'stroke-width':1, opacity:0.5 }));
      g.appendChild(el('line', { x1:14, y1:-20, x2:14, y2:12, stroke:'#000', 'stroke-width':1.2 }));
      return g;
    }
  },
  tanque: {
    nombre: 'Tanque', color: '#ef4444', tituloDefault: 'Tanque',
    dibujar(color) {
      const g = el('g');
      g.appendChild(el('rect', { x:-26, y:-14, width:52, height:28, rx:14, fill:color, stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('ellipse', { cx:-26, cy:0, rx:6, ry:14, fill:'#991b1b', stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('ellipse', { cx:26, cy:0, rx:6, ry:14, fill:'#991b1b', stroke:'#000', 'stroke-width':1.5 }));
      g.appendChild(el('line', { x1:-12, y1:-14, x2:-12, y2:14, stroke:'#000', 'stroke-width':1.2, opacity:0.5 }));
      g.appendChild(el('line', { x1:12, y1:-14, x2:12, y2:14, stroke:'#000', 'stroke-width':1.2, opacity:0.5 }));
      g.appendChild(el('rect', { x:-20, y:14, width:6, height:10, fill:'#374151', stroke:'#000', 'stroke-width':1 }));
      g.appendChild(el('rect', { x:14, y:14, width:6, height:10, fill:'#374151', stroke:'#000', 'stroke-width':1 }));
      g.appendChild(el('rect', { x:-3, y:-20, width:6, height:8, fill:'#6b7280', stroke:'#000', 'stroke-width':1 }));
      g.appendChild(el('circle', { cx:0, cy:-22, r:4, fill:'#f59e0b', stroke:'#000', 'stroke-width':1.2 }));
      return g;
    }
  }
};

// ============================================================
// FLECHAS SVG
// ============================================================
function longitudPuntos(puntos) {
  let t = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    t += Math.hypot(puntos[i+1].x - puntos[i].x, puntos[i+1].y - puntos[i].y);
  }
  return t;
}
function puntoEnDistancia(puntos, dist) {
  let acum = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i+1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (dist <= acum + len) {
      const t = (dist - acum) / len;
      return { x: a.x + dx*t, y: a.y + dy*t, ang: Math.atan2(dy, dx) * 180 / Math.PI };
    }
    acum += len;
  }
  const a = puntos[puntos.length-2], b = puntos[puntos.length-1];
  return { x:b.x, y:b.y, ang: Math.atan2(b.y-a.y, b.x-a.x) * 180 / Math.PI };
}
function generarFlechasSVG(puntos, color, offset = 0, conMarcas = false) {
  const SEPARACION = 34, LARGO = 14, ANCHO = 12;
  const total = longitudPuntos(puntos);
  let c = '';
  if (total === 0) return c;
  for (let d = (offset % SEPARACION); d < total; d += SEPARACION) {
    if (d < 8 || total - d < 8) continue;
    const p = puntoEnDistancia(puntos, d);
    const x1 = p.x - LARGO/2, x2 = p.x + LARGO/2;
    const y1 = p.y - ANCHO/2, y2 = p.y + ANCHO/2;
    c += `<polygon points="${x1},${y1} ${x2},${p.y} ${x1},${y2}" fill="${color}" stroke="#000" stroke-width="1" vector-effect="non-scaling-stroke" transform="rotate(${p.ang} ${p.x} ${p.y})" />`;
  }
  if (conMarcas && puntos.length >= 2) {
    const ini = puntos[0], fin = puntos[puntos.length-1];
    c += `<circle cx="${ini.x}" cy="${ini.y}" r="7" fill="#fff" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" />`;
    c += `<circle cx="${fin.x}" cy="${fin.y}" r="7" fill="#fff" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" />`;
  }
  return c;
}

// ============================================================
// RECONSTRUIR ELEMENTOS (sin etiquetas)
// ============================================================
function reconstruirElemento(e) {
  const grupo = el('g', { 'data-id': e.id, 'data-tipo': e.tipo, class: `elemento ${e.tipo}` });

  if (e.tipo === 'ruta') {
    const flechas = el('g', { class: 'flechas' });
    flechas.innerHTML = generarFlechasSVG(e.puntos, e.color, flujoAnimacion, false);
    grupo.appendChild(flechas);

    const ini = e.puntos[0], fin = e.puntos[e.puntos.length-1];

    grupo.appendChild(el('circle', { cx:ini.x, cy:ini.y, r:7, fill:'#fff', stroke:e.color, 'stroke-width':3, 'vector-effect':'non-scaling-stroke' }));
    grupo.appendChild(el('circle', { cx:fin.x, cy:fin.y, r:7, fill:'#fff', stroke:e.color, 'stroke-width':3, 'vector-effect':'non-scaling-stroke' }));

  } else if (POI_TIPOS[e.tipo]) {
    const config = POI_TIPOS[e.tipo];
    grupo.setAttribute('transform', `translate(${e.x},${e.y})`);
    grupo.appendChild(el('circle', { cx:0, cy:0, r:34, fill:config.color, stroke:'#000', 'stroke-width':2, opacity:0.9 }));
    grupo.appendChild(config.dibujar(config.color));
    const et = el('text', { x:0, y:54, 'text-anchor':'middle', fill:'#fff', 'font-size':16, 'font-weight':700, 'paint-order':'stroke', stroke:'#000', 'stroke-width':4 });
    et.textContent = e.titulo;
    grupo.appendChild(et);

  } else if (e.tipo === 'zona') {
    const pol = el('polygon', { fill:'rgba(59,130,246,0.25)', stroke:COLOR_ZONA, 'stroke-width':3, 'vector-effect':'non-scaling-stroke' });
    pol.setAttribute('points', e.puntos.map(p => `${p.x},${p.y}`).join(' '));
    grupo.appendChild(pol);

    const cx = e.puntos.reduce((a,p) => a+p.x, 0) / e.puntos.length;
    const cy = e.puntos.reduce((a,p) => a+p.y, 0) / e.puntos.length;
    const et = el('text', { x:cx, y:cy, 'text-anchor':'middle', fill:'#fff', 'font-size':20, 'font-weight':700, 'paint-order':'stroke', stroke:'#000', 'stroke-width':4 });
    et.textContent = e.titulo;
    grupo.appendChild(et);
  }

  svg.appendChild(grupo);
}

// ============================================================
// ZOOM / PANEO
// ============================================================
function ajustarTamanoMundo() {
  const w = layoutImg.naturalWidth, h = layoutImg.naturalHeight;
  if (!w || !h) return;
  mundo.style.width  = w + 'px';
  mundo.style.height = h + 'px';
  svg.setAttribute('width',  w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
}
function aplicarTransformacion() {
  mundo.style.transform = `translate(${vista.offsetX}px, ${vista.offsetY}px) scale(${vista.escala})`;
  zoomNivel.textContent = Math.round(vista.escala * 100) + '%';
}
function centrarVista() {
  const w = layoutImg.naturalWidth, h = layoutImg.naturalHeight;
  if (!w || !h) return;
  const rect = escenario.getBoundingClientRect();
  const escala = Math.min(rect.width / w, rect.height / h) * 0.95;
  vista.escala = escala;
  vista.offsetX = (rect.width - w * escala) / 2;
  vista.offsetY = (rect.height - h * escala) / 2;
  aplicarTransformacion();
}
function zoomCentrado(factor) {
  const rect = escenario.getBoundingClientRect();
  const mx = rect.width/2, my = rect.height/2;
  const nueva = Math.min(vista.maxEscala, Math.max(vista.minEscala, vista.escala * factor));
  const ratio = nueva / vista.escala;
  vista.offsetX = mx - (mx - vista.offsetX) * ratio;
  vista.offsetY = my - (my - vista.offsetY) * ratio;
  vista.escala = nueva;
  aplicarTransformacion();
}

escenario.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = escenario.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 1/1.15;
  const nueva = Math.min(vista.maxEscala, Math.max(vista.minEscala, vista.escala * factor));
  const ratio = nueva / vista.escala;
  vista.offsetX = mx - (mx - vista.offsetX) * ratio;
  vista.offsetY = my - (my - vista.offsetY) * ratio;
  vista.escala = nueva;
  aplicarTransformacion();
}, { passive: false });

escenario.addEventListener('mousedown', (e) => {
  if (e.target.closest('.zoom-controles')) return;
  e.preventDefault();
  arrastrando = true;
  arrastroInicio = { x: e.clientX - vista.offsetX, y: e.clientY - vista.offsetY };
  escenario.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', (e) => {
  if (!arrastrando) return;
  vista.offsetX = e.clientX - arrastroInicio.x;
  vista.offsetY = e.clientY - arrastroInicio.y;
  aplicarTransformacion();
});
window.addEventListener('mouseup', () => {
  if (arrastrando) { arrastrando = false; escenario.style.cursor = ''; }
});

document.getElementById('btn-reset-vista').addEventListener('click', centrarVista);
document.getElementById('zoom-in').addEventListener('click',  () => zoomCentrado(1.25));
document.getElementById('zoom-out').addEventListener('click', () => zoomCentrado(1/1.25));
document.getElementById('zoom-fit').addEventListener('click', centrarVista);

// ============================================================
// FILTRO
// ============================================================
function aplicarFiltro() {
  svg.querySelectorAll('g.elemento.ruta').forEach(g => {
    const id = parseInt(g.dataset.id, 10);
    const e = app.elementos.find(x => x.id === id);
    if (!e) return;
    let visible = true;
    if (filtroActual === 'ingreso') visible = (e.subtipo === 'ruta-ingreso');
    if (filtroActual === 'salida')  visible = (e.subtipo === 'ruta-salida');
    g.style.display = visible ? '' : 'none';
  });
}
document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    filtroActual = btn.dataset.filtro;
    aplicarFiltro();
  });
});

// ============================================================
// ANIMACIÓN DE FLECHAS (marching ants)
// ============================================================
function loop(ts) {
  if (!ultimoTsFlujo) ultimoTsFlujo = ts;
  const dtFlujo = (ts - ultimoTsFlujo) / 1000;
  ultimoTsFlujo = ts;
  flujoAnimacion += dtFlujo * 20;
  if (flujoAnimacion > 1e6) flujoAnimacion = 0;

  svg.querySelectorAll('g.elemento.ruta').forEach(g => {
    if (g.style.display === 'none') return;
    const flechas = g.querySelector('g.flechas');
    if (!flechas) return;
    const id = parseInt(g.dataset.id, 10);
    const e = app.elementos.find(x => x.id === id);
    if (!e || e.tipo !== 'ruta') return;
    flechas.innerHTML = generarFlechasSVG(e.puntos, e.color, flujoAnimacion, false);
  });

  requestAnimationFrame(loop);
}

// ============================================================
// CARGA DE DATOS
// ============================================================
async function cargarDatos() {
  // 1) ?data=URL
  const params = new URLSearchParams(location.search);
  const dataUrl = params.get('data');
  if (dataUrl) {
    try {
      const r = await fetch(dataUrl);
      const d = await r.json();
      if (d.elementos) return aplicarDatos(d);
    } catch (err) { console.warn('?data falló:', err); }
  }

  // 2) datos.json
  try {
    const r = await fetch('datos.json', { cache: 'no-cache' });
    if (r.ok) {
      const d = await r.json();
      if (d.elementos) return aplicarDatos(d);
    }
  } catch (err) { console.warn('datos.json falló:', err); }

  // 3) localStorage
  try {
    const raw = localStorage.getItem('tisur_flujo_camiones_v1');
    if (raw) {
      const d = JSON.parse(raw);
      if (d.elementos) return aplicarDatos(d);
    }
  } catch (err) { console.warn('localStorage falló:', err); }

  console.warn('⚠️ No hay datos. Exporta desde el editor y sube datos.json.');
}

function aplicarDatos(datos) {
  app.elementos = datos.elementos || [];
  app.contadorId = datos.contadorId || 0;
  app.elementos.forEach(e => reconstruirElemento(e));
  aplicarFiltro();
}

// ============================================================
// ARRANQUE
// ============================================================
let inicializado = false;
async function inicializar() {
  if (inicializado) return;
  inicializado = true;
  ajustarTamanoMundo();
  centrarVista();
  await cargarDatos();
  requestAnimationFrame(loop);
}
layoutImg.addEventListener('load', inicializar);
if (layoutImg.complete && layoutImg.naturalWidth) inicializar();