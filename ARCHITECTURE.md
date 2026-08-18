# Arquitectura — versión GitHub Pages + Firebase

Esta es la adaptación de Air Fryer Chef para desplegarse sin servidor propio.
El diseño de producto (algoritmo de doble cesta, validación de recetas de IA,
reglas de seguridad alimentaria, escalado de comensales, componentes visuales)
es el mismo que en la versión Next.js/Prisma — lo que cambia es dónde vive
cada pieza.

## Qué se reaprovechó tal cual

Toda la lógica pura, sin dependencias de framework ni de base de datos:
- `src/lib/dualBasket/sync.ts` — algoritmo de sincronización.
- `src/lib/validation/recipeValidator.ts` — validador de recetas de IA.
- `src/lib/foodSafety/rules.ts` — reglas de seguridad alimentaria.
- `src/lib/scaling.ts` — escalado de cantidades por comensales.
- `src/types/index.ts` — esquemas zod (contexto de IA, receta estructurada).
- Todos los componentes visuales (`DualBasketTimeline`, `RecipeCard`, `Badge`,
  `Chip`, etc.) — solo se les quitaron las importaciones de Next.js.

## Qué cambió y por qué

### Frontend: Next.js → Vite + React Router
Un sitio estático no tiene servidor que renderice Server Components ni
resuelva API routes. Vite + React Router es el estándar para SPAs en GitHub
Pages: sin `basePath` de Next, sin las limitaciones de rutas dinámicas del
export estático. Las URLs con parámetro (`/recetas/:id`) funcionan tras una
recarga gracias al truco `spa-github-pages` (`public/404.html` +
`index.html`), documentado con comentarios en ambos archivos.

### Base de datos: Prisma/SQL → Firestore
El modelo relacional se aplanó a documentos, favoreciendo la denormalización
que Firestore recompensa:
- `recipes/{id}` — receta completa con ingredientes, pasos y zonas de doble
  cesta como arrays embebidos (antes eran tablas separadas).
- `users/{uid}/userRecipes/{recipeId}` — guarda un resumen (`summary`) de la
  receta directamente en el documento del recetario, para poder listar el
  recetario con una sola lectura de colección en vez de una lectura por
  receta guardada.
- Valoraciones y notas son arrays dentro del propio `userRecipe` (antes,
  tablas `UserRecipeRating`/`UserRecipeNote`), porque Firestore no premia las
  relaciones muchos-a-uno de la misma forma que SQL.

### IA: API route de Next.js → Worker de Cloudflare
Un sitio estático no puede guardar un secreto (la clave de Claude) en ningún
sitio del propio sitio — cualquier cosa en el bundle del navegador es
pública. El Worker es la única pieza con estado de servidor: recibe el
contexto estructurado, reconstruye exactamente las mismas llamadas con
*tool use* forzado que antes hacía `ClaudeProvider`, y devuelve JSON validado.

**Seguridad del Worker** (ver `worker/src/`):
1. CORS restringido a un único origen (`ALLOWED_ORIGIN`).
2. Verificación de la firma del ID token de Firebase con `jose` contra el
   JWKS público de Google — sin SDK de Node, compatible con el runtime de
   Workers.
3. Comprobación de que el `uid` del token coincide con `ALLOWED_UID` — así la
   clave de Anthropic solo se usa para ti, nunca para quien encuentre la URL
   del Worker o inspeccione el tráfico de red del sitio público.

### Autenticación: ninguna → Firebase Auth (Google, un solo usuario)
Necesaria por dos motivos: para que las reglas de seguridad de Firestore
puedan distinguir "tú" de "cualquiera", y para que el Worker tenga algo que
verificar. Se restringe a un único UID tanto en `firestore.rules` como en el
Worker — están pensadas para mantenerse sincronizadas manualmente (mismo UID
en ambos sitios), documentado en el README.

### Seed: script de Node con Prisma → botón en la app
Sin servidor local, no hay dónde correr `npx prisma db seed`. La misma lógica
de datos iniciales (modelo Gourmia, alimentos, recetas de ejemplo) vive ahora
en `src/services/seed.ts` y se ejecuta con el SDK cliente de Firestore, con
las credenciales de tu propia sesión ya autenticada — de ahí que sea un botón
en Configuración en vez de un script.

## Diagrama de flujo (generación de receta)

```
Generar.tsx
  → recipeGeneration.buildAIContextForUser(uid)   [lee Firestore: users, pantry, derivedPreferences]
  → aiClient.generateRecipes(context)             [POST al Worker, con ID token de Firebase]
      Worker: verifica token → arma prompt → llama a Anthropic (tool use forzado) → devuelve JSON
  → recipeValidator.validateAIRecipe(...)          [contra foods de Firestore]
  → dualBasket.synchronizeDualBasket(...)          [si is_dual_zone]
  → usuario pulsa "Guardar" → db.persistGeneratedRecipe(...)  [escribe en Firestore]
```

## Limitaciones conocidas de este diseño

- **Un solo usuario real.** El modelo de datos ya soporta más de un `uid`,
  pero la seguridad (reglas + Worker) está deliberadamente cerrada a uno solo.
  Abrir a más usuarios implicaría cambiar `isOwner()` por una lista de UIDs
  o un rol en el propio documento de usuario.
- **Sin índices compuestos.** Las consultas actuales traen la colección
  completa y filtran en el cliente (recetario, alimentos). Es razonable para
  el volumen de datos de un uso doméstico; con cientos de recetas convendría
  añadir índices y mover los filtros a la consulta de Firestore.
- **UID duplicado en dos sitios** (`firestore.rules` y el secreto
  `ALLOWED_UID` del Worker). No hay una fuente única de verdad entre
  Firebase y Cloudflare — es una decisión consciente para evitar acoplar
  ambos servicios entre sí.
