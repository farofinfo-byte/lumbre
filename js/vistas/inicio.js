import { sb, estado, ok, calcularRacha, registrarLectura, leyoHoy } from '../estado.js';
import { esc, ICONOS, avatar, saludoSegunHora, fechaLarga, fechaLocal, haceCuanto, aviso, error, cargando } from '../ui.js';
import { obtenerPasaje, formatearRef } from '../biblia.js';
import { versiculoDelDia } from '../datos/versiculos.js';
import { enviarVersiculo, compartirImagen, guardarFavorito } from '../acciones.js';
import { misPlanes } from './planes.js';

const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export async function render(el) {
  const vd = versiculoDelDia();
  const nombre = estado.perfil.nombre.split(' ')[0];

  el.innerHTML = `
    <section class="saludo">
      <p class="etiqueta">${esc(fechaLarga())}</p>
      <h1>${saludoSegunHora()}, ${esc(nombre)}</h1>
      <div data-racha style="margin-top:14px;min-height:76px"></div>
    </section>

    <article class="hoy" data-hoy>
      <p class="etiqueta">Versículo del día · ${esc(vd.tema)}</p>
      <div data-texto>${estado.biblia ? '<div class="esqueleto" style="height:110px;margin-top:16px;opacity:.15"></div>' : ''}</div>
    </article>

    ${estado.recibidas.length ? `
      <a class="tarjeta fila" href="#/amigos" style="margin-top:14px;text-decoration:none">
        ${ICONOS.amigos.replace('<svg', '<svg style="width:22px;color:var(--oro-fuerte)"')}
        <span style="flex:1"><b>${estado.recibidas.length === 1 ? `${esc(estado.recibidas[0].nombre)} quiere ser tu amigo` : `${estado.recibidas.length} solicitudes de amistad`}</b></span>
        ${ICONOS.der.replace('<svg', '<svg style="width:18px"')}
      </a>` : ''}

    <div data-envios></div>

    <section class="seccion">
      <div class="seccion-titulo"><h2>Tus planes</h2><a class="boton fantasma chico" href="#/planes">Ver todos</a></div>
      <div data-planes>${cargando()}</div>
    </section>

    <section class="seccion">
      <div class="seccion-titulo"><h2>Tu círculo</h2><a class="boton fantasma chico" href="#/amigos">Amigos</a></div>
      <div data-circulo>${cargando()}</div>
    </section>`;

  const racha = pintarRacha(el.querySelector('[data-racha]'));
  pintarVersiculo(el.querySelector('[data-hoy]'), vd, racha);
  pintarEnvios(el.querySelector('[data-envios]'));
  pintarPlanes(el.querySelector('[data-planes]'));
  pintarCirculo(el.querySelector('[data-circulo]'));
}

async function pintarRacha(caja) {
  try {
    const { racha, dias } = await calcularRacha();
    const semana = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
    caja.innerHTML = `
      <span class="racha">${ICONOS.llama} ${racha ? (racha === 1 ? '1 día de racha' : `${racha} días seguidos`) : 'Empieza tu racha hoy'}</span>
      <div class="semana" aria-label="Últimos 7 días">${semana.map((d, i) =>
        `<i class="${dias.has(fechaLocal(d)) ? 'lleno' : ''} ${i === 6 ? 'hoy-d' : ''}" title="${d.toLocaleDateString('es')}">${LETRAS[d.getDay()]}</i>`).join('')}</div>`;
  } catch { caja.innerHTML = ''; }
}

async function pintarVersiculo(tarjeta, vd, rachaLista) {
  const destino = tarjeta.querySelector('[data-texto]');
  if (!estado.biblia) {
    destino.innerHTML = `<p class="texto-verso">${esc(formatearRef(vd.id))}</p>
      <p class="reflexion">${esc(vd.reflexion)}</p>
      <p class="copy">${esc(estado.errorBiblias?.mensaje || 'Conecta API.Bible para ver el texto aquí.')}</p>`;
    return;
  }
  try {
    const [p] = await Promise.all([obtenerPasaje(estado.biblia.id, vd.id), rachaLista]);
    const leido = leyoHoy();
    destino.innerHTML = `
      <p class="texto-verso">${esc(p.texto)}</p>
      <p class="ref">${esc(p.referencia)} · ${esc(estado.biblia.abrev)}</p>
      <p class="reflexion">${esc(vd.reflexion)}</p>
      <div class="acciones">
        <button class="boton ${leido ? 'suave' : 'oro'} chico" data-medite ${leido ? 'disabled' : ''}>${ICONOS.check} ${leido ? 'Leído hoy' : 'Lo medité'}</button>
        <button class="boton suave chico icono" data-guardar aria-label="Guardar en favoritos" title="Guardar">${ICONOS.favoritos}</button>
        <button class="boton suave chico icono" data-imagen aria-label="Compartir como imagen" title="Compartir imagen">${ICONOS.imagen}</button>
        <button class="boton suave chico icono" data-enviar aria-label="Enviar a un amigo" title="Enviar a un amigo">${ICONOS.enviar}</button>
        <a class="boton suave chico icono" aria-label="Escribir en mi diario" title="Escribir"
           href="#/diario/nuevo?pasaje=${encodeURIComponent(vd.id)}&ref=${encodeURIComponent(p.referencia)}&texto=${encodeURIComponent(p.texto.slice(0, 900))}">${ICONOS.lapiz}</a>
      </div>
      ${p.copyright ? `<p class="copy">${esc(p.copyright)}</p>` : ''}`;

    const datos = { pasajeId: vd.id, referencia: p.referencia, texto: p.texto };
    destino.querySelector('[data-medite]').onclick = async (e) => {
      e.currentTarget.disabled = true;
      await registrarLectura();
      e.currentTarget.className = 'boton suave chico';
      e.currentTarget.innerHTML = `${ICONOS.check} Leído hoy`;
      aviso('Amén. Un día más en tu racha ✨');
      pintarRacha(document.querySelector('[data-racha]'));
    };
    destino.querySelector('[data-guardar]').onclick = async () => {
      try { await guardarFavorito({ versoId: vd.id, referencia: p.referencia, texto: p.texto }); aviso('Guardado en tus favoritos'); }
      catch (e) { error(e); }
    };
    destino.querySelector('[data-imagen]').onclick = () => compartirImagen({ texto: p.texto, referencia: p.referencia, version: estado.biblia.abrev, etiqueta: 'Versículo del día' });
    destino.querySelector('[data-enviar]').onclick = () => enviarVersiculo(datos);
  } catch (e) {
    destino.innerHTML = `<p class="texto-verso">${esc(formatearRef(vd.id))}</p>
      <p class="reflexion">${esc(vd.reflexion)}</p><p class="copy">${esc(e.mensaje || 'No se pudo cargar el texto.')}</p>`;
  }
}

async function pintarEnvios(caja) {
  try {
    const envios = ok(await sb.from('envios')
      .select('id, referencia, texto, biblia, nota, creado_en, de_p:perfiles!envios_de_fkey(id, nombre, color)')
      .eq('para', estado.usuario.id).eq('visto', false).order('creado_en', { ascending: false }).limit(5));
    if (!envios.length) return;
    caja.innerHTML = `<section class="seccion"><div class="seccion-titulo"><h2>Pensaron en ti</h2></div>
      ${envios.map((v) => `
        <article class="tarjeta" data-envio="${v.id}">
          <div class="fila">${avatar(v.de_p, 'chico')}<span class="pequeno"><b>${esc(v.de_p?.nombre || 'Un amigo')}</b> <span class="tenue">te envió un versículo · ${haceCuanto(v.creado_en)}</span></span></div>
          ${v.nota ? `<p style="margin-top:10px">${esc(v.nota)}</p>` : ''}
          <div class="cita" style="margin-top:12px">${esc(v.texto)}<b>${esc(v.referencia)}${v.biblia ? ` · ${esc(v.biblia)}` : ''}</b></div>
          <div class="fila" style="margin-top:14px;justify-content:flex-end"><button class="boton suave chico" data-amen="${v.id}">${ICONOS.corazon} Amén</button></div>
        </article>`).join('')}</section>`;
    caja.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-amen]');
      if (!b) return;
      b.disabled = true;
      try {
        ok(await sb.rpc('marcar_envio_visto', { p_id: b.dataset.amen }));
        const tarjeta = caja.querySelector(`[data-envio="${b.dataset.amen}"]`);
        tarjeta.style.transition = 'opacity .3s'; tarjeta.style.opacity = '0';
        setTimeout(() => { tarjeta.remove(); if (!caja.querySelector('[data-envio]')) caja.innerHTML = ''; }, 300);
      } catch (err) { error(err); b.disabled = false; }
    });
  } catch (e) { console.warn(e); }
}

async function pintarPlanes(caja) {
  try {
    const planes = (await misPlanes()).filter((p) => p.hechos.size < p.plan.dias.length).slice(0, 3);
    if (!planes.length) {
      caja.innerHTML = `<a class="tarjeta fila" href="#/planes" style="text-decoration:none">
        ${ICONOS.planes.replace('<svg', '<svg style="width:26px;color:var(--oro-fuerte)"')}
        <span style="flex:1"><b>Empieza un plan de lectura</b><br><span class="suave pequeno">Solo o junto a tus amigos.</span></span>${ICONOS.der.replace('<svg', '<svg style="width:18px"')}</a>`;
      return;
    }
    caja.innerHTML = planes.map(({ grupo, plan, hechos, siguiente, miembros }) => `
      <a class="tarjeta" href="#/plan/${grupo.id}/${siguiente}" style="display:block;text-decoration:none">
        <div class="fila entre"><b>${esc(plan.titulo)}</b>${miembros.length > 1 ? `<span class="pastilla">${ICONOS.amigos} ${miembros.length}</span>` : ''}</div>
        <p class="suave pequeno" style="margin:4px 0 12px">Día ${siguiente}: ${esc(plan.dias[siguiente - 1].map(formatearRef).join(', '))}</p>
        <div class="progreso"><i style="width:${Math.round((hechos.size / plan.dias.length) * 100)}%"></i></div>
        <p class="tenue mini" style="margin-top:8px">${hechos.size} de ${plan.dias.length} días</p>
      </a>`).join('');
  } catch (e) { caja.innerHTML = `<p class="tenue">${esc(e.message)}</p>`; }
}

async function pintarCirculo(caja) {
  if (!estado.amigos.length) {
    caja.innerHTML = `<div class="tarjeta"><p><b>Lumbre es mejor acompañado.</b></p>
      <p class="suave pequeno" style="margin:6px 0 14px">Invita a tus amigos para leer juntos, orar unos por otros y compartir lo que Dios les habla.</p>
      <a class="boton oro chico" href="#/amigos">${ICONOS.enlace} Invitar amigos</a></div>`;
    return;
  }
  try {
    const [entradas, peticiones] = await Promise.all([
      sb.from('entradas').select('id, titulo, contenido, pasaje_ref, creado_en, autor_p:perfiles!entradas_autor_fkey(id, nombre, color)')
        .neq('autor', estado.usuario.id).order('creado_en', { ascending: false }).limit(3).then(ok),
      sb.from('peticiones').select('id, contenido, creado_en, autor_p:perfiles!peticiones_autor_fkey(id, nombre, color)')
        .neq('autor', estado.usuario.id).eq('respondida', false).order('creado_en', { ascending: false }).limit(3).then(ok),
    ]);
    if (!entradas.length && !peticiones.length) {
      caja.innerHTML = `<p class="tenue pequeno">Cuando tus amigos compartan devocionales o peticiones de oración, aparecerán aquí.</p>`;
      return;
    }
    caja.innerHTML = `
      ${entradas.map((x) => `
        <a class="tarjeta entrada-tarjeta" href="#/entrada/${x.id}">
          <div class="fila">${avatar(x.autor_p, 'chico')}<span class="pequeno"><b>${esc(x.autor_p?.nombre)}</b> <span class="tenue">escribió · ${haceCuanto(x.creado_en)}</span></span></div>
          ${x.titulo ? `<h3>${esc(x.titulo)}</h3>` : '<div style="height:8px"></div>'}
          <p class="suave recortar">${esc(x.contenido)}</p>
          ${x.pasaje_ref ? `<span class="pastilla oro" style="margin-top:10px">${ICONOS.leer} ${esc(x.pasaje_ref)}</span>` : ''}
        </a>`).join('')}
      ${peticiones.map((x) => `
        <a class="tarjeta" href="#/oracion" style="display:block;text-decoration:none">
          <div class="fila">${avatar(x.autor_p, 'chico')}<span class="pequeno"><b>${esc(x.autor_p?.nombre)}</b> <span class="tenue">pidió oración · ${haceCuanto(x.creado_en)}</span></span></div>
          <p class="suave recortar" style="margin-top:8px">${esc(x.contenido)}</p>
        </a>`).join('')}`;
  } catch (e) { caja.innerHTML = `<p class="tenue">${esc(e.message)}</p>`; }
}
