/**
 * Campo de formulario controlado con etiqueta, marca de obligatorio,
 * texto de ayuda y mensaje de error (del navegador o del serializer de Django).
 * como: 'input' (por defecto) | 'select' | 'textarea' | 'switch'
 */
export default function Campo({
  etiqueta, name, valor, onChange, error, requerido = false, ayuda, como = 'input',
  opciones = [], opcionVacia = 'Seleccione…', className = '', ...resto
}) {
  const id = `campo-${name}`;
  const claseError = error ? 'is-invalid' : '';

  if (como === 'switch') {
    return (
      <div className={`form-check form-switch ${className}`}>
        <input className={`form-check-input ${claseError}`} type="checkbox" role="switch" id={id} name={name}
          checked={Boolean(valor)} onChange={onChange} {...resto} />
        <label className="form-check-label" htmlFor={id}>{etiqueta}</label>
        {error && <div className="invalid-feedback d-block">{error}</div>}
      </div>
    );
  }

  let control;
  if (como === 'select') {
    control = (
      <select id={id} name={name} className={`form-select ${claseError}`} value={valor ?? ''} onChange={onChange}
        required={requerido} {...resto}>
        {opcionVacia !== null && <option value="">{opcionVacia}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor} disabled={opcion.deshabilitada}>{opcion.texto}</option>
        ))}
      </select>
    );
  } else if (como === 'textarea') {
    control = (
      <textarea id={id} name={name} className={`form-control ${claseError}`} value={valor ?? ''} onChange={onChange}
        required={requerido} rows={3} {...resto} />
    );
  } else {
    control = (
      <input id={id} name={name} className={`form-control ${claseError}`} value={valor ?? ''} onChange={onChange}
        required={requerido} {...resto} />
    );
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="form-label">
        {etiqueta}{requerido && <span className="text-danger ms-1" title="Obligatorio">*</span>}
      </label>
      {control}
      {error ? <div className="invalid-feedback">{error}</div> : ayuda && <div className="form-text">{ayuda}</div>}
    </div>
  );
}