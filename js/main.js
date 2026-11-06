// =====================================================================
//  LUMBRE · Arranque, sesión, navegación y estructura de la app
// =====================================================================
import { sb, estado, configurado, cargarPerfil, cargarAmigos, cargarBiblias, ok } from './estado.js';
import { $, esc, logo, ICONOS, avatar, cargando, hoja, aviso, error, fechaLocal } from './ui.js';
import { iniciarRecordatorio } from './recordatorio.js';

const RUTAS = [
  [/^\/?$/, 'inicio', 'inicio'],
  [/^\/inicio$/, 'inicio', 'inicio'],
  [/^\/leer$/, 'leer', 'leer'],
  [/^\/planes$/, 'planes', 'planes'],
  [/^\/plan\/([\w-]+)$/, 'plan', 'planes'],
  [/^\/plan\/([\w-]+)\/(\d+)$/, 'plan-dia', 'planes'],
  [/^\/diario$/, 'diario', 'diario'],
  [/^\/diario\/nuevo$/, 'editor', 'diario'],
  [/^\/diario\/editar\/([\w-]+)$/, 'editor', 'diario'],
  [/^\/entrada\/([\w-]+)$/, 'entrada', 'diario'],
  [/^\/oracion$/, 'oracion', 'oracion'],
  [/^\/amigos$/, 'amigos', 'amigos'],
  [/^\/amigo\/([\w]+)$/, 'agregar', 'amigos'],
  [/^\/favoritos$/, 'favoritos', 'favoritos'],
  [/^\/resumen$/, 'resumen', 'resumen'],
  [/^\/ajustes$/, 'ajustes', 'ajustes'],
];

const NAV_PRINCIPAL = [
  ['inicio', 'Inicio', '#/'],
  ['leer', 'Leer', '#/leer'],
  ['planes', 'Planes', '#/planes'],
  ['diario', 'Diario', '#/diario'],
  ['oracion', 'Oración', '#/oracion'],
];
const NAV_SECUNDARIA = [
  ['amigos', 'Amigos', '#/amigos'],
  ['favoritos', 'Favoritos', '#/favoritos'],
  ['resumen', 'Mi mes', '#/resumen'],
  ['ajustes', 'Ajustes', '#/ajustes'],
];

const app = $('#app');
let iniciado = false;

// ---------- Arranque ----------
if (!configurado) {
  pantallaConfiguracion();
} else {
  sb.auth.onAuthStateChange((evento, sesion) => {
    // Supabase recomienda no llamar a la base dentro de este callback: diferimos.
    setTimeout(() => {
      if (evento === 'PASSWORD_RECOVERY') return pantallaNuevaClave();
      if (sesion?.user && !iniciado) return iniciarSesion(sesion.user);
      if (!sesion && (evento === 'SIGNED_OUT' || evento === 'INITIAL_SESSION')) {
        iniciado = false;
        import('./vistas/entrar.js').then((m) => m.render(app));
      }
    }, 0);
  });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

async function iniciarSesion(usuario) {
  iniciado = true;
  estado.usuario = usuario;
  app.innerHTML = `<div class="entrar">${cargando()}</div>`;
  try {
    // El perfil se crea con un disparador al registrarse; reintentamos por si tarda un instante.
    for (let i = 0; i < 4; i++) {
      try { await cargarPerfil(); break; } catch (e) { if (i === 3) throw e; await new Promise((r) => setTimeout(r, 600)); }
    }
    await Promise.all([cargarAmigos(), cargarBiblias()]);
  } catch (e) {
    error(e, 'No pudimos cargar tu cuenta.');
    app.innerHTML = `<div class="entrar"><div class="caja vacio">${ICONOS.llama}<h3>No pudimos conectar</h3>
      <p>Revisa que hayas ejecutado el archivo schema.sql en Supabase y que tu conexión funcione.</p>
      <button class="boton" style="margin-top:16px" onclick="location.reload()">Reintentar</button></div></div>`;
    return;
  }
  pintarEstructura();
  await procesarCodigoPendiente();
  window.addEventListener('hashchange', navegar);
  await navegar();
  iniciarRecordatorio();
  if (!localStorage.getItem(`lumbre:pausa:${fechaLocal()}`) && !location.hash.startsWith('#/amigo/')) {
    import('./vistas/pausa.js').then((m) => m.mostrarPausa());
  }
}

// ---------- Estructura ----------
function pintarEstructura() {
  const enlace = ([clave, texto, href]) =>
    `<a class="enlace" data-nav="${clave}" href="${href}">${ICONOS[clave]}<span>${texto}</span>${clave === 'amigos' ? '<span class="insignia oculto" data-insignia-amigos></span>' : ''}</a>`;
  app.innerHTML = `
    <div class="marco">
      <nav class="lateral" aria-label="Principal">
        <a class="marca" href="#/">${logo()}<span>Lumbre</span></a>
        ${NAV_PRINCIPAL.map(enlace).join('')}
        <div style="height:14px"></div>
        ${NAV_SECUNDARIA.map(enlace).join('')}
        <div class="pie-lateral">
          <button class="boton fantasma chico" data-pausa>${ICONOS.llama} Hacer una pausa</button>
        </div>
      </nav>
      <div class="principal">
        <header class="cabecera">
          <a class="marca" href="#/">${logo()}<span>Lumbre</span></a>
          <div class="fila" style="margin-left:auto">
            <a class="boton fantasma icono" href="#/amigos" aria-label="Amigos" style="position:relative">${ICONOS.amigos}
              <span class="insignia oculto" data-insignia-amigos style="position:absolute;top:2px;right:0"></span></a>
            <button class="boton fantasma icono" data-menu aria-label="Tu cuenta" style="padding:0">${avatar(estado.perfil)}</button>
          </div>
        </header>
        <main id="vista" class="contenido"></main>
      </div>
      <nav class="barra" aria-label="Principal">
        ${NAV_PRINCIPAL.map(([clave, texto, href]) => `<a data-nav="${clave}" href="${href}">${ICONOS[clave]}<span>${texto}</span></a>`).join('')}
      </nav>
    </div>`;
  app.querySelector('[data-menu]').onclick = menuCuenta;
  app.querySelector('[data-pausa]').onclick = () => import('./vistas/pausa.js').then((m) => m.mostrarPausa(true));
  actualizarInsignias();
}

export function actualizarInsignias() {
  const n = estado.recibidas.length;
  document.querySelectorAll('[data-insignia-amigos]').forEach((el) => {
    el.textContent = n; el.classList.toggle('oculto', !n);
  });
  const btn = document.querySelector('[data-menu]');
  if (btn) btn.innerHTML = avatar(estado.perfil);
}

function menuCuenta() {
  const { panel, cerrar } = hoja(`
    <div class="fila" style="gap:14px;margin-bottom:8px">${avatar(estado.perfil, 'grande')}
      <div><h2 style="margin:0">${esc(estado.perfil.nombre)}</h2><p class="tenue pequeno">${esc(estado.usuario.email)}</p></div></div>
    <div class="opciones-hoja">
      ${NAV_SECUNDARIA.map(([c, t, h]) => `<a class="opcion" data-cerrar href="${h}">${ICONOS[c]} ${t}</a>`).join('')}
      <button class="opcion" data-pausa>${ICONOS.llama} Hacer una pausa</button>
      <button class="opcion" data-salir>${ICONOS.salir} Cerrar sesión</button>
    </div>`);
  panel.querySelector('[data-pausa]').onclick = () => { cerrar(); import('./vistas/pausa.js').then((m) => m.mostrarPausa(true)); };
  panel.querySelector('[data-salir]').onclick = async () => { cerrar(); await sb.auth.signOut(); location.hash = '#/'; };
}

// ---------- Navegación ----------
async function navegar() {
  const ruta = location.hash.slice(1).split('?')[0] || '/';
  let elegida = RUTAS.find(([re]) => re.test(ruta));
  if (!elegida) { location.hash = '#/'; return; }
  const [re, nombre, seccion] = elegida;
  const params = ruta.match(re).slice(1);

  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('activo', a.dataset.nav === seccion));
  const vista = $('#vista');
  if (!vista) return;
  const contenedor = document.createElement('div');
  contenedor.className = 'vista';
  contenedor.innerHTML = cargando();
  vista.replaceChildren(contenedor);
  vista.classList.toggle('ancho', ['planes', 'favoritos', 'resumen'].includes(nombre));
  window.scrollTo(0, 0);

  try {
    const modulo = await import(`./vistas/${nombre}.js`);
    await modulo.render(contenedor, ...params);
  } catch (e) {
    console.error(e);
    contenedor.innerHTML = `<div class="vacio">${ICONOS.llama}<h3>Algo no salió bien</h3>
      <p>${esc(e?.mensaje || e?.message || 'Intenta de nuevo en un momento.')}</p>
      <button class="boton borde" style="margin-top:16px" onclick="location.reload()">Recargar</button></div>`;
  }
}

// ---------- Invitaciones por enlace ----------
async function procesarCodigoPendiente() {
  const codigo = localStorage.getItem('lumbre:codigo-pendiente');
  if (!codigo) return;
  localStorage.removeItem('lumbre:codigo-pendiente');
  if (location.hash.startsWith('#/amigo/')) return; // la vista de invitación se encarga
  try {
    const r = ok(await sb.rpc('solicitar_amistad', { p_codigo: codigo }));
    aviso(r.mensaje, r.ok ? '' : 'error');
    await cargarAmigos();
    actualizarInsignias();
  } catch (e) { error(e); }
}

// ---------- Pantallas especiales ----------
function pantallaConfiguracion() {
  app.innerHTML = `
    <div class="entrar"><div class="caja">
      ${logo('logo-grande')}
      <h1>Lumbre</h1>
      <p class="lema">Casi lista. Falta conectar tu base de datos.</p>
      <div class="tarjeta pila">
        <p>Abre <b>js/config.js</b> y pega la <b>Project URL</b> y la <b>anon key</b> de tu proyecto de Supabase.</p>
        <p class="suave pequeno">Los pasos completos están en el archivo <b>GUIA.md</b>.</p>
      </div>
    </div></div>`;
}

function pantallaNuevaClave() {
  app.innerHTML = `
    <div class="entrar"><div class="caja">
      ${logo('logo-grande')}
      <h1>Nueva contraseña</h1>
      <form class="tarjeta pila" style="margin-top:24px" data-form>
        <label class="campo"><span>Escribe tu nueva contraseña</span>
          <input class="entrada" type="password" minlength="6" required autocomplete="new-password" data-clave></label>
        <button class="boton oro bloque">Guardar</button>
      </form>
    </div></div>`;
  app.querySelector('[data-form]').onsubmit = async (e) => {
    e.preventDefault();
    try {
      ok(await sb.auth.updateUser({ password: app.querySelector('[data-clave]').value }));
      aviso('Contraseña actualizada');
      location.hash = '#/';
      location.reload();
    } catch (err) { error(err); }
  };
}

export { navegar };
