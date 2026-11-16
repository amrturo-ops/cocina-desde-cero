export default function Pasos({ actual, total }) {
  return (
    <div className="pasos" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={actual}
      aria-label={`Paso ${actual} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`pasos__tramo ${i < actual ? 'pasos__tramo--hecho' : ''}`} />
      ))}
    </div>
  );
}
