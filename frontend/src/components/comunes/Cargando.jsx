/** Indicador de carga mientras se espera la respuesta de la API. */
export default function Cargando({ texto = 'Cargando información…' }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-secondary" role="status">
      <div className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}