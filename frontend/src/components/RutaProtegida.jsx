import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Cargando from './comunes/Cargando';

/** Si no hay sesión válida, redirige al login recordando la ruta solicitada. */
export default function RutaProtegida() {
  const { autenticado, verificando, motivoSalida } = useAuth();
  const ubicacion = useLocation();

  if (verificando) return <div className="vh-100 d-flex align-items-center justify-content-center"><Cargando texto="Verificando sesión…" /></div>;
  if (!autenticado) {
    // Tras un logout voluntario no se recuerda la ruta; tras una sesión expirada sí, para volver a ella
    const desde = motivoSalida === 'logout' ? undefined : ubicacion.pathname + ubicacion.search;
    return <Navigate to="/login" replace state={{ desde, motivo: motivoSalida }} />;
  }
  return <Outlet />;
}