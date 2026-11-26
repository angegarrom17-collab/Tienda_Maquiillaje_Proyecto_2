import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NotificacionesContext = createContext(null);

const ICONOS = {
  success: 'bi-check-circle-fill',
  danger: 'bi-x-octagon-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

/** Avisos tipo "toast" de Bootstrap para éxito, error y advertencias. */
export function NotificacionesProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const cerrar = useCallback((id) => {
    setAvisos((actuales) => actuales.filter((a) => a.id !== id));
  }, []);

  const notificar = useCallback((tipo, texto) => {
    const id = `${Date.now()}-${Math.random()}`;
    setAvisos((actuales) => [...actuales, { id, tipo, texto }]);
    setTimeout(() => cerrar(id), 4500);
  }, [cerrar]);

  const valor = useMemo(() => ({
    exito: (texto) => notificar('success', texto),
    error: (texto) => notificar('danger', texto),
    aviso: (texto) => notificar('warning', texto),
    info: (texto) => notificar('info', texto),
  }), [notificar]);

  return (
    <NotificacionesContext.Provider value={valor}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }} aria-live="polite">
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`toast show align-items-center text-bg-${aviso.tipo} border-0`} role="alert">
            <div className="d-flex">
              <div className="toast-body">
                <i className={`bi ${ICONOS[aviso.tipo]} me-2`} />
                {aviso.texto}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Cerrar" onClick={() => cerrar(aviso.id)} />
            </div>
          </div>
        ))}
      </div>
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const contexto = useContext(NotificacionesContext);
  if (!contexto) throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  return contexto;
}
