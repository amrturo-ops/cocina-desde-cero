// Guardar el plan actual y lo que ya tiene en casa (Supabase o modo prueba).
import { supabase, modoPrueba } from './supabase.js';

const CLAVE_PLAN = 'cocina-plan-prueba';
const CLAVE_TENGO = 'cocina-tengo-prueba';

const leerLocal = (clave, porDefecto) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? porDefecto;
  } catch {
    return porDefecto;
  }
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

export async function leerPlanActual(usuario) {
  if (modoPrueba) return leerLocal(CLAVE_PLAN, null);
  const { data, error } = await supabase
    .from('plans')
    .select('id, inicio, dias, comidas, comensales, ajustes, usar_sobras, dificultad_max, huecos')
    .eq('user_id', usuario.id)
    .order('creado', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('No se ha podido cargar tu plan. Revisa tu conexión y vuelve a intentarlo.');
  if (!data) return null;
  return {
    id: data.id, inicio: data.inicio, dias: data.dias, comidas: data.comidas,
    comensales: data.comensales, ajustes: data.ajustes, usarSobras: data.usar_sobras, dificultadMax: data.dificultad_max, huecos: data.huecos,
  };
}

// Guarda el plan. Si no tiene id, crea uno nuevo.
export async function guardarPlan(usuario, plan) {
  const conFecha = { ...plan, inicio: plan.inicio || hoyISO() };
  if (modoPrueba) {
    const guardado = { ...conFecha, id: plan.id || String(Date.now()) };
    localStorage.setItem(CLAVE_PLAN, JSON.stringify(guardado));
    return guardado;
  }
  const fila = {
    user_id: usuario.id, inicio: conFecha.inicio, dias: plan.dias, comidas: plan.comidas,
    comensales: plan.comensales, ajustes: plan.ajustes, usar_sobras: plan.usarSobras, dificultad_max: plan.dificultadMax ?? 2, huecos: plan.huecos,
  };
  const consulta = plan.id
    ? supabase.from('plans').update(fila).eq('id', plan.id).select('id').single()
    : supabase.from('plans').insert(fila).select('id').single();
  const { data, error } = await consulta;
  if (error) throw new Error('No se ha podido guardar el plan. Revisa tu conexión y vuelve a intentarlo.');
  return { ...conFecha, id: data.id };
}

export async function leerTengo(usuario, planId) {
  if (modoPrueba) return new Set(leerLocal(CLAVE_TENGO, {})[planId] ?? []);
  const { data, error } = await supabase.from('plan_checks').select('ingrediente_id').eq('plan_id', planId).eq('ya_tengo', true);
  if (error) throw new Error('No se ha podido cargar la lista. Revisa tu conexión.');
  return new Set(data.map((f) => f.ingrediente_id));
}

export async function marcarTengo(usuario, planId, ingredienteId, tengo) {
  if (modoPrueba) {
    const todo = leerLocal(CLAVE_TENGO, {});
    const actual = new Set(todo[planId] ?? []);
    tengo ? actual.add(ingredienteId) : actual.delete(ingredienteId);
    localStorage.setItem(CLAVE_TENGO, JSON.stringify({ [planId]: [...actual] })); // solo el plan actual
    return;
  }
  const { error } = await supabase
    .from('plan_checks')
    .upsert({ plan_id: planId, user_id: usuario.id, ingrediente_id: ingredienteId, ya_tengo: tengo });
  if (error) throw new Error('No se ha podido guardar. Revisa tu conexión.');
}

export function borrarPlanesPrueba() {
  localStorage.removeItem(CLAVE_PLAN);
  localStorage.removeItem(CLAVE_TENGO);
}
