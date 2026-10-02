// ============================================================
//   Simulación Flujo de Camiones - TISUR
//   Paso 9: Toggle de nombres de rutas
// ============================================================

const escenario  = document.getElementById('escenario');
const mundo      = document.getElementById('mundo');
const layoutImg  = document.getElementById('layout');
const svg        = document.getElementById('capa-svg');
const listaEl    = document.getElementById('lista-elementos');
const infoModo   = document.getElementById('info-modo');
const zoomNivel  = document.getElementById('zoom-nivel');

const btnPlay    = document.getElementById('btn-sim-play');
const btnReset   = document.getElementById('btn-sim-reset');
const sliderVel  = document.getElementById('slider-vel');
const velLabel   = document.getElementById('vel-label');

const mEnCirc     = document.getElementById('m-en-circ');
const mIngresados = document.getElementById('m-ingresados');
const mSalidos    = document.getElementById('m-salidos');
const mTiempo     = document.getElementById('m-tiempo');

// Modal
const modal       = document.getElementById('modal');
const modalTitulo = document.getElementById('modal-titulo');
const modalInput  = document.getElementById('modal-input');
const modalOk     = document.getElementById('modal-aceptar');
const modalCancel = document.getElementById('modal-cancelar');

// ============================================================
// CONSTANTES Y ESTADO
// ============================================================
const COLOR_INGRESO = '#4ade80';
const COLOR_SALIDA  = '#991b1b';
const COLOR_ZONA    = '#3b82f6';
const STORAGE_KEY   = 'tisur_flujo_camiones_v1';

const vista = { escala: 1, offsetX: 0, offsetY: 0, minEscala: 0.1, maxEscala: 8 };

const app = {
  herramienta: 'ruta-ingreso',
  elementos: [],
  enProgreso: null,
  contadorId: 0
};

const sim = {
  activa: false,
  velocidad: 1,
  camiones: [],
  ingresados: 0,
  salidos: 0,
  tiempos: [],
  timerSpawn: 0,
  intervaloMin: 900,
  intervaloMax: 1800,
  ultimoTimestamp: 0
};

let arrastrando = false;
let arrastroInicio = null;
let espacioPresionado = false;
let botonPulsado = null;

// Preview en vivo (rubber band)
let nodoPreview = null;
let lineaPreview = null;
let poligonoPreview = null;

// Arrastre de vértices
let verticeArrastrado = null;
let huboArrastreVertice = false;

// Ramificación de rutas
let ramificacionEnProgreso = null;

// Animación de flechas (marching ants)
let flujoAnimacion = 0;
let ultimoTsFlujo = 0;

// Filtro de rutas
let filtroActual = 'todos';   // 'todos' | 'ingreso' | 'salida'

// Mostrar/ocultar nombres de rutas
let mostrarNombres = true;

// ============================================================
// HELPERS SVG
// ============================================================
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

// ============================================================
// CATÁLOGO DE PUNTOS DE INTERÉS (infraestructura)
// ============================================================
const POI_TIPOS = {
  balanza: {
    nombre: 'Balanza',
    color:  '#f59e0b',
    tituloDefault: 'Balanza',
    dibujar(color) {
      const g = el('g');
      const base = el('rect', { x: -22, y: 4, width: 44, height: 14, rx: 2,
        fill: '#3a3f47', stroke: '#000', 'stroke-width': 1.5 });
      const col = el('rect', { x: -3, y: -14, width: 6, height: 20,
        fill: '#6b7280', stroke: '#000', 'stroke-width': 1.2 });
      const brazo = el('line', { x1: -22, y1: -14, x2: 22, y2: -14,
        stroke: '#000', 'stroke-width': 2.5 });
      const platoIzq = el('path', { d: 'M -22,-14 L -30,-4 L -14,-4 Z',
        fill: color, stroke: '#000', 'stroke-width': 1.2 });
      const platoDer = el('path', { d: 'M 22,-14 L 14,-4 L 30,-4 Z',
        fill: color, stroke: '#000', 'stroke-width': 1.2 });
      const cableIzq = el('line', { x1: -22, y1: -14, x2: -22, y2: -10,
        stroke: '#000', 'stroke-width': 1 });
      const cableDer = el('line', { x1: 22, y1: -14, x2: 22, y2: -10,
        stroke: '#000', 'stroke-width': 1 });
      const pivote = el('circle', { cx: 0, cy: -14, r: 3,
        fill: '#fff', stroke: '#000', 'stroke-width': 1.5 });
      g.appendChild(base); g.appendChild(col); g.appendChild(brazo);
      g.appendChild(cableIzq); g.appendChild(cableDer);
      g.appendChild(platoIzq); g.appendChild(platoDer); g.appendChild(pivote);
      return g;
    }
  },

  almacen: {
    nombre: 'Almacén',
    color:  '#8b5cf6',
    tituloDefault: 'Almacén',
    dibujar(color) {
      const g = el('g');
      const base = el('rect', { x: -26, y: -8, width: 52, height: 24, rx: 2,
        fill: color, stroke: '#000', 'stroke-width': 1.5 });
      const techo = el('polygon', { points: '-30,-8 0,-26 30,-8',
        fill: '#4c1d95', stroke: '#000', 'stroke-width': 1.5 });
      const puerta = el('rect', { x: -8, y: 4, width: 16, height: 12,
        fill: '#1f2937', stroke: '#000', 'stroke-width': 1.2 });
      const v1 = el('rect', { x: -22, y: -2, width: 8, height: 8,
        fill: '#fbbf24', stroke: '#000', 'stroke-width': 1 });
      const v2 = el('rect', { x: 14, y: -2, width: 8, height: 8,
        fill: '#fbbf24', stroke: '#000', 'stroke-width': 1 });
      const chim = el('rect', { x: 14, y: -22, width: 6, height: 10,
        fill: '#374151', stroke: '#000', 'stroke-width': 1 });
      g.appendChild(base); g.appendChild(techo); g.appendChild(v1);
      g.appendChild(v2); g.appendChild(puerta); g.appendChild(chim);
      return g;
    }
  },

  muelle: {
    nombre: 'Muelle',
    color:  '#0ea5e9',
    tituloDefault: 'Muelle',
    dibujar(color) {
      const g = el('g');
      const base = el('rect', { x: -28, y: 2, width: 56, height: 10, rx: 2,
        fill: color, stroke: '#000', 'stroke-width': 1.5 });
      const p1 = el('rect', { x: -22, y: 12, width: 4, height: 14, fill: '#78350f', stroke: '#000', 'stroke-width': 1 });
      const p2 = el('rect', { x: -6,  y: 12, width: 4, height: 14, fill: '#78350f', stroke: '#000', 'stroke-width': 1 });
      const p3 = el('rect', { x: 10,  y: 12, width: 4, height: 14, fill: '#78350f', stroke: '#000', 'stroke-width': 1 });
      const p4 = el('rect', { x: 20,  y: 12, width: 4, height: 14, fill: '#78350f', stroke: '#000', 'stroke-width': 1 });
      const agua = el('path', {
        d: 'M -30,26 Q -22,22 -14,26 T 2,26 T 18,26 T 34,26',
        fill: 'none', stroke: '#0ea5e9', 'stroke-width': 2, opacity: 0.7 });
      const mastil = el('line', { x1: -14, y1: 2, x2: -14, y2: -22, stroke: '#000', 'stroke-width': 2.5 });
      const pluma = el('line', { x1: -14, y1: -22, x2: 12, y2: -22, stroke: '#000', 'stroke-width': 2.5 });
      const tirante = el('line', { x1: -14, y1: -12, x2: 8, y2: -22, stroke: '#000', 'stroke-width': 1.5 });
      const gancho = el('line', { x1: 10, y1: -22, x2: 10, y2: -14, stroke: '#000', 'stroke-width': 1.5 });
      g.appendChild(agua);
      g.appendChild(p1); g.appendChild(p2); g.appendChild(p3); g.appendChild(p4);
      g.appendChild(base); g.appendChild(mastil);
      g.appendChild(pluma); g.appendChild(tirante); g.appendChild(gancho);
      return g;
    }
  },

  silo: {
    nombre: 'Silo',
    color:  '#84cc16',
    tituloDefault: 'Silo',
    dibujar(color) {
      const g = el('g');
      const cuerpo = el('rect', { x: -14, y: -26, width: 28, height: 40,
        fill: color, stroke: '#000', 'stroke-width': 1.5 });
      const tapa = el('path', { d: 'M -14,-26 Q 0,-40 14,-26 Z',
        fill: '#4d7c0f', stroke: '#000', 'stroke-width': 1.5 });
      const baseCono = el('polygon', { points: '-14,14 14,14 0,26',
        fill: '#4d7c0f', stroke: '#000', 'stroke-width': 1.5 });
      const anillo1 = el('line', { x1: -14, y1: -14, x2: 14, y2: -14, stroke: '#000', 'stroke-width': 1, opacity: 0.5 });
      const anillo2 = el('line', { x1: -14, y1: -2,  x2: 14, y2: -2,  stroke: '#000', 'stroke-width': 1, opacity: 0.5 });
      const anillo3 = el('line', { x1: -14, y1: 8,   x2: 14, y2: 8,   stroke: '#000', 'stroke-width': 1, opacity: 0.5 });
      const esc = el('line', { x1: 14, y1: -20, x2: 14, y2: 12, stroke: '#000', 'stroke-width': 1.2 });
      g.appendChild(cuerpo); g.appendChild(tapa); g.appendChild(baseCono);
      g.appendChild(anillo1); g.appendChild(anillo2); g.appendChild(anillo3);
      g.appendChild(esc);
      return g;
    }
  },

  tanque: {
    nombre: 'Tanque',
    color:  '#ef4444',
    tituloDefault: 'Tanque',
    dibujar(color) {
      const g = el('g');
      const cuerpo = el('rect', { x: -26, y: -14, width: 52, height: 28, rx: 14,
        fill: color, stroke: '#000', 'stroke-width': 1.5 });
      const tapaIzq = el('ellipse', { cx: -26, cy: 0, rx: 6, ry: 14,
        fill: '#991b1b', stroke: '#000', 'stroke-width': 1.5 });
      const tapaDer = el('ellipse', { cx: 26, cy: 0, rx: 6, ry: 14,
        fill: '#991b1b', stroke: '#000', 'stroke-width': 1.5 });
      const b1 = el('line', { x1: -12, y1: -14, x2: -12, y2: 14, stroke: '#000', 'stroke-width': 1.2, opacity: 0.5 });
      const b2 = el('line', { x1: 12,  y1: -14, x2: 12,  y2: 14, stroke: '#000', 'stroke-width': 1.2, opacity: 0.5 });
      const pata1 = el('rect', { x: -20, y: 14, width: 6, height: 10, fill: '#374151', stroke: '#000', 'stroke-width': 1 });
      const pata2 = el('rect', { x: 14,  y: 14, width: 6, height: 10, fill: '#374151', stroke: '#000', 'stroke-width': 1 });
      const valvula = el('rect', { x: -3, y: -20, width: 6, height: 8, fill: '#6b7280', stroke: '#000', 'stroke-width': 1 });
      const rueda = el('circle', { cx: 0, cy: -22, r: 4, fill: '#f59e0b', stroke: '#000', 'stroke-width': 1.2 });
      g.appendChild(cuerpo); g.appendChild(tapaIzq); g.appendChild(tapaDer);
      g.appendChild(b1); g.appendChild(b2);
      g.appendChild(pata1); g.appendChild(pata2);
      g.appendChild(valvula); g.appendChild(rueda);
      return g;
    }
  }
};

// ============================================================
// PREVIEW EN VIVO (rubber band)
// ============================================================
function crearPreviewPunto() {
  if (nodoPreview) return;
  nodoPreview = el('circle', {
    r: 6,
    fill: 'none',
    stroke: '#fff',
    'stroke-width': 2,
    'stroke-dasharray': '4 3',
    'vector-effect': 'non-scaling-stroke',
    'pointer-events': 'none',
    opacity: 0.85
  });
  svg.appendChild(nodoPreview);
}

function crearPreviewLinea(color) {
  if (lineaPreview) return;
  lineaPreview = el('line', {
    stroke: color,
    'stroke-width': 3,
    'stroke-dasharray': '6 5',
    'vector-effect': 'non-scaling-stroke',
    'pointer-events': 'none',
    opacity: 0.7,
    'stroke-linecap': 'round'
  });
  svg.appendChild(lineaPreview);
}

function crearPreviewPoligono(color) {
  if (poligonoPreview) return;
  poligonoPreview = el('polygon', {
    fill: 'rgba(59,130,246,0.15)',
    stroke: color,
    'stroke-width': 2,
    'stroke-dasharray': '6 4',
    'vector-effect': 'non-scaling-stroke',
    'pointer-events': 'none',
    opacity: 0.9
  });
  svg.appendChild(poligonoPreview);
}

function limpiarPreview() {
  if (nodoPreview)    { nodoPreview.remove(); nodoPreview = null; }
  if (lineaPreview)   { lineaPreview.remove(); lineaPreview = null; }
  if (poligonoPreview){ poligonoPreview.remove(); poligonoPreview = null; }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
function ajustarTamanoMundo() {
  const w = layoutImg.naturalWidth;
  const h = layoutImg.naturalHeight;
  if (!w || !h) return;
  mundo.style.width  = w + 'px';
  mundo.style.height = h + 'px';
  svg.setAttribute('width',  w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
}

// ============================================================
// ZOOM / PANEO
// ============================================================
function aplicarTransformacion() {
  mundo.style.transform =
    `translate(${vista.offsetX}px, ${vista.offsetY}px) scale(${vista.escala})`;
  zoomNivel.textContent = Math.round(vista.escala * 100) + '%';
}

escenario.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = escenario.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const nuevaEscala = Math.min(vista.maxEscala, Math.max(vista.minEscala, vista.escala * factor));
  const ratio = nuevaEscala / vista.escala;
  vista.offsetX = mx - (mx - vista.offsetX) * ratio;
  vista.offsetY = my - (my - vista.offsetY) * ratio;
  vista.escala = nuevaEscala;
  aplicarTransformacion();
}, { passive: false });

escenario.addEventListener('mousedown', (e) => {
  const esPan =
    e.button === 1 ||
    e.button === 2 ||
    (e.button === 0 && (app.herramienta === 'mover' || espacioPresionado));

  if (esPan) {
    e.preventDefault();
    arrastrando = true;
    botonPulsado = e.button;
    arrastroInicio = { x: e.clientX - vista.offsetX, y: e.clientY - vista.offsetY };
    escenario.classList.add('arrastrando');
  }
});

window.addEventListener('mousemove', (e) => {
  if (arrastrando) {
    vista.offsetX = e.clientX - arrastroInicio.x;
    vista.offsetY = e.clientY - arrastroInicio.y;
    aplicarTransformacion();
    return;
  }

  if (verticeArrastrado) {
    huboArrastreVertice = true;
    const p = coordsMundo(e);
    const { elemento, indiceVertice, nodo } = verticeArrastrado;
    elemento.puntos[indiceVertice] = { x: p.x, y: p.y };
    nodo.setAttribute('cx', p.x);
    nodo.setAttribute('cy', p.y);
    actualizarSVGElemento(elemento);
  }
});

window.addEventListener('mouseup', () => {
  if (arrastrando) {
    arrastrando = false;
    botonPulsado = null;
    escenario.classList.remove('arrastrando');
  }
  if (verticeArrastrado) {
    verticeArrastrado.nodo.style.cursor = 'grab';
    verticeArrastrado = null;
    escenario.classList.remove('arrastrando-vertice');
    guardarEnStorage();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') espacioPresionado = true;
  if (e.key === 'Escape') cancelarEnProgreso();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') espacioPresionado = false;
});

function coordsMundo(evt) {
  const rect = escenario.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left - vista.offsetX) / vista.escala,
    y: (evt.clientY - rect.top  - vista.offsetY) / vista.escala
  };
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
document.getElementById('btn-reset-vista').addEventListener('click', centrarVista);

function zoomCentrado(factor) {
  const rect = escenario.getBoundingClientRect();
  const mx = rect.width / 2, my = rect.height / 2;
  const nuevaEscala = Math.min(vista.maxEscala, Math.max(vista.minEscala, vista.escala * factor));
  const ratio = nuevaEscala / vista.escala;
  vista.offsetX = mx - (mx - vista.offsetX) * ratio;
  vista.offsetY = my - (my - vista.offsetY) * ratio;
  vista.escala = nuevaEscala;
  aplicarTransformacion();
}
document.getElementById('zoom-in').addEventListener('click',  () => zoomCentrado(1.25));
document.getElementById('zoom-out').addEventListener('click', () => zoomCentrado(1/1.25));
document.getElementById('zoom-fit').addEventListener('click', centrarVista);

// ============================================================
// PALETA / HERRAMIENTAS
// ============================================================
document.querySelectorAll('.herramienta').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.herramienta').forEach(b => b.classList.remove('activa'));
    btn.classList.add('activa');
    app.herramienta = btn.dataset.tool;
    cancelarEnProgreso();

    escenario.className = 'escenario';
    if (app.herramienta === 'mover')    escenario.classList.add('modo-pan');
    if (app.herramienta === 'borrador') escenario.classList.add('modo-borrador');
    if (POI_TIPOS[app.herramienta])     escenario.classList.add('modo-colocar');

    if (app.herramienta === 'editar') {
      escenario.classList.add('modo-editar');
      activarEdicionVertices(true);
    } else {
      activarEdicionVertices(false);
    }

    if (app.herramienta === 'ramificar') {
      escenario.classList.add('modo-colocar');
    }

    const nombres = {
      'ruta-ingreso': 'Ruta Ingreso',
      'ruta-salida':  'Ruta Salida',
      'ramificar':    'Ramificar',
      'balanza':      'Balanza',
      'almacen':      'Almacén',
      'muelle':       'Muelle',
      'silo':         'Silo',
      'tanque':       'Tanque',
      'zona':         'Zona',
      'editar':       'Editar vértices',
      'borrador':     'Borrador',
      'mover':        'Mover'
    };
    infoModo.textContent = 'Herramienta: ' + nombres[app.herramienta];
  });
});

// ============================================================
// MODAL DE TÍTULO
// ============================================================
let modalCallback = null;
function pedirTitulo(titulo, valorInicial = '') {
  return new Promise(resolve => {
    modalTitulo.textContent = titulo;
    modalInput.value = valorInicial;
    modal.classList.add('visible');
    setTimeout(() => modalInput.focus(), 50);
    modalCallback = resolve;
  });
}
modalOk.addEventListener('click', () => {
  modal.classList.remove('visible');
  if (modalCallback) modalCallback(modalInput.value.trim() || 'Sin título');
  modalCallback = null;
});
modalCancel.addEventListener('click', () => {
  modal.classList.remove('visible');
  if (modalCallback) modalCallback(null);
  modalCallback = null;
});
modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') modalOk.click();
  if (e.key === 'Escape') modalCancel.click();
});

// ============================================================
// EDICIÓN DE VÉRTICES
// ============================================================
function activarEdicionVertices(activo) {
  svg.querySelectorAll('circle[data-vertice]').forEach(c => c.remove());

  if (!activo) return;

  app.elementos.forEach(elemento => {
    if (elemento.tipo !== 'ruta' && elemento.tipo !== 'zona') return;

    elemento.puntos.forEach((punto, idx) => {
      const marcador = el('circle', {
        cx: punto.x,
        cy: punto.y,
        r: 8,
        fill: '#ffcc00',
        stroke: '#000',
        'stroke-width': 2,
        'vector-effect': 'non-scaling-stroke',
        'data-vertice': '1',
        'data-elemento-id': elemento.id,
        'data-indice': idx
      });
      marcador.style.cursor = 'grab';
      marcador.style.pointerEvents = 'all';

      marcador.addEventListener('mousedown', (e) => {
        if (app.herramienta !== 'editar') return;
        e.preventDefault();
        e.stopPropagation();

        verticeArrastrado = { elemento, indiceVertice: idx, nodo: marcador };
        huboArrastreVertice = false;
        marcador.style.cursor = 'grabbing';
        escenario.classList.add('arrastrando-vertice');
      });

      svg.appendChild(marcador);
    });
  });
}

function refrescarVertices() {
  if (app.herramienta === 'editar') activarEdicionVertices(true);
}

function actualizarSVGElemento(elemento) {
  const grupo = svg.querySelector(`g.elemento[data-id="${elemento.id}"]`);
  if (!grupo) return;

  if (elemento.tipo === 'ruta') {
    const flechas = grupo.querySelector('g.flechas');
    if (flechas) {
      flechas.innerHTML = generarFlechasSVG(elemento.puntos, elemento.color, flujoAnimacion, false);
    }

    const circulos = grupo.querySelectorAll(':scope > circle');
    const textos  = grupo.querySelectorAll(':scope > text');

    const ini = elemento.puntos[0];
    const fin = elemento.puntos[elemento.puntos.length - 1];

    if (circulos[0]) {
      circulos[0].setAttribute('cx', ini.x);
      circulos[0].setAttribute('cy', ini.y);
    }
    if (circulos[1]) {
      circulos[1].setAttribute('cx', fin.x);
      circulos[1].setAttribute('cy', fin.y);
    }
    if (textos[0]) {
      textos[0].setAttribute('x', ini.x + 12);
      textos[0].setAttribute('y', ini.y - 12);
    }
    if (textos[1]) {
      textos[1].setAttribute('x', fin.x + 12);
      textos[1].setAttribute('y', fin.y - 12);
    }

  } else if (elemento.tipo === 'zona') {
    const poligono = grupo.querySelector('polygon');
    if (poligono) {
      poligono.setAttribute('points',
        elemento.puntos.map(p => `${p.x},${p.y}`).join(' '));
    }

    const cx = elemento.puntos.reduce((a,p) => a+p.x, 0) / elemento.puntos.length;
    const cy = elemento.puntos.reduce((a,p) => a+p.y, 0) / elemento.puntos.length;
    const texto = grupo.querySelector('text');
    if (texto) {
      texto.setAttribute('x', cx);
      texto.setAttribute('y', cy);
    }
  }
}

// ============================================================
// FLECHAS DE RUTA (en lugar de línea continua)
// ============================================================
function longitudPuntos(puntos) {
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

function puntoEnDistancia(puntos, dist) {
  let acum = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (dist <= acum + len) {
      const t = (dist - acum) / len;
      return {
        x: a.x + dx * t,
        y: a.y + dy * t,
        ang: Math.atan2(dy, dx) * 180 / Math.PI
      };
    }
    acum += len;
  }
  const a = puntos[puntos.length - 2], b = puntos[puntos.length - 1];
  return {
    x: b.x, y: b.y,
    ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
  };
}

function generarFlechasSVG(puntos, color, offset = 0, conMarcas = false) {
  const SEPARACION = 34;
  const LARGO_FLECHA = 14;
  const ANCHO_FLECHA = 12;
  const total = longitudPuntos(puntos);
  let contenido = '';

  if (total === 0) return contenido;

  for (let d = (offset % SEPARACION); d < total; d += SEPARACION) {
    if (d < 8) continue;
    if (total - d < 8) continue;
    const p = puntoEnDistancia(puntos, d);

    const x1 = p.x - LARGO_FLECHA / 2;
    const x2 = p.x + LARGO_FLECHA / 2;
    const y1 = p.y - ANCHO_FLECHA / 2;
    const y2 = p.y + ANCHO_FLECHA / 2;

    contenido += `<polygon points="${x1},${y1} ${x2},${p.y} ${x1},${y2}" ` +
      `fill="${color}" stroke="#000" stroke-width="1" ` +
      `vector-effect="non-scaling-stroke" ` +
      `transform="rotate(${p.ang} ${p.x} ${p.y})" />`;
  }

  if (conMarcas && puntos.length >= 2) {
    const ini = puntos[0];
    const fin = puntos[puntos.length - 1];
    contenido += `<circle cx="${ini.x}" cy="${ini.y}" r="7" ` +
      `fill="#fff" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" />`;
    contenido += `<circle cx="${fin.x}" cy="${fin.y}" r="7" ` +
      `fill="#fff" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" />`;
  }

  return contenido;
}

// ============================================================
// DIBUJO DE RUTAS
// ============================================================
function colorDeHerramienta(t) {
  if (t === 'ruta-ingreso') return COLOR_INGRESO;
  if (t === 'ruta-salida')  return COLOR_SALIDA;
  return '#999';
}

function nombreDeHerramienta(t) {
  if (t === 'ruta-ingreso') return 'Ingreso';
  if (t === 'ruta-salida')  return 'Salida';
  return t;
}

// ============================================================
// RAMIFICACIÓN DE RUTAS
// ============================================================
function puntoCercaDeSegmento(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) {
    return { dist: Math.hypot(p.x - a.x, p.y - a.y), x: a.x, y: a.y, t: 0 };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const proyX = a.x + dx * t;
  const proyY = a.y + dy * t;
  return {
    dist: Math.hypot(p.x - proyX, p.y - proyY),
    x: proyX, y: proyY, t
  };
}

function encontrarRutaCercana(p, umbralPx = 20) {
  let mejor = null;

  app.elementos.forEach(ruta => {
    if (ruta.tipo !== 'ruta') return;

    for (let i = 0; i < ruta.puntos.length - 1; i++) {
      const a = ruta.puntos[i];
      const b = ruta.puntos[i + 1];
      const r = puntoCercaDeSegmento(p, a, b);

      if (r.dist < umbralPx) {
        if (!mejor || r.dist < mejor.dist) {
          mejor = {
            ruta,
            indiceSegmento: i,
            punto: { x: r.x, y: r.y },
            dist: r.dist,
            t: r.t
          };
        }
      }
    }
  });

  return mejor;
}

function iniciarRamificacion(rutaPadre, puntoBifurcacion) {
  const tipo = rutaPadre.subtipo;
  const color = rutaPadre.color;
  const id = ++app.contadorId;

  const grupo = el('g', { 'data-id': id, 'data-tipo': tipo, class: 'elemento ruta' });

  const flechas = el('g', { class: 'flechas' });
  grupo.appendChild(flechas);

  const marcadorIn = el('circle', {
    cx: puntoBifurcacion.x, cy: puntoBifurcacion.y, r: 7,
    fill: '#fff', stroke: color, 'stroke-width': 3,
    'vector-effect': 'non-scaling-stroke'
  });
  grupo.appendChild(marcadorIn);

  const etiqueta = el('text', {
    x: puntoBifurcacion.x + 12, y: puntoBifurcacion.y - 12,
    fill: color, 'font-size': 16, 'font-weight': 700,
    'paint-order': 'stroke', stroke: '#000', 'stroke-width': 4
  });
  etiqueta.textContent = `${nombreDeHerramienta(tipo)} ${rutaPadre.id}.${id} · Rama`;
  etiqueta.style.display = mostrarNombres ? '' : 'none';
  grupo.appendChild(etiqueta);

  svg.appendChild(grupo);

  app.enProgreso = {
    tipo: 'ruta',
    subtipo: tipo,
    id,
    color,
    puntos: [{ x: puntoBifurcacion.x, y: puntoBifurcacion.y }],
    grupo,
    flechas,
    marcadorIn,
    etiqueta,
    marcadoresExtra: [],
    padreId: rutaPadre.id,
    esRama: true
  };

  actualizarPolyline();
  crearPreviewPunto();
  crearPreviewLinea(color);

  infoModo.textContent = `Ramificando desde Ruta ${rutaPadre.id}... clic para agregar puntos, doble clic para terminar`;
}

function iniciarRuta(punto) {
  const tipo = app.herramienta;
  const color = colorDeHerramienta(tipo);
  const id = ++app.contadorId;

  const grupo = el('g', { 'data-id': id, 'data-tipo': tipo, class: 'elemento ruta' });

  const flechas = el('g', { class: 'flechas' });
  grupo.appendChild(flechas);

  const marcadorIn = el('circle', {
    cx: punto.x, cy: punto.y, r: 7,
    fill: '#fff', stroke: color, 'stroke-width': 3,
    'vector-effect': 'non-scaling-stroke'
  });
  grupo.appendChild(marcadorIn);

  const etiqueta = el('text', {
    x: punto.x + 12, y: punto.y - 12,
    fill: color, 'font-size': 16, 'font-weight': 700,
    'paint-order': 'stroke', stroke: '#000', 'stroke-width': 4
  });
  etiqueta.textContent = `${nombreDeHerramienta(tipo)} ${id} · IN`;
  etiqueta.style.display = mostrarNombres ? '' : 'none';
  grupo.appendChild(etiqueta);

  svg.appendChild(grupo);

  app.enProgreso = {
    tipo: 'ruta',
    subtipo: tipo,
    id,
    color,
    puntos: [punto],
    grupo,
    flechas,
    marcadorIn,
    etiqueta,
    marcadoresExtra: []
  };
  actualizarPolyline();

  crearPreviewPunto();
  crearPreviewLinea(color);
}

function actualizarPolyline() {
  const p = app.enProgreso;
  if (!p) return;
  p.flechas.innerHTML = generarFlechasSVG(p.puntos, p.color, flujoAnimacion, false);
}

function agregarPuntoRuta(punto) {
  const p = app.enProgreso;
  p.puntos.push(punto);
  actualizarPolyline();
}

async function finalizarRuta() {
  const p = app.enProgreso;
  if (!p || p.puntos.length < 2) { cancelarEnProgreso(); return; }

  const fin = p.puntos[p.puntos.length - 1];

  const marcadorOut = el('circle', {
    cx: fin.x, cy: fin.y, r: 7,
    fill: '#fff', stroke: p.color, 'stroke-width': 3,
    'vector-effect': 'non-scaling-stroke'
  });
  p.grupo.appendChild(marcadorOut);

  const etiquetaOut = el('text', {
    x: fin.x + 12, y: fin.y - 12,
    fill: p.color, 'font-size': 16, 'font-weight': 700,
    'paint-order': 'stroke', stroke: '#000', 'stroke-width': 4
  });
  etiquetaOut.textContent = `${nombreDeHerramienta(p.subtipo)} ${p.id} · OUT`;
  etiquetaOut.style.display = mostrarNombres ? '' : 'none';
  p.grupo.appendChild(etiquetaOut);

  const elemento = {
    id: p.id,
    tipo: 'ruta',
    subtipo: p.subtipo,
    color: p.color,
    puntos: p.puntos.slice(),
    titulo: p.esRama
      ? `${nombreDeHerramienta(p.subtipo)} ${p.padreId}.${p.id} · Rama`
      : `${nombreDeHerramienta(p.subtipo)} ${p.id}`
  };

  if (p.esRama && p.padreId) {
    elemento.padreId = p.padreId;
    elemento.esRama = true;
  }

  app.elementos.push(elemento);

  p.grupo.style.pointerEvents = 'auto';
  p.grupo.style.cursor = 'pointer';
  p.grupo.addEventListener('click', (e) => {
    if (app.herramienta === 'borrador') {
      e.stopPropagation();
      eliminarElemento(elemento.id);
    }
  });

  // Respetar el estado actual del toggle de nombres
  if (p.etiqueta)    p.etiqueta.style.display    = mostrarNombres ? '' : 'none';
  if (etiquetaOut)   etiquetaOut.style.display   = mostrarNombres ? '' : 'none';

  limpiarPreview();
  app.enProgreso = null;
  guardarEnStorage();
  refrescarLista();
  aplicarFiltro();
  infoModo.textContent = 'Ruta guardada.';
}

// ============================================================
// PUNTOS DE INTERÉS
// ============================================================
async function colocarPOI(punto, tipo) {
  const config = POI_TIPOS[tipo];
  if (!config) return;

  const titulo = await pedirTitulo(`Nombre del ${config.nombre.toLowerCase()}`, config.tituloDefault);
  if (titulo === null) return;

  const id = ++app.contadorId;
  const grupo = el('g', { 'data-id': id, 'data-tipo': tipo, class: `elemento poi poi-${tipo}` });
  grupo.setAttribute('transform', `translate(${punto.x},${punto.y})`);

  const fondo = el('circle', {
    cx: 0, cy: 0, r: 34,
    fill: config.color,
    stroke: '#000',
    'stroke-width': 2,
    opacity: 0.9
  });
  grupo.appendChild(fondo);

  const icono = config.dibujar(config.color);
  grupo.appendChild(icono);

  const etiqueta = el('text', {
    x: 0, y: 54,
    'text-anchor': 'middle',
    fill: '#fff',
    'font-size': 16,
    'font-weight': 700,
    'paint-order': 'stroke',
    stroke: '#000',
    'stroke-width': 4
  });
  etiqueta.textContent = titulo;
  grupo.appendChild(etiqueta);

  svg.appendChild(grupo);

  const elemento = { id, tipo, x: punto.x, y: punto.y, titulo };
  app.elementos.push(elemento);

  grupo.style.pointerEvents = 'auto';
  grupo.style.cursor = 'pointer';
  grupo.addEventListener('click', (e) => {
    if (app.herramienta === 'borrador') {
      e.stopPropagation();
      eliminarElemento(id);
    }
  });

  guardarEnStorage();
  refrescarLista();
}

// ============================================================
// ZONAS (POLÍGONOS)
// ============================================================
function iniciarZona(punto) {
  const id = ++app.contadorId;

  const grupo = el('g', { 'data-id': id, 'data-tipo': 'zona', class: 'elemento zona' });

  const poligono = el('polygon', {
    fill: 'rgba(59,130,246,0.25)',
    stroke: COLOR_ZONA,
    'stroke-width': 3,
    'stroke-dasharray': '6 4',
    'vector-effect': 'non-scaling-stroke'
  });
  grupo.appendChild(poligono);

  svg.appendChild(grupo);

  app.enProgreso = {
    tipo: 'zona',
    id,
    color: COLOR_ZONA,
    puntos: [punto],
    grupo,
    poligono,
    marcadores: [],
    etiqueta: null
  };
  actualizarPolygono();

  crearPreviewPunto();
  crearPreviewPoligono(COLOR_ZONA);
}

function actualizarPolygono() {
  const z = app.enProgreso;
  z.poligono.setAttribute('points', z.puntos.map(p => `${p.x},${p.y}`).join(' '));
}

function agregarPuntoZona(punto) {
  const z = app.enProgreso;
  z.puntos.push(punto);
  actualizarPolygono();

  const m = el('circle', {
    cx: punto.x, cy: punto.y, r: 5,
    fill: COLOR_ZONA, stroke: '#fff', 'stroke-width': 2,
    'vector-effect': 'non-scaling-stroke'
  });
  z.grupo.appendChild(m);
  z.marcadores.push(m);
}

async function finalizarZona() {
  const z = app.enProgreso;
  if (!z || z.puntos.length < 3) { cancelarEnProgreso(); return; }

  const titulo = await pedirTitulo('Nombre de la zona', 'Zona');
  if (titulo === null) { cancelarEnProgreso(); return; }

  const cx = z.puntos.reduce((a,p) => a+p.x, 0) / z.puntos.length;
  const cy = z.puntos.reduce((a,p) => a+p.y, 0) / z.puntos.length;

  const etiqueta = el('text', {
    x: cx, y: cy,
    'text-anchor': 'middle',
    fill: '#fff',
    'font-size': 20,
    'font-weight': 700,
    'paint-order': 'stroke',
    stroke: '#000',
    'stroke-width': 4
  });
  etiqueta.textContent = titulo;
  z.grupo.appendChild(etiqueta);

  const elemento = {
    id: z.id, tipo: 'zona', color: COLOR_ZONA,
    puntos: z.puntos.slice(), titulo
  };
  app.elementos.push(elemento);

  z.grupo.style.pointerEvents = 'auto';
  z.grupo.style.cursor = 'pointer';
  z.grupo.addEventListener('click', (e) => {
    if (app.herramienta === 'borrador') {
      e.stopPropagation();
      eliminarElemento(z.id);
    }
  });

  limpiarPreview();
  app.enProgreso = null;
  guardarEnStorage();
  refrescarLista();
}

// ============================================================
// CANCELAR / ELIMINAR
// ============================================================
function cancelarEnProgreso() {
  if (!app.enProgreso) return;
  app.enProgreso.grupo.remove();
  app.enProgreso = null;
  limpiarPreview();
}

function eliminarElemento(id) {
  const idx = app.elementos.findIndex(e => e.id === id);
  if (idx === -1) return;
  app.elementos.splice(idx, 1);
  const nodo = svg.querySelector(`g.elemento[data-id="${id}"]`);
  if (nodo) nodo.remove();
  svg.querySelectorAll(`circle[data-elemento-id="${id}"]`).forEach(c => c.remove());
  guardarEnStorage();
  refrescarLista();
  aplicarFiltro();
}

// ============================================================
// FILTRO DE RUTAS
// ============================================================
function aplicarFiltro() {
  const rutas = svg.querySelectorAll('g.elemento.ruta');
  rutas.forEach(g => {
    const id = parseInt(g.dataset.id, 10);
    const elemento = app.elementos.find(x => x.id === id);
    if (!elemento) return;

    const esIngreso = elemento.subtipo === 'ruta-ingreso';
    const esSalida  = elemento.subtipo === 'ruta-salida';

    let visible = true;
    if (filtroActual === 'ingreso') visible = esIngreso;
    if (filtroActual === 'salida')  visible = esSalida;

    g.style.display = visible ? '' : 'none';
  });

  refrescarLista();
}

// ============================================================
// MOSTRAR / OCULTAR NOMBRES DE RUTAS
// ============================================================
function aplicarVisibilidadNombres() {
  svg.querySelectorAll('g.elemento.ruta').forEach(g => {
    const textos = g.querySelectorAll(':scope > text');
    textos.forEach(t => {
      t.style.display = mostrarNombres ? '' : 'none';
    });
  });
}

// ============================================================
// LISTA DE ELEMENTOS
// ============================================================
function refrescarLista() {
  listaEl.innerHTML = '';
  app.elementos.forEach(e => {
    if (filtroActual !== 'todos' && e.tipo === 'ruta') {
      if (filtroActual === 'ingreso' && e.subtipo !== 'ruta-ingreso') return;
      if (filtroActual === 'salida'  && e.subtipo !== 'ruta-salida')  return;
    }

    const li = document.createElement('li');
    let color = e.color || '#999';
    let icono = '🔷';

    if (e.tipo === 'ruta') {
      icono = '📍';
    } else if (POI_TIPOS[e.tipo]) {
      color = POI_TIPOS[e.tipo].color;
      icono = {
        balanza: '⚖️',
        almacen: '🏭',
        muelle:  '🚢',
        silo:    '🌾',
        tanque:  '🛢️'
      }[e.tipo] || '⚙️';
    } else if (e.tipo === 'zona') {
      icono = '🔷';
    }
    li.innerHTML = `
      <span class="el-nombre" style="color:${color}; font-weight:600;">
        ${icono} ${e.titulo || e.tipo}
      </span>
      <button title="Eliminar" data-id="${e.id}">✕</button>
    `;
    li.querySelector('button').addEventListener('click', () => eliminarElemento(e.id));
    listaEl.appendChild(li);
  });
}

// ============================================================
// FILTRO — Eventos de los botones
// ============================================================
document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    filtroActual = btn.dataset.filtro;
    aplicarFiltro();
  });
});

// ============================================================
// BOTÓN: Mostrar / ocultar nombres de rutas
// ============================================================
const btnToggleNombres = document.getElementById('btn-toggle-nombres');
if (btnToggleNombres) {
  btnToggleNombres.addEventListener('click', () => {
    mostrarNombres = !mostrarNombres;
    btnToggleNombres.classList.toggle('activo', mostrarNombres);
    aplicarVisibilidadNombres();
    guardarEnStorage();
  });
}

// ============================================================
// EVENTOS DEL ESCENARIO
// ============================================================
escenario.addEventListener('click', (e) => {
  if (huboArrastreVertice) { huboArrastreVertice = false; return; }
  if (espacioPresionado || arrastrando || e.button !== 0) return;
  if (app.herramienta === 'mover' ||
      app.herramienta === 'borrador' ||
      app.herramienta === 'editar') return;

  const p = coordsMundo(e);

  if (app.herramienta === 'ramificar') {
    if (app.enProgreso && app.enProgreso.esRama) {
      agregarPuntoRuta(p);
      return;
    }

    const cercana = encontrarRutaCercana(p, 25 / vista.escala);
    if (cercana) {
      iniciarRamificacion(cercana.ruta, cercana.punto);
    } else {
      infoModo.textContent = '⚠️ Haz clic sobre una ruta existente para ramificarla.';
    }
    return;
  }

  if (app.herramienta === 'ruta-ingreso' || app.herramienta === 'ruta-salida') {
    if (!app.enProgreso) iniciarRuta(p);
    else agregarPuntoRuta(p);
    return;
  }

  if (app.herramienta === 'zona') {
    if (!app.enProgreso) iniciarZona(p);
    else agregarPuntoZona(p);
    return;
  }

  if (POI_TIPOS[app.herramienta]) {
    colocarPOI(p, app.herramienta);
  }
});

escenario.addEventListener('mousemove', (e) => {
  if (arrastrando || espacioPresionado) return;
  if (!app.enProgreso) return;

  const p = coordsMundo(e);
  const prog = app.enProgreso;
  const ultimo = prog.puntos[prog.puntos.length - 1];

  if (nodoPreview) {
    nodoPreview.setAttribute('cx', p.x);
    nodoPreview.setAttribute('cy', p.y);
  }

  if (prog.tipo === 'ruta') {
    if (lineaPreview) {
      lineaPreview.setAttribute('x1', ultimo.x);
      lineaPreview.setAttribute('y1', ultimo.y);
      lineaPreview.setAttribute('x2', p.x);
      lineaPreview.setAttribute('y2', p.y);
    }
  } else if (prog.tipo === 'zona') {
    if (poligonoPreview) {
      const todos = [...prog.puntos, p];
      poligonoPreview.setAttribute('points',
        todos.map(pt => `${pt.x},${pt.y}`).join(' '));
    }
  }
});

escenario.addEventListener('dblclick', (e) => {
  if (app.herramienta === 'mover' ||
      app.herramienta === 'borrador' ||
      app.herramienta === 'editar') return;
  if (!app.enProgreso) return;
  e.preventDefault();

  if (app.enProgreso.tipo === 'ruta') finalizarRuta();
  else if (app.enProgreso.tipo === 'zona') finalizarZona();
});

escenario.addEventListener('contextmenu', e => e.preventDefault());

// ============================================================
// PERSISTENCIA
// ============================================================
function guardarEnStorage() {
  try {
    const datos = {
      elementos: app.elementos,
      contadorId: app.contadorId,
      mostrarNombres: mostrarNombres
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
  } catch (err) {
    console.warn('No se pudo guardar:', err);
  }
}

async function cargarDesdeStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    // 1) Si hay algo en localStorage, úsalo (modo edición)
    if (raw) {
      const datos = JSON.parse(raw);
      if (datos && datos.elementos) {
        aplicarDatos(datos);
        return;
      }
    }

    // 2) Si no hay nada, intenta cargar datos.json del repo (modo "demo")
    const resp = await fetch('datos.json', { cache: 'no-cache' });
    if (!resp.ok) return;
    const datos = await resp.json();
    if (datos && datos.elementos) {
      aplicarDatos(datos);
      // NO guardamos en localStorage: así el usuario parte limpio
      // y si edita algo, se guardará sobre esto.
    }
  } catch (err) {
    console.warn('No se pudo cargar:', err);
  }
}

function aplicarDatos(datos) {
  app.elementos = datos.elementos || [];
  app.contadorId = datos.contadorId || 0;

  if (typeof datos.mostrarNombres === 'boolean') {
    mostrarNombres = datos.mostrarNombres;
    if (btnToggleNombres) {
      btnToggleNombres.classList.toggle('activo', mostrarNombres);
    }
  }

  app.elementos.forEach(e => reconstruirElemento(e));
}

function reconstruirElemento(e) {
  const grupo = el('g', { 'data-id': e.id, 'data-tipo': e.tipo, class: `elemento ${e.tipo}` });

  if (e.tipo === 'ruta') {
    const flechas = el('g', { class: 'flechas' });
    flechas.innerHTML = generarFlechasSVG(e.puntos, e.color, flujoAnimacion, false);
    grupo.appendChild(flechas);

    const ini = e.puntos[0];
    const fin = e.puntos[e.puntos.length - 1];

    const inC = el('circle', {
      cx: ini.x, cy: ini.y, r: 7,
      fill: '#fff', stroke: e.color, 'stroke-width': 3,
      'vector-effect': 'non-scaling-stroke'
    });
    grupo.appendChild(inC);

    const outC = el('circle', {
      cx: fin.x, cy: fin.y, r: 7,
      fill: '#fff', stroke: e.color, 'stroke-width': 3,
      'vector-effect': 'non-scaling-stroke'
    });
    grupo.appendChild(outC);

    const tIn = el('text', {
      x: ini.x + 12, y: ini.y - 12,
      fill: e.color, 'font-size': 16, 'font-weight': 700,
      'paint-order': 'stroke', stroke: '#000', 'stroke-width': 4
    });
    tIn.textContent = `${e.titulo} · IN`;
    tIn.style.display = mostrarNombres ? '' : 'none';
    grupo.appendChild(tIn);

    const tOut = el('text', {
      x: fin.x + 12, y: fin.y - 12,
      fill: e.color, 'font-size': 16, 'font-weight': 700,
      'paint-order': 'stroke', stroke: '#000', 'stroke-width': 4
    });
    tOut.textContent = `${e.titulo} · OUT`;
    tOut.style.display = mostrarNombres ? '' : 'none';
    grupo.appendChild(tOut);

  } else if (POI_TIPOS[e.tipo]) {
    const config = POI_TIPOS[e.tipo];
    grupo.setAttribute('transform', `translate(${e.x},${e.y})`);

    const fondo = el('circle', {
      cx: 0, cy: 0, r: 34,
      fill: config.color,
      stroke: '#000',
      'stroke-width': 2,
      opacity: 0.9
    });
    grupo.appendChild(fondo);

    const icono = config.dibujar(config.color);
    grupo.appendChild(icono);

    const et = el('text', {
      x: 0, y: 54,
      'text-anchor': 'middle',
      fill: '#fff',
      'font-size': 16,
      'font-weight': 700,
      'paint-order': 'stroke',
      stroke: '#000',
      'stroke-width': 4
    });
    et.textContent = e.titulo;
    grupo.appendChild(et);

  } else if (e.tipo === 'zona') {
    const poligono = el('polygon', {
      fill: 'rgba(59,130,246,0.25)',
      stroke: COLOR_ZONA,
      'stroke-width': 3,
      'vector-effect': 'non-scaling-stroke'
    });
    poligono.setAttribute('points', e.puntos.map(p => `${p.x},${p.y}`).join(' '));
    grupo.appendChild(poligono);

    const cx = e.puntos.reduce((a,p) => a+p.x, 0) / e.puntos.length;
    const cy = e.puntos.reduce((a,p) => a+p.y, 0) / e.puntos.length;
    const et = el('text', {
      x: cx, y: cy, 'text-anchor': 'middle', fill: '#fff',
      'font-size': 20, 'font-weight': 700,
      'paint-order': 'stroke', stroke: '#000', 'stroke-width': 4
    });
    et.textContent = e.titulo;
    grupo.appendChild(et);
  }

  svg.appendChild(grupo);
  grupo.style.pointerEvents = 'auto';
  grupo.style.cursor = 'pointer';
  grupo.addEventListener('click', (ev) => {
    if (app.herramienta === 'borrador') {
      ev.stopPropagation();
      eliminarElemento(e.id);
    }
  });
}

// ============================================================
// EXPORTAR / IMPORTAR
// ============================================================
document.getElementById('btn-exportar').addEventListener('click', () => {
  const datos = {
    elementos: app.elementos,
    contadorId: app.contadorId,
    layout: layoutImg.naturalWidth + 'x' + layoutImg.naturalHeight
  };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flujo_camiones_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

// ============================================================
// EXPORTAR A PNG (calidad completa, sin pérdida)
// ============================================================
document.getElementById('btn-exportar-png').addEventListener('click', async () => {
  infoModo.textContent = '⏳ Generando imagen a resolución completa...';

  const W = layoutImg.naturalWidth;
  const H = layoutImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  try {
    ctx.drawImage(layoutImg, 0, 0, W, H);
  } catch (err) {
    console.error('Error dibujando el layout:', err);
    infoModo.textContent = '❌ Error al dibujar la imagen base';
    return;
  }

  const svgClone = svg.cloneNode(true);
  svgClone.style.transform = '';
  svgClone.setAttribute('width', W);
  svgClone.setAttribute('height', H);
  svgClone.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  svgClone.querySelectorAll('circle[data-vertice]').forEach(n => n.remove());
  svgClone.querySelectorAll('circle[pointer-events="none"]').forEach(n => n.remove());

  const svgString = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const svgImg = new Image();
  svgImg.onload = () => {
    try {
      ctx.drawImage(svgImg, 0, 0, W, H);
    } catch (err) {
      console.error('Error dibujando SVG:', err);
    }
    URL.revokeObjectURL(svgUrl);

    canvas.toBlob((blob) => {
      if (!blob) {
        infoModo.textContent = '❌ Error al generar la imagen';
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flujo_camiones_' + new Date().toISOString().slice(0,10) + '.png';
      a.click();
      URL.revokeObjectURL(url);

      const pesoMB = (blob.size / 1024 / 1024).toFixed(1);
      infoModo.textContent = `✅ Imagen exportada (${W}×${H}, ${pesoMB} MB)`;
    }, 'image/png', 1.0);
  };

  svgImg.onerror = (err) => {
    console.error('Error cargando SVG:', err);
    URL.revokeObjectURL(svgUrl);
    infoModo.textContent = '❌ Error al convertir el SVG';
  };

  svgImg.src = svgUrl;
});

document.getElementById('btn-importar').addEventListener('click', () => {
  document.getElementById('input-importar').click();
});

document.getElementById('input-importar').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const datos = JSON.parse(reader.result);
      if (!datos.elementos) throw new Error('Formato inválido');

      svg.querySelectorAll('g.elemento').forEach(n => n.remove());
      svg.querySelectorAll('circle[data-vertice]').forEach(n => n.remove());
      app.elementos = datos.elementos;
      app.contadorId = datos.contadorId || 0;
      app.elementos.forEach(el2 => reconstruirElemento(el2));
      guardarEnStorage();
      refrescarLista();
      aplicarFiltro();
      aplicarVisibilidadNombres();
      if (app.herramienta === 'editar') activarEdicionVertices(true);
      infoModo.textContent = 'Importado correctamente.';
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// ============================================================
// SIMULACIÓN DE CAMIONES
// ============================================================
function construirRecorrido(puntos) {
  const segmentos = [];
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    segmentos.push({ a, b, dx, dy, len, ini: total });
    total += len;
  }
  return {
    total,
    puntoEn(dist) {
      if (dist <= 0) return { x: segmentos[0].a.x, y: segmentos[0].a.y, ang: 0 };
      for (const s of segmentos) {
        if (dist <= s.ini + s.len) {
          const t = (dist - s.ini) / s.len;
          return {
            x: s.a.x + s.dx * t,
            y: s.a.y + s.dy * t,
            ang: Math.atan2(s.dy, s.dx) * 180 / Math.PI
          };
        }
      }
      const ult = segmentos[segmentos.length - 1];
      return { x: ult.b.x, y: ult.b.y, ang: Math.atan2(ult.dy, ult.dx) * 180 / Math.PI };
    }
  };
}

function crearNodoCamion(color) {
  const g = el('g', { class: 'camion' });
  const cabina = el('rect', {
    x: -18, y: -9, width: 14, height: 18, rx: 2, fill: color
  });
  const caja = el('rect', {
    x: -4, y: -9, width: 22, height: 18, rx: 2, fill: color,
    stroke: '#000', 'stroke-width': 1.5
  });
  const linea = el('line', {
    x1: -18, y1: 0, x2: 18, y2: 0,
    stroke: '#000', 'stroke-width': 1
  });
  g.appendChild(cabina); g.appendChild(caja); g.appendChild(linea);
  return g;
}

function spawnCamion() {
  const rutasIngreso = app.elementos.filter(e => e.tipo === 'ruta' && e.subtipo === 'ruta-ingreso');
  const rutasSalida  = app.elementos.filter(e => e.tipo === 'ruta' && e.subtipo === 'ruta-salida');
  const todas = [...rutasIngreso, ...rutasSalida];
  if (todas.length === 0) return;

  const ruta = todas[Math.floor(Math.random() * todas.length)];
  const recorrido = construirRecorrido(ruta.puntos);
  const nodo = crearNodoCamion(ruta.color);
  svg.appendChild(nodo);

  const camion = {
    ruta, recorrido,
    dist: 0,
    velocidad: 180 + Math.random() * 60,
    nodo,
    nacimiento: performance.now(),
    terminado: false
  };

  sim.camiones.push(camion);
  sim.ingresados++;
}

function actualizarCamion(camion, dt) {
  camion.dist += camion.velocidad * sim.velocidad * dt;
  if (camion.dist >= camion.recorrido.total) {
    camion.nodo.remove();
    camion.terminado = true;
    sim.salidos++;
    sim.tiempos.push((performance.now() - camion.nacimiento) / 1000);
    if (sim.tiempos.length > 50) sim.tiempos.shift();
    return;
  }
  const p = camion.recorrido.puntoEn(camion.dist);
  camion.nodo.setAttribute('transform', `translate(${p.x},${p.y}) rotate(${p.ang})`);
}

function loop(ts) {
  if (!sim.ultimoTimestamp) sim.ultimoTimestamp = ts;
  const dt = Math.min((ts - sim.ultimoTimestamp) / 1000, 0.1);
  sim.ultimoTimestamp = ts;

  if (!ultimoTsFlujo) ultimoTsFlujo = ts;
  const dtFlujo = (ts - ultimoTsFlujo) / 1000;
  ultimoTsFlujo = ts;
  flujoAnimacion += dtFlujo * 20;
  if (flujoAnimacion > 1e6) flujoAnimacion = 0;

  if (sim.activa) {
    sim.timerSpawn -= dt * 1000 * sim.velocidad;
    if (sim.timerSpawn <= 0) {
      spawnCamion();
      sim.timerSpawn = sim.intervaloMin + Math.random() * (sim.intervaloMax - sim.intervaloMin);
    }
    sim.camiones.forEach(c => actualizarCamion(c, dt));
    sim.camiones = sim.camiones.filter(c => !c.terminado);
  }

  svg.querySelectorAll('g.elemento.ruta').forEach(g => {
    if (g.style.display === 'none') return;
    const flechas = g.querySelector('g.flechas');
    if (!flechas) return;
    const id = parseInt(g.dataset.id, 10);
    const elRuta = app.elementos.find(x => x.id === id);
    if (!elRuta || elRuta.tipo !== 'ruta') return;
    flechas.innerHTML = generarFlechasSVG(elRuta.puntos, elRuta.color, flujoAnimacion, false);
  });

  mEnCirc.textContent     = sim.camiones.length;
  mIngresados.textContent = sim.ingresados;
  mSalidos.textContent    = sim.salidos;
  if (sim.tiempos.length) {
    const prom = sim.tiempos.reduce((a,b) => a+b, 0) / sim.tiempos.length;
    mTiempo.textContent = prom.toFixed(1) + 's';
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

btnPlay.addEventListener('click', () => {
  if (!sim.activa && app.elementos.filter(e => e.tipo === 'ruta').length === 0) {
    infoModo.textContent = '⚠️ Primero dibuja al menos una ruta.';
    return;
  }
  sim.activa = !sim.activa;
  btnPlay.textContent = sim.activa ? '⏸ Pausar' : '▶ Iniciar';
  btnPlay.classList.toggle('activo', sim.activa);
  sim.ultimoTimestamp = 0;
});

btnReset.addEventListener('click', () => {
  sim.activa = false;
  btnPlay.textContent = '▶ Iniciar';
  btnPlay.classList.remove('activo');
  sim.camiones.forEach(c => c.nodo.remove());
  sim.camiones = [];
  sim.ingresados = 0; sim.salidos = 0; sim.tiempos = []; sim.timerSpawn = 0;
});

sliderVel.addEventListener('input', () => {
  sim.velocidad = parseFloat(sliderVel.value);
  velLabel.textContent = sim.velocidad.toFixed(2) + '×';
});

// ============================================================
// ARRANQUE
// ============================================================
let inicializado = false;
async function inicializar() {
  if (inicializado) return;
  inicializado = true;

  ajustarTamanoMundo();
  centrarVista();
  await cargarDesdeStorage();
  refrescarLista();
  aplicarFiltro();
  aplicarVisibilidadNombres();
}

layoutImg.addEventListener('load', inicializar);
if (layoutImg.complete && layoutImg.naturalWidth) {
  inicializar();
}