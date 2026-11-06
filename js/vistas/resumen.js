import { sb, estado, ok } from '../estado.js';
import { esc, ICONOS, fechaLocal, parametrosHash, parrafos } from '../ui.js';

export async function render(el) {
  const hoy = new Date();
  const p = parametrosHash();
  const [anio, mes] = (p.mes || `${hoy.getFullYear()}-${hoy.getMonth() + 1}`).split('-').map(Number);
  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0);
  const desde = fechaLocal(inicio), hasta = fechaLocal(fin);
  const desdeISO = inicio.toISOString(), hastaISO = new Date(anio, mes, 1).toISOString();
  const yo = estado.usuario.id;
  const nombreMes = inicio.toLocaleDateString('es', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
  const anterior = new Date(anio, mes - 2, 1), siguiente = new Date(anio, mes, 1);
  const esFuturo = siguiente > hoy;

  const [actividad, entradas, favoritos, respondidas] = await Promise.all([
    sb.from('actividad').select('fecha, leyo, estado').eq('usuario', yo).gte('fecha', desde).lte('fecha', hasta).then(ok),
    sb.from('entradas').select('id', { count: 'exact', head: true }).eq('autor', yo).gte('creado_en', desdeISO).lt('creado_en', hastaISO),
    sb.from('favoritos').select('referencia, texto, biblia_nombre').eq('usuario', yo).gte('creado_en', desdeISO).lt('creado_en', hastaISO).order('creado_en', { ascending: false }).then(ok),
    sb.from('peticiones').select('contenido, testimonio, respondida_en').eq('autor', yo).eq('respondida', true).gte('respondida_en', desdeISO).lt('respondida_en', hastaISO).then(ok),
  ]);
  const leidos = new Set(actividad.filter((a) => a.leyo).map((a) => a.fecha));
  const estados = actividad.filter((a) => a.estado).reduce((m, a) => m.set(a.estado, (m.get(a.estado) || 0) + 1), new Map());
  const huecoInicial = (inicio.getDay() + 6) % 7; // semana empieza el lunes

  el.innerHTML = `
    <header style="padding:14px 0 6px" class="fila entre envolver">
      <div><p class="etiqueta">Mi mes</p><h1>${esc(nombreMes)}</h1></div>
      <div class="fila">
        <a class="boton borde icono" href="#/resumen?mes=${anterior.getFullYear()}-${anterior.getMonth() + 1}" aria-label="Mes anterior">${ICONOS.izq}</a>
        ${esFuturo ? '' : `<a class="boton borde icono" href="#/resumen?mes=${siguiente.getFullYear()}-${siguiente.getMonth() + 1}" aria-label="Mes siguiente">${ICONOS.der}</a>`}
      </div>
    </header>

    <div class="cifras" style="margin-top:18px">
      <div class="cifra"><b>${leidos.size}</b><span>días con la Palabra</span></div>
      <div class="cifra"><b>${entradas.count ?? 0}</b><span>entradas en el diario</span></div>
      <div class="cifra"><b>${favoritos.length}</b><span>versículos guardados</span></div>
      <div class="cifra"><b>${respondidas.length}</b><span>oraciones respondidas</span></div>
    </div>

    <section class="seccion">
      <div class="seccion-titulo"><h2>Días leídos</h2></div>
      <div class="tarjeta">
        <div class="calendario">
          ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<span class="dsem">${d}</span>`).join('')}
          ${'<span class="c vacio-c"></span>'.repeat(huecoInicial)}
          ${Array.from({ length: fin.getDate() }, (_, i) => {
            const f = fechaLocal(new Date(anio, mes - 1, i + 1));
            return `<span class="c ${leidos.has(f) ? 'lleno' : ''}">${i + 1}</span>`;
          }).join('')}
        </div>
      </div>
    </section>

    ${estados.size ? `<section class="seccion">
      <div class="seccion-titulo"><h2>Cómo llegaste</h2></div>
      <div class="chips">${[...estados].sort((a, b) => b[1] - a[1]).map(([e, n]) => `<span class="chip">${esc(e)} · ${n}</span>`).join('')}</div>
    </section>` : ''}

    ${favoritos.length ? `<section class="seccion">
      <div class="seccion-titulo"><h2>Versículos que guardaste</h2><a class="boton fantasma chico" href="#/favoritos">Ver todos</a></div>
      ${favoritos.slice(0, 5).map((f) => `<div class="tarjeta"><div class="cita">${esc(f.texto || '')}<b>${esc(f.referencia)}${f.biblia_nombre ? ` · ${esc(f.biblia_nombre)}` : ''}</b></div></div>`).join('')}
    </section>` : ''}

    ${respondidas.length ? `<section class="seccion">
      <div class="seccion-titulo"><h2>Lo que Dios hizo</h2></div>
      ${respondidas.map((r) => `<div class="tarjeta"><p class="pastilla oro">${ICONOS.sparkle} ${new Date(r.respondida_en).toLocaleDateString('es', { day: 'numeric', month: 'long' })}</p>
        <div class="suave" style="margin-top:10px">${parrafos(r.contenido)}</div>
        ${r.testimonio ? `<div class="cita" style="margin-top:10px;font-style:normal">${parrafos(r.testimonio)}</div>` : ''}</div>`).join('')}
    </section>` : ''}

    ${!leidos.size && !favoritos.length && !respondidas.length && !(entradas.count) ? `<p class="tenue" style="text-align:center;margin-top:30px">Este mes aún está en blanco. Cada día es una nueva oportunidad. ✨</p>` : ''}`;
}
