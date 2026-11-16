// Comprueba que el contenido es coherente y muestra qué ve cada combinación de dietas.
// Uso: npm run probar   (o: node scripts/probar-contenido.mjs)

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { indexarCatalogo, adaptarReceta, recetasParaUsuario, DIETAS } from '../src/lib/diets.js';
import { calcularProgreso } from '../src/lib/progress.js';
import { tipoDe } from '../src/lib/categorias.js';
import { generarLista, listaComoTexto } from '../src/lib/shopping.js';
import { planificar, cambiarComensalesHueco, cambiarComensalesPlan, cocinadosDelPlan, MOMENTOS } from '../src/lib/planner.js';

const DIR = new URL('../src/content/', import.meta.url).pathname;
const leer = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

const catalogo = indexarCatalogo(leer('ingredients.json'));
const NIVELES_ORDEN = ['novato', 'basico', 'cocinillas'];
const tecnicas = leer('techniques.json').sort((a, b) => NIVELES_ORDEN.indexOf(a.nivel) - NIVELES_ORDEN.indexOf(b.nivel) || a.orden - b.orden);
const recetas = readdirSync(join(DIR, 'recipes'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => leer(join('recipes', f)));

const errores = [];
const avisos = [];
const idsTecnicas = new Set(tecnicas.map((t) => t.id));
const SECCIONES = ['frutas-verduras', 'carne-pescado', 'lacteos-huevos', 'despensa', 'congelados'];

// 1. Integridad del catálogo
for (const ing of catalogo.values()) {
  if (!SECCIONES.includes(ing.seccion)) errores.push(`Ingrediente ${ing.id}: sección «${ing.seccion}» no válida`);
}

// 2. Integridad de las recetas
function comprobarItem(receta, item, donde) {
  const ing = catalogo.get(item.id);
  if (!ing) return errores.push(`${receta.id} (${donde}): ingrediente «${item.id}» no está en el catálogo`);
  const validas = [ing.unidadBase, ...Object.keys(ing.conversiones || {})];
  if (!validas.includes(item.unidad))
    errores.push(`${receta.id} (${donde}): unidad «${item.unidad}» no válida para ${item.id} (válidas: ${validas.join(', ')})`);
}

for (const r of recetas) {
  if (!Array.isArray(r.momentos) || !r.momentos.length || r.momentos.some((m) => !MOMENTOS.includes(m)))
    errores.push(`${r.id}: «momentos» debe ser una lista con ${MOMENTOS.join(' y/o ')}`);
  if (!r.sobras || typeof r.sobras.apta !== 'boolean' || (r.sobras.apta && !(r.sobras.dias >= 1)))
    errores.push(`${r.id}: «sobras» debe ser { apta: true/false, dias: número ≥ 1 si es apta }`);
  if (![1, 2, 3].includes(r.dificultad)) errores.push(`${r.id}: «dificultad» debe ser 1 (fácil), 2 (media) o 3 (elaborada)`);
  for (const t of r.tecnicas) if (!idsTecnicas.has(t)) errores.push(`${r.id}: técnica «${t}» no existe`);
  r.ingredientes.forEach((item) => {
    comprobarItem(r, item, 'base');
    (item.alternativas || []).forEach((alt) => {
      alt.por.forEach((p) => comprobarItem(r, p, `alternativa de ${item.id}`));
      (alt.pasos || []).forEach((p) => {
        if (!r.pasos[p.indice]) errores.push(`${r.id}: la alternativa de ${item.id} toca el paso ${p.indice}, que no existe`);
      });
    });
  });
  for (const p of r.pasos) for (const [, id] of p.texto.matchAll(/\{([a-z0-9-]+)\}/g))
    if (!r.ingredientes.some((i) => i.id === id)) errores.push(`${r.id}: el paso «${p.texto.slice(0, 30)}…» usa {${id}}, que no es un ingrediente de la receta`);
  if (!['novato', 'basico', 'cocinillas'].includes(r.nivel)) errores.push(`${r.id}: nivel «${r.nivel}» no válido`);
  // Dos ingredientes distintos que modifican el mismo paso pueden pisarse
  const tocados = new Map();
  r.ingredientes.forEach((item) =>
    (item.alternativas || []).forEach((alt) =>
      (alt.pasos || []).forEach((p) => {
        if (tocados.has(p.indice) && tocados.get(p.indice) !== item.id)
          avisos.push(`${r.id}: el paso ${p.indice} lo modifican alternativas de ${tocados.get(p.indice)} y ${item.id}`);
        tocados.set(p.indice, item.id);
      })
    )
  );
}

// 3. Qué ve cada combinación de dietas
const COMBINACIONES = [
  ['estandar'],
  ['sin-gluten'],
  ['sin-lactosa'],
  ['vegetariana'],
  ['vegana'],
  ['vegana', 'sin-gluten'],
  ['sin-gluten', 'sin-lactosa'],
  ['vegana', 'sin-gluten', 'sin-lactosa'],
  ['alergia-frutos-secos'],
  ['alergia-soja'],
  ['alergia-sulfitos', 'alergia-apio', 'alergia-mostaza'],
  ['alergia-huevo', 'alergia-leche'],
  ['vegana', 'alergia-soja'],
];

const nombreDietas = (c) => c.map((d) => DIETAS[d].nombre).join(' + ');
const nombre = (id) => catalogo.get(id).nombre;

if (errores.length === 0) {
  for (const combo of COMBINACIONES) {
    console.log(`\n━━ ${nombreDietas(combo)} ━━`);
    const visibles = [];
    for (const r of recetas) {
      const res = adaptarReceta(r, combo, catalogo);
      if (!res.visible) {
        console.log(`  ✗ ${r.titulo} — ${res.motivo}`);
        continue;
      }
      visibles.push(res.receta);
      const cambios = res.receta.cambios
        .map((c) => (c.a.length ? `${nombre(c.de)} → ${c.a.map(nombre).join(' + ')}` : `sin ${nombre(c.de)}`))
        .join('; ');
      console.log(`  ✓ ${res.receta.titulo}${cambios ? `  [${cambios}]` : ''}`);
      if (res.receta.avisos.revisar.length)
        console.log(`      ⚠ revisar etiqueta: ${res.receta.avisos.revisar.join(', ')}`);
    }

    // 4. Progresión: ¿se puede avanzar con esta dieta? (nivel a nivel; los anteriores se dan por dominados)
    const NIV = ['novato', 'basico', 'cocinillas'];
    tecnicas.forEach((t) => {
      const delNivel = tecnicas.filter((x) => x.nivel === t.nivel);
      const i = delNivel.indexOf(t);
      const permitidas = new Set([
        ...tecnicas.filter((x) => NIV.indexOf(x.nivel) < NIV.indexOf(t.nivel)).map((x) => x.id),
        ...delNivel.slice(0, i + 1).map((x) => x.id),
      ]);
      const paraDesbloquear = visibles.filter(
        (r) => r.tecnicas.includes(t.id) && r.tecnicas.every((x) => permitidas.has(x))
      );
      const paraDominar = visibles.filter((r) => r.tecnicas.includes(t.id));
      if (paraDominar.length < 2)
        avisos.push(`${nombreDietas(combo)}: «${t.titulo}» solo tiene ${paraDominar.length} receta(s); hacen falta 2 para dominarla`);
    });
  }
}

// 5. Planes de ejemplo
if (errores.length === 0) {
  const pintar = (titulo, plan, disponibles) => {
    const nombreR = (id) => disponibles.find((r) => r.id === id)?.titulo ?? '— elige receta —';
    console.log(`\n━━ ${titulo} ━━`);
    plan.huecos.forEach((h) => {
      let etiqueta = nombreR(h.recetaId);
      if (h.tipo === 'sobras') etiqueta = `sobras de ${etiqueta}`;
      if (h.tipo === 'nadie') etiqueta = 'nadie come en casa';
      const extra = h.tipo === 'cocinar' && h.sobrasEn !== undefined ? '  (cocina doble)' : '';
      console.log(`  Día ${h.dia} · ${h.comida.padEnd(6)} · ${String(h.comensales).padStart(2)} 🍽  → ${etiqueta}${extra}`);
    });
    console.log('  Cocinar:');
    cocinadosDelPlan(plan).forEach((c) =>
      console.log(`    Día ${c.dia} ${c.comida}: ${nombreR(c.recetaId)} × ${c.raciones} raciones`));
  };
  const comprobar = (condicion, mensaje) => { if (!condicion) errores.push(`Planificador: ${mensaje}`); };

  const estandar = recetasParaUsuario(recetas, ['estandar'], catalogo);
  const veganaSG = recetasParaUsuario(recetas, ['vegana', 'sin-gluten'], catalogo);

  pintar('Plan 1 día · solo comida · 1 comensal',
    planificar({ dias: 1, comidas: ['comida'], comensales: 1, usarSobras: false, recetas: estandar }), estandar);

  // Plan con excepciones decididas al crearlo
  const p3 = planificar({
    dias: 3, comidas: ['comida', 'cena'], comensales: 2, usarSobras: true, recetas: veganaSG,
    ajustes: { '2-cena': 4, '3-comida': 0 },
  });
  pintar('Plan 3 días · 2 comensales · día 2 cena con 4 · día 3 comida fuera · con sobras · vegana + sin gluten', p3, veganaSG);
  comprobar(p3.huecos.find((h) => h.dia === 3 && h.comida === 'comida').tipo === 'nadie', 'una comida con 0 comensales debería quedar vacía');
  comprobar(!p3.huecos.some((h) => h.tipo === 'sobras' && h.comensales === 0), 'ha puesto sobras en una comida sin comensales');

  // Cambios después de crear el plan
  let p = planificar({ dias: 4, comidas: ['comida', 'cena'], comensales: 2, usarSobras: true, recetas: veganaSG });
  const i0 = p.huecos.findIndex((h) => h.tipo === 'cocinar' && h.sobrasEn !== undefined);
  const sobrasDe0 = p.huecos[i0].sobrasEn;
  const comidaI0 = p.huecos[i0];
  p = cambiarComensalesHueco(p, sobrasDe0, 3);
  const racionesDia1 = cocinadosDelPlan(p).find((c) => c.dia === comidaI0.dia && c.comida === comidaI0.comida).raciones;
  comprobar(racionesDia1 === 5, `un plato con sobras para 3 debería cocinar 2 + 3 = 5 raciones, y cocina ${racionesDia1}`);
  p = cambiarComensalesHueco(p, i0, 0);
  comprobar(p.huecos[sobrasDe0].tipo === 'cocinar', 'al quitar comensales de un plato con sobras, debería cocinarse el día de las sobras');
  p = cambiarComensalesPlan(p, 1);
  comprobar(p.huecos[sobrasDe0].comensales === 3 && p.huecos[i0].comensales === 0, 'cambiar los comensales del plan no debe pisar los ajustes por comida');
  pintar('Plan 4 días tras: unas sobras para 3 · el plato original fuera de casa · resto del plan a 1 comensal', p, veganaSG);

  const faciles = planificar({ dias: 5, comidas: ['comida', 'cena'], comensales: 2, usarSobras: true, dificultadMax: 1, recetas: estandar });
  comprobar(faciles.huecos.every((h) => !h.recetaId || recetas.find((r) => r.id === h.recetaId).dificultad === 1), 'un plan «solo fáciles» ha incluido recetas más difíciles');
  console.log(`\n  Plan de 5 días con recetas fáciles y sobras: ${new Set(faciles.huecos.map((h) => h.recetaId)).size} recetas distintas`);
  // Variedad: 7 días con comida y cena, cada dificultad
  for (const dif of [1, 2, 3]) {
    const p7 = planificar({ dias: 7, comidas: ['comida', 'cena'], comensales: 2, usarSobras: false, dificultadMax: dif, recetas: estandar });
    const coc = p7.huecos.filter((h) => h.tipo === 'cocinar').map((h) => estandar.find((r) => r.id === h.recetaId));
    const porTipo = {};
    coc.forEach((r) => { porTipo[tipoDe(r)] = (porTipo[tipoDe(r)] || 0) + 1; });
    comprobar(new Set(coc.map((r) => r.id)).size === coc.length, `plan de dificultad ${dif}: repite recetas`);
    comprobar(Math.max(...Object.values(porTipo)) <= 3, `plan de dificultad ${dif}: repite demasiado un tipo de plato (${JSON.stringify(porTipo)})`);
    comprobar(coc.every((r) => r.dificultad === dif), `plan de dificultad ${dif}: mezcla otras dificultades`);
    const diaRepetido = [...new Set(p7.huecos.map((h) => h.dia))].some((dd) => {
      const t = p7.huecos.filter((h) => h.dia === dd && h.recetaId).map((h) => tipoDe(estandar.find((r) => r.id === h.recetaId)));
      return new Set(t).size < t.length;
    });
    comprobar(!diaRepetido, `plan de dificultad ${dif}: repite tipo de plato en un mismo día`);
  }
  console.log('\n  Variedad de los planes de 7 días: comprobada para las 3 dificultades');
  const cenas = planificar({ dias: 2, comidas: ['cena'], comensales: 2, usarSobras: false, recetas: estandar });
  comprobar(!cenas.huecos.some((h) => h.recetaId === 'ensalada-pasta'), 'ha puesto en una cena una receta que solo es para comida');
}

// 6. Progreso: simulamos a un usuario vegano y sin gluten cocinando paso a paso
if (errores.length === 0) {
  const disponibles = recetasParaUsuario(recetas, ['vegana', 'sin-gluten'], catalogo);
  const novato = tecnicas.filter((t) => t.nivel === 'novato');
  const soloNovato = disponibles.filter((r) => r.nivel === 'novato');
  const comprobar = (condicion, mensaje) => { if (!condicion) errores.push(`Progreso: ${mensaje}`); };
  const hechas = [];
  const cocinar = (id) => hechas.push({ receta_id: id, tecnicas: recetas.find((r) => r.id === id).tecnicas });
  const estado = () => calcularProgreso(novato, soloNovato, hechas, 'novato');
  const de = (p, id) => p.tecnicas.find((t) => t.id === id).estado;
  const resumen = (p) => p.tecnicas.map((t) => `${t.titulo}: ${t.estado} (${t.hechas}/${t.objetivo})`).join(' | ');

  console.log('\n━━ Progreso simulado (vegana + sin gluten) ━━');
  let p = estado();
  console.log(`  Al empezar → ${resumen(p)}`);
  console.log(`    Puede cocinar: ${p.recetasDisponibles.map((r) => r.titulo).join(', ')}`);
  comprobar(p.recetasDisponibles.length === soloNovato.length, 'sin pagar, todas las recetas de Novato deben estar abiertas desde el principio');
  const conBasico = calcularProgreso(tecnicas.filter((t) => t.nivel === 'basico'), disponibles, [], 'basico');
  comprobar(conBasico.bloqueado && conBasico.recetasPremium.length > 0, 'sin Premium, el nivel Básico debe estar bloqueado');
  comprobar(conBasico.recetasDisponibles.some((r) => r.nivel === 'basico' && r.muestra) || !disponibles.some((r) => r.id === 'pizza-margarita'), 'la receta de muestra de Básico debe estar abierta');
  const premiumBasico = calcularProgreso(tecnicas.filter((t) => t.nivel === 'basico'), disponibles, [], 'basico', { premium: true });
  comprobar(!premiumBasico.bloqueado && premiumBasico.recetasPremium.length === 0, 'con Premium, todas las recetas deben estar abiertas');

  cocinar('ensalada-garbanzos'); p = estado();
  console.log(`  Tras la ensalada de garbanzos → ${resumen(p)}`);

  cocinar('ensalada-garbanzos'); p = estado();
  comprobar(de(p, 'cortar-cebolla') === 'disponible', 'repetir la misma receta no debe contar para dominar');

  cocinar('pisto-rapido'); p = estado();
  console.log(`  Tras el pisto → ${resumen(p)}`);
  comprobar(de(p, 'cortar-cebolla') === 'dominada', 'el pisto debe dominar «cortar cebolla»');

  ['tortilla-patatas', 'pasta-tomate-atun', 'pasta-brocoli'].forEach(cocinar); p = estado();
  console.log(`  Tras tortilla y dos pastas → ${resumen(p)}`);
  comprobar(['cortar-cebolla', 'sofreir', 'cocer-pasta'].every((t) => de(p, t) === 'dominada'), 'estas recetas deberían dominar las 3 primeras técnicas');

  // Cocinar lo que vaya quedando disponible hasta que no se pueda avanzar más
  let vueltas = 0;
  while (!p.nivelCompletado && vueltas++ < 50) {
    const nueva = p.recetasDisponibles.find((r) => !hechas.some((h) => h.receta_id === r.id));
    if (!nueva) break;
    cocinar(nueva.id);
    p = estado();
  }
  console.log(`  Cocinando lo disponible (${new Set(hechas.map((h) => h.receta_id)).size} recetas) → ${p.dominadas} de ${p.total} técnicas, nivel completado: ${p.nivelCompletado ? 'sí' : 'no'}`);
  comprobar(p.nivelCompletado, 'cocinando todo lo disponible debería poder completar el nivel');
}

// 7. Lista de la compra de un plan
if (errores.length === 0) {
  const veganaSG = recetasParaUsuario(recetas, ['vegana', 'sin-gluten'], catalogo);
  const porId = new Map(veganaSG.map((r) => [r.id, r]));
  const plan = planificar({ dias: 3, comidas: ['comida', 'cena'], comensales: 2, usarSobras: true, recetas: veganaSG, ajustes: { '2-cena': 4 } });
  const lista = generarLista(plan, porId, catalogo);
  console.log('\n━━ Lista de la compra: 3 días, comida y cena, 2 comensales (4 el día 2 en la cena), vegana + sin gluten ━━');
  console.log(listaComoTexto(lista).split('\n').map((l) => '  ' + l).join('\n'));
  if (lista.some((s) => s.articulos.some((a) => a.id === 'agua'))) errores.push('Lista: el agua no debería aparecer');
  if (lista.some((s) => s.articulos.some((a) => catalogo.get(a.id).contiene?.includes('gluten')))) errores.push('Lista: aparece un ingrediente con gluten');
}

console.log('\n━━ Resultado ━━');
errores.forEach((e) => console.log(`  ❌ ${e}`));
avisos.forEach((a) => console.log(`  ⚠ ${a}`));
if (!errores.length && !avisos.length) console.log('  ✅ Todo correcto: el contenido es coherente para todas las combinaciones.');
console.log(`  ${catalogo.size} ingredientes · ${tecnicas.length} técnicas · ${recetas.length} recetas\n`);
process.exit(errores.length ? 1 : 0);
