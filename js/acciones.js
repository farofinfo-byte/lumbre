// =====================================================================
//  Acciones que se usan en varias pantallas:
//  enviar un versículo, compartir como imagen, guardar/subrayar, elegir amigos
// =====================================================================
import { sb, estado, ok } from './estado.js';
import { esc, hoja, aviso, error, avatar, ICONOS, copiarTexto, $$ } from './ui.js';
import { crearImagenVersiculo } from './imagen.js';

/** Chips de amigos seleccionables. Devuelve el HTML; leer con amigosElegidos(raiz). */
export function selectorAmigos(seleccion = [], { uno = false, lista = estado.amigos } = {}) {
  if (!lista.length) {
    return `<p class="suave pequeno">Aún no tienes amigos en Lumbre. <a href="#/amigos" data-cerrar>Invita a alguien</a> con tu código.</p>`;
  }
  return `<div class="chips" data-selector-amigos data-uno="${uno ? 1 : 0}">${lista.map((a) => `
    <button type="button" class="chip" data-amigo="${esc(a.id)}" aria-pressed="${seleccion.includes(a.id)}">
      ${avatar(a, 'chico')} ${esc(a.nombre)}
    </button>`).join('')}</div>`;
}
export function activarSelectorAmigos(raiz) {
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-amigo]');
    if (!b) return;
    const grupo = b.closest('[data-selector-amigos]');
    if (grupo.dataset.uno === '1') $$('[data-amigo]', grupo).forEach((x) => x !== b && x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });
}
export const amigosElegidos = (raiz) => $$('[data-amigo][aria-pressed="true"]', raiz).map((b) => b.dataset.amigo);

/** "Versículo para hoy": enviar a uno o varios amigos. */
export function enviarVersiculo({ pasajeId, referencia, texto }) {
  const { panel, cerrar } = hoja(`
    <h2>Enviar un versículo</h2>
    <div class="cita">${esc(texto)}<b>${esc(referencia)}</b></div>
    <div class="pila" style="margin-top:18px">
      <div><span class="etiqueta">¿Para quién?</span><div style="margin-top:10px">${selectorAmigos()}</div></div>
      <label class="campo"><span>Una nota (opcional)</span>
        <textarea class="area" style="min-height:90px" maxlength="500" placeholder="Pensé en ti al leer esto…" data-nota></textarea></label>
      <button class="boton oro bloque" data-enviar ${estado.amigos.length ? '' : 'disabled'}>${ICONOS.enviar} Enviar</button>
    </div>`);
  activarSelectorAmigos(panel);
  panel.querySelector('[data-enviar]').onclick = async (e) => {
    const para = amigosElegidos(panel);
    if (!para.length) return aviso('Elige al menos a un amigo');
    e.currentTarget.disabled = true;
    const nota = panel.querySelector('[data-nota]').value.trim() || null;
    try {
      ok(await sb.from('envios').insert(para.map((id) => ({
        de: estado.usuario.id, para: id, pasaje_id: pasajeId, referencia, texto,
        biblia: estado.biblia?.abrev || null, nota,
      }))));
      aviso(para.length > 1 ? 'Versículo enviado a tus amigos' : 'Versículo enviado');
      cerrar();
    } catch (err) { error(err); e.currentTarget.disabled = false; }
  };
}

/** Genera la imagen para historias y permite compartirla o descargarla. */
export async function compartirImagen({ texto, referencia, version, etiqueta }) {
  const { panel, cerrar } = hoja(`<h2>Compartir como imagen</h2><div data-vista style="min-height:200px" class="cargando"></div>`);
  try {
    const blob = await crearImagenVersiculo({ texto, referencia, version, etiqueta });
    const url = URL.createObjectURL(blob);
    const archivo = new File([blob], `lumbre-${referencia.replace(/[^\w]+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
    const puedeCompartir = navigator.canShare?.({ files: [archivo] });
    panel.querySelector('[data-vista]').outerHTML = `
      <img src="${url}" alt="Vista previa" style="width:min(260px,70%);margin:0 auto;border-radius:18px;box-shadow:var(--sombra-alta)">
      <p class="tenue pequeno" style="text-align:center;margin-top:12px">Lista para tus historias de Instagram</p>
      <div class="fila" style="justify-content:center;margin-top:16px">
        ${puedeCompartir ? `<button class="boton oro" data-compartir>${ICONOS.compartir} Compartir</button>` : ''}
        <a class="boton ${puedeCompartir ? 'borde' : 'oro'}" href="${url}" download="${archivo.name}">Descargar</a>
      </div>`;
    panel.querySelector('[data-compartir]')?.addEventListener('click', async () => {
      try { await navigator.share({ files: [archivo], title: referencia }); cerrar(); }
      catch (e) { if (e.name !== 'AbortError') aviso('No se pudo compartir', 'error'); }
    });
  } catch (e) { cerrar(); error(e, 'No se pudo crear la imagen'); }
}

/** Guarda o actualiza un subrayado / favorito. color = null lo elimina. */
export async function guardarFavorito({ versoId, referencia, texto, color = 'oro' }) {
  if (color === null) {
    ok(await sb.from('favoritos').delete().eq('usuario', estado.usuario.id).eq('verso_id', versoId));
    return null;
  }
  return ok(await sb.from('favoritos').upsert({
    usuario: estado.usuario.id, verso_id: versoId, referencia, texto, color,
    biblia_id: estado.biblia?.id || null, biblia_nombre: estado.biblia?.abrev || estado.biblia?.nombre || null,
  }, { onConflict: 'usuario,verso_id' }).select().single());
}

/** Menú de acciones para un versículo (lector, favoritos). */
export function menuVersiculo({ versoId, referencia, texto, colorActual = null, alCambiarColor }) {
  const colores = ['oro', 'salvia', 'cielo', 'rosa'];
  const { panel, cerrar } = hoja(`
    <div class="cita">${esc(texto)}<b>${esc(referencia)}</b></div>
    <div class="fila entre" style="margin-top:18px">
      <span class="etiqueta">Subrayar</span>
      <div class="puntos-color">${colores.map((c) => `<button class="punto ${c === colorActual ? 'activo' : ''}" data-color="${c}" aria-label="Subrayar ${c}"></button>`).join('')}</div>
    </div>
    <div class="opciones-hoja">
      ${colorActual ? `<button class="opcion" data-quitar>${ICONOS.cerrar} Quitar subrayado</button>` : `<button class="opcion" data-guardar>${ICONOS.favoritos} Guardar en favoritos</button>`}
      <button class="opcion" data-enviar>${ICONOS.enviar} Enviar a un amigo</button>
      <button class="opcion" data-imagen>${ICONOS.imagen} Compartir como imagen</button>
      <a class="opcion" data-cerrar href="#/diario/nuevo?pasaje=${encodeURIComponent(versoId)}&ref=${encodeURIComponent(referencia)}&texto=${encodeURIComponent(texto.slice(0, 900))}">${ICONOS.diario} Escribir en mi diario</a>
      <button class="opcion" data-copiar>${ICONOS.copiar} Copiar</button>
    </div>`);
  const cambiar = async (color) => {
    try {
      await guardarFavorito({ versoId, referencia, texto, color });
      alCambiarColor?.(color);
      aviso(color ? 'Guardado en tus favoritos' : 'Subrayado quitado');
      cerrar();
    } catch (e) { error(e); }
  };
  panel.addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]');
    if (c) return cambiar(c.dataset.color);
    if (e.target.closest('[data-guardar]')) return cambiar('oro');
    if (e.target.closest('[data-quitar]')) return cambiar(null);
    if (e.target.closest('[data-enviar]')) { cerrar(); return enviarVersiculo({ pasajeId: versoId, referencia, texto }); }
    if (e.target.closest('[data-imagen]')) { cerrar(); return compartirImagen({ texto, referencia, version: estado.biblia?.abrev }); }
    if (e.target.closest('[data-copiar]')) { copiarTexto(`${texto} — ${referencia}`); cerrar(); }
  });
}

// ---------- Texto bíblico con versículos tocables ----------
/** HTML de versículos. colores: Map(versoId → color) */
export function htmlVersos(versos, capituloId, colores = new Map()) {
  let html = '<p>';
  versos.forEach((v, i) => {
    if (v.parrafo && i > 0) html += '</p><p>';
    const id = `${capituloId}.${v.n}`;
    const color = colores.get(id);
    html += `<span class="verso ${color ? `sub-${color}` : ''}" data-verso="${esc(id)}" data-n="${v.n}">${v.n ? `<sup>${v.n}</sup>` : ''}${esc(v.texto)}</span> `;
  });
  return `${html}</p>`;
}

/** Carga los subrayados del usuario para una lista de ids de versículos. */
export async function cargarSubrayados(prefijos) {
  if (!prefijos.length) return new Map();
  const filtro = prefijos.map((p) => `verso_id.like.${p}.*`).join(',');
  const filas = ok(await sb.from('favoritos').select('verso_id, color').eq('usuario', estado.usuario.id).or(filtro));
  return new Map(filas.map((f) => [f.verso_id, f.color]));
}

/** Al tocar un versículo, abre su menú (subrayar, enviar, imagen, diario). */
export function activarVersos(raiz, colores, nombreCapitulo) {
  raiz.addEventListener('click', (e) => {
    const span = e.target.closest('[data-verso]');
    if (!span) return;
    const versoId = span.dataset.verso;
    const texto = span.textContent.replace(/^\d+/, '').trim();
    const referencia = `${nombreCapitulo(versoId)}:${span.dataset.n}`;
    $$('.verso.sel', raiz).forEach((x) => x.classList.remove('sel'));
    span.classList.add('sel');
    menuVersiculo({
      versoId, referencia, texto, colorActual: colores.get(versoId) || null,
      alCambiarColor: (color) => {
        span.className = `verso ${color ? `sub-${color}` : ''}`;
        if (color) colores.set(versoId, color); else colores.delete(versoId);
      },
    });
  });
}
