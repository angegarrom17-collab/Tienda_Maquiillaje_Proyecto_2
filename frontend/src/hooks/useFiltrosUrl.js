import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Guarda filtros, búsqueda, orden y página en la URL (?estado=...&page=2).
 * Así los listados se pueden recargar, compartir y navegar con "atrás"
 * sin perder la consulta. Los valores vacíos no se envían al backend.
 */
export function useFiltrosUrl(valoresIniciales) {
  const [parametros, setParametros] = useSearchParams();

  const filtros = useMemo(() => {
    const resultado = { ...valoresIniciales };
    Object.keys(valoresIniciales).forEach((clave) => {
      const valor = parametros.get(clave);
      if (valor !== null) resultado[clave] = valor;
    });
    resultado.page = Number(parametros.get('page')) || 1;
    return resultado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros]);

  const actualizar = useCallback((cambios) => {
    // Se parte de la URL actual del navegador (no de un valor capturado en un render anterior)
    // para no reintroducir filtros que el usuario acaba de limpiar.
    const nuevos = new URLSearchParams(window.location.search);
    Object.entries(cambios).forEach(([clave, valor]) => {
      if (valor === '' || valor === null || valor === undefined) nuevos.delete(clave);
      else nuevos.set(clave, valor);
    });
    // Al cambiar un filtro se vuelve a la primera página
    if (!('page' in cambios)) nuevos.delete('page');
    setParametros(nuevos);
  }, [setParametros]);

  const limpiar = useCallback(() => setParametros(new URLSearchParams()), [setParametros]);

  // Parámetros listos para enviar a la API (sin vacíos)
  const paraApi = useMemo(() => Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== '' && valor !== null && valor !== undefined),
  ), [filtros]);

  return { filtros, paraApi, actualizar, limpiar };
}