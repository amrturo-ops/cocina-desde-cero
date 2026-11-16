export default function Contador({ valor, min = 1, max = 8, onChange, etiqueta }) {
  return (
    <div className="contador" role="group" aria-label={etiqueta}>
      <button type="button" className="contador__boton" onClick={() => onChange(valor - 1)}
        disabled={valor <= min} aria-label="Uno menos">−</button>
      <output className="contador__valor" aria-live="polite">{valor}</output>
      <button type="button" className="contador__boton" onClick={() => onChange(valor + 1)}
        disabled={valor >= max} aria-label="Uno más">+</button>
    </div>
  );
}
