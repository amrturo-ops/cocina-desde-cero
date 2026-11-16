import { useState } from 'react';
import Boton from '../components/Boton.jsx';
import Opcion from '../components/Opcion.jsx';
import Contador from '../components/Contador.jsx';
import { ir, rutaReceta } from '../hooks/useRuta.js';
import { medir } from '../lib/medir.js';
import {
  planificar, cambiarReceta, cambiarComensalesHueco, cambiarComensalesPlan, opcionesParaHueco, MAX_COMENSALES, DIFICULTADES,
} from '../lib/planner.js';

const OPCIONES_DIFICULTAD = [
  { id: 1, icono: '🟢', titulo: 'Solo fáciles', detalle: 'Pocas técnicas y poco tiempo' },
  { id: 2, icono: '🟡', titulo: 'Fáciles y medias', detalle: 'Algún paso más, nada complicado' },
  { id: 3, icono: '🔴', titulo: 'Me atrevo con todo', detalle: 'Incluye las más elaboradas' },
];

const NOMBRE_COMIDA = { comida: 'Comida', cena: 'Cena' };
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function nombreDia(inicio, dia) {
  if (dia === 1) return 'Hoy';
  if (dia === 2) return 'Mañana';
  const f = new Date(`${inicio}T12:00:00`);
  f.setDate(f.getDate() + dia - 1);
  return `${DIAS_SEMANA[f.getDay()]} ${f.getDate()}`;
}

function MiniContador({ valor, onChange }) {
  return (
    <span className="mini-contador" role="group" aria-label="Comensales de esta comida">
      <button type="button" onClick={() => onChange(valor - 1)} disabled={valor <= 0} aria-label="Uno menos">−</button>
      <span aria-live="polite">{valor} 🍽</span>
      <button type="button" onClick={() => onChange(valor + 1)} disabled={valor >= MAX_COMENSALES} aria-label="Uno más">+</button>
    </span>
  );
}

function Hueco({ plan, i, recetas, contexto, onCambiar }) {
  const [eligiendo, setEligiendo] = useState(false);
  const h = plan.huecos[i];
  const titulo = (id) => recetas.find((r) => r.id === id)?.titulo ?? 'Receta';
  const opciones = eligiendo ? opcionesParaHueco(plan, i, recetas, contexto).slice(0, 6) : [];

  return (
    <li className={`hueco hueco--${h.tipo}`}>
      <div className="hueco__cabecera">
        <span className="hueco__comida">{NOMBRE_COMIDA[h.comida]}</span>
        <MiniContador valor={h.comensales} onChange={(n) => onCambiar(cambiarComensalesHueco(plan, i, n))} />
      </div>

      {h.tipo === 'cocinar' && (
        <>
          <button type="button" className="hueco__receta" onClick={() => ir(rutaReceta(h.recetaId, h.comensales + (h.sobrasEn !== undefined ? plan.huecos[h.sobrasEn].comensales : 0)))}>{titulo(h.recetaId)}</button>
          {h.sobrasEn !== undefined && (
            <span className="sello">Cocina doble: sobra para {nombreDia(plan.inicio, plan.huecos[h.sobrasEn].dia).toLowerCase()}</span>
          )}
        </>
      )}
      {h.tipo === 'sobras' && <p className="hueco__receta hueco__receta--sobras">Sobras de {titulo(h.recetaId)}</p>}
      {h.tipo === 'nadie' && <p className="ayuda">Nadie come en casa</p>}
      {h.tipo === 'libre' && !eligiendo && <p className="ayuda">Sin receta</p>}

      {h.tipo !== 'nadie' && (
        <button type="button" className="enlace" onClick={() => setEligiendo((e) => !e)}>
          {eligiendo ? 'Cerrar' : h.tipo === 'libre' ? 'Elegir receta' : h.tipo === 'sobras' ? 'Cocinar otra cosa' : 'Cambiar receta'}
        </button>
      )}
      {eligiendo && (
        <div className="hueco__opciones">
          {opciones.length ? opciones.map((r) => (
            <button key={r.id} type="button" className="opcion-mini"
              onClick={() => { onCambiar(cambiarReceta(plan, i, r)); setEligiendo(false); }}>
              {r.titulo} <span className="ayuda">{DIFICULTADES[r.dificultad ?? 2]} · {r.tiempoMin} min</span>
            </button>
          )) : <p className="ayuda">No hay recetas de esta dificultad para esta comida. Prueba con otra dificultad.</p>}
        </div>
      )}
    </li>
  );
}

function NuevoPlan({ perfil, onCrear, onCancelar }) {
  const [dias, setDias] = useState(3);
  const [comidas, setComidas] = useState(perfil.comidas);
  const [comensales, setComensales] = useState(perfil.comensales);
  const [usarSobras, setUsarSobras] = useState(true);
  const [dificultadMax, setDificultadMax] = useState(2);

  const alternarComida = (id) => {
    const activa = comidas.includes(id);
    if (activa && comidas.length === 1) return;
    setComidas(activa ? comidas.filter((c) => c !== id) : ['comida', 'cena'].filter((c) => c === id || comidas.includes(c)));
  };

  return (
    <main className="pantalla pantalla--con-nav">
      <div className="pantalla__cuerpo">
        <h1>Nuevo plan</h1>
        <h2>¿Para cuántos días?</h2>
        <Contador valor={dias} min={1} max={7} onChange={setDias} etiqueta="Número de días" />
        <h2>¿Qué comidas?</h2>
        <div className="opciones">
          <Opcion icono="🍽️" titulo="Comida" detalle="Al mediodía" activa={comidas.includes('comida')} onClick={() => alternarComida('comida')} />
          <Opcion icono="🌙" titulo="Cena" detalle="Por la noche" activa={comidas.includes('cena')} onClick={() => alternarComida('cena')} />
        </div>
        <h2>¿Cuántos coméis?</h2>
        <Contador valor={comensales} min={1} max={MAX_COMENSALES} onChange={setComensales} etiqueta="Número de comensales" />
        <p className="ayuda">Luego puedes cambiarlo en cada comida, por ejemplo si un día tienes invitados.</p>
        <h2>¿Qué dificultad?</h2>
        <div className="opciones">
          {OPCIONES_DIFICULTAD.map((o) => (
            <Opcion key={o.id} icono={o.icono} titulo={o.titulo} detalle={o.detalle} activa={dificultadMax === o.id} onClick={() => setDificultadMax(o.id)} />
          ))}
        </div>
        <div className="opciones">
          <Opcion icono="🥡" titulo="Aprovechar sobras" detalle="Cocinas doble y comes dos veces"
            activa={usarSobras} onClick={() => setUsarSobras(!usarSobras)} />
        </div>
      </div>
      <div className="pantalla__pie">
        <Boton onClick={() => onCrear({ dias, comidas, comensales, usarSobras, dificultadMax })}>Crear plan</Boton>
        {onCancelar && <Boton variante="texto" onClick={onCancelar}>Volver al plan actual</Boton>}
      </div>
    </main>
  );
}

export default function Plan({ perfil, progreso, plan, historial, onCambiarPlan }) {
  const [creando, setCreando] = useState(!plan);
  const recetas = progreso.recetasDisponibles;
  const contexto = { historial, tecnicaActual: progreso.tecnicaActual };

  if (!plan || creando) {
    return (
      <NuevoPlan perfil={perfil} onCancelar={plan ? () => setCreando(false) : null}
        onCrear={(o) => {
          medir(`plan-creado-${o.dias}-dias`);
          onCambiarPlan({ ...planificar({ ...o, recetas, ...contexto }), id: undefined, inicio: new Date().toISOString().slice(0, 10) });
          setCreando(false);
        }} />
    );
  }

  const aCocinar = plan.huecos.filter((h) => h.tipo === 'cocinar').length;
  const distintas = new Set(plan.huecos.filter((h) => h.recetaId).map((h) => h.recetaId)).size;
  const dias = [...new Set(plan.huecos.map((h) => h.dia))];

  const regenerar = () =>
    onCambiarPlan({
      ...planificar({ ...plan, recetas, ...contexto, semilla: Date.now() % 100000 }),
      id: plan.id, inicio: plan.inicio,
    });

  return (
    <main className="pantalla pantalla--con-nav">
      <div className="pantalla__cuerpo">
        <h1>Tu plan</h1>
        <div className="plan__general">
          <span>Comensales habituales</span>
          <MiniContador valor={plan.comensales} onChange={(n) => n >= 1 && onCambiarPlan(cambiarComensalesPlan(plan, n))} />
        </div>
        <div className="chips" role="group" aria-label="Dificultad del plan">
          {OPCIONES_DIFICULTAD.map((o) => (
            <button key={o.id} type="button" className="chip" aria-pressed={(plan.dificultadMax ?? 3) === o.id}
              onClick={() => onCambiarPlan({ ...planificar({ ...plan, dificultadMax: o.id, recetas, ...contexto }), id: plan.id, inicio: plan.inicio })}>
              {o.icono} {o.titulo}
            </button>
          ))}
        </div>
        {distintas < aCocinar && (
          <p className="aviso-prueba">
            Hay pocas recetas con esta dificultad y algunas se repiten. Sube la dificultad para tener más variedad.
          </p>
        )}
        {dias.map((dia) => (
          <section key={dia} className="dia">
            <h2>{nombreDia(plan.inicio, dia)}</h2>
            <ul className="huecos">
              {plan.huecos.map((h, i) => h.dia === dia && (
                <Hueco key={`${i}-${h.recetaId}-${h.tipo}`} plan={plan} i={i} recetas={recetas} contexto={contexto} onCambiar={onCambiarPlan} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="pantalla__pie">
        <Boton onClick={() => ir('#lista')}>Ver lista de la compra</Boton>
        <Boton variante="secundario" onClick={regenerar}>Proponer otras recetas</Boton>
        <Boton variante="texto" onClick={() => setCreando(true)}>Hacer un plan nuevo</Boton>
      </div>
    </main>
  );
}
