// Lógica de dietas: compatibilidad de ingredientes y adaptación de recetas.
// Funciones puras: no dependen de React ni de Supabase, así se pueden probar solas.

// tipo «dieta»: se eligen en el onboarding como dieta. tipo «alergia»: los alérgenos de declaración
// obligatoria en la UE (el gluten ya lo cubre la dieta «sin gluten»).
export const DIETAS = {
  estandar: { nombre: 'Estándar', tipo: 'dieta', excluye: [] },
  'sin-gluten': { nombre: 'Sin gluten', tipo: 'dieta', excluye: ['gluten'] },
  'sin-lactosa': { nombre: 'Sin lactosa', tipo: 'dieta', excluye: ['lactosa'] },
  vegetariana: { nombre: 'Vegetariana', tipo: 'dieta', excluye: ['carne', 'pescado'] },
  vegana: { nombre: 'Vegana', tipo: 'dieta', excluye: ['carne', 'pescado', 'huevo', 'lacteo', 'miel'] },

  'alergia-huevo': { nombre: 'Huevo', tipo: 'alergia', excluye: ['huevo'] },
  'alergia-leche': { nombre: 'Leche (proteína)', tipo: 'alergia', excluye: ['lacteo', 'lactosa'] },
  'alergia-pescado': { nombre: 'Pescado', tipo: 'alergia', excluye: ['pescado'] },
  'alergia-crustaceos': { nombre: 'Crustáceos', tipo: 'alergia', excluye: ['crustaceos'] },
  'alergia-moluscos': { nombre: 'Moluscos', tipo: 'alergia', excluye: ['moluscos'] },
  'alergia-cacahuete': { nombre: 'Cacahuete', tipo: 'alergia', excluye: ['cacahuete'] },
  'alergia-frutos-secos': { nombre: 'Frutos secos', tipo: 'alergia', excluye: ['frutos-secos'] },
  'alergia-soja': { nombre: 'Soja', tipo: 'alergia', excluye: ['soja'] },
  'alergia-apio': { nombre: 'Apio', tipo: 'alergia', excluye: ['apio'] },
  'alergia-mostaza': { nombre: 'Mostaza', tipo: 'alergia', excluye: ['mostaza'] },
  'alergia-sesamo': { nombre: 'Sésamo', tipo: 'alergia', excluye: ['sesamo'] },
  'alergia-sulfitos': { nombre: 'Sulfitos', tipo: 'alergia', excluye: ['sulfitos'] },
  'alergia-altramuces': { nombre: 'Altramuces', tipo: 'alergia', excluye: ['altramuces'] },
};

export const ALERGIAS = Object.keys(DIETAS).filter((d) => DIETAS[d].tipo === 'alergia');
export const separarDietas = (lista = []) => ({
  dietas: lista.filter((d) => DIETAS[d]?.tipo === 'dieta'),
  alergias: lista.filter((d) => DIETAS[d]?.tipo === 'alergia'),
});

// Dietas que activan el aviso de revisar etiquetado y trazas: sin gluten, sin lactosa y cualquier alergia
const DIETAS_CON_AVISO = ['sin-gluten', 'sin-lactosa', ...ALERGIAS];

// Limpia la selección del usuario:
// - "estándar" desaparece si hay otra dieta elegida
// - "vegana" ya incluye "vegetariana"
export function normalizarDietas(dietas = []) {
  let d = [...new Set(dietas)].filter((x) => DIETAS[x]);
  if (d.length > 1) d = d.filter((x) => x !== 'estandar');
  if (d.includes('vegana')) d = d.filter((x) => x !== 'vegetariana');
  if (d.includes('alergia-leche')) d = d.filter((x) => x !== 'sin-lactosa');
  return d.length ? d : ['estandar'];
}

export function indexarCatalogo(lista) {
  return new Map(lista.map((i) => [i.id, i]));
}

function prohibidos(dietas) {
  return new Set(dietas.flatMap((d) => DIETAS[d].excluye));
}

export function esApto(idIngrediente, dietas, catalogo) {
  const ing = catalogo.get(idIngrediente);
  if (!ing) throw new Error(`Ingrediente desconocido: ${idIngrediente}`);
  const excluidos = prohibidos(dietas);
  return !(ing.contiene || []).some((c) => excluidos.has(c));
}

// Adapta una receta a las dietas del usuario.
// Para cada ingrediente no apto, usa la primera alternativa apta (en el orden escrito en el JSON).
// Una alternativa con "por": [] significa quitar el ingrediente.
// Si algún ingrediente no apto no tiene alternativa válida, la receta se oculta.
export function adaptarReceta(receta, dietasUsuario, catalogo) {
  const dietas = normalizarDietas(dietasUsuario);
  const ingredientes = [];
  const cambios = [];
  const ajustesPasos = [];
  let titulo = receta.titulo;

  for (const item of receta.ingredientes) {
    if (esApto(item.id, dietas, catalogo)) {
      ingredientes.push({ id: item.id, cantidad: item.cantidad, unidad: item.unidad });
      continue;
    }
    const alt = (item.alternativas || []).find((a) =>
      a.por.every((p) => esApto(p.id, dietas, catalogo))
    );
    if (!alt) {
      return {
        visible: false,
        motivo: `«${catalogo.get(item.id).nombre}» no es apto y no tiene alternativa`,
      };
    }
    ingredientes.push(...alt.por.map((p) => ({ id: p.id, cantidad: p.cantidad, unidad: p.unidad })));
    cambios.push({ de: item.id, a: alt.por.map((p) => p.id) });
    if (alt.titulo) titulo = alt.titulo; // si varias alternativas cambian el título, gana la última
    ajustesPasos.push(...(alt.pasos || []));
  }

  // Aplicar cambios a los pasos (por índice del paso original)
  const pasos = receta.pasos.map((p) => ({ ...p, texto: rellenarMarcadores(p.texto, receta, cambios, catalogo) }));
  const aQuitar = new Set();
  for (const ajuste of ajustesPasos) {
    const paso = pasos[ajuste.indice];
    if (!paso) throw new Error(`${receta.id}: el paso ${ajuste.indice} no existe`);
    if (ajuste.quitar) aQuitar.add(ajuste.indice);
    if (ajuste.texto !== undefined) paso.texto = ajuste.texto;
    if (ajuste.temporizadorSeg !== undefined) paso.temporizadorSeg = ajuste.temporizadorSeg;
  }

  // Avisos de alérgenos
  const conAviso = dietas.some((d) => DIETAS_CON_AVISO.includes(d));
  const revisar = conAviso
    ? ingredientes.filter((i) => catalogo.get(i.id).avisoTrazas).map((i) => catalogo.get(i.id).nombre)
    : [];

  return {
    visible: true,
    receta: {
      ...receta,
      titulo,
      ingredientes,
      pasos: pasos.filter((_, i) => !aQuitar.has(i)),
      adaptada: cambios.length > 0,
      cambios,
      avisos: {
        etiquetado: conAviso, // mostrar siempre el recordatorio general
        revisar, // ingredientes donde es especialmente importante mirar la etiqueta
      },
    },
  };
}

// En los pasos, {id-ingrediente} se cambia por el nombre del ingrediente que se usa de verdad
// (el original o su alternativa), en minúsculas y sin aclaraciones entre paréntesis.
const nombreCorto = (ing) => ing.nombre.replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase();
function rellenarMarcadores(texto, receta, cambios, catalogo) {
  if (!texto.includes('{')) return texto;
  const sustituto = new Map(cambios.map((c) => [c.de, c.a.filter((id) => catalogo.get(id)?.enLista !== false)]));
  return texto.replace(/\{([a-z0-9-]+)\}/g, (_, id) => {
    const ids = sustituto.has(id) ? sustituto.get(id) : [id];
    const nombres = ids.map((x) => catalogo.get(x)).filter(Boolean).map(nombreCorto);
    return nombres.length ? nombres.join(' y ') : 'los ingredientes';
  });
}

export function recetasParaUsuario(recetas, dietas, catalogo) {
  return recetas
    .map((r) => adaptarReceta(r, dietas, catalogo))
    .filter((r) => r.visible)
    .map((r) => r.receta);
}
