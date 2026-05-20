# Conversation log

Tras leer los contenidos del documento de la práctica, he decidido usar FastAPI
como framework backend en Python, ya que ofrece buen rendimiento, soporte
asíncrono, validación integrada con Pydantic y generación automática de
documentación OpenAPI. Para la base de datos usaré SQLite con SQLAlchemy al ser
una opción simple, ligera y suficiente para el alcance de la práctica. En el
futuro podría reconsiderarse el uso de MongoDB para mantener mayor consistencia
con el proyecto original, si el modelo de datos o los requisitos lo justifican.

Antes de iniciar la implementación preparé un prompt general para delimitar el
alcance, las restricciones técnicas y el orden de trabajo. La primera respuesta
del agente no se incorporó al proyecto porque contenía decisiones incorrectas y
patrones obsoletos. A partir de ese error añadí Context7 MCP como fuente de
contexto documental para consultar documentación actualizada de FastAPI,
Pydantic v2, SQLAlchemy 2.0 y autenticación JWT. Las peticiones siguientes
desarrollan el prompt corregido por bloques.

## Primera iteración descartada: propuesta sin contraste documental

**Prompt:** Genera una primera versión del backend en FastAPI para sustituir el
servidor existente. Incluye persistencia, autenticación JWT y endpoints para
usuarios y productos, intentando mantener la compatibilidad con el frontend.

**Resultado:** La primera propuesta del agente concentraba consultas a base de
datos y lógica de negocio directamente dentro de los routers. También proponía
guardar la contraseña recibida por el API sin aplicar hash, generaba tokens JWT
sin claim de expiración e importaba `BaseSettings` desde `pydantic`, aunque en
Pydantic v2 esa configuración se trasladó al paquete `pydantic-settings`.
Además asumía una respuesta de login convencional con `access_token` sin
comprobar que el frontend existente esperaba `{ success, message, token, user
}`.

**Decisión:** Rechacé esta versión completa. El almacenamiento de contraseñas
en texto plano y los JWT sin expiración eran fallos de seguridad. La lógica en
routers incumplía la separación de responsabilidades y dificultaba las pruebas.
La importación obsoleta no era compatible con Pydantic v2 y el contrato de login
inventado habría roto el frontend. Para corregirlo decidí consultar Context7 MCP
y dividir la implementación en bloques revisables antes de aceptar código.

## Segunda iteración: estructura base de FastAPI

**Prompt:** Actúa como desarrollador backend senior especializado en FastAPI,
arquitectura limpia, JWT, SQLAlchemy 2.0 y Pydantic v2. Sustituye el backend
existente por uno en Python compatible con el frontend Svelte 5. Organiza el
código en capas claras (`core`, `database`, `models`, `schemas`,
`repositories`, `services`, `routers` y `dependencies`). Antes de generar
código, consulta mediante Context7 MCP los patrones vigentes para `APIRouter`,
`Depends`, Pydantic v2 y SQLAlchemy 2.0. Prepara únicamente la configuración
inicial, las dependencias y las instrucciones básicas del backend.

**Resultado:** Se generó el scaffold modular de `backend/app`, la configuración
base, los módulos vacíos de cada capa, `requirements.txt` y un README inicial
del backend.

**Decisión:** Acepté la separación por capas y la lista inicial de
dependencias. Dejé la persistencia, los schemas, la autenticación y las rutas
para peticiones posteriores, de forma que cada bloque pudiera contrastarse con
la documentación y revisarse por separado.

## Persistencia con SQLite y SQLAlchemy

**Prompt:** Implementa persistencia real con SQLite y SQLAlchemy 2.0. Crea una
sesión de base de datos por petición, modelos ORM para usuarios y productos y
repositorios que centralicen todas las consultas. No uses arrays en memoria,
archivos JSON ni persistencia simulada.

**Resultado:** Se añadieron la base declarativa, la configuración de sesión,
los modelos `User` y `Product` y sus repositorios con las operaciones de acceso
a datos necesarias para los siguientes servicios.

**Decisión:** Acepté SQLite porque es suficiente para la práctica y mantiene la
puesta en marcha sencilla. Conservé el acceso a datos dentro de repositorios
para evitar consultas directas desde routers o services.
