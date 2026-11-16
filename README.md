# Cocina desde cero

App web (PWA) para aprender a cocinar desde cero: técnicas por niveles, recetas adaptadas a dietas combinables, plan de N días y lista de la compra.

## Comandos

| Comando | Para qué |
|---|---|
| `npm install` | Instalar dependencias (solo la primera vez) |
| `npm run dev` | Probar en el ordenador (`npm run dev -- --host` para verlo en el móvil con la misma wifi) |
| `npm run probar` | Comprobar el contenido y la lógica (dietas, plan, progreso, lista) |
| `npm run build` | Versión final instalable (carpeta `dist`) |
| `npm run build:prueba` | Un único HTML con todo dentro, para enseñarla sin servidor |

Sin fichero `.env` funciona en **modo prueba** (datos solo en el navegador).

## Añadir contenido

Todo está en `src/content/`:

- `ingredients.json`: un ingrediente por línea. `contiene` dice qué lleva (gluten, lactosa, lacteo, huevo, carne, pescado, miel). `avisoTrazas: true` lo marca para revisar etiqueta. `basico: true` lo manda a «Básicos de despensa» en la lista.
- `techniques.json`: técnicas con `nivel` y `orden`.
- `recipes/*.json`: una receta por fichero. Cada ingrediente puede tener `alternativas` (en orden de preferencia; `"por": []` lo quita). `momentos` dice si vale para comida y/o cena; `sobras` si aguanta y cuántos días.

Después de añadir algo, ejecuta `npm run probar`: avisa de errores y de dietas que se quedarían sin recetas.

## Publicar

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor.
2. En Supabase → Authentication → URL Configuration, añade la dirección de GitHub Pages.
3. Sube el proyecto a GitHub. En Settings → Pages elige «GitHub Actions» y en Settings → Secrets añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Cada vez que subas cambios a `main` se publica sola (`.github/workflows/deploy.yml`).

## Recetas de los usuarios

Cualquiera puede crear sus recetas en la pestaña **Recetas**. Los ingredientes se eligen de la lista de la app para que la adaptación a dietas sea fiable. Si alguien añade uno que no está, tiene que indicar qué contiene (gluten, lactosa, huevo...) y queda marcado para revisar etiqueta.

- Por defecto son **privadas**: solo las ve quien las crea, y se usan en sus planes y listas.
- Si marca «Compartir con la comunidad», pasa a **pendiente**. Para publicarla, ve a Supabase → Table Editor → `user_recipes` y cambia `estado` a `aprobada` (o `rechazada`). Si el autor la edita, vuelve a revisión.
- Las recetas de la comunidad se muestran con su autor y un aviso de revisar ingredientes.

## Premium (pago único con Stripe)

- **Gratis:** nivel Novato completo, plan, lista, reto y recetas propias. Aprender no bloquea recetas: el camino es una guía.
- **Premium:** desbloquea Básico y Cocinillas. Precio y recetas de muestra en `src/textos.js`.

Para activar el cobro:
1. En Stripe, crea un **enlace de pago** para un producto «Premium» de pago único. En «Después del pago», elige redirigir a `https://TU-APP/?pagado=1#premium`.
2. Pon ese enlace en `VITE_ENLACE_PAGO` (en `.env` y en los secrets de GitHub). La app le añade el id del usuario para saber quién ha pagado.
3. Instala la CLI de Supabase y despliega el webhook:
   `supabase functions deploy stripe-webhook --no-verify-jwt`
   `supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...`
4. En Stripe → Desarrolladores → Webhooks, añade la dirección de la función (`https://TU-PROYECTO.supabase.co/functions/v1/stripe-webhook`) con los eventos `checkout.session.completed` y `checkout.session.async_payment_succeeded`.
5. Prueba primero en modo de prueba de Stripe con una tarjeta de test.

Nadie puede hacerse Premium a sí mismo: un trigger en la base de datos solo deja cambiar el plan al webhook. Los pagos quedan registrados en la tabla `pagos`.
