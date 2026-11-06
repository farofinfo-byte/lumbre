// =====================================================================
//  Puente seguro hacia API.Bible
//  El navegador llama a /api/biblia?ruta=bibles/...  y esta función añade
//  tu clave (variable de entorno BIBLE_API_KEY en Netlify), que nunca
//  llega al navegador.
// =====================================================================

const BASE = process.env.BIBLE_API_BASE || 'https://rest.api.bible/v1';

// Solo se permiten rutas de lectura de API.Bible
const RUTA_VALIDA = /^bibles(\/[A-Za-z0-9.\-]+){0,4}$/;

export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
  if (!process.env.BIBLE_API_KEY) return json({ error: 'Falta BIBLE_API_KEY en Netlify' }, 401);

  const entrada = new URL(req.url);
  const ruta = entrada.searchParams.get('ruta') || '';
  if (!RUTA_VALIDA.test(ruta)) return json({ error: 'Ruta no válida' }, 400);

  const params = new URLSearchParams(entrada.searchParams);
  params.delete('ruta');

  try {
    const r = await fetch(`${BASE}/${ruta}${params.size ? `?${params}` : ''}`, {
      headers: { 'api-key': process.env.BIBLE_API_KEY, accept: 'application/json' },
    });
    const cuerpo = await r.text();
    return new Response(cuerpo, {
      status: r.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // Los textos bíblicos no cambian: se pueden guardar en caché un día
        'cache-control': r.ok ? 'public, max-age=86400' : 'no-store',
      },
    });
  } catch {
    return json({ error: 'No se pudo conectar con API.Bible' }, 502);
  }
};

function json(datos, status) {
  return new Response(JSON.stringify(datos), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export const config = { path: '/api/biblia' };
