import http from './cliente';

/**
 * Servicios REST por recurso. Todas las rutas son relativas a VITE_API_URL.
 * Cada función devuelve directamente el cuerpo JSON de la respuesta.
 */
function recurso(base) {
  return {
    listar: (params = {}) => http.get(base, { params }).then((r) => r.data),
    obtener: (id) => http.get(`${base}${id}/`).then((r) => r.data),
    crear: (datos) => http.post(base, datos).then((r) => r.data),
    actualizar: (id, datos) => http.put(`${base}${id}/`, datos).then((r) => r.data),
    modificar: (id, datos) => http.patch(`${base}${id}/`, datos).then((r) => r.data),
    eliminar: (id) => http.delete(`${base}${id}/`).then((r) => r.data),
  };
}

// ---------------- Autenticación ----------------
export const authApi = {
  // POST /api/token/ -> { token }
  login: (username, password) =>
    http.post('token/', { username, password }, { sinToken: true, omitir401: true }).then((r) => r.data),
  // GET /api/auth/me/ -> usuario, perfil y permisos
  usuarioActual: () => http.get('auth/me/').then((r) => r.data),
  // POST /api/auth/logout/ -> revoca el token en el servidor
  logout: () => http.post('auth/logout/', null, { omitir401: true }).then((r) => r.data),
};

// ---------------- Módulos de negocio ----------------
export const clientesApi = recurso('clientes/');

export const productosApi = {
  ...recurso('productos/'),
  estadisticas: () => http.get('productos/estadisticas/').then((r) => r.data),
};

export const categoriasApi = recurso('productos/categorias/');

export const cursosApi = {
  ...recurso('cursos/'),
  estadisticas: () => http.get('cursos/estadisticas/').then((r) => r.data),
  inscripciones: (id) => http.get(`cursos/${id}/inscripciones/`).then((r) => r.data),
  inscribir: (id, datos) => http.post(`cursos/${id}/inscripciones/`, datos).then((r) => r.data),
};

export const inscripcionesApi = recurso('cursos/inscripciones/');

export const proveedoresApi = recurso('proveedores/');

export const entradasApi = {
  listar: (params = {}) => http.get('proveedores/entradas/', { params }).then((r) => r.data),
  obtener: (id) => http.get(`proveedores/entradas/${id}/`).then((r) => r.data),
  crear: (datos) => http.post('proveedores/entradas/', datos).then((r) => r.data),
};

export const facturasApi = {
  ...recurso('facturas/'),
  estadisticas: () => http.get('facturas/estadisticas/').then((r) => r.data),
  detalles: (id) => http.get(`facturas/${id}/detalles/`).then((r) => r.data),
  agregarDetalle: (id, datos) => http.post(`facturas/${id}/detalles/`, datos).then((r) => r.data),
  eliminarDetalle: (idDetalle) => http.delete(`facturas/detalles/${idDetalle}/`).then((r) => r.data),
};

/**
 * Recorre todas las páginas de un listado paginado del backend (5 registros por página)
 * para llenar selectores de entidades relacionadas con datos reales de la API.
 */
export async function obtenerTodos(api, params = {}) {
  const primera = await api.listar({ ...params, page: 1 });
  const totalPaginas = primera.total_paginas || 1;
  const restantes = await Promise.all(
    Array.from({ length: totalPaginas - 1 }, (_, i) => api.listar({ ...params, page: i + 2 })),
  );
  return [primera, ...restantes].flatMap((pagina) => pagina.resultados || []);
}