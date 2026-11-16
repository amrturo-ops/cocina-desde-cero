// Medición de uso, anónima y sin cookies, con GoatCounter (opcional).
// Define VITE_GOATCOUNTER_URL=https://TU-CODIGO.goatcounter.com/count para activarla.
// Si no está definida, estas funciones no hacen nada.
const URL_GC = import.meta.env.VITE_GOATCOUNTER_URL;
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
  try {
    window.goatcounter?.count?.({ path: `evento/${evento}`, title: evento, event: true });
  } catch { /* la medición nunca debe romper la app */ }
}

export function medirPantalla(pantalla) {
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
