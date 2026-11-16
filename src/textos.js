// Nombre de la app en un solo sitio: cámbialo aquí cuando lo decidas.
export const NOMBRE_APP = 'Cocina desde cero';
export const NOMBRE_CORTO = 'Cocina';

// Dirección pública de la app (para compartir). Rellénala cuando la publiques.
export const URL_APP = '';

// ── Premium ──
// Niveles que se pueden usar sin pagar. El resto se desbloquea con Premium (pago único).
export const NIVELES_GRATIS = ['novato'];
// Una receta de muestra gratis de cada nivel de pago, para que se vea lo que hay dentro.
export const RECETAS_MUESTRA = ['pizza-margarita', 'paella-valenciana'];
// Precio de lanzamiento. PRECIO_HABITUAL se muestra tachado al lado; pon null para no mostrarlo.
// Recuerda poner el mismo precio en el producto de Stripe.
export const PRECIO_PREMIUM = '3,99 €';
export const PRECIO_HABITUAL = '7,99 €';
// El enlace de pago de Stripe va en la variable VITE_ENLACE_PAGO (ver README).
