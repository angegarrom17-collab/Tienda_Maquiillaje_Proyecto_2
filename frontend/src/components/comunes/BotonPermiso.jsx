import { Link } from 'react-router-dom';

/**
 * Botón o enlace que se deshabilita cuando el perfil no tiene el permiso.
 * Es solo una ayuda visual: el backend vuelve a validar y responde 403 si no corresponde.
 */
export default function BotonPermiso({ permitido, a, onClick, className = 'btn btn-primary', motivo = 'Su perfil no tiene permiso para esta acción', children, ...resto }) {
  if (!permitido) {
    return (
      <span className="d-inline-block" title={motivo} tabIndex={0}>
        <button type="button" className={className} disabled style={{ pointerEvents: 'none' }} {...resto}>
          <i className="bi bi-lock me-1" />{children}
        </button>
      </span>
    );
  }
  if (a) return <Link to={a} className={className} {...resto}>{children}</Link>;
  return <button type="button" className={className} onClick={onClick} {...resto}>{children}</button>;
}