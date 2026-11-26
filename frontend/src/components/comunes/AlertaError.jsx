const ICONO_POR_ESTADO = {
  0: 'bi-wifi-off',
  400: 'bi-exclamation-circle',
  401: 'bi-person-lock',
  403: 'bi-shield-lock',
  404: 'bi-search',
  409: 'bi-diagram-3',
};

/**
 * Muestra un error ya interpretado por interpretarError():
 * título según el código HTTP, mensaje del servidor y botón opcional para reintentar.
 */
export default function AlertaError({ error, onReintentar, className = '' }) {
  if (!error) return null;
  const variante = error.estado === 403 || error.estado === 401 ? 'warning' : 'danger';
  return (
    <div className={`alert alert-${variante} d-flex gap-3 align-items-start ${className}`} role="alert">
      <i className={`bi ${ICONO_POR_ESTADO[error.estado] || 'bi-x-octagon'} fs-4 flex-shrink-0`} />
      <div className="flex-grow-1">
        <div className="fw-semibold">{error.titulo}</div>
        <div className="small">{error.mensaje}</div>
      </div>
      {onReintentar && (
        <button type="button" className="btn btn-sm btn-outline-dark flex-shrink-0" onClick={onReintentar}>
          <i className="bi bi-arrow-clockwise me-1" />Reintentar
        </button>
      )}
    </div>
  );
}