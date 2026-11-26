import { useState } from 'react';
import { interpretarError } from '../api/errores';
import { useNotificaciones } from '../context/NotificacionesContext';

/**
 * Flujo de eliminación con confirmación:
 * pedir(registro) abre el modal → confirmar() llama a la API →
 * muestra éxito o el error del backend (403, 404, 409...) y ejecuta onExito.
 */
export function useEliminacion(eliminar, { onExito, mensajeExito = 'Registro eliminado correctamente.' } = {}) {
  const notificar = useNotificaciones();
  const [objetivo, setObjetivo] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const confirmar = async () => {
    setProcesando(true);
    try {
      await eliminar(objetivo);
      notificar.exito(mensajeExito);
      const eliminado = objetivo;
      setObjetivo(null);
      onExito?.(eliminado);
    } catch (error) {
      const info = interpretarError(error);
      notificar.error(`${info.titulo}: ${info.mensaje}`);
      setObjetivo(null);
    } finally {
      setProcesando(false);
    }
  };

  return {
    objetivo,
    procesando,
    pedir: setObjetivo,
    cancelar: () => setObjetivo(null),
    confirmar,
  };
}
