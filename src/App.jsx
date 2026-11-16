import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSesion } from './hooks/useSesion.js';
import { useRuta, ir } from './hooks/useRuta.js';
import { leerPerfil, cambiarNivel } from './lib/perfil.js';
import { leerCompletadas, registrarCocinado } from './lib/cocinado.js';
import { tecnicasDelNivel, recetasPara, fijarRecetasUsuario, TECNICAS } from './lib/contenido.js';
import { leerRecetasUsuario, guardarRecetaUsuario, borrarRecetaUsuario } from './lib/misRecetas.js';
import { calcularProgreso, calcularReto } from './lib/progress.js';
import { esPremium } from './lib/premium.js';
import { modoPrueba } from './lib/supabase.js';
import { leerPlanActual, guardarPlan } from './lib/planes.js';
import Login from './screens/Login.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Arbol from './screens/Arbol.jsx';
import Tecnica from './screens/Tecnica.jsx';
import Receta from './screens/Receta.jsx';
import Perfil from './screens/Perfil.jsx';
import Plan from './screens/Plan.jsx';
import Lista from './screens/Lista.jsx';
import Progreso from './screens/Progreso.jsx';
import Recetas from './screens/Recetas.jsx';
import EditarReceta from './screens/EditarReceta.jsx';
import Privacidad from './screens/Privacidad.jsx';
import Premium from './screens/Premium.jsx';
import BarraNav from './components/BarraNav.jsx';
import Boton from './components/Boton.jsx';
import { iniciarMedicion, medir, medirPantalla } from './lib/medir.js';

export default function App() {
  const { cargando, usuario } = useSesion();
  const ruta = useRuta();
  const [perfil, setPerfil] = useState(undefined); // undefined = cargando, null = no tiene
  const [completadas, setCompletadas] = useState([]);
  const [plan, setPlan] = useState(null);
  const [recetasUsuario, setRecetasUsuario] = useState([]);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);

  useEffect(() => iniciarMedicion(), []);
  useEffect(() => medirPantalla(ruta.pantalla), [ruta.pantalla]);

  useEffect(() => {
    if (!usuario) return;
    setError('');
    setPerfil(undefined);
    Promise.all([leerPerfil(usuario), leerCompletadas(usuario), leerPlanActual(usuario), leerRecetasUsuario(usuario).catch(() => [])])
      .then(([p, c, pl, ru]) => {
        fijarRecetasUsuario(ru);
        setRecetasUsuario(ru);
        setPerfil(p);
        setCompletadas(c);
        setPlan(pl);
      })
      .catch((e) => setError(e.message));
  }, [usuario, reintento]);

  // Todo lo que depende de la dieta, de lo cocinado y de Premium se recalcula aquí.
  // nivelActual: el nivel que el usuario está mirando en el camino (se guarda en su perfil).
  const nivelActual = perfil?.nivel_actual ?? 'novato';
  const premium = esPremium(perfil);
  const recetasDieta = useMemo(() => (perfil ? recetasPara(perfil.dietas) : []), [perfil, recetasUsuario]); // eslint-disable-line react-hooks/exhaustive-deps
  const progresoDe = useCallback(
    (nivel) => calcularProgreso(tecnicasDelNivel(nivel), recetasDieta, completadas, nivel, { premium }),
    [recetasDieta, completadas, premium]
  );
  const progreso = useMemo(() => (perfil ? progresoDe(nivelActual) : null), [perfil, nivelActual, progresoDe]);

  const alCambiarNivel = useCallback(
    async (nivel) => {
      setPerfil((p) => ({ ...p, nivel_actual: nivel }));
      cambiarNivel(usuario, nivel).catch(() => {});
    },
    [usuario]
  );

  // Tras pagar en Stripe, el webhook marca la cuenta como Premium: volvemos a leer el perfil
  const comprobarPremium = useCallback(async () => {
    for (let i = 0; i < 3; i++) {
      const p = await leerPerfil(usuario).catch(() => null);
      if (p?.plan === 'premium') {
        setPerfil((actual) => ({ ...actual, ...p }));
        medir('premium-activado');
        return true;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    return false;
  }, [usuario]);

  const alGuardarReceta = useCallback(
    async (receta, { compartir }) => {
      const guardada = await guardarRecetaUsuario(usuario, receta, { compartir, autor: perfil?.nombre });
      medir(compartir ? 'receta-creada-compartida' : 'receta-creada');
      setRecetasUsuario((lista) => {
        const nueva = [guardada, ...lista.filter((r) => r.id !== receta.id && r.id !== guardada.id)];
        fijarRecetasUsuario(nueva);
        return nueva;
      });
      return guardada;
    },
    [usuario, perfil?.nombre]
  );
  const alBorrarReceta = useCallback(
    async (id) => {
      await borrarRecetaUsuario(usuario, id);
      setRecetasUsuario((lista) => {
        const nueva = lista.filter((r) => r.id !== id);
        fijarRecetasUsuario(nueva);
        return nueva;
      });
    },
    [usuario]
  );

  const reto = useMemo(() => calcularReto(completadas), [completadas]);

  // Mide cada técnica dominada nueva (no al cargar la app)
  const dominadasPrevias = useRef(null);
  useEffect(() => {
    if (!progreso) return;
    if (dominadasPrevias.current !== null && progreso.dominadas > dominadasPrevias.current) medir(`tecnica-dominada-${progreso.dominadas}`);
    if (progreso.nivelCompletado && dominadasPrevias.current !== null && dominadasPrevias.current < progreso.total) medir('nivel-novato-completado');
    dominadasPrevias.current = progreso.dominadas;
  }, [progreso]);

  const alCocinar = useCallback(
    async (receta, foto) => {
      const fila = await registrarCocinado(usuario, receta, foto);
      medir(foto ? 'receta-cocinada-con-foto' : 'receta-cocinada');
      setCompletadas((c) => [fila, ...c]);
    },
    [usuario]
  );

  // Recetas cocinadas en los últimos 7 días: el planificador evita repetirlas
  const historial = useMemo(() => {
    const hace7 = Date.now() - 7 * 24 * 3600 * 1000;
    return completadas.filter((c) => new Date(c.cocinado).getTime() > hace7).map((c) => c.receta_id);
  }, [completadas]);

  const [errorPlan, setErrorPlan] = useState('');
  const alCambiarPlan = useCallback(
    (nuevo) => {
      setPlan(nuevo);
      setErrorPlan('');
      guardarPlan(usuario, nuevo)
        .then((g) => setPlan((actual) => (actual && actual.huecos === nuevo.huecos ? { ...actual, id: g.id, inicio: g.inicio } : actual)))
        .catch((e) => setErrorPlan(e.message));
    },
    [usuario]
  );

  let pantalla;
  if (cargando) pantalla = null;
  else if (!usuario) pantalla = <Login />;
  else if (error)
    pantalla = (
      <main className="pantalla">
        <div className="pantalla__cuerpo"><h1>Sin conexión</h1><p className="error">{error}</p></div>
        <div className="pantalla__pie"><Boton onClick={() => setReintento((n) => n + 1)}>Reintentar</Boton></div>
      </main>
    );
  else if (perfil === undefined) pantalla = null;
  else if (!perfil || editando)
    pantalla = (
      <Onboarding usuario={usuario} perfilInicial={editando ? perfil : null}
        onTerminado={(p) => { if (!editando) medir('onboarding-completado'); setPerfil((prev) => ({ nivel_actual: 'novato', ...prev, ...p })); setEditando(false); window.location.hash = '#inicio'; }}
        onCancelar={() => setEditando(false)} />
    );
  else if (ruta.pantalla === 'tecnica') {
    const nivelTec = TECNICAS.find((t) => t.id === ruta.id)?.nivel ?? nivelActual;
    pantalla = <Tecnica progreso={nivelTec === nivelActual ? progreso : progresoDe(nivelTec)} id={ruta.id} />;
  } else if (ruta.pantalla === 'premium')
    pantalla = <Premium usuario={usuario} premium={premium} recetasPremium={progreso.recetasPremium.length || 100} onComprobar={comprobarPremium} />;
  else if (ruta.pantalla === 'receta') pantalla = <Receta progreso={progreso} perfil={perfil} usuario={usuario} id={ruta.id} racionesIniciales={ruta.extra} onCocinada={alCocinar} key={`${ruta.id}-${ruta.extra}`} />;
  else if (ruta.pantalla === 'plan')
    pantalla = <Plan perfil={perfil} progreso={progreso} plan={plan} historial={historial} onCambiarPlan={alCambiarPlan} />;
  else if (ruta.pantalla === 'lista') pantalla = <Lista usuario={usuario} perfil={perfil} plan={plan} version={recetasUsuario} />;
  else if (ruta.pantalla === 'recetas') {
    const visibles = new Set(progreso.tecnicas.flatMap((t) => t.recetas.map((r) => r.id)).concat(progreso.recetasDisponibles.map((r) => r.id)));
    const ocultas = recetasUsuario.filter((r) => r.origen === 'propia' && !visibles.has(r.id)).length;
    pantalla = <Recetas progreso={progreso} recetasOcultas={ocultas} />;
  } else if (ruta.pantalla === 'editar') {
    const existente = recetasUsuario.find((r) => r.id === ruta.id && r.origen === 'propia') ?? null;
    pantalla = <EditarReceta key={ruta.id ?? 'nueva'} receta={existente} perfil={perfil} onGuardar={alGuardarReceta} onBorrar={alBorrarReceta} />;
  }
  else if (ruta.pantalla === 'progreso')
    pantalla = <Progreso perfil={perfil} progreso={progreso} reto={reto} completadas={completadas} premium={premium} />;
  else if (ruta.pantalla === 'privacidad') pantalla = <Privacidad />;
  else if (ruta.pantalla === 'perfil') pantalla = <Perfil usuario={usuario} perfil={perfil} onEditar={() => setEditando(true)} />;
  else pantalla = <Arbol perfil={perfil} progreso={progreso} reto={reto} premium={premium} onCambiarNivel={alCambiarNivel} />;

  return (
    <>
      {modoPrueba && (
        <div className="aviso-prueba" role="status" style={{ margin: 'var(--margen) var(--margen) 0' }}>
          Versión de prueba: tus datos se guardan solo en este dispositivo.
        </div>
      )}
      {errorPlan && <p className="error" role="alert" style={{ margin: 'var(--margen)' }}>{errorPlan}</p>}
      {pantalla}
      {perfil && !editando && ['inicio', 'recetas', 'plan', 'lista', 'progreso'].includes(ruta.pantalla) && <BarraNav actual={ruta.pantalla} />}
    </>
  );
}
