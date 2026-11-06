import { sb, estado, ok } from '../estado.js';
import { esc, ICONOS, avatar, haceCuanto, parrafos, confirmar, aviso, error } from '../ui.js';
import { VISIBILIDAD } from './diario.js';

export async function render(el, id) {
  const e = ok(await sb.from('entradas')
    .select('*, autor_p:perfiles!entradas_autor_fkey(id, nombre, color)').eq('id', id).maybeSingle());
  if (!e) throw new Error('Esta entrada no existe o no está compartida contigo.');
  const mia = e.autor === estado.usuario.id;
  const v = VISIBILIDAD[e.visibilidad];
  let lectores = [];
  if (mia && e.visibilidad === 'elegidos') {
    const ids = ok(await sb.from('entrada_lectores').select('lector').eq('entrada_id', id)).map((l) => l.lector);
    lectores = estado.amigos.filter((a) => ids.includes(a.id));
  }

  el.innerHTML = `
    <a class="boton fantasma chico" href="#/diario" style="margin:8px 0 4px -10px">${ICONOS.izq} Diario</a>
    <article>
      <div class="fila entre envolver" style="margin-top:8px">
        <span class="fila">${avatar(e.autor_p)}<span><b>${esc(mia ? 'Tú' : e.autor_p?.nombre)}</b><br>
          <span class="tenue pequeno">${new Date(e.creado_en).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></span></span>
        ${mia ? `<span class="pastilla">${ICONOS[v.icono]} ${v.texto}${lectores.length ? `: ${esc(lectores.map((l) => l.nombre.split(' ')[0]).join(', '))}` : ''}</span>` : ''}
      </div>
      ${e.titulo ? `<h1 style="margin-top:22px">${esc(e.titulo)}</h1>` : ''}
      ${e.pasaje_texto ? `<div class="cita" style="margin-top:20px">${esc(e.pasaje_texto)}<b>${esc(e.pasaje_ref || '')}</b></div>`
        : e.pasaje_ref ? `<span class="pastilla oro" style="margin-top:18px">${ICONOS.leer} ${esc(e.pasaje_ref)}</span>` : ''}
      <div class="pasaje" style="margin-top:22px">${parrafos(e.contenido)}</div>
      ${e.grupo_id && e.dia ? `<a class="boton borde chico" style="margin-top:20px" href="#/plan/${e.grupo_id}/${e.dia}">${ICONOS.planes} Ver el día ${e.dia} del plan</a>` : ''}
      ${mia ? `<div class="fila" style="margin-top:26px">
        <a class="boton borde chico" href="#/diario/editar/${e.id}">${ICONOS.lapiz} Editar</a>
        <button class="boton peligro chico" data-borrar>${ICONOS.basura} Eliminar</button></div>` : ''}
    </article>

    ${e.visibilidad !== 'privado' ? `
    <section class="seccion">
      <div class="seccion-titulo"><h2>Comentarios</h2></div>
      <div class="tarjeta"><div data-comentarios></div>
        <form class="fila" data-form style="margin-top:12px;align-items:flex-end">
          <textarea class="area" style="min-height:48px" maxlength="2000" placeholder="${mia ? 'Responde a tus amigos…' : 'Escribe unas palabras de ánimo…'}" required></textarea>
          <button class="boton oro icono" aria-label="Enviar">${ICONOS.enviar}</button>
        </form></div>
    </section>` : ''}`;

  el.querySelector('[data-borrar]')?.addEventListener('click', async () => {
    if (!(await confirmar('¿Eliminar esta entrada?', { si: 'Eliminar', peligro: true }))) return;
    try { ok(await sb.from('entradas').delete().eq('id', id)); aviso('Entrada eliminada'); location.hash = '#/diario'; }
    catch (err) { error(err); }
  });

  if (e.visibilidad === 'privado') return;
  const lista = el.querySelector('[data-comentarios]');
  const cargar = async () => {
    const filas = ok(await sb.from('comentarios')
      .select('id, contenido, creado_en, autor, autor_p:perfiles!comentarios_autor_fkey(id, nombre, color)')
      .eq('entrada_id', id).order('creado_en'));
    lista.innerHTML = filas.length ? filas.map((c) => `
      <div class="comentario">${avatar(c.autor_p, 'chico')}<div class="burbuja">
        <span class="quien">${esc(c.autor === estado.usuario.id ? 'Tú' : c.autor_p?.nombre || 'Alguien')}</span>
        <span class="tenue mini">${haceCuanto(c.creado_en)}</span>
        ${c.autor === estado.usuario.id || mia ? `<button class="boton fantasma chico" style="min-height:24px;padding:0 6px;float:right" data-quitar="${c.id}" aria-label="Eliminar">${ICONOS.cerrar.replace('<svg', '<svg style="width:14px"')}</button>` : ''}
        <div style="margin-top:2px">${parrafos(c.contenido)}</div></div></div>`).join('')
      : '<p class="tenue pequeno">Aún no hay comentarios.</p>';
  };
  cargar().catch((err) => { lista.innerHTML = `<p class="tenue">${esc(err.message)}</p>`; });

  lista.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-quitar]');
    if (!b) return;
    try { ok(await sb.from('comentarios').delete().eq('id', b.dataset.quitar)); cargar(); } catch (err) { error(err); }
  });
  const form = el.querySelector('[data-form]');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const area = form.querySelector('textarea');
    const contenido = area.value.trim();
    if (!contenido) return;
    try {
      ok(await sb.from('comentarios').insert({ entrada_id: id, autor: estado.usuario.id, contenido }));
      area.value = ''; cargar();
    } catch (err) { error(err); }
  };
}
