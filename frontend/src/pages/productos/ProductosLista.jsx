import { Link } from 'react-router-dom';
import { categoriasApi, obtenerTodos, productosApi, proveedoresApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
import CampoBusqueda from '../../components/comunes/CampoBusqueda';
import Cargando from '../../components/comunes/Cargando';
import ConfirmarModal from '../../components/comunes/ConfirmarModal';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import Insignia from '../../components/comunes/Insignia';
import Paginacion from '../../components/comunes/Paginacion';
import { useAuth } from '../../context/AuthContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useEliminacion } from '../../hooks/useEliminacion';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { formatoMoneda } from '../../utils/formato';


/**
 * GET /api/productos/?search=&categoria=&proveedor=&activo=&stock_bajo=1&ordering=&page=
 * Búsqueda, filtros combinables, ordenamiento y paginación se resuelven en Django.
 */
export default function ProductosLista() {
  const { puedeGestionar } = useAuth();
  const { filtros, paraApi, actualizar, limpiar } = useFiltrosUrl({
    search: '', categoria: '', proveedor: '', activo: '', stock_bajo: '', ordering: '',
  });
  const { datos, cargando, error, recargar } = useConsulta(() => productosApi.listar(paraApi), [JSON.stringify(paraApi)]);
  const { datos: opciones } = useConsulta(async () => {
    const [categorias, proveedores] = await Promise.all([categoriasApi.listar(), obtenerTodos(proveedoresApi)]);
    return { categorias, proveedores };
  }, []);
  const eliminacion = useEliminacion((p) => productosApi.eliminar(p.id), { onExito: recargar, mensajeExito: 'Producto eliminado.' });
  const ORDENES = [
  { valor: '', texto: 'Registro (más antiguos)' },
  { valor: 'nombre', texto: 'Nombre A → Z' },
  { valor: '-nombre', texto: 'Nombre Z → A' },
  { valor: 'precio', texto: 'Precio menor a mayor' },
  { valor: '-precio', texto: 'Precio mayor a menor' },
  { valor: 'stock', texto: 'Stock menor a mayor' },
  { valor: '-stock', texto: 'Stock mayor a menor' },
  { valor: 'fecha_vencimiento', texto: 'Vence primero' },
  ];
  const hayFiltros = ['search', 'categoria', 'proveedor', 'activo', 'stock_bajo', 'ordering'].some((k) => filtros[k]);
  const productos = datos?.resultados ?? [];

  return (
    <>
      <EncabezadoPagina titulo="Productos" icono="bi-bag-heart" migas={[{ texto: 'Productos' }]} subtitulo="Inventario de maquillaje y cuidado personal">
        <Link to="/productos/categorias" className="btn btn-outline-secondary"><i className="bi bi-tags me-1" />Categorías</Link>
        <BotonPermiso permitido={puedeGestionar('productos.add_producto')} a="/productos/nuevo">
          <i className="bi bi-plus-lg me-1" />Nuevo producto
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="card">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-end">
            <div className="col-lg-4">
              <CampoBusqueda valor={filtros.search} onBuscar={(search) => actualizar({ search })} etiqueta="Buscar por nombre" placeholder="Ej.: labial" />
            </div>
            <div className="col-sm-6 col-lg-2">
              <label className="form-label small text-secondary mb-1" htmlFor="f-categoria">Categoría</label>
              <select id="f-categoria" className="form-select" value={filtros.categoria} onChange={(e) => actualizar({ categoria: e.target.value })}>
                <option value="">Todas</option>
                {opciones?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg-2">
              <label className="form-label small text-secondary mb-1" htmlFor="f-proveedor">Proveedor</label>
              <select id="f-proveedor" className="form-select" value={filtros.proveedor} onChange={(e) => actualizar({ proveedor: e.target.value })}>
                <option value="">Todos</option>
                {opciones?.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg-2">
              <label className="form-label small text-secondary mb-1" htmlFor="f-activo">Estado</label>
              <select id="f-activo" className="form-select" value={filtros.activo} onChange={(e) => actualizar({ activo: e.target.value })}>
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
            <div className="col-sm-6 col-lg-2">
              <label className="form-label small text-secondary mb-1" htmlFor="f-orden">Ordenar por</label>
              <select id="f-orden" className="form-select" value={filtros.ordering} onChange={(e) => actualizar({ ordering: e.target.value })}>
                {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </div>
            <div className="col-12 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="form-check form-switch mb-0">
                <input id="f-stock" type="checkbox" className="form-check-input" checked={filtros.stock_bajo === '1'}
                  onChange={(e) => actualizar({ stock_bajo: e.target.checked ? '1' : '' })} />
                <label className="form-check-label" htmlFor="f-stock">Solo productos con stock bajo </label>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={limpiar} disabled={!hayFiltros}>
                <i className="bi bi-x-circle me-1" />Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {error && <div className="p-3"><AlertaError error={error} onReintentar={recargar} className="mb-0" /></div>}
        {cargando && <Cargando texto="Consultando productos…" />}
        {!cargando && !error && productos.length === 0 && (
          <EstadoVacio titulo={hayFiltros ? 'Ningún producto coincide con los filtros' : 'Aún no hay productos'} icono="bi-bag" />
        )}
        {!cargando && !error && productos.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Producto</th><th className="d-none d-md-table-cell">Categoría</th><th className="d-none d-xl-table-cell">Proveedor</th>
                  <th className="text-end">Precio</th><th className="text-center">Stock</th><th>Estado</th><th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) =>(
                    <tr key={p.id}>
                      <td><Link to={`/productos/${p.id}`} className="fw-semibold">{p.nombre}</Link></td>
                      <td className="d-none d-md-table-cell">{p.categoria_detalle?.nombre}</td>
                      <td className="d-none d-xl-table-cell">{p.nombre_proveedor || <span className="text-secondary">Sin proveedor</span>}</td>
                      <td className="text-end text-nowrap">{formatoMoneda(p.precio)}</td>
                      <td className="text-center">{p.stock}</td>
                      <td><Insignia valor={p.activo} /></td>
                      <td className="text-end text-nowrap">
                        <Link to={`/productos/${p.id}`} className="btn btn-sm btn-outline-secondary me-1" title="Ver detalle"><i className="bi bi-eye" /></Link>
                        <BotonPermiso permitido={puedeGestionar('productos.change_producto')} a={`/productos/${p.id}/editar`}
                          className="btn btn-sm btn-outline-primary me-1" title="Editar"><i className="bi bi-pencil" /></BotonPermiso>
                        <BotonPermiso permitido={puedeGestionar('productos.delete_producto')} onClick={() => eliminacion.pedir(p)}
                          className="btn btn-sm btn-outline-danger" title="Eliminar"><i className="bi bi-trash" /></BotonPermiso>
                      </td>
                    </tr>
                  
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!error && <Paginacion datos={datos} onCambiar={(page) => actualizar({ page })} />}
      </div>

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar producto" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        <p className="mb-1">¿Desea eliminar <strong>{eliminacion.objetivo?.nombre}</strong>?</p>
        <p className="small text-secondary mb-0">No se permite si el producto tiene facturas o entradas de inventario (409).</p>
      </ConfirmarModal>
    </>
  );
}

