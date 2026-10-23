# n8n sencillo con SQLite · cinco nodos

Flujo: Chat de aduana → Asistente aduanero. Al agente se conectan Modelo Groq, Memoria por conversación y Consultar_inventario (HTTP Request Tool).

Preparado con tipos/versiones de nodos de n8n 2.44.6: Chat Trigger 1.3, Agent 2.2, Groq 1, Simple Memory 1.3 y HTTP Request Tool 4.4. Se verificaron su estructura y las expresiones; no se ha importado ni ejecutado el LLM con credenciales personales.

## 1. Inicia la aplicación

Desde la raíz del proyecto:

```bash
npm ci
npm run setup
npm run dev
```

Debe funcionar http://localhost:3001/api/health. SQLite se crea automáticamente. No necesitas instalar un gestor de bases de datos.

## 2. Abre n8n

Si ya tienes una instancia, úsala. Para iniciar una instancia local compatible, abre OTRA terminal:

```bash
npx n8n@2.44.6
```

Abre http://localhost:5678 y crea tu cuenta de n8n si es el primer inicio. Esa cuenta es distinta de los usuarios de la página.

## 3. Importa el JSON

En un workflow nuevo, usa el menú de opciones → Import from File. Selecciona Agente_Aduana_SQLite_Sencillo.json.

El archivo se entrega inactivo. No contiene claves ni vinculaciones a credenciales.

## 4. Configura dos credenciales

**Modelo Groq:** abre el nodo y crea o selecciona tu credencial Groq con una API key de tu cuenta. El modelo configurado es llama-3.3-70b-versatile; puede depender de su disponibilidad y los límites de tu proveedor. La key solo se guarda en n8n.

**Consultar_inventario:** abre el nodo. Ya usa Generic Credential Type → Header Auth. Crea una credencial Header Auth:

- Name: `X-Aduana-Key`
- Value: copia el valor de `AGENT_API_KEY` desde backend/.env, sin incluir `AGENT_API_KEY=`.

No copies JWT_SECRET: es otra clave. No pongas el secreto directamente en los parámetros del nodo ni en el JSON compartido.

La URL de la herramienta es http://127.0.0.1:3001/api/agente/consultar. Así funciona cuando n8n y el backend corren directamente en la misma computadora.

- Si n8n está en Docker Desktop y el backend corre en Windows, cambia SOLO el host por `host.docker.internal` y deja el puerto 3001 y la ruta.
- Si n8n está en la nube, localhost no apunta a tu computadora. Para esta práctica recomendamos n8n local. No expongas la base SQLite en Internet; si eliges otra ubicación habrá que configurar acceso HTTPS al backend.

No cambies los parámetros reporte y producto: son expresiones que el agente completa.

## 5. Prueba el agente

Abre el chat manual del workflow. Haz estas ocho preguntas y guarda las capturas de las respuestas reales:

1. ¿Cuántas declaraciones de importación hubo en octubre de 2026, por país?
2. ¿Qué mercancías siguen retenidas y en qué bodegas están?
3. ¿Cuál es el país de origen con más contenedores recibidos?
4. ¿Qué importador tiene el mayor valor total declarado en USD?
5. ¿Qué inspecciones tuvieron observaciones y quién las hizo?
6. ¿Cuánto stock queda del producto ADU-0001 en cada bodega?
7. ¿Cuál es la ocupación de las bodegas en kilogramos por estado?
8. ¿Qué movimientos hubo en octubre de 2026 por tipo y producto?

Para probar memoria, después de la pregunta 6 escribe: “¿Y del ADU-0002?”. Debe consultar el reporte 6 para ese SKU dentro del mismo chat.

Las ocho consultas completas están en database/reportes.json y en el script SQL. Se devuelven hasta 100 filas por llamada. El campo truncado indica si se excedió ese límite. Esta versión usa informes preparados; no responde consultas SQL arbitrarias.

## 6. Conecta el chat de React

Cuando el chat manual funcione:

1. En Chat de aduana habilita Make Chat Publicly Available. Esto habilita el endpoint, por lo que debes configurar la autenticación indicada a continuación.
2. Selecciona Embedded Chat (mode webhook) y Authentication → Basic Auth. Crea una credencial con usuario y contraseña propios. No reutilices la clave del paso 4: Basic Auth protege el acceso al chat; Header Auth protege la herramienta de consulta.
3. Conserva Response Mode → When Last Node Finishes (lastNode), para que la página reciba la respuesta JSON completa.
4. Guarda y activa/publica el workflow cuando quieras utilizarlo. Copia la URL de producción que muestra Chat de aduana.
5. Completa backend/.env:

```dotenv
N8N_CHAT_URL=URL_DE_PRODUCCION_DEL_CHAT
N8N_CHAT_USER=USUARIO_DE_BASIC_AUTH
N8N_CHAT_PASSWORD=CONTRASEÑA_DE_BASIC_AUTH
```

6. Reinicia `npm run dev` con Ctrl+C y vuelve a ejecutarlo. Entra a la página y abre Asistente.

La URL de prueba solo responde mientras n8n está escuchando una ejecución de prueba; para uso normal utiliza producción y workflow activo.

## Diagnóstico

- ECONNREFUSED: verifica que npm run dev siga abierto y que la URL de la herramienta corresponda a la ubicación de n8n.
- 401 en la herramienta: revisa Header Auth, nombre X-Aduana-Key y el valor AGENT_API_KEY.
- 400 en la herramienta: el número debe ser 1–8 y el SKU debe seguir ADU-0001. No se permite enviar SQL ni otros parámetros.
- 401 al llamar el chat: revisa las credenciales Basic Auth del trigger y N8N_CHAT_USER/PASSWORD.
- Error del modelo: revisa la API key, acceso al modelo y límites de Groq.
- La página informa configuración pendiente: guarda N8N_CHAT_URL en backend/.env y reinicia la terminal del servidor.

## Comprobación aislada, sin LLM

`npm run test:integration` prueba una solicitud válida del agente, entradas inválidas, acceso sin clave y consultas repetidas sin modificar el stock. También comprueba el puente React-n8n con un servidor simulado. `npm test` comprueba las expresiones y el fixture adicional Prueba_Entradas_Lab3.json (válido, duplicado en el mismo lote e inválido).

Una consulta repetida puede volver a ejecutarse; es lectura y no produce cambios. La prevención durable de movimientos duplicados se implementa por separado con una referencia UNIQUE y una transacción en SQLite.

Antes de entregar cualquier exportación posterior, elimina las vinculaciones de credenciales del ejemplo y no incluyas backend/.env, claves de API ni capturas que muestren secretos.
