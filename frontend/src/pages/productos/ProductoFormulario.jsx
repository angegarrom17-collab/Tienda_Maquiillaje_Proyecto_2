import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { categoriasApi, obtenerTodos, productosApi, proveedoresApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useFormulario } from '../../hooks/useFormulario';
import { VIGENCIAS_PRODUCTO } from '../../utils/catalogos';
import { sumarDiasIso } from '../../utils/formato';
import { sinErrores, validarProducto } from '../../utils/validaciones';

const VACIO = {
  nombre: '', descripcion: '', categoria: '', proveedor: '', precio: '', stock: '0', stock_minimo: '5',
  vigencia_meses: '12', fecha_vencimiento: '', activo: true,
};

/**
 * Crear o editar un producto. Los selectores de categoría y proveedor se llenan desde la API
 * (relaciones Producto → Categoría y Producto → Proveedor).
 */
export default function ProductoFormulario() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const notificar = useNotificaciones();
  const form = useFormulario(VACIO);
  const [opciones, setOpciones] = useState({ categorias: [], proveedores: [] });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true; // descarta respuestas de una carga anterior (StrictMode / cambio de id)
    Promise.all([
      categoriasApi.listar(),
      obtenerTodos(proveedoresApi),
      esEdicion ? productosApi.obtener(id) : Promise.resolve(null),
    ])
      .then(([categorias, proveedores, producto]) => {
        if (!vigente) return;
        setOpciones({ categorias, proveedores });
        if (producto) {
          form.reiniciar({
            nombre: producto.nombre, descripcion: producto.descripcion ?? '', categoria: String(producto.categoria),
            proveedor: producto.proveedor ? String(producto.proveedor) : '', precio: producto.precio,
            stock: String(producto.stock), stock_minimo: String(producto.stock_minimo),
            vigencia_meses: String(producto.vigencia_meses), fecha_vencimiento: producto.fecha_vencimiento, activo: producto.activo,
          });
        }
      })
      .catch((e) => vigente && setErrorCarga(interpretarError(e)))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarProducto(form.valores);
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (!sinErrores(errores)) return;

    const v = form.valores;
    const datos = {
      ...v,
      categoria: Number(v.categoria),
      proveedor: v.proveedor ? Number(v.proveedor) : null,
      stock: Number(v.stock),
      stock_minimo: Number(v.stock_minimo || 0),
      vigencia_meses: Number(v.vigencia_meses),
    };
    setGuardando(true);
    try {
      const guardado = esEdicion ? await productosApi.actualizar(id, datos) : await productosApi.crear(datos);
      notificar.exito(esEdicion ? 'Producto actualizado.' : 'Producto registrado.');
      navigate(`/productos/${guardado.id}`);
    } catch (err) {
      form.aplicarErrorApi(interpretarError(err));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  const { valores, errores, cambiar } = form;
  const fechaMinima = sumarDiasIso(Number(valores.vigencia_meses || 12) * 30);
  const proveedoresOpciones = opciones.proveedores.map((p) => ({
    valor: p.id, texto: p.activo ? p.nombre : `${p.nombre} (inactivo)`, deshabilitada: !p.activo && String(p.id) !== valores.proveedor,
  }));

  return (
    <>
      <EncabezadoPagina titulo={esEdicion ? 'Editar producto' : 'Nuevo producto'} icono="bi-bag-plus"
        migas={[{ texto: 'Productos', a: '/productos' }, { texto: esEdicion ? 'Editar' : 'Nuevo' }]} />
      <form className="card" onSubmit={guardar} noValidate>
        <div className="card-body">
          <AlertaError error={form.errorGeneral} />
          {opciones.categorias.length === 0 && (
            <div className="alert alert-info small">
              No hay categorías registradas. <Link to="/productos/categorias">Cree una categoría</Link> antes de registrar productos.
            </div>
          )}
          <div className="row g-3">
            <Campo className="col-md-8" etiqueta="Nombre" name="nombre" valor={valores.nombre} onChange={cambiar}
              error={errores.nombre} requerido maxLength={120} />
            <Campo className="col-md-4" como="select" etiqueta="Categoría" name="categoria" valor={valores.categoria}
              onChange={cambiar} error={errores.categoria} requerido
              opciones={opciones.categorias.map((c) => ({ valor: c.id, texto: c.nombre }))} />
            <Campo className="col-12" como="textarea" etiqueta="Descripción" name="descripcion" valor={valores.descripcion}
              onChange={cambiar} error={errores.descripcion} />
            <Campo className="col-md-6" como="select" etiqueta="Proveedor" name="proveedor" valor={valores.proveedor}
              onChange={cambiar} error={errores.proveedor} opcionVacia="Sin proveedor" opciones={proveedoresOpciones}
              ayuda="Solo se pueden asignar proveedores activos." />
            <Campo className="col-md-6" etiqueta="Precio (₡)" name="precio" type="number" min="0.01" step="0.01"
              valor={valores.precio} onChange={cambiar} error={errores.precio} requerido />
            <Campo className="col-sm-6 col-md-3" etiqueta="Stock actual" name="stock" type="number" min="0" step="1"
              valor={valores.stock} onChange={cambiar} error={errores.stock} requerido
              ayuda={esEdicion ? 'Para reabastecer use Entradas de inventario.' : undefined} />
            <Campo className="col-sm-6 col-md-3" etiqueta="Stock mínimo" name="stock_minimo" type="number" min="0" step="1"
              valor={valores.stock_minimo} onChange={cambiar} error={errores.stock_minimo} />
            <Campo className="col-sm-6 col-md-3" como="select" etiqueta="Vigencia" name="vigencia_meses" valor={valores.vigencia_meses}
              onChange={cambiar} error={errores.vigencia_meses} opcionVacia={null}
              opciones={VIGENCIAS_PRODUCTO} />
            <Campo className="col-sm-6 col-md-3" etiqueta="Fecha de vencimiento" name="fecha_vencimiento" type="date"
              min={fechaMinima} valor={valores.fecha_vencimiento} onChange={cambiar} error={errores.fecha_vencimiento}
              requerido ayuda={`Mínimo: ${fechaMinima}`} />
            <Campo className="col-12" como="switch" etiqueta="Producto activo (disponible para la venta)" name="activo"
              valor={valores.activo} onChange={cambiar} error={errores.activo} />
          </div>
        </div>
        <div className="card-footer bg-white d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={guardando}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando && <span className="spinner-border spinner-border-sm me-2" />}Guardar
          </button>
        </div>
      </form>
    </>
  );
}