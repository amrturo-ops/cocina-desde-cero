import Cabecera from '../components/Cabecera.jsx';
import PoliticaPrivacidad from '../components/PoliticaPrivacidad.jsx';

export default function Privacidad() {
  return (
    <main className="pantalla">
      <Cabecera />
      <div className="pantalla__cuerpo">
        <h1>Privacidad</h1>
        <PoliticaPrivacidad />
      </div>
    </main>
  );
}
