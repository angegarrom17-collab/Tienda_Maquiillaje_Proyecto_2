import { useState } from 'react';
import { Link } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { categoriasApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import ConfirmarModal from '../../components/comunes/ConfirmarModal';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useEliminacion } from '../../hooks/useEliminacion';
import { useFormulario } from '../../hooks/useFormulario';
import { sinErrores, validarCategoria } from '../../utils/validaciones';

const VACIO = { nombre: '', descripcion: '' };

/** CRUD de categorías (catálogo del módulo Productos) en una sola pantalla. */
export default function CategoriasPagina() {
  const { puedeGestionar } = useAuth();
  const notificar = useNotificaciones();
  const { datos: categorias, cargando, error, recargar } = useConsulta(() => categoriasApi.listar(), []);
  const form = useFormulario(VACIO);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const eliminacion = useEliminacion((c) => categoriasApi.eliminar(c.id), { onExito: recargar, mensajeExito: 'Categoría eliminada.' });

  const puedeCrear = puedeGestionar('productos.add_categoria');
  const puedeEditar = puedeGestionar('productos.change_categoria');
  const formularioHabilitado = editando ? puedeEditar : puedeCrear;

  const iniciarEdicion = (categoria) => {
    setEditando(categoria);
    form.reiniciar({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '' });
  };
  const cancelarEdicion = () => {
    setEditando(null);
    form.reiniciar(VACIO);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarCategoria(form.valores);
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (!sinErrores(errores)) return;
    setGuardando(true);
    try {
      if (editando) await categoriasApi.actualizar(editando.id, form.valores);
      else await categoriasApi.crear(form.valores);
      notificar.exito(editando ? 'Categoría actualizada.' : 'Categoría creada.');
      cancelarEdicion();
      recargar();
    } catch (err) {
      form.aplicarErrorApi(interpretarError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Categorías" icono="bi-tags" subtitulo="Clasificación de los productos"
        migas={[{ texto: 'Productos', a: '/productos' }, { texto: 'Categorías' }]} />
      <div className="row g-3">
        <div className="col-lg-7 order-2 order-lg-1">
          <div className="card">
            {error && <div className="p-3"><AlertaError error={error} onReintentar={recargar} className="mb-0" /></div>}
            {cargando && <Cargando />}
            {!cargando && !error && categorias.length === 0 && <EstadoVacio titulo="No hay categorías" icono="bi-tags" />}
            {!cargando && !error && categorias.length > 0 && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Nombre</th><th className="d-none d-md-table-cell">Descripción</th><th className="text-center">Productos</th><th className="text-end">Acciones</th></tr></thead>
                  <tbody>
                    {categorias.map((c) => (
                      <tr key={c.id} className={editando?.id === c.id ? 'table-primary' : ''}>
                        <td className="fw-semibold">{c.nombre}</td>
                        <td className="d-none d-md-table-cell small text-secondary">{c.descripcion || '—'}</td>
                        <td className="text-center"><Link to={`/productos?categoria=${c.id}`} className="badge text-bg-light border text-decoration-none">{c.total_productos ?? 0}</Link></td>
                        <td className="text-end text-nowrap">
                          <BotonPermiso permitido={puedeEditar} onClick={() => iniciarEdicion(c)} className="btn btn-sm btn-outline-primary me-1" title="Editar"><i className="bi bi-pencil" /></BotonPermiso>
                          <BotonPermiso permitido={puedeGestionar('productos.delete_categoria')} onClick={() => eliminacion.pedir(c)} className="btn btn-sm btn-outline-danger" title="Eliminar"><i className="bi bi-trash" /></BotonPermiso>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5 order-1 order-lg-2">
          <form className="card" onSubmit={guardar} noValidate>
            <div className="card-header bg-white fw-semibold">{editando ? `Editar «${editando.nombre}»` : 'Nueva categoría'}</div>
            <fieldset className="card-body" disabled={!formularioHabilitado || guardando}>
              {!formularioHabilitado && <div className="alert alert-warning small"><i className="bi bi-lock me-1" />Su perfil no puede {editando ? 'editar' : 'crear'} categorías.</div>}
              <AlertaError error={form.errorGeneral} />
              <Campo className="mb-3" etiqueta="Nombre" name="nombre" valor={form.valores.nombre} onChange={form.cambiar}
                error={form.errores.nombre} requerido maxLength={80} ayuda="Único, mínimo 2 caracteres." />
              <Campo como="textarea" etiqueta="Descripción" name="descripcion" valor={form.valores.descripcion}
                onChange={form.cambiar} error={form.errores.descripcion} />
            </fieldset>
            <div className="card-footer bg-white d-flex justify-content-end gap-2">
              {editando && <button type="button" className="btn btn-outline-secondary" onClick={cancelarEdicion}>Cancelar</button>}
              <button type="submit" className="btn btn-primary" disabled={!formularioHabilitado || guardando}>
                {guardando && <span className="spinner-border spinner-border-sm me-2" />}{editando ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar categoría" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        ¿Desea eliminar la categoría <strong>{eliminacion.objetivo?.nombre}</strong>? Si tiene productos asociados, el sistema lo impedirá (409).
      </ConfirmarModal>
    </>
  );
}