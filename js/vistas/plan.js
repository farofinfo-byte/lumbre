import { sb, estado, ok } from '../estado.js';
import { esc, ICONOS, avatar, hoja, aviso, error, confirmar } from '../ui.js';
import { planPorSlug } from '../datos/planes.js';
import { formatearRef } from '../biblia.js';
import { selectorAmigos, activarSelectorAmigos, amigosElegidos } from '../acciones.js';

export async function cargarGrupo(id) {
  const grupo = ok(await sb.from('plan_grupos').select('*').eq('id', id).maybeSingle());
  if (!grupo) throw new Error('Este plan no existe o ya no tienes acceso.');
  const plan = planPorSlug(grupo.plan_slug);
  if (!plan) throw new Error('Este plan ya no está disponible.');
  const [miembros, progreso] = await Promise.all([
    sb.from('plan_miembros').select('usuario, perfil:perfiles(id, nombre, color)').eq('grupo_id', id).then(ok),
    sb.from('plan_progreso').select('usuario, dia').eq('grupo_id', id).then(ok),
  ]);
  return { grupo, plan, miembros: miembros.map((m) => m.perfil || { id: m.usuario, nombre: 'Alguien' }), progreso };
}

export async function render(el, id) {
  const { grupo, plan, miembros, progreso } = await cargarGrupo(id);
  const yo = estado.usuario.id;
  const soyCreador = grupo.creador === yo;
  const mios = new Set(progreso.filter((p) => p.usuario === yo).map((p) => p.dia));
  let siguiente = 1;
  while (mios.has(siguiente) && siguiente < plan.dias.length) siguiente++;
  const pct = Math.round((mios.size / plan.dias.length) * 100);

  el.innerHTML = `
    <a class="boton fantasma chico" href="#/planes" style="margin:8px 0 4px -10px">${ICONOS.izq} Planes</a>
    <div class="plan-tarjeta"><div class="portada" style="--a:${plan.colores[0]};--b:${plan.colores[1]};height:140px;padding:20px">
      <div style="position:relative;z-index:1"><p class="etiqueta" style="color:#F2C877">${plan.dias.length} días${miembros.length > 1 ? ' · en grupo' : ''}</p>
      <b style="display:block;margin-top:6px;font-size:2rem">${esc(plan.titulo)}</b></div></div></div>

    <div class="tarjeta" style="margin-top:14px">
      <div class="fila entre"><b>Tu avance</b><span class="pastilla oro">${pct}%</span></div>
      <div class="progreso" style="margin:12px 0"><i style="width:${pct}%"></i></div>
      <a class="boton oro bloque" href="#/plan/${grupo.id}/${siguiente}">${mios.size === plan.dias.length ? '¡Plan completado! Repasar' : `Leer el día ${siguiente}`}</a>
    </div>

    ${miembros.length > 1 || soyCreador ? `
    <section class="seccion">
      <div class="seccion-titulo"><h2>Juntos en este plan</h2>${soyCreador ? `<button class="boton borde chico" data-invitar>${ICONOS.mas} Invitar</button>` : ''}</div>
      <div class="tarjeta"><ul class="lista">${miembros.map((m) => {
        const n = progreso.filter((p) => p.usuario === m.id).length;
        return `<li class="item">${avatar(m)}<div class="cuerpo"><div class="titulo">${esc(m.nombre)}${m.id === yo ? ' <span class="tenue">(tú)</span>' : ''}</div>
          <div class="progreso" style="margin-top:6px"><i style="width:${Math.round((n / plan.dias.length) * 100)}%"></i></div></div>
          <span class="tenue mini">${n}/${plan.dias.length}</span></li>`;
      }).join('')}</ul></div>
    </section>` : ''}

    <section class="seccion">
      <div class="seccion-titulo"><h2>Días</h2></div>
      <div class="dias">${plan.dias.map((d, i) => `
        <a class="dia ${mios.has(i + 1) ? 'hecho' : ''} ${i + 1 === siguiente && !mios.has(i + 1) ? 'actual' : ''}"
           href="#/plan/${grupo.id}/${i + 1}" title="${esc(d.map(formatearRef).join(', '))}">${i + 1}</a>`).join('')}</div>
    </section>

    <div class="fila" style="justify-content:center;margin-top:34px">
      ${soyCreador ? `<button class="boton peligro chico" data-borrar>${ICONOS.basura} Eliminar plan</button>`
                   : `<button class="boton peligro chico" data-salir>${ICONOS.salir} Salir del plan</button>`}
    </div>`;

  el.querySelector('[data-invitar]')?.addEventListener('click', () => invitar(grupo, miembros));
  el.querySelector('[data-borrar]')?.addEventListener('click', async () => {
    if (!(await confirmar('¿Eliminar este plan para todos?', { si: 'Eliminar', peligro: true }))) return;
    try { ok(await sb.from('plan_grupos').delete().eq('id', grupo.id)); aviso('Plan eliminado'); location.hash = '#/planes'; }
    catch (e) { error(e); }
  });
  el.querySelector('[data-salir]')?.addEventListener('click', async () => {
    if (!(await confirmar('¿Salir de este plan?', { si: 'Salir', peligro: true }))) return;
    try { ok(await sb.from('plan_miembros').delete().eq('grupo_id', grupo.id).eq('usuario', yo)); location.hash = '#/planes'; }
    catch (e) { error(e); }
  });
}

function invitar(grupo, miembros) {
  const dentro = new Set(miembros.map((m) => m.id));
  const disponibles = estado.amigos.filter((a) => !dentro.has(a.id));
  const html = disponibles.length ? selectorAmigos([], { lista: disponibles }) : '';
  const { panel, cerrar } = hoja(`
    <h2>Invitar al plan</h2>
    ${disponibles.length ? html : `<p class="suave">${estado.amigos.length ? 'Todos tus amigos ya están en este plan.' : 'Aún no tienes amigos en Lumbre.'}</p>`}
    <button class="boton oro bloque" style="margin-top:18px" data-ok ${disponibles.length ? '' : 'disabled'}>Invitar</button>`);
  activarSelectorAmigos(panel);
  panel.querySelector('[data-ok]').onclick = async () => {
    const ids = amigosElegidos(panel);
    if (!ids.length) return aviso('Elige al menos a un amigo');
    try {
      ok(await sb.from('plan_miembros').insert(ids.map((u) => ({ grupo_id: grupo.id, usuario: u }))));
      cerrar(); aviso('Invitación lista: ya lo ven en sus planes');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) { error(e); }
  };
}

