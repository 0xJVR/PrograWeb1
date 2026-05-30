# Portal de Productos - Programación Web 1

[Repositorio del proyecto](https://github.com/0xJVR/PrograWeb1)

Portal de productos con frontend SPA en Svelte 5 y backend REST en Python.
El backend anterior basado en Express y MongoDB ha sido sustituido por una API
FastAPI con persistencia SQLite, SQLAlchemy 2.0, validación Pydantic v2,
autenticación JWT y control de acceso por roles.

La migración mantiene el contrato HTTP utilizado por el frontend: las mismas
rutas principales, los mismos métodos y estructuras JSON compatibles con los
componentes Svelte existentes.

## Memoria del uso de Inteligencia Artificial

El proceso de apoyo mediante Inteligencia Artificial utilizado durante el
desarrollo se encuentra documentado en la
[memoria de conversación](./conversation-log.md).

---

## Contenido

- [Memoria del uso de Inteligencia Artificial](#memoria-del-uso-de-inteligencia-artificial)
- [Requisitos y puesta en marcha](#requisitos-y-puesta-en-marcha)
- [Configuración](#configuración)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Arquitectura del backend](#arquitectura-del-backend)
- [API REST](#api-rest)
- [Credenciales de ejemplo](#credenciales-de-ejemplo)
- [Compatibilidad con el frontend Svelte](#compatibilidad-con-el-frontend-svelte)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Dependencias y por qué se usan](#dependencias-y-por-qué-se-usan)
- [Seguridad, validación y límites](#seguridad-validación-y-límites)
- [Notas de desarrollo](#notas-de-desarrollo)

---

## Requisitos y puesta en marcha

### Requisitos previos

- Python 3.10 o superior.
- Node.js 18 o superior para ejecutar el frontend.
- Git con soporte para submódulos.

No es necesario instalar un servidor de base de datos externo. SQLite almacena
los datos localmente en `backend/app.db`.

### Obtener el frontend

El frontend Svelte se mantiene como submódulo del repositorio:

```bash
git submodule update --init --recursive
```

### Inicio rápido

Desde la raíz del repositorio:

```bash
# 1. Crear la configuración local
cp .env.example .env

# 2. Preparar el backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Arrancar la API
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

En otra terminal, desde la raíz del repositorio:

```bash
cd frontend
npm install
npm run dev
```

Servicios disponibles durante el desarrollo:

| Servicio | URL |
| --- | --- |
| Backend FastAPI | `http://localhost:3000` |
| Documentación Swagger | `http://localhost:3000/docs` |
| Documentación ReDoc | `http://localhost:3000/redoc` |
| Frontend Svelte | `http://localhost:5173` |

La base de datos y los datos mínimos de prueba se crean automáticamente al
arrancar FastAPI por primera vez.

---

## Configuración

El backend carga automáticamente el archivo `.env` situado en la raíz del
proyecto mediante `python-dotenv`. El archivo real está ignorado por Git para
evitar versionar secretos.

Crea la configuración local a partir del ejemplo:

```bash
cp .env.example .env
```

Variables disponibles:

```dotenv
JWT_SECRET=tu_clave_secreta_super_segura_cambiala
DATABASE_URL=sqlite:///./app.db
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

| Variable | Descripción |
| --- | --- |
| `JWT_SECRET` | Clave utilizada para firmar y verificar tokens JWT. Debe sustituirse por un valor largo y seguro. |
| `DATABASE_URL` | URL de conexión SQLAlchemy. El valor de ejemplo crea `backend/app.db` al ejecutar Uvicorn desde `backend/`. |
| `JWT_ALGORITHM` | Algoritmo de firma JWT. Por defecto: `HS256`. |
| `JWT_EXPIRE_MINUTES` | Duración del token de acceso en minutos. Por defecto: `1440` (24 horas). |
| `UPLOAD_DIR` | Opcional. Directorio de imágenes subidas. Por defecto: `backend/app/static/uploads`. |

Las variables definidas por el sistema tienen prioridad sobre los valores del
archivo `.env`, lo que permite configurar despliegues sin modificar archivos.

---

## Estructura del proyecto

```text
.
├── .env.example                  # Plantilla de configuración local
├── README.md                     # Documentación principal
├── backend/
│   ├── requirements.txt          # Dependencias Python
│   └── app/
│       ├── main.py               # Ensamblado y arranque de FastAPI
│       ├── core/                 # Configuración, JWT, hash y excepciones
│       ├── database/             # Engine, sesiones e inicialización SQLite
│       ├── dependencies/         # Usuario autenticado y rol admin
│       ├── models/               # Entidades ORM SQLAlchemy
│       ├── repositories/         # Consultas y persistencia
│       ├── routers/              # Endpoints HTTP
│       ├── schemas/              # Validación y respuestas Pydantic
│       └── services/             # Lógica de negocio
├── frontend/                     # Submódulo con la SPA Svelte 5
├── src/                          # Backend Express anterior, conservado como referencia
├── package.json                  # Dependencias del backend Express anterior
└── start.sh                      # Script del backend Express anterior
```

El backend vigente se ejecuta desde `backend/` con Uvicorn. Los archivos
Node.js de la raíz pertenecen a la implementación previa y no son necesarios
para arrancar la API FastAPI.

### Frontend Svelte

El submódulo `frontend/` contiene una SPA construida con Svelte 5 y Vite:

- Stores reactivos para autenticación, productos, usuarios y notificaciones.
- Cliente HTTP centralizado que añade `Authorization: Bearer <token>`.
- Formularios de login, registro, perfil y CRUD de productos.
- Protección de rutas y operaciones administrativas por rol.
- Gestión de sesión mediante `localStorage`.
- Subida de imágenes mediante `FormData`.

---

## Arquitectura del backend

El backend sigue una arquitectura por capas para evitar mezclar HTTP, lógica
de negocio y persistencia.

### `app/main.py`

Punto de entrada de FastAPI:

- Crea las tablas SQLite al iniciar la aplicación.
- Inserta usuarios y productos de ejemplo si la base de datos está vacía.
- Registra routers y manejadores globales de errores.
- Configura CORS.
- Publica las imágenes locales bajo `/uploads`.

### `app/core/`

- **`config.py`**: carga `.env` y centraliza ajustes de base de datos, JWT y
  subida de imágenes.
- **`security.py`**: hash y verificación de contraseñas con bcrypt; creación y
  validación de tokens JWT con expiración.
- **`exceptions.py`**: excepciones de aplicación y respuestas JSON coherentes
  para errores de validación, autenticación, autorización, negocio y base de
  datos.

### `app/database/`

- **`base.py`**: base declarativa SQLAlchemy.
- **`session.py`**: engine y sesión de base de datos por petición.
- **`init_db.py`**: creación de tablas e inserción inicial de datos de prueba.

### `app/models/`

- **`User`**: nombre, email único, hash de contraseña, rol (`user` o `admin`),
  color de perfil y fechas de creación/actualización.
- **`Product`**: nombre, precio, descripción, imagen, estado activo, creador y
  fechas de creación/actualización.

### `app/repositories/`

Encapsulan el acceso a SQLAlchemy:

- Búsqueda por ID y email.
- Listado, paginación y filtros de usuarios.
- Contadores para estadísticas administrativas.
- CRUD de productos.

Los routers no consultan directamente la base de datos.

### `app/services/`

Contienen la lógica de negocio:

- Registro, login y verificación de sesión.
- Gestión del perfil y contraseña.
- Gestión administrativa de usuarios.
- CRUD de productos y almacenamiento de imágenes.
- Serialización compatible con el contrato esperado por Svelte.

### `app/routers/`

Gestionan exclusivamente HTTP:

- Parámetros de ruta y query string.
- Dependencias de autenticación y roles.
- Parsing de JSON y `multipart/form-data`.
- Códigos HTTP y modelos de respuesta.
- Delegación de operaciones a services.

---

## API REST

> Todas las rutas protegidas requieren el encabezado
> `Authorization: Bearer <token>`.

### Raíz

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | Público | Comprueba que la API está disponible. |

### Autenticación

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Público | Registra un usuario con rol `user` y devuelve un JWT. |
| `POST` | `/api/auth/login` | Público | Valida email y contraseña; devuelve JWT y usuario. |
| `GET` | `/api/auth/verify` | Autenticado | Valida el token y devuelve el usuario actual. |

### Productos

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/products` | Público | Lista productos. |
| `GET` | `/api/products/{id}` | Público | Devuelve el detalle de un producto. |
| `POST` | `/api/products` | `admin` | Crea un producto. Acepta JSON o `multipart/form-data`. |
| `PUT` | `/api/products/{id}` | `admin` | Actualiza un producto. Acepta JSON o `multipart/form-data`. |
| `POST` | `/api/products/{id}/image` | `admin` | Sustituye la imagen mediante `multipart/form-data`. |
| `DELETE` | `/api/products/{id}` | `admin` | Elimina un producto. |

### Perfil de usuario

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/users/profile` | Autenticado | Devuelve el perfil actual. |
| `PUT` | `/api/users/profile` | Autenticado | Actualiza el nombre del perfil. |
| `PUT` | `/api/users/profile-color` | Autenticado | Cambia el gradiente del avatar. |
| `POST` | `/api/users/change-password` | Autenticado | Cambia la contraseña tras verificar la actual. |
| `DELETE` | `/api/users/account` | Autenticado | Elimina la cuenta tras verificar la contraseña. |
| `GET` | `/api/users/gradients` | Público | Lista los gradientes de perfil disponibles. |

### Administración

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stats` | `admin` | Devuelve estadísticas de usuarios y productos. |
| `GET` | `/api/admin/users` | `admin` | Lista usuarios con paginación, búsqueda y filtro de rol. |
| `POST` | `/api/admin/users` | `admin` | Crea un usuario con rol configurable. |
| `PUT` | `/api/admin/users/{id}` | `admin` | Actualiza nombre o rol de un usuario. |
| `DELETE` | `/api/admin/users/{id}` | `admin` | Elimina un usuario. |
| `GET` | `/api/users` | `admin` | Ruta heredada compatible para listar usuarios. |

### Formato de errores

Las respuestas de error mantienen una estructura uniforme:

```json
{
  "success": false,
  "message": "Producto no encontrado",
  "error": "Producto no encontrado",
  "status_code": 404
}
```

Los errores de validación incluyen además `details` y `errors`.

---

## Credenciales de ejemplo

Cuando la base de datos está vacía, el arranque crea automáticamente:

| Rol | Email | Contraseña |
| --- | --- | --- |
| Admin | `admin@test.com` | `admin123` |
| Usuario | `user@test.com` | `user123` |

También se insertan tres productos de ejemplo para facilitar la comprobación
del listado y del panel administrativo.

---

## Compatibilidad con el frontend Svelte

La API mantiene las estructuras que espera el frontend existente:

- Login y registro devuelven `{ success, message, token, user }`.
- El token se recibe mediante `Authorization: Bearer <token>`.
- Los listados de productos devuelven `{ success, products }`.
- El detalle devuelve `{ success, product }`.
- El listado administrativo devuelve `{ success, pagination, users }`.
- Usuarios y productos exponen `id` y `_id` como strings para conservar
  compatibilidad con vistas diseñadas originalmente para MongoDB.
- Las propiedades serializadas mantienen nombres usados por el frontend, como
  `profileColor`, `createdAt`, `updatedAt` y `createdBy`.
- Crear y editar productos admite JSON o `multipart/form-data`, lo que permite
  conservar la subida de imágenes desde `FormData`.

---

## Decisiones de diseño

### FastAPI como framework HTTP

FastAPI proporciona tipado, validación integrada, dependencias reutilizables y
documentación OpenAPI automática. Los routers quedan limitados a aspectos HTTP
y delegan la lógica de negocio en services.

### SQLite con SQLAlchemy 2.0

SQLite evita depender de un servidor externo durante la práctica. SQLAlchemy
centraliza la persistencia y permite sustituir la URL de conexión en `.env` si
el proyecto requiere otra base de datos en el futuro.

### Sesión por petición

Cada request recibe una sesión SQLAlchemy mediante `Depends(get_db)`. La sesión
se cierra al finalizar la petición y las consultas se concentran en
repositories.

### JWT y roles

Los tokens incluyen ID, email, rol y expiración. Las rutas privadas reutilizan
una dependencia que obtiene el usuario autenticado desde la base de datos. Las
operaciones administrativas reutilizan `require_admin`.

### Compatibilidad durante la migración

La API serializa IDs relacionales de SQLite como strings y conserva también la
clave `_id`. Esta adaptación permite migrar la persistencia sin exigir cambios
innecesarios en el frontend creado para el backend anterior.

### Subida de imágenes local

Las imágenes se guardan en disco con nombres únicos. El backend valida tipo
MIME, extensión y tamaño máximo antes de escribir el archivo y publica el
directorio mediante `/uploads`.

### Inicialización automática

Las tablas y los datos mínimos de prueba se crean al arrancar la aplicación si
la base de datos está vacía. Esto permite ejecutar y evaluar el proyecto sin un
paso manual de seed.

---

## Dependencias y por qué se usan

| Dependencia | Uso |
| --- | --- |
| `fastapi` | Framework HTTP, routing, dependencias y OpenAPI. |
| `uvicorn[standard]` | Servidor ASGI para ejecutar FastAPI. |
| `sqlalchemy` | ORM y acceso a SQLite mediante patrones SQLAlchemy 2.0. |
| `pydantic[email]` | Validación de payloads, respuestas y emails. |
| `passlib[bcrypt]` | API de hash y verificación de contraseñas. |
| `bcrypt` | Implementación del algoritmo de hash de contraseñas. |
| `PyJWT` | Creación y validación de tokens JWT. |
| `python-multipart` | Lectura de formularios y subida de imágenes. |
| `python-dotenv` | Carga automática de configuración desde `.env`. |

---

## Seguridad, validación y límites

- Las contraseñas nunca se almacenan en texto plano; se guardan como hash
  bcrypt.
- Los JWT tienen expiración configurable y se validan antes de acceder a rutas
  privadas.
- Las acciones administrativas requieren un usuario autenticado con rol
  `admin`.
- Un administrador no puede degradar su propio rol ni eliminar su propia
  cuenta desde el panel administrativo.
- Pydantic valida emails, longitudes, tipos, precios no negativos y rangos de
  color de perfil.
- Las imágenes admitidas son `jpeg`, `png`, `gif` y `webp`, con un máximo de
  5 MB.
- Las excepciones globales no exponen trazas internas al frontend.
- CORS está abierto durante el desarrollo. En producción debe restringirse a
  los orígenes autorizados.
- La clave de ejemplo `JWT_SECRET` debe sustituirse antes de desplegar.

---

## Notas de desarrollo

### Reiniciar la base de datos

Detén el backend, elimina el archivo SQLite y vuelve a arrancar Uvicorn:

```bash
rm backend/app.db
```

La aplicación recreará las tablas, usuarios y productos de ejemplo.

### Directorio de imágenes

Por defecto, las imágenes se escriben en:

```text
backend/app/static/uploads/
```

El directorio se crea automáticamente. Puede cambiarse mediante `UPLOAD_DIR`.

### Alcance de la migración

El backend FastAPI implementa el contrato REST consumido por el submódulo
Svelte actual: autenticación, productos, perfil y administración de usuarios.
Los archivos del backend Express anterior permanecen en la raíz como referencia
histórica, pero no forman parte del arranque FastAPI.
