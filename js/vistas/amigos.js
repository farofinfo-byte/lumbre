import { sb, estado, ok, cargarAmigos } from '../estado.js';
import { esc, ICONOS, avatar, haceCuanto, aviso, error, confirmar, copiarTexto, hoja } from '../ui.js';
import { actualizarInsignias } from '../main.js';

export async function render(contenedor) {
  // Contenedor nuevo en cada repintado para no duplicar eventos
  const el = document.createElement('div');
  contenedor.replaceChildren(el);
  try { await cargarAmigos(); actualizarInsignias(); } catch (e) { console.warn(e); }
  const enlace = `${location.origin}/#/amigo/${estado.perfil.codigo}`;

  el.innerHTML = `
    <header style="padding:14px 0 6px">
      <p class="etiqueta">Tu círculo</p>
      <h1>Amigos</h1>
      <p class="suave" style="margin-top:8px;max-width:520px">Un círculo pequeño y de confianza. Solo ven lo que tú decidas compartir.</p>
    </header>

    <div class="hoy" style="margin-top:18px">
      <p class="etiqueta">Tu código de amistad</p>
      <p class="serif" style="font-size:2.4rem;letter-spacing:.12em;margin:10px 0 6px">${esc(estado.perfil.codigo)}</p>
      <p style="color:rgba(246,238,221,.75)" class="pequeno">Compártelo o envía tu enlace. Cuando alguien lo use, te llegará su solicitud.</p>
      <div class="acciones">
        <button class="boton oro chico" data-compartir>${ICONOS.compartir} Invitar</button>
        <button class="boton suave chico" data-copiar>${ICONOS.enlace} Copiar enlace</button>
        <button class="boton suave chico" data-nuevo title="Si compartiste tu código con quien no debías">Cambiar código</button>
      </div>
    </div>

    <form class="tarjeta fila" data-agregar style="margin-top:14px">
      <input class="entrada" name="codigo" maxlength="8" placeholder="Código de tu amigo" style="text-transform:uppercase;letter-spacing:.1em" autocomplete="off">
      <button class="boton">${ICONOS.mas} Agregar</button>
    </form>

    ${estado.recibidas.length ? `<section class="seccion"><div class="seccion-titulo"><h2>Solicitudes</h2></div>
      <div class="tarjeta"><ul class="lista">${estado.recibidas.map((p) => `
        <li class="item">${avatar(p)}<div class="cuerpo"><div class="titulo">${esc(p.nombre)}</div><div class="tenue pequeno">Quiere ser tu amigo</div></div>
          <button class="boton oro chico" data-aceptar="${p.amistadId}">Aceptar</button>
          <button class="boton fantasma chico icono" data-rechazar="${p.amistadId}" aria-label="Rechazar">${ICONOS.cerrar}</button></li>`).join('')}</ul></div></section>` : ''}

    <section class="seccion">
      <div class="seccion-titulo"><h2>Mis amigos</h2><span class="tenue pequeno">${estado.amigos.length}</span></div>
      <div class="tarjeta">${estado.amigos.length ? `<ul class="lista">${estado.amigos.map((p) => `
        <li class="item">${avatar(p)}<div class="cuerpo"><div class="titulo">${esc(p.nombre)}</div></div>
          <button class="boton fantasma chico icono" data-quitar="${p.amistadId}" data-nombre="${esc(p.nombre)}" aria-label="Opciones">${ICONOS.menu}</button></li>`).join('')}</ul>`
        : '<p class="tenue">Todavía no tienes amigos aquí. Comparte tu código para empezar.</p>'}</div>
    </section>

    ${estado.enviadas.length ? `<section class="seccion"><div class="seccion-titulo"><h2>Enviadas</h2></div>
      <div class="tarjeta"><ul class="lista">${estado.enviadas.map((p) => `
        <li class="item">${avatar(p)}<div class="cuerpo"><div class="titulo">${esc(p.nombre)}</div><div class="tenue pequeno">Esperando respuesta</div></div>
          <button class="boton fantasma chico" data-rechazar="${p.amistadId}">Cancelar</button></li>`).join('')}</ul></div></section>` : ''}

    <section class="seccion" data-recibidos></section>`;

  el.querySelector('[data-copiar]').onclick = () => copiarTexto(enlace);
  el.querySelector('[data-compartir]').onclick = async () => {
    const texto = `Te invito a Lumbre, un espacio para acercarnos a Dios juntos. Mi código es ${estado.perfil.codigo}`;
    if (navigator.share) { try { await navigator.share({ title: 'Lumbre', text: texto, url: enlace }); } catch { /* cancelado */ } }
    else copiarTexto(`${texto}\n${enlace}`);
  };
  el.querySelector('[data-nuevo]').onclick = async () => {
    if (!(await confirmar('¿Generar un código nuevo? El anterior dejará de funcionar.', { si: 'Cambiar' }))) return;
    try { estado.perfil.codigo = ok(await sb.rpc('nuevo_codigo')); aviso('Código actualizado'); render(contenedor); } catch (e) { error(e); }
  };
  el.querySelector('[data-agregar]').onsubmit = async (e) => {
    e.preventDefault();
    const codigo = e.target.codigo.value.trim().toUpperCase();
    if (!codigo) return;
    try {
      const r = ok(await sb.rpc('solicitar_amistad', { p_codigo: codigo }));
      aviso(r.mensaje, r.ok ? '' : 'error');
      if (r.ok) render(contenedor);
    } catch (err) { error(err); }
  };
  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-aceptar]');
    if (a) { try { ok(await sb.rpc('aceptar_amistad', { p_id: a.dataset.aceptar })); aviso('¡Ahora son amigos!'); render(contenedor); } catch (err) { error(err); } return; }
    const r = e.target.closest('[data-rechazar]');
    if (r) { try { ok(await sb.from('amistades').delete().eq('id', r.dataset.rechazar)); render(contenedor); } catch (err) { error(err); } return; }
    const q = e.target.closest('[data-quitar]');
    if (q) {
      const { panel, cerrar } = hoja(`<h2>${esc(q.dataset.nombre)}</h2><div class="opciones-hoja">
        <button class="opcion" data-eliminar>${ICONOS.basura} Quitar de mis amigos</button></div>`);
      panel.querySelector('[data-eliminar]').onclick = async () => {
        cerrar();
        if (!(await confirmar(`¿Quitar a ${q.dataset.nombre}? Ya no verán lo que comparten.`, { si: 'Quitar', peligro: true }))) return;
        try { ok(await sb.from('amistades').delete().eq('id', q.dataset.quitar)); render(contenedor); } catch (err) { error(err); }
      };
    }
  });

  // Historial de versículos recibidos
  try {
    const envios = ok(await sb.from('envios').select('id, referencia, texto, biblia, nota, creado_en, de_p:perfiles!envios_de_fkey(id, nombre, color)')
      .eq('para', estado.usuario.id).order('creado_en', { ascending: false }).limit(20));
    if (envios.length) {
      el.querySelector('[data-recibidos]').innerHTML = `<div class="seccion-titulo"><h2>Versículos que te enviaron</h2></div>
        ${envios.map((v) => `<article class="tarjeta">
          <div class="fila">${avatar(v.de_p, 'chico')}<span class="pequeno"><b>${esc(v.de_p?.nombre || 'Un amigo')}</b> <span class="tenue">· ${haceCuanto(v.creado_en)}</span></span></div>
          ${v.nota ? `<p style="margin-top:8px">${esc(v.nota)}</p>` : ''}
          <div class="cita" style="margin-top:10px">${esc(v.texto)}<b>${esc(v.referencia)}${v.biblia ? ` · ${esc(v.biblia)}` : ''}</b></div>
        </article>`).join('')}`;
    }
  } catch (e) { console.warn(e); }
}
