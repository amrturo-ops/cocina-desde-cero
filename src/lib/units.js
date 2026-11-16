// Unidades: convertir a la unidad base del ingrediente, escalar y mostrar cantidades amigables.

export function aUnidadBase(item, catalogo) {
  const ing = catalogo.get(item.id);
  if (item.unidad === 'al-gusto' || ing.unidadBase === 'al-gusto') return { cantidad: 0, unidad: 'al-gusto' };
  if (item.unidad === ing.unidadBase) return { cantidad: item.cantidad, unidad: ing.unidadBase };
  const factor = ing.conversiones?.[item.unidad];
  if (!factor) throw new Error(`No sé convertir ${item.unidad} de ${item.id}`);
  return { cantidad: item.cantidad * factor, unidad: ing.unidadBase };
}

// Redondeo pensado para comprar: nadie compra 237 g de pasta
function redondearPeso(n) {
  if (n <= 0) return 0;
  const paso = n < 50 ? 5 : n < 250 ? 10 : n < 1000 ? 25 : 50;
  return Math.ceil(n / paso) * paso;
}

const FRACCIONES = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };

function enCuartos(n) {
  const redondeado = Math.ceil(n * 4) / 4;
  const entero = Math.floor(redondeado);
  const fraccion = FRACCIONES[+(redondeado - entero).toFixed(2)];
  return { valor: redondeado, texto: `${entero || (fraccion ? '' : '0')}${fraccion}` };
}

const PLURAL = { unidad: ['unidad', 'unidades'], diente: ['diente', 'dientes'], manojo: ['manojo', 'manojos'] };

// Devuelve el texto a mostrar: «250 g», «1,5 kg», «1½ unidades», «3 dientes», «al gusto»
export function formatear(cantidad, unidad) {
  if (unidad === 'al-gusto') return 'al gusto';
  if (unidad === 'g' || unidad === 'ml') {
    const r = redondearPeso(cantidad);
    if (r >= 1000) {
      const grande = (Math.round(r / 100) / 10).toLocaleString('es-ES');
      return `${grande} ${unidad === 'g' ? 'kg' : 'l'}`;
    }
    return `${r} ${unidad}`;
  }
  if (unidad === 'diente') {
    const n = Math.ceil(cantidad);
    return `${n} ${PLURAL.diente[n === 1 ? 0 : 1]}`;
  }
  const { valor, texto } = enCuartos(cantidad);
  const nombre = PLURAL[unidad] ?? [unidad, unidad];
  return `${texto} ${nombre[valor <= 1 ? 0 : 1]}`;
}

// Escala un ingrediente de receta a unas raciones concretas (para la pantalla de receta)
export function escalar(item, racionesReceta, raciones, catalogo) {
  const base = aUnidadBase(item, catalogo);
  return { ...base, cantidad: (base.cantidad * raciones) / racionesReceta };
}
