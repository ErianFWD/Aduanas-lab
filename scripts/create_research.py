from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xml.sax.saxutils import escape
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/Investigacion_Aduana_Lab3.pdf'
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('Research',font));pdfmetrics.registerFont(TTFont('Research-Bold',bold))
pdfmetrics.registerFontFamily('Research',normal='Research',bold='Research-Bold',italic='Research',boldItalic='Research-Bold')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyResearch',fontName='Research',fontSize=9.6,leading=14.4,spaceAfter=9,textColor=colors.HexColor('#24262b')))
styles.add(ParagraphStyle(name='HeadingResearch',fontName='Research-Bold',fontSize=15,leading=21,spaceBefore=8,spaceAfter=12,textColor=colors.HexColor('#151619')))
styles.add(ParagraphStyle(name='SubResearch',fontName='Research-Bold',fontSize=10.5,leading=15,spaceBefore=7,spaceAfter=6))
styles.add(ParagraphStyle(name='ReferenceResearch',fontName='Research',fontSize=8.0,leading=11.7,spaceAfter=9,wordWrap='CJK'))
story=[];markdown=[]
def p(text):
    story.append(Paragraph(text,styles['BodyResearch']));markdown.append(text.replace('<b>','**').replace('</b>','**'))
def h(text):story.append(Paragraph(text,styles['HeadingResearch']));markdown.extend(['', '## '+text,''])
def sub(text):story.append(Paragraph(text,styles['SubResearch']));markdown.extend(['','### '+text,''])
def page():story.append(PageBreak());markdown.append('\n---\n')
def code(text):story.append(Preformatted(text,ParagraphStyle('CodeResearch',fontName='Courier',fontSize=8,leading=11,spaceBefore=3,spaceAfter=10)));markdown.extend(['```sql',text,'```'])

h('Laboratorio 3 | Inventario aduanero')
p('<b>Asignatura:</b> Bases de Datos. <b>Fecha de preparación:</b> 23 de octubre de 2026.<br/><b>Integrantes:</b> __________________________________________')
p('Este trabajo propone organizar el inventario de una aduana en una base relacional y consultar sus datos con un agente de n8n. El propósito es entender qué se guarda, cómo se relaciona y por qué una respuesta debe poder comprobarse mediante SQL.')
sub('A. Fundamentos de bases de datos')
p('Una <b>base de datos</b> reúne información organizada para consultarla y mantenerla. Un <b>Sistema Gestor de Bases de Datos (SGBD)</b> administra esa información, ejecuta consultas y aplica reglas. En este proyecto, aduana_lab3.sqlite es el archivo de datos y SQLite es el gestor integrado en el backend [1, 7].')
p('El modelo <b>relacional</b> representa la información mediante tablas conectadas por llaves. NoSQL comprende otros modelos, como documentos, grafos o pares clave-valor. Puede ofrecer estructuras flexibles; eso no significa que carezca de reglas ni que sea siempre mejor. Elegimos un modelo relacional porque necesitamos relacionar declaraciones, productos y bodegas con integridad referencial [1, 2].')
p('Una <b>tabla</b> representa un conjunto, como los productos. Un <b>registro o fila</b> describe un elemento concreto. Un <b>campo o columna</b> identifica un atributo. En SQLite usamos INTEGER para identificadores autoincrementales. VARCHAR y CHAR se aceptan con afinidad de texto; DATE y DATETIME almacenan nuestras fechas en formato ISO. SQLite no impone por sí solo la longitud escrita en VARCHAR(n) [3].')
p('Conservamos declaraciones <b>DECIMAL</b> para expresar la intención del modelo, pero SQLite les asigna afinidad NUMERIC y no garantiza una escala decimal fija. La aplicación valida tres decimales para cantidades y redondea las actualizaciones; los importes se muestran con dos decimales. Puede haber aproximación binaria: una aplicación financiera real debería usar unidades enteras o aritmética decimal específica. Los valores están en USD y los pesos en kg [3].')
sub('Llaves y relaciones')
p('La <b>llave primaria (PK)</b> identifica una fila sin repetirse ni quedar vacía. La <b>llave foránea (FK)</b> referencia una llave de otra tabla. En declaración, id_importador indica quién presenta la operación. Una <b>llave compuesta</b> utiliza varias columnas: en detalle_declaracion la pareja (id_declaracion, id_producto) evita repetir el mismo producto dentro de una declaración [4].')
p('Una relación <b>1:N</b> permite que un importador tenga varias declaraciones; la FK se coloca en declaración. Una relación <b>N:M</b> permite varios productos por declaración y varias declaraciones por producto; se resuelve con una tabla intermedia. Una relación <b>1:1</b> se implementa, por ejemplo, con una FK UNIQUE. Aquí incluimos una relación <b>recursiva</b>: un funcionario puede supervisar a otros funcionarios [4, 5].')

page();h('A. Integridad, SQL y consultas')
p('La <b>integridad referencial</b> mantiene conexiones válidas. No debería existir una declaración que apunte a un importador inexistente. Las FK permiten comprobarlo en la propia base. En este proyecto se restringe el borrado de filas que tienen registros dependientes; así se protege su trazabilidad [4].')
sub('Restricciones que utilizamos')
data=[['Restricción','Qué evita o establece','Ejemplo del sistema'],['NOT NULL','Datos obligatorios ausentes','Descripción del producto'],['UNIQUE','Duplicados en una llave candidata','Número de declaración'],['CHECK','Valores que incumplen una condición','cantidad >= 0 en inventario'],['DEFAULT','Valor inicial si no se indica otro','Estado Retenido']]
table=Table([[Paragraph(escape(c),styles['ReferenceResearch']) for c in row] for row in data],colWidths=[83,190,233],hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f4cd38')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),3),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#d8dadd'))]))
story.append(table);story.append(Spacer(1,12));markdown.extend(['| Restricción | Función | Ejemplo |','|---|---|---|']+['| '+' | '.join(r)+' |' for r in data[1:]])
p('Estas restricciones se complementan. Una FK no impide por sí sola una cantidad negativa; para eso se utiliza CHECK. Una regla que combina varios registros, como no retirar más stock del disponible, también necesita una transacción y comprobaciones del servicio [4].')
sub('DDL y DML')
p('<b>DDL</b> define la estructura: CREATE crea objetos, ALTER cambia su definición y DROP los elimina. <b>DML</b> trabaja con datos: INSERT agrega filas, UPDATE las actualiza y DELETE las elimina. SELECT consulta; algunos materiales lo agrupan por separado como DQL. Un JOIN es una operación de consulta que relaciona filas de distintas tablas; no es una sentencia independiente [4].')
code("CREATE TABLE pais (\n  id_pais INT PRIMARY KEY,\n  nombre VARCHAR(60) NOT NULL UNIQUE\n);\nINSERT INTO pais VALUES (1, 'China');\nSELECT nombre FROM pais WHERE id_pais = 1;\nUPDATE pais SET nombre = 'China' WHERE id_pais = 1;\nDELETE FROM pais WHERE id_pais = 1;")
p('El ejemplo anterior es didáctico y no se ejecuta como parte del agente. En la base real, una eliminación puede ser rechazada si el país ya está referenciado. El agente solo dispone de lectura.')
sub('Preguntas de negocio')
p('JOIN conecta tablas; WHERE filtra filas; GROUP BY forma grupos para calcular totales; ORDER BY ordena los resultados. Para identificar el país con más contenedores, unimos contenedor, declaración y país, agrupamos por país y ordenamos el conteo. Al sumar valores declarados, debemos evitar que una unión con varios contenedores repita cada detalle y aumente artificialmente el total.')

page();h('A-B. Normalización y elección del gestor')
sub('Primera, segunda y tercera forma normal')
p('La <b>primera forma normal (1FN)</b> evita grupos repetidos y exige valores atómicos respecto al uso del dato. No guardamos una lista de productos separados por comas dentro de declaración; cada producto aparece como un detalle. La <b>segunda forma normal (2FN)</b> añade que cada atributo no primo dependa de toda llave candidata, evitando dependencias parciales. La descripción del producto depende de id_producto, por lo que pertenece a producto y no al detalle cuya llave es compuesta [6].')
p('La <b>tercera forma normal (3FN)</b> elimina dependencias transitivas inadecuadas entre atributos no clave. Por eso los datos del importador se guardan en su propia tabla y la declaración conserva su identificador. Esta organización reduce inconsistencias: corregir un teléfono no obliga a cambiar cada declaración histórica [6].')
sub('Diagrama Entidad-Relación')
p('El <b>DER</b> muestra entidades, atributos y relaciones antes de implementarlos. La cardinalidad expresa cuántos elementos pueden participar y si la relación es opcional. En <b>Chen</b> se representan entidades con rectángulos, relaciones con rombos y atributos con óvalos. La notación de <b>pata de gallo</b> utiliza extremos de líneas para indicar uno, muchos y participación opcional. Estas notaciones permiten interpretar las relaciones de un modelo antes de escribir el SQL [5].')
sub('Comparación de gestores permitidos')
comparison=[['Gestor','Ventaja para este laboratorio','Consideración'],['SQLite','Archivo local y ausencia de un servidor separado.','Requiere resolver su conexión con n8n.'],['MySQL','Modelo relacional y nodo MySQL en n8n.','Hay que configurar servidor y cuentas.'],['PostgreSQL','Gestor objeto-relacional con SQL y nodo Postgres.','También requiere servidor y credenciales.']]
t=Table([[Paragraph(escape(c),styles['ReferenceResearch']) for c in row] for row in comparison],colWidths=[80,215,211],hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f4cd38')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#d8dadd'))]));story.append(t);story.append(Spacer(1,10));markdown.extend(['| Gestor | Ventaja | Consideración |','|---|---|---|']+['| '+' | '.join(r)+' |' for r in comparison[1:]])
p('<b>Elegimos SQLite</b> porque permite ejecutar el laboratorio sin instalar ni administrar otro servidor. La base se crea a partir del script SQL y se guarda en un archivo. La conexión con n8n se resuelve mediante una herramienta HTTP que llama al backend. MySQL y PostgreSQL también cumplen la consigna, pero necesitan un servidor separado [7, 8, 9].')

page();h('C. n8n y el agente de consultas')
p('<b>n8n</b> permite conectar pasos para automatizar un proceso. Un <b>workflow</b> es ese conjunto de nodos y conexiones. Un <b>nodo</b> realiza una tarea; un <b>trigger</b> inicia una ejecución cuando ocurre un evento. Una <b>credencial</b> guarda la información de autenticación necesaria para acceder a un servicio sin escribirla dentro de cada paso [10].')
p('Un <b>modelo de lenguaje (LLM)</b> interpreta instrucciones y genera texto; no conoce por sí solo el saldo actual de una bodega. Un <b>agente</b> combina el modelo con instrucciones y herramientas para decidir cómo resolver una solicitud. Un chatbot sencillo puede limitarse a responder mensajes; un agente con herramientas puede consultar un sistema externo antes de contestar. Un chatbot también puede incorporar un agente, por lo que ambos términos no son opuestos [9, 10].')
sub('Funcionamiento propuesto')
p('El Chat Trigger recibe la pregunta. El AI Agent interpreta la intención y elige uno de ocho informes disponibles mediante HTTP Request. El backend valida una clave de acceso y ejecuta el SELECT preparado sobre SQLite. El modelo redacta la respuesta usando las filas obtenidas. Simple Memory conserva el contexto de la sesión. El flujo tiene cinco nodos [9, 11].')
p('La memoria no sustituye a la base de datos ni garantiza almacenamiento permanente. Si se pregunta por existencias actuales, el agente debe consultar otra vez. Simple Memory es apropiada para la práctica en una instancia sencilla; no debe asumirse que comparte conversaciones entre varios trabajadores en modo de colas [11].')
sub('Consulta segura y verificable')
p('SQLite no administra usuarios con GRANT como MySQL. El agente accede a una ruta protegida por una clave privada. Esa ruta usa una conexión SQLite abierta en <b>modo de solo lectura</b> y solo admite ocho consultas predefinidas, con parámetros validados. No admite SQL libre ni devuelve hashes de contraseña. La protección existe en el servicio y en la conexión, además del prompt [12].')
p('El mensaje de sistema describe tablas, columnas y los ocho informes disponibles. Aclara que valor_declarado es el total de la línea y que las cantidades tienen unidades. El agente selecciona un informe, no escribe SQL. Las respuestas incluyen como máximo cien filas; si están truncadas, no se deben presentar sumas parciales como totales. Una pregunta fuera del alcance se informa al usuario [9].')
p('La aplicación React agrega login, rutas privadas y permisos por rol. El backend valida la sesión antes de consultar SQLite y envía las preguntas a n8n. Las claves del modelo y del agente no se incorporan al frontend. Para conectar la web, el chat de n8n se configura con autenticación y su URL se guarda únicamente en el backend.')
p('<b>Estado de verificación:</b> el script y la API se ejecutaron sobre un archivo SQLite temporal. Se comprobaron autenticación, movimientos, restricciones, reportes y la ruta de consulta del agente. El JSON de n8n pasó revisión estructural; su importación y ejecución con un LLM requieren las credenciales del estudiante y no se presentan como realizadas.')

page();h('D. Dominio aduanero y uso de IA')
p('Una <b>aduana</b> controla mercancías que ingresan, salen o circulan bajo determinados regímenes. La <b>declaración aduanera</b> comunica a la autoridad el régimen solicitado y los datos necesarios de la operación, como origen, naturaleza y cantidad de las mercancías. En Costa Rica, el DUA forma parte de los procedimientos de declaración [13].')
p('Una <b>partida o clasificación arancelaria</b> ubica una mercancía en una nomenclatura. El <b>Sistema Armonizado</b>, desarrollado por la Organización Mundial de Aduanas, proporciona una base internacional de clasificación con códigos de seis dígitos, que los países pueden ampliar. Un <b>arancel</b> es un derecho aduanero aplicable según la clasificación y las reglas correspondientes. No debe confundirse con el valor comercial de la mercancía [14, 15].')
sub('Regímenes y participantes')
p('<b>Importación:</b> ingreso de mercancías conforme al régimen aplicable. <b>Exportación:</b> salida al exterior. <b>Tránsito:</b> traslado de mercancías bajo control aduanero. <b>Depósito:</b> almacenamiento bajo custodia y control aduanero con el tratamiento tributario que corresponda. Estas definiciones son una explicación general para el modelo, no una descripción completa de trámites o plazos legales [13].')
p('El <b>agente aduanal</b> participa en la gestión y representación de trámites aduaneros. En nuestro sistema se vincula a las declaraciones que gestiona; el funcionario, en cambio, se relaciona con las inspecciones y los movimientos que registra. Diferenciar sus responsabilidades ayuda a no atribuir una inspección al representante del importador [13].')
sub('Uso de IA')
p('<b>Herramienta utilizada:</b> ChatGPT, como apoyo para analizar la guía, proponer el modelo, preparar explicaciones, generar datos sintéticos y revisar el código. Se contrastaron conceptos con documentación oficial y se ejecutaron pruebas de SQL y API. Las personas, empresas y registros del conjunto de prueba son ficticios.')
p('<b>Instrucciones utilizadas en la conversación:</b> “analiza este trabajo al maximo” y “yo si quiero que le agregues React, frontend, login, rutas privadas”. Como prompts de apoyo para el estudiante se proponen: “Explica una llave foránea con un ejemplo aduanero” y “Comprueba que los saldos coincidan con entradas, salidas y traslados”.')
p('<b>Hallazgos del proceso:</b> conservar el origen exige enlazar las existencias con su declaración; un JOIN puede duplicar totales; y la lectura segura debe comprobarse fuera del prompt. La adaptación a SQLite requirió cambiar autoincrementos, consultas de fechas y transacciones. La conexión HTTP simplifica n8n a cambio de limitar el agente a ocho informes preparados.')
p('<b>Revisión personal pendiente:</b> cada integrante debe ejecutar el proyecto, completar sus datos, explicar las relaciones y añadir lo que aprendió durante sus propias pruebas. Las capturas de las ocho respuestas del agente se obtendrán después de configurar sus credenciales. Este borrador no atribuye al estudiante pruebas o aprendizajes personales que aún no ha realizado.')

page();h('Fuentes consultadas')
refs=[
('1','PostgreSQL Global Development Group. (s. f.). Concepts.','https://www.postgresql.org/docs/current/tutorial-concepts.html'),
('2','MongoDB. (s. f.). What is NoSQL?','https://www.mongodb.com/resources/basics/databases/nosql-explained'),
('3','SQLite. (s. f.). Datatypes in SQLite.','https://www.sqlite.org/datatype3.html'),
('4','SQLite. (s. f.). CREATE TABLE.','https://www.sqlite.org/lang_createtable.html'),
('5','Oracle. (s. f.). Adding foreign key relationships using an EER diagram.','https://dev.mysql.com/doc/workbench/en/wb-relationship-tools.html'),
('6','IBM. (s. f.). What is database normalization?','https://www.ibm.com/think/topics/database-normalization'),
('7','SQLite. (s. f.). About SQLite.','https://www.sqlite.org/about.html'),
('8','PostgreSQL Global Development Group. (s. f.). About PostgreSQL.','https://www.postgresql.org/about/'),
('9','n8n. (s. f.). HTTP Request.','https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/'),
('10','n8n. (s. f.). Understand workflows.','https://docs.n8n.io/build/understand-workflows.md'),
('11','n8n. (s. f.). Simple Memory.','https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow'),
('12','Node.js. (s. f.). SQLite: DatabaseSync y readOnly.','https://nodejs.org/docs/latest-v24.x/api/sqlite.html'),
('13','Ministerio de Hacienda de Costa Rica. (2021). Manual de procedimientos aduaneros. Secciones de definiciones y procedimientos por régimen.','https://www.hacienda.go.cr/docs/Manual_de_Procedimientos_Aduaneros2021_Febrero2021.pdf'),
('14','Organización Mundial de Aduanas. (s. f.). What is the Harmonized System?','https://www.wcoomd.org/Topics/Nomenclature/Overview/What%20is%20the%20Harmonized%20System'),
('15','Organización Mundial del Comercio. (s. f.). Tariff and trade data.','https://www.wto.org/english/tratop_e/tariffs_e/tariff_data_e.htm')]
for n,title,url in refs:
    story.append(Paragraph(f'[{n}] {escape(title)}<br/><link href="{escape(url)}" color="#766000">Abrir fuente: {escape(urlparse(url).netloc)}</link>',styles['ReferenceResearch']));markdown.append(f'[{n}] {title} {url}\n')
story.append(Spacer(1,5));story.append(Paragraph('Consulta: 23 de octubre de 2026. Las fuentes se usan para explicar conceptos. Los códigos, tasas, nombres y operaciones del conjunto de datos son didácticos y no sustituyen información oficial de una operación real.',styles['ReferenceResearch']))

def frame(canvas,doc):
    w,h=letter;canvas.setFillColor(colors.HexColor('#17181a'));canvas.rect(0,h-27,w,27,fill=1,stroke=0);canvas.setFillColor(colors.HexColor('#f3cb2f'));canvas.setFont('Research-Bold',8);canvas.drawString(48,h-18,'ADUANA / LABORATORIO 03');canvas.setFillColor(colors.HexColor('#686b72'));canvas.setFont('Research',7);canvas.drawString(48,27,'BASES DE DATOS · BORRADOR PARA REVISAR Y PERSONALIZAR');canvas.drawRightString(w-48,27,f'{doc.page} / 6')
doc=SimpleDocTemplate(str(OUT),pagesize=letter,leftMargin=48,rightMargin=48,topMargin=48,bottomMargin=48,title='Investigación | Inventario aduanero · Laboratorio 3',author='Integrantes por completar')
doc.build(story,onFirstPage=frame,onLaterPages=frame)
(ROOT/'docs/Investigacion_Aduana_Lab3.md').write_text('\n\n'.join(markdown),encoding='utf-8')
print(str(OUT))
