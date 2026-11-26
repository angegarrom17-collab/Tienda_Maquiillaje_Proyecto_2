import axios from 'axios';

/**
 * Cliente HTTP único de la aplicación.
 * - La URL base sale de VITE_API_URL (.env); ningún componente escribe URLs absolutas.
 * - Adjunta automáticamente el encabezado "Authorization: Token <token>".
 * - Ante un 401 avisa al AuthContext para cerrar la sesión local y volver al login.
 */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

const CLAVE_TOKEN = 'tienda_maquillaje_token';

export const almacenToken = {
  obtener: () => localStorage.getItem(CLAVE_TOKEN),
  guardar: (token) => localStorage.setItem(CLAVE_TOKEN, token),
  limpiar: () => localStorage.removeItem(CLAVE_TOKEN),
};

const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Antes de cada solicitud: adjuntar el token (salvo que la llamada pida explícitamente no enviarlo)
http.interceptors.request.use((config) => {
  const token = almacenToken.obtener();
  if (token && !config.sinToken) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Manejador global de 401 que registra el AuthContext
let manejador401 = null;
export function registrarManejador401(funcion) {
  manejador401 = funcion;
}

http.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const estado = error.response?.status;
    if (estado === 401 && !error.config?.omitir401 && manejador401) {
      manejador401();
    }
    return Promise.reject(error);
  },
);

export default http;