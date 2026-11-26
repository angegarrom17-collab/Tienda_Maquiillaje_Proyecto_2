import { useCallback, useState } from 'react';

/**
 * Manejo de formularios controlados: valores, errores por campo y error general.
 * - cambiar: sirve para input, select, textarea y checkbox.
 * - aplicarErrorApi: copia los errores por campo que devuelve el serializer de DRF.
 */
export function useFormulario(valoresIniciales) {
  const [valores, setValores] = useState(valoresIniciales);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);

  const cambiar = useCallback((evento) => {
    const { name, value, type, checked } = evento.target;
    setValores((actuales) => ({ ...actuales, [name]: type === 'checkbox' ? checked : value }));
    setErrores((actuales) => {
      if (!actuales[name]) return actuales;
      const copia = { ...actuales };
      delete copia[name];
      return copia;
    });
  }, []);

  const aplicarErrorApi = useCallback((error) => {
    setErrores(error.campos || {});
    setErrorGeneral(error);
  }, []);

  const reiniciar = useCallback((nuevos = valoresIniciales) => {
    setValores(nuevos);
    setErrores({});
    setErrorGeneral(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { valores, setValores, errores, setErrores, errorGeneral, setErrorGeneral, cambiar, aplicarErrorApi, reiniciar };
}