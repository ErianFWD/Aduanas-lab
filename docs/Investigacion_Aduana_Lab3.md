

## Laboratorio 3 | Inventario aduanero



**Asignatura:** Bases de Datos. **Fecha de preparación:** 23 de octubre de 2026.<br/>**Integrantes:** __________________________________________

Este trabajo propone organizar el inventario de una aduana en una base relacional y consultar sus datos con un agente de n8n. El propósito es entender qué se guarda, cómo se relaciona y por qué una respuesta debe poder comprobarse mediante SQL.



### A. Fundamentos de bases de datos



Una **base de datos** reúne información organizada para consultarla y mantenerla. Un **Sistema Gestor de Bases de Datos (SGBD)** es el programa que administra esa información, ejecuta consultas y aplica permisos y reglas. En el proyecto, aduana_lab3 es la base; MySQL es el gestor [1].

El modelo **relacional** representa la información mediante tablas conectadas por llaves. NoSQL comprende otros modelos, como documentos, grafos o pares clave-valor. Puede ofrecer estructuras flexibles; eso no significa que carezca de reglas ni que sea siempre mejor. Elegimos un modelo relacional porque necesitamos relacionar declaraciones, productos y bodegas con integridad referencial [1, 2].

Una **tabla** representa un conjunto, como los productos. Un **registro o fila** describe un elemento concreto. Un **campo o columna** identifica un atributo, como descripción o peso. El tipo de dato delimita qué puede guardarse: INT para identificadores enteros, VARCHAR para texto variable, CHAR para códigos de longitud fija, DATE para fechas y DATETIME para fecha y hora [3].

Usamos **DECIMAL** para importes y cantidades que requieren precisión definida. Por ejemplo, DECIMAL(14,2) admite catorce dígitos en total, dos de ellos decimales. Los valores del laboratorio están expresados en USD; las capacidades de las bodegas y los pesos unitarios, en kilogramos. Una unidad de un saco de arroz no equivale a un kilogramo [3].



### Llaves y relaciones



La **llave primaria (PK)** identifica una fila sin repetirse ni quedar vacía. La **llave foránea (FK)** referencia una llave de otra tabla. En declaración, id_importador indica quién presenta la operación. Una **llave compuesta** utiliza varias columnas: en detalle_declaracion la pareja (id_declaracion, id_producto) evita repetir el mismo producto dentro de una declaración [4].

Una relación **1:N** permite que un importador tenga varias declaraciones; la FK se coloca en declaración. Una relación **N:M** permite varios productos por declaración y varias declaraciones por producto; se resuelve con una tabla intermedia. Una relación **1:1** se implementa, por ejemplo, con una FK UNIQUE. Aquí incluimos una relación **recursiva**: un funcionario puede supervisar a otros funcionarios [4, 5].


---




## A. Integridad, SQL y consultas



La **integridad referencial** mantiene conexiones válidas. No debería existir una declaración que apunte a un importador inexistente. Las FK permiten comprobarlo en la propia base. En este proyecto se restringe el borrado de filas que tienen registros dependientes; así se protege su trazabilidad [4].



### Restricciones que utilizamos



| Restricción | Función | Ejemplo |

|---|---|---|

| NOT NULL | Datos obligatorios ausentes | Descripción del producto |

| UNIQUE | Duplicados en una llave candidata | Número de declaración |

| CHECK | Valores que incumplen una condición | cantidad >= 0 en inventario |

| DEFAULT | Valor inicial si no se indica otro | Estado Retenido |

Estas restricciones se complementan. Una FK no impide por sí sola una cantidad negativa; para eso se utiliza CHECK. Una regla que combina varios registros, como no retirar más stock del disponible, también necesita una transacción y comprobaciones del servicio [4].



### DDL y DML



**DDL** define la estructura: CREATE crea objetos, ALTER cambia su definición y DROP los elimina. **DML** trabaja con datos: INSERT agrega filas, UPDATE las actualiza y DELETE las elimina. SELECT consulta; algunos materiales lo agrupan por separado como DQL. Un JOIN es una operación de consulta que relaciona filas de distintas tablas; no es una sentencia independiente [4].

```sql

CREATE TABLE pais (
  id_pais INT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);
INSERT INTO pais VALUES (1, 'China');
SELECT nombre FROM pais WHERE id_pais = 1;
UPDATE pais SET nombre = 'China' WHERE id_pais = 1;
DELETE FROM pais WHERE id_pais = 1;

```

El ejemplo anterior es didáctico y no se ejecuta como parte del agente. En la base real, una eliminación puede ser rechazada si el país ya está referenciado. El agente solo dispone de lectura.



### Preguntas de negocio



JOIN conecta tablas; WHERE filtra filas; GROUP BY forma grupos para calcular totales; ORDER BY ordena los resultados. Para identificar el país con más contenedores, unimos contenedor, declaración y país, agrupamos por país y ordenamos el conteo. Al sumar valores declarados, debemos evitar que una unión con varios contenedores repita cada detalle y aumente artificialmente el total.


---




## A-B. Normalización, diagrama y gestor





### Primera, segunda y tercera forma normal



La **primera forma normal (1FN)** evita grupos repetidos y exige valores atómicos respecto al uso del dato. No guardamos una lista de productos separados por comas dentro de declaración; cada producto aparece como un detalle. La **segunda forma normal (2FN)** añade que cada atributo no primo dependa de toda llave candidata, evitando dependencias parciales. La descripción del producto depende de id_producto, por lo que pertenece a producto y no al detalle cuya llave es compuesta [6].

La **tercera forma normal (3FN)** elimina dependencias transitivas inadecuadas entre atributos no clave. Por eso los datos del importador se guardan en su propia tabla y la declaración conserva su identificador. Esta organización reduce inconsistencias: corregir un teléfono no obliga a cambiar cada declaración histórica [6].



### Diagrama Entidad-Relación



El **DER** muestra entidades, atributos y relaciones antes de implementarlos. La cardinalidad expresa cuántos elementos pueden participar y si la relación es opcional. En **Chen** se representan entidades con rectángulos, relaciones con rombos y atributos con óvalos. La notación de **pata de gallo** utiliza extremos de líneas para indicar uno, muchos y participación opcional. El diagrama entregado usa cardinalidades numéricas explícitas, tipos, PK y FK; incluye su fuente editable [5].

Nuestro modelo tiene 13 tablas. El detalle resuelve la relación N:M. Inventario y movimiento conservan la pareja declaración-producto para no confundir partidas del mismo producto que llegan de países diferentes. La bodega y el estado completan la identificación de cada existencia.



### Comparación de gestores permitidos



| Gestor | Ventaja | Consideración |

|---|---|---|

| SQLite | Archivo local y ausencia de un servidor separado. | Requiere resolver su conexión con n8n. |

| MySQL | Modelo relacional y nodo MySQL en n8n. | Hay que configurar servidor y cuentas. |

| PostgreSQL | Gestor objeto-relacional con SQL y nodo Postgres. | También requiere servidor y credenciales. |

**Elegimos MySQL 8.4** por la integración directa prevista en la guía y la necesidad de practicar cuentas, relaciones y transacciones. SQLite sería útil para una aplicación embebida; PostgreSQL también cumple el objetivo. La elección responde a la implementación del laboratorio, no a que un gestor sea universalmente superior [7, 8, 9].


---




## C. n8n y el agente de consultas



**n8n** permite conectar pasos para automatizar un proceso. Un **workflow** es ese conjunto de nodos y conexiones. Un **nodo** realiza una tarea; un **trigger** inicia una ejecución cuando ocurre un evento. Una **credencial** guarda la información de autenticación necesaria para acceder a un servicio sin escribirla dentro de cada paso [10].

Un **modelo de lenguaje (LLM)** interpreta instrucciones y genera texto; no conoce por sí solo el saldo actual de una bodega. Un **agente** combina el modelo con instrucciones y herramientas para decidir cómo resolver una solicitud. Un chatbot sencillo puede limitarse a responder mensajes; un agente con herramientas puede consultar un sistema externo antes de contestar. Un chatbot también puede incorporar un agente, por lo que ambos términos no son opuestos [9, 10].



### Funcionamiento propuesto



El Chat Trigger recibe la pregunta. Un nodo de validación comprueba que haya texto y un identificador de conversación. El AI Agent interpreta la intención y utiliza el nodo MySQL como herramienta. El modelo redacta la respuesta a partir de las filas obtenidas. Simple Memory conserva interacciones recientes de la misma sesión para entender preguntas de seguimiento [9, 11].

La memoria no sustituye a la base de datos ni garantiza almacenamiento permanente. Si se pregunta por existencias actuales, el agente debe consultar otra vez. Simple Memory es apropiada para la práctica en una instancia sencilla; no debe asumirse que comparte conversaciones entre varios trabajadores en modo de colas [11].



### Consulta segura y verificable



El usuario MySQL del agente recibe **únicamente SELECT** sobre tablas de negocio y una vista pública de funcionarios. No puede acceder a los hashes de contraseña. La protección se aplica con permisos del gestor; escribir en el prompt que no borre información es una instrucción complementaria, no una barrera suficiente [12].

El mensaje de sistema describe tablas, columnas y relaciones. También aclara que valor_declarado es el total de la línea, que las cantidades tienen unidades y que los resultados vacíos no son errores de conexión. El flujo incorpora un filtro preventivo de SQL, pero la cuenta de solo lectura sigue siendo la protección principal. Las consultas generadas deben revisarse y comparar sus resultados con los reportes [9, 12].

La aplicación React agrega login, rutas privadas y consulta por rol. El backend valida la sesión antes de acceder a MySQL y envía las preguntas a n8n. Las claves del modelo y de la base no se incorporan al frontend. Para conectar la web, el chat de n8n se configurará con autenticación y su URL se guardará únicamente en el backend.

**Estado de verificación:** el SQL y la API se ejecutaron en una instancia temporal real de MySQL. El JSON de n8n pasó comprobaciones estructurales y su código de validación se probó aisladamente. La importación y ejecución del agente con un LLM todavía requieren las credenciales del estudiante; no se presentan como realizadas.


---




## D. Dominio aduanero y uso de IA



Una **aduana** controla mercancías que ingresan, salen o circulan bajo determinados regímenes. La **declaración aduanera** comunica a la autoridad el régimen solicitado y los datos necesarios de la operación, como origen, naturaleza y cantidad de las mercancías. En Costa Rica, el DUA forma parte de los procedimientos de declaración [13].

Una **partida o clasificación arancelaria** ubica una mercancía en una nomenclatura. El **Sistema Armonizado**, desarrollado por la Organización Mundial de Aduanas, proporciona una base internacional de clasificación con códigos de seis dígitos, que los países pueden ampliar. Un **arancel** es un derecho aduanero aplicable según la clasificación y las reglas correspondientes. No debe confundirse con el valor comercial de la mercancía [14, 15].



### Regímenes y participantes



**Importación:** ingreso de mercancías conforme al régimen aplicable. **Exportación:** salida al exterior. **Tránsito:** traslado de mercancías bajo control aduanero. **Depósito:** almacenamiento bajo custodia y control aduanero con el tratamiento tributario que corresponda. Estas definiciones son una explicación general para el modelo, no una descripción completa de trámites o plazos legales [13].

El **agente aduanal** participa en la gestión y representación de trámites aduaneros. En nuestro sistema se vincula a las declaraciones que gestiona; el funcionario, en cambio, se relaciona con las inspecciones y los movimientos que registra. Diferenciar sus responsabilidades ayuda a no atribuir una inspección al representante del importador [13].



### Uso de IA



**Herramienta utilizada:** ChatGPT, como apoyo para analizar la guía, proponer el modelo, preparar explicaciones, generar datos sintéticos y revisar el código. Se contrastaron conceptos con documentación oficial y se ejecutaron pruebas de SQL y API. Las personas, empresas y registros del conjunto de prueba son ficticios.

**Instrucciones utilizadas en la conversación:** “analiza este trabajo al maximo” y “yo si quiero que le agregues React, frontend, login, rutas privadas”. Como prompts de apoyo para el estudiante se proponen: “Explica una llave foránea con un ejemplo aduanero” y “Comprueba que los saldos coincidan con entradas, salidas y traslados”.

**Hallazgos del proceso:** conservar el origen exige enlazar las existencias con su declaración; los JOIN pueden duplicar totales si se combinan varios conjuntos sin agregarlos; y los permisos de solo lectura deben probarse en el gestor. También se corrigió una restricción incompatible con una columna autoincremental y un permiso que faltaba para realizar lecturas con bloqueo.

**Revisión personal pendiente:** cada integrante debe ejecutar el proyecto, completar sus datos, explicar las relaciones y añadir lo que aprendió durante sus propias pruebas. Las capturas de las ocho respuestas del agente se obtendrán después de configurar sus credenciales. Este borrador no atribuye al estudiante pruebas o aprendizajes personales que aún no ha realizado.


---




## Fuentes consultadas



[1] PostgreSQL Global Development Group. (s. f.). Concepts. https://www.postgresql.org/docs/current/tutorial-concepts.html


[2] MongoDB. (s. f.). What is NoSQL? https://www.mongodb.com/resources/basics/databases/nosql-explained


[3] Oracle. (s. f.). MySQL 8.4 Reference Manual: Data types. https://dev.mysql.com/doc/refman/8.4/en/data-types.html


[4] Oracle. (s. f.). MySQL 8.4 Reference Manual: CREATE TABLE. https://dev.mysql.com/doc/refman/8.4/en/create-table.html


[5] Oracle. (s. f.). Adding foreign key relationships using an EER diagram. https://dev.mysql.com/doc/workbench/en/wb-relationship-tools.html


[6] IBM. (s. f.). What is database normalization? https://www.ibm.com/think/topics/database-normalization


[7] SQLite. (s. f.). About SQLite. https://www.sqlite.org/about.html


[8] PostgreSQL Global Development Group. (s. f.). About PostgreSQL. https://www.postgresql.org/about/


[9] n8n. (s. f.). MySQL. https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql


[10] n8n. (s. f.). Understand workflows. https://docs.n8n.io/build/understand-workflows.md


[11] n8n. (s. f.). Simple Memory. https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow


[12] Oracle. (s. f.). MySQL 8.4 Reference Manual: GRANT. https://dev.mysql.com/doc/refman/8.4/en/grant.html


[13] Ministerio de Hacienda de Costa Rica. (2021). Manual de procedimientos aduaneros. Secciones de definiciones y procedimientos por régimen. https://www.hacienda.go.cr/docs/Manual_de_Procedimientos_Aduaneros2021_Febrero2021.pdf


[14] Organización Mundial de Aduanas. (s. f.). What is the Harmonized System? https://www.wcoomd.org/Topics/Nomenclature/Overview/What%20is%20the%20Harmonized%20System


[15] Organización Mundial del Comercio. (s. f.). Tariff and trade data. https://www.wto.org/english/tratop_e/tariffs_e/tariff_data_e.htm
