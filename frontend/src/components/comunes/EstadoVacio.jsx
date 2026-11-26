/** Mensaje cuando un listado no tiene registros (o ningún registro cumple los filtros). */
export default function EstadoVacio({ titulo = 'No hay registros', texto, icono = 'bi-inbox', children }) {
  return (
    <div className="text-center py-5 px-3 text-secondary">
      <i className={`bi ${icono} display-6 d-block mb-2 opacity-50`} />
      <p className="fw-semibold mb-1 text-body">{titulo}</p>
      {texto && <p className="small mb-3">{texto}</p>}
      {children}
    </div>
  );
}