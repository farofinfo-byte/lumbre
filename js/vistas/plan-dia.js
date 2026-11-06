import { sb, estado, ok, registrarLectura } from '../estado.js';
import { esc, ICONOS, avatar, aviso, error, haceCuanto, parrafos } from '../ui.js';
import { formatearRef, capituloDe, obtenerPasajeConVersos } from '../biblia.js';
import { htmlVersos, cargarSubrayados, activarVersos } from '../acciones.js';
import { cargarGrupo } from './plan.js';

export async function render(el, id, diaTxt) {
  const { grupo, plan, miembros, progreso } = await cargarGrupo(id);
  const dia = Math.min(Math.max(1, Number(diaTxt)), plan.dias.length);
  const pasajes = plan.dias[dia - 1];
  const yo = estado.usuario.id;
  const enGrupo = miembros.length > 1;
  const hecho = progreso.some((p) => p.usuario === yo && p.dia === dia);
  const quienes = miembros.filter((m) => progreso.some((p) => p.usuario === m.id && p.dia === dia));
  const titulo = pasajes.map(formatearRef).join(' · ');

  el.innerHTML = `
    <a class="boton fantasma chico" href="#/plan/${grupo.id}" style="margin:8px 0 4px -10px">${ICONOS.izq} ${esc(plan.titulo)}</a>
    <p class="etiqueta">Día ${dia} de ${plan.dias.length}</p>
    <h1 style="margin-top:6px">${esc(titulo)}</h1>
    ${quienes.length ? `<div class="fila" style="margin-top:12px"><span class="avatares">${quienes.map((m) => avatar(m, 'chico')).join('')}</span>
      <span class="tenue pequeno">${quienes.length === 1 ? (quienes[0].id === yo ? 'Ya lo leíste' : `${esc(quienes[0].nombre)} ya lo leyó`) : `${quienes.length} ya lo leyeron`}</span></div>` : ''}

    <div class="lector" data-texto style="margin-top:22px">${estado.biblia ? '' : `<p class="suave">${esc(estado.errorBiblias?.mensaje || 'Configura API.Bible para ver el texto.')}</p>`}</div>

    <div class="tarjeta" style="margin-top:26px;text-align:center">
      <button class="boton ${hecho ? 'suave' : 'oro'}" data-marcar>${ICONOS.check} ${hecho ? 'Leído · desmarcar' : 'Marcar como leído'}</button>
      <a class="boton borde" style="margin-left:6px" href="#/diario/nuevo?grupo=${grupo.id}&dia=${dia}&pasaje=${encodeURIComponent(pasajes[0])}&ref=${encodeURIComponent(titulo)}">${ICONOS.lapiz} Escribir devocional</a>
    </div>

    <section class="seccion" data-devocionales></section>
    ${enGrupo ? `<section class="seccion"><div class="seccion-titulo"><h2>Conversación del día</h2></div>
      <div class="tarjeta"><div data-comentarios></div>
        <form class="fila" data-form style="margin-top:12px;align-items:flex-end">
          <textarea class="area" style="min-height:48px" maxlength="2000" placeholder="¿Qué te llamó la atención hoy?" required></textarea>
          <button class="boton oro icono" aria-label="Enviar">${ICONOS.enviar}</button>
        </form></div></section>` : ''}

    <nav class="navegacion-capitulo">
      ${dia > 1 ? `<a class="boton borde" href="#/plan/${grupo.id}/${dia - 1}">${ICONOS.izq} Día ${dia - 1}</a>` : '<span></span>'}
      ${dia < plan.dias.length ? `<a class="boton borde" href="#/plan/${grupo.id}/${dia + 1}">Día ${dia + 1} ${ICONOS.der}</a>` : '<span></span>'}
    </nav>`;

  // Texto
  if (estado.biblia) pintarTexto(el.querySelector('[data-texto]'), pasajes);

  // Marcar como leído
  el.querySelector('[data-marcar]').onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try {
      if (b.textContent.includes('desmarcar')) {
        ok(await sb.from('plan_progreso').delete().eq('grupo_id', grupo.id).eq('usuario', yo).eq('dia', dia));
        b.className = 'boton oro'; b.innerHTML = `${ICONOS.check} Marcar como leído`;
      } else {
        ok(await sb.from('plan_progreso').insert({ grupo_id: grupo.id, usuario: yo, dia }));
        await registrarLectura();
        b.className = 'boton suave'; b.innerHTML = `${ICONOS.check} Leído · desmarcar`;
        aviso(dia === plan.dias.length ? '¡Terminaste el plan! 🎉' : '¡Bien! Un día más');
      }
    } catch (err) { error(err); }
    b.disabled = false;
  };

  pintarDevocionales(el.querySelector('[data-devocionales]'), grupo.id, dia);
  if (enGrupo) conversacion(el, grupo.id, dia);
}

async function pintarTexto(caja, pasajes) {
  caja.innerHTML = '<div class="esqueleto" style="height:240px"></div>';
  try {
    const [partes, colores] = await Promise.all([
      Promise.all(pasajes.map((p) => obtenerPasajeConVersos(estado.biblia.id, p))),
      cargarSubrayados([...new Set(pasajes.map(capituloDe))]),
    ]);
    caja.innerHTML = partes.map((p, i) => `
      ${pasajes.length > 1 ? `<h3 style="margin:24px 0 8px">${esc(p.referencia)}</h3>` : ''}
      ${htmlVersos(p.versos, capituloDe(pasajes[i]), colores)}`).join('') +
      (partes[0]?.copyright ? `<p class="copyright">${esc(partes[0].copyright)}</p>` : '');
    activarVersos(caja, colores, (vid) => formatearRef(capituloDe(vid)));
  } catch (e) { caja.innerHTML = `<p class="suave">${esc(e.mensaje || 'No se pudo cargar el texto.')}</p>`; }
}

async function pintarDevocionales(caja, grupoId, dia) {
  try {
    const filas = ok(await sb.from('entradas')
      .select('id, titulo, contenido, creado_en, autor, autor_p:perfiles!entradas_autor_fkey(id, nombre, color)')
      .eq('grupo_id', grupoId).eq('dia', dia).order('creado_en'));
    if (!filas.length) return;
    caja.innerHTML = `<div class="seccion-titulo"><h2>Devocionales de este día</h2></div>
      ${filas.map((x) => `<a class="tarjeta entrada-tarjeta" href="#/entrada/${x.id}">
        <div class="fila">${avatar(x.autor_p, 'chico')}<span class="pequeno"><b>${esc(x.autor === estado.usuario.id ? 'Tú' : x.autor_p?.nombre)}</b> <span class="tenue">· ${haceCuanto(x.creado_en)}</span></span></div>
        ${x.titulo ? `<h3>${esc(x.titulo)}</h3>` : '<div style="height:8px"></div>'}
        <p class="suave recortar">${esc(x.contenido)}</p></a>`).join('')}`;
  } catch (e) { console.warn(e); }
}

function conversacion(el, grupoId, dia) {
  const lista = el.querySelector('[data-comentarios]');
  const cargar = async () => {
    try {
      const filas = ok(await sb.from('plan_comentarios')
        .select('id, contenido, creado_en, autor, autor_p:perfiles!plan_comentarios_autor_fkey(id, nombre, color)')
        .eq('grupo_id', grupoId).eq('dia', dia).order('creado_en'));
      lista.innerHTML = filas.length ? filas.map((c) => `
        <div class="comentario">${avatar(c.autor_p, 'chico')}<div class="burbuja">
          <span class="quien">${esc(c.autor_p?.nombre || 'Alguien')}</span> <span class="tenue mini">${haceCuanto(c.creado_en)}</span>
          <div style="margin-top:2px">${parrafos(c.contenido)}</div></div></div>`).join('')
        : '<p class="tenue pequeno">Sé el primero en compartir algo sobre la lectura de hoy.</p>';
    } catch (e) { lista.innerHTML = `<p class="tenue">${esc(e.message)}</p>`; }
  };
  cargar();
  const form = el.querySelector('[data-form]');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const area = form.querySelector('textarea');
    const contenido = area.value.trim();
    if (!contenido) return;
    try {
      ok(await sb.from('plan_comentarios').insert({ grupo_id: grupoId, dia, autor: estado.usuario.id, contenido }));
      area.value = '';
      cargar();
    } catch (err) { error(err); }
  };
}
