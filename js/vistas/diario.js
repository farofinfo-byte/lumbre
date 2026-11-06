import { sb, estado, ok } from '../estado.js';
import { esc, ICONOS, avatar, haceCuanto, vacio } from '../ui.js';

export const VISIBILIDAD = {
  privado: { texto: 'Privado', icono: 'candado' },
  amigos: { texto: 'Mis amigos', icono: 'amigos' },
  elegidos: { texto: 'Algunos amigos', icono: 'grupo' },
};

export async function render(el) {
  let pestana = sessionStorage.getItem('lumbre:diario') || 'mio';
  el.innerHTML = `
    <header style="padding:14px 0 6px" class="fila entre envolver">
      <div><p class="etiqueta">Diario espiritual</p><h1>Lo que Dios me habla</h1></div>
      <a class="boton oro" href="#/diario/nuevo">${ICONOS.lapiz} Escribir</a>
    </header>
    <div class="pestanas" style="margin:18px 0">
      <button data-p="mio">Mi diario</button><button data-p="circulo">De mis amigos</button>
    </div>
    <div data-lista></div>`;

  const lista = el.querySelector('[data-lista]');
  const pintar = async () => {
    sessionStorage.setItem('lumbre:diario', pestana);
    el.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('activo', b.dataset.p === pestana));
    lista.innerHTML = '<div class="esqueleto" style="height:120px"></div>';
    try {
      let q = sb.from('entradas')
        .select('id, titulo, contenido, pasaje_ref, visibilidad, creado_en, autor, autor_p:perfiles!entradas_autor_fkey(id, nombre, color), comentarios(count)')
        .order('creado_en', { ascending: false }).limit(60);
      q = pestana === 'mio' ? q.eq('autor', estado.usuario.id) : q.neq('autor', estado.usuario.id);
      const filas = ok(await q);
      if (!filas.length) {
        lista.innerHTML = pestana === 'mio'
          ? vacio('diario', 'Tu diario está esperando', 'Escribe lo que sientes, lo que oras o lo que te habló un versículo. Es privado a menos que decidas compartirlo.', '<a class="boton oro" style="margin-top:16px" href="#/diario/nuevo">Escribir mi primera entrada</a>')
          : vacio('amigos', 'Nada por aquí todavía', 'Cuando tus amigos compartan sus devocionales contigo, aparecerán aquí.');
        return;
      }
      lista.innerHTML = filas.map((x) => {
        const v = VISIBILIDAD[x.visibilidad];
        const n = x.comentarios?.[0]?.count || 0;
        return `<a class="tarjeta entrada-tarjeta" href="#/entrada/${x.id}">
          <div class="fila entre">
            ${pestana === 'mio'
              ? `<span class="tenue pequeno">${new Date(x.creado_en).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                 <span class="pastilla">${ICONOS[v.icono]} ${v.texto}</span>`
              : `<span class="fila">${avatar(x.autor_p, 'chico')}<span class="pequeno"><b>${esc(x.autor_p?.nombre)}</b> <span class="tenue">· ${haceCuanto(x.creado_en)}</span></span></span>`}
          </div>
          ${x.titulo ? `<h3>${esc(x.titulo)}</h3>` : '<div style="height:10px"></div>'}
          <p class="suave recortar">${esc(x.contenido)}</p>
          <div class="fila" style="margin-top:10px">
            ${x.pasaje_ref ? `<span class="pastilla oro">${ICONOS.leer} ${esc(x.pasaje_ref)}</span>` : ''}
            ${n ? `<span class="pastilla">${ICONOS.corazon} ${n} ${n === 1 ? 'comentario' : 'comentarios'}</span>` : ''}
          </div>
        </a>`;
      }).join('');
    } catch (e) { lista.innerHTML = vacio('diario', 'No se pudo cargar', e.message); }
  };
  el.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { pestana = b.dataset.p; pintar(); }));
  pintar();
}
