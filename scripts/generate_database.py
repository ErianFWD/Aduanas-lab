"""Genera DER y SQL reproducibles a partir del mismo modelo."""
from pathlib import Path
import json, datetime, subprocess
from decimal import Decimal
from model import TABLES, RELATIONS, EXTRA

ROOT = Path(__file__).resolve().parents[1]
def quote(v):
    if v is None: return 'NULL'
    if isinstance(v, (int,float,Decimal)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

# Primero: diagrama y diccionario, antes de construir el SQL.
dbml = ["// MySQL 8.4 | Aduana Lab3 | Fuente: scripts/model.py", "Project Aduana { database_type: 'MySQL' }"]
dot = ['digraph Aduana {', 'graph [rankdir=LR, bgcolor="#ffffff", pad="0.5", nodesep="0.55", ranksep="1.4", splines=polyline, fontname="Helvetica", label="ADUANA | MODELO RELACIONAL · 13 ENTIDADES\nPK primaria · FK foránea · 1 → N · 0..1 opcional · N:M mediante detalle_declaracion", labelloc=t, fontsize=22];', 'node [shape=plain fontname="Helvetica"];', 'edge [fontname="Helvetica",fontsize=10,color="#64748b",arrowsize=0.7];']
dictionary = ['# Diccionario de datos', '', 'Modelo MySQL 8.4. PK = llave primaria; FK = llave foránea. Ver también restricciones en SQL.', '']
for name, fields in TABLES:
    pks = [n for n,t,k,c in fields if 'PK' in k]
    dbml.append(f'Table {name} {{')
    htmlrows = [f'<TR><TD COLSPAN="3" BGCOLOR="#f4c900"><FONT COLOR="#101010"><B>{name}</B></FONT></TD></TR>']
    dictionary.extend([f'## {name}', '', '| Columna | Tipo | Llave | Regla |', '|---|---|---|---|'])
    for n,t,k,c in fields:
        settings=[]
        if 'PK' in k and len(pks)==1: settings.append('pk')
        if 'AUTO_INCREMENT' in c: settings.append('increment')
        if 'NOT NULL' in c or 'PK' in k: settings.append('not null')
        if 'UNIQUE' in c: settings.append('unique')
        dbml.append(f'  {n} {t.lower()}' + (' ['+', '.join(settings)+']' if settings else ''))
        htmlrows.append(f'<TR><TD ALIGN="LEFT">{k or " "}</TD><TD ALIGN="LEFT">{n}</TD><TD ALIGN="LEFT">{t}</TD></TR>')
        dictionary.append(f'| {n} | {t} | {k or "—"} | {c} |')
    if len(pks)>1: dbml.extend(['  indexes {', '    ('+', '.join(pks)+') [pk]', '  }'])
    dbml.append('}\n')
    dot.append(f'{name} [label=<<TABLE BORDER="1" COLOR="#cbd5e1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="6">'+''.join(htmlrows)+'</TABLE>>];')
    dictionary.append('')
for child,cols,parent,refs,label in RELATIONS:
    cs = cols[0] if len(cols)==1 else '('+', '.join(cols)+')'
    rs = refs[0] if len(refs)==1 else '('+', '.join(refs)+')'
    dbml.append(f'Ref: {child}.{cs} > {parent}.{rs}')
    optional = any('NULL' in f[3] and 'NOT NULL' not in f[3] for f in dict(TABLES)[child] if f[0] in cols)
    dot.append(f'{parent} -> {child} [label="{label}", taillabel="{("0..1" if optional else "1")}", headlabel="0..N", labeldistance=2];')
dot.append('}')
(ROOT/'diagrama/DER_Aduana_Lab3.dbml').write_text('\n'.join(dbml),encoding='utf-8')
(ROOT/'diagrama/DER_Aduana_Lab3.dot').write_text('\n'.join(dot),encoding='utf-8')
(ROOT/'docs/02_Diccionario_de_datos.md').write_text('\n'.join(dictionary),encoding='utf-8')

header = '-- Laboratorio #3 | Inventario aduanero | MySQL 8.4\n-- Integrantes: COMPLETAR NOMBRES Y APELLIDOS\n-- Fecha de preparación: 2026-10-23\n-- Datos sintéticos con fines educativos; importes en USD.\n'
schema = [header, 'CREATE DATABASE IF NOT EXISTS aduana_lab3 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;', 'USE aduana_lab3;', 'SET NAMES utf8mb4;', '']
for name, fields in TABLES:
    defs = [f'  {n} {t} {c}' for n,t,k,c in fields]
    defs.append('  PRIMARY KEY ('+', '.join(n for n,t,k,c in fields if 'PK' in k)+')')
    for index,(ch,cols,pa,refs,label) in enumerate(RELATIONS):
        if ch==name: defs.append(f'  CONSTRAINT fk_{name}_{index} FOREIGN KEY ({", ".join(cols)}) REFERENCES {pa} ({", ".join(refs)}) ON DELETE RESTRICT ON UPDATE RESTRICT')
    defs.extend('  '+s for s in EXTRA.get(name,[]))
    schema.append(f'CREATE TABLE {name} (\n'+',\n'.join(defs)+'\n) ENGINE=InnoDB;\n')
schema.append('''CREATE VIEW v_funcionario_publico AS
SELECT id_funcionario, nombre, cargo, id_supervisor FROM funcionario;
''')
(ROOT/'database/01_schema.sql').write_text('\n'.join(schema),encoding='utf-8')

rows = {t:[] for t,f in TABLES}
countries=[('China','CN'),('México','MX'),('Estados Unidos','US'),('Costa Rica','CR'),('Panamá','PA'),('Colombia','CO'),('Brasil','BR'),('Alemania','DE'),('España','ES'),('Japón','JP'),('Corea del Sur','KR'),('Canadá','CA'),('Chile','CL'),('Perú','PE'),('Guatemala','GT')]
rows['pais']=[[i,*x] for i,x in enumerate(countries,1)]
companies=['Horizonte Comercial','Pacífico Importaciones','Suministros Valle Central','Soluciones del Caribe','Mercantil Roble','Tecnología Volcán','Agroinsumos Brisa','Textiles Colibrí','Equipo Industrial Norte','Distribuidora Litoral','Comercio Monteverde','Casa Logística Sur','Almacenes Aurora','Insumos Ceiba','Comercial Río Claro']
names=['Laura Campos','Diego Solís','Ana Mora','José Vargas','Sofía Rojas','Andrés León','María Quesada','Carlos Chaves','Valeria Soto','Daniel Núñez','Lucía Arias','Pablo Jiménez','Elena Salas','Gabriel Cordero','Natalia Castro']
for i in range(1,16):
    rows['importador'].append([i,companies[i-1]+' S.A.',f'SIM-CR-{i:04d}',f'Zona empresarial, edificio {i}, Costa Rica',f'2200-{1000+i}',f'contacto{i}@importador.example'])
    rows['agente_aduanal'].append([i,names[i-1],f'LIC-DEMO-{i:03d}',f'2400-{2000+i}'])
partidas=[('847130','Computadoras portátiles',5),('851713','Teléfonos inteligentes',5),('852852','Monitores',10),('841810','Refrigeradores',15),('845011','Lavadoras',15),('610910','Camisetas de algodón',14),('640399','Calzado',14),('940360','Muebles de madera',15),('901890','Instrumentos médicos',1),('950300','Juguetes',10),('090111','Café sin tostar',5),('100630','Arroz semiblanqueado',10),('850440','Convertidores estáticos',5),('401110','Neumáticos para automóviles',10),('842121','Filtros de agua',5)]
rows['partida_arancelaria']=[[i,*p] for i,p in enumerate(partidas,1)]
products=[('Computadora portátil 14 pulgadas',650,1.8,1),('Teléfono inteligente 128 GB',240,.25,2),('Monitor LED 24 pulgadas',160,3.2,3),('Refrigerador 300 litros',450,58,4),('Lavadora automática 12 kg',380,62,5),('Camiseta de algodón talla M',8,.18,6),('Zapatos de cuero talla 40',35,.9,7),('Mesa de madera para comedor',180,25,8),('Tensiómetro digital',30,.4,9),('Juego de bloques educativos',12,.7,10),('Café verde en saco 25 kg',95,25,11),('Arroz en saco 20 kg',22,20,12),('Cargador USB-C 65 W',15,.15,13),('Neumático radial 205/55 R16',55,9.5,14),('Filtro doméstico de agua',45,2.5,15),('Computadora portátil 16 pulgadas',850,2.2,1),('Teléfono inteligente 256 GB',320,.28,2),('Monitor LED 27 pulgadas',210,4.5,3),('Camiseta de algodón talla L',9,.2,6),('Mesa auxiliar de madera',75,8,8)]
rows['producto']=[[i,f'ADU-{i:04d}',p[0],'unidad',p[1],p[2],p[3]] for i,p in enumerate(products,1)]
password_hash = subprocess.check_output(['node','--input-type=module','-e',"import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('Aduana2026!',10))"],cwd=ROOT/'backend',text=True).strip()
for i,n in enumerate(names,1):
    role='admin' if i==1 else ('operador' if i<=6 else 'consulta')
    email = {'admin':'admin@aduana.local','operador':'operador@aduana.local','consulta':'consulta@aduana.local'}[role] if i in [1,2,7] else f'funcionario{i}@aduana.local'
    rows['funcionario'].append([i,n, 'Supervisora' if i==1 else ('Inspector' if i<=6 else 'Analista'),None if i==1 else (1 if i<7 else 2),email,password_hash,role,1,0])
locations=['Limón, terminal Moín','Limón, zona logística','Caldera, Puntarenas','Alajuela, aeropuerto','Peñas Blancas, Guanacaste','Paso Canoas, Puntarenas','San José, parque industrial','Heredia, zona franca','Cartago, centro logístico','Guápiles, Pococí','Liberia, Guanacaste','Pérez Zeledón, San José','Santa Ana, San José','San Carlos, Alajuela','El Coyol, Alajuela']
rows['bodega']=[[i,f'Bodega {i:02d}',loc,50000+i*2500] for i,loc in enumerate(locations,1)]
for i in range(1,31):
    date=f'2026-09-{i+8:02d}' if i<5 else f'2026-10-{1+(i-5)%20:02d}'
    regime={0:'Exportacion',1:'Importacion',2:'Importacion',3:'Deposito',4:'Transito'}[i%5]
    state='Retenida' if i%3==1 else ('En inspeccion' if i%3==2 else 'Liberada')
    rows['declaracion'].append([i,f'DUA-2026-{i:04d}',date,regime,state,'USD',1+(i-1)%15,1+(i+2)%15,1+(i-1)%15])
    rows['contenedor'].append([i,f'ADUU{i:07d}','Seco 40 pies' if i%2 else 'Seco 20 pies',6000+i*90,i])
    if i<=10: rows['contenedor'].append([30+i,f'ADUU{30+i:07d}','Refrigerado 40 pies',8000+i*70,i])
    for j,pid in enumerate([1+(i-1)%20,1+(i+6)%20]):
        quantity=100+i*7+j*25
        total=Decimal(str(products[pid-1][1]))*Decimal(quantity)
        rows['detalle_declaracion'].append([i,pid,quantity,total])
        bodega=1+(i+j-1)%15
        estado='Liberado' if state=='Liberada' else 'Retenido'
        received=quantity-(30 if i%4==0 else 0)
        rows['inventario'].append([len(rows['inventario'])+1,i,pid,bodega,received,date,estado])
        rows['movimiento'].append([len(rows['movimiento'])+1,f'SEED-ENT-{i}-{pid}','Entrada',date+' 09:00:00',received,i,pid,None,bodega,estado,1+(i-1)%6,'Ingreso inicial de partida'])
        # Traslados y salidas con saldo conciliado.
        if i%2==0:
            dest=1+bodega%15
            amount=20
            rows['inventario'][-1][4]-=amount
            rows['inventario'].append([len(rows['inventario'])+1,i,pid,dest,amount,date,estado])
            rows['movimiento'].append([len(rows['movimiento'])+1,f'SEED-TRA-{i}-{pid}','Traslado',date+' 11:00:00',amount,i,pid,bodega,dest,estado,2,'Reubicación interna'])
        if estado=='Liberado':
            # La fila original de esta partida en bodega se identifica explícitamente.
            original=next(r for r in rows['inventario'] if r[1:4]==[i,pid,bodega])
            original[4]-=10
            rows['movimiento'].append([len(rows['movimiento'])+1,f'SEED-SAL-{i}-{pid}','Salida',date+' 14:00:00',10,i,pid,bodega,None,estado,3,'Retiro autorizado'])
    if i<=25:
        result='Aprobada' if state=='Liberada' else ('Con observaciones' if state=='En inspeccion' else 'Rechazada')
        observations={'Aprobada':'Documentos y mercancía verificados.','Con observaciones':'Se requiere aclarar la descripción comercial.','Rechazada':'Diferencia en la documentación de origen; permanece retenida.'}[result]
        rows['inspeccion'].append([i,date+' 10:00:00',result,observations,i,1+(i-1)%6])
seed = [header,'USE aduana_lab3;','START TRANSACTION;']
for name, fields in TABLES:
    seed.append(f'\n-- {name}: {len(rows[name])} registros')
    seed.append(f'INSERT INTO {name} ({", ".join(f[0] for f in fields)}) VALUES\n'+',\n'.join('('+', '.join(quote(v) for v in row)+')' for row in rows[name])+';')
seed.append('COMMIT;')
(ROOT/'database/02_seed.sql').write_text('\n'.join(seed),encoding='utf-8')
(ROOT/'docs/conteos_esperados.json').write_text(json.dumps({t:len(r) for t,r in rows.items()},indent=2),encoding='utf-8')

queries=[
 ('Declaraciones de importación en octubre de 2026', "SELECT p.nombre AS pais_origen, COUNT(*) AS declaraciones\nFROM declaracion d JOIN pais p ON p.id_pais=d.id_pais_origen\nWHERE d.regimen='Importacion' AND d.fecha >= '2026-10-01' AND d.fecha < '2026-11-01'\nGROUP BY p.id_pais,p.nombre ORDER BY declaraciones DESC,p.nombre;"),
 ('Mercancías retenidas y su origen por bodega', "SELECT p.descripcion AS producto, pa.nombre AS pais_origen, b.nombre AS bodega, d.numero AS declaracion, i.cantidad\nFROM inventario i JOIN producto p ON p.id_producto=i.id_producto\nJOIN declaracion d ON d.id_declaracion=i.id_declaracion\nJOIN pais pa ON pa.id_pais=d.id_pais_origen JOIN bodega b ON b.id_bodega=i.id_bodega\nWHERE i.estado='Retenido' AND i.cantidad>0 ORDER BY b.nombre,p.descripcion,d.numero;"),
 ('Países con más contenedores recibidos', "SELECT p.nombre AS pais_origen, COUNT(c.id_contenedor) AS contenedores\nFROM contenedor c JOIN declaracion d ON d.id_declaracion=c.id_declaracion\nJOIN pais p ON p.id_pais=d.id_pais_origen GROUP BY p.id_pais,p.nombre\nORDER BY contenedores DESC,p.nombre;"),
 ('Importadores con mayor valor total declarado en USD', "SELECT i.razon_social, SUM(dd.valor_declarado) AS valor_total_usd\nFROM importador i JOIN declaracion d ON d.id_importador=i.id_importador\nJOIN detalle_declaracion dd ON dd.id_declaracion=d.id_declaracion\nGROUP BY i.id_importador,i.razon_social ORDER BY valor_total_usd DESC,i.razon_social;"),
 ('Inspecciones con observaciones y su funcionario', "SELECT d.numero AS declaracion, ins.fecha, f.nombre AS funcionario, ins.observaciones\nFROM inspeccion ins JOIN declaracion d ON d.id_declaracion=ins.id_declaracion\nJOIN v_funcionario_publico f ON f.id_funcionario=ins.id_funcionario\nWHERE ins.resultado='Con observaciones' ORDER BY ins.fecha DESC,ins.id_inspeccion DESC;"),
 ('Stock del producto ADU-0001 en todas las bodegas', "SELECT p.sku,p.descripcion,p.unidad_medida,b.nombre AS bodega,i.estado,SUM(i.cantidad) AS cantidad\nFROM inventario i JOIN producto p ON p.id_producto=i.id_producto\nJOIN bodega b ON b.id_bodega=i.id_bodega WHERE p.sku='ADU-0001'\nGROUP BY p.id_producto,p.sku,p.descripcion,p.unidad_medida,b.id_bodega,b.nombre,i.estado\nORDER BY b.nombre,i.estado;"),
 ('Ocupación de bodegas en kilogramos y estado', "SELECT b.nombre,i.estado,SUM(i.cantidad*p.peso_unitario_kg) AS peso_ocupado_kg,\n b.capacidad_peso_kg, ROUND(100*SUM(i.cantidad*p.peso_unitario_kg)/b.capacidad_peso_kg,2) AS porcentaje_capacidad\nFROM bodega b JOIN inventario i ON i.id_bodega=b.id_bodega\nJOIN producto p ON p.id_producto=i.id_producto\nGROUP BY b.id_bodega,b.nombre,b.capacidad_peso_kg,i.estado ORDER BY b.nombre,i.estado;"),
 ('Movimientos de octubre de 2026 por tipo y producto', "SELECT m.tipo,p.sku,p.descripcion,p.unidad_medida,COUNT(*) AS operaciones,SUM(m.cantidad) AS cantidad\nFROM movimiento m JOIN producto p ON p.id_producto=m.id_producto\nWHERE m.fecha>='2026-10-01' AND m.fecha<'2026-11-01'\nGROUP BY m.tipo,p.id_producto,p.sku,p.descripcion,p.unidad_medida ORDER BY m.tipo,p.sku;")
]
query_sql=header+'USE aduana_lab3;\n\n'+'\n\n'.join(f'-- CONSULTA {i}: {title}\n{q}' for i,(title,q) in enumerate(queries,1))+'\n'
(ROOT/'database/03_consultas.sql').write_text(query_sql,encoding='utf-8')
(ROOT/'database/Aduana_Lab3.sql').write_text('\n'.join(schema)+'\n'+'\n'.join(seed)+'\n'+query_sql,encoding='utf-8')
(ROOT/'database/reportes.json').write_text(json.dumps([{'id':i,'titulo':t,'sql':q} for i,(t,q) in enumerate(queries,1)],ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'tablas':len(rows),'registros':sum(len(r) for r in rows.values()),'conteos':{t:len(r) for t,r in rows.items()}},ensure_ascii=False))
