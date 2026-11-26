import { Link } from 'react-router-dom';

/** Ruta inexistente dentro de la SPA. */
export default function NoEncontrado() {
  return (
    <div className="text-center py-5">
      <div className="display-4 fw-bold text-primary">404</div>
      <p className="lead">La página que busca no existe.</p>
      <Link to="/" className="btn btn-primary"><i className="bi bi-house me-1" />Ir al inicio</Link>
    </div>
  );
}