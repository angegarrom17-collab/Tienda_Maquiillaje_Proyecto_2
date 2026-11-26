import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { cursosApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useFormulario } from '../../hooks/useFormulario';
import { ESTADOS_CURSO, MODALIDADES_CURSO } from '../../utils/catalogos';
import { sinErrores, validarCurso } from '../../utils/validaciones';

const VACIO = {
  nombre: '', descripcion: '', fecha: '', hora: '', duracion_horas: '', precio: '',
  cupo_maximo: '', modalidad: '', estado: 'PROGRAMADO',
};

/** Crear (POST /api/cursos/) o editar (PUT /api/cursos/:id/) un curso. */
export default function CursoFormulario() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const notificar = useNotificaciones();
  const form = useFormulario(VACIO);
  const [cargando, setCargando] = useState(esEdicion);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [inscritos, setInscritos] = useState(0);

  useEffect(() => {
    if (!esEdicion) return;
    let vigente = true; // descarta respuestas de una carga anterior (StrictMode / cambio de id)
    cursosApi.obtener(id)
      .then((c) => {
        if (!vigente) return;
        setInscritos(c.inscritos ?? 0);
        form.reiniciar({
          nombre: c.nombre, descripcion: c.descripcion, fecha: c.fecha, hora: String(c.hora).slice(0, 5),
          duracion_horas: String(c.duracion_horas), precio: c.precio, cupo_maximo: String(c.cupo_maximo),
          modalidad: c.modalidad, estado: c.estado,
        });
      })
      .catch((e) => vigente && setErrorCarga(interpretarError(e)))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarCurso(form.valores);
    if (esEdicion && Number(form.valores.cupo_maximo) < inscritos) {
      errores.cupo_maximo = `No puede ser menor que las ${inscritos} inscripciones actuales.`;
    }
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (!sinErrores(errores)) return;

    const v = form.valores;
    const datos = { ...v, duracion_horas: Number(v.duracion_horas), cupo_maximo: Number(v.cupo_maximo) };
    setGuardando(true);
    try {
      const guardado = esEdicion ? await cursosApi.actualizar(id, datos) : await cursosApi.crear(datos);
      notificar.exito(esEdicion ? 'Curso actualizado.' : 'Curso registrado.');
      navigate(`/cursos/${guardado.id}`);
    } catch (err) {
      form.aplicarErrorApi(interpretarError(err));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Cargando />;
  if (errorCarga) return <AlertaError error={errorCarga} />;

  const { valores, errores, cambiar } = form;
  return (
    <>
      <EncabezadoPagina titulo={esEdicion ? 'Editar curso' : 'Nuevo curso'} icono="bi-mortarboard"
        migas={[{ texto: 'Cursos', a: '/cursos' }, { texto: esEdicion ? 'Editar' : 'Nuevo' }]} />
      <form className="card" onSubmit={guardar} noValidate>
        <div className="card-body">
          <AlertaError error={form.errorGeneral} />
          <div className="row g-3">
            <Campo className="col-md-8" etiqueta="Nombre del curso" name="nombre" valor={valores.nombre} onChange={cambiar}
              error={errores.nombre} requerido maxLength={150} />
            <Campo className="col-md-4" como="select" etiqueta="Modalidad" name="modalidad" valor={valores.modalidad}
              onChange={cambiar} error={errores.modalidad} requerido opciones={MODALIDADES_CURSO} />
            <Campo className="col-12" como="textarea" etiqueta="Descripción" name="descripcion" valor={valores.descripcion}
              onChange={cambiar} error={errores.descripcion} requerido />
            <Campo className="col-sm-6 col-md-3" etiqueta="Fecha" name="fecha" type="date" valor={valores.fecha}
              onChange={cambiar} error={errores.fecha} requerido />
            <Campo className="col-sm-6 col-md-3" etiqueta="Hora" name="hora" type="time" valor={valores.hora}
              onChange={cambiar} error={errores.hora} requerido />
            <Campo className="col-sm-6 col-md-3" etiqueta="Duración (horas)" name="duracion_horas" type="number" min="1" step="1"
              valor={valores.duracion_horas} onChange={cambiar} error={errores.duracion_horas} requerido />
            <Campo className="col-sm-6 col-md-3" etiqueta="Precio (₡)" name="precio" type="number" min="0.01" step="0.01"
              valor={valores.precio} onChange={cambiar} error={errores.precio} requerido />
            <Campo className="col-sm-6 col-md-3" etiqueta="Cupo máximo" name="cupo_maximo" type="number" min="1" step="1"
              valor={valores.cupo_maximo} onChange={cambiar} error={errores.cupo_maximo} requerido
              ayuda={esEdicion ? `Inscripciones activas: ${inscritos}` : undefined} />
            <Campo className="col-sm-6 col-md-3" como="select" etiqueta="Estado" name="estado" valor={valores.estado}
              onChange={cambiar} error={errores.estado} opcionVacia={null} opciones={ESTADOS_CURSO}
              ayuda="Solo los cursos programados aceptan inscripciones." />
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