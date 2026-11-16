// PLANTILLA de política de privacidad. Rellena los datos entre [corchetes] y haz que la revise
// un profesional antes de publicar la app: esto no es asesoramiento legal.
import { NOMBRE_APP } from '../textos.js';

export const RESPONSABLE = {
  nombre: '[Tu nombre y apellidos]',
  nif: '[Tu NIF]',
  email: '[tu email de contacto]',
};

export default function PoliticaPrivacidad() {
  return (
    <div className="legal">
      <h3>Quién es responsable de tus datos</h3>
      <p>{RESPONSABLE.nombre} (NIF {RESPONSABLE.nif}), contacto: {RESPONSABLE.email}.</p>

      <h3>Qué datos guardamos y para qué</h3>
      <p>Tu email (para entrar), tu nombre, el número de comensales y qué comidas planificas, para que la app funcione.
        Tu dieta y tus alergias, solo para adaptar las recetas. Las recetas que cocinas, tus planes, tu lista de la compra,
        las fotos de tus platos y las recetas que crees, para mostrarte tu progreso.</p>

      <h3>Datos de salud</h3>
      <p>Algunas dietas (como sin gluten o sin lactosa) y las alergias pueden considerarse datos de salud.
        Solo los guardamos si das tu consentimiento expreso y solo los usamos para filtrar recetas.
        Puedes retirarlo en cualquier momento quitándolas en «Tus datos» o borrando tu cuenta.</p>

      <h3>Base legal</h3>
      <p>La prestación del servicio que solicitas al registrarte y, para los datos de salud, tu consentimiento expreso.</p>

      <h3>Con quién se comparten</h3>
      <p>Con nadie con fines comerciales. Los datos se almacenan en Supabase [indica la región del servidor, idealmente de la UE],
        que actúa como encargado del tratamiento. Si compartes una receta con la comunidad, la verán otros usuarios junto a tu nombre.</p>

      <h3>Cuánto tiempo</h3>
      <p>Mientras tengas cuenta. Si la borras, eliminamos tus datos y fotos de forma definitiva.</p>

      <h3>Tus derechos</h3>
      <p>Puedes acceder, rectificar, borrar, oponerte, limitar el tratamiento y pedir la portabilidad de tus datos escribiendo a {RESPONSABLE.email}.
        Puedes borrar tu cuenta tú mismo desde «Tus datos». Si crees que no hemos tratado bien tus datos, puedes reclamar ante la
        Agencia Española de Protección de Datos (aepd.es).</p>

      <h3>Aviso sobre alergias</h3>
      <p>{NOMBRE_APP} ayuda a evitar ingredientes, pero no garantiza la ausencia de trazas ni sustituye el consejo médico.
        Revisa siempre el etiquetado de cada producto. Las recetas de otros usuarios dependen de la información que ellos aportan.</p>
    </div>
  );
}
