const moneda = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 });

export const formatoMoneda = (valor) => (valor === null || valor === undefined || valor === '' ? '—' : moneda.format(Number(valor)));

// Las fechas "AAAA-MM-DD" se interpretan en hora local para no correrse un día
export function formatoFecha(valor) {
  if (!valor) return '—';
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatoFechaHora(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
}

export const formatoHora = (valor) => (valor ? String(valor).slice(0, 5) : '—');

export function hoyIso() {
  const hoy = new Date();
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  return hoy.toISOString().slice(0, 10);
}

export function sumarDiasIso(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}
