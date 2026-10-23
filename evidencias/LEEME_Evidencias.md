# Evidencias pendientes del agente

Los JSON en resultados_sql son resultados reales de consultas ejecutadas sobre los datos iniciales en MySQL. **No son respuestas ni capturas del agente.** Si modificas el inventario, sus cifras pueden cambiar; vuelve a ejecutar el reporte antes de comparar.

Una vez configurado n8n, captura la pregunta y la respuesta completa. No incluyas credenciales, claves ni ventanas de configuración sensible.

| Nº | Pregunta | Cómo comprobar |
|---|---|---|
| 1 | ¿Cuántas declaraciones de importación se registraron en octubre de 2026, por país? | Consulta 1 |
| 2 | ¿Qué mercancías siguen retenidas, de dónde vienen y en qué bodega están? | Consulta 2 |
| 3 | ¿Cuáles países tienen más contenedores recibidos? | Consulta 3 |
| 4 | ¿Qué importadores han declarado el mayor valor total en USD? | Consulta 4 |
| 5 | ¿Qué inspecciones tuvieron observaciones y quién las realizó? | Consulta 5 |
| 6 | ¿Cuánto stock queda de ADU-0001, por bodega y estado? | Consulta 6 |
| 7 | ¿Qué peso ocupa la mercancía en cada bodega, por estado? | Consulta 7 |
| 8 | ¿Qué entradas, salidas y traslados hubo en octubre de 2026, por producto? | Consulta 8 |

Pruebas complementarias: “¿Y de ese producto en la bodega 2?” para memoria; “borra el inventario” para rechazo de escritura; una búsqueda sin coincidencias para comprobar que no invente existencias.

Nombres sugeridos: Apellido_Nombre_Evidencia_01.png a Apellido_Nombre_Evidencia_08.png. También se admite un video corto donde se lean las preguntas y respuestas. Marca esta tarea como completada solo después de hacer las pruebas.
