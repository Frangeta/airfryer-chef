# Chefryer — despliegue en GitHub Pages + Firebase

> Versión actual: **1.9.0** — ver [`CHANGELOG.md`](./CHANGELOG.md) para el historial completo.

No se instala en local: se despliega en **GitHub Pages** (frontend estático),
usa **Firestore** (Firebase) como base de datos, **Firebase Auth** (Google)
para controlar quién entra, y un **Worker de Cloudflare** como el único
sitio donde vive tu clave de IA, en secreto.

```
Tu navegador (GitHub Pages)
   │
   ├──► Firestore + Auth (Firebase) ── datos, directo desde el navegador
   │        └─ config/access decide en tiempo real quién tiene acceso
   │
   └──► Worker (Cloudflare) ── solo para hablar con Groq
              │
              └──► api.groq.com   (la clave nunca sale de aquí)
```

El acceso es multiusuario y se gestiona **desde la propia app**: cualquiera
que inicie sesión con Google puede solicitar acceso, y quien ya lo tiene lo
aprueba con un clic en Configuración — sin tocar secretos de GitHub,
Cloudflare ni reglas de Firestore para cada persona nueva (ver paso 8).

---

## 1. Crear el proyecto Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) → **Crear un proyecto**.
2. Dentro del proyecto: **Firestore Database** → Crear base de datos → modo producción → la región que prefieras.
3. **Authentication** → Sign-in method → activa **Google**.

## 2. Registrar la app web

1. En el resumen del proyecto, icono **`</>`** (añadir app web).
2. Ponle un nombre (p.ej. "Chefryer Web"). No hace falta Firebase Hosting.
3. Copia el objeto `firebaseConfig` que te muestra — lo necesitarás en el paso 4.

## 3. Subir el proyecto a GitHub

1. Crea un repositorio nuevo en GitHub, por ejemplo `airfryer-chef`.
2. Sube el contenido de esta carpeta (`airfryer-chef-web/`) a la raíz de ese repositorio — incluyendo las carpetas `src/`, `public/`, `worker/` y `.github/` (son carpetas de verdad, no solo archivos sueltos; si tu explorador de archivos oculta `.github` por empezar con un punto, súbela aparte con "Add file → Create new file" escribiendo la ruta completa).
3. En **Settings → Pages**, en "Build and deployment" → Source: **GitHub Actions**.

## 4. Configurar los secretos de GitHub

**Settings → Secrets and variables → Actions → New repository secret.** Crea estos, con los valores del `firebaseConfig` del paso 2:

| Secreto | Valor |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_AI_PROXY_URL` | déjalo vacío por ahora — vuelve en el paso 9 |

## 5. Autorizar el dominio de GitHub Pages en Firebase

En **Authentication → Settings → Authorized domains** de Firebase, añade
`tu-usuario.github.io` (sin la ruta del repo).

## 6. Primer despliegue y obtención de tu UID

1. Haz `git push` a `main` — dispara el workflow de GitHub Actions y publica en `https://tu-usuario.github.io/airfryer-chef/`.
2. Abre esa URL e inicia sesión con Google.
3. En Firebase Console → **Authentication → Users**, verás tu cuenta recién creada. Copia su **UID** — lo necesitas en el paso siguiente.

## 7. Configurar el/los administrador/es raíz en Firestore rules

1. Abre `firestore.rules` en el repo. Busca:
   ```
   function rootAdminUids() {
     return ['OWNER_UID_PLACEHOLDER'];
   }
   ```
2. Sustituye `OWNER_UID_PLACEHOLDER` por tu UID (si vas a administrar la app con más de una cuenta desde el principio, pon varios separados por comas: `['uid1', 'uid2']`).
3. Publica las reglas: Firebase Console → Firestore Database → **Rules** → pega el contenido completo del archivo → **Publish** (o, si prefieres la CLI, `firebase deploy --only firestore:rules`).

Este es el **único** UID que hace falta escribir a mano en todo el proceso. A partir de aquí, dar acceso a cualquier otra persona es un clic dentro de la app (paso 8 más abajo, sección "Después del primer despliegue").

## 8. Inicializar el control de acceso

1. Vuelve a la app y entra con la misma cuenta de Google del paso 6.
2. Verás la pantalla **"Configurar control de acceso"** → botón **"Inicializar acceso"**.
3. Esto crea el documento `config/access` en Firestore contigo como primera persona autorizada.

### Después del primer despliegue: añadir a alguien más

1. Comparte el enlace de la app con esa persona.
2. Inicia sesión con Google → verá "Solicitud enviada".
3. Tú entras en **Configuración → Acceso y personas** → verás su solicitud con nombre y correo → **Aprobar**.

Sin tocar GitHub, sin tocar Cloudflare, sin volver a editar `firestore.rules`.
También puedes **revocar** el acceso de cualquiera desde esa misma pantalla.

## 9. Cargar los datos iniciales

Configuración → tarjeta **"Primera vez por aquí"** → botón **"Cargar datos iniciales"**.
Escribe directamente en Firestore desde tu navegador: el modelo Gourmia
GAF1180, ~25 alimentos con sus perfiles de cocción, y 4 recetas de ejemplo
(incluida la insignia de doble cesta). Es una sola vez para todo el grupo
(no hace falta repetirlo por persona).

## 10. Desplegar el Worker de Cloudflare (proxy de Groq)

El código está en `worker/`. Necesitas una cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com) (sin tarjeta).

### Consigue tu clave de Groq (gratis, sin tarjeta)
1. Ve a [console.groq.com/keys](https://console.groq.com/keys) e inicia sesión (puedes usar tu cuenta de Google).
2. **"Create API Key"** → ponle un nombre, por ejemplo `airfryer-chef`.
3. Copia la clave — solo se muestra una vez.

### Opción A — sin CLI, conectando el repo
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Workers** → conectar con Git → selecciona tu repositorio.
2. Como "Root directory" indica `worker`.
3. En **Settings → Variables and Secrets** del Worker, añade como *secretos*:
   - `GROQ_API_KEY` → la clave que acabas de copiar
   - `FIREBASE_PROJECT_ID` → tu `projectId` de Firebase
   - `ALLOWED_ORIGIN` → `https://tu-usuario.github.io` (sin barra final ni ruta)
4. Guarda — Cloudflare construye y despliega automáticamente. Copia la URL pública que te asigna.

> Nota: ya **no** hace falta ningún secreto de UIDs aquí — el Worker consulta
> `config/access` en Firestore en tiempo real, así que añadir o quitar
> personas nunca requiere tocar este Worker.

### Opción B — sin Git, pegando el código ya compilado (si Cloudflare te pide tarjeta al conectar Git)
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Workers** → plantilla básica ("Hello World"), sin conectar repositorio.
2. **"Edit code"** → borra el código de ejemplo → pega el contenido de un bundle ya compilado del Worker (genera uno con `cd worker && npx wrangler deploy --dry-run --outdir=dist-bundle`, o pide uno) → **Deploy**.
3. Configura los 3 secretos igual que en la Opción A.

### Opción C — con la CLI de Cloudflare (`wrangler`)
```bash
cd worker
npx wrangler login
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put ALLOWED_ORIGIN
npx wrangler deploy
```

### Conectar el Worker al frontend
Rellena el secreto `VITE_AI_PROXY_URL` en GitHub con la URL del Worker y vuelve a lanzar el workflow de despliegue (Actions → "Deploy a GitHub Pages" → Run workflow).

> **Nota sobre el modelo**: el Worker usa `openai/gpt-oss-120b` por defecto (a través de Groq). Si Groq renombra o retira ese modelo, añade una variable (no secreta) `GROQ_MODEL` con el nombre del modelo vigente — consulta [console.groq.com/docs/models](https://console.groq.com/docs/models). Groq también ofrece variantes más rápidas y ligeras (p.ej. `openai/gpt-oss-20b`) si prefieres priorizar velocidad sobre calidad de las recetas.

---

## Documentos del proyecto

| Archivo | Para qué sirve |
|---|---|
| `README.md` (este archivo) | Instrucciones de despliegue paso a paso |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Decisiones de arquitectura, modelo de datos, seguridad |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial de versiones — qué cambió y por qué en cada una |
| `firestore.rules` | Reglas de seguridad de Firestore (documentadas con comentarios) |
| `worker/wrangler.toml` | Configuración del Worker y lista de secretos necesarios |

Si haces cambios importantes en la arquitectura o el modelo de datos,
actualiza también `ARCHITECTURE.md` y añade una entrada en `CHANGELOG.md`.

## Coste esperado

- **GitHub Pages**: gratis.
- **Firebase (Firestore + Auth)**: gratis para un grupo pequeño, muy por debajo de la capa gratuita (Spark).
- **Cloudflare Workers**: gratis hasta 100.000 peticiones/día.
- **Groq**: nivel gratuito, sin tarjeta.

## Resolución de problemas comunes

- **"Solicitud enviada" para siempre**: quien ya tiene acceso debe entrar en Configuración → "Acceso y personas" y aprobar la solicitud.
- **"Configurar control de acceso" no desaparece / da error al inicializar**: solo funciona con una cuenta cuyo UID esté en `rootAdminUids()` dentro de `firestore.rules` (paso 7).
- **El Chef IA da error de autenticación o "no configurada para este usuario"**: comprueba que tu cuenta está en `config/access.allowedUids` (Configuración → Acceso y personas debería mostrarte ahí), y que `ALLOWED_ORIGIN` en el Worker coincide exactamente con tu dominio de GitHub Pages (sin barra final).
- **Página en blanco tras desplegar**: revisa que `VITE_BASE_PATH` (lo pone el workflow automáticamente a partir del nombre del repo) coincide con la URL real; si usas un dominio propio en vez de `usuario.github.io/repo/`, cambia esa variable a `/`.
- **Groq da error 413 / "rate_limit_exceeded"**: tu cuenta tiene un límite de tokens por minuto bajo (nivel gratuito sin verificar). Revisa `console.groq.com/settings/billing` por si hay una verificación gratuita que lo amplíe, o baja `maxTokens` en `worker/src/index.ts`.
- **Groq da error 404 "model not found"**: el modelo configurado ya no existe en tu cuenta — revisa `console.groq.com/docs/models` y actualiza la variable `GROQ_MODEL` del Worker.
