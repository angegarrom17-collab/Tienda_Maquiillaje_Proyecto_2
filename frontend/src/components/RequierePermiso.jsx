import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protege pantallas de creación/edición según el permiso de Django (app.accion_modelo).
 * Si el perfil no lo tiene, muestra un aviso en lugar del formulario.
 * El backend igual rechaza la operación con 403 si se intentara por otra vía.
 */
export default function RequierePermiso({ permiso, children }) {
  const { puedeGestionar, usuario } = useAuth();
  if (puedeGestionar(permiso)) return children;
  return (
    <div className="card border-warning">
      <div className="card-body text-center py-5">
        <i className="bi bi-shield-lock display-5 text-warning d-block mb-3" />
        <h2 className="h5">Acceso restringido</h2>
        <p className="text-secondary mb-1">
          El perfil <strong>{usuario?.perfil}</strong> no tiene el permiso <code>{permiso}</code>
          {!usuario?.is_staff && ' y no pertenece al personal de la tienda'}.
        </p>
        <p className="text-secondary small">Django respondería <strong>403 Forbidden</strong> a esta operación.</p>
        <Link to=".." relative="path" className="btn btn-outline-secondary mt-2">Volver</Link>
      </div>
    </div>
  );
}