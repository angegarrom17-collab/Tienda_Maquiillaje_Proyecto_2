import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { clientesApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useFormulario } from '../../hooks/useFormulario';
import { sinErrores, validarCliente } from '../../utils/validaciones';

const VACIO = { cedula: '', nombre: '', email: '', telefono: '', direccion: '', activo: true };

/** Crear (POST /api/clientes/) o editar (PUT /api/clientes/:id/) un cliente. */
export default function ClienteFormulario() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const notificar = useNotificaciones();
  const form = useFormulario(VACIO);
  const [cargando, setCargando] = useState(esEdicion);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Precarga de valores al editar
  useEffect(() => {
    if (!esEdicion) return;
    let vigente = true; // descarta respuestas de una carga anterior (StrictMode / cambio de id)
    clientesApi.obtener(id)
      .then((c) => vigente && form.reiniciar({
        cedula: c.cedula, nombre: c.nombre, email: c.email,
        telefono: c.telefono ?? '', direccion: c.direccion ?? '', activo: c.activo,
      }))
      .catch((e) => vigente && setErrorCarga(interpretarError(e)))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarCliente(form.valores);
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (!sinErrores(errores)) return;

    setGuardando(true);
    const datos = { ...form.valores, cedula: form.valores.cedula.trim(), email: form.valores.email.trim() };
    try {
      const guardado = esEdicion ? await clientesApi.actualizar(id, datos) : await clientesApi.crear(datos);
      notificar.exito(esEdicion ? 'Cliente actualizado.' : 'Cliente registrado.');
      navigate(`/clientes/${guardado.id}`);
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
      <EncabezadoPagina titulo={esEdicion ? 'Editar cliente' : 'Nuevo cliente'} icono="bi-person-plus"
        migas={[{ texto: 'Clientes', a: '/clientes' }, { texto: esEdicion ? 'Editar' : 'Nuevo' }]} />
      <form className="card" onSubmit={guardar} noValidate>
        <div className="card-body">
          <AlertaError error={form.errorGeneral} />
          <div className="row g-3">
            <Campo className="col-md-4" etiqueta="Cédula" name="cedula" valor={valores.cedula} onChange={cambiar}
              error={errores.cedula} requerido maxLength={20} ayuda="Mínimo 5 caracteres; no puede repetirse." />
            <Campo className="col-md-8" etiqueta="Nombre completo" name="nombre" valor={valores.nombre} onChange={cambiar}
              error={errores.nombre} requerido maxLength={120} />
            <Campo className="col-md-6" etiqueta="Correo electrónico" name="email" type="email" valor={valores.email}
              onChange={cambiar} error={errores.email} requerido ayuda="Debe ser único." />
            <Campo className="col-md-6" etiqueta="Teléfono" name="telefono" type="tel" valor={valores.telefono}
              onChange={cambiar} error={errores.telefono} maxLength={20} />
            <Campo className="col-12" etiqueta="Dirección" name="direccion" valor={valores.direccion}
              onChange={cambiar} error={errores.direccion} maxLength={255} />
            <Campo className="col-12" como="switch" etiqueta="Cliente activo (puede facturar e inscribirse)" name="activo"
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
