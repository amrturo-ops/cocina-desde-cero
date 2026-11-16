import { useEffect, useState } from 'react';
import { supabase, modoPrueba } from '../lib/supabase.js';

const USUARIO_PRUEBA = { id: 'prueba', email: 'prueba@local' };

// Devuelve { cargando, usuario }. En modo prueba siempre hay un usuario ficticio.
export function useSesion() {
  const [estado, setEstado] = useState({ cargando: !modoPrueba, usuario: modoPrueba ? USUARIO_PRUEBA : null });

  useEffect(() => {
    if (modoPrueba) return;
    supabase.auth.getSession().then(({ data }) =>
      setEstado({ cargando: false, usuario: data.session?.user ?? null })
    );
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) =>
      setEstado({ cargando: false, usuario: sesion?.user ?? null })
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return estado;
}

export async function cerrarSesion() {
  if (!modoPrueba) await supabase.auth.signOut();
}
