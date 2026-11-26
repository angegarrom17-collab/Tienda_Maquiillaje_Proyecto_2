import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MENU } from './menu';

/** Navegación entre módulos con NavLink (sin recargar la página). */
export default function MenuLateral({ onNavegar }) {
  const { esPersonal } = useAuth();
  return (
    <nav className="nav flex-column gap-1">
      {MENU.map((opcion) => (opcion.titulo ? (
        <div key={opcion.titulo} className="menu-titulo">{opcion.titulo}</div>
      ) : (
        <NavLink
          key={opcion.a}
          to={opcion.a}
          end={opcion.exacto}
          onClick={onNavegar}
          className={({ isActive }) => `menu-enlace ${opcion.sub ? 'menu-sub' : ''} ${isActive ? 'activo' : ''}`}
        >
          <i className={`bi ${opcion.icono}`} />
          <span className="flex-grow-1">{opcion.texto}</span>
          {opcion.requierePersonal && !esPersonal && <i className="bi bi-lock small opacity-75" title="Requiere personal de la tienda" />}
        </NavLink>
      )))}
    </nav>
  );
}