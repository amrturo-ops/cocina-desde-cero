import Boton from './Boton.jsx';
import { ir } from '../hooks/useRuta.js';
import { PRECIO_PREMIUM, PRECIO_HABITUAL } from '../textos.js';

export default function TarjetaPremium({ titulo = '¿Quieres más recetas?', texto }) {
  return (
    <section className="proximo-nivel" aria-label="Premium">
      <p className="sello">{PRECIO_HABITUAL ? 'Precio de lanzamiento' : 'Premium · pago único'}</p>
      <h2>{titulo}</h2>
      <p>{texto ?? 'Desbloquea los niveles Básico y Cocinillas: 100 recetas más y 20 técnicas nuevas, de las croquetas a la paella.'}</p>
      <Boton onClick={() => ir('#premium')}>Ver Premium · {PRECIO_HABITUAL ? `${PRECIO_PREMIUM} (antes ${PRECIO_HABITUAL})` : PRECIO_PREMIUM}</Boton>
    </section>
  );
}
