import { Link } from 'react-router-dom';
import { clientesApi } from '../../api/servicios';
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

/**
 * GET /api/clientes/?activo=&buscar=&page=
 * Filtros combinables (estado + búsqueda por nombre o cédula) resueltos por el backend.
 */
export default function ClientesLista() {
  const { puedeGestionar } = useAuth();
  const { filtros, paraApi, actualizar, limpiar } = useFiltrosUrl({ activo: '', buscar: '' });
  const { datos, cargando, error, recargar } = useConsulta(() => clientesApi.listar(paraApi), [JSON.stringify(paraApi)]);
  const eliminacion = useEliminacion((c) => clientesApi.eliminar(c.id), { onExito: recargar, mensajeExito: 'Cliente eliminado.' });

  const hayFiltros = filtros.activo || filtros.buscar;
  const clientes = datos?.resultados ?? [];

  return (
    <>
      <EncabezadoPagina titulo="Clientes" icono="bi-people" migas={[{ texto: 'Clientes' }]}
        subtitulo="Clientes registrados en la tienda">
        <BotonPermiso permitido={puedeGestionar('clientes.add_cliente')} a="/clientes/nuevo">
          <i className="bi bi-plus-lg me-1" />Nuevo cliente
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="card">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <CampoBusqueda valor={filtros.buscar} onBuscar={(buscar) => actualizar({ buscar })}
                etiqueta="Buscar por nombre o cédula" placeholder="Ej.: María o 101110111" />
            </div>
            <div className="col-sm-6 col-md-3">
              <label className="form-label small text-secondary mb-1" htmlFor="filtro-activo">Estado</label>
              <select id="filtro-activo" className="form-select" value={filtros.activo} onChange={(e) => actualizar({ activo: e.target.value })}>
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

        {error && <div className="p-3"><AlertaError error={error} onReintentar={recargar} className="mb-0" /></div>}
        {cargando && <Cargando texto="Consultando clientes…" />}
        {!cargando && !error && clientes.length === 0 && (
          <EstadoVacio titulo={hayFiltros ? 'Ningún cliente coincide con los filtros' : 'Aún no hay clientes'}
            texto={hayFiltros ? 'Pruebe con otros criterios de búsqueda.' : 'Registre el primer cliente para empezar.'} />
        )}
        {!cargando && !error && clientes.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Cédula</th><th>Nombre</th><th className="d-none d-md-table-cell">Correo</th>
                  <th className="d-none d-lg-table-cell">Teléfono</th><th>Estado</th><th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td className="text-nowrap">{c.cedula}</td>
                    <td><Link to={`/clientes/${c.id}`} className="fw-semibold">{c.nombre}</Link></td>
                    <td className="d-none d-md-table-cell">{c.email}</td>
                    <td className="d-none d-lg-table-cell">{c.telefono || '—'}</td>
                    <td><Insignia valor={c.activo} /></td>
                    <td className="text-end text-nowrap">
                      <Link to={`/clientes/${c.id}`} className="btn btn-sm btn-outline-secondary me-1" title="Ver detalle"><i className="bi bi-eye" /></Link>
                      <BotonPermiso permitido={puedeGestionar('clientes.change_cliente')} a={`/clientes/${c.id}/editar`}
                        className="btn btn-sm btn-outline-primary me-1" title="Editar"><i className="bi bi-pencil" /></BotonPermiso>
                      <BotonPermiso permitido={puedeGestionar('clientes.delete_cliente')} onClick={() => eliminacion.pedir(c)}
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

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar cliente" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        <p className="mb-1">¿Desea eliminar a <strong>{eliminacion.objetivo?.nombre}</strong>?</p>
        <p className="small text-secondary mb-0">Si el cliente tiene facturas o inscripciones, el sistema lo impedirá (409). En ese caso puede marcarlo como inactivo.</p>
      </ConfirmarModal>
    </>
  );
}
