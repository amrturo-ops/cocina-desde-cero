import { ir, rutaReceta } from '../hooks/useRuta.js';
import { DIFICULTADES } from '../lib/planner.js';

export default function TarjetaReceta({ receta }) {
  const { titulo, tiempoMin, disponible, cocinada, adaptada, origen, autor, estado, muestra } = receta;
  return (
    <button type="button" className={`receta ${disponible ? '' : 'receta--bloqueada'}`}
      onClick={() => ir(disponible ? rutaReceta(receta.id) : '#premium')}>
      <span className="receta__titulo">{titulo}</span>
      <span className="receta__datos">
        <span>{tiempoMin} min</span>
        <span className={`dificultad dificultad--${receta.dificultad ?? 2}`}>{DIFICULTADES[receta.dificultad ?? 2]}</span>
        {origen === 'propia' && <span className="sello">Tuya{estado === 'pendiente' ? ' · en revisión' : estado === 'aprobada' ? ' · publicada' : ''}</span>}
        {origen === 'comunidad' && <span className="sello">De {autor || 'la comunidad'}</span>}
        {muestra && <span className="sello sello--hecho">Muestra gratis</span>}
        {!disponible && <span className="sello">🔒 Premium</span>}
        {adaptada && <span className="sello">Adaptada a tu dieta</span>}
        {cocinada && <span className="sello sello--hecho">Cocinada ✓</span>}
      </span>
    </button>
  );
}
