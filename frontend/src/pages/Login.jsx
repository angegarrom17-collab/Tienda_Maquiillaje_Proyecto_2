import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { interpretarError } from '../api/errores';
import { useAuth } from '../context/AuthContext';

const MENSAJES_MOTIVO = {
  logout: { tipo: 'success', texto: 'Sesión cerrada. El token fue revocado en el servidor.' },
  expirada: { tipo: 'warning', texto: 'Su sesión no es válida o expiró (401). Inicie sesión de nuevo.' },
};

/** Pantalla de acceso: obtiene un token real desde POST /api/token/. */
export default function Login() {
  const { iniciarSesion, autenticado, motivoSalida } = useAuth();
  const ubicacion = useLocation();
  const [credenciales, setCredenciales] = useState({ username: '', password: '' });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [verClave, setVerClave] = useState(false);

  // Tras iniciar sesión se vuelve a la ruta privada que se había solicitado
  if (autenticado) return <Navigate to={ubicacion.state?.desde || '/'} replace />;

  const motivo = MENSAJES_MOTIVO[ubicacion.state?.motivo ?? motivoSalida];

  const cambiar = (e) => {
    setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
    setErrores({ ...errores, [e.target.name]: undefined });
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    if (!credenciales.username.trim()) nuevos.username = 'Ingrese su usuario.';
    if (!credenciales.password) nuevos.password = 'Ingrese su contraseña.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(credenciales.username.trim(), credenciales.password);
    } catch (err) {
      const info = interpretarError(err);
      if (info.estado === 400) info.mensaje = 'Usuario o contraseña incorrectos.';
      setError(info);
      setCredenciales((actual) => ({ ...actual, password: '' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-fondo min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div className="card shadow-lg border-0 login-tarjeta">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <img src="/favicon.svg" alt="" width="56" height="56" className="mb-3" />
            <h1 className="h4 mb-1">Tienda de Maquillaje</h1>
            <p className="text-secondary mb-0">Ingrese con su cuenta del sistema</p>
          </div>

          {motivo && !error && <div className={`alert alert-${motivo.tipo} small`}>{motivo.texto}</div>}
          {error && (
            <div className="alert alert-danger small" role="alert">
              <strong>{error.titulo}.</strong> {error.mensaje}
            </div>
          )}

          <form onSubmit={enviar} noValidate>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Usuario</label>
              <div className="input-group has-validation">
                <span className="input-group-text"><i className="bi bi-person" /></span>
                <input id="username" name="username" autoComplete="username" autoFocus
                  className={`form-control ${errores.username ? 'is-invalid' : ''}`}
                  value={credenciales.username} onChange={cambiar} />
                {errores.username && <div className="invalid-feedback">{errores.username}</div>}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <div className="input-group has-validation">
                <span className="input-group-text"><i className="bi bi-key" /></span>
                <input id="password" name="password" type={verClave ? 'text' : 'password'} autoComplete="current-password"
                  className={`form-control ${errores.password ? 'is-invalid' : ''}`}
                  value={credenciales.password} onChange={cambiar} />
                <button type="button" className="btn btn-outline-secondary" onClick={() => setVerClave(!verClave)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <i className={`bi ${verClave ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
                {errores.password && <div className="invalid-feedback">{errores.password}</div>}
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2" disabled={enviando}>
              {enviando ? <><span className="spinner-border spinner-border-sm me-2" />Validando…</> : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}