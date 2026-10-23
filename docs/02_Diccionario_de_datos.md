# Diccionario de datos

Modelo MySQL 8.4. PK = llave primaria; FK = llave foránea. Ver también restricciones en SQL.

## pais

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_pais | INT | PK | AUTO_INCREMENT |
| nombre | VARCHAR(60) | — | NOT NULL UNIQUE |
| codigo_iso | CHAR(2) | — | NOT NULL UNIQUE |

## importador

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_importador | INT | PK | AUTO_INCREMENT |
| razon_social | VARCHAR(120) | — | NOT NULL |
| identificacion | VARCHAR(25) | — | NOT NULL UNIQUE |
| direccion | VARCHAR(200) | — | NOT NULL |
| telefono | VARCHAR(25) | — | NOT NULL |
| correo | VARCHAR(120) | — | NOT NULL UNIQUE |

## agente_aduanal

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_agente | INT | PK | AUTO_INCREMENT |
| nombre | VARCHAR(100) | — | NOT NULL |
| licencia | VARCHAR(25) | — | NOT NULL UNIQUE |
| telefono | VARCHAR(25) | — | NOT NULL |

## partida_arancelaria

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_partida | INT | PK | AUTO_INCREMENT |
| codigo | VARCHAR(12) | — | NOT NULL UNIQUE |
| descripcion | VARCHAR(180) | — | NOT NULL |
| porcentaje_arancel | DECIMAL(5,2) | — | NOT NULL DEFAULT 0 CHECK (porcentaje_arancel BETWEEN 0 AND 100) |

## producto

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_producto | INT | PK | AUTO_INCREMENT |
| sku | VARCHAR(30) | — | NOT NULL UNIQUE |
| descripcion | VARCHAR(140) | — | NOT NULL |
| unidad_medida | VARCHAR(15) | — | NOT NULL DEFAULT 'unidad' |
| valor_referencia | DECIMAL(14,2) | — | NOT NULL CHECK (valor_referencia >= 0) |
| peso_unitario_kg | DECIMAL(12,3) | — | NOT NULL CHECK (peso_unitario_kg > 0) |
| id_partida | INT | FK | NOT NULL |

## funcionario

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_funcionario | INT | PK | NOT NULL |
| nombre | VARCHAR(100) | — | NOT NULL |
| cargo | VARCHAR(60) | — | NOT NULL |
| id_supervisor | INT | FK | NULL |
| correo | VARCHAR(120) | — | NOT NULL UNIQUE |
| password_hash | VARCHAR(255) | — | NOT NULL |
| rol | VARCHAR(15) | — | NOT NULL DEFAULT 'consulta' CHECK (rol IN ('admin','operador','consulta')) |
| activo | BOOLEAN | — | NOT NULL DEFAULT TRUE |
| session_version | INT | — | NOT NULL DEFAULT 0 |

## declaracion

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_declaracion | INT | PK | AUTO_INCREMENT |
| numero | VARCHAR(25) | — | NOT NULL UNIQUE |
| fecha | DATE | — | NOT NULL |
| regimen | VARCHAR(15) | — | NOT NULL CHECK (regimen IN ('Importacion','Exportacion','Transito','Deposito')) |
| estado | VARCHAR(20) | — | NOT NULL DEFAULT 'Registrada' CHECK (estado IN ('Registrada','En inspeccion','Retenida','Liberada','Cerrada')) |
| moneda | CHAR(3) | — | NOT NULL DEFAULT 'USD' CHECK (moneda = 'USD') |
| id_importador | INT | FK | NOT NULL |
| id_agente | INT | FK | NOT NULL |
| id_pais_origen | INT | FK | NOT NULL |

## detalle_declaracion

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_declaracion | INT | PK,FK | NOT NULL |
| id_producto | INT | PK,FK | NOT NULL |
| cantidad | DECIMAL(12,3) | — | NOT NULL CHECK (cantidad > 0) |
| valor_declarado | DECIMAL(14,2) | — | NOT NULL CHECK (valor_declarado >= 0) |

## contenedor

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_contenedor | INT | PK | AUTO_INCREMENT |
| numero | VARCHAR(15) | — | NOT NULL UNIQUE |
| tipo | VARCHAR(25) | — | NOT NULL |
| peso_bruto_kg | DECIMAL(12,3) | — | NOT NULL CHECK (peso_bruto_kg > 0) |
| id_declaracion | INT | FK | NOT NULL |

## bodega

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_bodega | INT | PK | AUTO_INCREMENT |
| nombre | VARCHAR(80) | — | NOT NULL UNIQUE |
| ubicacion | VARCHAR(160) | — | NOT NULL |
| capacidad_peso_kg | DECIMAL(14,3) | — | NOT NULL CHECK (capacidad_peso_kg > 0) |

## inventario

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_inventario | INT | PK | AUTO_INCREMENT |
| id_declaracion | INT | FK | NOT NULL |
| id_producto | INT | FK | NOT NULL |
| id_bodega | INT | FK | NOT NULL |
| cantidad | DECIMAL(12,3) | — | NOT NULL DEFAULT 0 CHECK (cantidad >= 0) |
| fecha_ingreso | DATE | — | NOT NULL |
| estado | VARCHAR(10) | — | NOT NULL DEFAULT 'Retenido' CHECK (estado IN ('Retenido','Liberado')) |

## movimiento

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_movimiento | INT | PK | AUTO_INCREMENT |
| referencia | VARCHAR(50) | — | NOT NULL UNIQUE |
| tipo | VARCHAR(10) | — | NOT NULL CHECK (tipo IN ('Entrada','Salida','Traslado')) |
| fecha | DATETIME | — | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| cantidad | DECIMAL(12,3) | — | NOT NULL CHECK (cantidad > 0) |
| id_declaracion | INT | FK | NOT NULL |
| id_producto | INT | FK | NOT NULL |
| id_bodega_origen | INT | FK | NULL |
| id_bodega_destino | INT | FK | NULL |
| estado_mercancia | VARCHAR(10) | — | NOT NULL CHECK (estado_mercancia IN ('Retenido','Liberado')) |
| id_funcionario | INT | FK | NOT NULL |
| observaciones | VARCHAR(250) | — | NULL |

## inspeccion

| Columna | Tipo | Llave | Regla |
|---|---|---|---|
| id_inspeccion | INT | PK | AUTO_INCREMENT |
| fecha | DATETIME | — | NOT NULL |
| resultado | VARCHAR(25) | — | NOT NULL CHECK (resultado IN ('Aprobada','Con observaciones','Rechazada')) |
| observaciones | VARCHAR(300) | — | NULL |
| id_declaracion | INT | FK | NOT NULL |
| id_funcionario | INT | FK | NOT NULL |
