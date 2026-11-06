import { estado, elegirBiblia, registrarLectura } from '../estado.js';
import { esc, ICONOS, hoja, aviso, parametrosHash, vacio, cargando } from '../ui.js';
import { obtenerLibros, obtenerCapitulo, buscar, formatearRef, capituloDe } from '../biblia.js';
import { htmlVersos, cargarSubrayados, activarVersos } from '../acciones.js';

const TAMANOS = ['1.05rem', '1.2rem', '1.35rem', '1.55rem'];

export async function render(el) {
  if (!estado.biblia) {
    el.innerHTML = vacio('leer', 'La Biblia aún no está conectada', estado.errorBiblias?.mensaje || 'Configura la clave de API.Bible en Netlify (mira GUIA.md).');
    return;
  }
  const params = parametrosHash();
  const guardado = JSON.parse(localStorage.getItem('lumbre:lector') || '{}');
  let capituloId = params.cap || guardado.cap || 'JHN.1';
  let tam = Number(localStorage.getItem('lumbre:tam') ?? 1);

  el.innerHTML = `
    <div class="lector-barra" style="padding-top:10px">
      <select class="selector" data-biblia aria-label="Traducción">${estado.biblias.map((b) =>
        `<option value="${esc(b.id)}" ${b.id === estado.biblia.id ? 'selected' : ''}>${esc(b.abrev)} · ${esc(b.nombre)}</option>`).join('')}</select>
      <select class="selector" data-libro aria-label="Libro"></select>
      <select class="selector" data-capitulo aria-label="Capítulo" style="flex:0 1 96px"></select>
      <button class="boton borde icono" data-buscar aria-label="Buscar">${ICONOS.buscar}</button>
      <button class="boton borde icono" data-tam aria-label="Tamaño de letra">${ICONOS.texto}</button>
    </div>
    <article class="lector" data-lector style="--tam-lectura:${TAMANOS[tam]}">${cargando()}</article>`;

  const selBiblia = el.querySelector('[data-biblia]');
  const selLibro = el.querySelector('[data-libro]');
  const selCap = el.querySelector('[data-capitulo]');
  const lector = el.querySelector('[data-lector]');
  let libros = [];
  let colores = new Map();
  activarVersos(lector, colores, (vid) => formatearRef(capituloDe(vid)));

  async function cargarLibros() {
    libros = await obtenerLibros(estado.biblia.id);
    selLibro.innerHTML = libros.map((l) => `<option value="${l.id}">${esc(l.nombre)}</option>`).join('');
  }
  function sincronizarSelectores() {
    const libroId = capituloId.split('.')[0];
    const libro = libros.find((l) => l.id === libroId) || libros[0];
    if (!libro) return;
    selLibro.value = libro.id;
    selCap.innerHTML = libro.capitulos.map((c) => `<option value="${c.id}">${esc(c.numero)}</option>`).join('');
    selCap.value = capituloId;
  }
  async function cargarCapitulo(id, versoDestino) {
    capituloId = id;
    localStorage.setItem('lumbre:lector', JSON.stringify({ cap: id }));
    sincronizarSelectores();
    lector.innerHTML = cargando();
    try {
      const [cap, subrayados] = await Promise.all([obtenerCapitulo(estado.biblia.id, id), cargarSubrayados([id])]);
      colores.clear(); subrayados.forEach((v, k) => colores.set(k, v));
      const valido = (x) => x && !/intro/i.test(x);
      lector.innerHTML = `
        <h2>${esc(formatearRef(id))}</h2>
        ${htmlVersos(cap.versos, id, colores)}
        ${cap.copyright ? `<p class="copyright">${esc(cap.copyright)}</p>` : ''}
        <div style="text-align:center;margin-top:28px"><button class="boton oro" data-termine>${ICONOS.check} Terminé este capítulo</button></div>
        <nav class="navegacion-capitulo">
          ${valido(cap.anterior) ? `<button class="boton borde" data-ir="${cap.anterior}">${ICONOS.izq} ${esc(formatearRef(cap.anterior))}</button>` : '<span></span>'}
          ${valido(cap.siguiente) ? `<button class="boton borde" data-ir="${cap.siguiente}">${esc(formatearRef(cap.siguiente))} ${ICONOS.der}</button>` : '<span></span>'}
        </nav>`;
      if (versoDestino) {
        const span = lector.querySelector(`[data-verso="${CSS.escape(`${id}.${versoDestino}`)}"]`);
        if (span) { span.classList.add('sel'); setTimeout(() => span.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }
      } else window.scrollTo({ top: 0 });
    } catch (e) {
      lector.innerHTML = `<p class="suave" style="text-align:center">${esc(e.mensaje || 'No se pudo cargar este capítulo.')}</p>`;
    }
  }

  lector.addEventListener('click', async (e) => {
    const ir = e.target.closest('[data-ir]');
    if (ir) return cargarCapitulo(ir.dataset.ir);
    const fin = e.target.closest('[data-termine]');
    if (fin) {
      fin.disabled = true;
      await registrarLectura();
      fin.className = 'boton suave'; fin.innerHTML = `${ICONOS.check} ¡Leído!`;
      aviso('Un día más en tu racha ✨');
    }
  });
  selBiblia.onchange = async () => {
    await elegirBiblia(selBiblia.value);
    await cargarLibros();
    if (!libros.some((l) => l.id === capituloId.split('.')[0])) capituloId = `${libros[0].id}.1`;
    cargarCapitulo(capituloId);
  };
  selLibro.onchange = () => {
    const libro = libros.find((l) => l.id === selLibro.value);
    cargarCapitulo(libro.capitulos[0]?.id || `${libro.id}.1`);
  };
  selCap.onchange = () => cargarCapitulo(selCap.value);
  el.querySelector('[data-tam]').onclick = () => {
    tam = (tam + 1) % TAMANOS.length;
    localStorage.setItem('lumbre:tam', tam);
    lector.style.setProperty('--tam-lectura', TAMANOS[tam]);
  };
  el.querySelector('[data-buscar]').onclick = () => abrirBusqueda((cap, v) => cargarCapitulo(cap, v));

  try { await cargarLibros(); }
  catch (e) { lector.innerHTML = `<p class="suave">${esc(e.mensaje || 'No se pudieron cargar los libros.')}</p>`; return; }
  cargarCapitulo(capituloId, params.v);
}

function abrirBusqueda(alElegir) {
  const { panel, cerrar } = hoja(`
    <h2>Buscar</h2>
    <form class="fila" data-form><input class="entrada" autofocus placeholder="Ej.: Juan 3:16, paz, no temas" data-q>
      <button class="boton oro icono" aria-label="Buscar">${ICONOS.buscar}</button></form>
    <div data-resultados style="margin-top:12px"></div>`);
  const resultados = panel.querySelector('[data-resultados]');
  let ultimos = [];
  panel.querySelector('[data-form]').onsubmit = async (e) => {
    e.preventDefault();
    const q = panel.querySelector('[data-q]').value.trim();
    if (!q) return;
    resultados.innerHTML = cargando();
    try {
      ultimos = await buscar(estado.biblia.id, q);
      resultados.innerHTML = ultimos.length ? `<ul class="lista">${ultimos.map((r, i) => `
        <li><button class="opcion" data-i="${i}" style="display:block"><b>${esc(r.referencia)}</b>
          <span class="suave pequeno recortar" style="display:-webkit-box;margin-top:4px">${esc(r.texto)}</span></button></li>`).join('')}</ul>`
        : '<p class="tenue">No encontramos resultados.</p>';
    } catch (err) { resultados.innerHTML = `<p class="tenue">${esc(err.mensaje || 'No se pudo buscar.')}</p>`; }
  };
  resultados.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const r = ultimos[Number(b.dataset.i)];
    const [inicio] = r.id.split('-');
    const [libro, cap, verso] = inicio.split('.');
    cerrar();
    alElegir(`${libro}.${cap}`, verso);
  });
}
