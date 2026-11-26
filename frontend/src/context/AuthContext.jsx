import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { almacenToken, registrarManejador401 } from '../api/cliente';
import { authApi } from '../api/servicios';

const AuthContext = createContext(null);

/**
 * Estado de autenticación compartido por toda la SPA.
 * - token: se guarda en localStorage para sobrevivir a recargas.
 * - usuario: se obtiene de /api/auth/me/ (perfil y permisos reales de Django).
 * Los permisos solo adaptan la interfaz; Django sigue autorizando cada solicitud.
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(Boolean(almacenToken.obtener()));
  // Motivo del último cierre de sesión ('logout' o 'expirada') para informarlo en el login
  const [motivoSalida, setMotivoSalida] = useState(null);

  const limpiarSesionLocal = useCallback(() => {
    almacenToken.limpiar();
    setUsuario(null);
  }, []);

  // Al cargar la app con un token guardado, validarlo contra el backend
  useEffect(() => {
    if (!almacenToken.obtener()) return;
    authApi.usuarioActual()
      .then(setUsuario)
      .catch(() => limpiarSesionLocal())
      .finally(() => setVerificando(false));
  }, [limpiarSesionLocal]);

  const iniciarSesion = useCallback(async (username, password) => {
    const { token } = await authApi.login(username, password);
    setMotivoSalida(null);
    almacenToken.guardar(token);
    try {
      const datos = await authApi.usuarioActual();
      setUsuario(datos);
      return datos;
    } catch (error) {
      almacenToken.limpiar();
      throw error;
    }
  }, []);

  const cerrarSesion = useCallback(async ({ revocar = true, motivo = 'logout' } = {}) => {
    if (revocar && almacenToken.obtener()) {
      try {
        await authApi.logout(); // elimina el token en el servidor
      } catch {
        // Si la API no responde igual se limpia la sesión local
      }
    }
    setMotivoSalida(motivo);
    limpiarSesionLocal();
    navigate('/login', { replace: true, state: { motivo } });
  }, [limpiarSesionLocal, navigate]);

  // Cualquier 401 de la API (token revocado o inválido) termina la sesión local
  useEffect(() => {
    registrarManejador401(() => cerrarSesion({ revocar: false, motivo: 'expirada' }));
    return () => registrarManejador401(null);
  }, [cerrarSesion]);

  const valor = useMemo(() => {
    const puede = (permiso) => Boolean(usuario && (usuario.is_superuser || usuario.permisos?.includes(permiso)));
    return {
      usuario,
      autenticado: Boolean(usuario),
      verificando,
      motivoSalida,
      iniciarSesion,
      cerrarSesion,
      puede,
      // Las operaciones de escritura del backend exigen is_staff + permiso del modelo
      puedeGestionar: (permiso) => Boolean(usuario?.is_staff && puede(permiso)),
      esPersonal: Boolean(usuario?.is_staff),
    };
  }, [usuario, verificando, motivoSalida, iniciarSesion, cerrarSesion]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
