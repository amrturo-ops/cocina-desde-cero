import { useEffect, useRef, useState } from 'react';
import Cabecera from '../components/Cabecera.jsx';
import Boton from '../components/Boton.jsx';
import { ir, rutaTecnica } from '../hooks/useRuta.js';
import { useTemporizador, mmss } from '../hooks/useTemporizador.js';
import { CATALOGO } from '../lib/contenido.js';
import { escalar, formatear } from '../lib/units.js';
import { prepararFoto } from '../lib/fotos.js';
import { MAX_COMENSALES, DIFICULTADES } from '../lib/planner.js';
import TarjetaPremium from '../components/TarjetaPremium.jsx';
import { medir } from '../lib/medir.js';
import { enviarOpinion } from '../lib/opiniones.js';
import { NOMBRE_APP, URL_APP } from '../textos.js';

const VALORACIONES = [
  { id: 1, icono: '😕', texto: 'Me ha costado' },
  { id: 2, icono: '🙂', texto: 'Bien' },
  { id: 3, icono: '🤩', texto: '¡Genial!' },
];

function Guardado({ receta, foto, usuario }) {
  const [valoracion, setValoracion] = useState(null);
  const [comentario, setComentario] = useState('');
  const [enviada, setEnviada] = useState(false);
  const [aviso, setAviso] = useState('');

  async function compartir() {
    const texto = `He cocinado ${receta.titulo.toLowerCase()} con ${NOMBRE_APP} 🍳 Aprendiendo a cocinar desde cero.${URL_APP ? ` ${URL_APP}` : ''}`;
    try {
      const archivo = foto?.archivo ? new File([foto.archivo], 'mi-plato.webp', { type: 'image/webp' }) : null;
      if (archivo && navigator.canShare?.({ files: [archivo] })) await navigator.share({ text: texto, files: [archivo] });
      else if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        setAviso('Texto copiado: pégalo donde quieras.');
      }
      medir('plato-compartido');
    } catch (e) {
      if (e?.name !== 'AbortError') setAviso('No se ha podido compartir desde aquí.');
    }
  }

  async function opinar() {
    try {
      await enviarOpinion(usuario, receta.id, valoracion, comentario);
    } catch { /* no bloquea */ }
    medir(`valoracion-${valoracion}`);
    setEnviada(true);
  }

  return (
    <main className="pantalla">
      <div className="pantalla__cuerpo">
        <h1 className="portada__titulo">¡Guardado!</h1>
        {foto && <img className="foto-plato" src={foto.miniatura} alt={`Tu ${receta.titulo}`} />}
        <Boton variante="secundario" onClick={compartir}>Compartir mi plato</Boton>
        {aviso && <p className="ayuda" role="status">{aviso}</p>}

        {!enviada ? (
          <section className="opinion">
            <h2>¿Cómo te ha salido?</h2>
            <div className="opinion__botones">
              {VALORACIONES.map((v) => (
                <button key={v.id} type="button" className="chip chip--grande" aria-pressed={valoracion === v.id} onClick={() => setValoracion(v.id)}>
                  <span aria-hidden="true">{v.icono}</span> {v.texto}
                </button>
              ))}
            </div>
            {valoracion && (
              <>
                <label className="ayuda" htmlFor="comentario">¿Algún paso que no se entendiera o algún tiempo que no cuadrara? (opcional)</label>
                <textarea id="comentario" className="campo" rows={3} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} />
                <Boton variante="secundario" onClick={opinar}>Enviar</Boton>
              </>
            )}
          </section>
        ) : (
          <p className="logro">¡Gracias! Nos ayuda a mejorar las recetas.</p>
        )}
      </div>
      <div className="pantalla__pie">
        <Boton onClick={() => ir('#inicio')}>Volver al camino</Boton>
        <Boton variante="texto" onClick={() => ir('#progreso')}>Ver mi progreso</Boton>
      </div>
    </main>
  );
}

const nombreIng = (id) => CATALOGO.get(id).nombre;

function Temporizador({ segundos }) {
  const t = useTemporizador(segundos);
  return (
    <div className={`temporizador temporizador--${t.estado}`} role="timer" aria-live={t.estado === 'terminado' ? 'assertive' : 'off'}>
      <span className="temporizador__tiempo">{t.estado === 'terminado' ? '¡Tiempo!' : mmss(t.restante)}</span>
      <div className="temporizador__botones">
        {t.estado === 'corriendo' ? (
          <Boton variante="secundario" onClick={t.pausar}>Pausar</Boton>
        ) : t.estado !== 'terminado' ? (
          <Boton onClick={t.iniciar}>{t.estado === 'pausado' ? 'Seguir' : 'Iniciar temporizador'}</Boton>
        ) : null}
        {t.estado !== 'parado' && <Boton variante="texto" onClick={t.reiniciar}>Reiniciar</Boton>}
      </div>
    </div>
  );
}

// Mantiene la pantalla encendida mientras se cocina (si el navegador lo permite)
function usePantallaEncendida(activa) {
  useEffect(() => {
    if (!activa || !navigator.wakeLock) return;
    let bloqueo;
    const pedir = () => navigator.wakeLock.request('screen').then((b) => (bloqueo = b)).catch(() => {});
    pedir();
    const alVolver = () => document.visibilityState === 'visible' && pedir();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      bloqueo?.release().catch(() => {});
    };
  }, [activa]);
}

function ModoCocina({ receta, raciones, onTerminar, onSalir }) {
  const [paso, setPaso] = useState(0);
  usePantallaEncendida(true);
  const p = receta.pasos[paso];
  const ultimo = paso === receta.pasos.length - 1;

  return (
    <main className="pantalla cocina">
      <div className="cabecera">
        <button type="button" className="volver" onClick={onSalir} aria-label="Salir del modo cocina">✕</button>
        <div className="pasos" aria-label={`Paso ${paso + 1} de ${receta.pasos.length}`}>
          {receta.pasos.map((_, i) => <span key={i} className={`pasos__tramo ${i <= paso ? 'pasos__tramo--hecho' : ''}`} />)}
        </div>
      </div>
      <div className="pantalla__cuerpo">
        <p className="ayuda">Paso {paso + 1} de {receta.pasos.length} · {raciones} raciones</p>
        <p className="cocina__texto">{p.texto}</p>
        {p.temporizadorSeg > 0 && <Temporizador key={paso} segundos={p.temporizadorSeg} />}
      </div>
      <div className="pantalla__pie cocina__pie">
        <Boton variante="secundario" onClick={() => setPaso(paso - 1)} disabled={paso === 0}>Anterior</Boton>
        {ultimo ? <Boton onClick={onTerminar}>¡Terminado!</Boton> : <Boton onClick={() => setPaso(paso + 1)}>Siguiente</Boton>}
      </div>
    </main>
  );
}

function Terminado({ receta, onGuardar }) {
  const [foto, setFoto] = useState(null);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const entrada = useRef(null);

  async function elegir(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError('');
    setEstado('preparando');
    try {
      setFoto(await prepararFoto(archivo));
    } catch (err) {
      setError(err.message);
    }
    setEstado('');
  }

  async function guardar(conFoto) {
    setEstado('guardando');
    setError('');
    try {
      await onGuardar(conFoto ? foto : null);
    } catch (err) {
      setError(err.message);
      setEstado('');
    }
  }

  return (
    <main className="pantalla">
      <div className="pantalla__cuerpo">
        <h1>¡Lo has cocinado!</h1>
        <p>Hazle una foto a tu {receta.titulo.toLowerCase()} para que cuente en el reto de la semana.</p>
        <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
        {foto ? (
          <img className="foto-plato" src={foto.miniatura} alt={`Tu ${receta.titulo}`} />
        ) : (
          <button type="button" className="foto-hueco" onClick={() => entrada.current.click()}>
            <span aria-hidden="true">📷</span>
            {estado === 'preparando' ? 'Preparando…' : 'Hacer o elegir foto'}
          </button>
        )}
        {foto && <button type="button" className="enlace" onClick={() => entrada.current.click()}>Cambiar foto</button>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="pantalla__pie">
        <Boton onClick={() => guardar(true)} disabled={!foto || estado === 'guardando'}>
          {estado === 'guardando' ? 'Guardando…' : 'Guardar con foto'}
        </Boton>
        <Boton variante="texto" onClick={() => guardar(false)} disabled={estado === 'guardando'}>
          Guardar sin foto (cuenta para la técnica, no para el reto)
        </Boton>
      </div>
    </main>
  );
}

export default function Receta({ progreso, perfil, usuario, id, racionesIniciales, onCocinada }) {
  const receta = progreso.recetasDisponibles.find((r) => r.id === id);
  const dePago = progreso.recetasPremium.find((r) => r.id === id);
  const [raciones, setRaciones] = useState(Number(racionesIniciales) || perfil.comensales);
  const [modo, setModo] = useState('ficha'); // ficha | cocina | terminado | guardado
  const [fotoGuardada, setFotoGuardada] = useState(null);

  if (!receta && dePago) {
    return (
      <main className="pantalla"><Cabecera />
        <div className="pantalla__cuerpo">
          <h1>{dePago.titulo}</h1>
          <p>{dePago.descripcion}</p>
          <p className="ayuda">{dePago.tiempoMin} minutos · {DIFICULTADES[dePago.dificultad ?? 2]}</p>
          <TarjetaPremium titulo="Receta Premium" texto="Esta receta es del nivel Premium. Desbloquéalo para cocinarla, junto con 100 recetas más." />
        </div>
      </main>
    );
  }
  if (!receta) {
    return (
      <main className="pantalla"><Cabecera />
        <div className="pantalla__cuerpo"><h1>Receta no disponible</h1>
          <p>Puede que no encaje con tu dieta o tus alergias.</p></div>
      </main>
    );
  }

  if (modo === 'cocina')
    return <ModoCocina receta={receta} raciones={raciones} onSalir={() => setModo('ficha')} onTerminar={() => setModo('terminado')} />;
  if (modo === 'terminado')
    return <Terminado receta={receta} onGuardar={async (foto) => { await onCocinada(receta, foto); setFotoGuardada(foto); setModo('guardado'); }} />;
  if (modo === 'guardado') return <Guardado receta={receta} foto={fotoGuardada} usuario={usuario} />;

  const tecnicas = progreso.tecnicas.filter((t) => receta.tecnicas.includes(t.id));
  const { avisos } = receta;

  return (
    <main className="pantalla">
      <Cabecera />
      <div className="pantalla__cuerpo">
        <h1>{receta.titulo}</h1>
        <p>{receta.descripcion}</p>
        <p className="ayuda">{receta.tiempoMin} minutos · <span className={`dificultad dificultad--${receta.dificultad ?? 2}`}>{DIFICULTADES[receta.dificultad ?? 2]}</span>{receta.cocinada ? ' · Ya la has cocinado ✓' : ''}</p>

        <div className="chips">
          {tecnicas.map((t) => (
            <button key={t.id} type="button" className="sello sello--boton" onClick={() => ir(rutaTecnica(t.id))}>Practicas: {t.titulo}</button>
          ))}
        </div>

        {receta.origen === 'propia' && (
          <button type="button" className="enlace" onClick={() => ir(`#editar--${receta.id}`)}>Editar mi receta</button>
        )}
        {receta.origen === 'comunidad' && (
          <p className="aviso-alergenos">Receta compartida por {receta.autor || 'un usuario'}. Revisa tú los ingredientes si tienes alguna alergia o intolerancia.</p>
        )}
        {receta.adaptada && (
          <div className="aviso-prueba">
            <strong>Adaptada a tu dieta.</strong>{' '}
            {receta.cambios.map((c) => (c.a.length ? `${nombreIng(c.de)} → ${c.a.map(nombreIng).join(' + ')}` : `sin ${nombreIng(c.de).toLowerCase()}`)).join('. ')}.
          </div>
        )}
        {avisos.etiquetado && (
          <p className="aviso-alergenos">
            ⚠ Revisa el etiquetado y las trazas de cada producto
            {avisos.revisar.length ? `, sobre todo: ${avisos.revisar.join(', ').toLowerCase()}` : ''}.
          </p>
        )}

        <div className="raciones">
          <h2>Ingredientes</h2>
          <span className="mini-contador" role="group" aria-label="Raciones">
            <button type="button" onClick={() => setRaciones(raciones - 1)} disabled={raciones <= 1} aria-label="Una ración menos">−</button>
            <span aria-live="polite">{raciones} {raciones === 1 ? 'ración' : 'raciones'}</span>
            <button type="button" onClick={() => setRaciones(raciones + 1)} disabled={raciones >= MAX_COMENSALES * 2} aria-label="Una ración más">+</button>
          </span>
        </div>
        <ul className="ingredientes">
          {receta.ingredientes.map((item) => {
            const e = escalar(item, receta.raciones, raciones, CATALOGO);
            return (
              <li key={item.id}>
                <span>{nombreIng(item.id)}</span>
                <span className="ingredientes__cantidad">{formatear(e.cantidad, e.unidad)}</span>
              </li>
            );
          })}
        </ul>

        <h2>Pasos</h2>
        <ol className="pasos-receta">
          {receta.pasos.map((p, i) => (
            <li key={i}>
              {p.texto}
              {p.temporizadorSeg > 0 && <span className="ayuda"> ({mmss(p.temporizadorSeg)})</span>}
            </li>
          ))}
        </ol>
      </div>
      <div className="pantalla__pie">
        <Boton onClick={() => { medir('receta-empezada'); setModo('cocina'); }}>Empezar a cocinar</Boton>
      </div>
    </main>
  );
}
