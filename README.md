# Backend FastAPI

Backend Python para el portal de productos. Sustituye el servidor Express manteniendo las rutas REST que consume el frontend Svelte.

## Configuración

Desde la raíz del repositorio:

```bash
cp .env.example .env
```

Edita `.env` antes de arrancar el backend. FastAPI carga automáticamente ese
archivo desde la raíz del proyecto. Como mínimo, sustituye `JWT_SECRET` por una
clave larga y segura. El archivo `.env` está ignorado por Git para evitar
versionar secretos.

## Instalación

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ejecución

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

La base de datos SQLite se crea automáticamente al arrancar. Si no hay datos, se insertan credenciales de prueba:

- Admin: `admin@test.com` / `admin123`
- Usuario: `user@test.com` / `user123`

Para reinicializar en desarrollo, detén el servidor y elimina `backend/app.db`.

## Arquitectura

- `routers/`: capa HTTP, rutas, dependencias, parámetros y códigos de respuesta.
- `services/`: lógica de negocio, autenticación, permisos de dominio y orquestación.
- `repositories/`: acceso a datos con SQLAlchemy 2.0.
- `models/`: entidades ORM.
- `schemas/`: validación y serialización con Pydantic v2.
- `dependencies/`: usuario actual y roles.
- `core/`: configuración, seguridad JWT/hash y excepciones globales.

## Endpoints principales

Todas las rutas privadas leen el token como `Authorization: Bearer <token>`.

| Método | Ruta | Rol |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Público |
| `POST` | `/api/auth/login` | Público |
| `GET` | `/api/auth/verify` | Autenticado |
| `GET` | `/api/products` | Público |
| `GET` | `/api/products/{id}` | Público |
| `POST` | `/api/products` | `admin` |
| `PUT` | `/api/products/{id}` | `admin` |
| `POST` | `/api/products/{id}/image` | `admin` |
| `DELETE` | `/api/products/{id}` | `admin` |
| `GET` | `/api/users/profile` | Autenticado |
| `PUT` | `/api/users/profile` | Autenticado |
| `POST` | `/api/users/change-password` | Autenticado |
| `PUT` | `/api/users/profile-color` | Autenticado |
| `GET` | `/api/users/gradients` | Público |
| `DELETE` | `/api/users/account` | Autenticado |
| `GET` | `/api/admin/users` | `admin` |
| `POST` | `/api/admin/users` | `admin` |
| `PUT` | `/api/admin/users/{id}` | `admin` |
| `DELETE` | `/api/admin/users/{id}` | `admin` |
| `GET` | `/api/admin/stats` | `admin` |

## Compatibilidad Svelte

Las respuestas mantienen el contrato del frontend:

- Login y registro devuelven `{ success, message, token, user }`.
- El token se valida desde `Authorization: Bearer`.
- Productos se listan como `{ success, products }`.
- Un producto se devuelve como `{ success, product }`.
- Usuarios admin se listan como `{ success, pagination, users }`.
- Los recursos exponen `id` y `_id` como string para compatibilidad con vistas existentes.

