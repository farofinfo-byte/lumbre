import { sb, estado, ok } from '../estado.js';
import { esc, ICONOS, aviso, error, parametrosHash } from '../ui.js';
import { selectorAmigos, activarSelectorAmigos, amigosElegidos } from '../acciones.js';
import { VISIBILIDAD } from './diario.js';

const IDEAS = [
  '¿Qué me muestra este pasaje sobre Dios?',
  '¿Qué me está pidiendo hoy?',
  '¿Qué promesa quiero guardar?',
  'Una oración en respuesta:',
  'Hoy doy gracias por…',
];

export async function render(el, idEditar) {
  let entrada = null, lectores = [];
  if (idEditar) {
    entrada = ok(await sb.from('entradas').select('*').eq('id', idEditar).eq('autor', estado.usuario.id).maybeSingle());
    if (!entrada) throw new Error('No encontramos esta entrada.');
    lectores = ok(await sb.from('entrada_lectores').select('lector').eq('entrada_id', idEditar)).map((l) => l.lector);
  }
  const p = parametrosHash();
  const pasaje = entrada
    ? { id: entrada.pasaje_id, ref: entrada.pasaje_ref, texto: entrada.pasaje_texto }
    : { id: p.pasaje || null, ref: p.ref || null, texto: p.texto || null };
  const grupoId = entrada?.grupo_id || p.grupo || null;
  const dia = entrada?.dia || (p.dia ? Number(p.dia) : null);
  let visibilidad = entrada?.visibilidad || (grupoId ? 'elegidos' : 'privado');

  // En un plan compartido, por defecto se comparte con quienes están en el plan
  if (!entrada && grupoId) {
    try {
      const miembros = ok(await sb.from('plan_miembros').select('usuario').eq('grupo_id', grupoId)).map((m) => m.usuario);
      lectores = miembros.filter((u) => u !== estado.usuario.id && estado.amigos.some((a) => a.id === u));
      if (!lectores.length) visibilidad = 'privado';
    } catch { visibilidad = 'privado'; }
  }

  el.innerHTML = `
    <a class="boton fantasma chico" href="${entrada ? `#/entrada/${entrada.id}` : grupoId ? `#/plan/${grupoId}/${dia}` : '#/diario'}" style="margin:8px 0 4px -10px">${ICONOS.izq} Volver</a>
    <p class="etiqueta">${entrada ? 'Editar entrada' : 'Nueva entrada'}</p>
    <h1 style="margin:6px 0 20px">${pasaje.ref ? esc(pasaje.ref) : 'Querido Dios…'}</h1>
    ${pasaje.texto ? `<div class="cita" style="margin-bottom:22px">${esc(pasaje.texto)}<b>${esc(pasaje.ref || '')}</b></div>` : ''}
    <form class="pila" data-form>
      <input class="entrada" name="titulo" maxlength="140" placeholder="Título (opcional)" value="${esc(entrada?.titulo || '')}" style="font-family:var(--serif);font-size:1.2rem">
      <textarea class="area diario" name="contenido" maxlength="20000" required placeholder="Escribe con libertad. Esto es entre tú y Dios…">${esc(entrada?.contenido || '')}</textarea>
      <div><span class="tenue mini">Ideas para escribir:</span>
        <div class="chips desliza" style="margin-top:8px" data-ideas>${IDEAS.map((i) => `<button type="button" class="chip">${esc(i)}</button>`).join('')}</div></div>
      <hr class="separador">
      <div><span class="etiqueta">¿Quién puede verlo?</span>
        <div class="chips" style="margin-top:10px" data-vis>${Object.entries(VISIBILIDAD).map(([k, v]) =>
          `<button type="button" class="chip" data-v="${k}" aria-pressed="${k === visibilidad}">${ICONOS[v.icono].replace('<svg', '<svg style="width:16px"')} ${v.texto}</button>`).join('')}</div>
        <p class="tenue pequeno" data-ayuda style="margin-top:10px"></p>
        <div data-elegir class="oculto" style="margin-top:12px">${selectorAmigos(lectores)}</div>
      </div>
      <div class="fila" style="justify-content:flex-end;margin-top:8px">
        <button class="boton oro" data-guardar>${ICONOS.check} Guardar</button>
      </div>
    </form>`;

  const form = el.querySelector('[data-form]');
  const area = form.contenido;
  const ayudas = {
    privado: 'Solo tú puedes verlo.',
    amigos: 'Todos tus amigos de Lumbre podrán leerlo y comentarlo.',
    elegidos: 'Solo los amigos que elijas podrán leerlo y comentarlo.',
  };
  const actualizarVis = () => {
    form.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === visibilidad));
    form.querySelector('[data-elegir]').classList.toggle('oculto', visibilidad !== 'elegidos');
    form.querySelector('[data-ayuda]').textContent = ayudas[visibilidad];
  };
  actualizarVis();
  activarSelectorAmigos(form.querySelector('[data-elegir]'));

  form.querySelector('[data-vis]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (b) { visibilidad = b.dataset.v; actualizarVis(); }
  });
  form.querySelector('[data-ideas]').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const antes = area.value.trimEnd();
    area.value = `${antes}${antes ? '\n\n' : ''}${b.textContent}\n`;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  });

  // Borrador local para no perder lo escrito
  const claveBorrador = `lumbre:borrador:${entrada?.id || `${grupoId || ''}${dia || ''}${pasaje.id || 'libre'}`}`;
  if (!entrada) {
    try { const b = JSON.parse(localStorage.getItem(claveBorrador) || 'null'); if (b) { form.titulo.value = b.titulo; area.value = b.contenido; } } catch { /* nada */ }
  }
  form.addEventListener('input', () => {
    try { localStorage.setItem(claveBorrador, JSON.stringify({ titulo: form.titulo.value, contenido: area.value })); } catch { /* nada */ }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contenido = area.value.trim();
    if (!contenido) return aviso('Escribe algo antes de guardar', 'error');
    const elegidos = amigosElegidos(form.querySelector('[data-elegir]'));
    if (visibilidad === 'elegidos' && !elegidos.length) return aviso('Elige al menos a un amigo, o márcalo como privado', 'error');
    const boton = form.querySelector('[data-guardar]'); boton.disabled = true;
    const datos = {
      titulo: form.titulo.value.trim() || null, contenido, visibilidad,
      pasaje_id: pasaje.id, pasaje_ref: pasaje.ref, pasaje_texto: pasaje.texto,
      grupo_id: grupoId, dia, actualizado_en: new Date().toISOString(),
    };
    try {
      let id = entrada?.id;
      if (id) ok(await sb.from('entradas').update(datos).eq('id', id));
      else id = ok(await sb.from('entradas').insert({ ...datos, autor: estado.usuario.id }).select('id').single()).id;
      // Lectores elegidos
      ok(await sb.from('entrada_lectores').delete().eq('entrada_id', id));
      if (visibilidad === 'elegidos') ok(await sb.from('entrada_lectores').insert(elegidos.map((l) => ({ entrada_id: id, lector: l }))));
      localStorage.removeItem(claveBorrador);
      aviso('Guardado en tu diario');
      location.hash = `#/entrada/${id}`;
    } catch (err) { error(err); boton.disabled = false; }
  });
}
