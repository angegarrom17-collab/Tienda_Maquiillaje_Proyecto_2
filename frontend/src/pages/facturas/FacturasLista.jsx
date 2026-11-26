import { Link } from 'react-router-dom';
import { clientesApi, facturasApi, obtenerTodos } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
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
import { ESTADOS_FACTURA, textoDe } from '../../utils/catalogos';
import { formatoFechaHora, formatoMoneda } from '../../utils/formato';

/**
 * GET /api/facturas/?estado=&cliente=&page=
 * Solo personal (is_staff) con facturas.view_factura; en otro caso Django responde 403 y se muestra el aviso.
 */
export default function FacturasLista() {
  const { puedeGestionar } = useAuth();
  const { filtros, paraApi, actualizar, limpiar } = useFiltrosUrl({ estado: '', cliente: '' });
  const { datos, cargando, error, recargar } = useConsulta(() => facturasApi.listar(paraApi), [JSON.stringify(paraApi)]);
  const clientes = useConsulta(() => obtenerTodos(clientesApi), []);
  const eliminacion = useEliminacion((f) => facturasApi.eliminar(f.id), { onExito: recargar, mensajeExito: 'Factura eliminada.' });

  const hayFiltros = filtros.estado || filtros.cliente;
  const facturas = datos?.resultados ?? [];

  return (
    <>
      <EncabezadoPagina titulo="Facturas" icono="bi-receipt" migas={[{ texto: 'Facturas' }]} subtitulo="Ventas de productos y cursos">
        <BotonPermiso permitido={puedeGestionar('facturas.add_factura')} a="/facturas/nueva">
          <i className="bi bi-plus-lg me-1" />Nueva factura
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="card">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-lg-4">
              <label className="form-label small text-secondary mb-1" htmlFor="f-estado">Estado</label>
              <select id="f-estado" className="form-select" value={filtros.estado} onChange={(e) => actualizar({ estado: e.target.value })}>
                <option value="">Todos</option>
                {ESTADOS_FACTURA.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg-5">
              <label className="form-label small text-secondary mb-1" htmlFor="f-cliente">Cliente</label>
              <select id="f-cliente" className="form-select" value={filtros.cliente} onChange={(e) => actualizar({ cliente: e.target.value })}>
                <option value="">Todos los clientes</option>
                {(clientes.datos ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-lg-3">
              <button type="button" className="btn btn-outline-secondary w-100" onClick={limpiar} disabled={!hayFiltros}>
                <i className="bi bi-x-circle me-1" />Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {error && <div className="p-3"><AlertaError error={error} onReintentar={error.estado === 403 ? undefined : recargar} className="mb-0" /></div>}
        {cargando && <Cargando texto="Consultando facturas…" />}
        {!cargando && !error && facturas.length === 0 && (
          <EstadoVacio titulo={hayFiltros ? 'Ninguna factura coincide con los filtros' : 'Aún no hay facturas'} icono="bi-receipt" />
        )}
        {!cargando && !error && facturas.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Factura</th><th>Cliente</th><th className="d-none d-md-table-cell">Fecha</th><th className="text-center d-none d-sm-table-cell">Líneas</th><th>Estado</th><th className="text-end">Total</th><th className="text-end">Acciones</th></tr>
              </thead>
              <tbody>
                {facturas.map((f) => {
                  const eliminable = f.estado === 'PENDIENTE' && f.detalles.length === 0;
                  return (
                    <tr key={f.id}>
                      <td><Link to={`/facturas/${f.id}`} className="fw-semibold">#{f.id}</Link></td>
                      <td><Link to={`/clientes/${f.cliente}`}>{f.nombre_cliente}</Link></td>
                      <td className="d-none d-md-table-cell small">{formatoFechaHora(f.fecha)}</td>
                      <td className="text-center d-none d-sm-table-cell">{f.detalles.length}</td>
                      <td><Insignia valor={f.estado} texto={textoDe(ESTADOS_FACTURA, f.estado)} /></td>
                      <td className="text-end text-nowrap fw-semibold">{formatoMoneda(f.total)}</td>
                      <td className="text-end text-nowrap">
                        <Link to={`/facturas/${f.id}`} className="btn btn-sm btn-outline-secondary me-1" title="Ver y gestionar detalles"><i className="bi bi-eye" /></Link>
                        <BotonPermiso permitido={puedeGestionar('facturas.change_factura') && f.estado !== 'CANCELADA'}
                          motivo={f.estado === 'CANCELADA' ? 'Las facturas canceladas no se modifican' : undefined}
                          a={`/facturas/${f.id}/editar`} className="btn btn-sm btn-outline-primary me-1" title="Cambiar estado"><i className="bi bi-pencil" /></BotonPermiso>
                        <BotonPermiso permitido={puedeGestionar('facturas.delete_factura') && eliminable}
                          motivo={eliminable ? undefined : 'Solo se eliminan facturas pendientes sin detalles'}
                          onClick={() => eliminacion.pedir(f)} className="btn btn-sm btn-outline-danger" title="Eliminar"><i className="bi bi-trash" /></BotonPermiso>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!error && <Paginacion datos={datos} onCambiar={(page) => actualizar({ page })} />}
      </div>

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar factura" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        ¿Desea eliminar la factura <strong>#{eliminacion.objetivo?.id}</strong> de {eliminacion.objetivo?.nombre_cliente}?
      </ConfirmarModal>
    </>
  );
}
