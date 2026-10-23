# Inventario aduanero · SQLite + React + n8n

Versión local del Laboratorio 3. Conserva las 13 tablas, datos de prueba, ocho reportes, login, roles, rutas privadas y diseño negro y amarillo. No requiere MySQL, XAMPP, Workbench ni contraseña root.

## Arrancar la página

1. Instala Node.js 24 LTS (también compatible con Node >=22.13). Comprueba `node -v` en una terminal nueva.
2. Descomprime el ZIP en una carpeta NUEVA y ábrela en VS Code. Abre la terminal en la carpeta que contiene este README y package.json.
3. Ejecuta, en este orden:

```bash
npm ci
npm run setup
npm run dev
```

`setup` crea backend/.env con claves aleatorias y database/aduana_lab3.sqlite con los datos iniciales. Si existen, conserva los datos y las claves no vacías. `dev` inicia backend y frontend; deja la terminal abierta.

Abre http://localhost:5173. API: http://localhost:3001/api/health.

| Rol | Correo | Contraseña didáctica |
|---|---|---|
| Administrador | admin@aduana.local | Aduana2026! |
| Operador | operador@aduana.local | Aduana2026! |
| Consulta | consulta@aduana.local | Aduana2026! |

Puedes cambiar la contraseña desde Perfil. No son cuentas de MySQL; son usuarios de la aplicación.

Para detener: Ctrl+C. Para volver a iniciar: `npm run dev`. No repitas la instalación cada vez.

## Archivos importantes

- database/Aduana_Lab3_SQLite.sql: creación de tablas, INSERT y ocho SELECT. Es el script SQL para entregar.
- database/aduana_lab3.sqlite: archivo de datos que se crea al ejecutar setup. Guarda aquí los cambios reales.
- backend/.env: claves privadas locales. Nunca subirlo a Classroom ni al repositorio.
- n8n/Agente_Aduana_SQLite_Sencillo.json: workflow de cinco nodos, exportado inactivo y sin credenciales.
- n8n/LEEME_n8n.md: instrucciones de conexión y ocho preguntas para evidencia.
- docs/Investigacion_Aduana_Lab3.pdf: borrador actualizado a SQLite, sin diagrama. Completar nombres y reflexión personal.
- docs/03_Validacion_tecnica.json: resultados de pruebas en un archivo temporal independiente.
- diagrama/: referencias anteriores adaptadas a tipos SQLite; utiliza para entregar el diagrama que elaboraste manualmente, según lo pedido por el profesor.

## n8n

Primero arranca la página y luego sigue n8n/LEEME_n8n.md. El agente usa HTTP Request para pedir uno de ocho informes al backend. El backend consulta SQLite con una conexión de solo lectura. El agente no recibe el archivo ni las contraseñas de usuarios, y no puede escribir SQL libre.

El reporte 6 permite cambiar el SKU. Los informes de octubre corresponden a octubre de 2026. Las preguntas fuera de estos ocho informes no están cubiertas por esta versión sencilla. La memoria es por conversación y no reemplaza consultas actuales a la base.

## Validación

```bash
npm test
npm run test:integration
npm run build
```

Las pruebas de integración crean y eliminan exclusivamente su propia base temporal. No alteran tu archivo de datos. El envío de preguntas al backend de n8n se prueba con un servidor HTTP simulado; eso no prueba al LLM. La importación y ejecución del workflow en tu n8n sigue pendiente de tus credenciales.

Para ejecutar la compilación local: `npm run build` y `npm start`; abre http://localhost:3001. Esta guía está pensada para desarrollo local (`NODE_ENV=development`). Un despliegue requiere HTTPS y configuración de entorno propia.

## Modelo y diferencias con MySQL

Las entidades y relaciones se conservan. Los identificadores autoincrementales ahora usan INTEGER PRIMARY KEY AUTOINCREMENT; en tu diagrama manual revisa esos tipos. SQLite acepta VARCHAR, CHAR, DECIMAL y DATE como declaraciones con afinidad: no impone longitudes o una escala decimal fija. El servicio valida cantidades y redondea los cambios de stock a tres decimales. Los datos son didácticos, no una contabilidad de producción.

Cada conexión activa foreign_keys. Los movimientos se procesan con BEGIN IMMEDIATE y COMMIT/ROLLBACK. La referencia única permite reintentar sin duplicar movimientos.

## Copia de seguridad

Detén la aplicación antes de copiar database/aduana_lab3.sqlite. No borres ese archivo para intentar solucionar errores: contiene tus cambios. `npm run db:import` solo verifica o crea una base ausente; no reinicia una base existente.
