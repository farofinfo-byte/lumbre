import { sb, estado, ok } from '../estado.js';
import { esc, ICONOS, vacio } from '../ui.js';
import { capituloDe } from '../biblia.js';
import { menuVersiculo } from '../acciones.js';

const COLORES = { oro: 'Dorado', salvia: 'Salvia', cielo: 'Cielo', rosa: 'Rosa' };

export async function render(el) {
  const filas = ok(await sb.from('favoritos').select('*').eq('usuario', estado.usuario.id).order('creado_en', { ascending: false }));
  let filtro = 'todos';

  el.innerHTML = `
    <header style="padding:14px 0 6px">
      <p class="etiqueta">Favoritos</p>
      <h1>Palabras que guardé</h1>
    </header>
    ${filas.length ? `<div class="chips" style="margin:18px 0" data-filtros>
      <button class="chip activo" data-f="todos">Todos · ${filas.length}</button>
      ${Object.entries(COLORES).filter(([c]) => filas.some((f) => f.color === c)).map(([c, n]) =>
        `<button class="chip" data-f="${c}"><span class="punto" data-color="${c}" style="width:14px;height:14px;border:0"></span> ${n}</button>`).join('')}
    </div>` : ''}
    <div class="rejilla" data-lista></div>`;

  const lista = el.querySelector('[data-lista]');
  const pintar = () => {
    const visibles = filas.filter((f) => filtro === 'todos' || f.color === filtro);
    lista.innerHTML = visibles.length ? visibles.map((f) => `
      <article class="tarjeta sub-${f.color}" style="border-color:transparent" data-fav="${f.id}">
        <p class="serif" style="font-size:1.1rem;line-height:1.55">${esc(f.texto || '')}</p>
        <div class="fila entre" style="margin-top:14px">
          <b class="pequeno">${esc(f.referencia)}${f.biblia_nombre ? ` <span class="tenue">· ${esc(f.biblia_nombre)}</span>` : ''}</b>
          <span class="fila" style="gap:2px">
            <a class="boton fantasma chico icono" href="#/leer?cap=${encodeURIComponent(capituloDe(f.verso_id))}&v=${encodeURIComponent((f.verso_id.split('-')[0].split('.')[2]) || '')}" aria-label="Abrir en la Biblia">${ICONOS.leer}</a>
            <button class="boton fantasma chico icono" data-menu="${f.id}" aria-label="Más opciones">${ICONOS.menu}</button>
          </span>
        </div>
      </article>`).join('')
      : `<div style="grid-column:1/-1">${vacio('favoritos', 'Aún no guardas versículos', 'Toca cualquier versículo mientras lees para subrayarlo o guardarlo aquí.', '<a class="boton oro" style="margin-top:16px" href="#/leer">Ir a leer</a>')}</div>`;
  };
  pintar();

  el.querySelector('[data-filtros]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    filtro = b.dataset.f;
    el.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('activo', x === b));
    pintar();
  });

  lista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-menu]');
    if (!b) return;
    const f = filas.find((x) => x.id === b.dataset.menu);
    menuVersiculo({
      versoId: f.verso_id, referencia: f.referencia, texto: f.texto || '', colorActual: f.color,
      alCambiarColor: (color) => {
        if (color) f.color = color;
        else filas.splice(filas.indexOf(f), 1);
        pintar();
      },
    });
  });
}

