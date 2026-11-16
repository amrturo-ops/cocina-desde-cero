import { useEffect, useMemo, useState } from 'react';
import Boton from '../components/Boton.jsx';
import { ir } from '../hooks/useRuta.js';
import { generarLista, listaComoTexto } from '../lib/shopping.js';
import { leerTengo, marcarTengo } from '../lib/planes.js';
import { CATALOGO, recetasPara } from '../lib/contenido.js';
import { medir } from '../lib/medir.js';

export default function Lista({ usuario, perfil, plan, version }) {
  const [tengo, setTengo] = useState(new Set());
  const [mensaje, setMensaje] = useState('');

  const secciones = useMemo(() => {
    if (!plan) return [];
    const porId = new Map(recetasPara(perfil.dietas).map((r) => [r.id, r]));
    return generarLista(plan, porId, CATALOGO);
  }, [plan, perfil.dietas, version]);

  useEffect(() => {
    if (plan?.id) leerTengo(usuario, plan.id).then(setTengo).catch(() => {});
  }, [usuario, plan?.id]);

  if (!plan) {
    return (
      <main className="pantalla pantalla--con-nav">
        <div className="pantalla__cuerpo">
          <h1>Lista de la compra</h1>
          <p>La lista se hace sola a partir de tu plan. Elige para cuántos días y comidas quieres cocinar.</p>
        </div>
        <div className="pantalla__pie"><Boton onClick={() => ir('#plan')}>Crear un plan</Boton></div>
      </main>
    );
  }

  const total = secciones.reduce((n, s) => n + s.articulos.length, 0);
  const pendientes = secciones.reduce((n, s) => n + s.articulos.filter((a) => !tengo.has(a.id)).length, 0);
  const conAviso = perfil.dietas.some((d) => d === 'sin-gluten' || d === 'sin-lactosa' || d.startsWith('alergia-'));

  function alternar(id) {
    const nuevo = new Set(tengo);
    const marcar = !nuevo.has(id);
    marcar ? nuevo.add(id) : nuevo.delete(id);
    setTengo(nuevo);
    if (plan.id) marcarTengo(usuario, plan.id, id, marcar).catch((e) => setMensaje(e.message));
  }

  async function compartir() {
    const texto = listaComoTexto(secciones, tengo);
    medir('lista-compartida');
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        setMensaje('Lista copiada. Pégala en WhatsApp o en tus notas.');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setMensaje('No se ha podido compartir desde aquí. Prueba a copiarla a mano.');
    }
  }

  return (
    <main className="pantalla pantalla--con-nav">
      <div className="pantalla__cuerpo">
        <h1>Lista de la compra</h1>
        <p className="ayuda">
          {pendientes === 0 ? '¡Lo tienes todo!' : `Te faltan ${pendientes} de ${total}. Toca lo que ya tengas en casa.`}
        </p>
        {conAviso && <p className="aviso-prueba">Revisa el etiquetado y las trazas de cada producto, sobre todo los marcados con ⚠.</p>}
        {secciones.map((s) => (
          <section key={s.id}>
            <h2>{s.nombre}</h2>
            <ul className="articulos">
              {s.articulos.map((a) => {
                const marcado = tengo.has(a.id);
                return (
                  <li key={a.id}>
                    <button type="button" className={`articulo ${marcado ? 'articulo--tengo' : ''}`} aria-pressed={marcado} onClick={() => alternar(a.id)}>
                      <span className="articulo__check" aria-hidden="true">{marcado ? '✓' : ''}</span>
                      <span className="articulo__texto">
                        <span className="articulo__nombre">{a.nombre}{conAviso && a.revisar && ' ⚠'}</span>
                        <span className="articulo__para">Para: {a.recetas.join(', ')}</span>
                      </span>
                      {a.texto && <span className="articulo__cantidad">{a.texto}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {mensaje && <p className="ayuda" role="status">{mensaje}</p>}
      </div>
      <div className="pantalla__pie">
        <Boton onClick={compartir} disabled={pendientes === 0}>Compartir lista</Boton>
      </div>
    </main>
  );
}
