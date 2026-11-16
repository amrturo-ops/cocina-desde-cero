import { useEffect, useState } from 'react';
import Cabecera from '../components/Cabecera.jsx';
import Boton from '../components/Boton.jsx';
import { PRECIO_PREMIUM, PRECIO_HABITUAL, COBRO_ACTIVO } from '../textos.js';
import { tecnicasDelNivel } from '../lib/contenido.js';
import { urlDePago, simularCompra, pagoDisponible, simulacion } from '../lib/premium.js';
import { modoPrueba } from '../lib/supabase.js';
import { medir } from '../lib/medir.js';

export default function Premium({ usuario, premium, recetasPremium, onComprobar }) {
  const [comprobando, setComprobando] = useState(false);
  const [aviso, setAviso] = useState('');

  // Al volver de Stripe (la dirección de vuelta lleva ?pagado=1) se comprueba solo
  useEffect(() => {
    if (!premium && !modoPrueba && new URLSearchParams(window.location.search).has('pagado')) comprobar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (premium) {
    return (
      <main className="pantalla"><Cabecera />
        <div className="pantalla__cuerpo">
          <h1>{COBRO_ACTIVO ? 'Ya eres Premium' : 'Todo es gratis'}</h1>
          <p className="logro">Tienes todas las recetas de los tres niveles. ¡A cocinar!</p>
          {simulacion && <Boton variante="texto" onClick={() => { simularCompra(false); window.location.reload(); }}>Quitar Premium (prueba)</Boton>}
        </div>
      </main>
    );
  }

  async function comprar() {
    medir('premium-pulsado');
    if (simulacion) {
      simularCompra(true);
      window.location.hash = '#inicio';
      window.location.reload();
      return;
    }
    const url = urlDePago(usuario);
    if (url) window.location.href = url;
  }

  async function comprobar() {
    setComprobando(true);
    setAviso('');
    const activado = await onComprobar();
    setComprobando(false);
    if (!activado) setAviso('Todavía no nos ha llegado el pago. Si acabas de pagar, espera un minuto y vuelve a comprobar. Si el problema sigue, escríbenos.');
  }

  return (
    <main className="pantalla"><Cabecera />
      <div className="pantalla__cuerpo">
        <p className="sello">Pago único · sin suscripción</p>
        <h1>Cocina como un cocinillas</h1>
        <p>Desbloquea los niveles Básico y Cocinillas para siempre.</p>
        <ul className="resumen">
          <li><span className="resumen__dato">Recetas nuevas</span><span className="resumen__valor">{recetasPremium}</span></li>
          <li><span className="resumen__dato">Técnicas nuevas</span><span className="resumen__valor">{tecnicasDelNivel('basico').length + tecnicasDelNivel('cocinillas').length}</span></li>
          <li><span className="resumen__dato">Precio de lanzamiento</span>
            <span className="resumen__valor">{PRECIO_HABITUAL && <s className="tachado">{PRECIO_HABITUAL}</s>} {PRECIO_PREMIUM}, una sola vez</span></li>
        </ul>
        <h2>Lo que aprenderás</h2>
        <ul className="chips">
          {[...tecnicasDelNivel('basico'), ...tecnicasDelNivel('cocinillas')].map((t) => <li key={t.id} className="chip chip--fijo">{t.titulo}</li>)}
        </ul>
        <p className="ayuda">Todas adaptadas a tu dieta y tus alergias, y disponibles en tus planes y listas de la compra.</p>
        {aviso && <p className="aviso-prueba" role="status">{aviso}</p>}
      </div>
      <div className="pantalla__pie">
        {pagoDisponible() ? (
          <Boton onClick={comprar}>{simulacion ? `Simular compra (prueba)` : `Desbloquear por ${PRECIO_PREMIUM}`}</Boton>
        ) : (
          <p className="ayuda">El pago estará disponible muy pronto.</p>
        )}
        {!simulacion && pagoDisponible() && (
          <Boton variante="texto" onClick={comprobar} disabled={comprobando}>{comprobando ? 'Comprobando…' : 'Ya he pagado: comprobar'}</Boton>
        )}
      </div>
    </main>
  );
}
