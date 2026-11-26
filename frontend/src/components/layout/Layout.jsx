import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BarraSuperior from './BarraSuperior';
import MenuLateral from './MenuLateral';

function Marca() {
  return (
    <div className="d-flex align-items-center gap-2 px-2 mb-4">
      <img src="/favicon.svg" alt="" width="34" height="34" />
      <div className="lh-sm">
        <div className="fw-bold">Tienda de Maquillaje</div>
        <small className="text-white-50">Panel de gestión</small>
      </div>
    </div>
  );
}

/**
 * Estructura principal de la SPA: menú lateral fijo en escritorio,
 * menú desplegable (offcanvas) en móviles y área principal que cambia con <Outlet />.
 */
export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <div className="app-contenedor">
      <aside className="menu-lateral d-none d-lg-flex flex-column p-3">
        <Marca />
        <MenuLateral />
      </aside>

      {menuAbierto && (
        <>
          <div className="offcanvas offcanvas-start show menu-lateral" tabIndex="-1" style={{ visibility: 'visible' }}>
            <div className="offcanvas-header pb-0">
              <span />
              <button type="button" className="btn-close btn-close-white" aria-label="Cerrar" onClick={cerrarMenu} />
            </div>
            <div className="offcanvas-body pt-0">
              <Marca />
              <MenuLateral onNavegar={cerrarMenu} />
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" onClick={cerrarMenu} />
        </>
      )}

      <div className="app-principal">
        <BarraSuperior onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="p-3 p-lg-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}