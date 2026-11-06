import { sb, estado, ok } from '../estado.js';
import { esc, ICONOS, avatar, haceCuanto, parrafos, hoja, confirmar, aviso, error, vacio } from '../ui.js';

export async function render(el) {
  let pestana = sessionStorage.getItem('lumbre:oracion') || 'peticiones';
  el.innerHTML = `
    <header style="padding:14px 0 6px">
      <p class="etiqueta">Oración</p>
      <h1>Unos por otros</h1>
      <p class="suave" style="margin-top:8px;max-width:520px">Comparte tus peticiones con tus amigos y recuerda lo que Dios ya ha hecho.</p>
    </header>
    <div class="pestanas" style="margin:18px 0">
      <button data-p="peticiones">Peticiones</button><button data-p="respondidas">Oraciones respondidas</button>
    </div>
    <div data-cuerpo></div>`;

  const cuerpo = el.querySelector('[data-cuerpo]');
  const pintar = () => {
    sessionStorage.setItem('lumbre:oracion', pestana);
    el.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('activo', b.dataset.p === pestana));
    return pestana === 'peticiones' ? peticiones(cuerpo) : respondidas(cuerpo);
  };
  el.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { pestana = b.dataset.p; pintar(); }));
  pintar();
}

const CAMPOS = 'id, autor, contenido, visibilidad, respondida, testimonio, respondida_en, creado_en, autor_p:perfiles!peticiones_autor_fkey(id, nombre, color), peticion_apoyos(usuario)';

async function peticiones(cuerpo) {
  cuerpo.innerHTML = `
    <form class="tarjeta pila" data-nueva>
      <textarea class="area" style="min-height:90px" maxlength="2000" placeholder="¿Por qué quieres que oremos?" required></textarea>
      <div class="fila entre envolver">
        <div class="chips" data-vis>
          <button type="button" class="chip" data-v="amigos" aria-pressed="true">${ICONOS.amigos.replace('<svg', '<svg style="width:16px"')} Con mis amigos</button>
          <button type="button" class="chip" data-v="privado" aria-pressed="false">${ICONOS.candado.replace('<svg', '<svg style="width:16px"')} Solo entre Dios y yo</button>
        </div>
        <button class="boton oro">${ICONOS.oracion} Pedir oración</button>
      </div>
    </form>
    <div data-lista style="margin-top:14px"></div>`;

  let vis = 'amigos';
  const form = cuerpo.querySelector('[data-nueva]');
  form.querySelector('[data-vis]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    vis = b.dataset.v;
    form.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const area = form.querySelector('textarea');
    const contenido = area.value.trim();
    if (!contenido) return;
    try {
      ok(await sb.from('peticiones').insert({ autor: estado.usuario.id, contenido, visibilidad: vis }));
      area.value = '';
      aviso(vis === 'amigos' ? 'Tus amigos ya pueden orar por esto' : 'Guardado');
      cargar();
    } catch (err) { error(err); }
  };

  const lista = cuerpo.querySelector('[data-lista]');
  async function cargar() {
    try {
      const filas = ok(await sb.from('peticiones').select(CAMPOS).eq('respondida', false).order('creado_en', { ascending: false }).limit(80));
      lista.innerHTML = filas.length ? filas.map(tarjetaPeticion).join('')
        : vacio('oracion', 'No hay peticiones por ahora', 'Escribe la tuya arriba. Tus amigos podrán acompañarte en oración.');
    } catch (e) { lista.innerHTML = vacio('oracion', 'No se pudo cargar', e.message); }
  }
  lista.addEventListener('click', async (e) => {
    const apoyo = e.target.closest('[data-orar]');
    if (apoyo) {
      apoyo.disabled = true;
      try {
        if (apoyo.getAttribute('aria-pressed') === 'true') ok(await sb.from('peticion_apoyos').delete().eq('peticion_id', apoyo.dataset.orar).eq('usuario', estado.usuario.id));
        else { ok(await sb.from('peticion_apoyos').insert({ peticion_id: apoyo.dataset.orar, usuario: estado.usuario.id })); aviso('Gracias por orar 🙏'); }
        cargar();
      } catch (err) { error(err); apoyo.disabled = false; }
    }
    const resp = e.target.closest('[data-respondida]');
    if (resp) marcarRespondida(resp.dataset.respondida, cargar);
    const borrar = e.target.closest('[data-borrar]');
    if (borrar && await confirmar('¿Eliminar esta petición?', { si: 'Eliminar', peligro: true })) {
      try { ok(await sb.from('peticiones').delete().eq('id', borrar.dataset.borrar)); cargar(); } catch (err) { error(err); }
    }
  });
  cargar();
}

function tarjetaPeticion(p) {
  const mia = p.autor === estado.usuario.id;
  const apoyos = p.peticion_apoyos || [];
  const yoOro = apoyos.some((a) => a.usuario === estado.usuario.id);
  return `<article class="tarjeta">
    <div class="fila entre">
      <span class="fila">${avatar(p.autor_p, 'chico')}<span class="pequeno"><b>${esc(mia ? 'Tú' : p.autor_p?.nombre)}</b> <span class="tenue">· ${haceCuanto(p.creado_en)}</span></span></span>
      ${mia && p.visibilidad === 'privado' ? `<span class="pastilla">${ICONOS.candado} Privada</span>` : ''}
    </div>
    <div style="margin-top:10px">${parrafos(p.contenido)}</div>
    <div class="fila envolver" style="margin-top:14px">
      ${!mia ? `<button class="boton ${yoOro ? 'oro' : 'suave'} chico" data-orar="${p.id}" aria-pressed="${yoOro}">${ICONOS.oracion} ${yoOro ? 'Estoy orando' : 'Oraré por esto'}</button>` : ''}
      ${apoyos.length ? `<span class="tenue pequeno">${apoyos.length} ${apoyos.length === 1 ? 'persona está orando' : 'personas están orando'}</span>` : ''}
      ${mia ? `<span style="flex:1"></span>
        <button class="boton borde chico" data-respondida="${p.id}">${ICONOS.sparkle} Dios respondió</button>
        <button class="boton fantasma chico icono" data-borrar="${p.id}" aria-label="Eliminar">${ICONOS.basura}</button>` : ''}
    </div>
  </article>`;
}

function marcarRespondida(id, alTerminar) {
  const { panel, cerrar } = hoja(`
    <h2>¡Dios respondió!</h2>
    <p class="suave" style="margin-bottom:14px">Cuenta cómo lo hizo. Será un recordatorio para ti y un ánimo para tus amigos.</p>
    <textarea class="area" maxlength="4000" placeholder="Lo que pasó…" autofocus data-t></textarea>
    <button class="boton oro bloque" style="margin-top:16px" data-ok>Guardar testimonio</button>`);
  panel.querySelector('[data-ok]').onclick = async () => {
    try {
      ok(await sb.from('peticiones').update({ respondida: true, testimonio: panel.querySelector('[data-t]').value.trim() || null, respondida_en: new Date().toISOString() }).eq('id', id));
      cerrar(); aviso('¡Gloria a Dios! ✨'); alTerminar();
    } catch (e) { error(e); }
  };
}

async function respondidas(cuerpo) {
  cuerpo.innerHTML = `
    <div class="tarjeta fila entre envolver">
      <span><b>¿Dios hizo algo que no quieres olvidar?</b><br><span class="suave pequeno">Regístralo aunque no lo hayas pedido aquí.</span></span>
      <button class="boton oro chico" data-nuevo>${ICONOS.sparkle} Registrar</button>
    </div>
    <div data-lista style="margin-top:14px"></div>`;
  const lista = cuerpo.querySelector('[data-lista]');
  const cargar = async () => {
    try {
      const filas = ok(await sb.from('peticiones').select(CAMPOS).eq('respondida', true).order('respondida_en', { ascending: false }).limit(80));
      lista.innerHTML = filas.length ? filas.map((p) => `
        <article class="tarjeta">
          <div class="fila entre"><span class="fila">${avatar(p.autor_p, 'chico')}<span class="pequeno"><b>${esc(p.autor === estado.usuario.id ? 'Tú' : p.autor_p?.nombre)}</b>
            <span class="tenue">· ${haceCuanto(p.respondida_en || p.creado_en)}</span></span></span>
            <span class="pastilla oro">${ICONOS.sparkle} Respondida</span></div>
          <p class="tenue pequeno" style="margin-top:12px">Pidió:</p>
          <div class="suave">${parrafos(p.contenido)}</div>
          ${p.testimonio ? `<div class="cita" style="margin-top:12px;font-style:normal">${parrafos(p.testimonio)}</div>` : ''}
        </article>`).join('')
        : vacio('sparkle', 'Tu lista de milagros empieza aquí', 'Cuando Dios responda una oración, márcala y quedará como testimonio.');
    } catch (e) { lista.innerHTML = vacio('oracion', 'No se pudo cargar', e.message); }
  };
  cuerpo.querySelector('[data-nuevo]').onclick = () => {
    const { panel, cerrar } = hoja(`
      <h2>Lo que Dios hizo</h2>
      <label class="campo"><span>¿Qué necesitabas o qué pasó?</span><textarea class="area" style="min-height:80px" maxlength="2000" data-c autofocus></textarea></label>
      <label class="campo" style="margin-top:12px"><span>¿Cómo respondió Dios?</span><textarea class="area" maxlength="4000" data-t></textarea></label>
      <div class="chips" style="margin-top:14px" data-vis>
        <button type="button" class="chip" data-v="amigos" aria-pressed="true">Compartir con mis amigos</button>
        <button type="button" class="chip" data-v="privado" aria-pressed="false">Solo para mí</button>
      </div>
      <button class="boton oro bloque" style="margin-top:16px" data-ok>Guardar</button>`);
    let vis = 'amigos';
    panel.querySelector('[data-vis]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      vis = b.dataset.v; panel.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
    panel.querySelector('[data-ok]').onclick = async () => {
      const contenido = panel.querySelector('[data-c]').value.trim();
      if (!contenido) return aviso('Escribe qué pasó', 'error');
      try {
        ok(await sb.from('peticiones').insert({
          autor: estado.usuario.id, contenido, visibilidad: vis, respondida: true,
          testimonio: panel.querySelector('[data-t]').value.trim() || null, respondida_en: new Date().toISOString(),
        }));
        cerrar(); aviso('Guardado. ¡Gloria a Dios! ✨'); cargar();
      } catch (e) { error(e); }
    };
  };
  cargar();
}
