import { Link } from 'react-router-dom';
import { cursosApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import BotonPermiso from '../../components/comunes/BotonPermiso';
import Cargando from '../../components/comunes/Cargando';
import ConfirmarModal from '../../components/comunes/ConfirmarModal';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import EstadoVacio from '../../components/comunes/EstadoVacio';
import Insignia from '../../components/comunes/Insignia';
import Paginacion from '../../components/comunes/Paginacion';
import { useAuth } from '../../context/AuthContext';
import { useConsulta } from '../../hooks/useConsulta';
import { useEliminacion } from '../../hooks/useEliminacion';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { ESTADOS_CURSO, MODALIDADES_CURSO, textoDe } from '../../utils/catalogos';
import { formatoFecha, formatoHora, formatoMoneda } from '../../utils/formato';

const ORDENES = [
  { valor: '', texto: 'Registro' },
  { valor: 'fecha', texto: 'Fecha más próxima' },
  { valor: '-fecha', texto: 'Fecha más lejana' },
  { valor: 'precio', texto: 'Precio menor a mayor' },
  { valor: '-precio', texto: 'Precio mayor a menor' },
  { valor: 'nombre', texto: 'Nombre A → Z' },
];

/** GET /api/cursos/?estado=&modalidad=&ordering=&page= (filtros combinables en el backend). */
export default function CursosLista() {
  const { puedeGestionar } = useAuth();
  const { filtros, paraApi, actualizar, limpiar } = useFiltrosUrl({ estado: '', modalidad: '', ordering: '' });
  const { datos, cargando, error, recargar } = useConsulta(() => cursosApi.listar(paraApi), [JSON.stringify(paraApi)]);
  const eliminacion = useEliminacion((c) => cursosApi.eliminar(c.id), { onExito: recargar, mensajeExito: 'Curso eliminado.' });

  const hayFiltros = filtros.estado || filtros.modalidad || filtros.ordering;
  const cursos = datos?.resultados ?? [];

  return (
    <>
      <EncabezadoPagina titulo="Cursos" icono="bi-mortarboard" migas={[{ texto: 'Cursos' }]} subtitulo="Cursos de maquillaje y cuidado de la piel">
        <BotonPermiso permitido={puedeGestionar('cursos.add_curso')} a="/cursos/nuevo">
          <i className="bi bi-plus-lg me-1" />Nuevo curso
        </BotonPermiso>
      </EncabezadoPagina>

      <div className="card">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small text-secondary mb-1" htmlFor="f-estado">Estado</label>
              <select id="f-estado" className="form-select" value={filtros.estado} onChange={(e) => actualizar({ estado: e.target.value })}>
                <option value="">Todos</option>
                {ESTADOS_CURSO.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small text-secondary mb-1" htmlFor="f-modalidad">Modalidad</label>
              <select id="f-modalidad" className="form-select" value={filtros.modalidad} onChange={(e) => actualizar({ modalidad: e.target.value })}>
                <option value="">Todas</option>
                {MODALIDADES_CURSO.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small text-secondary mb-1" htmlFor="f-orden">Ordenar por</label>
              <select id="f-orden" className="form-select" value={filtros.ordering} onChange={(e) => actualizar({ ordering: e.target.value })}>
                {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg-3">
              <button type="button" className="btn btn-outline-secondary w-100" onClick={limpiar} disabled={!hayFiltros}>
                <i className="bi bi-x-circle me-1" />Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {error && <div className="p-3"><AlertaError error={error} onReintentar={recargar} className="mb-0" /></div>}
        {cargando && <Cargando texto="Consultando cursos…" />}
        {!cargando && !error && cursos.length === 0 && (
          <EstadoVacio titulo={hayFiltros ? 'Ningún curso coincide con los filtros' : 'Aún no hay cursos'} icono="bi-calendar-x" />
        )}
        {!cargando && !error && cursos.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Curso</th><th>Fecha</th><th className="d-none d-md-table-cell">Modalidad</th>
                  <th className="text-end d-none d-sm-table-cell">Precio</th><th className="text-center">Cupos</th><th>Estado</th><th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((c) => {
                  const lleno = (c.inscritos ?? 0) >= c.cupo_maximo;
                  return (
                    <tr key={c.id}>
                      <td><Link to={`/cursos/${c.id}`} className="fw-semibold">{c.nombre}</Link>
                        <div className="small text-secondary">{c.duracion_horas} h</div></td>
                      <td className="text-nowrap">{formatoFecha(c.fecha)}<div className="small text-secondary">{formatoHora(c.hora)}</div></td>
                      <td className="d-none d-md-table-cell"><Insignia valor={c.modalidad} texto={textoDe(MODALIDADES_CURSO, c.modalidad)} /></td>
                      <td className="text-end d-none d-sm-table-cell text-nowrap">{formatoMoneda(c.precio)}</td>
                      <td className="text-center">
                        <span className="badge text-bg-light border">{c.inscritos ?? 0}/{c.cupo_maximo}</span>
                      </td>
                      <td><Insignia valor={c.estado} texto={textoDe(ESTADOS_CURSO, c.estado)} /></td>
                      <td className="text-end text-nowrap">
                        <Link to={`/cursos/${c.id}`} className="btn btn-sm btn-outline-secondary me-1" title="Ver detalle e inscripciones"><i className="bi bi-eye" /></Link>
                        <BotonPermiso permitido={puedeGestionar('cursos.change_curso')} a={`/cursos/${c.id}/editar`}
                          className="btn btn-sm btn-outline-primary me-1" title="Editar"><i className="bi bi-pencil" /></BotonPermiso>
                        <BotonPermiso permitido={puedeGestionar('cursos.delete_curso')} onClick={() => eliminacion.pedir(c)}
                          className="btn btn-sm btn-outline-danger" title="Eliminar"><i className="bi bi-trash" /></BotonPermiso>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!error && <Paginacion datos={datos} onCambiar={(page) => actualizar({ page })} />}
      </div>

      <ConfirmarModal mostrar={Boolean(eliminacion.objetivo)} titulo="Eliminar curso" procesando={eliminacion.procesando}
        onConfirmar={eliminacion.confirmar} onCancelar={eliminacion.cancelar}>
        <p className="mb-1">¿Desea eliminar el curso <strong>{eliminacion.objetivo?.nombre}</strong>?</p>
        <p className="small text-secondary mb-0">No se permite si tiene inscripciones o facturas (409). Puede cambiar su estado a Cancelado.</p>
      </ConfirmarModal>
    </>
  );
}