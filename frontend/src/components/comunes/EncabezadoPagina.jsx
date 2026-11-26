import { Link } from 'react-router-dom';

/** Título de cada pantalla con migas de pan y espacio para botones de acción. */
export default function EncabezadoPagina({ titulo, subtitulo, icono, migas = [], children }) {
  return (
    <div className="mb-4">
      {migas.length > 0 && (
        <nav aria-label="Ruta de navegación">
          <ol className="breadcrumb small mb-1">
            <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
            {migas.map((miga) => (
              <li key={miga.texto} className="breadcrumb-item">
                {miga.a ? <Link to={miga.a}>{miga.texto}</Link> : miga.texto}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="h3 mb-0 d-flex align-items-center gap-2">
            {icono && <i className={`bi ${icono} text-primary`} />}{titulo}
          </h1>
          {subtitulo && <p className="text-secondary mb-0 mt-1">{subtitulo}</p>}
        </div>
        {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}