// Llegada por enlace de invitación: #/amigo/CODIGO
import { sb, ok, cargarAmigos } from '../estado.js';
import { esc, ICONOS } from '../ui.js';
import { actualizarInsignias } from '../main.js';

export async function render(el, codigo) {
  let r;
  try { r = ok(await sb.rpc('solicitar_amistad', { p_codigo: codigo })); }
  catch (e) { r = { ok: false, mensaje: e.message }; }
  await cargarAmigos().catch(() => {});
  actualizarInsignias();
  el.innerHTML = `<div class="vacio" style="padding-top:60px">${ICONOS.amigos}
    <h3>${r.ok && r.nombre ? esc(r.nombre) : 'Invitación'}</h3>
    <p>${esc(r.mensaje)}</p>
    <a class="boton oro" style="margin-top:18px" href="#/amigos">Ir a mis amigos</a></div>`;
}
