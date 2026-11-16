import { useEffect, useState } from 'react';

// Navegación mínima con el # de la URL. Usa nombres simples (letras, números y guiones)
// para que funcione igual en GitHub Pages y en la página de prueba.
// Rutas: #inicio · #plan · #lista · #progreso · #perfil · #tecnica--<id> · #receta--<id>[--<raciones>]
const SEPARADOR = '--';
const anteriores = []; // historial dentro de la app, para el botón «volver»

function leer() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [pantalla, ...resto] = hash.split(SEPARADOR);
  return { pantalla: pantalla || 'inicio', id: resto[0] ?? null, extra: resto[1] ?? null };
}

export function useRuta() {
  const [ruta, setRuta] = useState(leer);
  useEffect(() => {
    const cambiar = () => {
      setRuta(leer());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', cambiar);
    return () => window.removeEventListener('hashchange', cambiar);
  }, []);
  return ruta;
}

export const rutaTecnica = (id) => `#tecnica${SEPARADOR}${id}`;
export const rutaReceta = (id, raciones) => `#receta${SEPARADOR}${id}${raciones ? `${SEPARADOR}${raciones}` : ''}`;

export function ir(ruta) {
  anteriores.push(window.location.hash || '#inicio');
  window.location.hash = ruta;
}

export function volver() {
  window.location.hash = anteriores.pop() || '#inicio';
}
