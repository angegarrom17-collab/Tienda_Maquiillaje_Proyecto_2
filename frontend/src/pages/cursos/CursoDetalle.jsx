import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { clientesApi, cursosApi, inscripcionesApi, obtenerTodos } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
import Cargando from '../../components/comunes/Cargando';
import ConfirmarModal from '../../components/comunes/ConfirmarModal';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import FilaDato from '../../components/comunes/FilaDato';
import Insignia from '../../components/comunes/Insignia';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useEliminacion } from '../../hooks/useEliminacion';
import { ESTADOS_CURSO, ESTADOS_INSCRIPCION, MODALIDADES_CURSO, textoDe } from '../../utils/catalogos';
import { formatoFecha, formatoFechaHora, formatoHora, formatoMoneda } from '../../utils/formato';

/**
 * Detalle del curso y su relación con Clientes por medio de InscripcionCurso:
 * - GET  /api/cursos/:id/inscripciones/
 * - POST /api/cursos/:id/inscripciones/   (inscribir cliente activo)
 * - PATCH/DELETE /api/cursos/inscripciones/:id/
 */
export default function CursoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notificar = useNotificaciones();
  const { puede, puedeGestionar } = useAuth();

  const curso = useConsulta(() => cursosApi.obtener(id), [id]);
  const inscripciones = useConsulta(() => cursosApi.inscripciones(id), [id]);
  const puedeInscribir = puede('cursos.add_inscripcioncurso');
  const clientes = useConsulta(
    () => (puedeInscribir ? obtenerTodos(clientesApi, { activo: 'true' }) : Promise.resolve([])),
    [puedeInscribir],
  );

  const [clienteElegido, setClienteElegido] = useState('');
  const [errorInscripcion, setErrorInscripcion] = useState(null);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [cambiando, setCambiando] = useState(null);

  const recargarTodo = () => { curso.recargar(); inscripciones.recargar(); };

  const eliminarCurso = useEliminacion(() => cursosApi.eliminar(id), { mensajeExito: 'Curso eliminado.', onExito: () => navigate('/cursos') });
  const eliminarInscripcion = useEliminacion((i) => inscripcionesApi.eliminar(i.id), { mensajeExito: 'Inscripción eliminada.', onExito: recargarTodo });

  const clientesDisponibles = useMemo(() => {
    const yaInscritos = new Set((inscripciones.datos ?? []).map((i) => i.cliente));
    return (clientes.datos ?? []).filter((c) => !yaInscritos.has(c.id));
  }, [clientes.datos, inscripciones.datos]);

  if (curso.cargando) return <Cargando />;
  if (curso.error) return <AlertaError error={curso.error} onReintentar={curso.recargar} />;

  const c = curso.datos;
  const activos = (inscripciones.datos ?? []).filter((i) => i.estado === 'inscrita').length;
  const lleno = activos >= c.cupo_maximo;
  const programado = c.estado === 'PROGRAMADO';

  const inscribir = async (e) => {
    e.preventDefault();
    if (!clienteElegido) {
      setErrorInscripcion({ estado: 400, titulo: 'Datos no válidos', mensaje: 'Seleccione un cliente.' });
      return;
    }
    setInscribiendo(true);
    setErrorInscripcion(null);
    try {
      await cursosApi.inscribir(id, { cliente: Number(clienteElegido) });
      notificar.exito('Cliente inscrito en el curso.');
      setClienteElegido('');
      recargarTodo();
    } catch (err) {
      setErrorInscripcion(interpretarError(err));
    } finally {
      setInscribiendo(false);
    }
  };

  const cambiarEstado = async (inscripcion) => {
    const nuevo = inscripcion.estado === 'inscrita' ? 'cancelada' : 'inscrita';
    setCambiando(inscripcion.id);
    try {
      await inscripcionesApi.modificar(inscripcion.id, { estado: nuevo });
      notificar.exito(nuevo === 'cancelada' ? 'Inscripción cancelada; se liberó un cupo.' : 'Inscripción reactivada.');
      recargarTodo();
    } catch (err) {
      const info = interpretarError(err);
      notificar.error(`${info.titulo}: ${info.mensaje}`);
    } finally {
      setCambiando(null);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo={c.nombre} icono="bi-mortarboard" migas={[{ texto: 'Cursos', a: '/cursos' }, { texto: c.nombre }]}>
        <BotonPermiso permitido={puedeGestionar('cursos.change_curso')} a={`/cursos/${id}/editar`}><i className="bi bi-pencil me-1" />Editar</BotonPermiso>
        <BotonPermiso permitido={puedeGestionar('cursos.delete_curso')} onClick={() => eliminarCurso.pedir(c)} className="btn btn-outline-danger">
          <i className="bi bi-trash me-1" />Eliminar
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-header bg-white fw-semibold">Información del curso</div>
            <dl className="card-body mb-0">
              <FilaDato etiqueta="Estado"><Insignia valor={c.estado} texto={textoDe(ESTADOS_CURSO, c.estado)} /></FilaDato>
              <FilaDato etiqueta="Modalidad">{textoDe(MODALIDADES_CURSO, c.modalidad)}</FilaDato>
              <FilaDato etiqueta="Fecha y hora">{formatoFecha(c.fecha)} · {formatoHora(c.hora)}</FilaDato>
              <FilaDato etiqueta="Duración">{c.duracion_horas} horas</FilaDato>
              <FilaDato etiqueta="Precio">{formatoMoneda(c.precio)}</FilaDato>
              <FilaDato etiqueta="Descripción">{c.descripcion}</FilaDato>
            </dl>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between small mb-1"><span>Cupos ocupados</span><strong>{activos} / {c.cupo_maximo}</strong></div>
              <div className="progress" role="progressbar" aria-valuenow={activos} aria-valuemin={0} aria-valuemax={c.cupo_maximo}>
                <div className="progress-bar"style={{ width: `${Math.min(100, (activos / c.cupo_maximo) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card">
            <div className="card-header bg-white fw-semibold d-flex justify-content-between">
              <span>Inscripciones</span>
              <span className="badge text-bg-light border">{(inscripciones.datos ?? []).length}</span>
            </div>

            <form className="card-body border-bottom" onSubmit={inscribir}>
              {!puedeInscribir && <div className="small text-secondary"><i className="bi bi-lock me-1" />Su perfil no puede registrar inscripciones.</div>}
              {puedeInscribir && !programado && <div className="small text-secondary"><i className="bi bi-info-circle me-1" />Solo los cursos programados aceptan inscripciones.</div>}
              {puedeInscribir && programado && (
                <>
                  <AlertaError error={errorInscripcion} className="py-2" />
                  <label htmlFor="cliente-inscribir" className="form-label">Inscribir cliente activo</label>
                  <div className="input-group">
                    <select id="cliente-inscribir" className="form-select" value={clienteElegido}
                      onChange={(e) => setClienteElegido(e.target.value)} disabled={clientes.cargando || inscribiendo}>
                      <option value="">{clientes.cargando ? 'Cargando clientes…' : 'Seleccione un cliente…'}</option>
                      {clientesDisponibles.map((cl) => <option key={cl.id} value={cl.id}>{cl.nombre} · {cl.cedula}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary" disabled={inscribiendo}>
                      {inscribiendo ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-person-plus me-1" />Inscribir</>}
                    </button>
                  </div>
                  {lleno && <div className="form-text text-danger">El curso está lleno: el servidor rechazará nuevas inscripciones.</div>}
                </>
              )}
            </form>

            {inscripciones.cargando && <Cargando />}
            {inscripciones.error && <div className="p-3"><AlertaError error={inscripciones.error} className="mb-0" /></div>}
            {!inscripciones.cargando && !inscripciones.error && inscripciones.datos.length === 0 && (
              <EstadoVacio titulo="Sin inscripciones" texto="Aún no hay clientes inscritos en este curso." icono="bi-person-x" />
            )}
            {!inscripciones.cargando && !inscripciones.error && inscripciones.datos.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Cliente</th><th className="d-none d-md-table-cell">Fecha</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
                  <tbody>
                    {inscripciones.datos.map((i) => (
                      <tr key={i.id}>
                        <td><Link to={`/clientes/${i.cliente}`}>{i.nombre_cliente}</Link><div className="small text-secondary">{i.cedula_cliente}</div></td>
                        <td className="d-none d-md-table-cell small">{formatoFechaHora(i.fecha_inscripcion)}</td>
                        <td><Insignia valor={i.estado} texto={textoDe(ESTADOS_INSCRIPCION, i.estado)} /></td>
                        <td className="text-end text-nowrap">
                          <BotonPermiso permitido={puedeGestionar('cursos.change_inscripcioncurso')} onClick={() => cambiarEstado(i)}
                            className={`btn btn-sm me-1 ${i.estado === 'inscrita' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            disabled={cambiando === i.id} title={i.estado === 'inscrita' ? 'Cancelar inscripción' : 'Reactivar inscripción'}>
                            <i className={`bi ${i.estado === 'inscrita' ? 'bi-x-circle' : 'bi-arrow-counterclockwise'}`} />
                          </BotonPermiso>
                          <BotonPermiso permitido={puedeGestionar('cursos.delete_inscripcioncurso')} onClick={() => eliminarInscripcion.pedir(i)}
                            className="btn btn-sm btn-outline-danger" title="Eliminar inscripción"><i className="bi bi-trash" /></BotonPermiso>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmarModal mostrar={Boolean(eliminarCurso.objetivo)} titulo="Eliminar curso" procesando={eliminarCurso.procesando}
        onConfirmar={eliminarCurso.confirmar} onCancelar={eliminarCurso.cancelar}>
        ¿Desea eliminar <strong>{c.nombre}</strong>? No se permite si tiene inscripciones (409).
      </ConfirmarModal>
      <ConfirmarModal mostrar={Boolean(eliminarInscripcion.objetivo)} titulo="Eliminar inscripción" procesando={eliminarInscripcion.procesando}
        onConfirmar={eliminarInscripcion.confirmar} onCancelar={eliminarInscripcion.cancelar}>
        ¿Desea eliminar la inscripción de <strong>{eliminarInscripcion.objetivo?.nombre_cliente}</strong>? Para conservar el historial puede cancelarla en lugar de eliminarla.
      </ConfirmarModal>
    </>
  );
}