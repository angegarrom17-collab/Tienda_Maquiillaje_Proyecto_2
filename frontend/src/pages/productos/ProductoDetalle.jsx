import { Link, useNavigate, useParams } from 'react-router-dom';
import { entradasApi, productosApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
import Cargando from '../../components/comunes/Cargando';
import ConfirmarModal from '../../components/comunes/ConfirmarModal';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import FilaDato from '../../components/comunes/FilaDato';
import Insignia from '../../components/comunes/Insignia';
import { useAuth } from '../../context/AuthContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useEliminacion } from '../../hooks/useEliminacion';
import { textoDe, VIGENCIAS_PRODUCTO } from '../../utils/catalogos';
import { formatoFecha, formatoFechaHora, formatoMoneda } from '../../utils/formato';

/** Relación Producto → Entradas de inventario: GET /api/proveedores/entradas/?producto=:id */
function EntradasDelProducto({ productoId }) {
  const { esPersonal } = useAuth();
  const { datos, cargando, error } = useConsulta(
    () => (esPersonal ? entradasApi.listar({ producto: productoId }) : Promise.resolve([])),
    [productoId, esPersonal],
  );
  if (!esPersonal) return <EstadoVacio icono="bi-lock" titulo="El historial de entradas está disponible solo para el personal" />;
  if (cargando) return <Cargando />;
  if (error) return <div className="p-3"><AlertaError error={error} className="mb-0" /></div>;
  if (!datos.length) return <EstadoVacio titulo="Sin entradas de inventario registradas" icono="bi-box" />;
  return (
    <ul className="list-group list-group-flush">
      {datos.map((e) => (
        <li key={e.id} className="list-group-item d-flex justify-content-between">
          <div>
            <div>+{e.cantidad} unidades</div>
            <small className="text-secondary">{e.nombre_proveedor} · {formatoFechaHora(e.fecha)}</small>
          </div>
          <span className="badge text-bg-success align-self-center">Entrada #{e.id}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { puedeGestionar } = useAuth();
  const { datos: p, cargando, error, recargar } = useConsulta(() => productosApi.obtener(id), [id]);
  const eliminacion = useEliminacion(() => productosApi.eliminar(id), {
    mensajeExito: 'Producto eliminado.', onExito: () => navigate('/productos'),
  });

  if (cargando) return <Cargando />;
  if (error) return <AlertaError error={error} onReintentar={recargar} />;

  const bajo = p.stock <= p.stock_minimo;

  return (
    <>
      <EncabezadoPagina titulo={p.nombre} icono="bi-bag-heart" migas={[{ texto: 'Productos', a: '/productos' }, { texto: p.nombre }]}>
        <BotonPermiso permitido={puedeGestionar('proveedores.add_entradaproducto') && Boolean(p.proveedor)}
          motivo={p.proveedor ? undefined : 'El producto no tiene proveedor asignado'}
          a={`/proveedores/entradas?proveedor=${p.proveedor}&producto=${p.id}`} className="btn btn-outline-success">
          <i className="bi bi-box-arrow-in-down me-1" />Registrar entrada
        </BotonPermiso>
        <BotonPermiso permitido={puedeGestionar('productos.change_producto')} a={`/productos/${id}/editar`}>
          <i className="bi bi-pencil me-1" />Editar
        </BotonPermiso>
        <BotonPermiso permitido={puedeGestionar('productos.delete_producto')} onClick={() => eliminacion.pedir(p)} className="btn btn-outline-danger">
          <i className="bi bi-trash me-1" />Eliminar
        </BotonPermiso>
      </EncabezadoPagina>

      {bajo && (
        <div className="alert alert-warning d-flex gap-2"><i className="bi bi-exclamation-triangle" />
          El stock ({p.stock}) está en o por debajo del mínimo ({p.stock_minimo}). Conviene reabastecer.
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Información del producto</div>
            <dl className="card-body mb-0">
              <FilaDato etiqueta="Categoría">
                <Link to={`/productos?categoria=${p.categoria}`}>{p.categoria_detalle?.nombre}</Link>
              </FilaDato>
              <FilaDato etiqueta="Proveedor">
                {p.proveedor ? <Link to={`/proveedores/${p.proveedor}`}>{p.nombre_proveedor}</Link> : 'Sin proveedor'}
              </FilaDato>
              <FilaDato etiqueta="Descripción">{p.descripcion || '—'}</FilaDato>
              <FilaDato etiqueta="Precio">{formatoMoneda(p.precio)}</FilaDato>
              <FilaDato etiqueta="Stock">{p.stock} unidades (mínimo {p.stock_minimo})</FilaDato>
              <FilaDato etiqueta="Vigencia">{textoDe(VIGENCIAS_PRODUCTO, p.vigencia_meses)}</FilaDato>
              <FilaDato etiqueta="Vence">{formatoFecha(p.fecha_vencimiento)}</FilaDato>
              <FilaDato etiqueta="Estado"><Insignia valor={p.activo} /></FilaDato>
              <FilaDato etiqueta="Registrado">{formatoFechaHora(p.fecha_creacion)}</FilaDato>
            </dl>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Entradas de inventario</div>
            <EntradasDelProducto productoId={p.id} />
          </div>
        </div>
      </div>

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar producto" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        ¿Desea eliminar <strong>{p.nombre}</strong>? Si tiene facturas o entradas asociadas, el sistema lo impedirá.
      </ConfirmarModal>
    </>
  );
}