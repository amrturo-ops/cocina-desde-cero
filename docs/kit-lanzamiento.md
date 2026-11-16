# Kit de lanzamiento: reto «Aprende a cocinar en 14 días»

Objetivo: comprobar con 15-30 personas reales si la app engancha y si alguien pagaría por el nivel Básico.

## Antes de empezar
- App publicada en GitHub Pages con Supabase conectado.
- GoatCounter configurado (`VITE_GOATCOUNTER_URL`) y, si quieres medir pago, un enlace de Stripe en `VITE_ENLACE_PREVENTA`.
- Un grupo de WhatsApp o Telegram para el reto.

## A quién invitar
Personas que cocinen poco: estudiantes que se acaban de independizar, gente que vive sola, parejas jóvenes. Mejor si hay alguna con dieta especial o alergia: son las que más valor encuentran.

## Mensajes del reto

**Invitación**
> Estoy probando una app para aprender a cocinar desde cero, paso a paso y con recetas de verdad. ¿Te apuntas a un reto de 14 días? Solo hay que cocinar 3 recetas por semana y hacerles una foto. Es gratis y me ayudas un montón.

**Día 1**
> ¡Empezamos! Abre la app, haz el registro (2 minutos) y cocina tu primera receta. La más fácil es la ensalada de garbanzos o el guacamole: sin fuego. Sube la foto aquí también 📸

**Día 4**
> ¿Cómo vais? Si alguna receta no se entiende o un tiempo no cuadra, decídmelo o ponedlo en la valoración del final de cada receta. Eso es oro.

**Día 7**
> ¡Primera semana! Quien haya hecho las 3 recetas con foto ya tiene racha 🔥 Esta semana probad a hacer un plan de 3 días: os hace la lista de la compra sola.

**Día 14**
> ¡Reto terminado! Os paso 3 preguntas de 1 minuto: ¿qué es lo que más te ha servido?, ¿qué quitarías o cambiarías?, ¿pagarías 4,99 € por el siguiente nivel? Sinceridad total.

## Qué medir y cuándo dar la idea por validada
| Métrica (GoatCounter o Supabase) | Objetivo |
|---|---|
| Terminan el onboarding | > 80 % de los invitados |
| Cocinan al menos 1 receta la semana 1 | > 60 % |
| Siguen cocinando en la semana 2 (`activo-semana-2`) | > 40 % |
| Crean un plan de varios días | > 30 % |
| Pulsan «Reservar» o «Avisarme» del nivel Básico | > 15 % |
| Valoración media de las recetas (`recipe_feedback`) | > 2,3 de 3 |

Si se cumplen la mayoría: adelante con el nivel Básico y la captación. Si falla la semana 2: el problema es el hábito; refuerza retos y recordatorios antes de añadir contenido. Si fallan las valoraciones: corrige recetas primero.

## Captación tras el reto: 5 ideas de vídeo corto
1. «Nunca había cortado una cebolla» → antes/después con la técnica de la garra.
2. «Plan de 3 días y lista de la compra en 30 segundos» → grabación de pantalla.
3. «Cocinar para un celíaco sin miedo» → la misma receta adaptada a varias dietas.
4. «Mi racha de 3 semanas cocinando» → montaje de las fotos de la galería.
5. «Error de novato: mover el pollo en la plancha» → consejo rápido de la técnica.
