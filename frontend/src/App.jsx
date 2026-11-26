import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import RequierePermiso from './components/RequierePermiso';
import RutaProtegida from './components/RutaProtegida';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NoEncontrado from './pages/NoEncontrado';
import ClienteDetalle from './pages/clientes/ClienteDetalle';
import ClienteFormulario from './pages/clientes/ClienteFormulario';
import ClientesLista from './pages/clientes/ClientesLista';
import CursoDetalle from './pages/cursos/CursoDetalle';
import CursoFormulario from './pages/cursos/CursoFormulario';
import CursosLista from './pages/cursos/CursosLista';
import FacturaDetalle from './pages/facturas/FacturaDetalle';
import FacturaFormulario from './pages/facturas/FacturaFormulario';
import FacturasLista from './pages/facturas/FacturasLista';
import CategoriasPagina from './pages/productos/CategoriasPagina';
import ProductoDetalle from './pages/productos/ProductoDetalle';
import ProductoFormulario from './pages/productos/ProductoFormulario';
import ProductosLista from './pages/productos/ProductosLista';
import EntradasPagina from './pages/proveedores/EntradasPagina';
import ProveedorDetalle from './pages/proveedores/ProveedorDetalle';
import ProveedorFormulario from './pages/proveedores/ProveedorFormulario';
import ProveedoresLista from './pages/proveedores/ProveedoresLista';
/** Protege una pantalla: solo se muestra si el usuario tiene el permiso de Django indicado. */
const conPermiso = (permiso, elemento) => <RequierePermiso permiso={permiso}>{elemento}</RequierePermiso>;

/**
 * Mapa de rutas de la SPA.
 * /login es pública; todo lo demás pasa por RutaProtegida (requiere token válido)
 * y se dibuja dentro del Layout (menú lateral + barra superior).
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          {/* Clientes: lista, crear, detalle y editar */}
          <Route path="clientes">
            <Route index element={<ClientesLista />} />
            <Route path="nuevo" element={conPermiso('clientes.add_cliente', <ClienteFormulario />)} />
            <Route path=":id" element={<ClienteDetalle />} />
            <Route path=":id/editar" element={conPermiso('clientes.change_cliente', <ClienteFormulario />)} />
          </Route>
          {/* Productos: lista, categorías, crear, detalle y editar */}
          <Route path="productos">
            <Route index element={<ProductosLista />} />
            <Route path="categorias" element={<CategoriasPagina />} />
            <Route path="nuevo" element={conPermiso('productos.add_producto', <ProductoFormulario />)} />
            <Route path=":id" element={<ProductoDetalle />} />
            <Route path=":id/editar" element={conPermiso('productos.change_producto', <ProductoFormulario />)} />
          </Route>
          {/* Cursos: lista, crear, detalle (con inscripciones) y editar */}
          <Route path="cursos">
            <Route index element={<CursosLista />} />
            <Route path="nuevo" element={conPermiso('cursos.add_curso', <CursoFormulario />)} />
            <Route path=":id" element={<CursoDetalle />} />
            <Route path=":id/editar" element={conPermiso('cursos.change_curso', <CursoFormulario />)} />
          </Route>
           {/* Proveedores: lista, entradas de inventario, crear, detalle y editar */}
          <Route path="proveedores">
            <Route index element={<ProveedoresLista />} />
            <Route path="entradas" element={<EntradasPagina />} />
            <Route path="nuevo" element={conPermiso('proveedores.add_proveedor', <ProveedorFormulario />)} />
            <Route path=":id" element={<ProveedorDetalle />} />
            <Route path=":id/editar" element={conPermiso('proveedores.change_proveedor', <ProveedorFormulario />)} />
          </Route>
           {/* Facturas: lista, nueva (cliente + líneas), detalle y cambiar estado */}
          <Route path="facturas">
            <Route index element={<FacturasLista />} />
            <Route path="nueva" element={conPermiso('facturas.add_factura', <FacturaFormulario />)} />
            <Route path=":id" element={<FacturaDetalle />} />
            <Route path=":id/editar" element={conPermiso('facturas.change_factura', <FacturaFormulario />)} />
          </Route>

          
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  );
}