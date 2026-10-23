-- Laboratorio #3 | Inventario aduanero | MySQL 8.4
-- Integrantes: COMPLETAR NOMBRES Y APELLIDOS
-- Fecha de preparación: 2026-10-23
-- Datos sintéticos con fines educativos; importes en USD.
USE aduana_lab3;

-- CONSULTA 1: Declaraciones de importación en octubre de 2026
SELECT p.nombre AS pais_origen, COUNT(*) AS declaraciones
FROM declaracion d JOIN pais p ON p.id_pais=d.id_pais_origen
WHERE d.regimen='Importacion' AND d.fecha >= '2026-10-01' AND d.fecha < '2026-11-01'
GROUP BY p.id_pais,p.nombre ORDER BY declaraciones DESC,p.nombre;

-- CONSULTA 2: Mercancías retenidas y su origen por bodega
SELECT p.descripcion AS producto, pa.nombre AS pais_origen, b.nombre AS bodega, d.numero AS declaracion, i.cantidad
FROM inventario i JOIN producto p ON p.id_producto=i.id_producto
JOIN declaracion d ON d.id_declaracion=i.id_declaracion
JOIN pais pa ON pa.id_pais=d.id_pais_origen JOIN bodega b ON b.id_bodega=i.id_bodega
WHERE i.estado='Retenido' AND i.cantidad>0 ORDER BY b.nombre,p.descripcion,d.numero;

-- CONSULTA 3: Países con más contenedores recibidos
SELECT p.nombre AS pais_origen, COUNT(c.id_contenedor) AS contenedores
FROM contenedor c JOIN declaracion d ON d.id_declaracion=c.id_declaracion
JOIN pais p ON p.id_pais=d.id_pais_origen GROUP BY p.id_pais,p.nombre
ORDER BY contenedores DESC,p.nombre;

-- CONSULTA 4: Importadores con mayor valor total declarado en USD
SELECT i.razon_social, SUM(dd.valor_declarado) AS valor_total_usd
FROM importador i JOIN declaracion d ON d.id_importador=i.id_importador
JOIN detalle_declaracion dd ON dd.id_declaracion=d.id_declaracion
GROUP BY i.id_importador,i.razon_social ORDER BY valor_total_usd DESC,i.razon_social;

-- CONSULTA 5: Inspecciones con observaciones y su funcionario
SELECT d.numero AS declaracion, ins.fecha, f.nombre AS funcionario, ins.observaciones
FROM inspeccion ins JOIN declaracion d ON d.id_declaracion=ins.id_declaracion
JOIN v_funcionario_publico f ON f.id_funcionario=ins.id_funcionario
WHERE ins.resultado='Con observaciones' ORDER BY ins.fecha DESC,ins.id_inspeccion DESC;

-- CONSULTA 6: Stock del producto ADU-0001 en todas las bodegas
SELECT p.sku,p.descripcion,p.unidad_medida,b.nombre AS bodega,i.estado,SUM(i.cantidad) AS cantidad
FROM inventario i JOIN producto p ON p.id_producto=i.id_producto
JOIN bodega b ON b.id_bodega=i.id_bodega WHERE p.sku='ADU-0001'
GROUP BY p.id_producto,p.sku,p.descripcion,p.unidad_medida,b.id_bodega,b.nombre,i.estado
ORDER BY b.nombre,i.estado;

-- CONSULTA 7: Ocupación de bodegas en kilogramos y estado
SELECT b.nombre,i.estado,SUM(i.cantidad*p.peso_unitario_kg) AS peso_ocupado_kg,
 b.capacidad_peso_kg, ROUND(100*SUM(i.cantidad*p.peso_unitario_kg)/b.capacidad_peso_kg,2) AS porcentaje_capacidad
FROM bodega b JOIN inventario i ON i.id_bodega=b.id_bodega
JOIN producto p ON p.id_producto=i.id_producto
GROUP BY b.id_bodega,b.nombre,b.capacidad_peso_kg,i.estado ORDER BY b.nombre,i.estado;

-- CONSULTA 8: Movimientos de octubre de 2026 por tipo y producto
SELECT m.tipo,p.sku,p.descripcion,p.unidad_medida,COUNT(*) AS operaciones,SUM(m.cantidad) AS cantidad
FROM movimiento m JOIN producto p ON p.id_producto=m.id_producto
WHERE m.fecha>='2026-10-01' AND m.fecha<'2026-11-01'
GROUP BY m.tipo,p.id_producto,p.sku,p.descripcion,p.unidad_medida ORDER BY m.tipo,p.sku;
