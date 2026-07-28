# BSPaste Frontend

Cliente web de **BSPaste**, una aplicación del ecosistema **BSDev** para compartir información temporal entre dispositivos con cifrado de extremo a extremo.

El navegador cifra texto, código, imágenes y archivos antes de enviarlos. El backend administra ciphertext, permisos, expiración y enlaces firmados, pero no recibe el contenido descifrado ni las claves de usuario.

## Funcionalidades

- Editor enriquecido con TipTap para texto, Markdown y código.
- Creación de pastes con expiración, PIN, contraseña y Burn After Read.
- Adjuntar imágenes mediante Ctrl+V, arrastrar y soltar o selector de archivos.
- Cifrado AES-256-GCM en el dispositivo antes de cada envío.
- Carga directa de assets cifrados a Cloudflare R2 mediante URLs firmadas.
- QR y copia de enlaces de compartición.
- Live Share cifrado por WebSockets con debounce.
- Registro e inicio de sesión por username.
- Biblioteca privada de pastes, favoritos y galería de archivos.
- URLs personalizadas para pastes propios.
- Diseño responsive, oscuro por defecto y preparado como PWA.

## Stack

- Next.js 16 con App Router
- React 19 y TypeScript estricto
- Tailwind CSS y componentes Base UI/shadcn
- TipTap y Lowlight
- TanStack Query
- Zustand
- Web Crypto API
- Socket.IO Client
- QRCode React

## Arquitectura del cliente

```text
src/
├── app/          rutas, layouts y páginas
├── components/   editor, assets, auth, biblioteca, layout y UI
├── contracts/    contratos tipados del backend
├── hooks/        API REST, autenticación y Live Share
├── lib/          criptografía, tokens de propietario y utilidades
├── providers/    React Query, restauración segura de sesión y PWA
└── stores/       estado efímero de paste y sesión
```

La sesión usa access tokens en memoria y refresh tokens en cookies `HttpOnly` emitidas por la API. No se guardan credenciales de autenticación en `localStorage`.

## Requisitos

- Node.js 24 o superior.
- npm.
- Backend BSPaste ejecutándose localmente o desplegado.

## Configuración local

Copia las variables de entorno:

```bash
cp .env.example .env.local
```

En PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Variables públicas:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001/live
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Estas variables son públicas por diseño. No coloques claves de Cloudflare R2, secretos JWT, contraseñas ni tokens privados en el frontend.

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

Para que la sesión y CORS funcionen, el backend debe permitir este origen:

```env
FRONTEND_ORIGIN=http://localhost:3000
```

## Rutas

| Ruta | Propósito |
| --- | --- |
| `/` | Landing y acceso rápido a creación o Live Share. |
| `/create` | Editor, adjuntos y configuración de seguridad. |
| `/p/[id]` | Lectura, desbloqueo, QR, assets y acciones del propietario. |
| `/live/[id]` | Acceso a una sesión Live Share. |
| `/login` | Inicio de sesión por username. |
| `/register` | Creación de cuenta. El correo es opcional por ahora. |
| `/dashboard` | Biblioteca de pastes propios. |
| `/favorites` | Pastes guardados como favoritos. |
| `/assets` | Galería de imágenes y archivos cifrados. |
| `/settings` | Estado de API, PostgreSQL y R2. |

## Flujo de cifrado

1. Se genera una DEK aleatoria de 256 bits por paste.
2. Texto y archivos se cifran con AES-256-GCM y nonce único de 96 bits.
3. Sin PIN ni contraseña, la DEK viaja en el fragmento `#key` del enlace. Ese fragmento no llega al servidor HTTP.
4. Con PIN o contraseña, Argon2id deriva una KEK que envuelve la DEK localmente.
5. Se crea un access proof separado para desbloquear el paste sin enviar el secreto original.
6. Para imágenes y archivos, únicamente el ciphertext se sube directamente a R2.

Las claves de enlaces abiertos se conservan durante la sesión actual para mejorar la navegación por la biblioteca. La sincronización segura de claves entre dispositivos requerirá una bóveda cifrada y es una fase posterior del producto.

## Cloudflare R2 y CORS

El bucket R2 es privado. El navegador usa URLs firmadas temporales emitidas por el backend para subir y descargar ciphertext.

Para desarrollo local, configura en el bucket:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

En producción usa el dominio HTTPS exacto del frontend. No uses `*` ni hagas público el bucket.

## Live Share

Live Share sincroniza snapshots cifrados por Socket.IO. El cliente aplica debounce antes de emitir cambios para evitar una actualización por cada pulsación de tecla.

Eventos utilizados:

- `paste.join`
- `paste.leave`
- `paste.update`
- `paste.lock`
- `paste.delete`
- `asset.added`
- `asset.removed`
- `presence.update`

Burn After Read y Live Share no se pueden activar a la vez porque sus modelos de acceso son incompatibles.

## Verificación

```bash
npm run lint
npm run build
```

## Despliegue en Vercel

1. Importa este repositorio en Vercel.
2. Define las variables `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` y `NEXT_PUBLIC_APP_URL`.
3. Publica el frontend con HTTPS.
4. En el backend configura `FRONTEND_ORIGIN` con el dominio final de Vercel.
5. Agrega ese mismo origen a la política CORS del bucket R2.
6. Verifica login, carga de imagen, QR, Live Share y lectura de un paste protegido.

`NEXT_PUBLIC_WS_URL` debe apuntar al origen del backend que expone Socket.IO; no incluyas secretos en ninguna variable `NEXT_PUBLIC_*`.

## Calidad y decisiones

- El cliente mantiene separación entre componentes, hooks, contratos y estado.
- TanStack Query administra requests, caché e invalidación de biblioteca.
- Zustand mantiene estado efímero del editor, DEK y sesión actual.
- El diseño evita Bootstrap y prioriza una interfaz minimalista, responsive y oscura.
- La API sigue siendo la autoridad de autenticación; el frontend no usa proveedores de autenticación externos.

## Roadmap

- Verificación y recuperación de correo.
- Bóveda cifrada para claves entre dispositivos.
- Gestión de sesiones desde perfil.
- Historial y versionado de pastes.
- API pública, CLI y extensión de navegador.

## Licencia

Proyecto perteneciente al ecosistema **BSDev**. Se requiere un archivo `LICENSE` explícito antes de conceder derechos de uso o redistribución.
