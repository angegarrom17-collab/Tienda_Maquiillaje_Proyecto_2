import { useEffect, useRef, useState } from 'react';

/**
 * Caja de búsqueda que espera a que el usuario deje de escribir (400 ms)
 * antes de enviar el texto como parámetro al backend.
 */
export default function CampoBusqueda({ valor, onBuscar, placeholder = 'Buscar…', etiqueta = 'Búsqueda' }) {
  const [texto, setTexto] = useState(valor || '');
  const onBuscarActual = useRef(onBuscar);
  onBuscarActual.current = onBuscar; // el temporizador siempre usa la versión más reciente

  useEffect(() => { setTexto(valor || ''); }, [valor]);

  useEffect(() => {
    if (texto === (valor || '')) return undefined;
    const temporizador = setTimeout(() => onBuscarActual.current(texto.trim()), 400);
    return () => clearTimeout(temporizador);
  }, [texto]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <label className="form-label small text-secondary mb-1" htmlFor="campo-busqueda">{etiqueta}</label>
      <div className="input-group">
        <span className="input-group-text"><i className="bi bi-search" /></span>
        <input id="campo-busqueda" type="search" className="form-control" placeholder={placeholder}
          value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
    </div>
  );
}