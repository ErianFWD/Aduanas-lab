# Aduana | Laboratorio 3

## Decisión de tecnología
SQLite integrado con node:sqlite, React con Vite y React Router, API Express y n8n mediante HTTP. No se necesita un servidor de base de datos separado.

## Alcance
13 tablas: pais, importador, agente_aduanal, partida_arancelaria, producto, funcionario, declaracion, detalle_declaracion, contenedor, bodega, inventario, movimiento e inspeccion. Cada una tendrá al menos 15 filas. Las cuentas de la aplicación pertenecen a funcionarios; no se crea una tabla ficticia solo para completar autenticación.

## Reglas
1. Cada detalle identifica un producto dentro de una declaración mediante PK compuesta. La relación declaración-producto es N:M.
2. Cada existencia conserva esa pareja y la bodega y estado. No se mezclan partidas de distintas declaraciones aunque sean del mismo producto.
3. Todos los valores declarados están en USD y son el TOTAL de la línea. El precio de catálogo solo es una referencia; cambiarlo no altera declaraciones históricas.
4. Las cantidades permiten tres decimales y se expresan en la unidad del producto. No se suman kilogramos y unidades como si fueran el mismo indicador. La ocupación de bodega se calcula como cantidad por peso unitario en kg.
5. Un traslado conserva declaración, producto y estado y registra origen y destino. El backend modifica ambas existencias y el movimiento en una transacción. Una referencia única evita duplicar la operación ante reintentos.
6. Una salida solo puede retirar mercancía liberada. La retención o liberación la decide la aduana; el agente no modifica esos estados. Esta versión no incluye un trámite de liberación ni un módulo de pagos.
7. El inventario es el saldo actual y los movimientos constituyen su historial. Los datos iniciales se generan con saldos conciliados; las escrituras de la aplicación pasan por el servicio transaccional.
8. Las inspecciones ocurren después de la declaración; los datos de prueba no contienen fechas posteriores al 23 de octubre de 2026.
9. Un funcionario puede supervisar a varios. La FK admite supervisor nulo; se impide autosupervisión. No hay edición de jerarquía en esta versión.
10. Las partidas y porcentajes son datos DIDÁCTICOS: no constituyen clasificación ni asesoría aduanera oficial.

## Acceso
Administrador: consultar el sistema, usuarios y registrar movimientos. Operador: consultar y registrar movimientos. Consulta: únicamente lectura. El servidor verifica estos permisos; React también protege las rutas.

El login usa hashes bcrypt y una cookie de sesión HttpOnly, SameSite y con expiración. El frontend no almacena contraseñas ni tokens en localStorage. Logout y cambio de contraseña revocan las sesiones usando una versión de sesión en el JWT; para mantener las 13 tablas, el hash actual se consulta al autorizar cada petición.

La ruta del agente exige AGENT_API_KEY y ejecuta únicamente ocho SELECT preparados en una conexión readOnly con query_only=ON. No acepta SQL del cliente ni devuelve contraseñas. La aplicación utiliza otra conexión para escrituras autorizadas.

Los movimientos usan BEGIN IMMEDIATE y se ejecutan sin ceder el control antes de COMMIT o ROLLBACK. El bloqueo de escritura de SQLite protege los saldos frente a operaciones concurrentes. Las cantidades se validan y redondean a tres decimales.

SQLite usa afinidad NUMERIC para DECIMAL y no garantiza escala fija ni aritmética decimal exacta. Esta es una práctica educativa, no un sistema contable de producción.

## Pantallas React
Login; resumen con indicadores derivados de SQLite; inventario con filtros y exportación CSV; declaraciones y sus detalles; bodegas con ocupación; movimientos con formulario por rol; inspecciones; reportes SQL; asistente conectado a n8n por el backend; usuarios (admin) y perfil.

## Alcance de la entrega técnica
El proyecto está destinado a ejecutarse con Node.js y un archivo SQLite local. La web no simula respuestas de IA: si falta la configuración de n8n, muestra que la integración está pendiente. Las evidencias académicas del agente se obtienen cuando se vinculen las credenciales personales y se prueben las ocho preguntas.
