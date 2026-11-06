# Lumbre · Guía de configuración y despliegue

> *“Lámpara es a mis pies tu palabra, y lumbrera a mi camino.”* — Salmo 119:105

Lumbre es un espacio personal y entre amigos para acercarse a Dios. Esta guía te lleva desde cero hasta tener la app publicada en Netlify. Son tres piezas:

| Pieza | Para qué sirve | Costo |
|---|---|---|
| **Supabase** | Cuentas, amigos, diario, planes, oraciones (base de datos + seguridad) | Gratis |
| **API.Bible** | El texto bíblico en varias traducciones en español | Gratis (uso no comercial) |
| **Netlify** | Publicar la app y proteger tu clave de API.Bible | Gratis |

Tiempo estimado: 30–40 minutos.

---

## Paso 1 · Supabase (base de datos y cuentas)

1. Entra a **supabase.com** → **New project**. Ponle de nombre `lumbre`, elige una contraseña para la base de datos y la región más cercana (por ejemplo, *East US*).
2. Cuando el proyecto termine de crearse, ve al menú izquierdo → **SQL Editor** → **New query**.
3. Abre el archivo **`supabase/schema.sql`** de esta carpeta, copia **todo** su contenido, pégalo y pulsa **Run**. Debe decir *Success*.
   - Esto crea todas las tablas, las funciones y las **políticas de seguridad (RLS)**. Puedes volver a ejecutarlo más adelante sin perder datos.
4. Ve a **Project Settings → API** (en algunos paneles aparece como **Data API** / **API Keys**) y copia:
   - **Project URL** → algo como `https://abcdxyz.supabase.co`
   - **anon public key** (o **publishable key**) → una clave larga
5. Abre **`js/config.js`** y pégalos:

   ```js
   export const CONFIG = {
     SUPABASE_URL: 'https://abcdxyz.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOi...tu-clave...',
   };
   ```

   Esta clave es pública por diseño: la seguridad real la ponen las políticas RLS del paso 3.

6. **Correo de confirmación** (opcional): en **Authentication → Sign In / Providers → Email** puedes desactivar *Confirm email* mientras pruebas con amigos, para que puedan entrar al instante. Si lo dejas activo, cada persona recibe un correo para confirmar su cuenta.

### ¿Qué protege la seguridad (RLS)?

| Dato | Quién lo ve |
|---|---|
| Tu diario **privado** | Solo tú |
| Diario **“Mis amigos”** | Tú y tus amigos aceptados |
| Diario **“Algunos amigos”** | Tú y los amigos que elijas en esa entrada |
| Peticiones de oración | Privadas o con tus amigos, según elijas |
| Favoritos, racha, “¿cómo llegas hoy?” | Solo tú |
| Planes compartidos | Solo quienes están en ese plan |
| Versículos enviados | Quien envía y quien recibe |

Para ser amigos hace falta **solicitud + aceptación**. Nadie puede ver nada tuyo solo por tener tu código.

---

## Paso 2 · API.Bible (los textos bíblicos)

1. Crea una cuenta en **api.bible** (botón *Sign up*) y crea una aplicación. Describe el proyecto como personal y sin fines de lucro.
2. Cuando la aprueben, copia tu **API key** desde el panel (*Dashboard*). Guárdala; la usarás en Netlify, **no** en el código.
3. En tu panel revisa qué Biblias en español tienes disponibles. Las traducciones con derechos de autor (como la **Nueva Traducción Viviente**) pueden requerir que las agregues o solicites en tu plan. La app muestra automáticamente **todas** las traducciones en español a las que tu clave tenga acceso, **excepto Reina Valera**, y elige la NTV por defecto si está disponible.

> Lumbre ya incluye el sistema **FUMS** que API.Bible exige en apps web para reportar el uso justo de los textos, y muestra el aviso de derechos de cada traducción debajo del texto.

---

## Paso 3 · Netlify (publicar la app)

Lumbre usa una pequeña **función de Netlify** (`netlify/functions/biblia.mjs`) que guarda tu clave de API.Bible en el servidor para que nadie pueda copiarla. Por eso hay que publicar con **GitHub** o con la **línea de comandos**: arrastrar la carpeta a Netlify Drop no instala esa función.

### Opción A · Con GitHub (recomendada)

1. Crea un repositorio nuevo en **github.com** (puede ser privado) y sube **todo el contenido** de esta carpeta (con *Add file → Upload files* basta).
2. En **app.netlify.com** → **Add new site → Import an existing project → GitHub** → elige el repositorio.
3. Configuración de build:
   - **Build command:** déjalo vacío
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions` (Netlify lo lee del archivo `netlify.toml`)
4. Antes de publicar, abre **Add environment variables** y crea:
   - `BIBLE_API_KEY` = tu clave de API.Bible
5. Pulsa **Deploy**. En un minuto tendrás una dirección como `https://lumbre-xyz.netlify.app`.
   - Si agregas la variable después del primer despliegue, ve a **Deploys → Trigger deploy → Deploy site** para que la función la tome.

Cada vez que cambies algo y lo subas a GitHub, Netlify publica la nueva versión solo.

### Opción B · Con la terminal (Netlify CLI)

```bash
npm install -g netlify-cli
cd lumbre
netlify login
netlify init                       # crea el sitio y lo enlaza a esta carpeta
netlify env:set BIBLE_API_KEY "tu-clave-de-api-bible"
netlify deploy --prod
```

---

## Paso 4 · Conectar Supabase con tu dirección de Netlify

Para que los correos de confirmación y de “olvidé mi contraseña” lleven a tu app:

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL:** `https://lumbre-xyz.netlify.app` (tu dirección real).
3. **Redirect URLs:** agrega la misma dirección.

---

## Paso 5 · Probarla

1. Abre tu dirección de Netlify y **crea tu cuenta**.
2. Verás el **momento de pausa** (“¿Cómo llegas hoy?”) y luego el **versículo del día**.
3. Ve a **Amigos**, pulsa **Invitar** y envía el enlace a alguien (por ejemplo, a Abri). Cuando se registre con ese enlace, te llegará su solicitud; acéptala y ya podrán compartir.
4. En **Planes**, elige uno y marca a tus amigos para hacerlo juntos.
5. En el teléfono: **Compartir → Agregar a pantalla de inicio** (iPhone) o **Instalar app** (Android) para usarla como una app más.

---

## Qué incluye Lumbre

- **Cuentas y perfil** con nombre y color.
- **Amigos** por código o enlace, con solicitud y aceptación.
- **Versículo del día**: 366 versículos (uno por cada día del año) con una reflexión breve y un tema por mes. El texto siempre viene de API.Bible.
- **Compartir como imagen** para historias de Instagram (1080 × 1920).
- **“Versículo para hoy”**: envía un versículo con una nota a uno o varios amigos.
- **Planes de lectura** (10 incluidos), solos o **compartidos**, con avance de cada persona y conversación por día.
- **Diario espiritual** con ideas para escribir, borrador automático y visibilidad: privado, todos mis amigos o amigos elegidos. Con comentarios.
- **Momento de pausa** con guía de respiración y una palabra según cómo llegas.
- **Peticiones de oración** con “Oraré por esto” y **oraciones respondidas** con testimonio.
- **Subrayados de colores y favoritos** directamente en el lector.
- **Racha** de días leyendo y **recordatorio diario** (evento en tu calendario + notificaciones).
- **Mi mes**: días leídos, entradas, versículos guardados, oraciones respondidas y cómo llegaste cada día.
- **Modo claro, oscuro o automático**, diseño para teléfono y computadora, instalable como app.

---

## Personalizar

| Quiero cambiar… | Archivo |
|---|---|
| Los versículos del día o sus reflexiones | `js/datos/versiculos.js` |
| Los planes de lectura o agregar uno nuevo | `js/datos/planes.js` |
| Colores, tipografías, tamaños | `css/estilos.css` (variables al inicio) |
| El logo | `assets/logo.svg` y `assets/icono.svg` |
| Las preguntas del momento de pausa | `js/vistas/pausa.js` |

## Estructura

```
lumbre/
├── index.html               Página principal
├── css/estilos.css          Identidad visual
├── js/
│   ├── config.js            ← Tus datos de Supabase
│   ├── main.js              Arranque, sesión y navegación
│   ├── estado.js            Conexión con Supabase
│   ├── biblia.js            Conexión con API.Bible (vía Netlify)
│   ├── acciones.js          Enviar, subrayar, compartir
│   ├── imagen.js            Imagen para Instagram
│   ├── recordatorio.js      Recordatorio diario
│   ├── datos/               Versículos del día y planes
│   └── vistas/              Cada pantalla de la app
├── netlify/functions/biblia.mjs   Puente seguro a API.Bible
├── supabase/schema.sql      Base de datos y seguridad
├── assets/                  Logo e íconos
├── manifest.webmanifest     Para instalarla como app
└── sw.js                    Funcionamiento sin conexión básico
```

## Si algo no funciona

| Síntoma | Solución |
|---|---|
| “Casi lista. Falta conectar tu base de datos” | Revisa `js/config.js` (Paso 1.5) |
| “No pudimos conectar” al entrar | Ejecuta de nuevo `supabase/schema.sql` |
| “Falta configurar la clave de API.Bible” | Agrega `BIBLE_API_KEY` en Netlify y vuelve a desplegar |
| “Tu clave no tiene acceso a esta traducción” | Elige otra en **Ajustes** o agrégala en tu panel de API.Bible |
| No llega el correo de confirmación | Revisa spam, o desactiva *Confirm email* (Paso 1.6) |
| Los enlaces del correo abren `localhost` | Configura las URL del Paso 4 |
