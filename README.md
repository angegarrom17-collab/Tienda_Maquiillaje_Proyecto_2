# Tienda de Maquillaje - Proyecto 2: Frontend React para la API REST

Universidad de Costa Rica, Sede Regional del Pacífico
Bachillerato en Informática Empresarial
Desarrollo de Software IV - Proyecto 02

Este proyecto es una aplicación web de una sola página (SPA) hecha con React, Vite y Bootstrap 5. La aplicación consume la API de Django REST Framework que construimos en el Proyecto 1, así que se mantienen los cinco módulos de negocio (Clientes, Productos, Cursos, Proveedores y Facturas), la base de datos MySQL, las reglas de negocio y los permisos del backend.

El repositorio está organizado así:

- `clientes/`, `productos/`, `cursos/`, `proveedores/` y `facturas/`: son las apps de Django, una por cada módulo de negocio.
- `cuentas/`: app que agregamos en el Proyecto 2 para obtener el usuario actual, cerrar sesión y crear los usuarios de prueba.
- `tienda_moda/`: configuración del proyecto Django (`settings.py` y `urls.py`).
- `frontend/`: la aplicación React.
- `manage.py`: archivo para ejecutar los comandos de Django.
- `requirements.txt`: librerías de Python que necesita el backend.
- `.env.example`: plantilla de las variables del backend, sin secretos.
- `README.md`: este documento.

Contenido:

1. Requisitos
2. Base de datos MySQL
3. Archivos de configuración: `.env` y `.env.example`
4. Instalación y ejecución del backend (Django)
5. Configuración de CORS
6. Instalación y ejecución del frontend (React)
7. Usuarios de prueba, roles y permisos
8. Modelo de datos y datos de ejemplo
9. Reglas de negocio
10. Pantallas y endpoints
11. Respuestas de la API
12. Autenticación y manejo del token
13. Pruebas automatizadas
14. Limitaciones conocidas
15. Ampliaciones del backend realizadas en el Proyecto 2

---

## 1. Requisitos

Para ejecutar el proyecto se necesita tener instalado lo siguiente:

- **Python 3.12 o superior**, para el backend en Django.
- **MySQL Server 8.x**, que es la base de datos del proyecto.
- **MySQL Workbench 8.x** (opcional), para ejecutar el script de creación de la base de datos.
- **Node.js 20 o superior**, que ya incluye npm, para el frontend en React.
- Un **navegador** actualizado (Chrome, Edge o Firefox) para usar la aplicación.

El backend usa estas librerías, que están en `requirements.txt`:

- `Django==5.2.18`: el framework del backend.
- `djangorestframework==3.18.3`: para la API REST, los serializers y la autenticación por token.
- `mysqlclient==2.3.0` y `PyMySQL==1.2.3`: para la conexión con MySQL.
- `python-dotenv==1.2.4`: para leer el archivo `.env`.
- `django-cors-headers>=4.4`: permite que React (puerto 5173) consuma la API (puerto 8000).

El frontend usa las librerías que están en `frontend/package.json`: `react`, `react-dom`, `react-router-dom`, `axios`, `bootstrap`, `bootstrap-icons` y `vite`.

---

## 2. Base de datos MySQL

Antes de instalar el backend hay que crear la base de datos y el usuario de MySQL. Para esto se ejecuta el siguiente script como **root**, por ejemplo desde MySQL Workbench:

```sql
-------------------------------- CREACION -------------------------------------
CREATE DATABASE tienda_belleza_db
CHARACTER SET utf8mb4
collate utf8mb4_unicode_ci;

show databases;

CREATE USER 'tienda_belleza_user'@'localhost'
identified BY 'TU_CONTRASENA!';

GRANT ALL privileges
ON tienda_belleza_db.*
To 'tienda_belleza_user'@'localhost';
Flush Privileges;

use tienda_belleza_db;
SHOW TABLES;
```

Para que Django pueda correr las **pruebas automatizadas** también hay que darle permiso sobre la base de pruebas, porque `python manage.py test` crea y luego borra la base `test_tienda_belleza_db`:

```sql
GRANT ALL PRIVILEGES ON `test_tienda_belleza_db`.* TO 'tienda_belleza_user'@'localhost';
FLUSH PRIVILEGES;
```

Con estas consultas se puede verificar que todo quedó bien. Se usan **después** de ejecutar `migrate` y `crear_datos_demo` (sección 4), porque antes de eso las tablas todavía no existen:

```sql
-- Usuarios del sistema (deben aparecer admin_demo, operador_demo, consulta_demo y externo_demo)
SELECT id, username, is_active, is_staff FROM tienda_belleza_db.auth_user;

-- Tokens activos: se crea uno al iniciar sesión y se elimina al cerrar sesión
SELECT * FROM tienda_belleza_db.authtoken_token;

-- Clientes registrados
SELECT * FROM tienda_belleza_db.clientes_cliente;
```

Es importante que el nombre de la base, el usuario y la contraseña que se usan en el script sean los mismos que se ponen en `DB_NAME`, `DB_USER` y `DB_PASSWORD` del archivo `.env` (sección 3).

---

## 3. Archivos de configuración: `.env` y `.env.example`

El proyecto usa dos tipos de archivo de configuración, y es importante no confundirlos:

- **`.env.example`** es una **plantilla**. Tiene los nombres de todas las variables con valores de ejemplo (por ejemplo `cambie_esta_clave`), **no tiene ningún secreto** y **sí se sube al repositorio**, para que cualquier persona sepa qué variables debe configurar.
- **`.env`** es el archivo **real** de cada computadora. Se crea copiando `.env.example` y se llena con los datos verdaderos (la contraseña de MySQL y la clave secreta). **Nunca se sube al repositorio**, porque está incluido en `.gitignore`.

Django solo lee el archivo `.env`. El archivo `.env.example` no lo usa el programa, solo sirve de guía.

Hay un par de archivos para el backend y otro par para el frontend:

- `.env.example` y `.env` en la **raíz** del proyecto (al lado de `manage.py`), para Django.
- `frontend/.env.example` y `frontend/.env`, para React.

Así se ve el `.env.example` del backend (valores de ejemplo):
```
DB_NAME=tienda_belleza_db
DB_USER=tienda_belleza_user
DB_PASSWORD=cambie_esta_clave
DB_HOST=localhost
DB_PORT=3306
DJANGO_SECRET_KEY=coloque_aqui_su_clave
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Y así debe quedar el `.env` del backend después de llenarlo (valores reales de su computadora):
```
DB_NAME=tienda_belleza_db
DB_USER=tienda_belleza_user
DB_PASSWORD=la contraseña del script de MySQL (sección 2)
DB_HOST=localhost
DB_PORT=3306
DJANGO_SECRET_KEY=la clave generada en el paso 5 de la sección 4
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Qué significa cada variable del backend:

- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` y `DB_PORT` (obligatorias): los datos de conexión a MySQL.
- `DJANGO_SECRET_KEY` (obligatoria): la clave secreta que Django usa para firmar sesiones y tokens CSRF. No está escrita en el código; si falta en el `.env`, Django no funciona.
- `CORS_ALLOWED_ORIGINS` (opcional): los orígenes del frontend que se permiten. Si no se pone, se usa `http://localhost:5173,http://127.0.0.1:5173`.

El frontend solo tiene una variable, igual en `frontend/.env.example` y en `frontend/.env`:

- `VITE_API_URL=http://127.0.0.1:8000/api`: la dirección base de la API. Todas las llamadas del frontend usan esta variable, por eso ninguna pantalla tiene la URL escrita directamente.

---

## 4. Instalación y ejecución del backend (Django)

Todos estos comandos se ejecutan en una terminal, dentro de la carpeta raíz del proyecto, que es donde está `manage.py`.

**Paso 1.** Crear el entorno virtual. Esto solo se hace la primera vez:
```bash
python -m venv .venv
```

**Paso 2.** Activar el entorno virtual. Esto se hace cada vez que se abre una terminal nueva:
```bash
.venv\Scripts\activate            # Windows
source .venv/bin/activate         # Linux / macOS
```
Al activarlo debe aparecer `(.venv)` al inicio de la línea.

**Paso 3.** Instalar las dependencias. También solo la primera vez:
```bash
pip install -r requirements.txt
```

**Paso 4.** Crear el archivo `.env` copiando la plantilla, y llenarlo con los datos reales como se explica en la sección 3:
```bash
copy .env.example .env            # Windows
cp .env.example .env              # Linux / macOS
```

**Paso 5.** Generar la clave secreta y pegarla después de `DJANGO_SECRET_KEY=` dentro del `.env`:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Paso 6.** Crear las tablas en MySQL:
```bash
python manage.py migrate
```

**Paso 7.** Crear los perfiles, los usuarios de prueba y los datos de ejemplo:
```bash
python manage.py crear_datos_demo --datos
```
Si se ejecuta sin `--datos`, solo crea los perfiles y los usuarios. Los datos de ejemplo únicamente se cargan si la base no tiene productos ni clientes, para no duplicar información.

**Paso 8.** (Opcional) Ejecutar las 44 pruebas automatizadas (sección 13):
```bash
python manage.py test
```

**Paso 9.** Iniciar el servidor:
```bash
python manage.py runserver
```
La API queda disponible en **http://127.0.0.1:8000/api/**. Esta terminal tiene que quedar abierta mientras se usa la aplicación.

---

## 5. Configuración de CORS

El frontend corre en `http://localhost:5173` y el backend en `http://127.0.0.1:8000`. Como son orígenes distintos, el navegador bloquea las llamadas si Django no las autoriza. Para permitirlas usamos **django-cors-headers** y lo configuramos así:

1. Agregamos `corsheaders` en `INSTALLED_APPS` de `tienda_moda/settings.py`.
2. Pusimos `corsheaders.middleware.CorsMiddleware` como el **primer** middleware de la lista, porque tiene que ir antes de `CommonMiddleware`.
3. Los orígenes autorizados se leen de la variable `CORS_ALLOWED_ORIGINS` del `.env`, separados por coma:
   ```
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```
   Si no se define esta variable, se usan esos dos valores por defecto.
4. El encabezado `Authorization: Token <token>` está permitido, así que el frontend puede enviar el token en cada solicitud.

Si el frontend se abre desde otro puerto o dirección, hay que agregarlo a `CORS_ALLOWED_ORIGINS` y reiniciar Django.

---

## 6. Instalación y ejecución del frontend (React)

Para el frontend se abre una **segunda terminal**, sin cerrar la de Django.

**Paso 1.** Entrar a la carpeta del frontend:
```bash
cd frontend
```

**Paso 2.** Instalar las dependencias. Solo la primera vez:
```bash
npm install
```

**Paso 3.** Crear el archivo `.env` del frontend copiando su plantilla. Solo la primera vez:
```bash
copy .env.example .env            # Windows
cp .env.example .env              # Linux / macOS
```

**Paso 4.** Iniciar la aplicación:
```bash
npm run dev
```
Después se abre **http://localhost:5173** en el navegador y se inicia sesión con alguno de los usuarios de prueba de la sección 7.

Si se necesita la versión de producción, se usa `npm run build`, que crea la carpeta `frontend/dist`.

### Cómo ejecutar el proyecto cada vez

Una vez instalado todo, para volver a usar el proyecto solo se necesitan dos terminales abiertas al mismo tiempo.

En la **terminal 1 (backend)**:
```bash
.venv\Scripts\activate
python manage.py runserver
```

En la **terminal 2 (frontend)**:
```bash
cd frontend
npm run dev
```

---

## 7. Usuarios de prueba, roles y permisos

Estos usuarios los crea el comando `python manage.py crear_datos_demo`. **Son ficticios y su contraseña solo sirve para desarrollo y demostración.** Todos usan la contraseña `Demo2026!`.

- **`admin_demo`**: perfil **Administrador**, es personal de la tienda.
- **`operador_demo`**: perfil **Operador**, es personal de la tienda.
- **`consulta_demo`**: perfil **Consulta**, es personal de la tienda.
- **`externo_demo`**: perfil **Externo**, no es personal de la tienda y no pertenece a ningún grupo.

Cada perfil es un **grupo de Django** con permisos por modelo. Los modelos con permisos son: cliente, categoría, producto, curso, inscripción, proveedor, entrada de producto, factura y detalle de factura. Para hacer cualquier cambio, el backend exige dos condiciones: que el usuario sea personal de la tienda (`is_staff`) y que tenga el permiso del modelo (por ejemplo `clientes.add_cliente`).

### Qué puede hacer cada perfil

**Administrador** tiene permisos de ver, crear, editar y eliminar en los nueve modelos. Puede hacer todo en los cinco módulos. Al eliminar, el sistema igual respeta las reglas de negocio (por ejemplo, responde 409 si un cliente tiene facturas).

**Operador** tiene permisos de ver, crear y editar en los nueve modelos, más el permiso de eliminar detalles de factura.
- Clientes, productos, categorías, cursos y proveedores: consulta, crea y edita, pero **no elimina** (403).
- Inscripciones: inscribe clientes y cancela o reactiva inscripciones, pero no las elimina.
- Entradas de inventario: consulta y registra entradas.
- Facturas: consulta, crea, cambia el estado y quita líneas de una factura pendiente, pero no elimina facturas.

**Consulta** solo tiene permisos de ver en los nueve modelos.
- Puede consultar todos los módulos, incluidas las facturas y las entradas de inventario.
- Cualquier intento de crear, editar o eliminar responde 403.

**Externo** no tiene permisos y no es personal de la tienda.
- Puede ver los catálogos de clientes, productos, categorías, cursos y proveedores.
- Facturas, entradas de inventario y estadísticas del dashboard responden 403.
- Cualquier intento de crear, editar o eliminar responde 403.

**Sin sesión:** el frontend redirige al login, y si alguien llama directamente a una operación protegida de la API, responde 401.

En la interfaz, los botones para los que no se tiene permiso aparecen deshabilitados con un candado, pero **la autorización real la valida Django** en cada solicitud. Aunque alguien intente la operación desde Postman, el backend responde 401 o 403. La barra superior muestra el nombre, el usuario y el perfil de quien inició sesión.

---

## 8. Modelo de datos y datos de ejemplo

### Entidades y relaciones

- **Cliente**: cédula (única), nombre, correo (único), teléfono, dirección y si está activo.
- **Categoría**: nombre (único) y descripción.
- **Producto**: nombre, descripción, precio, stock, stock mínimo, vigencia en meses (12, 24 o 36), fecha de vencimiento y si está activo. Pertenece a una **Categoría** y puede tener un **Proveedor**.
- **Proveedor**: nombre, teléfono (8 dígitos), correo (único), dirección y si está activo.
- **Entrada de producto**: registra que un **Proveedor** entregó una cantidad de un **Producto**, con su fecha.
- **Curso**: nombre, descripción, fecha, hora, duración en horas, precio, cupo máximo, modalidad (presencial o virtual) y estado (programado, cancelado o finalizado).
- **Inscripción a curso**: une a un **Cliente** con un **Curso**, con fecha y estado (inscrita o cancelada). Un cliente no puede inscribirse dos veces en el mismo curso.
- **Factura**: pertenece a un **Cliente** y tiene fecha, total y estado (pendiente, pagada o cancelada).
- **Detalle de factura**: es una línea de una **Factura**. Lleva un **Producto** o un **Curso** (nunca los dos), además de cantidad, precio unitario y subtotal.

En resumen, las relaciones son:

- Una categoría tiene muchos productos.
- Un proveedor suministra muchos productos y registra muchas entradas.
- Un producto tiene muchas entradas de inventario.
- Un cliente tiene muchas facturas y muchas inscripciones.
- Un curso tiene muchas inscripciones.
- Una factura tiene muchos detalles, y cada detalle apunta a un producto o a un curso.

Además se usan tablas propias de Django: `auth_user` (usuarios), `auth_group` (perfiles), `auth_permission` (permisos) y `authtoken_token` (tokens de sesión).

### Datos de ejemplo

Con `python manage.py crear_datos_demo --datos` se cargan:

- 4 categorías: Labiales, Bases, Sombras y Cuidado facial.
- 3 proveedores activos.
- 8 productos, tres de ellos con stock bajo (en o por debajo de su stock mínimo).
- 7 clientes, uno de ellos **inactivo** (Pablo Solano).
- 4 cursos: tres programados (uno de ellos, Delineado profesional, está **lleno**) y uno finalizado.
- 5 inscripciones.
- 2 entradas de inventario.
- 3 facturas: una pagada, una pendiente con un producto y una pendiente sin líneas.

Estos datos permiten probar directamente los casos especiales: un cliente inactivo que no puede facturarse ni inscribirse, un curso sin cupo y productos que necesitan reabastecimiento.

---

## 9. Reglas de negocio

Todas estas reglas las valida el **backend**. El frontend repite algunas validaciones antes de enviar los datos, pero la última palabra la tiene Django, y sus mensajes de error se muestran en el formulario.

**Clientes**
- La cédula debe tener al menos 5 caracteres y no puede repetirse. El correo tampoco puede repetirse.
- No se puede eliminar un cliente que tenga facturas o inscripciones (responde 409). En ese caso se marca como inactivo.
- Un cliente inactivo no puede recibir facturas nuevas ni inscribirse en cursos.

**Productos y categorías**
- El nombre del producto debe tener al menos 2 caracteres y el precio debe ser mayor que cero.
- El stock y el stock mínimo no pueden ser negativos.
- El proveedor asignado debe estar activo.
- La fecha de vencimiento debe dejar al menos la vigencia del producto desde hoy (12, 24 o 36 meses, calculados como 30 días por mes).
- El nombre de la categoría debe tener al menos 2 caracteres y ser único.
- No se puede eliminar un producto con facturas o entradas, ni una categoría con productos (responde 409).

**Cursos e inscripciones**
- El precio, el cupo máximo y la duración deben ser mayores que cero.
- El cupo máximo no puede bajar de la cantidad de inscripciones activas.
- Solo se aceptan inscripciones en cursos programados, de clientes activos y mientras haya cupo.
- Un cliente no puede inscribirse dos veces en el mismo curso.
- No se puede eliminar un curso con inscripciones (responde 409).

**Proveedores y entradas de inventario**
- El nombre del proveedor debe tener al menos 3 caracteres, el teléfono exactamente 8 dígitos, la dirección al menos 10 caracteres y el correo no puede repetirse.
- Para registrar una entrada, el proveedor debe estar activo, el producto debe pertenecer a ese proveedor y la cantidad debe ser mayor que cero.
- Cada entrada **aumenta automáticamente el stock** del producto.
- Las entradas solo se crean y consultan; no se editan ni se eliminan.
- No se puede eliminar un proveedor con productos o entradas (responde 409).

**Facturas y detalles**
- Solo se factura a clientes activos. La factura inicia en estado pendiente.
- La factura se crea junto con sus líneas en una sola operación: si alguna línea no cumple una regla, **no se guarda nada**.
- Cada línea lleva un producto o un curso, nunca los dos ni ninguno, y la cantidad debe ser mayor que cero.
- Para un producto: debe estar activo y tener stock suficiente. Al guardar la línea **se descuenta el stock**.
- Para un curso: debe estar programado, la cantidad debe ser 1, el cliente debe estar inscrito y el curso no puede haberse facturado antes al mismo cliente.
- El precio unitario, el subtotal y el total los calcula el servidor; el usuario no los escribe.
- Solo las facturas pendientes aceptan líneas nuevas o quitar líneas. Al quitar una línea de producto, el stock regresa al inventario y el total se recalcula.
- Las líneas no se editan: si hay un error, se quita la línea y se agrega otra.
- El cliente de una factura no se puede cambiar, una factura cancelada no se puede modificar y no se puede cancelar una factura que todavía tiene líneas.
- Solo se pueden eliminar facturas pendientes y sin líneas.

---

## 10. Pantallas y endpoints

Todas las rutas de la API van después de `http://127.0.0.1:8000/api`. En cada pantalla se indica qué acción hace y qué método y ruta usa.

**Inicio de sesión y sesión**
- Pantalla de login (`/login`): iniciar sesión con `POST /token/`.
- Al iniciar sesión o recargar la página: obtener el usuario, su perfil y sus permisos con `GET /auth/me/`.
- Barra superior: cerrar sesión con `POST /auth/logout/`.

**Dashboard (`/`)**
- Clientes activos: `GET /clientes/?activo=true`.
- Productos con stock bajo: `GET /productos/?stock_bajo=1`.
- Cursos programados: `GET /cursos/?estado=PROGRAMADO`.
- Proveedores activos: `GET /proveedores/?activo=true`.
- Ingresos y facturas pendientes: `GET /facturas/estadisticas/` (solo personal).
- Inscripciones activas: `GET /cursos/estadisticas/` (solo personal).
- Productos activos: `GET /productos/estadisticas/` (solo personal).

**Clientes**
- Lista (`/clientes`): buscar por nombre o cédula, filtrar por estado y paginar con `GET /clientes/?buscar=&activo=&page=`.
- Nuevo (`/clientes/nuevo`): `POST /clientes/`.
- Detalle (`/clientes/:id`): `GET /clientes/{id}/`, y sus facturas con `GET /facturas/?cliente={id}`.
- Editar (`/clientes/:id/editar`): cargar con `GET /clientes/{id}/` y guardar con `PUT /clientes/{id}/`.
- Eliminar (desde la lista o el detalle): `DELETE /clientes/{id}/`.

**Productos y categorías**
- Lista (`/productos`): buscar, filtrar por categoría, proveedor, estado y stock bajo, ordenar y paginar con `GET /productos/?search=&categoria=&proveedor=&activo=&stock_bajo=&ordering=&page=`.
- Nuevo (`/productos/nuevo`): `POST /productos/`. Los selectores de categoría y proveedor se llenan con `GET /productos/categorias/` y `GET /proveedores/`.
- Detalle (`/productos/:id`): `GET /productos/{id}/`, y sus entradas de inventario con `GET /proveedores/entradas/?producto={id}`.
- Editar (`/productos/:id/editar`): `GET /productos/{id}/` y `PUT /productos/{id}/`.
- Eliminar: `DELETE /productos/{id}/`.
- Categorías (`/productos/categorias`): listar con `GET /productos/categorias/`, crear con `POST`, editar con `PUT /productos/categorias/{id}/` y eliminar con `DELETE /productos/categorias/{id}/`.

**Cursos e inscripciones**
- Lista (`/cursos`): filtrar por estado y modalidad, ordenar y paginar con `GET /cursos/?estado=&modalidad=&ordering=&page=`.
- Nuevo (`/cursos/nuevo`): `POST /cursos/`.
- Detalle (`/cursos/:id`): `GET /cursos/{id}/` y sus inscripciones con `GET /cursos/{id}/inscripciones/`.
- Inscribir un cliente (en el detalle): `POST /cursos/{id}/inscripciones/`.
- Cancelar o reactivar una inscripción: `PATCH /cursos/inscripciones/{id}/`.
- Eliminar una inscripción: `DELETE /cursos/inscripciones/{id}/`.
- Editar (`/cursos/:id/editar`): `GET /cursos/{id}/` y `PUT /cursos/{id}/`.
- Eliminar: `DELETE /cursos/{id}/`.

**Proveedores y entradas de inventario**
- Lista (`/proveedores`, en tarjetas): buscar por nombre, filtrar por estado y paginar con `GET /proveedores/?nombre=&activo=&page=`.
- Nuevo (`/proveedores/nuevo`): `POST /proveedores/`.
- Detalle (`/proveedores/:id`): `GET /proveedores/{id}/` y los productos que suministra con `GET /productos/?proveedor={id}`.
- Editar (`/proveedores/:id/editar`): `GET /proveedores/{id}/` y `PUT /proveedores/{id}/`.
- Eliminar: `DELETE /proveedores/{id}/`.
- Entradas (`/proveedores/entradas`): ver el historial con `GET /proveedores/entradas/?proveedor=` y registrar una entrada con `POST /proveedores/entradas/`.

**Facturas y detalles**
- Lista (`/facturas`): filtrar por estado y cliente y paginar con `GET /facturas/?estado=&cliente=&page=`.
- Nueva (`/facturas/nueva`): se elige el cliente, se arma la lista de productos y cursos, y se guarda todo junto con `POST /facturas/` enviando `cliente` y `detalles`.
- Detalle (`/facturas/:id`): `GET /facturas/{id}/` y sus líneas con `GET /facturas/{id}/detalles/`.
- Agregar una línea a una factura pendiente: `POST /facturas/{id}/detalles/`.
- Quitar una línea: `DELETE /facturas/detalles/{id}/`.
- Marcar como pagada, cancelar o editar el estado (`/facturas/:id/editar`): `PATCH /facturas/{id}/`.
- Eliminar: `DELETE /facturas/{id}/`.

---

## 11. Respuestas de la API

**Listados paginados.** Clientes, productos, cursos, proveedores y facturas devuelven 5 registros por página con este formato:
```json
{
  "pagina_actual": 1,
  "total_paginas": 2,
  "total_registros": 7,
  "resultados": [ { "id": 1, "nombre": "..." } ]
}
```
Las categorías, las inscripciones de un curso, las entradas y los detalles de una factura devuelven una lista sin paginar.

**Inicio de sesión** (`POST /api/token/`):
```json
{ "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" }
```

**Usuario actual** (`GET /api/auth/me/`):
```json
{
  "id": 1,
  "username": "admin_demo",
  "nombre": "Ana Administradora",
  "is_staff": true,
  "is_superuser": false,
  "perfil": "Administrador",
  "grupos": ["Administrador"],
  "permisos": ["clientes.add_cliente", "clientes.view_cliente", "..."]
}
```

**Códigos de respuesta y cómo los muestra el frontend:**

- **200 OK**: consulta o actualización correcta.
- **201 Created**: registro creado. El frontend muestra un aviso de éxito y abre el detalle.
- **204 No Content**: registro eliminado. El frontend muestra un aviso de éxito y actualiza la lista.
- **400 Bad Request**: datos que no cumplen una regla. Django responde con los errores por campo, por ejemplo `{"email": ["Ya existe cliente con este email."]}`, o con un mensaje general, por ejemplo `{"error": "Solo se pueden agregar detalles a facturas pendientes."}`. El frontend muestra cada error debajo de su campo o en un aviso rojo.
- **401 Unauthorized**: no hay sesión o el token no es válido, por ejemplo `{"detail": "Autenticación requerida."}`. El frontend cierra la sesión y lleva al login.
- **403 Forbidden**: el perfil no tiene permiso, por ejemplo `{"detail": "No tiene permisos para agregar clientes."}`. El frontend muestra el aviso "Acceso denegado (403)" con ese mensaje.
- **404 Not Found**: el registro no existe, por ejemplo `{"error": "Cliente no encontrado."}`.
- **409 Conflict**: no se puede eliminar porque tiene datos relacionados, por ejemplo `{"error": "No se puede eliminar un cliente con facturas o inscripciones."}`.
- **Sin conexión**: si Django no responde, el frontend muestra "Sin conexión con la API" con la dirección configurada en `VITE_API_URL`.

---

## 12. Autenticación y manejo del token

- **Inicio de sesión:** el frontend envía el usuario y la contraseña a `POST /api/token/` y recibe un token real de Django REST Framework, que queda guardado en la tabla `authtoken_token`.
- **Sesión:** el token se guarda en el navegador (`localStorage`) y se envía en cada solicitud con el encabezado `Authorization: Token <token>`.
- **Rutas protegidas:** si no hay una sesión válida, cualquier pantalla privada redirige al login.
- **Cierre de sesión:** el frontend llama a `POST /api/auth/logout/`, que **revoca (elimina) el token en el servidor**. Después de cerrar sesión ese token ya no sirve y la API responde 401. Luego se limpia el navegador y se vuelve al login.
- **Errores:** un 401 cierra la sesión y lleva al login, y un 403 muestra el mensaje que envía Django ("No tiene permisos para…").

---

## 13. Pruebas automatizadas

El proyecto tiene **44 pruebas** que se ejecutan con `python manage.py test`. Las 40 del Proyecto 1 se mantienen y se agregaron 4 en `cuentas/tests.py`.

Qué verifican:

- **Creación y consulta** de clientes, productos, cursos, proveedores y facturas.
- **Validaciones de datos (400):** cédula corta o repetida, precio negativo o en cero, cupo en cero, nombre corto, teléfono inválido, fecha de vencimiento insuficiente, cantidad en cero, detalle sin producto ni curso y filtros con texto donde se espera un número.
- **Reglas de negocio:** curso sin cupo, cliente inactivo que no puede inscribirse, una inscripción que no se puede reactivar si el curso está lleno, stock insuficiente, facturas pagadas o canceladas que no aceptan líneas y entradas que aumentan el stock.
- **Autenticación (401):** crear un cliente sin token y consultar el usuario actual sin token.
- **Denegación de permisos (403):** el perfil de consulta no puede crear clientes, el operador no puede eliminar clientes, un usuario que no es personal recibe 403 aunque tenga el permiso, y un usuario con solo permiso de ver facturas puede listarlas pero no crearlas.
- **Conflictos (409):** no se puede eliminar un cliente con facturas.
- **No encontrado (404):** consultar un cliente que no existe.
- **Filtros y paginación:** filtro por estado combinado con búsqueda en clientes, y paginación de 5 registros por página (con 7 clientes hay 2 páginas: la primera con 5 y la segunda con 2).
- **Ordenamiento:** productos ordenados por precio, y un campo de orden no permitido responde 400.
- **Sesión:** el usuario actual devuelve su perfil y sus permisos, y el logout elimina el token (después responde 401).

---

## 14. Limitaciones conocidas

- **El token no vence por tiempo.** TokenAuthentication de DRF no tiene expiración automática. El token se revoca al cerrar sesión, pero si el usuario cierra el navegador sin cerrar sesión, el token sigue siendo válido hasta el próximo logout o hasta que se borre desde el panel `/admin`.
- **El token se guarda en `localStorage`.** Es práctico para una SPA, pero sería vulnerable si la página tuviera una falla de tipo XSS. React escapa el contenido que se muestra y no se inserta HTML directamente.
- **Consultas públicas en la API.** Como se definió en el Proyecto 1, los listados de clientes, productos, categorías, cursos y proveedores se pueden consultar en la API sin iniciar sesión. El frontend solo los muestra con sesión, pero quien llame directamente a la API puede verlos. Las facturas, las entradas y todas las operaciones de crear, editar y eliminar sí exigen sesión y permisos.
- **Selectores de entidades relacionadas.** El backend pagina de 5 en 5 registros y no permite cambiar el tamaño de página, por eso los selectores (clientes, productos, proveedores y cursos) recorren todas las páginas. Funciona bien con la cantidad de datos de un proyecto académico, pero con miles de registros convendría una búsqueda con autocompletado.
- **Categorías y entradas de inventario** no vienen paginadas desde el backend, porque así se definieron en el Proyecto 1.
- **Facturación de cursos.** El selector muestra todos los cursos programados. La regla de que el cliente debe estar inscrito en el curso la valida el servidor, y su mensaje se muestra en el formulario.
- **Orden de las validaciones al eliminar facturas.** Si se intenta eliminar una factura que no está pendiente, el backend responde 400 por la regla de negocio antes de revisar el permiso de eliminación. Es un comportamiento que viene del Proyecto 1.
- **Entradas de inventario.** Por regla del Proyecto 1 solo se pueden crear y consultar; no se editan ni se eliminan desde la API.
- **Entorno de desarrollo.** El proyecto está configurado para ejecutarse de forma local (`DEBUG = True`, con el servidor de desarrollo de Django y el de Vite), por lo que no está preparado para publicarse en un servidor de producción.

### Problemas frecuentes y cómo resolverlos

- **Aparece "Sin conexión con la API" en el login.** Django no está encendido. Hay que ejecutar `python manage.py runserver` en la terminal del backend.
- **Aparece `The SECRET_KEY setting must not be empty`.** Falta `DJANGO_SECRET_KEY` en el `.env`. Hay que agregarla (sección 4, paso 5), cerrar la terminal, abrir una nueva y volver a iniciar Django.
- **Sale un error de CORS en la consola del navegador.** El frontend se abrió en otro puerto, por ejemplo el 5174. Hay que cerrar los demás `npm run dev` y usar `http://localhost:5173`, o agregar ese puerto a `CORS_ALLOWED_ORIGINS`.
- **Al correr las pruebas sale `Access denied ... test_tienda_belleza_db`.** Falta el permiso de la base de pruebas. Hay que ejecutar el `GRANT` de pruebas de la sección 2.
- **Sale `Could not read package.json`.** Se ejecutó `npm run dev` fuera de la carpeta `frontend`. Hay que entrar con `cd frontend` y repetir el comando.

---

## 15. Ampliaciones del backend realizadas en el Proyecto 2

Ninguno de estos cambios debilita las reglas de negocio ni la seguridad del Proyecto 1.

- **CORS con `django-cors-headers`** (`tienda_moda/settings.py`): para que el frontend React pueda consumir la API.
- **`GET /api/auth/me/` y `POST /api/auth/logout/`** (`cuentas/views.py`): para mostrar el usuario y su perfil en la barra superior, y para revocar el token al cerrar sesión.
- **Comando `crear_datos_demo`** (`cuentas/management/commands/`): crea de forma reproducible los perfiles, los usuarios de prueba y los datos de ejemplo.
- **Parámetro `?ordering=` en productos y cursos** (`productos/views.py` y `cursos/views.py`): el ordenamiento lo resuelve el backend con una lista de campos permitidos; si se envía un valor inválido responde 400.
- **Nombres relacionados en las respuestas** (`nombre_proveedor`, `nombre_cliente` e `inscritos`, en los `serializers.py` y `views.py` de productos y cursos): para mostrar las relaciones entre módulos sin hacer consultas extra.
- **Filtros `?proveedor=` y `?producto=` en las entradas, y permiso `add_entradaproducto`** (`proveedores/views.py`): permiten ver el historial por proveedor o por producto, y refuerzan la seguridad al registrar entradas.
- **Factura y sus líneas en una sola transacción** (`facturas/views.py`): si alguna línea incumple una regla (stock, inscripción o curso ya facturado), no se guarda nada, gracias a `transaction.atomic()`.
- **`SECRET_KEY` leída del `.env` y `LANGUAGE_CODE = 'es'`** (`tienda_moda/settings.py`): para no exponer la clave en el código y para que los mensajes de validación salgan en español.