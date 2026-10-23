# Agente de inventario aduanero

## Estado
Workflow inactivo, sin credenciales. Estructura y código de validación revisados. **No se afirma que la importación, las respuestas del LLM ni las ocho ejecuciones hayan sido verificadas todavía.** La base y los ocho reportes sí se probaron realmente en MySQL.

Objetivo de compatibilidad: n8n 2.44.6; paquetes n8n-nodes-base 2.44.4 y @n8n/n8n-nodes-langchain 2.44.4. Nodos: Chat Trigger 1.3; AI Agent 2.2; Groq 1; Simple Memory 1.3; MySQL Tool 2.5; Code 2. Se consultaron los esquemas oficiales publicados en npm. Si tu instancia difiere, confirma que reconoce los nodos antes de habilitarla.

## Importar y configurar
1. Importa `Agente_Aduana_Lab3.json` en un workflow nuevo. Conserva el flujo sin publicar mientras configuras.
2. En **Modelo Groq**, crea o selecciona tu credencial Groq dentro de n8n. El modelo propuesto es `llama-3.3-70b-versatile`; confirma que aparece disponible en tu cuenta. Puedes sustituir el subnodo por otro proveedor permitido, conservando conexión y uso de herramientas.
3. En **Consultar_inventario**, vincula una credencial MySQL con la cuenta `aduana_lector`, base `aduana_lab3` y la contraseña que generó `npm run setup`. **No uses la cuenta root ni la de la aplicación.**
4. El host depende de dónde se ejecuta n8n. Local en el mismo equipo: normalmente 127.0.0.1. Dentro de un contenedor: localhost se refiere al contenedor. En la nube: necesita un servidor accesible por esa instancia, con configuración de red y TLS apropiada. No publiques MySQL directamente como atajo.
5. Conserva **Memoria por conversación** con `sessionKey` tomada de **Validar pregunta**. Cada conversación debe tener su propio sessionId.
6. Abre el chat manual del workflow y prueba las ocho preguntas de la guía de evidencias. Compara contra `database/03_consultas.sql` y sus resultados guardados en `evidencias/resultados_sql`.

## Ejemplo de entrada y salida
Entrada al chat: “¿Cuánto stock queda de ADU-0001 y en qué bodegas está?”.

Entrada equivalente al modo Embedded Chat:
```json
{"action":"sendMessage","sessionId":"sesion-prueba-1","chatInput":"¿Cuánto stock queda de ADU-0001?"}
```

Salida esperada en formato: `{"output":"Respuesta en español basada en las filas consultadas"}`. El texto es ilustrativo, no una ejecución real. La respuesta debe identificar producto, cantidades, bodegas y estado; no se fijan cifras manualmente en el prompt.

## Conectar el chat React
Después de verificar el agente en el chat manual:
1. En Chat de aduana, habilita disponibilidad, selecciona **Embedded Chat** y **Basic Auth**. Crea una credencial de acceso exclusiva para el backend dentro de n8n.
2. Copia la URL de chat que muestre tu instancia. La URL de prueba necesita que el workflow esté escuchando; la URL de producción necesita publicarlo/activarlo cuando tú decidas usarlo.
3. En tu `backend/.env`, completa localmente `N8N_CHAT_URL`, `N8N_CHAT_USER` y `N8N_CHAT_PASSWORD`. No agregues estos valores al frontend ni al JSON exportado.
4. Reinicia el backend. El chat React dejará de mostrar conexión pendiente. Esa indicación significa que hay una URL configurada; una respuesta satisfactoria es la comprobación de conectividad real.
5. Comprueba que cuentas distintas y conversaciones nuevas no comparten memoria. El backend antepone el id del usuario al sessionId.

El workflow compartido mantiene `public:false` y `active:false` porque todavía no tiene esas credenciales y no debe exponer un endpoint sin configurar autenticación.

## Tres tipos de prueba
- **Válida:** pregunta y sessionId de texto; el agente consulta y responde.
- **Inválida:** falta texto, se envía un número o un sessionId inválido; el validador rechaza.
- **Duplicada:** `Prueba_Entradas_Lab3.json` contiene tres eventos: válido, repetido e inválido. Su nodo de código detecta el duplicado **solo dentro de ese lote**. No proporciona memoria duradera ni demuestra idempotencia entre ejecuciones.

Las consultas del agente no escriben, por lo que repetir una pregunta no duplica inventario. La idempotencia de movimientos pertenece al backend y se apoya en `movimiento.referencia UNIQUE`, una transacción y comprobación del contenido.

## Límites y seguridad
- El filtro textual de SQL es preventivo; no reemplaza un analizador SQL ni los permisos reales.
- La cuenta del agente no tiene escritura ni lectura de la tabla privada de funcionarios.
- Simple Memory conserva contexto en una instancia; no se debe utilizar como memoria compartida en modo de colas.
- Verifica la consulta ejecutada si el agente cuenta de más al combinar detalles y contenedores.
- No exportes claves de API ni archivos .env. El export incluido no contiene bindings de credenciales.

Documentación oficial: [MySQL](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql), [Simple Memory](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow), [modelos Groq](https://console.groq.com/docs/models).
