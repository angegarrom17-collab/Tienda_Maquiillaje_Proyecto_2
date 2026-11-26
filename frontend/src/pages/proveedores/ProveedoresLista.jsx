import { Link } from 'react-router-dom';
import { proveedoresApi } from '../../api/servicios';
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

/** GET /api/proveedores/?nombre=&activo=&page= — vista en tarjetas (directorio de contactos). */
export default function ProveedoresLista() {
  const { puedeGestionar, esPersonal } = useAuth();
  const { filtros, paraApi, actualizar, limpiar } = useFiltrosUrl({ nombre: '', activo: '' });
  const { datos, cargando, error, recargar } = useConsulta(() => proveedoresApi.listar(paraApi), [JSON.stringify(paraApi)]);
  const eliminacion = useEliminacion((p) => proveedoresApi.eliminar(p.id), { onExito: recargar, mensajeExito: 'Proveedor eliminado.' });

  const hayFiltros = filtros.nombre || filtros.activo;
  const proveedores = datos?.resultados ?? [];

  return (
    <>
      <EncabezadoPagina titulo="Proveedores" icono="bi-truck" migas={[{ texto: 'Proveedores' }]} subtitulo="Empresas que abastecen el inventario">
        {esPersonal && <Link to="/proveedores/entradas" className="btn btn-outline-secondary"><i className="bi bi-box-arrow-in-down me-1" />Entradas</Link>}
        <BotonPermiso permitido={puedeGestionar('proveedores.add_proveedor')} a="/proveedores/nuevo">
          <i className="bi bi-plus-lg me-1" />Nuevo proveedor
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <CampoBusqueda valor={filtros.nombre} onBuscar={(nombre) => actualizar({ nombre })} etiqueta="Buscar por nombre" />
            </div>
            <div className="col-sm-6 col-md-3">
              <label className="form-label small text-secondary mb-1" htmlFor="f-activo">Estado</label>
              <select id="f-activo" className="form-select" value={filtros.activo} onChange={(e) => actualizar({ activo: e.target.value })}>
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
            <div className="col-sm-6 col-md-3">
              <button type="button" className="btn btn-outline-secondary w-100" onClick={limpiar} disabled={!hayFiltros}>
                <i className="bi bi-x-circle me-1" />Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertaError error={error} onReintentar={recargar} />
      {cargando && <Cargando texto="Consultando proveedores…" />}
      {!cargando && !error && proveedores.length === 0 && (
        <div className="card"><EstadoVacio titulo={hayFiltros ? 'Ningún proveedor coincide con los filtros' : 'Aún no hay proveedores'} icono="bi-truck" /></div>
      )}
      {!cargando && !error && proveedores.length > 0 && (
        <div className="row g-3">
          {proveedores.map((p) => (
            <div key={p.id} className="col-md-6 col-xl-4">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <h2 className="h6 mb-0"><Link to={`/proveedores/${p.id}`}>{p.nombre}</Link></h2>
                    <Insignia valor={p.activo} />
                  </div>
                  <div className="small text-secondary d-grid gap-1">
                    <span><i className="bi bi-telephone me-2" />{p.telefono}</span>
                    <span className="text-truncate"><i className="bi bi-envelope me-2" />{p.correo}</span>
                    <span><i className="bi bi-geo-alt me-2" />{p.direccion}</span>
                  </div>
                </div>
                <div className="card-footer bg-white d-flex justify-content-end gap-1">
                  <Link to={`/proveedores/${p.id}`} className="btn btn-sm btn-outline-secondary" title="Ver detalle"><i className="bi bi-eye" /></Link>
                  <BotonPermiso permitido={puedeGestionar('proveedores.change_proveedor')} a={`/proveedores/${p.id}/editar`}
                    className="btn btn-sm btn-outline-primary" title="Editar"><i className="bi bi-pencil" /></BotonPermiso>
                  <BotonPermiso permitido={puedeGestionar('proveedores.delete_proveedor')} onClick={() => eliminacion.pedir(p)}
                    className="btn btn-sm btn-outline-danger" title="Eliminar"><i className="bi bi-trash" /></BotonPermiso>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!error && <div className="card mt-3"><Paginacion datos={datos} onCambiar={(page) => actualizar({ page })} /></div>}

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar proveedor" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        <p className="mb-1">¿Desea eliminar <strong>{eliminacion.objetivo?.nombre}</strong>?</p>
        <p className="small text-secondary mb-0">No se permite si tiene productos o entradas asociadas (409). Puede marcarlo como inactivo.</p>
      </ConfirmarModal>
    </>
  );
}