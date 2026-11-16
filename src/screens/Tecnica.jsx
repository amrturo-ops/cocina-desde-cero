import { useState } from 'react';
import Cabecera from '../components/Cabecera.jsx';
import TarjetaReceta from '../components/TarjetaReceta.jsx';
import { ILUSTRACIONES } from '../lib/ilustraciones.js';

function Paso({ paso, numero }) {
  const [hayImagen, setHayImagen] = useState(Boolean(paso.imagen));
  return (
    <li className="paso">
      <span className="paso__numero" aria-hidden="true">{numero}</span>
      <div className="paso__contenido">
        {hayImagen && <img src={`./${paso.imagen}`} alt="" loading="lazy" onError={() => setHayImagen(false)} />}
        <p>{paso.texto}</p>
      </div>
    </li>
  );
}

export default function Tecnica({ progreso, id }) {
  const indice = progreso.tecnicas.findIndex((t) => t.id === id);
  const t = progreso.tecnicas[indice];
  if (!t) return <main className="pantalla"><Cabecera /><h1>No encontramos esta técnica</h1></main>;

  return (
    <main className="pantalla">
      <Cabecera />
      <div className="pantalla__cuerpo">
        {ILUSTRACIONES[t.id] && <div className="ilustracion" dangerouslySetInnerHTML={{ __html: ILUSTRACIONES[t.id] }} />}
        <h1>{t.titulo}</h1>
        <p>{t.resumen}</p>
        {t.estado === 'dominada' && <p className="logro">Técnica dominada. ¡Bien hecho!</p>}

        {t.video && <video className="video" src={`./${t.video}`} controls playsInline preload="metadata" />}

        <h2>Cómo se hace</h2>
        <ol className="pasos-tecnica">
          {t.pasos.map((p, i) => <Paso key={i} paso={p} numero={i + 1} />)}
        </ol>

        <h2>Practícala</h2>
        <p className="ayuda">Cocina {t.objetivo} recetas distintas para dominarla. Llevas {Math.min(t.hechas, t.objetivo)}.</p>
        {t.recetas.length ? (
          <div className="recetas">{t.recetas.map((r) => <TarjetaReceta key={r.id} receta={r} />)}</div>
        ) : (
          <p className="ayuda">Todavía no hay recetas de esta técnica para tu dieta. Pronto añadiremos más.</p>
        )}
      </div>
    </main>
  );
}
