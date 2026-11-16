// Lista de la compra a partir de un plan.
import { aUnidadBase, formatear } from './units.js';
import { cocinadosDelPlan } from './planner.js';

export const SECCIONES = [
  { id: 'frutas-verduras', nombre: 'Frutas y verduras' },
  { id: 'carne-pescado', nombre: 'Carne y pescado' },
  { id: 'lacteos-huevos', nombre: 'Lácteos y huevos' },
  { id: 'despensa', nombre: 'Despensa' },
  { id: 'congelados', nombre: 'Congelados' },
  { id: 'basicos', nombre: 'Básicos de despensa: comprueba que te quedan' },
];

// Aceite, sal, especias...: se compran de vez en cuando, no por receta
const seccionDe = (ing) => (ing.basico ? 'basicos' : ing.seccion);

/**
 * @param {object} plan        el plan (con huecos)
 * @param {Map} recetasPorId   recetas YA adaptadas a la dieta del usuario
 * @param {Map} catalogo       ingredientes
 * @returns secciones con sus artículos: [{ id, nombre, articulos: [{ id, nombre, texto, recetas, revisar }] }]
 */
export function generarLista(plan, recetasPorId, catalogo) {
  const suma = new Map(); // id → { cantidad, unidad, recetas:Set }

  for (const c of cocinadosDelPlan(plan)) {
    const receta = recetasPorId.get(c.recetaId);
    if (!receta) continue;
    const factor = c.raciones / receta.raciones;
    for (const item of receta.ingredientes) {
      const ing = catalogo.get(item.id);
      if (ing.enLista === false) continue;
      const base = aUnidadBase(item, catalogo);
      const actual = suma.get(item.id) ?? { cantidad: 0, unidad: base.unidad, recetas: new Set() };
      actual.cantidad += base.cantidad * factor;
      actual.recetas.add(receta.titulo);
      suma.set(item.id, actual);
    }
  }

  return SECCIONES.map((s) => ({
    ...s,
    articulos: [...suma.entries()]
      .filter(([id]) => seccionDe(catalogo.get(id)) === s.id)
      .map(([id, v]) => {
        const ing = catalogo.get(id);
        return {
          id,
          nombre: ing.nombre,
          texto: ing.basico ? '' : formatear(v.cantidad, v.unidad),
          recetas: [...v.recetas],
          revisar: Boolean(ing.avisoTrazas),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  })).filter((s) => s.articulos.length);
}

// Texto para compartir por WhatsApp o pegar en notas
export function listaComoTexto(secciones, tengo = new Set()) {
  const lineas = ['🛒 Lista de la compra', ''];
  for (const s of secciones) {
    const pendientes = s.articulos.filter((a) => !tengo.has(a.id));
    if (!pendientes.length) continue;
    lineas.push(`*${s.nombre}*`);
    pendientes.forEach((a) => lineas.push(`- ${a.nombre}${!a.texto || a.texto === 'al gusto' ? '' : `: ${a.texto}`}`));
    lineas.push('');
  }
  return lineas.join('\n').trim();
}
