# Aduana · Laboratorio 3

Sistema de inventario aduanero con **MySQL, React, Express y un agente de n8n**. Interfaz negra y amarilla, login real, sesión HttpOnly, rutas privadas y permisos en el servidor.

## Estado de esta entrega

- SQL completo ejecutado en MySQL 8.4.13: **13 tablas, 465 registros y 8 consultas**.
- React compilado; API y reglas de inventario probadas en una instancia temporal aislada.
- Investigación de 6 páginas en PDF y su texto editable en Markdown.
- DER en PNG y SVG, con fuentes editables DBML y DOT.
- JSON de n8n estructuralmente revisado, inactivo y sin credenciales. Código de validación probado con entradas válidas, inválidas y duplicadas en un lote.
- **Pendiente:** instalar/conectar los servicios en el equipo del estudiante, vincular las credenciales del modelo en n8n y obtener capturas reales de ocho respuestas del agente. No se incluyen evidencias simuladas de IA.

## 1. Requisitos

- Node.js 22 o posterior y npm.
- **MySQL Server 8.4** (también compatible con 8.0.16 o posterior).
- MySQL Workbench es opcional: es una interfaz para trabajar con el servidor, no lo sustituye.
- n8n local o una instancia accesible. El JSON se preparó contra los esquemas de n8n 2.44.6; si tu instancia es anterior, revisa los nodos antes de activarlo.

## 2. Instalar y preparar configuración

Abre la carpeta que contiene este README en VS Code y ejecuta en su terminal:

```bash
npm ci
npm run setup
```

El segundo comando crea **backend/.env** con claves aleatorias, sin sobrescribir una configuración existente. En ese archivo revisa únicamente `DB_HOST` y `DB_PORT` para tu servidor. El puerto habitual es 3306. Conserva `DB_NAME=aduana_lab3`.

No coloques aquí la contraseña de root: las contraseñas generadas pertenecen a las nuevas cuentas de aplicación y del agente. La contraseña de root se solicita de forma oculta en los siguientes comandos.

## 3. Crear la base y sus datos

Con MySQL Server iniciado:

```bash
npm run db:import
```

Introduce el usuario administrador de MySQL (normalmente root) y su contraseña. El script crea tablas, datos y ejecuta las ocho consultas. Si la base ya contiene tablas se detiene para conservarlas.

Alternativa: abrir **database/Aduana_Lab3.sql** en Workbench y ejecutar el archivo completo en una instancia vacía. Usa una alternativa, no ambas. Los archivos numerados 01, 02 y 03 son las mismas secciones separadas para estudiar; no los ejecutes de nuevo después del archivo completo.

## 4. Crear cuentas MySQL con permisos separados

```bash
npm run db:users
```

Solicita la cuenta administradora una vez y crea:

- `aduana_app`: lectura, escritura de inventario/movimientos, actualización de contraseña/sesiones y permiso de bloqueo para transacciones.
- `aduana_lector`: SELECT exclusivamente sobre tablas de negocio y la vista pública de funcionarios.

Sus contraseñas están en tu **backend/.env** local. Si estas cuentas ya existen, el script se detiene sin alterar sus permisos; revisa la configuración antes de reintentarlo. No uses root como cuenta del agente.

La configuración predeterminada es local. Si MySQL está en otro equipo o contenedor, hay que ajustar red, host permitido de la cuenta y TLS con el docente o con ayuda antes de abrir acceso.

## 5. Iniciar la aplicación

```bash
npm run dev
```

Abre **http://localhost:5173**. El frontend usa la API del puerto 3001 mediante el proxy de Vite. Para detener ambos, presiona Ctrl+C.

Para una ejecución sin servidor de desarrollo:

```bash
npm run build
npm start
```

En ese caso abre **http://localhost:3001**. Si cambias el origen o utilizas producción con HTTPS, actualiza `CLIENT_ORIGIN` y `NODE_ENV` según tu entorno; las cookies seguras requieren HTTPS.

### Cuentas de la aplicación para pruebas locales

| Rol | Correo | Contraseña inicial |
|---|---|---|
| Administración | admin@aduana.local | Aduana2026! |
| Operación | operador@aduana.local | Aduana2026! |
| Consulta | consulta@aduana.local | Aduana2026! |

Estas claves son públicas y solo sirven para el conjunto didáctico. Cámbialas en **Mi perfil** antes de usar el proyecto fuera de la práctica. Las demás cuentas de funcionarios tienen la misma clave inicial; se muestran en Usuarios. El agente no puede leer sus hashes.

## 6. Funcionalidades

- Resumen con cifras, países de origen, distribución por régimen y ocupación calculados desde MySQL.
- Inventario por partida, bodega y estado, con filtros, paginación y exportación de la página actual a CSV.
- Declaraciones con detalle de productos, contenedores e inspecciones.
- Bodegas con capacidad y ocupación en kilogramos.
- Movimientos: entradas pendientes, salidas de mercancía liberada y traslados. Los saldos y el historial se actualizan juntos.
- Reintentos de un movimiento con la misma referencia y contenido no lo duplican.
- Reportes que ejecutan las ocho consultas SQL.
- Chat conectado desde el backend a n8n cuando se configure.
- Usuarios solo para administración, perfil y cierre de sesión con revocación del token.

La versión no incluye registro de nuevas declaraciones ni un trámite de liberación o pago de impuestos. Los datos de prueba ya contienen declaraciones; varias tienen ingresos parciales para practicar entradas. El agente es de consulta y no modifica el inventario.

## 7. Conectar n8n (requiere intervención del estudiante)

Sigue **n8n/LEEME_n8n.md**. Importa **n8n/Agente_Aduana_Lab3.json** y vincula sus credenciales dentro de n8n. La clave del modelo nunca se pega en el código ni se comparte por chat.

La conexión de n8n en la nube a un MySQL local no funciona apuntando a `localhost`: ese nombre designa la máquina donde corre n8n. Primero debemos confirmar si tu n8n es local o de la nube para elegir la red correcta.

## 8. Verificación

```bash
npm test
npm run build
python scripts/check_workflow.py n8n/Agente_Aduana_Lab3.json
```

El último comando requiere Python 3. Revisa los resultados ya obtenidos en **docs/03_Validacion_tecnica.json** y **docs/04_Validacion_workflow.json**.

Para repetir las pruebas de integración, configura `MYSQL_BASEDIR` con la carpeta que contiene `bin/mysqld` y ejecuta `npm run test:integration`. El comprobador crea su propio servidor y datos temporales y los elimina al finalizar; no utiliza tu base de trabajo. En Windows PowerShell se establece así:

```powershell
$env:MYSQL_BASEDIR="C:\Program Files\MySQL\MySQL Server 8.4"
npm run test:integration
```

## Entrega académica

Completa nombres y apellidos en el encabezado SQL y la investigación. Adapta los nombres de archivo al formato del docente. Conserva la explicación de uso de IA y personaliza los aprendizajes después de realizar tus pruebas. El PDF es un borrador revisable, no evidencia de trabajo personal aún no realizado.

Entrega la investigación, el DER, SQL, workflow y evidencias. Las carpetas `backend` y `frontend` son el complemento solicitado. No entregues `.env`, claves reales ni `node_modules`.

## Organización

- `database`: modelo SQL completo, secciones separadas y reportes.
- `diagrama`: DER y fuentes editables.
- `backend/src`: configuración, conexión, autenticación, API y movimientos.
- `frontend/src`: components, context, hooks, layouts, pages, routes, services y styles.
- `n8n`: workflow, prompt, pruebas y guía de conexión.
- `docs`: investigación, decisiones, diccionario y validaciones.
- `evidencias`: resultados de SQL y guía para capturas pendientes del agente.
- `scripts` y `tests`: configuración, importación y comprobaciones reproducibles.
