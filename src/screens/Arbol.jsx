import { ir, rutaTecnica } from '../hooks/useRuta.js';
import { NOMBRE_NIVEL, NIVELES, siguienteNivel } from '../lib/progress.js';
import TarjetaReto from '../components/TarjetaReto.jsx';
import TarjetaPremium from '../components/TarjetaPremium.jsx';
import Boton from '../components/Boton.jsx';
import { ILUSTRACIONES } from '../lib/ilustraciones.js';

function textoEstado(t) {
  if (t.estado === 'dominada') return 'Dominada';
  if (t.hechas === 0) return 'Sin empezar';
  return `Llevas ${t.hechas} de ${t.objetivo} recetas`;
}

export default function Arbol({ perfil, progreso, reto, premium, onCambiarNivel }) {
  const nivel = progreso.nivel;
  const proximo = siguienteNivel(nivel);
  const actual = progreso.tecnicas.find((t) => t.id === progreso.tecnicaActual);

  return (
    <main className="pantalla pantalla--con-nav">
      <div className="arbol__cabecera">
        <h1>Hola, {perfil.nombre}</h1>
        <button type="button" className="icono-boton" onClick={() => ir('#perfil')} aria-label="Tus datos">⚙</button>
      </div>

      <div className="chips" role="group" aria-label="Nivel">
        {NIVELES.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={n === nivel} onClick={() => onCambiarNivel(n)}>
            {NOMBRE_NIVEL[n]}{n !== 'novato' && !premium ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      {progreso.bloqueado ? (
        <TarjetaPremium titulo={`Nivel ${NOMBRE_NIVEL[nivel]}`}
          texto="Este nivel es Premium. Puedes ver las técnicas y probar una receta de muestra gratis." />
      ) : (
        <section className="avance" aria-label="Avance del nivel">
          <div className="avance__barra"><span style={{ width: `${progreso.porcentaje}%` }} /></div>
          <p>{progreso.dominadas} de {progreso.total} técnicas dominadas</p>
          {progreso.nivelCompletado && <p className="logro">¡Nivel {NOMBRE_NIVEL[nivel]} completado!</p>}
        </section>
      )}

      {actual && !progreso.bloqueado && (
        <section className="siguiente">
          {ILUSTRACIONES[actual.id] && <div className="ilustracion" dangerouslySetInnerHTML={{ __html: ILUSTRACIONES[actual.id] }} />}
          <p className="ayuda">Te sugerimos</p>
          <h2>{actual.titulo}</h2>
          <Boton onClick={() => ir(rutaTecnica(actual.id))}>{actual.hechas === 0 ? 'Aprender esta técnica' : 'Seguir practicando'}</Boton>
        </section>
      )}

      <TarjetaReto reto={reto} />

      <p className="ayuda">El camino es una guía: puedes abrir cualquier técnica y cocinar cualquier receta de tu nivel.</p>
      <ol className="camino">
        {progreso.tecnicas.map((t) => (
          <li key={t.id} className={`nodo nodo--${t.estado} ${t.id === progreso.tecnicaActual && !progreso.bloqueado ? 'nodo--actual' : ''}`}>
            <button type="button" className="nodo__boton" onClick={() => ir(rutaTecnica(t.id))}>
              <span className="nodo__circulo" aria-hidden="true">{t.estado === 'dominada' ? '✓' : t.orden}</span>
              <span className="nodo__texto">
                <span className="nodo__titulo">{t.titulo}</span>
                <span className="nodo__estado">{textoEstado(t)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {progreso.nivelCompletado && proximo && (
        premium
          ? <Boton onClick={() => onCambiarNivel(proximo)}>Pasar al nivel {NOMBRE_NIVEL[proximo]}</Boton>
          : <TarjetaPremium titulo={`¿Listo para el nivel ${NOMBRE_NIVEL[proximo]}?`} />
      )}
    </main>
  );
}
