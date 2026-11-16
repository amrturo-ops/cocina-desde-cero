import { useEffect, useRef, useState } from 'react';

// Pitido sin ficheros de audio: tres tonos cortos con Web Audio
function pitar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.frequency.value = 880;
      vol.gain.setValueAtTime(0.25, ctx.currentTime + t);
      vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(vol).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch { /* sin sonido disponible */ }
  navigator.vibrate?.([300, 150, 300, 150, 300]);
}

// Cuenta atrás que no se desajusta aunque el móvil vaya lento: calcula a partir de la hora de fin
export function useTemporizador(segundos) {
  const [restante, setRestante] = useState(segundos);
  const [estado, setEstado] = useState('parado'); // parado | corriendo | pausado | terminado
  const fin = useRef(null);

  useEffect(() => {
    setRestante(segundos);
    setEstado('parado');
  }, [segundos]);

  useEffect(() => {
    if (estado !== 'corriendo') return;
    const id = setInterval(() => {
      const quedan = Math.max(0, Math.round((fin.current - Date.now()) / 1000));
      setRestante(quedan);
      if (quedan === 0) {
        setEstado('terminado');
        pitar();
      }
    }, 250);
    return () => clearInterval(id);
  }, [estado]);

  return {
    restante,
    estado,
    iniciar: () => {
      fin.current = Date.now() + restante * 1000;
      setEstado('corriendo');
    },
    pausar: () => setEstado('pausado'),
    reiniciar: () => {
      setRestante(segundos);
      setEstado('parado');
    },
  };
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
