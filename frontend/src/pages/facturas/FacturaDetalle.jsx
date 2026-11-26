import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { cursosApi, facturasApi, obtenerTodos, productosApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import ConfirmarModal from '../../components/comunes/ConfirmarModal';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import Insignia from '../../components/comunes/Insignia';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useEliminacion } from '../../hooks/useEliminacion';
import { useFormulario } from '../../hooks/useFormulario';
import { ESTADOS_FACTURA, textoDe } from '../../utils/catalogos';
import { formatoFecha, formatoFechaHora, formatoMoneda } from '../../utils/formato';
import { sinErrores, validarDetalleFactura } from '../../utils/validaciones';

const DETALLE_VACIO = { tipo: 'producto', producto: '', curso: '', cantidad: '1' };

/** Formulario para agregar un producto o un curso a una factura pendiente. */
function AgregarDetalle({ facturaId, onAgregado }) {
  const notificar = useNotificaciones();
  const form = useFormulario(DETALLE_VACIO);
  const [guardando, setGuardando] = useState(false);
  const opciones = useConsulta(async () => {
    const [productos, cursos] = await Promise.all([
      obtenerTodos(productosApi, { activo: 'true' }),
      obtenerTodos(cursosApi, { estado: 'PROGRAMADO' }),
    ]);
    return { productos, cursos };
  }, []);

  const productoElegido = useMemo(
    () => opciones.datos?.productos.find((p) => String(p.id) === form.valores.producto),
    [opciones.datos, form.valores.producto],
  );
  const cursoElegido = opciones.datos?.cursos.find((c) => String(c.id) === form.valores.curso);
  const esProducto = form.valores.tipo === 'producto';
  const subtotal = esProducto
    ? (productoElegido ? Number(productoElegido.precio) * Number(form.valores.cantidad || 0) : 0)
    : Number(cursoElegido?.precio || 0);

  const cambiarTipo = (tipo) => form.reiniciar({ ...DETALLE_VACIO, tipo });

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarDetalleFactura(form.valores, productoElegido);
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (!sinErrores(errores)) return;
    const datos = esProducto
      ? { producto: Number(form.valores.producto), cantidad: Number(form.valores.cantidad) }
      : { curso: Number(form.valores.curso), cantidad: 1 };
    setGuardando(true);
    try {
      await facturasApi.agregarDetalle(facturaId, datos);
      notificar.exito(esProducto ? 'Producto agregado; el stock se descontó.' : 'Curso agregado a la factura.');
      form.reiniciar({ ...DETALLE_VACIO, tipo: form.valores.tipo });
      opciones.recargar();
      onAgregado();
    } catch (err) {
      form.aplicarErrorApi(interpretarError(err));
    } finally {
      setGuardando(false);
    }
  };

  if (opciones.cargando) return <Cargando texto="Cargando productos y cursos…" />;
  if (opciones.error) return <AlertaError error={opciones.error} onReintentar={opciones.recargar} />;

  return (
    <form onSubmit={guardar} noValidate>
      <AlertaError error={form.errorGeneral} className="py-2" />
      <div className="btn-group w-100 mb-3" role="group" aria-label="Tipo de línea">
        <button type="button" className={`btn ${esProducto ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={esProducto}
          onClick={() => cambiarTipo('producto')}><i className="bi bi-bag me-1" />Producto</button>
        <button type="button" className={`btn ${!esProducto ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={!esProducto}
          onClick={() => cambiarTipo('curso')}><i className="bi bi-mortarboard me-1" />Curso</button>
      </div>
      {esProducto ? (
        <div className="row g-2">
          <Campo className="col-8" como="select" etiqueta="Producto" name="producto" valor={form.valores.producto}
            onChange={form.cambiar} error={form.errores.producto} requerido
            opciones={opciones.datos.productos.map((p) => ({
              valor: p.id, texto: `${p.nombre} · ${formatoMoneda(p.precio)} · stock ${p.stock}`, deshabilitada: p.stock === 0,
            }))} />
          <Campo className="col-4" etiqueta="Cantidad" name="cantidad" type="number" min="1" step="1"
            max={productoElegido?.stock} valor={form.valores.cantidad} onChange={form.cambiar} error={form.errores.cantidad} requerido />
        </div>
      ) : (
        <Campo como="select" etiqueta="Curso programado" name="curso" valor={form.valores.curso} onChange={form.cambiar}
          error={form.errores.curso} requerido ayuda="El cliente debe estar inscrito en el curso y no tenerlo ya facturado."
          opciones={opciones.datos.cursos.map((c) => ({ valor: c.id, texto: `${c.nombre} · ${formatoFecha(c.fecha)} · ${formatoMoneda(c.precio)}` }))} />
      )}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="small text-secondary">Subtotal estimado: <strong className="text-body">{formatoMoneda(subtotal)}</strong></div>
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-plus-lg me-1" />Agregar</>}
        </button>
      </div>
    </form>
  );
}

/**
 * Detalle de factura y sus líneas (Factura → Cliente, Producto, Curso):
 *   GET    /api/facturas/:id/            GET /api/facturas/:id/detalles/
 *   POST   /api/facturas/:id/detalles/   DELETE /api/facturas/detalles/:id/
 *   PATCH  /api/facturas/:id/  (estado)  DELETE /api/facturas/:id/
 */
export default function FacturaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notificar = useNotificaciones();
  const { puedeGestionar } = useAuth();
  const factura = useConsulta(() => facturasApi.obtener(id), [id]);
  const detalles = useConsulta(() => facturasApi.detalles(id), [id]);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const recargarTodo = () => { factura.recargar(); detalles.recargar(); };
  const eliminarDetalle = useEliminacion((d) => facturasApi.eliminarDetalle(d.id), {
    mensajeExito: 'Línea eliminada; el stock fue restituido y el total recalculado.', onExito: recargarTodo,
  });
  const eliminarFactura = useEliminacion(() => facturasApi.eliminar(id), { mensajeExito: 'Factura eliminada.', onExito: () => navigate('/facturas') });
  const [confirmarEstado, setConfirmarEstado] = useState(null);

  if (factura.cargando) return <Cargando />;
  if (factura.error) return <AlertaError error={factura.error} onReintentar={factura.error.estado === 403 ? undefined : factura.recargar} />;

  const f = factura.datos;
  const pendiente = f.estado === 'PENDIENTE';
  const lineas = detalles.datos ?? [];
  const puedeCambiar = puedeGestionar('facturas.change_factura');

  const cambiarEstado = async () => {
    setCambiandoEstado(true);
    try {
      await facturasApi.modificar(id, { estado: confirmarEstado });
      notificar.exito(`Factura marcada como ${textoDe(ESTADOS_FACTURA, confirmarEstado).toLowerCase()}.`);
      recargarTodo();
    } catch (err) {
      const info = interpretarError(err);
      notificar.error(`${info.titulo}: ${info.mensaje}`);
    } finally {
      setCambiandoEstado(false);
      setConfirmarEstado(null);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo={`Factura #${f.id}`} icono="bi-receipt" migas={[{ texto: 'Facturas', a: '/facturas' }, { texto: `#${f.id}` }]}>
        {pendiente && (
          <BotonPermiso permitido={puedeCambiar && lineas.length > 0} motivo={lineas.length ? undefined : 'Agregue al menos una línea'}
            onClick={() => setConfirmarEstado('PAGADA')} className="btn btn-success">
            <i className="bi bi-cash-coin me-1" />Marcar pagada
          </BotonPermiso>
        )}
        {f.estado !== 'CANCELADA' && (
          <BotonPermiso permitido={puedeCambiar && lineas.length === 0}
            motivo={lineas.length ? 'Elimine los detalles antes de cancelar' : undefined}
            onClick={() => setConfirmarEstado('CANCELADA')} className="btn btn-outline-warning">
            <i className="bi bi-x-circle me-1" />Cancelar factura
          </BotonPermiso>
        )}
        <BotonPermiso permitido={puedeGestionar('facturas.delete_factura') && pendiente && lineas.length === 0}
          motivo="Solo se eliminan facturas pendientes sin detalles" onClick={() => eliminarFactura.pedir(f)} className="btn btn-outline-danger">
          <i className="bi bi-trash me-1" />Eliminar
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-white fw-semibold">Productos y cursos facturados</div>
            {detalles.cargando && <Cargando />}
            {detalles.error && <div className="p-3"><AlertaError error={detalles.error} className="mb-0" /></div>}
            {!detalles.cargando && !detalles.error && lineas.length === 0 && (
              <EstadoVacio titulo="La factura no tiene líneas" texto={pendiente ? 'Agregue productos o cursos con el formulario.' : undefined} icono="bi-list-ul" />
            )}
            {!detalles.cargando && !detalles.error && lineas.length > 0 && (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light"><tr><th>Concepto</th><th className="text-center">Cant.</th><th className="text-end">Precio</th><th className="text-end">Subtotal</th><th /></tr></thead>
                  <tbody>
                    {lineas.map((d) => (
                      <tr key={d.id}>
                        <td>
                          {d.producto
                            ? <><i className="bi bi-bag me-2 text-secondary" /><Link to={`/productos/${d.producto}`}>{d.nombre_producto}</Link></>
                            : <><i className="bi bi-mortarboard me-2 text-secondary" /><Link to={`/cursos/${d.curso}`}>{d.nombre_curso}</Link></>}
                        </td>
                        <td className="text-center">{d.cantidad}</td>
                        <td className="text-end text-nowrap">{formatoMoneda(d.precio_unitario)}</td>
                        <td className="text-end text-nowrap fw-semibold">{formatoMoneda(d.subtotal)}</td>
                        <td className="text-end">
                          {pendiente && (
                            <BotonPermiso permitido={puedeGestionar('facturas.delete_detallefactura')} onClick={() => eliminarDetalle.pedir(d)}
                              className="btn btn-sm btn-outline-danger" title="Quitar línea"><i className="bi bi-x-lg" /></BotonPermiso>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-light"><th colSpan={3} className="text-end">Total</th><th className="text-end fs-5">{formatoMoneda(f.total)}</th><th /></tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="small text-secondary">Cliente</div>
                  <Link to={`/clientes/${f.cliente}`} className="fw-semibold">{f.nombre_cliente}</Link>
                </div>
                <Insignia valor={f.estado} texto={textoDe(ESTADOS_FACTURA, f.estado)} />
              </div>
              <div className="small text-secondary">Emitida: {formatoFechaHora(f.fecha)}</div>
              <hr />
              <div className="d-flex justify-content-between"><span>Total</span><strong className="fs-4">{formatoMoneda(f.total)}</strong></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-white fw-semibold">Agregar línea</div>
            <div className="card-body">
              {!pendiente && <div className="small text-secondary"><i className="bi bi-lock me-1" />Solo las facturas pendientes admiten nuevas líneas.</div>}
              {pendiente && !puedeGestionar('facturas.add_detallefactura') && <div className="small text-secondary"><i className="bi bi-lock me-1" />Su perfil no puede agregar líneas.</div>}
              {pendiente && puedeGestionar('facturas.add_detallefactura') && <AgregarDetalle facturaId={f.id} onAgregado={recargarTodo} />}
            </div>
          </div>
        </div>
      </div>

      <ConfirmarModal mostrar={Boolean(eliminarDetalle.objetivo)} titulo="Quitar línea" textoConfirmar="Quitar" procesando={eliminarDetalle.procesando}
        onConfirmar={eliminarDetalle.confirmar} onCancelar={eliminarDetalle.cancelar}>
        ¿Quitar <strong>{eliminarDetalle.objetivo?.producto ? eliminarDetalle.objetivo?.nombre_producto : eliminarDetalle.objetivo?.nombre_curso}</strong> de la factura?
        {eliminarDetalle.objetivo?.producto && ' Las unidades regresan al inventario.'}
      </ConfirmarModal>
      <ConfirmarModal mostrar={Boolean(eliminarFactura.objetivo)} titulo="Eliminar factura" procesando={eliminarFactura.procesando}
        onConfirmar={eliminarFactura.confirmar} onCancelar={eliminarFactura.cancelar}>
        ¿Desea eliminar la factura <strong>#{f.id}</strong>?
      </ConfirmarModal>
      <ConfirmarModal mostrar={Boolean(confirmarEstado)} procesando={cambiandoEstado}
        titulo={confirmarEstado === 'PAGADA' ? 'Marcar como pagada' : 'Cancelar factura'}
        textoConfirmar={confirmarEstado === 'PAGADA' ? 'Marcar pagada' : 'Cancelar factura'}
        variante={confirmarEstado === 'PAGADA' ? 'success' : 'warning'}
        onConfirmar={cambiarEstado} onCancelar={() => setConfirmarEstado(null)}>
        {confirmarEstado === 'PAGADA'
          ? <>La factura quedará cerrada por {formatoMoneda(f.total)} y ya no admitirá cambios en sus líneas.</>
          : <>La factura quedará cancelada y no podrá modificarse después.</>}
      </ConfirmarModal>
    </>
  );
}
