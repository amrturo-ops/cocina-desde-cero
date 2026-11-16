import { useMemo, useState } from 'react';
import Cabecera from '../components/Cabecera.jsx';
import Boton from '../components/Boton.jsx';
import Opcion from '../components/Opcion.jsx';
import { ir, rutaReceta } from '../hooks/useRuta.js';
import { CATALOGO, TECNICAS } from '../lib/contenido.js';
import { DIETAS, esApto } from '../lib/diets.js';
import { SECCIONES } from '../lib/shopping.js';
import { nuevoId } from '../lib/misRecetas.js';
import { DIFICULTADES } from '../lib/planner.js';
import { modoPrueba } from '../lib/supabase.js';

const COMPONENTES = [
  { id: 'gluten', nombre: 'Gluten (trigo, cebada, centeno…)' },
  { id: 'lactosa', nombre: 'Lactosa' },
  { id: 'lacteo', nombre: 'Lácteo (leche, queso, yogur…)' },
  { id: 'huevo', nombre: 'Huevo' },
  { id: 'carne', nombre: 'Carne' },
  { id: 'pescado', nombre: 'Pescado o marisco' },
  { id: 'miel', nombre: 'Miel' },
  { id: 'frutos-secos', nombre: 'Frutos secos (nueces, almendras…)' },
  { id: 'cacahuete', nombre: 'Cacahuete' },
  { id: 'soja', nombre: 'Soja' },
  { id: 'crustaceos', nombre: 'Crustáceos (gambas, langostinos…)' },
  { id: 'moluscos', nombre: 'Moluscos (mejillones, calamar…)' },
  { id: 'sesamo', nombre: 'Sésamo' },
  { id: 'apio', nombre: 'Apio' },
  { id: 'mostaza', nombre: 'Mostaza' },
  { id: 'sulfitos', nombre: 'Sulfitos (vino, vinagre…)' },
  { id: 'altramuces', nombre: 'Altramuces' },
];
const UNIDADES_NUEVAS = [
  { id: 'g', nombre: 'gramos' }, { id: 'ml', nombre: 'mililitros' },
  { id: 'unidad', nombre: 'unidades' }, { id: 'al-gusto', nombre: 'al gusto' },
];
const NOMBRE_UNIDAD = { g: 'g', ml: 'ml', unidad: 'unidades', diente: 'dientes', manojo: 'manojos', 'al-gusto': 'al gusto' };

const CATALOGO_OFICIAL = [...CATALOGO.values()].filter((i) => !i.id.startsWith('x-') && i.enLista !== false);
const porNombre = new Map(CATALOGO_OFICIAL.map((i) => [i.nombre.toLowerCase(), i]));

function unidadesDe(fila) {
  if (fila.nuevo) return [fila.nuevo.unidadBase];
  const ing = CATALOGO.get(fila.id);
  return [ing.unidadBase, ...Object.keys(ing.conversiones ?? {})];
}

// Convierte la receta guardada en el estado del formulario y al revés
function aFormulario(r, comensales) {
  const nuevos = new Map((r?.ingredientesNuevos ?? []).map((i) => [i.id, i]));
  return {
    id: r?.id ?? nuevoId(),
    titulo: r?.titulo ?? '',
    descripcion: r?.descripcion ?? '',
    raciones: r?.raciones ?? comensales,
    tiempoMin: r?.tiempoMin ?? 30,
    dificultad: r?.dificultad ?? 2,
    momentos: r?.momentos ?? ['comida', 'cena'],
    sobras: r?.sobras ?? { apta: false, dias: 0 },
    tecnicas: r?.tecnicas ?? [],
    ingredientes: (r?.ingredientes ?? []).map((i) => {
      const nuevo = nuevos.get(i.id);
      return { ...i, nombre: (nuevo ?? CATALOGO.get(i.id))?.nombre ?? i.id, nuevo: nuevo ? { ...nuevo } : null };
    }),
    pasos: (r?.pasos ?? []).map((p) => ({ texto: p.texto, minutos: p.temporizadorSeg ? Math.round(p.temporizadorSeg / 60) : '' })),
  };
}

function deFormulario(f) {
  return {
    id: f.id,
    titulo: f.titulo.trim(),
    descripcion: f.descripcion.trim(),
    nivel: 'novato',
    tecnicas: f.tecnicas,
    raciones: f.raciones,
    tiempoMin: Number(f.tiempoMin) || 30,
    dificultad: f.dificultad,
    momentos: f.momentos,
    sobras: f.sobras.apta ? { apta: true, dias: f.sobras.dias || 2 } : { apta: false, dias: 0 },
    ingredientes: f.ingredientes.map(({ id, cantidad, unidad }) => ({ id, cantidad: unidad === 'al-gusto' ? 0 : Number(cantidad) || 0, unidad })),
    ingredientesNuevos: f.ingredientes.filter((i) => i.nuevo).map((i) => ({ ...i.nuevo, id: i.id, nombre: i.nombre, avisoTrazas: true })),
    pasos: f.pasos.filter((p) => p.texto.trim()).map((p) => {
      const paso = { texto: p.texto.trim() };
      if (Number(p.minutos) > 0) paso.temporizadorSeg = Math.round(Number(p.minutos) * 60);
      return paso;
    }),
  };
}

function AnadirIngrediente({ onAnadir }) {
  const [texto, setTexto] = useState('');
  const [nuevo, setNuevo] = useState(null); // formulario de ingrediente que no está en el catálogo

  function anadir() {
    const nombre = texto.trim();
    if (!nombre) return;
    const ing = porNombre.get(nombre.toLowerCase());
    if (ing) {
      onAnadir({ id: ing.id, nombre: ing.nombre, cantidad: '', unidad: ing.unidadBase, nuevo: null });
      setTexto('');
    } else {
      setNuevo({ seccion: 'despensa', unidadBase: 'g', contiene: [] });
    }
  }

  if (nuevo) {
    const alternar = (c) => setNuevo({ ...nuevo, contiene: nuevo.contiene.includes(c) ? nuevo.contiene.filter((x) => x !== c) : [...nuevo.contiene, c] });
    return (
      <div className="tarjeta-form">
        <p><strong>«{texto.trim()}»</strong> no está en nuestra lista. Cuéntanos qué es para poder adaptarlo a cada dieta.</p>
        <label className="ayuda" htmlFor="seccion-nueva">¿En qué sección del súper está?</label>
        <select id="seccion-nueva" className="campo" value={nuevo.seccion} onChange={(e) => setNuevo({ ...nuevo, seccion: e.target.value })}>
          {SECCIONES.filter((s) => s.id !== 'basicos').map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <label className="ayuda" htmlFor="unidad-nueva">¿Cómo se mide?</label>
        <select id="unidad-nueva" className="campo" value={nuevo.unidadBase} onChange={(e) => setNuevo({ ...nuevo, unidadBase: e.target.value })}>
          {UNIDADES_NUEVAS.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <p className="ayuda">¿Contiene algo de esto? Marca todo lo que lleve, aunque sea poco.</p>
        <div className="chips">
          {COMPONENTES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={nuevo.contiene.includes(c.id)} onClick={() => alternar(c.id)}>{c.nombre}</button>
          ))}
        </div>
        <div className="fila-botones">
          <Boton variante="secundario" onClick={() => setNuevo(null)}>Cancelar</Boton>
          <Boton onClick={() => {
            const id = `x-${texto.trim().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`;
            onAnadir({ id, nombre: texto.trim(), cantidad: '', unidad: nuevo.unidadBase, nuevo });
            setTexto('');
            setNuevo(null);
          }}>Añadir</Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="fila-anadir">
      <input className="campo" list="catalogo-ingredientes" value={texto} placeholder="Escribe un ingrediente"
        onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && anadir()} aria-label="Ingrediente" />
      <datalist id="catalogo-ingredientes">
        {CATALOGO_OFICIAL.map((i) => <option key={i.id} value={i.nombre} />)}
      </datalist>
      <Boton variante="secundario" className="boton--estrecho" onClick={anadir} disabled={!texto.trim()}>Añadir</Boton>
    </div>
  );
}

export default function EditarReceta({ receta, perfil, onGuardar, onBorrar }) {
  const [f, setF] = useState(() => aFormulario(receta, perfil.comensales));
  const [compartir, setCompartir] = useState(receta?.estado === 'pendiente' || receta?.estado === 'aprobada');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const cambiar = (campo, valor) => setF((x) => ({ ...x, [campo]: valor }));
  const cambiarFila = (lista, i, cambios) => cambiar(lista, f[lista].map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  const quitarFila = (lista, i) => cambiar(lista, f[lista].filter((_, j) => j !== i));
  const mover = (i, d) => {
    const p = [...f.pasos];
    [p[i], p[i + d]] = [p[i + d], p[i]];
    cambiar('pasos', p);
  };

  // Para qué dietas es apta, calculado con los ingredientes
  const aptaPara = useMemo(() => {
    const temporal = new Map(CATALOGO);
    f.ingredientes.forEach((i) => i.nuevo && temporal.set(i.id, { ...i.nuevo, id: i.id, nombre: i.nombre }));
    return Object.keys(DIETAS).filter((d) => DIETAS[d].tipo === 'dieta' && d !== 'estandar' && f.ingredientes.every((i) => esApto(i.id, [d], temporal)));
  }, [f.ingredientes]);

  const problemas = [];
  if (!f.titulo.trim()) problemas.push('Ponle un título.');
  if (f.ingredientes.length < 2) problemas.push('Añade al menos 2 ingredientes.');
  if (f.ingredientes.some((i) => i.unidad !== 'al-gusto' && !(Number(i.cantidad) > 0))) problemas.push('Indica la cantidad de cada ingrediente.');
  if (f.pasos.filter((p) => p.texto.trim()).length < 2) problemas.push('Escribe al menos 2 pasos.');
  if (!f.momentos.length) problemas.push('Elige si es para comida, cena o ambas.');

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const guardada = await onGuardar(deFormulario(f), { compartir });
      ir(rutaReceta(guardada.id));
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  const alternarMomento = (m) => {
    const activa = f.momentos.includes(m);
    if (activa && f.momentos.length === 1) return;
    cambiar('momentos', activa ? f.momentos.filter((x) => x !== m) : [...f.momentos, m]);
  };

  return (
    <main className="pantalla">
      <Cabecera />
      <div className="pantalla__cuerpo">
        <h1>{receta ? 'Editar receta' : 'Nueva receta'}</h1>

        <label className="ayuda" htmlFor="titulo">Título</label>
        <input id="titulo" className="campo" maxLength={60} value={f.titulo} onChange={(e) => cambiar('titulo', e.target.value)} placeholder="Ej.: Lentejas de mi madre" />
        <label className="ayuda" htmlFor="descripcion">Una frase que la describa (opcional)</label>
        <input id="descripcion" className="campo" maxLength={120} value={f.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} />

        <div className="fila-datos">
          <label className="ayuda">Raciones
            <span className="mini-contador">
              <button type="button" onClick={() => cambiar('raciones', Math.max(1, f.raciones - 1))} aria-label="Una ración menos">−</button>
              <span>{f.raciones}</span>
              <button type="button" onClick={() => cambiar('raciones', Math.min(12, f.raciones + 1))} aria-label="Una ración más">+</button>
            </span>
          </label>
          <label className="ayuda" htmlFor="tiempo">Minutos
            <input id="tiempo" className="campo campo--corto" type="number" inputMode="numeric" min="1" max="300"
              value={f.tiempoMin} onChange={(e) => cambiar('tiempoMin', e.target.value)} />
          </label>
        </div>

        <p className="ayuda">Dificultad</p>
        <div className="chips" role="group" aria-label="Dificultad">
          {[1, 2, 3].map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={f.dificultad === d} onClick={() => cambiar('dificultad', d)}>{DIFICULTADES[d]}</button>
          ))}
        </div>

        <div className="opciones">
          <Opcion icono="🍽️" titulo="Vale para comida" activa={f.momentos.includes('comida')} onClick={() => alternarMomento('comida')} />
          <Opcion icono="🌙" titulo="Vale para cena" activa={f.momentos.includes('cena')} onClick={() => alternarMomento('cena')} />
          <Opcion icono="🥡" titulo="Aguanta como sobras" detalle={f.sobras.apta ? `Hasta ${f.sobras.dias || 2} días en la nevera` : 'Se come recién hecha'}
            activa={f.sobras.apta} onClick={() => cambiar('sobras', f.sobras.apta ? { apta: false, dias: 0 } : { apta: true, dias: 2 })} />
        </div>

        <h2>Ingredientes</h2>
        <p className="ayuda">Escribe la cantidad para {f.raciones} {f.raciones === 1 ? 'ración' : 'raciones'}: la app la ajusta sola a cada plan.</p>
        <ul className="filas-ingredientes">
          {f.ingredientes.map((i, n) => (
            <li key={i.id}>
              <span className="filas-ingredientes__nombre">{i.nombre}{i.nuevo && <span className="ayuda"> (nuevo)</span>}</span>
              {i.unidad !== 'al-gusto' && (
                <input className="campo campo--corto" type="number" inputMode="decimal" min="0" step="any" aria-label={`Cantidad de ${i.nombre}`}
                  value={i.cantidad} onChange={(e) => cambiarFila('ingredientes', n, { cantidad: e.target.value })} />
              )}
              <select className="campo campo--corto" value={i.unidad} aria-label={`Unidad de ${i.nombre}`}
                onChange={(e) => cambiarFila('ingredientes', n, { unidad: e.target.value })}>
                {unidadesDe(i).map((u) => <option key={u} value={u}>{NOMBRE_UNIDAD[u] ?? u}</option>)}
              </select>
              <button type="button" className="quitar" onClick={() => quitarFila('ingredientes', n)} aria-label={`Quitar ${i.nombre}`}>✕</button>
            </li>
          ))}
        </ul>
        <AnadirIngrediente onAnadir={(fila) => !f.ingredientes.some((x) => x.id === fila.id) && cambiar('ingredientes', [...f.ingredientes, fila])} />
        {f.ingredientes.length > 0 && (
          <p className="ayuda">
            {aptaPara.length ? `Apta para: ${aptaPara.map((d) => DIETAS[d].nombre.toLowerCase()).join(', ')}.` : 'Con estos ingredientes no es apta para ninguna dieta especial.'}
          </p>
        )}

        <h2>Pasos</h2>
        <ol className="filas-pasos">
          {f.pasos.map((p, n) => (
            <li key={n}>
              <textarea className="campo" rows={3} value={p.texto} aria-label={`Paso ${n + 1}`}
                onChange={(e) => cambiarFila('pasos', n, { texto: e.target.value })} placeholder="Explícalo como si fuera la primera vez que alguien cocina" />
              <div className="filas-pasos__extra">
                <label className="ayuda">Temporizador
                  <input className="campo campo--corto" type="number" inputMode="numeric" min="0" placeholder="min"
                    value={p.minutos} onChange={(e) => cambiarFila('pasos', n, { minutos: e.target.value })} />
                </label>
                <button type="button" className="quitar" onClick={() => mover(n, -1)} disabled={n === 0} aria-label="Subir paso">↑</button>
                <button type="button" className="quitar" onClick={() => mover(n, 1)} disabled={n === f.pasos.length - 1} aria-label="Bajar paso">↓</button>
                <button type="button" className="quitar" onClick={() => quitarFila('pasos', n)} aria-label="Quitar paso">✕</button>
              </div>
            </li>
          ))}
        </ol>
        <Boton variante="secundario" onClick={() => cambiar('pasos', [...f.pasos, { texto: '', minutos: '' }])}>Añadir paso</Boton>

        <h2>¿Qué técnicas practica?</h2>
        <p className="ayuda">Opcional. Si la marcas, contará para tu camino.</p>
        <div className="chips">
          {TECNICAS.map((t) => (
            <button key={t.id} type="button" className="chip" aria-pressed={f.tecnicas.includes(t.id)}
              onClick={() => cambiar('tecnicas', f.tecnicas.includes(t.id) ? f.tecnicas.filter((x) => x !== t.id) : [...f.tecnicas, t.id])}>
              {t.titulo}
            </button>
          ))}
        </div>

        <div className="opciones">
          <Opcion icono="🤝" titulo="Compartir con la comunidad"
            detalle={modoPrueba ? 'Disponible cuando la app esté conectada' : 'La revisaremos antes de publicarla'}
            activa={compartir} disabled={modoPrueba} onClick={() => setCompartir(!compartir)} />
        </div>

        {problemas.length > 0 && <ul className="ayuda lista-problemas">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="pantalla__pie">
        <Boton onClick={guardar} disabled={problemas.length > 0 || guardando}>{guardando ? 'Guardando…' : 'Guardar receta'}</Boton>
        {receta && <Boton variante="texto" onClick={() => onBorrar(receta.id).then(() => ir('#recetas'))}>Borrar receta</Boton>}
      </div>
    </main>
  );
}
