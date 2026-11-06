// =====================================================================
//  Estado global y acceso a Supabase
// =====================================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';
import { fechaLocal, desdeFechaLocal } from './ui.js';
import { listarBiblias, bibliaPorDefecto } from './biblia.js';

export const configurado =
  CONFIG.SUPABASE_URL.startsWith('https://') && !CONFIG.SUPABASE_URL.includes('TU-PROYECTO') &&
  CONFIG.SUPABASE_ANON_KEY.length > 30;

export const sb = configurado ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

export const estado = {
  usuario: null,
  perfil: null,
  amigos: [],          // [{ id, nombre, color, amistadId }]
  recibidas: [],       // solicitudes que me enviaron
  enviadas: [],        // solicitudes que envié
  biblias: [],
  biblia: null,        // { id, nombre, abrev }
};

/** Lanza el error de Supabase si existe; si no, devuelve los datos. */
export function ok({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------- Perfil ----------
export async function cargarPerfil() {
  estado.perfil = ok(await sb.from('perfiles').select('*').eq('id', estado.usuario.id).single());
  return estado.perfil;
}
export async function guardarPerfil(cambios) {
  estado.perfil = ok(await sb.from('perfiles').update(cambios).eq('id', estado.usuario.id).select().single());
  return estado.perfil;
}

// ---------- Traducción ----------
export async function cargarBiblias() {
  try {
    estado.biblias = await listarBiblias();
  } catch (e) {
    estado.biblias = [];
    estado.errorBiblias = e;
  }
  const preferida = estado.perfil?.biblia_id || localStorage.getItem('lumbre:biblia');
  estado.biblia = estado.biblias.find((b) => b.id === preferida) || bibliaPorDefecto(estado.biblias) || null;
  return estado.biblias;
}
export async function elegirBiblia(id) {
  const b = estado.biblias.find((x) => x.id === id);
  if (!b) return;
  estado.biblia = b;
  localStorage.setItem('lumbre:biblia', id);
  try { await guardarPerfil({ biblia_id: id }); } catch { /* se guarda localmente igual */ }
}

// ---------- Amigos ----------
const CAMPOS_PERSONA = 'id, nombre, color';
export async function cargarAmigos() {
  const filas = ok(await sb.from('amistades').select(`
    id, estado, solicitante, destinatario, creado_en,
    de:perfiles!amistades_solicitante_fkey(${CAMPOS_PERSONA}),
    a:perfiles!amistades_destinatario_fkey(${CAMPOS_PERSONA})`));
  const yo = estado.usuario.id;
  estado.amigos = filas.filter((f) => f.estado === 'aceptada')
    .map((f) => ({ ...(f.solicitante === yo ? f.a : f.de), amistadId: f.id }))
    .filter((p) => p?.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  estado.recibidas = filas.filter((f) => f.estado === 'pendiente' && f.destinatario === yo).map((f) => ({ ...f.de, amistadId: f.id }));
  estado.enviadas = filas.filter((f) => f.estado === 'pendiente' && f.solicitante === yo).map((f) => ({ ...f.a, amistadId: f.id }));
  return estado.amigos;
}
export const amigoPorId = (id) => estado.amigos.find((a) => a.id === id);

// ---------- Actividad y racha ----------
export async function registrarLectura() {
  const hoy = fechaLocal();
  try {
    ok(await sb.from('actividad').upsert({ usuario: estado.usuario.id, fecha: hoy, leyo: true }, { onConflict: 'usuario,fecha' }));
    localStorage.setItem('lumbre:leyo', hoy);
  } catch (e) { console.warn('No se pudo registrar la lectura', e); }
}
export async function registrarPausa(estadoAnimo, nota) {
  ok(await sb.from('actividad').upsert(
    { usuario: estado.usuario.id, fecha: fechaLocal(), estado: estadoAnimo, nota: nota || null },
    { onConflict: 'usuario,fecha' }));
}
export const leyoHoy = () => localStorage.getItem('lumbre:leyo') === fechaLocal();

/** Devuelve { racha, dias: Set(fechas leídas), hoy: bool } */
export async function calcularRacha() {
  const desde = new Date(); desde.setDate(desde.getDate() - 400);
  const filas = ok(await sb.from('actividad').select('fecha, leyo').eq('usuario', estado.usuario.id)
    .gte('fecha', fechaLocal(desde)).eq('leyo', true));
  const dias = new Set(filas.map((f) => f.fecha));
  const hoyTxt = fechaLocal();
  if (dias.has(hoyTxt)) localStorage.setItem('lumbre:leyo', hoyTxt);
  let racha = 0;
  const cursor = new Date();
  if (!dias.has(hoyTxt)) cursor.setDate(cursor.getDate() - 1); // la racha sigue viva si leíste ayer
  while (dias.has(fechaLocal(cursor))) { racha++; cursor.setDate(cursor.getDate() - 1); }
  return { racha, dias, hoy: dias.has(hoyTxt) };
}

export { desdeFechaLocal };
