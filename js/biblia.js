// =====================================================================
//  Conexión con API.Bible (a través de la función /api/biblia de Netlify,
//  para que tu clave nunca quede expuesta en el navegador).
// =====================================================================

export const LIBROS = {
  GEN: 'Génesis', EXO: 'Éxodo', LEV: 'Levítico', NUM: 'Números', DEU: 'Deuteronomio',
  JOS: 'Josué', JDG: 'Jueces', RUT: 'Rut', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Reyes', '2KI': '2 Reyes', '1CH': '1 Crónicas', '2CH': '2 Crónicas', EZR: 'Esdras',
  NEH: 'Nehemías', EST: 'Ester', JOB: 'Job', PSA: 'Salmos', PRO: 'Proverbios',
  ECC: 'Eclesiastés', SNG: 'Cantares', ISA: 'Isaías', JER: 'Jeremías', LAM: 'Lamentaciones',
  EZK: 'Ezequiel', DAN: 'Daniel', HOS: 'Oseas', JOL: 'Joel', AMO: 'Amós', OBA: 'Abdías',
  JON: 'Jonás', MIC: 'Miqueas', NAM: 'Nahúm', HAB: 'Habacuc', ZEP: 'Sofonías', HAG: 'Hageo',
  ZEC: 'Zacarías', MAL: 'Malaquías', MAT: 'Mateo', MRK: 'Marcos', LUK: 'Lucas', JHN: 'Juan',
  ACT: 'Hechos', ROM: 'Romanos', '1CO': '1 Corintios', '2CO': '2 Corintios', GAL: 'Gálatas',
  EPH: 'Efesios', PHP: 'Filipenses', COL: 'Colosenses', '1TH': '1 Tesalonicenses',
  '2TH': '2 Tesalonicenses', '1TI': '1 Timoteo', '2TI': '2 Timoteo', TIT: 'Tito', PHM: 'Filemón',
  HEB: 'Hebreos', JAS: 'Santiago', '1PE': '1 Pedro', '2PE': '2 Pedro', '1JN': '1 Juan',
  '2JN': '2 Juan', '3JN': '3 Juan', JUD: 'Judas', REV: 'Apocalipsis',
};

/** "PSA.23.1-PSA.23.3" → "Salmo 23:1-3" · "JHN.3" → "Juan 3" */
export function formatearRef(id = '') {
  const [ini, fin] = id.split('-');
  const [libro, cap, ver] = ini.split('.');
  let nombre = LIBROS[libro] || libro;
  const unCapitulo = !fin || fin.split('.')[1] === cap;
  if (libro === 'PSA' && unCapitulo) nombre = 'Salmo';
  if (!ver) return `${nombre} ${cap}`;
  if (!fin) return `${nombre} ${cap}:${ver}`;
  const [, cap2, ver2] = fin.split('.');
  return cap2 === cap ? `${nombre} ${cap}:${ver}-${ver2}` : `${nombre} ${cap}:${ver}–${cap2}:${ver2}`;
}

/** Capítulo al que pertenece un pasaje: "MAT.5.1-MAT.5.16" → "MAT.5" */
export const capituloDe = (id = '') => id.split('-')[0].split('.').slice(0, 2).join('.');

// ---------- Llamadas ----------
class ErrorBiblia extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; this.mensaje = mensaje; }
}

async function api(ruta, params = {}) {
  const q = new URLSearchParams({ ruta, ...params });
  let r;
  try { r = await fetch(`/api/biblia?${q}`); }
  catch { throw new ErrorBiblia(0, 'Sin conexión. Revisa tu internet.'); }
  if (!r.ok) {
    const mensajes = {
      401: 'Falta configurar la clave de API.Bible en Netlify.',
      403: 'Tu clave de API.Bible no tiene acceso a esta traducción.',
      404: 'No encontramos ese pasaje en esta traducción.',
      429: 'Se alcanzó el límite diario de API.Bible. Intenta más tarde.',
    };
    throw new ErrorBiblia(r.status, mensajes[r.status] || 'No se pudo cargar el texto bíblico.');
  }
  const datos = await r.json();
  reportarFums(datos?.meta?.fumsToken);
  return datos;
}

/** API.Bible pide reportar cada lectura (Fair Use Management System). */
function reportarFums(token) {
  if (token && typeof window.fums === 'function') {
    try { window.fums('trackView', token); } catch { /* no bloquea la app */ }
  }
}

// ---------- Caché local ----------
const memoria = new Map();
function leerCache(clave, maxHoras = 24 * 30) {
  if (memoria.has(clave)) return memoria.get(clave);
  try {
    const crudo = localStorage.getItem(clave);
    if (!crudo) return null;
    const { t, v } = JSON.parse(crudo);
    if (Date.now() - t > maxHoras * 3600e3) return null;
    memoria.set(clave, v);
    return v;
  } catch { return null; }
}
function guardarCache(clave, valor) {
  memoria.set(clave, valor);
  try { localStorage.setItem(clave, JSON.stringify({ t: Date.now(), v: valor })); }
  catch {
    // Si el almacenamiento se llena, borramos pasajes antiguos y seguimos
    try { Object.keys(localStorage).filter((k) => k.startsWith('lumbre:p:')).slice(0, 50).forEach((k) => localStorage.removeItem(k)); } catch { /* nada */ }
  }
}

// ---------- Traducciones ----------
const EXCLUIR = /reina|valera|\brvr|\brv\s?\d|\brv\b/i;

export async function listarBiblias() {
  const enCache = leerCache('lumbre:biblias', 24);
  if (enCache) return enCache;
  const r = await api('bibles', { language: 'spa' });
  const vistas = new Set();
  const lista = (r.data || [])
    .filter((b) => !EXCLUIR.test(`${b.name} ${b.nameLocal} ${b.abbreviation} ${b.abbreviationLocal}`))
    .map((b) => ({
      id: b.id,
      nombre: (b.nameLocal || b.name || '').trim(),
      abrev: (b.abbreviationLocal || b.abbreviation || '').trim(),
      descripcion: (b.descriptionLocal || b.description || '').trim(),
    }))
    .filter((b) => { const k = `${b.nombre}|${b.abrev}`; if (vistas.has(k)) return false; vistas.add(k); return true; })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  guardarCache('lumbre:biblias', lista);
  return lista;
}

/** Elige una traducción por defecto: Nueva Traducción Viviente si está disponible. */
export function bibliaPorDefecto(lista) {
  return (
    lista.find((b) => /viviente|\bntv\b/i.test(`${b.nombre} ${b.abrev}`)) ||
    lista.find((b) => /nueva biblia viva|\bnbv\b/i.test(`${b.nombre} ${b.abrev}`)) ||
    lista[0]
  );
}

// ---------- Texto ----------
const PARAMS_TEXTO = {
  'content-type': 'text',
  'include-notes': 'false',
  'include-titles': 'false',
  'include-chapter-numbers': 'false',
  'include-verse-spans': 'false',
  'fums-version': '3',
};

/** Convierte "[1] texto [2] texto" en [{ n, texto, parrafo }] */
export function separarVersos(contenido = '') {
  const partes = contenido.split(/\[(\d+)\]/);
  const versos = [];
  for (let i = 1; i < partes.length; i += 2) {
    const crudo = partes[i + 1] || '';
    versos.push({
      n: Number(partes[i]),
      texto: crudo.replace(/\s+/g, ' ').trim(),
      parrafo: i > 1 && /\n\s*$/.test(partes[i - 1] || ''),
    });
  }
  if (!versos.length && contenido.trim()) versos.push({ n: 0, texto: contenido.replace(/\s+/g, ' ').trim(), parrafo: false });
  return versos.filter((v) => v.texto);
}

/** Un pasaje corto como texto corrido (versículo del día, envíos, favoritos). */
export async function obtenerPasaje(bibliaId, pasajeId) {
  const clave = `lumbre:p:${bibliaId}:${pasajeId}`;
  const enCache = leerCache(clave);
  if (enCache) { reportarFums(enCache.fums); return enCache; }
  const r = await api(`bibles/${bibliaId}/passages/${pasajeId}`, { ...PARAMS_TEXTO, 'include-verse-numbers': 'false' });
  const valor = {
    texto: (r.data.content || '').replace(/\s+/g, ' ').trim(),
    referencia: formatearRef(pasajeId),
    copyright: r.data.copyright || '',
    fums: r.meta?.fumsToken,
  };
  guardarCache(clave, valor);
  return valor;
}

/** Un pasaje con números de versículo (capítulos y lecturas de planes). */
export async function obtenerPasajeConVersos(bibliaId, pasajeId) {
  const clave = `lumbre:p:${bibliaId}:${pasajeId}:v`;
  const enCache = leerCache(clave);
  if (enCache) { reportarFums(enCache.fums); return enCache; }
  const r = await api(`bibles/${bibliaId}/passages/${pasajeId}`, { ...PARAMS_TEXTO, 'include-verse-numbers': 'true' });
  const valor = {
    versos: separarVersos(r.data.content || ''),
    referencia: formatearRef(pasajeId),
    copyright: r.data.copyright || '',
    fums: r.meta?.fumsToken,
  };
  guardarCache(clave, valor);
  return valor;
}

/** Capítulo completo + capítulo anterior / siguiente. */
export async function obtenerCapitulo(bibliaId, capituloId) {
  const clave = `lumbre:p:${bibliaId}:${capituloId}:cap`;
  const enCache = leerCache(clave);
  if (enCache) { reportarFums(enCache.fums); return enCache; }
  const r = await api(`bibles/${bibliaId}/chapters/${capituloId}`, { ...PARAMS_TEXTO, 'include-verse-numbers': 'true' });
  const valor = {
    id: r.data.id,
    referencia: r.data.reference || formatearRef(capituloId),
    versos: separarVersos(r.data.content || ''),
    copyright: r.data.copyright || '',
    anterior: r.data.previous?.id || null,
    siguiente: r.data.next?.id || null,
    fums: r.meta?.fumsToken,
  };
  guardarCache(clave, valor);
  return valor;
}

/** Libros con sus capítulos (para el selector del lector). */
export async function obtenerLibros(bibliaId) {
  const clave = `lumbre:libros:${bibliaId}`;
  const enCache = leerCache(clave, 24 * 7);
  if (enCache) return enCache;
  const r = await api(`bibles/${bibliaId}/books`, { 'include-chapters': 'true' });
  const valor = (r.data || []).map((l) => ({
    id: l.id,
    nombre: LIBROS[l.id] || l.nameLong || l.name,
    capitulos: (l.chapters || []).filter((c) => c.number !== 'intro').map((c) => ({ id: c.id, numero: c.number })),
  }));
  guardarCache(clave, valor);
  return valor;
}

/** Búsqueda por palabras o por referencia ("Juan 3:16", "paz"). */
export async function buscar(bibliaId, consulta) {
  const r = await api(`bibles/${bibliaId}/search`, { query: consulta, limit: '25', sort: 'relevance', 'fums-version': '3' });
  const d = r.data || {};
  if (d.passages?.length) {
    return d.passages.map((p) => ({
      id: p.id, referencia: p.reference,
      texto: (p.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    }));
  }
  return (d.verses || []).map((v) => ({ id: v.id, referencia: v.reference, texto: (v.text || '').trim() }));
}
