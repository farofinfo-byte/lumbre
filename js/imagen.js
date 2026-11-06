// =====================================================================
//  Imagen para historias de Instagram (1080 × 1920)
// =====================================================================

const LLAMA = 'M32 5c3.2 8.6 12.6 14.4 12.6 25.2C44.6 38.3 39 43 32 43s-12.6-4.7-12.6-12.8c0-6.4 3.7-10.6 6.6-15 1.1 3.8 2.6 6.4 5.1 7.9C29.7 17.6 29.6 11 32 5Z';
const CORAZON = 'M32 25.5c2.7 3.4 5.4 6 5.4 9.6 0 3.5-2.4 5.9-5.4 5.9s-5.4-2.4-5.4-5.9c0-3.6 2.7-6.2 5.4-9.6Z';
const PAG_IZQ = 'M6 45.5c9.5-3.6 18.5-3 26 3.2v6.8c-7.5-5.6-16.5-6.2-26-3V45.5Z';
const PAG_DER = 'M58 45.5c-9.5-3.6-18.5-3-26 3.2v6.8c7.5-5.6 16.5-6.2 26-3V45.5Z';

function envolver(ctx, texto, ancho) {
  const palabras = texto.split(/\s+/);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function espaciado(ctx, texto, x, y, separacion) {
  const total = [...texto].reduce((s, c) => s + ctx.measureText(c).width + separacion, -separacion);
  let cx = x - total / 2;
  for (const c of texto) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + separacion; }
}

/**
 * @param {{ texto: string, referencia: string, version?: string, etiqueta?: string }} datos
 * @returns {Promise<Blob>}
 */
export async function crearImagenVersiculo({ texto, referencia, version = '', etiqueta = 'Palabra para hoy' }) {
  try {
    await Promise.all([
      document.fonts.load('400 64px Fraunces'), document.fonts.load('italic 400 64px Fraunces'),
      document.fonts.load('600 40px Inter'), document.fonts.load('600 48px Fraunces'),
    ]);
  } catch { /* si las fuentes no cargan, se usa la de respaldo */ }

  const W = 1080, H = 1920;
  const lienzo = document.createElement('canvas');
  lienzo.width = W; lienzo.height = H;
  const ctx = lienzo.getContext('2d');

  // Fondo azul noche con luz de vela
  const fondo = ctx.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, '#1C2B55'); fondo.addColorStop(1, '#0A1124');
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(540, 330, 0, 540, 330, 760);
  halo.addColorStop(0, 'rgba(242,200,119,.42)'); halo.addColorStop(.45, 'rgba(242,200,119,.10)'); halo.addColorStop(1, 'rgba(242,200,119,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
  const halo2 = ctx.createRadialGradient(120, 1750, 0, 120, 1750, 620);
  halo2.addColorStop(0, 'rgba(120,150,230,.16)'); halo2.addColorStop(1, 'rgba(120,150,230,0)');
  ctx.fillStyle = halo2; ctx.fillRect(0, 0, W, H);

  // Logo
  ctx.save();
  ctx.translate(540 - 72, 200); ctx.scale(2.25, 2.25);
  const oro = ctx.createLinearGradient(0, 5, 0, 43);
  oro.addColorStop(0, '#FBDFA0'); oro.addColorStop(1, '#D9A03C');
  ctx.fillStyle = oro; ctx.fill(new Path2D(LLAMA));
  ctx.fillStyle = '#16244A'; ctx.fill(new Path2D(CORAZON));
  ctx.fillStyle = '#F6EEDD'; ctx.fill(new Path2D(PAG_IZQ)); ctx.fill(new Path2D(PAG_DER));
  ctx.restore();

  // Etiqueta
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F2C877'; ctx.font = '600 30px Inter, system-ui, sans-serif';
  espaciado(ctx, etiqueta.toUpperCase(), 540, 470, 7);

  // Versículo: ajusta el tamaño para que quepa
  const limpio = `“${texto.trim().replace(/^[“"«]+|[”"»]+$/g, '')}”`;
  let tam = 84, lineas, alto;
  for (; tam >= 38; tam -= 2) {
    ctx.font = `400 ${tam}px Fraunces, Georgia, serif`;
    lineas = envolver(ctx, limpio, 860);
    alto = lineas.length * tam * 1.34;
    if (alto <= 900) break;
  }
  ctx.fillStyle = '#F6EEDD'; ctx.textAlign = 'center';
  const inicioY = 980 - alto / 2 + tam;
  lineas.forEach((l, i) => ctx.fillText(l, 540, inicioY + i * tam * 1.34));

  // Referencia y versión
  const finY = inicioY + (lineas.length - 1) * tam * 1.34;
  ctx.fillStyle = '#F2C877'; ctx.font = '600 42px Inter, system-ui, sans-serif';
  ctx.fillText(referencia, 540, finY + 110);
  if (version) {
    ctx.fillStyle = 'rgba(246,238,221,.55)'; ctx.font = '400 28px Inter, system-ui, sans-serif';
    ctx.fillText(version, 540, finY + 160);
  }

  // Pie
  ctx.strokeStyle = 'rgba(246,238,221,.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(470, 1712); ctx.lineTo(610, 1712); ctx.stroke();
  ctx.fillStyle = '#F6EEDD'; ctx.font = '600 50px Fraunces, Georgia, serif';
  ctx.fillText('Lumbre', 540, 1790);

  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/png'));
}
