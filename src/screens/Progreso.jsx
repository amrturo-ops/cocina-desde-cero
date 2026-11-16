import { useEffect, useState } from 'react';
import TarjetaReto from '../components/TarjetaReto.jsx';
import TarjetaPremium from '../components/TarjetaPremium.jsx';
import { NOMBRE_NIVEL } from '../lib/progress.js';
import { urlsDeFotos } from '../lib/cocinado.js';
import { tituloDe } from '../lib/contenido.js';

const fecha = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export default function Progreso({ perfil, progreso, reto, completadas, premium }) {
  const [urls, setUrls] = useState(new Map());
  const nivel = progreso.nivel;
  const conFoto = completadas.filter((c) => c.foto_path);
  const distintas = new Set(completadas.map((c) => c.receta_id)).size;

  useEffect(() => {
    urlsDeFotos(conFoto.slice(0, 30)).then(setUrls);
  }, [completadas]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="pantalla pantalla--con-nav">
      <div className="pantalla__cuerpo">
        <h1>Tu progreso</h1>
        <TarjetaReto reto={reto} />

        <div className="cifras">
          <div><strong>{progreso.dominadas}</strong><span>técnicas dominadas</span></div>
          <div><strong>{distintas}</strong><span>recetas distintas</span></div>
          <div><strong>{completadas.length}</strong><span>veces cocinando</span></div>
        </div>

        <section className="avance">
          <h2>Nivel {NOMBRE_NIVEL[nivel]}</h2>
          <div className="avance__barra"><span style={{ width: `${progreso.porcentaje}%` }} /></div>
          <p>{progreso.porcentaje}% de las técnicas dominadas</p>
          <ul className="lista-tecnicas">
            {progreso.tecnicas.map((t) => (
              <li key={t.id} className={`lista-tecnicas__item--${t.estado}`}>
                <span>{t.estado === 'dominada' ? '✓' : '·'} {t.titulo}</span>
                <span className="ayuda">{Math.min(t.hechas, t.objetivo)}/{t.objetivo}</span>
              </li>
            ))}
          </ul>
        </section>

        {!premium && <TarjetaPremium />}

        <section>
          <h2>Tus platos</h2>
          {conFoto.length ? (
            <ul className="galeria">
              {conFoto.slice(0, 30).map((c, i) => (
                <li key={i}>
                  {urls.get(c.foto_path) ? <img src={urls.get(c.foto_path)} alt={tituloDe(c.receta_id)} loading="lazy" /> : <span className="galeria__vacio" />}
                  <span className="galeria__pie">{tituloDe(c.receta_id)}<br />{fecha(c.cocinado)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ayuda">Aquí aparecerán las fotos de lo que cocines. Haz la primera al terminar una receta.</p>
          )}
        </section>
      </div>
    </main>
  );
}
