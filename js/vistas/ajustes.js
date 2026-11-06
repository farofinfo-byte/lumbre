import { sb, estado, guardarPerfil, elegirBiblia } from '../estado.js';
import { esc, ICONOS, COLORES_PERFIL, aviso, error, logo } from '../ui.js';
import { descargarCalendario, pedirPermisoNotificaciones, iniciarRecordatorio } from '../recordatorio.js';
import { actualizarInsignias } from '../main.js';

export async function render(el) {
  const p = estado.perfil;
  const tema = localStorage.getItem('lumbre:tema') || 'auto';
  const permiso = 'Notification' in window ? Notification.permission : 'no-soportado';

  el.innerHTML = `
    <header style="padding:14px 0 6px"><p class="etiqueta">Ajustes</p><h1>Tu espacio</h1></header>

    <section class="seccion"><div class="seccion-titulo"><h2>Perfil</h2></div>
      <form class="tarjeta pila" data-perfil>
        <label class="campo"><span>Nombre</span><input class="entrada" name="nombre" maxlength="60" value="${esc(p.nombre)}" required></label>
        <div><span class="campo"><span>Color</span></span>
          <div class="puntos-color" data-colores>${COLORES_PERFIL.map((c) =>
            `<button type="button" class="punto ${c === p.color ? 'activo' : ''}" style="background:${c}" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
        <div><button class="boton chico">Guardar perfil</button></div>
      </form>
    </section>

    <section class="seccion"><div class="seccion-titulo"><h2>Lectura</h2></div>
      <div class="tarjeta pila">
        <label class="campo"><span>Traducción de la Biblia</span>
          ${estado.biblias.length ? `<select class="selector" data-biblia>${estado.biblias.map((b) =>
            `<option value="${esc(b.id)}" ${b.id === estado.biblia?.id ? 'selected' : ''}>${esc(b.nombre)} (${esc(b.abrev)})</option>`).join('')}</select>`
            : `<p class="tenue pequeno">${esc(estado.errorBiblias?.mensaje || 'No hay traducciones disponibles todavía.')}</p>`}
        </label>
        <div><span class="campo"><span>Apariencia</span></span>
          <div class="pestanas" data-tema>
            <button data-t="claro" class="${tema === 'claro' ? 'activo' : ''}">Claro</button>
            <button data-t="oscuro" class="${tema === 'oscuro' ? 'activo' : ''}">Oscuro</button>
            <button data-t="auto" class="${tema === 'auto' ? 'activo' : ''}">Automático</button>
          </div></div>
      </div>
    </section>

    <section class="seccion"><div class="seccion-titulo"><h2>Recordatorio diario</h2></div>
      <div class="tarjeta pila">
        <label class="campo"><span>¿A qué hora quieres tu momento con Dios?</span>
          <input class="entrada" type="time" data-hora value="${esc(p.recordatorio?.slice(0, 5) || '07:00')}" style="max-width:180px"></label>
        <div class="fila envolver">
          <button class="boton oro chico" data-calendario>${ICONOS.planes} Añadir a mi calendario</button>
          <button class="boton borde chico" data-notif ${permiso === 'granted' || permiso === 'no-soportado' ? 'disabled' : ''}>${ICONOS.campana}
            ${permiso === 'granted' ? 'Notificaciones activas' : permiso === 'no-soportado' ? 'Tu navegador no admite avisos' : 'Activar notificaciones'}</button>
        </div>
        <p class="tenue pequeno">El calendario de tu teléfono te avisará cada día a esa hora, aunque Lumbre esté cerrada. Las notificaciones del navegador funcionan cuando la app está abierta o instalada.</p>
      </div>
    </section>

    <section class="seccion"><div class="seccion-titulo"><h2>Instalar Lumbre</h2></div>
      <div class="tarjeta"><p class="suave pequeno">En el iPhone: abre Lumbre en Safari → botón Compartir → <b>Agregar a pantalla de inicio</b>.
      En Android: menú de Chrome → <b>Instalar app</b>. Así se abre como una app más.</p></div>
    </section>

    <div class="fila" style="justify-content:center;margin-top:30px"><button class="boton peligro" data-salir>${ICONOS.salir} Cerrar sesión</button></div>

    <footer style="text-align:center;margin-top:40px" class="tenue">
      <div style="width:40px;margin:0 auto 10px;color:var(--tinta)">${logo()}</div>
      <p class="serif" style="font-style:italic">Lámpara para mis pies y luz para mi camino</p>
      <p class="mini" style="margin-top:4px">Salmo 119:105</p>
      <p class="mini" style="margin-top:14px">Textos bíblicos proporcionados por API.Bible. Los derechos de cada traducción pertenecen a sus editores.</p>
    </footer>`;

  let color = p.color;
  el.querySelector('[data-colores]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    color = b.dataset.c;
    el.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('activo', x === b));
  });
  el.querySelector('[data-perfil]').onsubmit = async (e) => {
    e.preventDefault();
    try { await guardarPerfil({ nombre: e.target.nombre.value.trim(), color }); actualizarInsignias(); aviso('Perfil guardado'); }
    catch (err) { error(err); }
  };
  el.querySelector('[data-biblia]')?.addEventListener('change', async (e) => { await elegirBiblia(e.target.value); aviso(`Ahora lees en ${estado.biblia.abrev}`); });
  el.querySelector('[data-tema]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    localStorage.setItem('lumbre:tema', b.dataset.t);
    window.aplicarTema?.();
    el.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('activo', x === b));
  });

  const hora = el.querySelector('[data-hora]');
  hora.onchange = async () => {
    try { await guardarPerfil({ recordatorio: hora.value || null }); iniciarRecordatorio(); aviso('Hora guardada'); }
    catch (err) { error(err); }
  };
  el.querySelector('[data-calendario]').onclick = async () => {
    if (hora.value !== p.recordatorio?.slice(0, 5)) await guardarPerfil({ recordatorio: hora.value }).catch(() => {});
    descargarCalendario(hora.value || '07:00');
    aviso('Abre el archivo descargado para añadirlo a tu calendario');
  };
  el.querySelector('[data-notif]').onclick = async (e) => {
    const r = await pedirPermisoNotificaciones();
    if (r === 'granted') {
      await guardarPerfil({ recordatorio: hora.value || '07:00' }).catch(() => {});
      e.currentTarget.disabled = true; e.currentTarget.innerHTML = `${ICONOS.campana} Notificaciones activas`;
      iniciarRecordatorio();
    } else aviso('No se activaron las notificaciones', 'error');
  };
  el.querySelector('[data-salir]').onclick = async () => { await sb.auth.signOut(); location.hash = '#/'; };
}
