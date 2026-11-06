// =====================================================================
//  Utilidades de interfaz: íconos, avisos, hojas, fechas, escapes
// =====================================================================

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/** Escapa texto para insertarlo de forma segura en HTML. */
export function esc(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** Texto con saltos de línea → párrafos HTML (escapado). */
export function parrafos(texto) {
  return String(texto ?? '').trim().split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replaceAll('\n', '<br>')}</p>`).join('');
}

// ---------- Íconos (trazo, 24×24) ----------
const t = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONOS = {
  inicio: t('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>'),
  leer: t('<path d="M12 7c-2-1.6-4.8-2.4-8-2v13c3.2-.4 6 .4 8 2 2-1.6 4.8-2.4 8-2V5c-3.2-.4-6 .4-8 2Z"/><path d="M12 7v13"/>'),
  planes: t('<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>'),
  diario: t('<path d="M20 4.5c-6 0-11 4.2-12.5 10.5L6 21"/><path d="M20 4.5c0 7-4.6 11.5-12 11.5"/><path d="M10.5 12.5c2.5 0 5-.8 6.8-2.6"/>'),
  oracion: t('<path d="M12 21c-4.5-2.6-8-6-8-10.2C4 8 6 6 8.4 6c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2C18 6 20 8 20 10.8 20 15 16.5 18.4 12 21Z"/><path d="M12 3v1.5M8.5 3.6l.6 1.3M15.5 3.6l-.6 1.3"/>'),
  amigos: t('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.6 3.2-6 6.5-6s6 2.4 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14c2.7 0 4.6 2 5 5"/>'),
  favoritos: t('<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z"/>'),
  resumen: t('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  ajustes: t('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  llama: t('<path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.8 1.6-4.6 2.8-6.5.5 1.6 1.2 2.7 2.2 3.4-.4-2.6-.4-5.2.5-7.9Z"/>'),
  compartir: t('<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/>'),
  enviar: t('<path d="M21.5 2.5 10.5 13.5"/><path d="m21.5 2.5-7 19-4-8-8-4 19-7Z"/>'),
  mas: t('<path d="M12 5v14M5 12h14"/>'),
  cerrar: t('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: t('<path d="m4.5 12.5 5 5 10-11"/>'),
  izq: t('<path d="m15 18-6-6 6-6"/>'),
  der: t('<path d="m9 18 6-6-6-6"/>'),
  buscar: t('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>'),
  corazon: t('<path d="M12 20.5C6.5 17 3 13.6 3 9.5 3 6.9 5 5 7.5 5c1.8 0 3.4 1 4.5 2.6C13.1 6 14.7 5 16.5 5 19 5 21 6.9 21 9.5c0 4.1-3.5 7.5-9 11Z"/>'),
  campana: t('<path d="M18 16V11a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"/><path d="M10 21h4"/>'),
  salir: t('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>'),
  copiar: t('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>'),
  subrayar: t('<path d="m9 11 5.5-5.5a2.1 2.1 0 0 1 3 3L12 14"/><path d="m9 11-3 3 4 4 3-3"/><path d="M4 21h8"/>'),
  lapiz: t('<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"/>'),
  basura: t('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  candado: t('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>'),
  grupo: t('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.6 3.4-6 7-6s6.4 2.4 7 6"/>'),
  ojo: t('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  sol: t('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  luna: t('<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/>'),
  imagen: t('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m20.5 15-4.5-4.5L5 21"/>'),
  menu: t('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  estrella: t('<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8L12 3Z"/>'),
  sparkle: t('<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z"/>'),
  texto: t('<path d="M4 7V5h16v2M9 19h6M12 5v14"/>'),
  enlace: t('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
};

/** Logo de Lumbre (el libro toma el color del texto). */
export function logo(clase = 'logo') {
  return `<svg class="${clase}" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 5c3.2 8.6 12.6 14.4 12.6 25.2C44.6 38.3 39 43 32 43s-12.6-4.7-12.6-12.8c0-6.4 3.7-10.6 6.6-15 1.1 3.8 2.6 6.4 5.1 7.9C29.7 17.6 29.6 11 32 5Z" fill="url(#lg-llama)"/>
    <path d="M32 25.5c2.7 3.4 5.4 6 5.4 9.6 0 3.5-2.4 5.9-5.4 5.9s-5.4-2.4-5.4-5.9c0-3.6 2.7-6.2 5.4-9.6Z" style="fill:var(--fondo)"/>
    <path d="M6 45.5c9.5-3.6 18.5-3 26 3.2v6.8c-7.5-5.6-16.5-6.2-26-3V45.5Z" fill="currentColor"/>
    <path d="M58 45.5c-9.5-3.6-18.5-3-26 3.2v6.8c7.5-5.6 16.5-6.2 26-3V45.5Z" fill="currentColor"/>
  </svg>`;
}

export const LLAMA_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <path d="M32 5c3.2 8.6 12.6 14.4 12.6 25.2C44.6 38.3 39 43 32 43s-12.6-4.7-12.6-12.8c0-6.4 3.7-10.6 6.6-15 1.1 3.8 2.6 6.4 5.1 7.9C29.7 17.6 29.6 11 32 5Z" fill="url(#lg-vela)"/>
  <path d="M32 25.5c2.7 3.4 5.4 6 5.4 9.6 0 3.5-2.4 5.9-5.4 5.9s-5.4-2.4-5.4-5.9c0-3.6 2.7-6.2 5.4-9.6Z" fill="#FFF6E2"/>
</svg>`;

export const cargando = () => `<div class="cargando"><svg class="chispa" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.8 1.6-4.6 2.8-6.5.5 1.6 1.2 2.7 2.2 3.4-.4-2.6-.4-5.2.5-7.9Z"/></svg></div>`;

export function vacio(icono, titulo, texto = '', extra = '') {
  return `<div class="vacio">${ICONOS[icono] || ''}<h3>${esc(titulo)}</h3><p>${esc(texto)}</p>${extra}</div>`;
}

// ---------- Personas ----------
export function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '?') + (partes[1]?.[0] || '')).toUpperCase();
}
export function avatar(perfil, clase = '') {
  const p = perfil || {};
  return `<span class="avatar ${clase}" style="--c:${esc(p.color || '#C8902E')}" title="${esc(p.nombre || '')}">${esc(iniciales(p.nombre))}</span>`;
}
export const COLORES_PERFIL = ['#C8902E', '#B5543C', '#5E8C6A', '#3F6FB5', '#7A4FA8', '#C25E86', '#2E8A8A', '#14213D'];

// ---------- Fechas ----------
export function fechaLocal(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function desdeFechaLocal(texto) {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
export function haceCuanto(iso) {
  const seg = (new Date(iso) - new Date()) / 1000;
  const pasos = [[60, 'second'], [3600, 'minute', 60], [86400, 'hour', 3600], [604800, 'day', 86400], [2629800, 'week', 604800], [31557600, 'month', 2629800], [Infinity, 'year', 31557600]];
  for (const [limite, unidad, div = 1] of pasos) {
    if (Math.abs(seg) < limite) return rtf.format(Math.round(seg / div), unidad);
  }
  return '';
}
export function fechaLarga(d = new Date()) {
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function saludoSegunHora(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

// ---------- Avisos ----------
export function aviso(mensaje, tipo = '') {
  let caja = $('.avisos');
  if (!caja) { caja = document.createElement('div'); caja.className = 'avisos'; caja.setAttribute('role', 'status'); document.body.append(caja); }
  const el = document.createElement('div');
  el.className = `aviso ${tipo}`;
  el.textContent = mensaje;
  caja.append(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3200);
}
export function error(e, alternativo = 'Algo salió mal. Intenta de nuevo.') {
  console.error(e);
  aviso(e?.mensaje || e?.message || alternativo, 'error');
}

// ---------- Hoja (panel inferior / modal) ----------
export function hoja(html, { alCerrar } = {}) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  const panel = document.createElement('div');
  panel.className = 'hoja';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.innerHTML = html;
  document.body.append(velo, panel);
  document.body.style.overflow = 'hidden';
  const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };
  function cerrar() {
    velo.remove(); panel.remove();
    if (!$('.hoja')) document.body.style.overflow = '';
    document.removeEventListener('keydown', alTeclear);
    alCerrar?.();
  }
  velo.addEventListener('click', cerrar);
  document.addEventListener('keydown', alTeclear);
  panel.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]')) cerrar(); });
  setTimeout(() => panel.querySelector('[autofocus]')?.focus(), 50);
  return { panel, cerrar };
}

export function confirmar(mensaje, { si = 'Sí', no = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolver) => {
    let respondido = false;
    const { panel, cerrar } = hoja(`
      <h2>${esc(mensaje)}</h2>
      <div class="fila" style="justify-content:flex-end;margin-top:20px">
        <button class="boton fantasma" data-no>${esc(no)}</button>
        <button class="boton ${peligro ? 'peligro' : ''}" data-si>${esc(si)}</button>
      </div>`, { alCerrar: () => { if (!respondido) resolver(false); } });
    panel.querySelector('[data-si]').onclick = () => { respondido = true; resolver(true); cerrar(); };
    panel.querySelector('[data-no]').onclick = () => { respondido = true; resolver(false); cerrar(); };
  });
}

/** Lee los parámetros que vienen después de "?" en el hash. */
export function parametrosHash() {
  const q = location.hash.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(q));
}

export async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); aviso('Copiado'); }
  catch { aviso('No se pudo copiar', 'error'); }
}
