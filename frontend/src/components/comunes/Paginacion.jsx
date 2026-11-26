/**
 * Paginación del backend: usa pagina_actual, total_paginas y total_registros
 * que devuelve la API (5 registros por página) y pide la página con ?page=N.
 */
export default function Paginacion({ datos, onCambiar }) {
  if (!datos) return null;
  const { pagina_actual: actual, total_paginas: total, total_registros: registros } = datos;
  if (!registros) return null;

  const paginas = [];
  const desde = Math.max(1, actual - 2);
  const hasta = Math.min(total, actual + 2);
  for (let i = desde; i <= hasta; i += 1) paginas.push(i);

  return (
    <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 px-3 py-2 border-top">
      <small className="text-secondary">
        Página {actual} de {total} · {registros} registro{registros === 1 ? '' : 's'} en total
      </small>
      <nav aria-label="Paginación">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${actual <= 1 ? 'disabled' : ''}`}>
            <button type="button" className="page-link" onClick={() => onCambiar(actual - 1)} aria-label="Anterior">
              <i className="bi bi-chevron-left" />
            </button>
          </li>
          {desde > 1 && <li className="page-item disabled"><span className="page-link">…</span></li>}
          {paginas.map((numero) => (
            <li key={numero} className={`page-item ${numero === actual ? 'active' : ''}`}>
              <button type="button" className="page-link" onClick={() => onCambiar(numero)}>{numero}</button>
            </li>
          ))}
          {hasta < total && <li className="page-item disabled"><span className="page-link">…</span></li>}
          <li className={`page-item ${actual >= total ? 'disabled' : ''}`}>
            <button type="button" className="page-link" onClick={() => onCambiar(actual + 1)} aria-label="Siguiente">
              <i className="bi bi-chevron-right" />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}