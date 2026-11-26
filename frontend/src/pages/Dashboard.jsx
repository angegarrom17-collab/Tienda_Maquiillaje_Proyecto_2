import { Link } from 'react-router-dom';
import { interpretarError } from '../api/errores';
import {
  clientesApi, cursosApi, facturasApi, productosApi, proveedoresApi,
} from '../api/servicios';
import AlertaError from '../components/comunes/AlertaError';
import Cargando from '../components/comunes/Cargando';
import EncabezadoPagina from '../components/comunes/EncabezadoPagina';
import EstadoVacio from '../components/comunes/EstadoVacio';
import { useAuth } from '../context/AuthContext';
import { useConsulta } from '../hooks/useConsulta';
import { formatoFecha, formatoHora, formatoMoneda } from '../utils/formato';

const MODULOS = [
  { a: '/clientes', texto: 'Clientes', icono: 'bi-people', desc: 'Registro y contacto de clientes' },
  { a: '/productos', texto: 'Productos', icono: 'bi-bag-heart', desc: 'Inventario, categorías y stock' },
  { a: '/cursos', texto: 'Cursos', icono: 'bi-mortarboard', desc: 'Cursos e inscripciones' },
  { a: '/proveedores', texto: 'Proveedores', icono: 'bi-truck', desc: 'Proveedores y entradas' },
  { a: '/facturas', texto: 'Facturas', icono: 'bi-receipt', desc: 'Ventas de productos y cursos' },
];

/**
 * Todas las consultas se lanzan en paralelo con Promise.allSettled:
 * si una falla (por ejemplo 403 en estadísticas para un perfil sin personal),
 * las demás se muestran igual.
 */
async function cargarIndicadores() {
  const consultas = {
    clientes: clientesApi.listar({ activo: 'true' }),
    stockBajo: productosApi.listar({ stock_bajo: 1, ordering: 'stock' }),
    cursos: cursosApi.listar({ estado: 'PROGRAMADO', ordering: 'fecha' }),
    proveedores: proveedoresApi.listar({ activo: 'true' }),
    facturacion: facturasApi.estadisticas(),
    estadProductos: productosApi.estadisticas(),
    estadCursos: cursosApi.estadisticas(),
  };
  const claves = Object.keys(consultas);
  const resultados = await Promise.allSettled(Object.values(consultas));
  return Object.fromEntries(resultados.map((r, i) => [
    claves[i],
    r.status === 'fulfilled' ? { ok: true, datos: r.value } : { ok: false, error: interpretarError(r.reason) },
  ]));
}

function Indicador({ titulo, icono, color, resultado, valor, detalle, a }) {
  let contenido;
  if (!resultado.ok) {
    contenido = (
      <div className="small text-secondary">
        <i className="bi bi-lock me-1" />
        {resultado.error.estado === 403 ? 'Requiere perfil de personal (403)' : resultado.error.titulo}
      </div>
    );
  } else {
    contenido = (
      <>
        <div className="fs-3 fw-bold lh-1">{valor(resultado.datos)}</div>
        {detalle && <div className="small text-secondary mt-1">{detalle(resultado.datos)}</div>}
      </>
    );
  }
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card h-100 indicador">
        <div className="card-body d-flex gap-3">
          <div className={`indicador-icono bg-${color}-subtle text-${color}-emphasis`}><i className={`bi ${icono}`} /></div>
          <div className="flex-grow-1">
            <div className="text-secondary small mb-1">{titulo}</div>
            {contenido}
          </div>
        </div>
        {a && resultado.ok && <Link to={a} className="stretched-link" aria-label={`Ver ${titulo}`} />}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const { datos, cargando, error, recargar } = useConsulta(cargarIndicadores, []);

  return (
    <>
      <EncabezadoPagina titulo={`Hola, ${usuario?.nombre}`} subtitulo="Resumen general con datos en tiempo real de la API" icono="bi-speedometer2">
        <button type="button" className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="bi bi-arrow-clockwise me-1" />Actualizar
        </button>
      </EncabezadoPagina>

      <AlertaError error={error} onReintentar={recargar} />
      {cargando && !datos && <Cargando texto="Cargando indicadores…" />}

      {datos && (
        <>
          <div className="row g-3 mb-4">
            <Indicador titulo="Clientes activos" icono="bi-people" color="primary" resultado={datos.clientes}
              valor={(d) => d.total_registros} a="/clientes?activo=true" />
            <Indicador titulo="Productos con stock bajo" icono="bi-exclamation-triangle" color="warning" resultado={datos.stockBajo}
              valor={(d) => d.total_registros} />
            <Indicador titulo="Cursos programados" icono="bi-calendar-event" color="info" resultado={datos.cursos}
              valor={(d) => d.total_registros} a="/cursos?estado=PROGRAMADO" />
            <Indicador titulo="Proveedores activos" icono="bi-truck" color="success" resultado={datos.proveedores}
              valor={(d) => d.total_registros} a="/proveedores?activo=true" />
            <Indicador titulo="Ingresos (facturas pagadas)" icono="bi-cash-coin" color="success" resultado={datos.facturacion}
              valor={(d) => formatoMoneda(d.ingresos_totales)} />
            <Indicador titulo="Facturas pendientes" icono="bi-hourglass-split" color="warning" resultado={datos.facturacion}
              valor={(d) => d.facturas_pendientes} a="/facturas?estado=PENDIENTE" />
            <Indicador titulo="Inscripciones activas" icono="bi-person-check" color="primary" resultado={datos.estadCursos}
              valor={(d) => d.inscripciones_activas}
              />
            <Indicador titulo="Productos activos" icono="bi-bag-check" color="danger" resultado={datos.estadProductos}
              valor={(d) => d.productos_activos}
              />
          </div>

          <h2 className="h6 text-uppercase text-secondary mb-3">Accesos a los módulos</h2>
          <div className="row g-3 mb-4">
            {MODULOS.map((m) => (
              <div key={m.a} className="col-6 col-md-4 col-xl">
                <Link to={m.a} className="card h-100 text-decoration-none modulo-acceso">
                  <div className="card-body">
                    <i className={`bi ${m.icono} fs-3 text-primary`} />
                    <div className="fw-semibold mt-2 text-body">{m.texto}</div>
                    <div className="small text-secondary">{m.desc}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}