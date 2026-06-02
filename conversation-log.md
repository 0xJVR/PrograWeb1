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

## Schemas Pydantic y errores de API

**Prompt:** Añade schemas Pydantic v2 para autenticación, usuarios y productos.
Valida campos obligatorios, tipos, longitudes, formatos y rangos. Implementa un
manejo global de excepciones con respuestas limpias y consistentes para
recursos no encontrados, autenticación, autorización, validación, lógica de
negocio y errores de base de datos.

**Resultado:** Se crearon los schemas de entrada y salida, un schema común para
mensajes y las excepciones de la aplicación con sus handlers HTTP.

**Decisión:** Acepté separar los schemas de los modelos ORM para no mezclar
persistencia con contrato de API. Mantuve errores estructurados y sin trazas
internas para que el frontend reciba respuestas predecibles.

## Autenticación JWT y roles

**Prompt:** Implementa autenticación JWT con expiración y hash seguro de
contraseñas. Permite el login con el contrato esperado por el frontend, valida
el token en las rutas privadas y distingue los roles `user` y `admin`. Devuelve
`401 Unauthorized` para credenciales o tokens inválidos y `403 Forbidden`
cuando falten permisos.

**Resultado:** Se añadieron las utilidades de seguridad, el servicio de
autenticación, los serializers, las dependencias para obtener el usuario actual
y exigir roles, y el router de login.

**Decisión:** Acepté centralizar la seguridad en `core` y la lógica de login en
un service. Mantuve las comprobaciones de autenticación y autorización como
dependencias reutilizables para que las rutas no dupliquen lógica.

## CRUD de productos

**Prompt:** Implementa el CRUD completo de productos respetando las URLs,
métodos HTTP, campos JSON y estructuras de respuesta consumidas por el
frontend. Los routers solo deben gestionar HTTP y delegar la lógica de negocio
en services. Reutiliza la autenticación y aplica permisos cuando corresponda.

**Resultado:** Se añadieron el router de productos, los parsers de peticiones y
el servicio con las operaciones de listado, consulta, creación, edición y
eliminación de productos.

**Decisión:** Acepté mantener el parsing compatible con el frontend existente y
separarlo del servicio. Conservé la lógica de negocio fuera del router para
respetar la arquitectura definida al inicio.

## APIs de usuarios y administración

**Prompt:** Implementa el CRUD completo de usuarios y las operaciones de
administración. Mantén la compatibilidad con el frontend y aplica autorización
por rol: un usuario autenticado debe acceder únicamente a las operaciones
permitidas y las acciones administrativas deben exigir `admin`.

**Resultado:** Se añadieron los routers de usuarios y administración y el
servicio de usuarios con su lógica de consulta, creación, actualización y
borrado.

**Decisión:** Acepté separar las rutas administrativas de las rutas de usuario
para que los permisos sean visibles y fáciles de revisar. Reutilicé las
dependencias de rol existentes en lugar de introducir comprobaciones manuales
en cada endpoint.

## Arranque de la aplicación y datos iniciales

**Prompt:** Conecta todos los módulos en la aplicación FastAPI. Registra los
routers, configura los handlers globales de excepciones, inicializa la base de
datos e incluye los datos mínimos de prueba necesarios para ejecutar el
proyecto y comprobar el login y los roles.

**Resultado:** Se añadió `main.py` con la configuración de la aplicación y el
registro de rutas y handlers. También se creó la inicialización de la base de
datos con datos semilla.

**Decisión:** Acepté una inicialización sencilla y reproducible para facilitar
la evaluación local. Mantuve `main.py` limitado al ensamblado de componentes,
sin trasladar allí lógica de negocio.

## Documentación final del backend

**Prompt:** Actualiza el README principal con la entrega final. Incluye
instrucciones de instalación y ejecución, inicialización de la base de datos,
credenciales de prueba, endpoints principales, permisos por rol y una
explicación breve de la arquitectura usada.

**Resultado:** Se sustituyó la documentación anterior por un README centrado en
el backend FastAPI implementado, con instrucciones de puesta en marcha y
referencia de uso.

**Decisión:** Acepté cerrar la migración con documentación orientada a ejecutar
y revisar la práctica. Conservé el detalle necesario para entender la
arquitectura y probar los endpoints sin añadir cambios funcionales al código.

## Configuración local mediante archivo .env

**Prompt:** Simplifica la configuración local del backend FastAPI sustituyendo
la necesidad de exportar variables manualmente en cada sesión por la carga
automática de un archivo `.env`. Mantén la posibilidad de sobrescribir valores
desde el entorno del sistema para facilitar futuros despliegues, proporciona un
archivo de ejemplo sin secretos reales y actualiza las instrucciones de puesta
en marcha.

**Resultado:** Se añadió `python-dotenv`, se configuró la carga explícita del
archivo `.env` ubicado en la raíz del proyecto y se ampliaron las variables de
ejemplo necesarias para el backend FastAPI. Se eliminaron del ejemplo las
variables residuales del servidor Express y MongoDB anterior. Los README
indican ahora cómo crear el archivo local desde la raíz del repositorio a
partir de `.env.example`.

**Decisión:** Acepté centralizar la configuración local en `.env` para evitar
exports repetitivos. Mantuve el archivo real fuera del repositorio mediante
`.gitignore`, retiré ajustes que FastAPI no consume y conservé la prioridad de
las variables del sistema para no limitar la configuración de despliegue.
