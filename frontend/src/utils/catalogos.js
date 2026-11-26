// Valores de las "choices" definidas en los modelos Django del Proyecto 1

export const MODALIDADES_CURSO = [
  { valor: 'PRESENCIAL', texto: 'Presencial' },
  { valor: 'VIRTUAL', texto: 'Virtual' },
];

export const ESTADOS_CURSO = [
  { valor: 'PROGRAMADO', texto: 'Programado' },
  { valor: 'CANCELADO', texto: 'Cancelado' },
  { valor: 'FINALIZADO', texto: 'Finalizado' },
];

export const ESTADOS_INSCRIPCION = [
  { valor: 'inscrita', texto: 'Inscrita' },
  { valor: 'cancelada', texto: 'Cancelada' },
];

export const ESTADOS_FACTURA = [
  { valor: 'PENDIENTE', texto: 'Pendiente' },
  { valor: 'PAGADA', texto: 'Pagada' },
  { valor: 'CANCELADA', texto: 'Cancelada' },
];

export const VIGENCIAS_PRODUCTO = [
  { valor: 12, texto: '12 meses (1 año)' },
  { valor: 24, texto: '24 meses (2 años)' },
  { valor: 36, texto: '36 meses (3 años)' },
];

// Colores de Bootstrap para las insignias de estado
export const COLOR_ESTADO = {
  PROGRAMADO: 'primary',
  CANCELADO: 'secondary',
  FINALIZADO: 'dark',
  PENDIENTE: 'light',
  PAGADA: 'light',
  CANCELADA: 'secondary',
  inscrita: 'success',
  cancelada: 'secondary',
  PRESENCIAL: 'light',
  VIRTUAL: 'light',
};

export const textoDe = (lista, valor) => lista.find((item) => String(item.valor) === String(valor))?.texto ?? valor;
