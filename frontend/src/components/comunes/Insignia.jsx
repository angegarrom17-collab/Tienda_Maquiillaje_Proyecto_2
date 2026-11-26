import { COLOR_ESTADO } from '../../utils/catalogos';

/** Insignia de color para estados (PENDIENTE, PAGADA, PROGRAMADO, inscrita, activo...). */
export default function Insignia({ valor, texto }) {
  if (typeof valor === 'boolean') {
    return <span className={`badge rounded-pill text-bg-${valor ? 'success' : 'secondary'}`}>{texto ?? (valor ? 'Activo' : 'Inactivo')}</span>;
  }
  const color = COLOR_ESTADO[valor] || 'secondary';
  return <span className={`badge rounded-pill text-bg-${color} ${color === 'light' ? 'border' : ''}`}>{texto ?? valor}</span>;
}