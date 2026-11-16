// Progreso del usuario (técnicas dominadas, reto, racha) y acceso a recetas (gratis o Premium).
// Funciones puras.

export const NIVELES = ['novato', 'basico', 'cocinillas'];
export const NOMBRE_NIVEL = { novato: 'Novato', basico: 'Básico', cocinillas: 'Cocinillas' };
export const RECETAS_PARA_DOMINAR = 2;

export function siguienteNivel(nivel) {
  return NIVELES[NIVELES.indexOf(nivel) + 1] ?? null;
}

import { NIVELES_GRATIS, RECETAS_MUESTRA } from '../textos.js';

// ¿Puede abrir esta receta? Las del nivel gratuito, las propias y las de muestra, siempre.
// Las de niveles de pago, solo con Premium.
export function recetaAccesible(r, premium) {
  return premium || r.origen === 'propia' || NIVELES_GRATIS.includes(r.nivel ?? 'novato') || RECETAS_MUESTRA.includes(r.id);
}

/**
 * Progreso en un nivel. Aprender NO bloquea recetas: el camino es una guía.
 * - Técnica dominada: 2 recetas distintas cocinadas que la practiquen.
 * - Técnica sugerida (actual): la primera del nivel que aún no está dominada.
 * - Receta disponible: según recetaAccesible (gratis o Premium).
 * @param {object[]} tecnicas     técnicas del nivel que se está viendo
 * @param {object[]} recetas      todas las recetas ya adaptadas a la dieta (solo las visibles)
 * @param {object[]} completadas  [{ receta_id, tecnicas: [...] }] lo que ha cocinado
 * @param {string}   nivel        nivel que se está viendo
 * @param {object}   opciones     { premium }
 */
export function calcularProgreso(tecnicas, recetas, completadas, nivel = tecnicas[0]?.nivel ?? 'novato', { premium = false } = {}) {
  const ordenadas = [...tecnicas].sort((a, b) => a.orden - b.orden);
  const tecnicasDeReceta = new Map(recetas.map((r) => [r.id, r.tecnicas]));

  const hechas = new Map(ordenadas.map((t) => [t.id, new Set()]));
  const cocinadas = new Set();
  for (const c of completadas) {
    cocinadas.add(c.receta_id);
    const practicadas = c.tecnicas?.length ? c.tecnicas : tecnicasDeReceta.get(c.receta_id) ?? [];
    for (const t of practicadas) hechas.get(t)?.add(c.receta_id);
  }

  const estados = ordenadas.map((t) => {
    const n = hechas.get(t.id).size;
    return { ...t, hechas: n, objetivo: RECETAS_PARA_DOMINAR, estado: n >= RECETAS_PARA_DOMINAR ? 'dominada' : 'disponible' };
  });

  const recetasConEstado = recetas.map((r) => {
    const accesible = recetaAccesible(r, premium);
    return { ...r, disponible: accesible, premium: !accesible, muestra: RECETAS_MUESTRA.includes(r.id), cocinada: cocinadas.has(r.id), faltan: accesible ? [] : ['Premium'] };
  });

  const delNivel = (r) => (r.nivel ?? 'novato') === nivel || r.origen === 'propia';
  const conRecetas = estados.map((t) => ({
    ...t,
    recetas: recetasConEstado
      .filter((r) => r.tecnicas.includes(t.id) && delNivel(r))
      .sort((a, b) => Number(b.disponible) - Number(a.disponible) || (a.dificultad ?? 2) - (b.dificultad ?? 2)),
  }));

  const dominadas = estados.filter((t) => t.estado === 'dominada').length;
  return {
    nivel,
    nivelDePago: !NIVELES_GRATIS.includes(nivel),
    bloqueado: !premium && !NIVELES_GRATIS.includes(nivel),
    tecnicas: conRecetas,
    tecnicaActual: estados.find((t) => t.estado !== 'dominada')?.id ?? null,
    dominadas,
    total: estados.length,
    porcentaje: estados.length ? Math.round((dominadas / estados.length) * 100) : 0,
    nivelCompletado: estados.length > 0 && dominadas === estados.length,
    recetasDisponibles: recetasConEstado.filter((r) => r.disponible),
    recetasPremium: recetasConEstado.filter((r) => !r.disponible),
  };
}

// ── Reto semanal y racha ──────────────────────────────────────────────────
// Reto: cocinar 3 recetas con foto entre lunes y domingo.
// Racha: semanas seguidas con el reto cumplido (la semana actual cuenta si ya está cumplido).
export const RETO_SEMANAL = 3;

function lunesDe(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
const claveSemana = (fecha) => {
  const d = lunesDe(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function calcularReto(completadas, hoy = new Date()) {
  const conFoto = new Map();
  let sinFotoEstaSemana = 0;
  const actual = claveSemana(hoy);
  for (const c of completadas) {
    const k = claveSemana(c.cocinado);
    if (c.foto_path) conFoto.set(k, (conFoto.get(k) || 0) + 1);
    else if (k === actual) sinFotoEstaSemana++;
  }
  const hechas = conFoto.get(actual) || 0;
  const cumplido = hechas >= RETO_SEMANAL;

  let racha = 0;
  const semana = lunesDe(hoy);
  if (!cumplido) semana.setDate(semana.getDate() - 7); // la semana en curso aún puede cumplirse
  while ((conFoto.get(claveSemana(semana)) || 0) >= RETO_SEMANAL) {
    racha++;
    semana.setDate(semana.getDate() - 7);
  }
  const diasQuedan = 7 - ((new Date(hoy).getDay() + 6) % 7); // incluye hoy
  return { hechas: Math.min(hechas, RETO_SEMANAL), objetivo: RETO_SEMANAL, cumplido, racha, sinFotoEstaSemana, diasQuedan };
}
