// =====================================================================
//  Recordatorio diario
//  1) Evento repetitivo en el calendario del teléfono (.ics) → el más fiable.
//  2) Notificación del navegador mientras Lumbre esté abierta o instalada.
// =====================================================================
import { estado, leyoHoy } from './estado.js';
import { fechaLocal } from './ui.js';

export function descargarCalendario(hora = '07:00') {
  const [h, m] = hora.split(':');
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  const dia = fechaLocal(manana).replaceAll('-', '');
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = location.origin;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lumbre//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:lumbre-recordatorio-${estado.usuario?.id || 'diario'}@lumbre`,
    `DTSTAMP:${ahora}`,
    `DTSTART:${dia}T${h}${m}00`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Tu momento en Lumbre',
    `DESCRIPTION:Unos minutos para leer\\, escribir y orar. ${url}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Tu momento en Lumbre', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  enlace.download = 'lumbre-recordatorio.ics';
  enlace.click();
}

export async function pedirPermisoNotificaciones() {
  if (!('Notification' in window)) return 'no-soportado';
  return Notification.requestPermission();
}

let temporizador = null;
export function iniciarRecordatorio() {
  clearInterval(temporizador);
  temporizador = setInterval(revisar, 60 * 1000);
  revisar();
}

async function revisar() {
  const hora = estado.perfil?.recordatorio?.slice(0, 5);
  if (!hora || !('Notification' in window) || Notification.permission !== 'granted') return;
  const hoy = fechaLocal();
  if (localStorage.getItem('lumbre:notificado') === hoy || leyoHoy()) return;
  const ahora = new Date();
  const [h, m] = hora.split(':').map(Number);
  if (ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) return;
  localStorage.setItem('lumbre:notificado', hoy);
  const opciones = { body: 'Tu momento con Dios te espera. Unos minutos bastan.', icon: '/assets/icono-192.png', badge: '/assets/icono-192.png', tag: 'lumbre-diario' };
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    if (registro) registro.showNotification('Lumbre', opciones);
    else new Notification('Lumbre', opciones);
  } catch { /* algunos navegadores no lo permiten */ }
}
