// Momento de pausa: antes de leer, una pantalla tranquila
import { sb, estado, ok, registrarPausa } from '../estado.js';
import { esc, LLAMA_SVG, fechaLocal, error } from '../ui.js';
import { obtenerPasaje } from '../biblia.js';

const ESTADOS = {
  'En paz': 'PSA.4.8',
  'Con gratitud': 'PSA.103.1-PSA.103.2',
  'Con esperanza': 'ROM.15.13',
  'Con alegría': 'PSA.118.24',
  'Con cansancio': 'MAT.11.28-MAT.11.30',
  'Con ansiedad': 'PHP.4.6-PHP.4.7',
  'Con tristeza': 'PSA.34.18',
  'Con dudas': 'PRO.3.5-PRO.3.6',
};

export async function mostrarPausa(forzar = false) {
  const hoy = fechaLocal();
  if (!forzar) {
    try {
      const fila = ok(await sb.from('actividad').select('estado').eq('usuario', estado.usuario.id).eq('fecha', hoy).maybeSingle());
      if (fila?.estado) { localStorage.setItem(`lumbre:pausa:${hoy}`, '1'); return; }
    } catch { /* si falla, mostramos la pausa igual */ }
  }
  if (document.querySelector('.pausa')) return;

  const capa = document.createElement('div');
  capa.className = 'pausa';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Momento de pausa');
  capa.innerHTML = `
    <div class="caja">
      <div class="vela">${LLAMA_SVG}</div>
      <p class="guia-respirar" data-guia>Respira</p>
      <h1>¿Cómo llegas hoy?</h1>
      <p class="suave">Antes de leer, toma un respiro. No hay respuestas correctas.</p>
      <div class="chips" data-estados>${Object.keys(ESTADOS).map((e) => `<button class="chip" data-estado="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      <textarea class="area" maxlength="500" placeholder="Si quieres, cuéntale a Dios un poco más… (solo tú lo verás)" data-nota></textarea>
      <div class="fila" style="justify-content:center;margin-top:20px">
        <button class="boton fantasma" data-saltar>Ahora no</button>
        <button class="boton oro" data-seguir disabled>Continuar</button>
      </div>
    </div>`;
  document.body.append(capa);
  document.body.style.overflow = 'hidden';

  // Guía de respiración sincronizada con la animación (8 s)
  const guia = capa.querySelector('[data-guia]');
  let inhala = true;
  guia.textContent = 'Inhala…';
  const ritmo = setInterval(() => { inhala = !inhala; guia.textContent = inhala ? 'Inhala…' : 'Exhala…'; }, 4000);

  let elegido = null;
  capa.querySelector('[data-estados]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-estado]');
    if (!b) return;
    elegido = b.dataset.estado;
    capa.querySelectorAll('[data-estado]').forEach((x) => x.classList.toggle('activo', x === b));
    capa.querySelector('[data-seguir]').disabled = false;
  });

  const cerrar = () => {
    clearInterval(ritmo);
    localStorage.setItem(`lumbre:pausa:${hoy}`, '1');
    capa.style.transition = 'opacity .4s'; capa.style.opacity = '0';
    setTimeout(() => { capa.remove(); document.body.style.overflow = ''; }, 400);
  };
  capa.querySelector('[data-saltar]').onclick = cerrar;

  capa.querySelector('[data-seguir]').onclick = async (e) => {
    e.currentTarget.disabled = true;
    try { await registrarPausa(elegido, capa.querySelector('[data-nota]').value.trim()); }
    catch (err) { error(err); }
    clearInterval(ritmo);
    const caja = capa.querySelector('.caja');
    caja.innerHTML = `<div class="vela">${LLAMA_SVG}</div>
      <p class="guia-respirar">Una palabra para ti</p>
      <div data-palabra style="min-height:120px;margin-top:18px"></div>
      <button class="boton oro" data-listo style="margin-top:24px">Continuar</button>`;
    caja.querySelector('[data-listo]').onclick = cerrar;
    const destino = caja.querySelector('[data-palabra]');
    if (!estado.biblia) { destino.innerHTML = `<p class="suave">Dios está contigo, también hoy.</p>`; return; }
    try {
      const p = await obtenerPasaje(estado.biblia.id, ESTADOS[elegido]);
      destino.innerHTML = `<p class="serif" style="font-size:1.35rem;line-height:1.5">${esc(p.texto)}</p>
        <p style="margin-top:12px;color:#F2C877;font-weight:600">${esc(p.referencia)} · ${esc(estado.biblia.abrev)}</p>`;
    } catch {
      destino.innerHTML = `<p class="suave">Dios está contigo, también hoy.</p>`;
    }
  };
}
