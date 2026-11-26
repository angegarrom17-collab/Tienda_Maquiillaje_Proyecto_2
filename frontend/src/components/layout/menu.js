// Opciones del menú lateral. "requierePersonal" marca módulos que el backend restringe a is_staff.
export const MENU = [
  { a: '/', texto: 'Inicio', icono: 'bi-speedometer2', exacto: true },
  { titulo: 'Módulos' },
  { a: '/clientes', texto: 'Clientes', icono: 'bi-people' },
  { a: '/productos', texto: 'Productos', icono: 'bi-bag-heart', exacto: true },
  { a: '/productos/categorias', texto: 'Categorías', icono: 'bi-tags', sub: true },
  { a: '/cursos', texto: 'Cursos', icono: 'bi-mortarboard' },
  { a: '/proveedores', texto: 'Proveedores', icono: 'bi-truck', exacto: true },
  { a: '/proveedores/entradas', texto: 'Entradas de inventario', icono: 'bi-box-arrow-in-down', sub: true, requierePersonal: true },
  { a: '/facturas', texto: 'Facturas', icono: 'bi-receipt', requierePersonal: true },
  
];