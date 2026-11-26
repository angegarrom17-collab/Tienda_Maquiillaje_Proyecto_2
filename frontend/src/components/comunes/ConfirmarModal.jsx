/** Ventana de confirmación (modal de Bootstrap controlado por React) antes de acciones destructivas. */
export default function ConfirmarModal({
  mostrar, titulo = 'Confirmar acción', children, textoConfirmar = 'Eliminar',
  variante = 'danger', procesando = false, onConfirmar, onCancelar,
}) {
  if (!mostrar) return null;
  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{titulo}</h5>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCancelar} disabled={procesando} />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancelar} disabled={procesando}>Cancelar</button>
              <button type="button" className={`btn btn-${variante}`} onClick={onConfirmar} disabled={procesando}>
                {procesando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                {textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}