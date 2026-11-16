// Planificador: reparte recetas en N días y en las comidas que elija el usuario.
// Funciones puras. Reciben recetas YA adaptadas a la dieta y desbloqueadas.
//
// Comensales:
// - plan.comensales: número habitual para todo el plan (sale del perfil).
// - plan.ajustes: excepciones por comida, p. ej. { "2-cena": 4, "3-comida": 0 }.
//   0 significa que ese día nadie come en casa: no se cocina y no se ponen sobras ahí.
// - Cada hueco guarda sus comensales ya resueltos en h.comensales.

export const MOMENTOS = ['comida', 'cena']; // orden dentro de un día
export const MAX_COMENSALES = 12;

// Dificultad de las recetas: 1 fácil, 2 media, 3 elaborada. El plan usa las de dificultad <= dificultadMax.
export const DIFICULTADES = { 1: 'Fácil', 2: 'Media', 3: 'Elaborada' };
const dificultad = (r) => r.dificultad ?? 2;
const aptaDificultad = (plan, r) => dificultad(r) <= (plan.dificultadMax ?? 3);

export const claveHueco = (dia, comida) => `${dia}-${comida}`;

function comensalesDe(plan, dia, comida) {
  const ajuste = plan.ajustes?.[claveHueco(dia, comida)];
  return ajuste ?? plan.comensales;
}

// Huecos vacíos: día 1 comida, día 1 cena, día 2 comida...
function crearHuecos(plan) {
  const elegidas = MOMENTOS.filter((m) => plan.comidas.includes(m));
  const huecos = [];
  for (let dia = 1; dia <= plan.dias; dia++) {
    for (const comida of elegidas) {
      const comensales = comensalesDe(plan, dia, comida);
      huecos.push({ dia, comida, comensales, tipo: comensales === 0 ? 'nadie' : 'libre', recetaId: null });
    }
  }
  return huecos;
}

// Pequeña variación determinista para que «Regenerar» dé otro plan
function azar(semilla, texto) {
  let h = semilla * 2654435761;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 2246822519);
  return ((h >>> 0) % 1000) / 1000;
}

const encaja = (receta, comida) => (receta.momentos || MOMENTOS).includes(comida);

// Prioriza la técnica que está aprendiendo y lo que no ha cocinado; evita repetir.
function puntuar(receta, { tecnicaActual, historial, usos, anterior, semilla }) {
  let p = 0;
  if (tecnicaActual && receta.tecnicas.includes(tecnicaActual)) p += 3;
  if (!historial.includes(receta.id)) p += 1;
  p -= 5 * (usos.get(receta.id) || 0);
  if (anterior === receta.id) p -= 10;
  return p + azar(semilla, receta.id);
}

// Hueco libre de un día posterior donde poner las sobras de lo cocinado en «origen».
function huecoParaSobras(huecos, origen, receta) {
  if (!receta.sobras?.apta) return -1;
  const h0 = huecos[origen];
  return huecos.findIndex(
    (h, j) =>
      j > origen &&
      h.tipo === 'libre' &&
      h.dia > h0.dia &&
      h.dia - h0.dia <= receta.sobras.dias &&
      encaja(receta, h.comida)
  );
}

const vaciar = (h) => ({ dia: h.dia, comida: h.comida, comensales: h.comensales, tipo: h.comensales === 0 ? 'nadie' : 'libre', recetaId: null });

// Coloca una receta en un hueco y, si procede, sus sobras en otro.
function colocar(huecos, i, receta, usarSobras) {
  huecos[i] = { ...vaciar(huecos[i]), tipo: 'cocinar', recetaId: receta.id };
  if (!usarSobras) return;
  const j = huecoParaSobras(huecos, i, receta);
  if (j >= 0) {
    huecos[j] = { ...vaciar(huecos[j]), tipo: 'sobras', recetaId: receta.id, origen: i };
    huecos[i].sobrasEn = j;
  }
}

// Quita el vínculo de sobras de un hueco (en cualquiera de los dos sentidos).
function desvincular(huecos, i) {
  const h = huecos[i];
  if (h.tipo === 'sobras') delete huecos[h.origen].sobrasEn;
  if (h.tipo === 'cocinar' && h.sobrasEn !== undefined) huecos[h.sobrasEn] = vaciar(huecos[h.sobrasEn]);
}

/**
 * Genera un plan.
 * @param {object} o
 * @param {number} o.dias             1 a 7
 * @param {string[]} o.comidas        ['comida'], ['cena'] o ['comida','cena']
 * @param {number} o.comensales       comensales habituales (del perfil)
 * @param {object} [o.ajustes]        excepciones por comida: { "2-cena": 4 }
 * @param {boolean} o.usarSobras      cocinar una vez para dos comidas cuando la receta lo permite
 * @param {number} [o.dificultadMax]  1 fácil, 2 hasta media, 3 cualquiera (por defecto 3)
 * @param {object[]} o.recetas        recetas disponibles para el usuario
 * @param {string[]} [o.historial]    ids de recetas cocinadas en los últimos 7 días
 * @param {string}  [o.tecnicaActual] técnica que está aprendiendo ahora
 * @param {number}  [o.semilla]       cambia para regenerar
 */
export function planificar({ dias, comidas, comensales, ajustes = {}, usarSobras, dificultadMax = 3, recetas, historial = [], tecnicaActual = null, semilla = 1 }) {
  const plan = { dias, comidas, comensales, ajustes: { ...ajustes }, usarSobras, dificultadMax };
  const huecos = crearHuecos(plan);
  const usos = new Map();
  let anterior = null;

  huecos.forEach((hueco, i) => {
    if (hueco.tipo !== 'libre') return;
    const candidatas = recetas.filter((r) => encaja(r, hueco.comida) && aptaDificultad(plan, r));
    if (!candidatas.length) return; // se queda libre: la interfaz pedirá elegir
    const ctx = { tecnicaActual, historial, usos, anterior, semilla };
    const elegida = [...candidatas].sort((a, b) => puntuar(b, ctx) - puntuar(a, ctx))[0];
    colocar(huecos, i, elegida, usarSobras);
    usos.set(elegida.id, (usos.get(elegida.id) || 0) + 1);
    anterior = elegida.id;
  });

  return { ...plan, huecos };
}

// Recetas posibles para un hueco, ordenadas de más a menos recomendable.
export function opcionesParaHueco(plan, i, recetas, { historial = [], tecnicaActual = null } = {}) {
  const usos = new Map();
  plan.huecos.forEach((h) => h.tipo === 'cocinar' && usos.set(h.recetaId, (usos.get(h.recetaId) || 0) + 1));
  const ctx = { tecnicaActual, historial, usos, anterior: null, semilla: 0 };
  return recetas
    .filter((r) => encaja(r, plan.huecos[i].comida) && aptaDificultad(plan, r))
    .sort((a, b) => puntuar(b, ctx) - puntuar(a, ctx));
}

// El usuario cambia la receta de un hueco.
export function cambiarReceta(plan, i, receta) {
  const huecos = plan.huecos.map((h) => ({ ...h }));
  if (huecos[i].tipo === 'nadie') throw new Error('En esa comida no hay nadie: ajusta antes los comensales');
  desvincular(huecos, i);
  huecos[i] = vaciar(huecos[i]);
  colocar(huecos, i, receta, plan.usarSobras);
  return { ...plan, huecos };
}

// Cambia los comensales de UNA comida.
export function cambiarComensalesHueco(plan, i, comensales) {
  const n = Math.max(0, Math.min(MAX_COMENSALES, comensales));
  const huecos = plan.huecos.map((h) => ({ ...h }));
  const h = huecos[i];
  const ajustes = { ...plan.ajustes };
  if (n === plan.comensales) delete ajustes[claveHueco(h.dia, h.comida)];
  else ajustes[claveHueco(h.dia, h.comida)] = n;

  if (n === 0) {
    // Nadie come aquí. Si se cocinaba y tenía sobras, se cocina en el hueco de las sobras.
    if (h.tipo === 'cocinar' && h.sobrasEn !== undefined) {
      const j = h.sobrasEn;
      huecos[j] = { ...vaciar(huecos[j]), tipo: 'cocinar', recetaId: h.recetaId };
    } else {
      desvincular(huecos, i);
    }
    huecos[i] = { ...vaciar({ ...h, comensales: 0 }) };
  } else if (h.tipo === 'nadie') {
    huecos[i] = vaciar({ ...h, comensales: n }); // vuelve a estar libre para elegir receta
  } else {
    huecos[i].comensales = n;
  }
  return { ...plan, ajustes, huecos };
}

// Cambia los comensales habituales de TODO el plan. Respeta las comidas ajustadas a mano.
export function cambiarComensalesPlan(plan, comensales) {
  const n = Math.max(1, Math.min(MAX_COMENSALES, comensales));
  const huecos = plan.huecos.map((h) =>
    plan.ajustes[claveHueco(h.dia, h.comida)] === undefined ? { ...h, comensales: n } : { ...h }
  );
  return { ...plan, comensales: n, huecos };
}

// Lo que hay que cocinar realmente (para la lista de la compra y la pantalla «Hoy cocinas»).
// Las raciones suman los comensales de la comida y, si hay sobras, los de la comida de las sobras.
export function cocinadosDelPlan(plan) {
  return plan.huecos
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.tipo === 'cocinar')
    .map(({ h }) => ({
      dia: h.dia,
      comida: h.comida,
      recetaId: h.recetaId,
      raciones: h.comensales + (h.sobrasEn !== undefined ? plan.huecos[h.sobrasEn].comensales : 0),
      conSobras: h.sobrasEn !== undefined,
    }));
}
