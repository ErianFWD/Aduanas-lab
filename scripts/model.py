"""Modelo único para el SQL, el DER y su diccionario. No requiere dependencias."""
TABLES = [
('pais', [
 ('id_pais','INT','PK','AUTO_INCREMENT'),('nombre','VARCHAR(60)','','NOT NULL UNIQUE'),('codigo_iso','CHAR(2)','','NOT NULL UNIQUE')]),
('importador', [
 ('id_importador','INT','PK','AUTO_INCREMENT'),('razon_social','VARCHAR(120)','','NOT NULL'),('identificacion','VARCHAR(25)','','NOT NULL UNIQUE'),('direccion','VARCHAR(200)','','NOT NULL'),('telefono','VARCHAR(25)','','NOT NULL'),('correo','VARCHAR(120)','','NOT NULL UNIQUE')]),
('agente_aduanal', [
 ('id_agente','INT','PK','AUTO_INCREMENT'),('nombre','VARCHAR(100)','','NOT NULL'),('licencia','VARCHAR(25)','','NOT NULL UNIQUE'),('telefono','VARCHAR(25)','','NOT NULL')]),
('partida_arancelaria', [
 ('id_partida','INT','PK','AUTO_INCREMENT'),('codigo','VARCHAR(12)','','NOT NULL UNIQUE'),('descripcion','VARCHAR(180)','','NOT NULL'),('porcentaje_arancel','DECIMAL(5,2)','','NOT NULL DEFAULT 0 CHECK (porcentaje_arancel BETWEEN 0 AND 100)')]),
('producto', [
 ('id_producto','INT','PK','AUTO_INCREMENT'),('sku','VARCHAR(30)','','NOT NULL UNIQUE'),('descripcion','VARCHAR(140)','','NOT NULL'),('unidad_medida','VARCHAR(15)','','NOT NULL DEFAULT \'unidad\''),('valor_referencia','DECIMAL(14,2)','','NOT NULL CHECK (valor_referencia >= 0)'),('peso_unitario_kg','DECIMAL(12,3)','','NOT NULL CHECK (peso_unitario_kg > 0)'),('id_partida','INT','FK','NOT NULL')]),
('funcionario', [
 ('id_funcionario','INT','PK','NOT NULL'),('nombre','VARCHAR(100)','','NOT NULL'),('cargo','VARCHAR(60)','','NOT NULL'),('id_supervisor','INT','FK','NULL'),('correo','VARCHAR(120)','','NOT NULL UNIQUE'),('password_hash','VARCHAR(255)','','NOT NULL'),('rol','VARCHAR(15)','','NOT NULL DEFAULT \'consulta\' CHECK (rol IN (\'admin\',\'operador\',\'consulta\'))'),('activo','BOOLEAN','','NOT NULL DEFAULT TRUE'),('session_version','INT','','NOT NULL DEFAULT 0')]),
('declaracion', [
 ('id_declaracion','INT','PK','AUTO_INCREMENT'),('numero','VARCHAR(25)','','NOT NULL UNIQUE'),('fecha','DATE','','NOT NULL'),('regimen','VARCHAR(15)','','NOT NULL CHECK (regimen IN (\'Importacion\',\'Exportacion\',\'Transito\',\'Deposito\'))'),('estado','VARCHAR(20)','','NOT NULL DEFAULT \'Registrada\' CHECK (estado IN (\'Registrada\',\'En inspeccion\',\'Retenida\',\'Liberada\',\'Cerrada\'))'),('moneda','CHAR(3)','','NOT NULL DEFAULT \'USD\' CHECK (moneda = \'USD\')'),('id_importador','INT','FK','NOT NULL'),('id_agente','INT','FK','NOT NULL'),('id_pais_origen','INT','FK','NOT NULL')]),
('detalle_declaracion', [
 ('id_declaracion','INT','PK,FK','NOT NULL'),('id_producto','INT','PK,FK','NOT NULL'),('cantidad','DECIMAL(12,3)','','NOT NULL CHECK (cantidad > 0)'),('valor_declarado','DECIMAL(14,2)','','NOT NULL CHECK (valor_declarado >= 0)')]),
('contenedor', [
 ('id_contenedor','INT','PK','AUTO_INCREMENT'),('numero','VARCHAR(15)','','NOT NULL UNIQUE'),('tipo','VARCHAR(25)','','NOT NULL'),('peso_bruto_kg','DECIMAL(12,3)','','NOT NULL CHECK (peso_bruto_kg > 0)'),('id_declaracion','INT','FK','NOT NULL')]),
('bodega', [
 ('id_bodega','INT','PK','AUTO_INCREMENT'),('nombre','VARCHAR(80)','','NOT NULL UNIQUE'),('ubicacion','VARCHAR(160)','','NOT NULL'),('capacidad_peso_kg','DECIMAL(14,3)','','NOT NULL CHECK (capacidad_peso_kg > 0)')]),
('inventario', [
 ('id_inventario','INT','PK','AUTO_INCREMENT'),('id_declaracion','INT','FK','NOT NULL'),('id_producto','INT','FK','NOT NULL'),('id_bodega','INT','FK','NOT NULL'),('cantidad','DECIMAL(12,3)','','NOT NULL DEFAULT 0 CHECK (cantidad >= 0)'),('fecha_ingreso','DATE','','NOT NULL'),('estado','VARCHAR(10)','','NOT NULL DEFAULT \'Retenido\' CHECK (estado IN (\'Retenido\',\'Liberado\'))')]),
('movimiento', [
 ('id_movimiento','INT','PK','AUTO_INCREMENT'),('referencia','VARCHAR(50)','','NOT NULL UNIQUE'),('tipo','VARCHAR(10)','','NOT NULL CHECK (tipo IN (\'Entrada\',\'Salida\',\'Traslado\'))'),('fecha','DATETIME','','NOT NULL DEFAULT CURRENT_TIMESTAMP'),('cantidad','DECIMAL(12,3)','','NOT NULL CHECK (cantidad > 0)'),('id_declaracion','INT','FK','NOT NULL'),('id_producto','INT','FK','NOT NULL'),('id_bodega_origen','INT','FK','NULL'),('id_bodega_destino','INT','FK','NULL'),('estado_mercancia','VARCHAR(10)','','NOT NULL CHECK (estado_mercancia IN (\'Retenido\',\'Liberado\'))'),('id_funcionario','INT','FK','NOT NULL'),('observaciones','VARCHAR(250)','','NULL')]),
('inspeccion', [
 ('id_inspeccion','INT','PK','AUTO_INCREMENT'),('fecha','DATETIME','','NOT NULL'),('resultado','VARCHAR(25)','','NOT NULL CHECK (resultado IN (\'Aprobada\',\'Con observaciones\',\'Rechazada\'))'),('observaciones','VARCHAR(300)','','NULL'),('id_declaracion','INT','FK','NOT NULL'),('id_funcionario','INT','FK','NOT NULL')])
]
# tabla hija, columnas hijas, tabla padre, columnas padre, etiqueta
RELATIONS = [
 ('producto',['id_partida'],'partida_arancelaria',['id_partida'],'clasifica'),
 ('funcionario',['id_supervisor'],'funcionario',['id_funcionario'],'supervisa'),
 ('declaracion',['id_importador'],'importador',['id_importador'],'declara'),
 ('declaracion',['id_agente'],'agente_aduanal',['id_agente'],'gestiona'),
 ('declaracion',['id_pais_origen'],'pais',['id_pais'],'origen'),
 ('detalle_declaracion',['id_declaracion'],'declaracion',['id_declaracion'],'incluye'),
 ('detalle_declaracion',['id_producto'],'producto',['id_producto'],'se declara'),
 ('contenedor',['id_declaracion'],'declaracion',['id_declaracion'],'ampara'),
 ('inventario',['id_declaracion','id_producto'],'detalle_declaracion',['id_declaracion','id_producto'],'conserva origen'),
 ('inventario',['id_bodega'],'bodega',['id_bodega'],'almacena'),
 ('movimiento',['id_declaracion','id_producto'],'detalle_declaracion',['id_declaracion','id_producto'],'trazabilidad'),
 ('movimiento',['id_bodega_origen'],'bodega',['id_bodega'],'sale de'),
 ('movimiento',['id_bodega_destino'],'bodega',['id_bodega'],'entra en'),
 ('movimiento',['id_funcionario'],'funcionario',['id_funcionario'],'registra'),
 ('inspeccion',['id_declaracion'],'declaracion',['id_declaracion'],'se inspecciona'),
 ('inspeccion',['id_funcionario'],'funcionario',['id_funcionario'],'inspecciona')
]
EXTRA = {
 'funcionario':['CONSTRAINT chk_no_autosupervision CHECK (id_supervisor IS NULL OR id_supervisor <> id_funcionario)'],
 'inventario':['CONSTRAINT uq_existencia UNIQUE (id_declaracion, id_producto, id_bodega, estado)'],
 'movimiento': ["CONSTRAINT chk_bodegas_movimiento CHECK ((tipo = 'Entrada' AND id_bodega_origen IS NULL AND id_bodega_destino IS NOT NULL) OR (tipo = 'Salida' AND id_bodega_origen IS NOT NULL AND id_bodega_destino IS NULL) OR (tipo = 'Traslado' AND id_bodega_origen IS NOT NULL AND id_bodega_destino IS NOT NULL AND id_bodega_origen <> id_bodega_destino))", "CONSTRAINT chk_salida_liberada CHECK (tipo <> 'Salida' OR estado_mercancia = 'Liberado')"]
}
