import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clientesApi, facturasApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
import Cargando from '../../components/comunes/Cargando';
import ConfirmarModal from '../../components/comunes/ConfirmarModal';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import FilaDato from '../../components/comunes/FilaDato';
import Insignia from '../../components/comunes/Insignia';
import Paginacion from '../../components/comunes/Paginacion';
import { useAuth } from '../../context/AuthContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useEliminacion } from '../../hooks/useEliminacion';
import { formatoFechaHora, formatoMoneda } from '../../utils/formato';

/** Relación Cliente → Facturas: GET /api/facturas/?cliente=:id (solo personal con view_factura). */
function FacturasDelCliente({ clienteId }) {
  const { puedeGestionar } = useAuth();
  const [pagina, setPagina] = useState(1);
  const permitido = puedeGestionar('facturas.view_factura');
  const { datos, cargando, error } = useConsulta(
    () => (permitido ? facturasApi.listar({ cliente: clienteId, page: pagina }) : Promise.resolve(null)),
    [clienteId, pagina, permitido],
  );

  if (!permitido) return <EstadoVacio icono="bi-lock" titulo="Las facturas solo están disponibles para el personal con permiso de consulta" />;
  if (cargando) return <Cargando />;
  if (error) return <div className="p-3"><AlertaError error={error} className="mb-0" /></div>;
  if (!datos?.resultados.length) return <EstadoVacio titulo="Este cliente no tiene facturas" icono="bi-receipt" />;

  return (
    <>
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle mb-0">
          <thead className="table-light"><tr><th>#</th><th>Fecha</th><th>Estado</th><th className="text-end">Total</th></tr></thead>
          <tbody>
            {datos.resultados.map((f) => (
              <tr key={f.id}>
                <td><Link to={`/facturas/${f.id}`}>Factura {f.id}</Link></td>
                <td>{formatoFechaHora(f.fecha)}</td>
                <td><Insignia valor={f.estado} /></td>
                <td className="text-end">{formatoMoneda(f.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion datos={datos} onCambiar={setPagina} />
    </>
  );
}

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { puedeGestionar } = useAuth();
  const { datos: cliente, cargando, error, recargar } = useConsulta(() => clientesApi.obtener(id), [id]);
  const eliminacion = useEliminacion(() => clientesApi.eliminar(id), {
    mensajeExito: 'Cliente eliminado.', onExito: () => navigate('/clientes'),
  });

  if (cargando) return <Cargando />;
  if (error) return <AlertaError error={error} onReintentar={recargar} />;

  return (
    <>
      <EncabezadoPagina titulo={cliente.nombre} icono="bi-person" subtitulo={`Cédula ${cliente.cedula}`}
        migas={[{ texto: 'Clientes', a: '/clientes' }, { texto: cliente.nombre }]}>
        <BotonPermiso permitido={puedeGestionar('facturas.add_factura') && cliente.activo}
          motivo={cliente.activo ? undefined : 'Solo se factura a clientes activos'}
          a={`/facturas/nueva?cliente=${cliente.id}`} className="btn btn-outline-primary">
          <i className="bi bi-receipt me-1" />Nueva factura
        </BotonPermiso>
        <BotonPermiso permitido={puedeGestionar('clientes.change_cliente')} a={`/clientes/${id}/editar`}>
          <i className="bi bi-pencil me-1" />Editar
        </BotonPermiso>
        <BotonPermiso permitido={puedeGestionar('clientes.delete_cliente')} onClick={() => eliminacion.pedir(cliente)} className="btn btn-outline-danger">
          <i className="bi bi-trash me-1" />Eliminar
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Datos del cliente</div>
            <dl className="card-body mb-0">
              <FilaDato etiqueta="Cédula">{cliente.cedula}</FilaDato>
              <FilaDato etiqueta="Nombre">{cliente.nombre}</FilaDato>
              <FilaDato etiqueta="Correo"><a href={`mailto:${cliente.email}`}>{cliente.email}</a></FilaDato>
              <FilaDato etiqueta="Teléfono">{cliente.telefono || '—'}</FilaDato>
              <FilaDato etiqueta="Dirección">{cliente.direccion || '—'}</FilaDato>
              <FilaDato etiqueta="Estado"><Insignia valor={cliente.activo} /></FilaDato>
            </dl>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Facturas del cliente</div>
            <FacturasDelCliente clienteId={cliente.id} />
          </div>
        </div>
      </div>

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar cliente" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        ¿Desea eliminar a <strong>{cliente.nombre}</strong>? Esta acción no se puede deshacer.
      </ConfirmarModal>
    </>
  );
}
