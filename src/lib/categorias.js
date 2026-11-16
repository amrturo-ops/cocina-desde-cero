// Tipo de plato de cada receta, para que un plan no repita tres ensaladas o tres arroces.
// Una receta puede fijar su tipo con el campo «tipo»; si no, se deduce de su id.
export const TIPOS = {
  ensalada: 'Ensaladas y platos fríos',
  arroz: 'Arroces',
  pasta: 'Pasta',
  sopa: 'Sopas y cremas',
  legumbre: 'Legumbres',
  huevo: 'Huevos y tortillas',
  masa: 'Pizzas, empanadas y tartas',
  pescado: 'Pescado y marisco',
  carne: 'Carne y pollo',
  verdura: 'Verduras',
};

const REGLAS = [
  ['ensalada', /ensalad|pipirrana|tomate-alinado|guacamole/],
  ['arroz', /arroz|paella|risotto/],
  ['pasta', /pasta|espaguetis|macarrones|tallarines|raviolis|noquis|pappardelle|lasana|canelones|fideos-salteados/],
  ['sopa', /sopa|crema|caldo|gazpacho|salmorejo|vichyssoise/],
  ['legumbre', /lenteja|garbanzo|alubia|cocido|potaje|hummus|dal-/],
  ['huevo', /tortilla|revuelto|huevo|tostada/],
  ['masa', /pizza|focaccia|pan-pita|empanad|hojaldre|tarta|quiche/],
  ['pescado', /salmon|merluza|bacalao|dorada|sardina|trucha|pulpo|marmitako|gamba|calamar|bonito/],
  ['carne', /pollo|ternera|albondiga|lomo|solomillo|entrecot|hamburguesa|filete|nuggets|fajitas|brocheta/],
];

export function tipoDe(receta) {
  if (receta.tipo && TIPOS[receta.tipo]) return receta.tipo;
  const id = receta.id ?? '';
  return REGLAS.find(([, re]) => re.test(id))?.[0] ?? 'verdura';
}
