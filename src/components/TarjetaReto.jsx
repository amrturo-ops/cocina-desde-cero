export default function TarjetaReto({ reto }) {
  const { hechas, objetivo, cumplido, racha, diasQuedan } = reto;
  return (
    <section className={`reto ${cumplido ? 'reto--cumplido' : ''}`} aria-label="Reto de la semana">
      <div className="reto__platos" aria-hidden="true">
        {Array.from({ length: objetivo }, (_, i) => <span key={i} className={i < hechas ? 'lleno' : ''}>{i < hechas ? '🍽' : ''}</span>)}
      </div>
      <div className="reto__texto">
        <strong>{cumplido ? '¡Reto de la semana cumplido!' : `Reto: ${hechas} de ${objetivo} recetas con foto`}</strong>
        <span className="ayuda">
          {cumplido ? 'Vuelve el lunes a por el siguiente.' : `Quedan ${diasQuedan} ${diasQuedan === 1 ? 'día' : 'días'}.`}
          {racha > 0 && ` Racha: ${racha} ${racha === 1 ? 'semana' : 'semanas'} 🔥`}
        </span>
      </div>
    </section>
  );
}
