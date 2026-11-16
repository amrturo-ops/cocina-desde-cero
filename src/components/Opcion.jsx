// Opción grande seleccionable (dietas, comidas...). Se comporta como un interruptor accesible.
export default function Opcion({ icono, titulo, detalle, activa, onClick, disabled }) {
  return (
    <button type="button" className="opcion" aria-pressed={activa} onClick={onClick} disabled={disabled}>
      {icono && <span className="opcion__icono" aria-hidden="true">{icono}</span>}
      <span className="opcion__texto">
        <span className="opcion__titulo">{titulo}</span>
        {detalle && <span className="opcion__detalle">{detalle}</span>}
      </span>
      <span className="opcion__marca" aria-hidden="true">{activa ? '✓' : ''}</span>
    </button>
  );
}
