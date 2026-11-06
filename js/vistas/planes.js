import { sb, estado, ok } from '../estado.js';
import { esc, avatar, hoja, aviso, error, vacio } from '../ui.js';
import { PLANES, planPorSlug } from '../datos/planes.js';
import { formatearRef } from '../biblia.js';
import { selectorAmigos, activarSelectorAmigos, amigosElegidos } from '../acciones.js';

/** Mis planes con progreso: [{ grupo, plan, hechos:Set, siguiente, miembros }] */
export async function misPlanes() {
  const yo = estado.usuario.id;
  const membresias = ok(await sb.from('plan_miembros')
    .select('grupo_id, plan_grupos(id, plan_slug, creador, inicio, creado_en)').eq('usuario', yo));
  const grupos = membresias.map((m) => m.plan_grupos).filter((g) => g && planPorSlug(g.plan_slug));
  if (!grupos.length) return [];
  const ids = grupos.map((g) => g.id);
  const [progreso, miembros] = await Promise.all([
    sb.from('plan_progreso').select('grupo_id, dia').eq('usuario', yo).in('grupo_id', ids).then(ok),
    sb.from('plan_miembros').select('grupo_id, usuario, perfil:perfiles(id, nombre, color)').in('grupo_id', ids).then(ok),
  ]);
  return grupos.map((grupo) => {
    const plan = planPorSlug(grupo.plan_slug);
    const hechos = new Set(progreso.filter((p) => p.grupo_id === grupo.id).map((p) => p.dia));
    let siguiente = 1;
    while (hechos.has(siguiente) && siguiente < plan.dias.length) siguiente++;
    return { grupo, plan, hechos, siguiente, miembros: miembros.filter((m) => m.grupo_id === grupo.id).map((m) => m.perfil).filter(Boolean) };
  }).sort((a, b) => new Date(b.grupo.creado_en) - new Date(a.grupo.creado_en));
}

export async function render(el) {
  el.innerHTML = `
    <header style="padding:14px 0 6px">
      <p class="etiqueta">Planes de lectura</p>
      <h1>Un paso cada día</h1>
      <p class="suave" style="margin-top:8px;max-width:520px">Elige un camino corto. Puedes hacerlo a solas o invitar a tus amigos para leer juntos y comentar cada día.</p>
    </header>
    <section class="seccion"><div class="seccion-titulo"><h2>Mis planes</h2></div><div data-mios></div></section>
    <section class="seccion"><div class="seccion-titulo"><h2>Explorar</h2></div>
      <div class="rejilla">${PLANES.map(tarjetaPlan).join('')}</div>
    </section>`;

  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-plan]');
    if (t) detallePlan(planPorSlug(t.dataset.plan));
  });

  const caja = el.querySelector('[data-mios]');
  try {
    const mios = await misPlanes();
    caja.innerHTML = mios.length ? `<div class="rejilla">${mios.map(({ grupo, plan, hechos, miembros }) => {
      const pct = Math.round((hechos.size / plan.dias.length) * 100);
      return `<a class="tarjeta plan-tarjeta" href="#/plan/${grupo.id}">
        <div class="portada" style="--a:${plan.colores[0]};--b:${plan.colores[1]}"><b>${pct === 100 ? '✓' : `${pct}%`}</b></div>
        <h3>${esc(plan.titulo)}</h3>
        <div class="progreso"><i style="width:${pct}%"></i></div>
        <div class="fila entre"><span class="tenue mini">${hechos.size} de ${plan.dias.length} días</span>
          <span class="avatares">${miembros.slice(0, 4).map((m) => avatar(m, 'chico')).join('')}</span></div>
      </a>`;
    }).join('')}</div>` : `<p class="tenue">Todavía no has empezado ningún plan. Elige uno abajo.</p>`;
  } catch (e) { caja.innerHTML = vacio('planes', 'No se pudieron cargar tus planes', e.message); }
}

function tarjetaPlan(plan) {
  return `<button class="tarjeta plan-tarjeta" data-plan="${plan.slug}" style="text-align:left;font:inherit;color:inherit">
    <div class="portada" style="--a:${plan.colores[0]};--b:${plan.colores[1]}"><b>${plan.dias.length} días</b></div>
    <h3>${esc(plan.titulo)}</h3>
    <p class="suave pequeno">${esc(plan.descripcion)}</p>
  </button>`;
}

function detallePlan(plan) {
  const { panel, cerrar } = hoja(`
    <div class="plan-tarjeta"><div class="portada" style="--a:${plan.colores[0]};--b:${plan.colores[1]}"><b>${esc(plan.titulo)}</b></div></div>
    <p class="suave" style="margin:14px 0">${esc(plan.descripcion)}</p>
    <p class="etiqueta">${plan.dias.length} días</p>
    <p class="tenue pequeno" style="margin-top:6px">${esc(plan.dias.slice(0, 6).map((d, i) => `Día ${i + 1}: ${d.map(formatearRef).join(', ')}`).join(' · '))}${plan.dias.length > 6 ? ' …' : ''}</p>
    <hr class="separador">
    <p class="etiqueta">¿Con quién lo harás? <span class="tenue" style="text-transform:none;letter-spacing:0;font-weight:500">(opcional)</span></p>
    <div style="margin-top:10px">${selectorAmigos()}</div>
    <button class="boton oro bloque" style="margin-top:20px" data-empezar>Empezar plan</button>`);
  activarSelectorAmigos(panel);
  panel.querySelector('[data-empezar]').onclick = async (e) => {
    e.currentTarget.disabled = true;
    try {
      const grupo = ok(await sb.from('plan_grupos').insert({ plan_slug: plan.slug, creador: estado.usuario.id }).select().single());
      const invitados = amigosElegidos(panel);
      if (invitados.length) ok(await sb.from('plan_miembros').insert(invitados.map((u) => ({ grupo_id: grupo.id, usuario: u }))));
      cerrar();
      aviso(invitados.length ? '¡Plan compartido! Tus amigos ya lo ven.' : '¡Plan iniciado!');
      location.hash = `#/plan/${grupo.id}`;
    } catch (err) { error(err); e.currentTarget.disabled = false; }
  };
}
