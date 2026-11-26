import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productosApi, proveedoresApi } from '../../api/servicios';
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
import { formatoMoneda } from '../../utils/formato';

/** Detalle del proveedor y sus productos: GET /api/productos/?proveedor=:id&page= */
export default function ProveedorDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { puedeGestionar } = useAuth();
  const [pagina, setPagina] = useState(1);
  const proveedor = useConsulta(() => proveedoresApi.obtener(id), [id]);
  const productos = useConsulta(() => productosApi.listar({ proveedor: id, page: pagina }), [id, pagina]);
  const eliminacion = useEliminacion(() => proveedoresApi.eliminar(id), { mensajeExito: 'Proveedor eliminado.', onExito: () => navigate('/proveedores') });

  if (proveedor.cargando) return <Cargando />;
  if (proveedor.error) return <AlertaError error={proveedor.error} onReintentar={proveedor.recargar} />;
  const p = proveedor.datos;

  return (
    <>
      <EncabezadoPagina titulo={p.nombre} icono="bi-truck" migas={[{ texto: 'Proveedores', a: '/proveedores' }, { texto: p.nombre }]}>
        <BotonPermiso permitido={puedeGestionar('proveedores.add_entradaproducto') && p.activo}
          motivo={p.activo ? undefined : 'Solo proveedores activos reciben entradas'}
          a={`/proveedores/entradas?proveedor=${p.id}`} className="btn btn-outline-success">
          <i className="bi bi-box-arrow-in-down me-1" />Registrar entrada
        </BotonPermiso>
        <BotonPermiso permitido={puedeGestionar('proveedores.change_proveedor')} a={`/proveedores/${id}/editar`}><i className="bi bi-pencil me-1" />Editar</BotonPermiso>
        <BotonPermiso permitido={puedeGestionar('proveedores.delete_proveedor')} onClick={() => eliminacion.pedir(p)} className="btn btn-outline-danger">
          <i className="bi bi-trash me-1" />Eliminar
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Datos de contacto</div>
            <dl className="card-body mb-0">
              <FilaDato etiqueta="Teléfono">{p.telefono}</FilaDato>
              <FilaDato etiqueta="Correo"><a href={`mailto:${p.correo}`}>{p.correo}</a></FilaDato>
              <FilaDato etiqueta="Dirección">{p.direccion}</FilaDato>
              <FilaDato etiqueta="Estado"><Insignia valor={p.activo} /></FilaDato>
            </dl>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Productos que suministra</div>
            {productos.cargando && <Cargando />}
            {productos.error && <div className="p-3"><AlertaError error={productos.error} className="mb-0" /></div>}
            {!productos.cargando && !productos.error && productos.datos.resultados.length === 0 && (
              <EstadoVacio titulo="Este proveedor no tiene productos asignados" icono="bi-bag" />
            )}
            {!productos.cargando && !productos.error && productos.datos.resultados.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Producto</th><th className="text-end">Precio</th><th className="text-center">Stock</th></tr></thead>
                  <tbody>
                    {productos.datos.resultados.map((pr) => (
                      <tr key={pr.id}>
                        <td><Link to={`/productos/${pr.id}`}>{pr.nombre}</Link></td>
                        <td className="text-end">{formatoMoneda(pr.precio)}</td>
                        <td className="text-center">{pr.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!productos.error && <Paginacion datos={productos.datos} onCambiar={setPagina} />}
          </div>
        </div>
      </div>

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar proveedor" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        ¿Desea eliminar <strong>{p.nombre}</strong>? No se permite si tiene productos o entradas (409).
      </ConfirmarModal>
    </>
  );
}