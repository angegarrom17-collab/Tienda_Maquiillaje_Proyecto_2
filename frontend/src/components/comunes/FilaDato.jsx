/** Par etiqueta/valor para las vistas de detalle. */
export default function FilaDato({ etiqueta, children }) {
  return (
    <div className="row py-2 border-bottom g-0">
      <dt className="col-sm-4 text-secondary fw-normal small">{etiqueta}</dt>
      <dd className="col-sm-8 mb-0">{children ?? '—'}</dd>
    </div>
  );
}