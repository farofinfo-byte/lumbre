import { sb, ok } from '../estado.js';
import { logo, aviso, error, esc } from '../ui.js';

export function render(app) {
  // Si llegó por un enlace de invitación, guardamos el código para después de entrar
  const invitacion = location.hash.match(/^#\/amigo\/(\w+)/);
  if (invitacion) localStorage.setItem('lumbre:codigo-pendiente', invitacion[1]);

  let modo = 'entrar';
  app.innerHTML = `
    <div class="entrar"><div class="caja vista">
      ${logo('logo-grande')}
      <h1>Lumbre</h1>
      <p class="lema">Una luz para tu camino, cada día.</p>
      ${invitacion ? `<p class="pastilla oro" style="display:flex;justify-content:center;margin:-10px auto 18px;width:max-content">Te invitaron a Lumbre ✨</p>` : ''}
      <form class="tarjeta pila" data-form novalidate>
        <div class="pestanas" style="width:100%;display:grid;grid-template-columns:1fr 1fr">
          <button type="button" class="activo" data-modo="entrar">Entrar</button>
          <button type="button" data-modo="registro">Crear cuenta</button>
        </div>
        <label class="campo oculto" data-solo-registro><span>¿Cómo te llamas?</span>
          <input class="entrada" name="nombre" autocomplete="given-name" maxlength="60" placeholder="Tu nombre"></label>
        <label class="campo"><span>Correo</span>
          <input class="entrada" name="correo" type="email" autocomplete="email" required placeholder="tucorreo@ejemplo.com"></label>
        <label class="campo"><span>Contraseña</span>
          <input class="entrada" name="clave" type="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo 6 caracteres"></label>
        <button class="boton oro bloque" data-enviar>Entrar</button>
        <button type="button" class="boton fantasma chico" data-olvide style="margin:0 auto;display:flex">Olvidé mi contraseña</button>
      </form>
      <p class="tenue mini" style="text-align:center;margin-top:20px">Tu diario es privado a menos que tú decidas compartirlo.</p>
    </div></div>`;

  const form = app.querySelector('[data-form]');
  const boton = form.querySelector('[data-enviar]');

  form.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
    modo = b.dataset.modo;
    form.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('activo', x === b));
    form.querySelector('[data-solo-registro]').classList.toggle('oculto', modo !== 'registro');
    form.querySelector('[data-olvide]').classList.toggle('oculto', modo === 'registro');
    form.clave.autocomplete = modo === 'registro' ? 'new-password' : 'current-password';
    boton.textContent = modo === 'registro' ? 'Crear mi cuenta' : 'Entrar';
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = form.correo.value.trim();
    const clave = form.clave.value;
    if (!correo || clave.length < 6) return aviso('Escribe tu correo y una contraseña de al menos 6 caracteres', 'error');
    boton.disabled = true;
    try {
      if (modo === 'registro') {
        const nombre = form.nombre.value.trim();
        if (!nombre) { boton.disabled = false; return aviso('Escribe tu nombre', 'error'); }
        const r = ok(await sb.auth.signUp({
          email: correo, password: clave,
          options: { data: { nombre }, emailRedirectTo: location.origin },
        }));
        if (!r.session) {
          form.innerHTML = `<div class="vacio" style="padding:20px 0">
            <h3>Revisa tu correo</h3>
            <p>Te enviamos un enlace a <b>${esc(correo)}</b> para confirmar tu cuenta. Después vuelve aquí y entra.</p></div>`;
        }
      } else {
        ok(await sb.auth.signInWithPassword({ email: correo, password: clave }));
      }
    } catch (err) {
      const msg = String(err.message || '');
      if (/invalid login/i.test(msg)) aviso('Correo o contraseña incorrectos', 'error');
      else if (/not confirmed/i.test(msg)) aviso('Confirma tu correo antes de entrar', 'error');
      else if (/already registered/i.test(msg)) aviso('Ese correo ya tiene una cuenta. Entra con él.', 'error');
      else error(err);
    } finally { boton.disabled = false; }
  });

  form.querySelector('[data-olvide]').addEventListener('click', async () => {
    const correo = form.correo.value.trim();
    if (!correo) return aviso('Escribe tu correo primero', 'error');
    try {
      ok(await sb.auth.resetPasswordForEmail(correo, { redirectTo: location.origin }));
      aviso('Te enviamos un correo para cambiar tu contraseña');
    } catch (err) { error(err); }
  });
}
