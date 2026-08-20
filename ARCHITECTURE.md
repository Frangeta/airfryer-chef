# Arquitectura — Chefryer (GitHub Pages + Firebase)

> Refleja la versión **1.6.0**. Para el porqué de cada cambio de versión, ver [`CHANGELOG.md`](./CHANGELOG.md).

Esta es la versión de Chefryer pensada para desplegarse sin servidor
propio. El diseño de producto (algoritmo de doble cesta, validación de
recetas de IA, reglas de seguridad alimentaria, escalado de comensales) es
el mismo desde el diseño original — lo que ha ido cambiando es dónde vive
cada pieza y, más recientemente, quién puede usar la app.

## Qué se reaprovechó de la versión original (Next.js/Prisma)

Toda la lógica pura, sin dependencias de framework ni de base de datos:
- `src/lib/dualBasket/sync.ts` — algoritmo de sincronización de doble cesta.
- `src/lib/validation/recipeValidator.ts` — validador de recetas de IA.
- `src/lib/foodSafety/rules.ts` — reglas de seguridad alimentaria.
- `src/lib/scaling.ts` — escalado de cantidades por comensales.
- `src/types/index.ts` — esquemas zod (contexto de IA, receta estructurada).
- Los componentes visuales (`DualBasketTimeline`, `RecipeCard`, `Badge`, `Chip`...).

## Capas de la arquitectura actual

```
Frontend (Vite + React + React Router) — GitHub Pages
   │
   ├─► Firestore + Firebase Auth — datos y sesión, directo desde el navegador
   │
   └─► Worker de Cloudflare — único lugar con la clave de Groq en secreto
              │
              └─► api.groq.com
```

### Frontend: Vite + React Router (no Next.js)
Un sitio estático no tiene servidor que renderice Server Components ni
resuelva API routes, así que se sustituyó Next.js por Vite + React Router:
sin `basePath` propio de Next, sin las limitaciones de rutas dinámicas del
export estático. Las URLs con parámetro (`/recetas/:id`) sobreviven a una
recarga en GitHub Pages gracias al truco `spa-github-pages`
(`public/404.html` + script en `index.html`, documentado con comentarios en
ambos archivos).

### Base de datos: Firestore (no SQL/Prisma)
El modelo relacional original se aplanó a documentos, favoreciendo la
denormalización que Firestore recompensa:

- **`airFryerModels/{id}`**, **`foods/{id}`** — catálogo compartido entre
  todas las personas con acceso. Cada `food` incluye su `cookingProfile`
  embebido (antes era una tabla `FoodCookingProfile` aparte).
- **`recipes/{id}`** — receta completa con `ingredients[]`, `steps[]` y
  `zones[]` (doble cesta) embebidos como arrays, no como tablas separadas.
- **`users/{uid}`** — documento de cada persona: `preference` (comensales,
  dificultad, exclusiones...), `categories[]` (sistema + personalizadas),
  `airFryerModelId`, `favoriteFoodIds[]`.
- **`users/{uid}/userRecipes/{recipeId}`** — el recetario personal: guarda
  un **resumen desnormalizado** (`summary`) de la receta directamente aquí,
  para poder listar el recetario con una sola lectura de colección en vez de
  una lectura por receta guardada. `ratings[]` y `notes[]` son arrays dentro
  de este mismo documento (antes, tablas `UserRecipeRating`/`UserRecipeNote`).
- **`users/{uid}/pantry/{itemId}`**, **`users/{uid}/conversations/{id}/messages/{id}`**,
  **`users/{uid}/derivedPreferences/{id}`** — el resto de datos personales.
- **`config/access`** — documento único (no por usuario) con la lista de
  acceso: ver la sección de control de acceso más abajo.

### IA: Worker de Cloudflare (no API routes de Next.js)
Un sitio estático no puede guardar un secreto en ningún sitio del propio
sitio — cualquier cosa en el bundle del navegador es pública. El Worker es
la única pieza con estado de servidor: recibe el contexto estructurado,
arma el prompt, llama a Groq pidiendo JSON forzado (equivalente al
*tool use* forzado que hacía `ClaudeProvider` en la versión original con
Prisma), valida la respuesta con los mismos esquemas zod, y la devuelve.

**Por qué Groq y no Claude o Gemini**: el brief original pedía no usar una
IA de pago; se probó primero Google Gemini (gratuito) pero sus modelos más
recientes introducían minutos de latencia por "razonamiento extendido" antes
de responder, incluso desactivándolo. Groq resuelve las mismas peticiones en
segundos gracias a su hardware especializado (LPU), y también es gratuito
sin tarjeta. Ver `CHANGELOG.md` v1.1.0/v1.2.0 para el detalle de ambas
migraciones.

**Seguridad del Worker** (`worker/src/`):
1. CORS restringido a un único origen (`ALLOWED_ORIGIN`).
2. Verificación de la firma del ID token de Firebase con `jose` contra el
   JWKS público de Google — sin SDK de Node, compatible con el runtime de
   Workers (`verifyFirebaseToken.ts`).
3. Comprobación de que el `uid` del token está en `config/access.allowedUids`
   — consultado en tiempo real vía la API REST de Firestore, autenticada con
   el mismo ID token del usuario (`isUidApproved()` en `index.ts`). El Worker
   no tiene ningún secreto de "quién puede entrar": esa decisión vive
   enteramente en Firestore.

### Seed de datos: botón en la app (no script de Node)
Sin servidor local, no hay dónde correr un script de seed tradicional. La
misma lógica de datos iniciales (modelo Gourmia, alimentos, recetas de
ejemplo) vive en `src/services/seed.ts` y se ejecuta con el SDK cliente de
Firestore, con las credenciales de la propia sesión ya autenticada — de ahí
que sea un botón en Configuración en vez de un script.

## Control de acceso — multiusuario dinámico

Este es el área que más ha evolucionado (ver v1.3.0 → v1.5.0 en el
changelog). El diseño actual:

```
                    ┌─────────────────────────────────┐
                    │  firestore.rules                  │
                    │  rootAdminUids() = ['uid_fijo']    │  ← solo para bootstrap
                    └────────────┬────────────────────┘
                                 │ puede crear/recrear
                                 ▼
                    ┌─────────────────────────────────┐
                    │  config/access (Firestore)         │
                    │  { allowedUids: [...],              │
                    │    pendingRequests: {...},          │
                    │    members: {...} }                 │  ← fuente de verdad real
                    └────────────┬────────────────────┘
                                 │ leído por
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        Firestore rules     Frontend            Worker de Cloudflare
        (isApproved())      (AuthProvider)       (isUidApproved())
```

- **`rootAdminUids()`** en `firestore.rules`: una lista mínima y estática de
  UIDs, con permiso para **crear** `config/access` la primera vez (o
  recrearlo si se corrompe). No se usa para nada más — no gestiona el día a
  día.
- **`config/access`**: la fuente de verdad real. `allowedUids[]` es quién
  puede usar la app; `pendingRequests{uid: {name,email,requestedAt}}` son
  las solicitudes de acceso pendientes; `members{uid: {name,email}}` guarda
  el nombre/correo de cada persona aprobada, para mostrarlo en la UI en vez
  de un UID críptico.
- **Reglas de Firestore para `config/access`**: cualquier persona
  autenticada puede *leer* el documento (para saber si tiene acceso) y puede
  *escribir* únicamente su propia entrada dentro de `pendingRequests`
  (solicitar acceso). Solo quien ya está en `allowedUids` (o es admin raíz)
  puede tocar `allowedUids` — aprobar, rechazar o revocar.
- **Frontend** (`AuthProvider.tsx`): tras el login, lee `config/access` y
  calcula un estado: `no-access-doc` (primera vez, hay que inicializar),
  `pending` (solicitud enviada, esperando aprobación), o `approved`.
  `LoginGate.tsx` renderiza la pantalla correspondiente a cada estado.
- **Worker**: en cada petición de IA, además de verificar la firma del ID
  token, hace una llamada a la API REST de Firestore (con ese mismo token)
  para comprobar si el `uid` está en `allowedUids`. Si Firestore deniega el
  acceso (por las reglas de arriba) o el uid no está en la lista, el Worker
  rechaza la petición.

**Qué se comparte entre personas y qué no**: el catálogo (`airFryerModels`,
`foods`) y las recetas en sí (`recipes/{id}`) son compartidos entre todas
las personas aprobadas — pensado para parejas/familias compartiendo la
misma Air Fryer. La despensa, favoritos, valoraciones, notas y preferencias
de cada persona (todo bajo `users/{uid}/**`) son privados de cada una.

## Gestión de recetas (edición, duplicado, categorías)

Añadido en la v1.4.0. Puntos de diseño relevantes:
- **Editar** (`updateRecipe`): al guardar cambios, `source` pasa a
  `USER_CREATED` (aunque la receta viniera originalmente de la IA), para
  distinguir en el futuro qué recetas han sido tocadas a mano. El `summary`
  denormalizado en `userRecipes` se sincroniza automáticamente con los
  campos editados.
- **Duplicar** (`duplicateRecipe`): copia el documento completo de
  `recipes/{id}` a uno nuevo (mismo `ingredients`/`steps`/`zones`, nombre
  con sufijo "(copia)") y lo guarda directamente en el recetario de quien
  duplica — no toca el original.
- **Eliminar** (`deleteRecipe`): borra tanto la entrada del recetario
  (`userRecipes/{id}`) como el documento de la receta en sí
  (`recipes/{id}`). Como el modelo actual no comparte una misma receta por
  referencia entre recetarios de distintas personas (cada "guardar" crea su
  propia entrada), esto es seguro sin dejar referencias rotas.
- **Categorías personalizadas**: `users/{uid}.categories[]` empieza con las
  7 categorías del sistema (sembradas al crear el usuario) y crece con
  `arrayUnion` cuando alguien escribe una categoría nueva desde la ficha de
  receta — no hace falta una colección aparte.

## Diagrama de flujo (generación de receta)

```
Generar.tsx
  → recipeGeneration.buildAIContextForUser(uid)   [lee Firestore: users, pantry, derivedPreferences]
  → aiClient.generateRecipes(context)             [POST al Worker, con ID token de Firebase]
      Worker:
        1. verifica firma del token (jose + JWKS de Google)
        2. comprueba uid en config/access.allowedUids (REST API de Firestore)
        3. arma el prompt → llama a Groq (JSON forzado) → valida con zod
  → recipeValidator.validateAIRecipe(...)          [contra foods de Firestore]
  → dualBasket.synchronizeDualBasket(...)          [si is_dual_zone]
  → usuario pulsa "Guardar" → db.persistGeneratedRecipe(...)  [escribe en Firestore]
```

> El proveedor de IA se ha cambiado dos veces (Claude → Gemini → Groq) sin
> tocar el frontend, `recipeValidator.ts`, `dualBasket/sync.ts` ni ninguna
> página — solo el cliente HTTP dentro de `worker/src/` y sus variables de
> entorno. Es exactamente el problema que la interfaz `AIProvider` (versión
> Next.js original) y, ahora, el propio Worker aislado, están pensados para
> resolver.

## Identidad visual y PWA

**Paleta de color**: verde azulado (`teal`) es el color primario — mismo
tono que ya usaba la "Cesta 2" del timeline de doble cesta, ascendido a
identidad de toda la app. El cálido (antes primario, familia `paprika`) se
reserva deliberadamente para los momentos de "chispa": generar recetas,
convertir a Air Fryer, y la caja de entrada del Dashboard. El componente
`Button` tiene un variant `warm` explícito para esta distinción — el
contraste cálido/frío es intencional, no casual, y queda documentado en el
propio código (`src/components/ui/Button.tsx`).

**PWA instalable**: `vite-plugin-pwa` genera el manifest y un service worker
que precachea el cascarón de la app (JS/CSS/HTML/iconos) en cada build,
leyendo automáticamente el `base` de Vite — así el manifest y las rutas
del service worker funcionan igual de bien tanto en `usuario.github.io/repo/`
como si algún día se usa un dominio propio, sin tocar configuración. Los
iconos (`public/icons/*.png`) se generaron dibujando directamente con
Pillow (Python) los mismos rectángulos redondeados de `BasketMark.tsx`, ya
que este entorno de desarrollo no tenía herramientas de conversión
SVG→PNG disponibles — es decir, el icono y el logo SVG son dos dibujos
independientes con las mismas coordenadas, no una conversión del uno al otro;
si se cambia la marca, hay que actualizar ambos.

## Limitaciones conocidas de este diseño

- **Sin índices compuestos.** Las consultas actuales traen la colección
  completa y filtran/ordenan en el cliente (recetario, alimentos, tabla
  rápida). Razonable para el volumen de datos de un uso doméstico/familiar;
  con cientos de recetas convendría añadir índices y mover los filtros a la
  consulta de Firestore.
- **`get()` en las reglas de Firestore tiene coste.** `isApproved()` hace una
  lectura adicional de `config/access` en cada evaluación de regla que la
  usa. Para el volumen de este proyecto es insignificante, pero es algo a
  vigilar si el uso creciera mucho.
- **Sin fotos en las recetas.** El campo existía en el esquema original de
  Prisma pero no se ha vuelto a añadir en Firestore — requeriría activar
  Firebase Storage (servicio adicional a configurar).
- **`rootAdminUids()` sigue siendo estático.** Si hiciera falta cambiar quién
  puede recrear `config/access` de emergencia, todavía requiere editar
  `firestore.rules` a mano — decisión consciente para no tener un único
  punto de fallo totalmente dinámico y sin ancla fija en el sistema.
