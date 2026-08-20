# Changelog

Todas las versiones notables del proyecto, de más reciente a más antigua.
El número de versión se mantiene igual en `package.json` (raíz) y
`worker/package.json`, aunque técnicamente son dos artefactos desplegables
distintos (frontend y Worker) — se versionan juntos por simplicidad, ya que
casi siempre cambian a la vez.

---

## [1.9.0] — Identidad de marca: Chefryer, paleta verde azulada, instalable

**Cambiado**
- **Renombrada la app de "Air Fryer Chef" a "Chefryer"** en toda la interfaz,
  documentación, `package.json` (frontend y Worker) y `wrangler.toml`. El
  nombre de la carpeta/repositorio de GitHub (`airfryer-chef`) se deja tal
  cual — es solo un identificador técnico, renombrarlo es opcional y no
  requiere ningún cambio de código (el base path se recalcula solo a partir
  del nombre real del repo).
- **Nueva paleta de color**: verde azulado (`teal`, nueva escala en
  `tailwind.config.ts`) pasa a ser el color primario — navegación, botones
  de acción habituales (guardar, aprobar, añadir), enlaces, chips
  seleccionados, foco de teclado, selección de texto. Es, de hecho, el mismo
  verde que ya usaba la "Cesta 2" del timeline de doble cesta — se asciende
  de un detalle de una función a la identidad completa de la app.
- El cálido (antes color primario) se conserva **deliberadamente como
  contraste**, reservado solo para los momentos de "chispa": el botón
  "Generar recetas", "Convertir a Air Fryer", la caja "¿Qué quieres
  cocinar?" del Dashboard, el icono de Chef IA y el botón "Nueva receta" de
  la cabecera. Se añadió un nuevo variant `warm` al componente `Button`
  para dejar esta distinción explícita en el código, no implícita.
- Marca (`BasketMark`) y favicon actualizados al verde azulado exacto de la
  nueva paleta (antes usaban un verde ligeramente distinto).

**Añadido**
- **Instalable en móvil y tablet** (PWA) vía `vite-plugin-pwa`: manifest
  (`manifest.webmanifest`) con nombre, colores e iconos en varios tamaños
  (192/512, versiones "any" y "maskable" para el icono adaptativo de
  Android), más un service worker que precachea el "cascarón" de la app
  (JS/CSS/HTML/iconos) para apertura instantánea y funcionamiento sin
  conexión — los datos en sí (Firestore) siguen necesitando red.
- Iconos generados en `public/icons/` (PNG, dibujados directamente con
  Pillow a partir de la misma marca de dos cestas — este entorno no tenía
  herramientas de conversión SVG→PNG, así que se dibujaron programáticamente
  en vez de convertir el SVG existente).
- Meta tags de instalación para iOS/iPadOS (Safari no lee el manifest, así
  que necesita sus propios `apple-mobile-web-app-*`) además de los
  estándar para Android/Chrome.
- Sección "Instalar en el móvil o la tablet" en la página de Ayuda, con los
  pasos concretos para Android y para iOS (que no muestra aviso automático).

**Archivos clave**: `tailwind.config.ts`, `src/components/ui/Button.tsx` (nuevo variant `warm`), `src/components/ui/BasketMark.tsx`, `public/favicon.svg`, `public/icons/*.png` (nuevos), `vite.config.ts` (config de `vite-plugin-pwa`), `index.html`, `src/pages/Ayuda.tsx`.

---

## [1.8.0] — Guía de uso, Chef IA más visual, Dashboard sin caos

**Añadido**
- Página **Ayuda** (`/ayuda`), permanentemente accesible desde un icono "?"
  en la navegación: repasa cada sección de la app con icono y una frase.
- Aviso de bienvenida en el Dashboard (`OnboardingBanner`), visible solo la
  primera vez (se recuerda por persona en `localStorage`), con la misma
  guía en versión compacta y un enlace a la página completa.
- `IntentTiles`: en el Chef IA, los 14 filtros de intención dejaban de ser
  una lista plana de texto y pasan a ser 6 "tarjetas de humor" con icono
  (Cena rápida, Ligera, Crujiente, Restaurante, Vegetariano, Sobras) más dos
  grupos secundarios más pequeños (cocina del mundo, otros filtros).
- El formulario del Chef IA ahora tiene pasos numerados (1. Ingredientes,
  2. Estilo) para guiar mejor a alguien que lo usa por primera vez.

**Cambiado**
- Dashboard reestructurado para reducir la sensación de desorden:
  - Favoritos / Rápidas / Recientes eran 3 secciones apiladas con grids
    parecidas; ahora son pestañas dentro de una única sección (solo se
    muestran las pestañas que tienen contenido).
  - Los 4 accesos rápidos pasan de tarjetas grandes en cuadrícula a una
    fila de píldoras compactas (menos peso visual, ya que las mismas
    secciones están también en la navegación principal).
  - La vista previa de "Tabla rápida" deja de ser una tabla HTML con bordes
    y pasa a ser una lista limpia sin rejilla.

**Archivos clave**: `src/components/generator/IntentTiles.tsx` (nuevo), `src/components/help/guideContent.ts` (nuevo), `src/components/dashboard/OnboardingBanner.tsx` (nuevo), `src/pages/Ayuda.tsx` (nuevo), `src/pages/Generar.tsx`, `src/pages/Dashboard.tsx`, `src/components/layout/AppShell.tsx`, `src/App.tsx`.

---

## [1.7.0] — Identidad visual: marca, favicon, pantalla de acceso

**Añadido**
- `BasketMark`: la marca de la app (dos cestas superpuestas, ámbar y verde —
  los mismos colores del timeline de doble cesta), usada como elemento
  recurrente en vez de un icono genérico de chef.
- Favicon (`public/favicon.svg`) con esa misma marca.
- Icono oficial de Google en el botón de inicio de sesión (antes era un
  icono genérico de "entrar").

**Cambiado**
- Pantalla de acceso (`LoginGate.tsx`) rediseñada por completo: fondo con
  dos manchas de color desenfocadas (ámbar/verde), la marca grande,
  tipografía y copy más cuidados. Las cuatro pantallas de estado (cargando,
  entrar, inicializar, pendiente) comparten ahora el mismo tratamiento
  visual (`GateShell`).
- Navegación (`AppShell.tsx`): el icono de chef genérico se sustituye por
  `BasketMark` junto al nombre de la app.
- Caja "¿Qué quieres cocinar?" del Dashboard: marca fantasma de fondo en la
  esquina, muy sutil, para dar textura sin distraer.
- Tarjetas de acceso rápido del Dashboard: cada una con su propio color
  (pimentón, ámbar, verde, dorado) en vez de todas iguales — más ritmo
  visual en la rejilla sin añadir ruido.

**Archivos clave**: `src/components/ui/BasketMark.tsx` (nuevo), `src/components/ui/GoogleIcon.tsx` (nuevo), `src/components/layout/LoginGate.tsx`, `src/components/layout/AppShell.tsx`, `src/components/dashboard/DashboardPromptBox.tsx`, `src/pages/Dashboard.tsx`, `index.html`, `public/favicon.svg`.

---

## [1.6.0] — Favoritos de alimentos y preferencias aprendidas visibles

**Añadido**
- Favoritos en la Tabla rápida (`/tablas`): marca alimentos con ⭐ y fíltralos. Personal de cada persona.
- Sección "Lo que la IA ha aprendido de ti" en Configuración: lista las preferencias derivadas de tus notas, con opción de "olvidar" cada una.

**Archivos clave**: `src/services/db.ts` (`toggleFavoriteFood`, `listFavoriteFoodIds`, `deleteDerivedPreference`), `src/pages/Tablas.tsx`, `src/pages/Configuracion.tsx`.

---

## [1.5.0] — Control de acceso dinámico (solicitar / aprobar desde la app)

**Cambiado**
- La lista de quién tiene acceso deja de vivir en secretos estáticos
  (`VITE_OWNER_UID` en GitHub, `ALLOWED_UID`/`ALLOWED_UIDS` en el Worker) y
  pasa a vivir en un documento de Firestore (`config/access`), consultado en
  tiempo real.
- Una persona nueva que inicia sesión con Google ahora ve "Solicitud
  enviada" en vez de "Acceso restringido", y su solicitud queda registrada.
- El propietario aprueba o rechaza solicitudes, y puede revocar el acceso de
  cualquiera, todo desde Configuración → "Acceso y personas" — sin tocar
  GitHub, Cloudflare ni `firestore.rules` nunca más para el día a día.
- El Worker ya no necesita el secreto de UIDs permitidos: consulta
  `config/access` vía la API REST de Firestore, autenticado con el mismo ID
  token del usuario que hace la petición.
- Se mantiene una pequeña lista estática de "administradores raíz"
  (`rootAdminUids()` en `firestore.rules`) — solo para poder crear el
  documento `config/access` la primera vez o recuperarlo si algo se rompe.

**Eliminado**
- Secreto `VITE_OWNER_UID` de GitHub Actions (ya no se lee en el código).
- Secreto `ALLOWED_UID` / `ALLOWED_UIDS` del Worker de Cloudflare.

**Archivos clave**: `firestore.rules`, `src/lib/firebase/AuthProvider.tsx`, `src/components/layout/LoginGate.tsx`, `src/services/db.ts` (`initAccessDoc`, `requestAccess`, `approveAccess`, `rejectAccessRequest`, `revokeAccess`), `src/pages/Configuracion.tsx`, `worker/src/index.ts` (`isUidApproved`).

---

## [1.4.0] — Gestión de recetas: editar, duplicar, eliminar, categorías propias

**Añadido**
- Editar una receta guardada (nombre, descripción, dificultad, comensales,
  tiempos, tipo de cocina, notas de seguridad, ingredientes y pasos completos).
- Duplicar una receta (crea una copia independiente, "... (copia)").
- Eliminar una receta del recetario (con confirmación).
- Orden en "Mi recetario": recientes / nombre / tiempo en Air Fryer.
- Crear categorías personalizadas al vuelo desde la ficha de receta (además
  de las 7 categorías del sistema).

**Archivos clave**: `src/services/db.ts` (`updateRecipe`, `duplicateRecipe`, `deleteRecipe`), `src/pages/RecipeDetail.tsx`, `src/pages/Recetario.tsx`, `src/components/recipe/RecipeCard.tsx`.

---

## [1.3.0] — Soporte multiusuario (lista estática, primera versión)

**Añadido**
- Varias personas pueden usar la app: `VITE_OWNER_UID` (GitHub), la función
  `isOwner()` de `firestore.rules` y `ALLOWED_UID`/`ALLOWED_UIDS` del Worker
  pasan a aceptar una lista de UIDs separados por comas, en vez de uno solo.
- Cada persona mantiene su despensa, favoritos, valoraciones y notas por
  separado (`users/{uid}/**`); las recetas en sí se comparten entre todas
  las personas autorizadas.

> Sustituido por el sistema dinámico de la v1.5.0 — esta versión todavía
> requería editar 3 sitios a mano (GitHub, Firestore rules, Worker) para
> añadir a alguien.

---

## [1.2.0] — Cambio de proveedor de IA: Groq

**Cambiado**
- El Worker deja de hablar con Gemini y pasa a hablar con **Groq**
  (`api.groq.com`, compatible con la API de OpenAI), por ser gratuito sin
  tarjeta y mucho más rápido en la práctica (Gemini tardaba minutos en
  algunas peticiones bajo demanda alta; Groq resuelve en segundos).
- Modelo por defecto: `openai/gpt-oss-120b` (ajustado tras comprobar que los
  modelos Llama que se habían probado inicialmente ya no estaban disponibles
  en la cuenta).
- Límite de tokens de `/generate` ajustado a 4096 para encajar en cuotas
  gratuitas de Groq con TPM (tokens por minuto) más bajos.
- Reintentos automáticos ante 429/503 (saturación o límite de cuota),
  heredados del cliente de Gemini.

**Eliminado**
- `worker/src/gemini.ts`, `worker/src/geminiSchema.ts` (ya no hacen falta:
  Groq es compatible con JSON Schema estándar, sin conversión de formato).

**Archivos clave**: `worker/src/groq.ts` (nuevo), `worker/src/index.ts`, `worker/wrangler.toml`.

---

## [1.1.0] — Cambio de proveedor de IA: Google Gemini

**Cambiado**
- El Worker deja de hablar con Claude (Anthropic, de pago) y pasa a hablar
  con **Google Gemini** vía Google AI Studio (gratuito, sin tarjeta).
- Modelo ajustado de `gemini-2.0-flash` (retirado por Google durante el
  desarrollo) a `gemini-3.6-flash`.
- Desactivado el modo de "razonamiento extendido" (`thinkingConfig.thinkingBudget: 0`) del modelo, que causaba respuestas de varios minutos y truncaba el JSON por consumir el presupuesto de tokens en pasos de razonamiento ocultos.
- Límite de tokens de salida subido a 8192 para evitar JSON incompleto en
  respuestas con varias recetas.

**Añadido**
- `worker/src/geminiSchema.ts`: conversor de JSON Schema estándar al formato
  propio (mayúsculas) que espera la API de Gemini.

**Archivos clave**: `worker/src/gemini.ts` (nuevo, sustituyó a `worker/src/anthropic.ts`).

---

## [1.0.0] — Primer despliegue estático: GitHub Pages + Firebase + Cloudflare Worker

Migración completa desde la versión original (Next.js + Prisma + SQLite/Postgres,
pensada para un servidor propio) a una arquitectura sin servidor, a petición
explícita de desplegar en GitHub Pages.

**Añadido**
- Frontend reescrito de Next.js (App Router) a **Vite + React + React Router**.
- Base de datos migrada de Prisma/SQL a **Firestore** (modelo denormalizado:
  recetas con ingredientes/pasos/zonas embebidos; recetario con resumen
  desnormalizado por usuario).
- **Firebase Auth** (Google) con acceso restringido a un único UID (`isOwner()`
  en `firestore.rules` + comprobación en el frontend).
- **Worker de Cloudflare** como proxy seguro hacia la IA (Claude en esta
  versión inicial), verificando el ID token de Firebase con `jose` (sin SDK
  de Node) y comprobando que el `uid` coincide con el único usuario permitido.
- Truco `spa-github-pages` (`public/404.html` + script en `index.html`) para
  que las rutas con parámetro (`/recetas/:id`) sobrevivan a una recarga en
  GitHub Pages.
- Botón "Cargar datos iniciales" en Configuración: sustituye al script de
  seed de Prisma, escribiendo directamente en Firestore desde el navegador
  ya autenticado (modelo Gourmia GAF1180, ~25 alimentos, 4 recetas de ejemplo).
- GitHub Actions (`deploy.yml`): build + despliegue automático a GitHub Pages
  en cada push a `main`.

**Reaprovechado sin cambios** (lógica pura, sin dependencias de framework ni BD):
`src/lib/dualBasket/sync.ts`, `src/lib/validation/recipeValidator.ts`,
`src/lib/foodSafety/rules.ts`, `src/lib/scaling.ts`, `src/types/index.ts`,
y los componentes visuales (solo se les quitaron las importaciones de Next.js).

---

## [0.x] — Versión original (Next.js + Prisma) — histórica, no desplegada

Primera implementación del MVP, pensada para un servidor propio (no GitHub
Pages): Next.js 14 (App Router) + Prisma + SQLite/Postgres + Claude vía API
routes. Sustituida en la v1.0.0 por incompatibilidad con GitHub Pages
(sin servidor propio, sin API routes). El código de esa versión no se
mantiene en este repositorio; sus decisiones de producto (algoritmo de doble
cesta, validación de recetas, reglas de seguridad alimentaria) son las
mismas que se reaprovecharon en la v1.0.0.
