// Medición de uso, anónima y sin cookies, con GoatCounter (opcional).
// Se activa con GOATCOUNTER_URL en src/textos.js (o la variable VITE_GOATCOUNTER_URL).
// Si no hay dirección, estas funciones no hacen nada.
import { GOATCOUNTER_URL } from '../textos.js';
const URL_GC = import.meta.env.VITE_GOATCOUNTER_URL || GOATCOUNTER_URL;

// «No contar mis visitas»: GoatCounter ignora este navegador si skipgc = 't'
export const medicionActiva = () => Boolean(URL_GC);
export function noContarme(activar) {
  try { activar ? localStorage.setItem('skipgc', 't') : localStorage.removeItem('skipgc'); } catch { /* nada */ }
}
export function meIgnora() {
  try { return localStorage.getItem('skipgc') === 't'; } catch { return false; }
}
let iniciada = false;

export function iniciarMedicion() {
  if (!URL_GC || iniciada) return;
  iniciada = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = URL_GC;
  s.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });
  document.head.appendChild(s);
  medirRetencion();
}

export function medir(evento) {
  if (meIgnora()) return;
  try {
    window.goatcounter?.count?.({ path: `evento/${evento}`, title: evento, event: true });
  } catch { /* la medición nunca debe romper la app */ }
}

export function medirPantalla(pantalla) {
  if (meIgnora()) return;
  try {
    window.goatcounter?.count?.({ path: `/${pantalla}` });
  } catch { /* nada */ }
}

// Retención: cuenta una vez por semana de uso («sigue usándola en la semana 2, 3...»)
function medirRetencion() {
  try {
    const alta = Number(localStorage.getItem('cocina-alta')) || Date.now();
    localStorage.setItem('cocina-alta', String(alta));
    const semana = Math.floor((Date.now() - alta) / (7 * 24 * 3600 * 1000)) + 1;
    const clave = `cocina-medida-semana-${semana}`;
    if (!localStorage.getItem(clave)) {
      localStorage.setItem(clave, '1');
      setTimeout(() => medir(`activo-semana-${semana}`), 3000); // espera a que cargue el script
    }
  } catch { /* nada */ }
}
