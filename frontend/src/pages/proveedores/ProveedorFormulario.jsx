import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interpretarError } from '../../api/errores';
import { proveedoresApi } from '../../api/servicios';
import AlertaError from '../../components/comunes/AlertaError';
import Campo from '../../components/comunes/Campo';
import Cargando from '../../components/comunes/Cargando';
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useFormulario } from '../../hooks/useFormulario';
import { sinErrores, validarProveedor } from '../../utils/validaciones';

const VACIO = { nombre: '', telefono: '', correo: '', direccion: '', activo: true };

/** Crear (POST /api/proveedores/) o editar (PUT /api/proveedores/:id/) un proveedor. */
export default function ProveedorFormulario() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const notificar = useNotificaciones();
  const form = useFormulario(VACIO);
  const [cargando, setCargando] = useState(esEdicion);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!esEdicion) return;
    let vigente = true; // descarta respuestas de una carga anterior (StrictMode / cambio de id)
    proveedoresApi.obtener(id)
      .then((p) => vigente && form.reiniciar({ nombre: p.nombre, telefono: p.telefono, correo: p.correo, direccion: p.direccion, activo: p.activo }))
      .catch((e) => vigente && setErrorCarga(interpretarError(e)))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (e) => {
    e.preventDefault();
    const errores = validarProveedor(form.valores);
    form.setErrores(errores);
    form.setErrorGeneral(null);
    if (!sinErrores(errores)) return;
    setGuardando(true);
    try {
      const guardado = esEdicion ? await proveedoresApi.actualizar(id, form.valores) : await proveedoresApi.crear(form.valores);
      notificar.exito(esEdicion ? 'Proveedor actualizado.' : 'Proveedor registrado.');
      navigate(`/proveedores/${guardado.id}`);
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
      <EncabezadoPagina titulo={esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'} icono="bi-truck"
        migas={[{ texto: 'Proveedores', a: '/proveedores' }, { texto: esEdicion ? 'Editar' : 'Nuevo' }]} />
      <form className="card" onSubmit={guardar} noValidate>
        <div className="card-body">
          <AlertaError error={form.errorGeneral} />
          <div className="row g-3">
            <Campo className="col-md-6" etiqueta="Nombre" name="nombre" valor={valores.nombre} onChange={cambiar}
              error={errores.nombre} requerido maxLength={120} ayuda="Mínimo 3 caracteres." />
            <Campo className="col-md-6" etiqueta="Correo electrónico" name="correo" type="email" valor={valores.correo}
              onChange={cambiar} error={errores.correo} requerido ayuda="Debe ser único." />
            <Campo className="col-md-4" etiqueta="Teléfono" name="telefono" type="tel" inputMode="numeric" maxLength={8}
              valor={valores.telefono} onChange={cambiar} error={errores.telefono} requerido ayuda="Exactamente 8 dígitos." />
            <Campo className="col-md-8" etiqueta="Dirección" name="direccion" valor={valores.direccion} onChange={cambiar}
              error={errores.direccion} requerido maxLength={200} ayuda="Mínimo 10 caracteres." />
            <Campo className="col-12" como="switch" etiqueta="Proveedor activo (puede recibir entradas y asignarse a productos)"
              name="activo" valor={valores.activo} onChange={cambiar} error={errores.activo} />
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