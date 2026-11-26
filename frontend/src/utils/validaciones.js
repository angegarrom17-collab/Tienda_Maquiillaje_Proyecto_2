import { sumarDiasIso } from './formato';

/**
 * Validaciones previas en el navegador. Repiten las reglas del backend para dar
 * retroalimentación inmediata, pero NO las reemplazan: Django vuelve a validar
 * y sus mensajes (400) se muestran en el mismo formulario.
 */

const vacio = (valor) => valor === null || valor === undefined || String(valor).trim() === '';
const correoValido = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim());

export function validarCliente(v) {
  const e = {};
  if (vacio(v.cedula)) e.cedula = 'La cédula es obligatoria.';
  else if (v.cedula.trim().length < 5) e.cedula = 'La cédula debe tener al menos 5 caracteres.';
  if (vacio(v.nombre)) e.nombre = 'El nombre es obligatorio.';
  if (vacio(v.email)) e.email = 'El correo es obligatorio.';
  else if (!correoValido(v.email)) e.email = 'Ingrese un correo válido.';
  return e;
}

export function validarCategoria(v) {
  const e = {};
  if (vacio(v.nombre) || v.nombre.trim().length < 2) e.nombre = 'El nombre debe tener al menos 2 caracteres.';
  return e;
}

export function validarProducto(v) {
  const e = {};
  if (vacio(v.nombre) || v.nombre.trim().length < 2) e.nombre = 'El nombre debe tener al menos 2 caracteres.';
  if (vacio(v.categoria)) e.categoria = 'Seleccione una categoría.';
  if (vacio(v.precio)) e.precio = 'El precio es obligatorio.';
  else if (Number(v.precio) <= 0) e.precio = 'El precio debe ser mayor que cero.';
  if (vacio(v.stock)) e.stock = 'Indique el stock.';
  else if (Number(v.stock) < 0 || !Number.isInteger(Number(v.stock))) e.stock = 'El stock debe ser un entero no negativo.';
  if (!vacio(v.stock_minimo) && (Number(v.stock_minimo) < 0 || !Number.isInteger(Number(v.stock_minimo)))) {
    e.stock_minimo = 'Debe ser un entero no negativo.';
  }
  if (vacio(v.fecha_vencimiento)) e.fecha_vencimiento = 'La fecha de vencimiento es obligatoria.';
  else {
    const minima = sumarDiasIso(Number(v.vigencia_meses || 12) * 30);
    if (v.fecha_vencimiento < minima) {
      e.fecha_vencimiento = `Debe tener al menos ${v.vigencia_meses} meses de vigencia (desde ${minima}).`;
    }
  }
  return e;
}

export function validarCurso(v) {
  const e = {};
  if (vacio(v.nombre)) e.nombre = 'El nombre es obligatorio.';
  if (vacio(v.descripcion)) e.descripcion = 'La descripción es obligatoria.';
  if (vacio(v.fecha)) e.fecha = 'La fecha es obligatoria.';
  if (vacio(v.hora)) e.hora = 'La hora es obligatoria.';
  if (vacio(v.duracion_horas) || Number(v.duracion_horas) <= 0) e.duracion_horas = 'La duración debe ser mayor que cero.';
  if (vacio(v.precio) || Number(v.precio) <= 0) e.precio = 'El precio debe ser mayor que cero.';
  if (vacio(v.cupo_maximo) || Number(v.cupo_maximo) <= 0) e.cupo_maximo = 'El cupo debe ser mayor que cero.';
  if (vacio(v.modalidad)) e.modalidad = 'Seleccione la modalidad.';
  return e;
}

export function validarProveedor(v) {
  const e = {};
  if (vacio(v.nombre) || v.nombre.trim().length < 3) e.nombre = 'El nombre debe tener al menos 3 caracteres.';
  if (!/^\d{8}$/.test(String(v.telefono || ''))) e.telefono = 'El teléfono debe tener exactamente 8 números.';
  if (vacio(v.correo)) e.correo = 'El correo es obligatorio.';
  else if (!correoValido(v.correo)) e.correo = 'Ingrese un correo válido.';
  if (vacio(v.direccion) || v.direccion.trim().length < 10) e.direccion = 'La dirección debe tener al menos 10 caracteres.';
  return e;
}

export function validarEntrada(v) {
  const e = {};
  if (vacio(v.proveedor)) e.proveedor = 'Seleccione el proveedor.';
  if (vacio(v.producto)) e.producto = 'Seleccione el producto.';
  if (vacio(v.cantidad) || Number(v.cantidad) <= 0) e.cantidad = 'La cantidad debe ser mayor que cero.';
  return e;
}

export function validarDetalleFactura(v, productoElegido) {
  const e = {};
  if (v.tipo === 'producto') {
    if (vacio(v.producto)) e.producto = 'Seleccione un producto.';
    if (vacio(v.cantidad) || Number(v.cantidad) <= 0) e.cantidad = 'La cantidad debe ser mayor que cero.';
    else if (productoElegido && Number(v.cantidad) > productoElegido.stock) {
      e.cantidad = `Solo hay ${productoElegido.stock} unidades en stock.`;
    }
  } else if (vacio(v.curso)) {
    e.curso = 'Seleccione un curso.';
  }
  return e;
}

export const sinErrores = (errores) => Object.keys(errores).length === 0;
