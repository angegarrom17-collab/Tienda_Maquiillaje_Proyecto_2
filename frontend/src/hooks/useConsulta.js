import { useCallback, useEffect, useState } from 'react';
import { interpretarError } from '../api/errores';

/**
 * Ejecuta una consulta a la API y expone sus estados: cargando, error y datos.
 * Se vuelve a ejecutar cuando cambian las dependencias o al llamar recargar().
 *
 *   const { datos, cargando, error, recargar } = useConsulta(() => clientesApi.listar(filtros), [filtros]);
 */
export function useConsulta(funcion, dependencias = []) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true; // evita actualizar estado de una consulta vieja
    setCargando(true);
    setError(null);
    funcion()
      .then((resultado) => { if (vigente) setDatos(resultado); })
      .catch((err) => { if (vigente) setError(interpretarError(err)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  return { datos, cargando, error, recargar, setDatos };
}