import { API_URL } from './cliente';

const CLAVES_GENERALES = ['detail', 'error', 'non_field_errors'];

function aTexto(valor) {
  if (valor == null) return '';
  if (Array.isArray(valor)) return valor.map(aTexto).filter(Boolean).join(' ');
  if (typeof valor === 'object') return Object.values(valor).map(aTexto).join(' ');
  return String(valor);
}

/**
 * Convierte cualquier error de Axios en un objeto uniforme para la interfaz:
 * { estado, titulo, mensaje, campos }
 * - campos: errores por campo devueltos por los serializers de DRF (400).
 * - mensaje: texto comprensible según el código HTTP y lo que respondió Django.
 */
export function interpretarError(error) {
  // Fallo de red: el servidor no respondió
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED') {
      return {
        estado: 0,
        titulo: 'Tiempo de espera agotado',
        mensaje: 'La API tardó demasiado en responder. Intente de nuevo.',
        campos: {},
      };
    }
    return {
      estado: 0,
      titulo: 'Sin conexión con la API',
      mensaje: `No se pudo conectar con ${API_URL}. Verifique que el servidor Django esté encendido y que CORS permita este origen.`,
      campos: {},
    };
  }

  const { status, data } = error.response;
  const cuerpo = data && typeof data === 'object' ? data : {};

  const campos = {};
  Object.entries(cuerpo).forEach(([clave, valor]) => {
    if (!CLAVES_GENERALES.includes(clave)) campos[clave] = aTexto(valor);
  });
  const general = CLAVES_GENERALES.map((clave) => aTexto(cuerpo[clave])).filter(Boolean).join(' ');

  switch (status) {
    case 400:
      return {
        estado: 400,
        titulo: 'Datos no válidos',
        mensaje: general || (Object.keys(campos).length
          ? 'El servidor rechazó algunos campos. Revise los mensajes marcados en el formulario.'
          : 'La solicitud no es válida.'),
        campos,
      };
    case 401:
      return {
        estado: 401,
        titulo: 'Sesión no válida (401)',
        mensaje: general || 'Debe iniciar sesión para realizar esta operación.',
        campos: {},
      };
    case 403:
      return {
        estado: 403,
        titulo: 'Acceso denegado (403)',
        mensaje: general || 'Su perfil no tiene permisos para esta operación.',
        campos: {},
      };
    case 404:
      return {
        estado: 404,
        titulo: 'No encontrado (404)',
        mensaje: general || 'El registro solicitado no existe o fue eliminado.',
        campos: {},
      };
    case 409:
      return {
        estado: 409,
        titulo: 'Conflicto (409)',
        mensaje: general || 'La operación entra en conflicto con datos relacionados.',
        campos: {},
      };
    default:
      return {
        estado: status,
        titulo: status >= 500 ? `Error del servidor (${status})` : `Error HTTP ${status}`,
        mensaje: general || 'Ocurrió un error inesperado. Intente de nuevo más tarde.',
        campos,
      };
  }
}
