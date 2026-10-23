-- Laboratorio #3 | Inventario aduanero | MySQL 8.4
-- Integrantes: COMPLETAR NOMBRES Y APELLIDOS
-- Fecha de preparación: 2026-10-23
-- Datos sintéticos con fines educativos; importes en USD.

CREATE DATABASE IF NOT EXISTS aduana_lab3 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE aduana_lab3;
SET NAMES utf8mb4;

CREATE TABLE pais (
  id_pais INT AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  codigo_iso CHAR(2) NOT NULL UNIQUE,
  PRIMARY KEY (id_pais)
) ENGINE=InnoDB;

CREATE TABLE importador (
  id_importador INT AUTO_INCREMENT,
  razon_social VARCHAR(120) NOT NULL,
  identificacion VARCHAR(25) NOT NULL UNIQUE,
  direccion VARCHAR(200) NOT NULL,
  telefono VARCHAR(25) NOT NULL,
  correo VARCHAR(120) NOT NULL UNIQUE,
  PRIMARY KEY (id_importador)
) ENGINE=InnoDB;

CREATE TABLE agente_aduanal (
  id_agente INT AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  licencia VARCHAR(25) NOT NULL UNIQUE,
  telefono VARCHAR(25) NOT NULL,
  PRIMARY KEY (id_agente)
) ENGINE=InnoDB;

CREATE TABLE partida_arancelaria (
  id_partida INT AUTO_INCREMENT,
  codigo VARCHAR(12) NOT NULL UNIQUE,
  descripcion VARCHAR(180) NOT NULL,
  porcentaje_arancel DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (porcentaje_arancel BETWEEN 0 AND 100),
  PRIMARY KEY (id_partida)
) ENGINE=InnoDB;

CREATE TABLE producto (
  id_producto INT AUTO_INCREMENT,
  sku VARCHAR(30) NOT NULL UNIQUE,
  descripcion VARCHAR(140) NOT NULL,
  unidad_medida VARCHAR(15) NOT NULL DEFAULT 'unidad',
  valor_referencia DECIMAL(14,2) NOT NULL CHECK (valor_referencia >= 0),
  peso_unitario_kg DECIMAL(12,3) NOT NULL CHECK (peso_unitario_kg > 0),
  id_partida INT NOT NULL,
  PRIMARY KEY (id_producto),
  CONSTRAINT fk_producto_0 FOREIGN KEY (id_partida) REFERENCES partida_arancelaria (id_partida) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE funcionario (
  id_funcionario INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  cargo VARCHAR(60) NOT NULL,
  id_supervisor INT NULL,
  correo VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(15) NOT NULL DEFAULT 'consulta' CHECK (rol IN ('admin','operador','consulta')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  session_version INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id_funcionario),
  CONSTRAINT fk_funcionario_1 FOREIGN KEY (id_supervisor) REFERENCES funcionario (id_funcionario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_no_autosupervision CHECK (id_supervisor IS NULL OR id_supervisor <> id_funcionario)
) ENGINE=InnoDB;

CREATE TABLE declaracion (
  id_declaracion INT AUTO_INCREMENT,
  numero VARCHAR(25) NOT NULL UNIQUE,
  fecha DATE NOT NULL,
  regimen VARCHAR(15) NOT NULL CHECK (regimen IN ('Importacion','Exportacion','Transito','Deposito')),
  estado VARCHAR(20) NOT NULL DEFAULT 'Registrada' CHECK (estado IN ('Registrada','En inspeccion','Retenida','Liberada','Cerrada')),
  moneda CHAR(3) NOT NULL DEFAULT 'USD' CHECK (moneda = 'USD'),
  id_importador INT NOT NULL,
  id_agente INT NOT NULL,
  id_pais_origen INT NOT NULL,
  PRIMARY KEY (id_declaracion),
  CONSTRAINT fk_declaracion_2 FOREIGN KEY (id_importador) REFERENCES importador (id_importador) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_declaracion_3 FOREIGN KEY (id_agente) REFERENCES agente_aduanal (id_agente) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_declaracion_4 FOREIGN KEY (id_pais_origen) REFERENCES pais (id_pais) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE detalle_declaracion (
  id_declaracion INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL CHECK (cantidad > 0),
  valor_declarado DECIMAL(14,2) NOT NULL CHECK (valor_declarado >= 0),
  PRIMARY KEY (id_declaracion, id_producto),
  CONSTRAINT fk_detalle_declaracion_5 FOREIGN KEY (id_declaracion) REFERENCES declaracion (id_declaracion) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_detalle_declaracion_6 FOREIGN KEY (id_producto) REFERENCES producto (id_producto) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE contenedor (
  id_contenedor INT AUTO_INCREMENT,
  numero VARCHAR(15) NOT NULL UNIQUE,
  tipo VARCHAR(25) NOT NULL,
  peso_bruto_kg DECIMAL(12,3) NOT NULL CHECK (peso_bruto_kg > 0),
  id_declaracion INT NOT NULL,
  PRIMARY KEY (id_contenedor),
  CONSTRAINT fk_contenedor_7 FOREIGN KEY (id_declaracion) REFERENCES declaracion (id_declaracion) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE bodega (
  id_bodega INT AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  ubicacion VARCHAR(160) NOT NULL,
  capacidad_peso_kg DECIMAL(14,3) NOT NULL CHECK (capacidad_peso_kg > 0),
  PRIMARY KEY (id_bodega)
) ENGINE=InnoDB;

CREATE TABLE inventario (
  id_inventario INT AUTO_INCREMENT,
  id_declaracion INT NOT NULL,
  id_producto INT NOT NULL,
  id_bodega INT NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  fecha_ingreso DATE NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'Retenido' CHECK (estado IN ('Retenido','Liberado')),
  PRIMARY KEY (id_inventario),
  CONSTRAINT fk_inventario_8 FOREIGN KEY (id_declaracion, id_producto) REFERENCES detalle_declaracion (id_declaracion, id_producto) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_inventario_9 FOREIGN KEY (id_bodega) REFERENCES bodega (id_bodega) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT uq_existencia UNIQUE (id_declaracion, id_producto, id_bodega, estado)
) ENGINE=InnoDB;

CREATE TABLE movimiento (
  id_movimiento INT AUTO_INCREMENT,
  referencia VARCHAR(50) NOT NULL UNIQUE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Entrada','Salida','Traslado')),
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cantidad DECIMAL(12,3) NOT NULL CHECK (cantidad > 0),
  id_declaracion INT NOT NULL,
  id_producto INT NOT NULL,
  id_bodega_origen INT NULL,
  id_bodega_destino INT NULL,
  estado_mercancia VARCHAR(10) NOT NULL CHECK (estado_mercancia IN ('Retenido','Liberado')),
  id_funcionario INT NOT NULL,
  observaciones VARCHAR(250) NULL,
  PRIMARY KEY (id_movimiento),
  CONSTRAINT fk_movimiento_10 FOREIGN KEY (id_declaracion, id_producto) REFERENCES detalle_declaracion (id_declaracion, id_producto) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimiento_11 FOREIGN KEY (id_bodega_origen) REFERENCES bodega (id_bodega) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimiento_12 FOREIGN KEY (id_bodega_destino) REFERENCES bodega (id_bodega) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimiento_13 FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_bodegas_movimiento CHECK ((tipo = 'Entrada' AND id_bodega_origen IS NULL AND id_bodega_destino IS NOT NULL) OR (tipo = 'Salida' AND id_bodega_origen IS NOT NULL AND id_bodega_destino IS NULL) OR (tipo = 'Traslado' AND id_bodega_origen IS NOT NULL AND id_bodega_destino IS NOT NULL AND id_bodega_origen <> id_bodega_destino)),
  CONSTRAINT chk_salida_liberada CHECK (tipo <> 'Salida' OR estado_mercancia = 'Liberado')
) ENGINE=InnoDB;

CREATE TABLE inspeccion (
  id_inspeccion INT AUTO_INCREMENT,
  fecha DATETIME NOT NULL,
  resultado VARCHAR(25) NOT NULL CHECK (resultado IN ('Aprobada','Con observaciones','Rechazada')),
  observaciones VARCHAR(300) NULL,
  id_declaracion INT NOT NULL,
  id_funcionario INT NOT NULL,
  PRIMARY KEY (id_inspeccion),
  CONSTRAINT fk_inspeccion_14 FOREIGN KEY (id_declaracion) REFERENCES declaracion (id_declaracion) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_inspeccion_15 FOREIGN KEY (id_funcionario) REFERENCES funcionario (id_funcionario) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE VIEW v_funcionario_publico AS
SELECT id_funcionario, nombre, cargo, id_supervisor FROM funcionario;
