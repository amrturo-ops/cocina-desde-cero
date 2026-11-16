// Carga el contenido (ingredientes, técnicas y recetas) desde los JSON del proyecto,
// y le suma las recetas de los usuarios (propias y de la comunidad).
import ingredientes from '../content/ingredients.json';
import tecnicas from '../content/techniques.json';
import { indexarCatalogo, recetasParaUsuario } from './diets.js';
import { NIVELES } from './progress.js';

const modulos = import.meta.glob('../content/recipes/*.json', { eager: true, import: 'default' });

export const CATALOGO = indexarCatalogo(ingredientes);
export const RECETAS = Object.values(modulos).map((r) => ({ ...r, origen: 'oficial' }));
export const TECNICAS = [...tecnicas].sort(
  (a, b) => NIVELES.indexOf(a.nivel) - NIVELES.indexOf(b.nivel) || a.orden - b.orden
);

let recetasUsuario = [];

// Recetas propias y de la comunidad. Sus ingredientes nuevos se añaden al catálogo.
export function fijarRecetasUsuario(lista) {
  for (const r of lista) for (const ing of r.ingredientesNuevos ?? []) if (!CATALOGO.has(ing.id)) CATALOGO.set(ing.id, ing);
  recetasUsuario = lista;
}

export const todasLasRecetas = () => [...RECETAS, ...recetasUsuario];
export const tituloDe = (id) => todasLasRecetas().find((r) => r.id === id)?.titulo ?? 'Receta';
export const tecnicasDelNivel = (nivel) => TECNICAS.filter((t) => t.nivel === nivel);
export const recetasPara = (dietas) => recetasParaUsuario(todasLasRecetas(), dietas, CATALOGO);
