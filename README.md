# Portal de Productos - Programación Web 1

[Repositorio del proyecto](https://github.com/0xJVR/PrograWeb1)

Proyecto Node.js que expone un portal de productos con autenticación JWT, panel de administración, chat en tiempo real con Socket.IO y gestión de usuarios/productos sobre MongoDB. La interfaz web es una SPA servida estáticamente desde Express y programada con JavaScript vanilla.

## Prueba en producción:

La applicación se encuentra online para realizar pruebas en [https://pw.salme.dev](https://pw.salme.dev)

---

## Contenido

- [Requisitos y puesta en marcha](#requisitos-y-puesta-en-marcha)
- [Descripción de archivos](#descripción-de-archivos-de-proyecto)
- [API](#api-resumen)
- [Credenciales de ejemplo](#credenciales-de-ejemplo)
- [Decisiones de diseño y consideraciones técnicas](#decisiones-de-diseño-y-consideraciones-técnicas)
- [Dependencias y por qué se usan](#dependencias-y-por-qué-se-usan)
- [Seguridad, validación y límites](#seguridad-validación-y-límites)
- [Notas de despliegue](#notas-de-despliegue)

---

## Requisitos y puesta en marcha

### Requisitos previos
- Node.js
- MongoDB

### Variables de entorno
Crear archivo .env utilizando como base .env.example

```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/portal-productos
JWT_SECRET=una_clave_segura_y_larga
NODE_ENV=development
```

### Inicio rápido

**Opción A - automatizado**  
El proyecto incluye un `start.sh` que automatiza:
1) la instalación de dependencias,  
2) la carga de datos de ejemplo en MongoDB
3) el arranque del servidor.

```bash
chmod +x start.sh
./start.sh
```

**Opción B - manual**
```bash
# 1) Instalar dependencias
npm install

# 2) Cargar datos de ejemplo
node src/scripts/seedDatabase.js

# 3) Arrancar el servidor
node src/server.js
```

Los datos de ejemplo también pueden inicializarse directamente con `src/scripts/seedDatabase.js`.

---

## Descripción de archivos de proyecto

### Backend

- **`src/server.js`**  
  Servidor principal: Express + HTTP + Socket.IO.  
  - Carga middlewares (Helmet, CORS, parsers, `express-fileupload`, rate limiting).  
  - Sirve estáticos desde `public/`.  
  - Registra rutas API (`/api/auth`, `/api/products`, `/api/chat`, `/api/users`, `/api/admin`).  
  - Conecta a MongoDB con Mongoose.  
  - Configura autenticación de Socket.IO mediante JWT en el handshake.  
  - Gestiona asignación de administrador a usuarios en el chat, eventos de mensajes, “typing”, y lista de conversaciones.  
  - Aplica manejadores de error 404 y global.

- **`src/config.js`**  
  Centraliza configuración leída de `.env` (PORT, MONGODB_URI, JWT_SECRET, JWT exp) y `NODE_ENV`.

- **`src/scripts/seedDatabase.js`**  
  Script de inicialización de base de datos:
  - Conecta a MongoDB, limpia colecciones `users`, `products`, `messages`.  
  - Crea un admin y un usuario con IDs fijos (contraseñas se hashean vía hook Mongoose).  
  - Inserta productos de ejemplo y un breve historial de mensajes.

- **Modelos (`src/models/*.js`)**
  - **`User.js`**: esquema de Usuario con `name`, `email`, `password` (hash `bcrypt`), `role` (`user|admin`), `profileColor`, `createdAt`. Hooks para hashear contraseña y método `comparePassword`. Oculta `password` en `toJSON`.
  - **`Product.js`**: esquema de Producto (`name`, `price`, `description`, `image`, `createdBy`, `createdAt`, `updatedAt`). Hook `pre('save')` para mantener `updatedAt`.
  - **`Message.js`**: mensajes de chat con `sender`, `senderName`, `recipient`, `content`, `timestamp`, `conversationType`, `conversationId`. Índices para consultas por conversación y fecha.

- **Rutas (`src/routes/*.js`)**
  - **`authRoutes.js`**: registro, login y verificación de token. Devuelve JWT y datos básicos del usuario.
  - **`productRoutes.js`**: CRUD de productos.  
    - Público: listar y obtener detalle.  
    - Admin: crear/editar/eliminar, subida de imagen con `express-fileupload` (validación mimetype/tamaño).  
    - Sanitiza entradas y valida con utilidades.
  - **`chatRoutes.js`**: endpoints HTTP complementarios al chat (listar conversaciones, obtener mensajes, iniciar conversación, limpiar historial -solo admin-).
  - **`userRoutes.js`**: perfil del usuario autenticado (obtener/actualizar nombre), cambio de contraseña, cambio de color de perfil, eliminación de cuenta. `GET /api/users` solo para admins (listado).
  - **`adminRoutes.js`**: endpoints para panel admin: estadísticas, listado/paginación de usuarios y productos, actividad reciente, actualización/eliminación de usuarios.

- **Middlewares (`src/middleware/*.js`)**
  - **`authenticateJWT.js`**: valida `Authorization: Bearer <token>`, anexa `req.user` y provee `requireAdmin`.
  - **`errorHandler.js`**: 404, manejador global de errores con logging, y wrapper `asyncHandler`.
  - **`rateLimiter.js`**: limitador simple en memoria por IP con ventanas configurables. Incluye tres instancias: general, auth e API.

- **Utilidades (`src/utils/*.js`)**
  - **`logger.js`**: logging coloreado para distintos niveles.
  - **`validators.js`**: validación de email, contraseña, producto, URL y sanitización básica de strings para evitar XSS.

### Frontend (estático, servido desde `public/`)

- **`index.html` / `client.js`**  
  Página principal con grid de productos.  
  - Carga productos vía `/api/products`.  
  - Maneja autenticación desde `localStorage` (token y usuario).  
  - Si el usuario es admin, permite crear/editar/eliminar productos (modal con `FormData` para soportar imagen).  
  - Helpers de formato (EUR), escape anti-XSS, vista previa de imagen.

- **`product-detail.html` / `product-detail.js`**  
  Vista de detalle de producto (`/product-detail.html?id=...`).  
  - Carga el producto y, para admin, permite edición/eliminación con modal.

- **`login.html` / `login.js`**  
  Formulario de acceso. Envía a `/api/auth/login`, guarda token/usuario en `localStorage`, redirige al inicio.

- **`register.html` / `register.js`**  
  Registro de usuarios. Valida coincidencia de contraseñas y envía a `/api/auth/register`.

- **`settings.html` / `settings.js`**  
  Configuración de perfil:  
  - Cambiar nombre.  
  - Seleccionar uno de 8 gradientes de avatar (`profileColor`).  
  - Cambiar contraseña.  
  - Eliminar cuenta (pide contraseña).  
  - Muestra enlace al panel admin si el rol es `admin`.

- **`chat.html` / `chat.js`**  
  Chat en tiempo real con Socket.IO:  
  - Autenticación del socket con el JWT.  
  - Asignación automática de admin a usuarios.  
  - Lista de conversaciones para administradores, indicador “está escribiendo”, historial, y envío de mensajes.  
  - Manejo de UI para usuario vs. admin.

- **`admin-panel.html` / `admin-panel.js`**  
  Panel de administración:  
  - Dashboard con métricas: usuarios, nuevos de la semana, productos, mensajes.  
  - Gestión de usuarios (búsqueda, filtro por rol, edición, eliminación con modal y paginación).  
  - Listado de productos.  
  - Registro de actividad (usuarios/productos/mensajes recientes).

- **Hojas de estilo**  
  `styles.css`, `product-detail.css`, `chat.css`, `settings.css`, `admin-panel.css` - Estilos base y específicos de cada vista.

- **`favicon.svg`**  
  Icono del sitio.

- **`public/uploads/`**  
  Directorio de imágenes subidas de productos (se crea automáticamente si no existe).

---

## API (resumen)

> Todas las rutas protegidas requieren encabezado `Authorization: Bearer <token>`.

- **Auth**
  - `POST /api/auth/register` - Registro (fuerza rol `user`).
  - `POST /api/auth/login` - Login con email/contraseña.
  - `GET  /api/auth/verify` - Devuelve datos del usuario autenticado.

- **Productos**
  - `GET  /api/products` - Listar productos (público).
  - `GET  /api/products/:id` - Detalle (público).
  - `POST /api/products` - Crear (admin). Admite JSON o `multipart/form-data` con `image`.
  - `PUT  /api/products/:id` - Actualizar (admin). Admite JSON o `multipart/form-data`.
  - `POST /api/products/:id/image` - Actualizar imagen (admin).
  - `DELETE /api/products/:id` - Eliminar (admin).

- **Usuarios**
  - `GET  /api/users` - Listar usuarios (solo admin).
  - `GET  /api/users/profile` - Perfil del autenticado.
  - `PUT  /api/users/profile` - Actualizar nombre.
  - `PUT  /api/users/profile-color` - Actualizar gradiente del avatar.
  - `POST /api/users/change-password` - Cambiar contraseña.
  - `DELETE /api/users/account` - Eliminar cuenta del autenticado.

- **Chat**
  - `GET  /api/chat/conversations` - Conversaciones del usuario/admin.
  - `GET  /api/chat/messages/:conversationId` - Mensajes de una conversación.
  - `POST /api/chat/start-conversation` - Iniciar conversación con usuario específico.
  - `DELETE /api/chat/messages` - Limpiar historial (solo admin).

- **Admin**
  - `GET  /api/admin/stats` - Estadísticas.
  - `GET  /api/admin/users` - Usuarios (paginación y filtros).
  - `PUT  /api/admin/users/:id` - Actualizar usuario.
  - `DELETE /api/admin/users/:id` - Eliminar usuario.
  - `GET  /api/admin/products` - Productos (paginación).
  - `GET  /api/admin/activity` - Actividad reciente.

---

## Credenciales de ejemplo

Con el *seed* de datos:

- **Admin**: `admin@test.com` / `admin123`  
- **Usuario**: `user@test.com` / `user123`

---

## Decisiones de diseño y consideraciones técnicas

- **JWT como mecanismo de autenticación**  
  Simplicidad y compatibilidad con SPA + Socket.IO. El token se envía en `Authorization` y también en el handshake del socket.

- **Separación clara de responsabilidades**  
  - Modelos Mongoose encapsulan validaciones y hooks.  
  - Rutas por dominio funcional (`auth`, `products`, `users`, `chat`, `admin`).  
  - Middlewares horizontales para autenticación, errores y rate limiting.  
  - Utilidades para validación/sanitización y logging.

- **Chat con Socket.IO y conversación determinística**  
  `conversationId` se construye con los IDs ordenados (`user_admin`) para evitar duplicados.  
  Se mantiene un mapa en memoria para asignar admins a usuarios (re-asignación automática si un admin se desconecta).  
  Indicadores de escritura con TTL para evitar estados “atascados”.

- **Validación y sanitización**  
  - En backend: `validators.js` valida producto, URL y sanea `name/description`.  
  - En frontend: `escapeHtml()` en renderizado para reducir riesgos XSS.  
  - Límite de tamaño y tipos de archivo para imágenes; directorio de `uploads` local.

- **Rendimiento de consultas de chat**  
  Índices en `Message` (`conversationId`, `timestamp`) y agregaciones (`$group`, `$lookup`) para listar conversaciones del admin sin N+1 queries.  
  En la carga del historial se limita el número de mensajes.

- **Seguridad en producción**  
  `server.js` fuerza a configurar `JWT_SECRET` cuando `NODE_ENV !== 'development'`.  
  `Helmet` endurece cabeceras; CSP desactivada por compatibilidad con desarrollo y recursos embebidos.  
  Rate limiting diferenciado para rutas sensibles (`/auth`) y API general.

- **Subida de imágenes simple y predecible**  
  `express-fileupload` con `tempFileDir`, validación de mimetype y tamaño, y nombres únicos por timestamp.  
  Se acepta mantener la imagen como ruta relativa (`/uploads/...`) o URL absoluta.

- **Frontend sin framework**  
  Se ha priorizado JavaScript vanilla para reducir dependencias y mantener un bundle mínimo.  
  La UI implementa modales accesibles, paginación y feedback de estado.

- **IDs fijos en *seed***  
  Facilitan pruebas reproducibles (mensajes y relaciones `createdBy/recipient`). Las contraseñas en el *seed* se almacenan en claro pero se hashean automáticamente por el hook del modelo `User`.

- **Límites y simplificaciones conscientes**  
  - Rate limiter en memoria (suficiente para desarrollo/pruebas; para producción, Redis o similar).  
  - No se eliminan archivos físicos de imagen al borrar productos (puede añadirse una GC periódica).  
  - Las asignaciones de admins a usuarios se almacenan en memoria; en escenarios multi-nodo requerirían un almacén compartido.

---

## Dependencias y por qué se usan

- **express**: framework HTTP minimalista para la API y servido de estáticos.  
- **http**: servidor base requerido por Socket.IO.
- **socket.io**: comunicación bidireccional en tiempo real (chat, typing, presencia).  
- **mongoose**: ODM para MongoDB; esquemas, validaciones, hooks y agregaciones.  
- **cors**: habilita orígenes cruzados cuando sea necesario.  
- **helmet**: cabeceras de seguridad (X-Content-Type-Options, HSTS, etc.).  
- **express-fileupload**: manejo sencillo de `multipart/form-data` para subir imágenes, con límites de tamaño y mimetype.  
- **jsonwebtoken (jwt)**: emisión y verificación de tokens de acceso.  
- **bcryptjs**: hash y verificación de contraseñas en `User`.  
- **dotenv**: carga de variables de entorno desde `.env`.  
- **path / fs**: manipulación de rutas de ficheros y persistencia de imágenes.

**Código propio**:
- `middleware/rateLimiter.js`: limitador simple en memoria (por IP).  
- `middleware/authenticateJWT.js`: autenticación y `requireAdmin`.  
- `middleware/errorHandler.js`: 404 y manejador global.  
- `utils/validators.js`: validación y sanitización; `utils/logger.js`: logging coloreado.

---

## Seguridad, validación y límites

- **Autenticación**: JWT con expiración (`jwtExpiresIn = 24h`), validado en cada ruta protegida y en el handshake de Socket.IO.  
- **Autorización**: `requireAdmin` para acciones sensibles (CRUD de productos, endpoints de administración y limpieza de mensajes).  
- **Rate limiting**:  
  - General: 300 req/5 min.  
  - Auth: 5 intentos de login/5 min.  
  - API: 250 req/5 min.  
- **Subida de archivos**: solo `jpeg/png/gif/webp` y ≤ 5 MB.  
- **XSS**: sanitización de entrada en backend y `escapeHtml` en render de frontend.  
- **CSP**: desactivada en `helmet` para facilitar desarrollo; ajustar en producción si se desea una política estricta.

---
