import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/** Barra superior: botón de menú en móviles, identificación del usuario, perfil y cierre de sesión. */
export default function BarraSuperior({ onAbrirMenu }) {
  const { usuario, cerrarSesion } = useAuth();
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesion();
  };

  return (
    <header className="barra-superior d-flex align-items-center gap-2 px-3 px-lg-4">
      <button type="button" className="btn btn-outline-secondary d-lg-none" onClick={onAbrirMenu} aria-label="Abrir menú">
        <i className="bi bi-list" />
      </button>
      <div className="fw-semibold d-lg-none text-primary">Tienda de Maquillaje</div>
      <div className="ms-auto d-flex align-items-center gap-3">
        <div className="text-end lh-sm d-none d-sm-block">
          <div className="fw-semibold">{usuario?.nombre}</div>
          <small className="text-secondary">@{usuario?.username}</small>
        </div>
        <span className="badge rounded-pill text-bg-primary" title="Perfil de acceso">
          <i className="bi bi-person-badge me-1" />{usuario?.perfil}
        </span>
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={salir} disabled={saliendo}>
          {saliendo ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-box-arrow-right" />}
          <span className="d-none d-md-inline ms-1">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}