import { useState } from 'react';
import Boton from '../components/Boton.jsx';
import TarjetaReceta from '../components/TarjetaReceta.jsx';
import { ir } from '../hooks/useRuta.js';
import { DIFICULTADES } from '../lib/planner.js';
import { NIVELES, NOMBRE_NIVEL } from '../lib/progress.js';

const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function Recetas({ progreso, recetasOcultas }) {
  const [busqueda, setBusqueda] = useState('');
  const [dificultad, setDificultad] = useState(0); // 0 = todas
  const q = normalizar(busqueda.trim());
  const coincide = (r) =>
    (!q || normalizar(`${r.titulo} ${r.descripcion ?? ''}`).includes(q)) && (!dificultad || (r.dificultad ?? 2) === dificultad);

  // Todas las recetas aptas para su dieta: las que puede abrir y las Premium
  const unicas = [...progreso.recetasDisponibles, ...progreso.recetasPremium].filter(coincide);
  const propias = unicas.filter((r) => r.origen === 'propia');
  const comunidad = unicas.filter((r) => r.origen === 'comunidad');
  const oficiales = (nivel) => unicas
    .filter((r) => r.origen === 'oficial' && (r.nivel ?? 'novato') === nivel)
    .sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.titulo.localeCompare(b.titulo, 'es'));

  return (
    <main className="pantalla pantalla--con-nav">
      <div className="pantalla__cuerpo">
        <h1>Recetas</h1>
        <input className="campo" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar: lentejas, pasta, horno…" aria-label="Buscar recetas" />
        <div className="chips" role="group" aria-label="Filtrar por dificultad">
          {[0, 1, 2, 3].map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={dificultad === d} onClick={() => setDificultad(d)}>
              {d ? DIFICULTADES[d] : 'Todas'}
            </button>
          ))}
        </div>

        <section className="seccion-recetas">
          <h2>Tus recetas</h2>
          {propias.length ? <div className="recetas">{propias.map((r) => <TarjetaReceta key={r.id} receta={r} />)}</div>
            : !q && <p className="ayuda">¿Tienes un plato que te sale bien? Guárdalo aquí y la app lo usará en tus planes y en la lista de la compra.</p>}
          {recetasOcultas > 0 && !q && (
            <p className="ayuda">Tienes {recetasOcultas} {recetasOcultas === 1 ? 'receta que no encaja' : 'recetas que no encajan'} con tu dieta actual.</p>
          )}
          <Boton variante="secundario" onClick={() => ir('#editar')}>+ Crear una receta</Boton>
        </section>

        {comunidad.length > 0 && (
          <section className="seccion-recetas">
            <h2>De la comunidad</h2>
            <div className="recetas">{comunidad.map((r) => <TarjetaReceta key={r.id} receta={r} />)}</div>
          </section>
        )}

        {NIVELES.map((n) => oficiales(n).length > 0 && (
          <section key={n} className="seccion-recetas">
            <h2>Nivel {NOMBRE_NIVEL[n]}{n !== 'novato' && oficiales(n).some((r) => !r.disponible) ? ' 🔒' : ''}</h2>
            <div className="recetas">{oficiales(n).map((r) => <TarjetaReceta key={r.id} receta={r} />)}</div>
          </section>
        ))}
        {q && !unicas.length && <p className="ayuda">No hay recetas que coincidan con «{busqueda}».</p>}
      </div>
    </main>
  );
}
