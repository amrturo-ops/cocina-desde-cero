import icono from '../assets/icon.svg';
import { useState } from 'react';
import Boton from '../components/Boton.jsx';
import Opcion from '../components/Opcion.jsx';
import Contador from '../components/Contador.jsx';
import Pasos from '../components/Pasos.jsx';
import { PERFIL_VACIO, guardarPerfil } from '../lib/perfil.js';
import { DIETAS, ALERGIAS, separarDietas } from '../lib/diets.js';
import PoliticaPrivacidad from '../components/PoliticaPrivacidad.jsx';

const OPCIONES_DIETA = [
  { id: 'estandar', icono: '🍳', detalle: 'Como de todo' },
  { id: 'sin-gluten', icono: '🌾', detalle: 'Celiaquía o sensibilidad al gluten' },
  { id: 'sin-lactosa', icono: '🥛', detalle: 'Intolerancia a la lactosa' },
  { id: 'vegetariana', icono: '🥕', detalle: 'Sin carne ni pescado' },
  { id: 'vegana', icono: '🌱', detalle: 'Nada de origen animal' },
];

const OPCIONES_COMIDA = [
  { id: 'comida', icono: '🍽️', titulo: 'Comida', detalle: 'Al mediodía' },
  { id: 'cena', icono: '🌙', titulo: 'Cena', detalle: 'Por la noche' },
];

const TOTAL_PASOS = 6; // nombre, dietas, alergias, comensales, comidas, resumen y consentimiento

// Reglas de selección de dietas (las alergias van aparte y no se tocan aquí):
// - «Estándar» es excluyente con las demás dietas.
// - «Vegana» incluye «Vegetariana».
// - Si no queda ninguna, vuelve a «Estándar».
export function alternarDieta(actuales, id) {
  if (id === 'estandar') return ['estandar'];
  const sinEstandar = actuales.filter((d) => d !== 'estandar');
  let nuevas = sinEstandar.includes(id) ? sinEstandar.filter((d) => d !== id) : [...sinEstandar, id];
  if (id === 'vegana' && nuevas.includes('vegana')) nuevas = nuevas.filter((d) => d !== 'vegetariana');
  return nuevas.length ? nuevas : ['estandar'];
}

export default function Onboarding({ usuario, perfilInicial, onTerminado, onCancelar }) {
  const editando = Boolean(perfilInicial);
  const [paso, setPaso] = useState(editando ? 1 : 0);
  const [perfil, setPerfil] = useState(() => {
    const base = perfilInicial ?? PERFIL_VACIO;
    const { dietas, alergias } = separarDietas(base.dietas);
    return { ...base, dietas: dietas.length ? dietas : ['estandar'], alergias };
  });
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(Boolean(perfilInicial));
  const [aceptaSalud, setAceptaSalud] = useState(Boolean(perfilInicial?.consentimiento_salud));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo, valor) => setPerfil((p) => ({ ...p, [campo]: valor }));
  const siguiente = () => setPaso((p) => p + 1);
  const atras = () => (paso === 1 && editando ? onCancelar() : setPaso((p) => p - 1));

  async function terminar() {
    setError('');
    setGuardando(true);
    try {
      const { alergias, ...resto } = perfil;
      const guardado = await guardarPerfil(usuario, { ...resto, dietas: [...perfil.dietas, ...alergias] }, { salud: necesitaConsentimiento });
      onTerminado(guardado);
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  if (paso === 0) {
    return (
      <main className="pantalla">
        <div className="pantalla__cuerpo portada">
          <img className="portada__huevo" src={icono} alt="" />
          <h1 className="portada__titulo">Aprende a cocinar de verdad</h1>
          <p>Una técnica cada vez, con recetas que te vas a comer. Empezamos por lo más básico.</p>
        </div>
        <div className="pantalla__pie">
          <Boton onClick={siguiente}>Empezar</Boton>
        </div>
      </main>
    );
  }

  const esVegana = perfil.dietas.includes('vegana');
  const conAviso = perfil.dietas.some((d) => d === 'sin-gluten' || d === 'sin-lactosa') || perfil.alergias.length > 0;
  // Dietas como «sin gluten» o una alergia pueden revelar datos de salud: hace falta consentimiento expreso
  const necesitaConsentimiento = perfil.dietas.some((d) => d !== 'estandar') || perfil.alergias.length > 0;
  const alternarAlergia = (id) =>
    cambiar('alergias', perfil.alergias.includes(id) ? perfil.alergias.filter((a) => a !== id) : [...perfil.alergias, id]);

  const contenido = {
    1: {
      titulo: '¿Cómo te llamas?',
      cuerpo: (
        <>
          <input className="campo" autoFocus maxLength={30} autoComplete="given-name"
            aria-label="Tu nombre" value={perfil.nombre} placeholder="Tu nombre"
            onChange={(e) => cambiar('nombre', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && perfil.nombre.trim() && siguiente()} />
          <p className="ayuda">Solo lo usamos para saludarte.</p>
        </>
      ),
      puedeSeguir: perfil.nombre.trim().length > 0,
    },
    2: {
      titulo: '¿Sigues alguna dieta?',
      cuerpo: (
        <>
          <p className="ayuda">Puedes elegir varias: las recetas se adaptan a todas a la vez.</p>
          <div className="opciones">
            {OPCIONES_DIETA.map((o) => {
              const incluida = o.id === 'vegetariana' && esVegana;
              return (
                <Opcion key={o.id} icono={o.icono} titulo={DIETAS[o.id].nombre}
                  detalle={incluida ? 'Incluida en vegana' : o.detalle}
                  activa={perfil.dietas.includes(o.id) || incluida}
                  disabled={incluida}
                  onClick={() => cambiar('dietas', alternarDieta(perfil.dietas, o.id))} />
              );
            })}
          </div>
          {conAviso && (
            <p className="ayuda">
              Te recordaremos revisar siempre el etiquetado y las trazas. La app no sustituye el consejo de tu médico.
            </p>
          )}
        </>
      ),
      puedeSeguir: true,
    },
    3: {
      titulo: '¿Alguna alergia?',
      cuerpo: (
        <>
          <p className="ayuda">Marca las de cualquier persona que coma contigo. Si no hay ninguna, sigue adelante.</p>
          <div className="chips">
            {ALERGIAS.map((id) => (
              <button key={id} type="button" className="chip chip--grande" aria-pressed={perfil.alergias.includes(id)} onClick={() => alternarAlergia(id)}>
                {DIETAS[id].nombre}
              </button>
            ))}
          </div>
          {perfil.alergias.length > 0 && (
            <p className="aviso-alergenos">
              Quitaremos las recetas e ingredientes que los contengan, pero no podemos garantizar la ausencia de trazas.
              Revisa siempre el etiquetado y, si la alergia es grave, sigue las indicaciones de tu médico.
            </p>
          )}
        </>
      ),
      puedeSeguir: true,
    },
    4: {
      titulo: '¿Cuántos coméis normalmente?',
      cuerpo: (
        <>
          <Contador valor={perfil.comensales} onChange={(v) => cambiar('comensales', v)} etiqueta="Número de comensales" />
          <p className="ayuda" style={{ alignSelf: 'center' }}>
            {perfil.comensales === 1 ? 'Solo para ti.' : `Tú y ${perfil.comensales - 1} más.`} Podrás cambiarlo en cada plan y en cada comida.
          </p>
        </>
      ),
      puedeSeguir: true,
    },
    5: {
      titulo: '¿Qué quieres planificar?',
      cuerpo: (
        <>
          <div className="opciones">
            {OPCIONES_COMIDA.map((o) => {
              const activa = perfil.comidas.includes(o.id);
              const unica = activa && perfil.comidas.length === 1;
              return (
                <Opcion key={o.id} icono={o.icono} titulo={o.titulo} detalle={o.detalle} activa={activa}
                  onClick={() => !unica && cambiar('comidas',
                    activa ? perfil.comidas.filter((c) => c !== o.id) : [...perfil.comidas, o.id])} />
              );
            })}
          </div>
          <p className="ayuda">Elige al menos una. Podrás cambiarlo cada vez que hagas un plan.</p>
        </>
      ),
      puedeSeguir: perfil.comidas.length > 0,
    },
    6: {
      titulo: `Todo listo, ${perfil.nombre.trim()}`,
      cuerpo: (
        <>
          <ul className="resumen">
            <li><span className="resumen__dato">Dieta</span>
              <span className="resumen__valor">{perfil.dietas.map((d) => DIETAS[d].nombre).join(' + ')}</span></li>
            {perfil.alergias.length > 0 && (
              <li><span className="resumen__dato">Alergias</span>
                <span className="resumen__valor">{perfil.alergias.map((a) => DIETAS[a].nombre).join(', ')}</span></li>
            )}
            <li><span className="resumen__dato">Comensales</span>
              <span className="resumen__valor">{perfil.comensales}</span></li>
            <li><span className="resumen__dato">Planificas</span>
              <span className="resumen__valor">
                {OPCIONES_COMIDA.filter((o) => perfil.comidas.includes(o.id)).map((o) => o.titulo).join(' y ')}
              </span></li>
          </ul>
          <p className="ayuda">Puedes cambiar estos datos cuando quieras.</p>
          <label className="casilla">
            <input type="checkbox" checked={aceptaPrivacidad} onChange={(e) => setAceptaPrivacidad(e.target.checked)} />
            <span>He leído y acepto la política de privacidad.</span>
          </label>
          <details className="desplegable">
            <summary>Leer la política de privacidad</summary>
            <PoliticaPrivacidad />
          </details>
          {necesitaConsentimiento && (
            <label className="casilla">
              <input type="checkbox" checked={aceptaSalud} onChange={(e) => setAceptaSalud(e.target.checked)} />
              <span>Doy mi consentimiento expreso para que se guarden mi dieta y mis alergias con el único fin de adaptar las recetas. Puedo retirarlo borrándolas o borrando mi cuenta.</span>
            </label>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </>
      ),
      puedeSeguir: aceptaPrivacidad && (!necesitaConsentimiento || aceptaSalud),
    },
  }[paso];

  const ultimo = paso === TOTAL_PASOS;

  return (
    <main className="pantalla">
      <div className="cabecera">
        <button type="button" className="volver" onClick={atras} aria-label="Volver">←</button>
        <Pasos actual={paso} total={TOTAL_PASOS} />
      </div>
      <div className="pantalla__cuerpo">
        <h1>{contenido.titulo}</h1>
        {contenido.cuerpo}
      </div>
      <div className="pantalla__pie">
        {ultimo ? (
          <Boton onClick={terminar} disabled={guardando || !contenido.puedeSeguir}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Empezar a cocinar'}
          </Boton>
        ) : (
          <Boton onClick={siguiente} disabled={!contenido.puedeSeguir}>Siguiente</Boton>
        )}
      </div>
    </main>
  );
}

