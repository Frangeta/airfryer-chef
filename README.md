# Air Fryer Chef — despliegue en GitHub Pages + Firebase

Esta versión no se instala en local: se despliega en **GitHub Pages** (frontend
estático), usa **Firestore** (Firebase) como base de datos, **Firebase Auth**
(Google) para que solo tú puedas entrar, y un **Worker de Cloudflare** como el
único sitio donde vive tu clave de Claude, en secreto, atado a tu usuario.

```
Tu navegador (GitHub Pages)
   │
   ├──► Firestore + Auth (Firebase) ── datos, directo desde el navegador
   │
   └──► Worker (Cloudflare) ── solo para hablar con Claude
              │
              └──► api.anthropic.com   (la clave nunca sale de aquí)
```

Todo el código ya está escrito, compilado y verificado en este entorno
(`tsc` sin errores, `vite build` genera `dist/` correctamente, el Worker
bundlea sin errores con `wrangler`). Lo que queda son pasos de configuración
en paneles web — ninguno requiere instalar nada en tu ordenador, salvo que tú
prefieras usar la CLI de Cloudflare como alternativa (lo indico en el paso 9).

---

## 1. Crear el proyecto Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) → **Crear un proyecto**.
2. Dentro del proyecto: **Firestore Database** → Crear base de datos → modo producción → la región que prefieras.
3. **Authentication** → Sign-in method → activa **Google**.

## 2. Registrar la app web

1. En el resumen del proyecto, icono **`</>`** (añadir app web).
2. Ponle un nombre (p.ej. "Air Fryer Chef Web"). No hace falta Firebase Hosting.
3. Copia el objeto `firebaseConfig` que te muestra — lo necesitarás en el paso 5.

## 3. Subir el proyecto a GitHub

1. Crea un repositorio nuevo en GitHub, por ejemplo `airfryer-chef`.
2. Sube el contenido de esta carpeta (`airfryer-chef-web/`) a la raíz de ese repositorio.
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
| `VITE_OWNER_UID` | déjalo vacío por ahora — vuelve en el paso 6 |
| `VITE_AI_PROXY_URL` | déjalo vacío por ahora — vuelve en el paso 9 |

## 5. Autorizar el dominio de GitHub Pages en Firebase

En **Authentication → Settings → Authorized domains** de Firebase, añade
`tu-usuario.github.io` (sin la ruta del repo).

## 6. Primer despliegue y obtención de tu UID

1. Haz `git push` a `main` — esto dispara el workflow de GitHub Actions (pestaña **Actions** del repo) y publica en `https://tu-usuario.github.io/airfryer-chef/`.
2. Abre esa URL e inicia sesión con Google. Como `VITE_OWNER_UID` está vacío, verás la pantalla de "Acceso restringido" — es normal, es la señal de que el login en sí funciona.
3. En Firebase Console → **Authentication → Users**, verás tu cuenta recién creada. Copia su **UID**.
4. Rellena el secreto `VITE_OWNER_UID` en GitHub con ese UID y vuelve a lanzar el workflow (**Actions → Deploy a GitHub Pages → Run workflow**, o simplemente otro `git push`).

## 7. Restringir Firestore a tu UID

1. Abre `firestore.rules` en el repo y sustituye `OWNER_UID_PLACEHOLDER` por tu UID real.
2. Despliega las reglas. Necesitas la [Firebase CLI](https://firebase.google.com/docs/cli) solo para este comando puntual (o hazlo a mano copiando el contenido del archivo en Firebase Console → Firestore Database → Reglas → pegar → Publicar, que evita instalar la CLI):

   ```
   firebase deploy --only firestore:rules
   ```

Con esto, aunque alguien más inicie sesión con su propia cuenta de Google, no podrá leer ni escribir nada — solo tu UID puede.

## 8. Cargar los datos iniciales

Vuelve a entrar en la app (ya deberías pasar la pantalla de acceso) → **Configuración** → botón **"Cargar datos iniciales"**. Esto escribe directamente en Firestore desde tu navegador: el modelo Gourmia GAF1180, ~25 alimentos con sus perfiles de cocción, y 4 recetas de ejemplo (incluida la insignia de doble cesta). Es una sola vez.

## 9. Desplegar el Worker de Cloudflare (proxy de Claude)

El código está en `worker/`. Necesitas una cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com) (sin tarjeta).

### Opción A — sin CLI, conectando el repo (recomendada si no quieres instalar nada)
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Workers** → conectar con Git → selecciona tu repositorio.
2. Como "Root directory" indica `worker`.
3. En **Settings → Variables and Secrets** del Worker, añade como *secretos* (no variables de texto plano):
   - `ANTHROPIC_API_KEY` → tu clave de [console.anthropic.com](https://console.anthropic.com)
   - `ALLOWED_UID` → el mismo UID del paso 6
   - `FIREBASE_PROJECT_ID` → tu `projectId` de Firebase
   - `ALLOWED_ORIGIN` → `https://tu-usuario.github.io` (sin barra final ni ruta)
4. Guarda — Cloudflare construye y despliega automáticamente. Copia la URL pública que te asigna (algo como `https://airfryer-chef-ai-proxy.tu-usuario.workers.dev`).

### Opción B — con la CLI de Cloudflare (`wrangler`)
```bash
cd worker
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ALLOWED_UID
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put ALLOWED_ORIGIN
npx wrangler deploy
```

### Conectar el Worker al frontend
Rellena el secreto `VITE_AI_PROXY_URL` en GitHub con la URL del Worker y vuelve a lanzar el workflow de despliegue.

---

## Comprobaciones ya hechas en este entorno

- `npx tsc -b` (frontend) → sin errores.
- `npx vite build` → genera `dist/` completo y funcional.
- `npx tsc --noEmit` (worker) → sin errores.
- `npx wrangler deploy --dry-run` (worker) → bundlea correctamente (224 KB).

Lo único que no he podido probar aquí es la integración real con Firebase/Cloudflare/GitHub en vivo, porque este entorno no tiene acceso de red a esos servicios — pero el código en sí está verificado.

## Coste esperado

- **GitHub Pages**: gratis.
- **Firebase (Firestore + Auth)**: gratis para un único usuario, muy por debajo de la capa gratuita (Spark).
- **Cloudflare Workers**: gratis hasta 100.000 peticiones/día — para uso personal, $0.
- **Claude (Anthropic)**: pago por uso según tu consumo real; no hay coste de infraestructura añadido encima.

## Resolución de problemas comunes

- **"Acceso restringido" para siempre**: revisa que `VITE_OWNER_UID` (GitHub secret) coincide exactamente con tu UID de Firebase Authentication → Users.
- **El Chef IA da error de autenticación**: comprueba que `ALLOWED_UID` en el Worker es el mismo UID, y que `ALLOWED_ORIGIN` coincide exactamente con tu dominio de GitHub Pages (sin barra final).
- **Página en blanco tras desplegar**: revisa que `VITE_BASE_PATH` (lo pone el workflow automáticamente a partir del nombre del repo) coincide con la URL real; si usas un dominio propio en vez de `usuario.github.io/repo/`, cambia esa variable a `/`.
- **Firestore rechaza todas las lecturas**: es el comportamiento esperado hasta que sustituyas `OWNER_UID_PLACEHOLDER` en `firestore.rules` y despliegues las reglas (paso 7).
