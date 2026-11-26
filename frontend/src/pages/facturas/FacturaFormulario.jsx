import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { clientesApi, cursosApi, facturasApi, obtenerTodos, productosApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useFormulario } from '../../hooks/useFormulario';
import { ESTADOS_FACTURA } from '../../utils/catalogos';
import { formatoFecha, formatoMoneda } from '../../utils/formato';

const LINEA_VACIA = { tipo: 'producto', producto: '', curso: '', cantidad: '1' };

/**
 * Nueva factura: se elige el cliente y se arma la lista de productos/cursos ANTES de guardar.
 * Se envía todo junto en POST /api/facturas/ { cliente, detalles: [...] } y el backend lo guarda
 * en una sola transacción: si alguna línea incumple una regla, no se crea ninguna factura.
 *
 * Editar factura: PATCH /api/facturas/:id/ para cambiar el estado.
 * Reglas del backend: no se cambia el cliente, una factura CANCELADA no se modifica
 * y no se puede cancelar una factura que todavía tiene detalles.
 */
export default function FacturaFormulario() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const notificar = useNotificaciones();
  const form = useFormulario({ cliente: parametros.get('cliente') || '', estado: 'PENDIENTE' });
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [factura, setFactura] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Líneas que se van armando en pantalla (todavía no están guardadas en la base de datos)
  const [lineas, setLineas] = useState([]);
  const [linea, setLinea] = useState(LINEA_VACIA);
  const [errorLinea, setErrorLinea] = useState('');

  useEffect(() => {
    let vigente = true; // descarta respuestas de una carga anterior (StrictMode / cambio de id)
    Promise.all([
      obtenerTodos(clientesApi),
      esEdicion ? facturasApi.obtener(id) : Promise.resolve(null),
      esEdicion ? Promise.resolve([]) : obtenerTodos(productosApi, { activo: 'true' }),
      esEdicion ? Promise.resolve([]) : obtenerTodos(cursosApi, { estado: 'PROGRAMADO' }),
    ])
      .then(([listaClientes, f, listaProductos, listaCursos]) => {
        if (!vigente) return;
        setClientes(listaClientes);
        setProductos(listaProductos);
        setCursos(listaCursos);
        if (f) {
          setFactura(f);
          form.reiniciar({ cliente: String(f.cliente), estado: f.estado });
        }
      })
      .catch((e) => vigente && setErrorCarga(interpretarError(e)))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const productoElegido = productos.find((p) => String(p.id) === linea.producto);
  const cursoElegido = cursos.find((c) => String(c.id) === linea.curso);

  // Unidades de cada producto ya puestas en la lista (para no pasarse del stock)
  const unidadesEnLista = (productoId) => lineas
    .filter((l) => l.tipo === 'producto' && l.producto === productoId)
    .reduce((suma, l) => suma + Number(l.cantidad), 0);

  const totalEstimado = useMemo(() => lineas.reduce((suma, l) => suma + l.precio * Number(l.cantidad), 0), [lineas]);

  const cambiarLinea = (e) => {
    setLinea({ ...linea, [e.target.name]: e.target.value });
    setErrorLinea('');
  };

  const agregarALista = () => {
    if (linea.tipo === 'producto') {
      if (!productoElegido) return setErrorLinea('Seleccione un producto.');
      const cantidad = Number(linea.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) return setErrorLinea('La cantidad debe ser mayor que cero.');
      const disponible = productoElegido.stock - unidadesEnLista(linea.producto);
      if (cantidad > disponible) return setErrorLinea(`Solo quedan ${disponible} unidades disponibles de ${productoElegido.nombre}.`);
      setLineas([...lineas, {
        clave: `${Date.now()}`, tipo: 'producto', producto: linea.producto, cantidad,
        nombre: productoElegido.nombre, precio: Number(productoElegido.precio),
      }]);
    } else {
      if (!cursoElegido) return setErrorLinea('Seleccione un curso.');
      if (lineas.some((l) => l.tipo === 'curso' && l.curso === linea.curso)) return setErrorLinea('Ese curso ya está en la lista.');
      setLineas([...lineas, {
        clave: `${Date.now()}`, tipo: 'curso', curso: linea.curso, cantidad: 1,
        nombre: cursoElegido.nombre, precio: Number(cursoElegido.precio),
      }]);
    }
    setLinea({ ...LINEA_VACIA, tipo: linea.tipo });
    return undefined;
  };

  const quitarDeLista = (clave) => setLineas(lineas.filter((l) => l.clave !== clave));

  const guardar = async (e) => {
    e.preventDefault();
    const errores = {};
    if (!form.valores.cliente) errores.cliente = 'Seleccione el cliente.';
    if (!esEdicion && lineas.length === 0) errores.lineas = 'Agregue al menos un producto o curso a la lista.';
    if (esEdicion && form.valores.estado === 'CANCELADA' && factura.detalles.length > 0) {
      errores.estado = 'Elimine los detalles antes de cancelar la factura.';
    }
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (Object.keys(errores).length) return;

    setGuardando(true);
    try {
      let guardada;
      if (esEdicion) {
        guardada = await facturasApi.modificar(id, { estado: form.valores.estado });
      } else {
        guardada = await facturasApi.crear({
          cliente: Number(form.valores.cliente),
          estado: 'PENDIENTE',
          detalles: lineas.map((l) => (l.tipo === 'producto'
            ? { producto: Number(l.producto), cantidad: l.cantidad }
            : { curso: Number(l.curso), cantidad: 1 })),
        });
      }
      notificar.exito(esEdicion ? 'Estado de la factura actualizado.' : `Factura #${guardada.id} creada por ${formatoMoneda(guardada.total)}.`);
      navigate(`/facturas/${guardada.id}`);
    } catch (err) {
      // Si el backend rechaza una línea, NO se creó la factura: el usuario corrige la lista y vuelve a intentar
      form.aplicarErrorApi(interpretarError(err));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  const cancelada = factura?.estado === 'CANCELADA';
  const opcionesClientes = clientes.map((c) => ({
    valor: c.id, texto: `${c.nombre} · ${c.cedula}${c.activo ? '' : ' (inactivo)'}`, deshabilitada: !c.activo && !esEdicion,
  }));

  // ---------------- Edición: solo cambia el estado ----------------
  if (esEdicion) {
    return (
      <>
        <EncabezadoPagina titulo={`Editar factura #${id}`} icono="bi-receipt"
          migas={[{ texto: 'Facturas', a: '/facturas' }, { texto: `#${id}` }]} />
        <form className="card" onSubmit={guardar} noValidate style={{ maxWidth: 720 }}>
          <fieldset className="card-body" disabled={cancelada || guardando}>
            {cancelada && <div className="alert alert-secondary small"><i className="bi bi-lock me-1" />Las facturas canceladas no se pueden modificar.</div>}
            <AlertaError error={form.errorGeneral} />
            <div className="row g-3">
              <Campo className="col-12" como="select" etiqueta="Cliente" name="cliente" valor={form.valores.cliente}
                onChange={form.cambiar} error={form.errores.cliente} requerido opciones={opcionesClientes} disabled
                ayuda="El cliente de una factura existente no se puede cambiar." />
              <Campo className="col-md-6" como="select" etiqueta="Estado" name="estado" valor={form.valores.estado}
                onChange={form.cambiar} error={form.errores.estado} opcionVacia={null} opciones={ESTADOS_FACTURA}
                ayuda={factura.detalles.length > 0 ? 'Para cancelar, primero elimine los detalles.' : undefined} />
              <div className="col-md-6">
                <div className="form-label">Total actual</div>
                <div className="fs-5 fw-semibold">{formatoMoneda(factura.total)}</div>
                <div className="form-text">Calculado por el servidor a partir de los detalles.</div>
              </div>
            </div>
          </fieldset>
          <div className="card-footer bg-white d-flex justify-content-end gap-2">
            <Link to={`/facturas/${id}`} className="btn btn-outline-secondary">Ver detalles</Link>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando || cancelada}>
              {guardando && <span className="spinner-border spinner-border-sm me-2" />}Guardar
            </button>
          </div>
        </form>
      </>
    );
  }

  // ---------------- Nueva factura: cliente + lista de líneas ----------------
  const esProducto = linea.tipo === 'producto';
  return (
    <>
      <EncabezadoPagina titulo="Nueva factura" icono="bi-receipt" migas={[{ texto: 'Facturas', a: '/facturas' }, { texto: 'Nueva' }]}
        subtitulo="Arme la lista y guarde: la factura solo se crea si todas las líneas son válidas" />
      <form onSubmit={guardar} noValidate>
        <AlertaError error={form.errorGeneral} />
        <div className="row g-3">
          <div className="col-lg-5">
            <div className="card mb-3">
              <div className="card-header bg-white fw-semibold">1. Cliente</div>
              <div className="card-body">
                <Campo como="select" etiqueta="Cliente" name="cliente" valor={form.valores.cliente}
                  onChange={form.cambiar} error={form.errores.cliente} requerido opciones={opcionesClientes}
                  ayuda="Solo se factura a clientes activos." />
              </div>
            </div>

            <div className="card">
              <div className="card-header bg-white fw-semibold">2. Agregar a la lista</div>
              <div className="card-body">
                <div className="btn-group w-100 mb-3" role="group" aria-label="Tipo de línea">
                  <button type="button" className={`btn ${esProducto ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={esProducto}
                    onClick={() => { setLinea({ ...LINEA_VACIA, tipo: 'producto' }); setErrorLinea(''); }}>
                    <i className="bi bi-bag me-1" />Producto
                  </button>
                  <button type="button" className={`btn ${!esProducto ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={!esProducto}
                    onClick={() => { setLinea({ ...LINEA_VACIA, tipo: 'curso' }); setErrorLinea(''); }}>
                    <i className="bi bi-mortarboard me-1" />Curso
                  </button>
                </div>
                {esProducto ? (
                  <div className="row g-2">
                    <Campo className="col-8" como="select" etiqueta="Producto" name="producto" valor={linea.producto} onChange={cambiarLinea}
                      opciones={productos.map((p) => ({
                        valor: p.id, texto: `${p.nombre} · ${formatoMoneda(p.precio)} · stock ${p.stock}`, deshabilitada: p.stock === 0,
                      }))} />
                    <Campo className="col-4" etiqueta="Cantidad" name="cantidad" type="number" min="1" step="1"
                      valor={linea.cantidad} onChange={cambiarLinea} />
                  </div>
                ) : (
                  <Campo como="select" etiqueta="Curso programado" name="curso" valor={linea.curso} onChange={cambiarLinea}
                    ayuda="El cliente debe estar inscrito en el curso y no tenerlo ya facturado."
                    opciones={cursos.map((c) => ({ valor: c.id, texto: `${c.nombre} · ${formatoFecha(c.fecha)} · ${formatoMoneda(c.precio)}` }))} />
                )}
                {errorLinea && <div className="text-danger small mt-2">{errorLinea}</div>}
                <button type="button" className="btn btn-outline-primary w-100 mt-3" onClick={agregarALista}>
                  <i className="bi bi-plus-lg me-1" />Agregar a la lista
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className={`card ${form.errores.lineas ? 'border-danger' : ''}`}>
              <div className="card-header bg-white fw-semibold">3. Líneas de la factura</div>
              {lineas.length === 0 ? (
                <EstadoVacio titulo="La lista está vacía" texto="Agregue productos o cursos con el formulario." icono="bi-list-ul" />
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light"><tr><th>Concepto</th><th className="text-center">Cant.</th><th className="text-end">Precio</th><th className="text-end">Subtotal</th><th /></tr></thead>
                    <tbody>
                      {lineas.map((l) => (
                        <tr key={l.clave}>
                          <td><i className={`bi ${l.tipo === 'producto' ? 'bi-bag' : 'bi-mortarboard'} me-2 text-secondary`} />{l.nombre}</td>
                          <td className="text-center">{l.cantidad}</td>
                          <td className="text-end text-nowrap">{formatoMoneda(l.precio)}</td>
                          <td className="text-end text-nowrap">{formatoMoneda(l.precio * l.cantidad)}</td>
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-outline-danger" title="Quitar de la lista" onClick={() => quitarDeLista(l.clave)}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light"><th colSpan={3} className="text-end">Total estimado</th><th className="text-end">{formatoMoneda(totalEstimado)}</th><th /></tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {form.errores.lineas && <div className="text-danger small px-3 pt-2">{form.errores.lineas}</div>}
              <div className="card-footer bg-white d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando && <span className="spinner-border spinner-border-sm me-2" />}Guardar factura
                </button>
              </div>
            </div>
            <p className="small text-secondary mt-2 mb-0">
              El precio final, el total y el descuento de inventario los calcula el servidor al guardar.
            </p>
          </div>
        </div>
      </form>
    </>
  );
}