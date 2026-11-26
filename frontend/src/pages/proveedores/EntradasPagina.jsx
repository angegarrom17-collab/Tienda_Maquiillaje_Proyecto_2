import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { entradasApi, obtenerTodos, productosApi, proveedoresApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useFormulario } from '../../hooks/useFormulario';
import { formatoFechaHora } from '../../utils/formato';
import { sinErrores, validarEntrada } from '../../utils/validaciones';

/**
 * Entradas de inventario (Proveedor → Producto). Registrar una entrada
 * aumenta el stock del producto en el backend (cambia el estado de otra entidad).
 * Por regla del Proyecto 1, las entradas solo se crean y consultan: no se editan ni eliminan.
 *   GET  /api/proveedores/entradas/?proveedor=
 *   POST /api/proveedores/entradas/
 */
export default function EntradasPagina() {
  const { puedeGestionar } = useAuth();
  const notificar = useNotificaciones();
  const [parametros] = useSearchParams();
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const form = useFormulario({
    proveedor: parametros.get('proveedor') || '', producto: parametros.get('producto') || '', cantidad: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  const entradas = useConsulta(
    () => entradasApi.listar(filtroProveedor ? { proveedor: filtroProveedor } : {}),
    [filtroProveedor],
  );
  const proveedores = useConsulta(() => obtenerTodos(proveedoresApi), []);
  const puedeRegistrar = puedeGestionar('proveedores.add_entradaproducto');

  // Al elegir proveedor se consultan SUS productos (el backend exige que el producto pertenezca al proveedor)
  useEffect(() => {
    if (!form.valores.proveedor) { setProductos([]); return; }
    let vigente = true; // si el usuario cambia de proveedor rápido, se ignora la respuesta anterior
    setCargandoProductos(true);
    obtenerTodos(productosApi, { proveedor: form.valores.proveedor })
      .then((lista) => vigente && setProductos(lista))
      .catch(() => vigente && setProductos([]))
      .finally(() => vigente && setCargandoProductos(false));
    return () => { vigente = false; };
  }, [form.valores.proveedor]);

  const cambiarProveedor = (e) => {
    form.cambiar(e);
    form.setValores((v) => ({ ...v, proveedor: e.target.value, producto: '' }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarEntrada(form.valores);
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (!sinErrores(errores)) return;
    setGuardando(true);
    try {
      const entrada = await entradasApi.crear({
        proveedor: Number(form.valores.proveedor), producto: Number(form.valores.producto), cantidad: Number(form.valores.cantidad),
      });
      const producto = await productosApi.obtener(entrada.producto);
      notificar.exito(`Entrada registrada. Nuevo stock de ${producto.nombre}: ${producto.stock}.`);
      form.setValores((v) => ({ ...v, producto: '', cantidad: '' }));
      entradas.recargar();
    } catch (err) {
      form.aplicarErrorApi(interpretarError(err));
    } finally {
      setGuardando(false);
    }
  };

  const proveedoresActivos = (proveedores.datos ?? []).filter((p) => p.activo);

  return (
    <>
      <EncabezadoPagina titulo="Entradas de inventario" icono="bi-box-arrow-in-down" subtitulo="Reabastecimiento de productos por proveedor"
        migas={[{ texto: 'Proveedores', a: '/proveedores' }, { texto: 'Entradas' }]} />

      <div className="row g-3">
        <div className="col-lg-4">
          <form className="card" onSubmit={guardar} noValidate>
            <div className="card-header bg-white fw-semibold">Registrar entrada</div>
            <fieldset className="card-body" disabled={!puedeRegistrar || guardando}>
              {!puedeRegistrar && <div className="alert alert-warning small"><i className="bi bi-lock me-1" />Su perfil no puede registrar entradas.</div>}
              <AlertaError error={form.errorGeneral} />
              <Campo className="mb-3" como="select" etiqueta="Proveedor" name="proveedor" valor={form.valores.proveedor}
                onChange={cambiarProveedor} error={form.errores.proveedor} requerido
                opciones={proveedoresActivos.map((p) => ({ valor: p.id, texto: p.nombre }))} />
              <Campo className="mb-3" como="select" etiqueta="Producto" name="producto" valor={form.valores.producto}
                onChange={form.cambiar} error={form.errores.producto} requerido
                opcionVacia={!form.valores.proveedor ? 'Primero elija el proveedor' : cargandoProductos ? 'Cargando…' : 'Seleccione…'}
                opciones={productos.map((p) => ({ valor: p.id, texto: `${p.nombre} (stock ${p.stock})` }))}
                ayuda={form.valores.proveedor && !cargandoProductos && productos.length === 0 ? 'Este proveedor no tiene productos asignados.' : undefined} />
              <Campo etiqueta="Cantidad recibida" name="cantidad" type="number" min="1" step="1" valor={form.valores.cantidad}
                onChange={form.cambiar} error={form.errores.cantidad} requerido />
            </fieldset>
            <div className="card-footer bg-white text-end">
              <button type="submit" className="btn btn-success" disabled={!puedeRegistrar || guardando}>
                {guardando && <span className="spinner-border spinner-border-sm me-2" />}<i className="bi bi-plus-lg me-1" />Registrar
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span className="fw-semibold">Historial de entradas</span>
              <select className="form-select form-select-sm w-auto" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} aria-label="Filtrar por proveedor">
                <option value="">Todos los proveedores</option>
                {(proveedores.datos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            {entradas.cargando && <Cargando />}
            {entradas.error && <div className="p-3"><AlertaError error={entradas.error} onReintentar={entradas.recargar} className="mb-0" /></div>}
            {!entradas.cargando && !entradas.error && entradas.datos.length === 0 && <EstadoVacio titulo="No hay entradas registradas" icono="bi-box" />}
            {!entradas.cargando && !entradas.error && entradas.datos.length > 0 && (
              <div className="table-responsive tabla-alta">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light sticky-top"><tr><th>#</th><th>Fecha</th><th>Proveedor</th><th>Producto</th><th className="text-end">Cantidad</th></tr></thead>
                  <tbody>
                    {entradas.datos.map((e) => (
                      <tr key={e.id}>
                        <td>{e.id}</td>
                        <td className="small text-nowrap">{formatoFechaHora(e.fecha)}</td>
                        <td><Link to={`/proveedores/${e.proveedor}`}>{e.nombre_proveedor}</Link></td>
                        <td><Link to={`/productos/${e.producto}`}>{e.nombre_producto}</Link></td>
                        <td className="text-end fw-semibold text-success">+{e.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}