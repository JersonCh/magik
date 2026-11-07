-- =============================================================================
-- MAGIK BARBER SUPPLY - DATOS SEMILLA INICIALES
-- Motor: SQLite / Cloudflare D1
-- Migración: 0002_seed_products.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. MARCAS
-- -----------------------------------------------------------------------------
INSERT INTO marcas (id, nombre, slug, descripcion) VALUES
(1, 'STYLECRAFT', 'stylecraft', 'Herramientas de barbería y estilismo de alto rendimiento.'),
(2, 'VASSO', 'vasso', 'Productos de cuidado profesional para cabello y barba.'),
(3, 'JRL', 'jrl', 'Tecnología e innovación para profesionales del cabello.'),
(4, 'MAGIK SELECT', 'magik-select', 'Kits y combos seleccionados por Magik Barber Supply.'),
(5, 'GENÉRICO', 'generico', 'Accesorios esenciales y repuestos para salón y barbería')
ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre;

-- -----------------------------------------------------------------------------
-- 2. CATEGORÍAS
-- -----------------------------------------------------------------------------
INSERT INTO categorias (id, nombre, slug, descripcion, imagen_url, orden) VALUES
(1, 'Cortadoras', 'cortadoras', 'Cortadoras de cabello profesionales', '/assets/6bf26.png', 1),
(2, 'Trimmers', 'trimmers', 'Trimmers y patilleras de precisión', '/assets/51ea8.png', 2),
(3, 'Shavers', 'shavers', 'Shavers y afeitadoras al ras', '/assets/16698.png', 3),
(4, 'Secadoras', 'secadoras', 'Secadoras profesionales de alto flujo', '/assets/9e02f.png', 4),
(5, 'Planchas', 'planchas', 'Planchas y rizadoras cerámicas', '/assets/c25e4.png', 5),
(6, 'Cuidado', 'cuidado', 'Cuidado del cabello, textura y barba', '/assets/682ff.png', 6),
(7, 'Accesorios', 'accesorios', 'Accesorios, rociadores y repuestos', '/assets/71f4e.png', 7)
ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre;

-- -----------------------------------------------------------------------------
-- 3. PRODUCTOS
-- -----------------------------------------------------------------------------
INSERT INTO productos (id, marca_id, categoria_id, nombre, slug, modelo, descripcion, precio, precio_anterior, imagen_principal, stock, badge, es_destacado) VALUES
(1, 1, 1, 'Cortadora Saber II', 'cortadora-saber-ii', 'Saber II', 'Cortadora profesional con motor magnético y cuchilla ultra precisa.', 950.0, NULL, '/assets/a0f2f.png', 1, 'Destacado', 1),
(2, 2, 6, 'Polvo de textura', 'polvo-de-textura-vasso', '35 g', 'Polvo fijador mate para textura y volumen natural.', 25.0, 30.0, '/assets/2031c.png', 1, 'Oferta', 1),
(3, 1, 2, 'Trimmer Saber', 'trimmer-saber', 'Saber', 'Trimmer inalámbrico de alta precisión para perfilados y líneas limpias.', 720.0, NULL, '/assets/7e195.png', 1, 'Nuevo', 1),
(4, 3, 4, 'Secadora Forte Pro', 'secadora-forte-pro', 'Forte Pro', 'Secadora ultraligera y silenciosa de nivel profesional.', 690.0, NULL, '/assets/acd8a.png', 1, NULL, 1),
(5, 1, 3, 'Shaver profesional', 'shaver-profesional-stylecraft', 'Foil', 'Afeitadora de doble lámina para acabados impecables.', 410.0, NULL, '/assets/16698.png', 0, NULL, 0),
(6, 3, 5, 'Plancha profesional', 'plancha-profesional-jrl', 'Ceramic', 'Plancha de placas cerámicas con calentamiento instantáneo.', 280.0, NULL, '/assets/c25e4.png', 1, NULL, 0),
(7, 4, 6, 'Kit de cuidado', 'kit-cuidado-magik', 'Hair & Beard', 'Kit completo de cuidado para cabello y barba con aceite y bálsamo.', 89.0, 110.0, '/assets/682ff.png', 1, 'Combo', 0),
(8, 5, 7, 'Kit de rociador y brocha', 'kit-rociador-brocha', 'Studio', 'Dúo de rociador microdifusor y brocha suave para cuello.', 48.0, NULL, '/assets/71f4e.png', 1, NULL, 0)
ON CONFLICT(id) DO UPDATE SET precio=excluded.precio, stock=excluded.stock;

-- -----------------------------------------------------------------------------
-- 4. VARIANTES DE PRODUCTO
-- -----------------------------------------------------------------------------
INSERT INTO variantes_producto (producto_id, nombre_variante, precio_ajuste, stock) VALUES
(1, 'Blanca', 0, 1),
(1, 'Negro', 0, 1),
(2, '35 g', 0, 1),
(3, 'Negro / dorado', 0, 1),
(4, 'Presentación estándar', 0, 1),
(5, 'Presentación estándar', 0, 0),
(6, 'Presentación estándar', 0, 1),
(7, 'Presentación estándar', 0, 1),
(8, 'Presentación estándar', 0, 1);

-- -----------------------------------------------------------------------------
-- 5. CONFIGURACIÓN
-- -----------------------------------------------------------------------------
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('whatsapp_number', '51900000000', 'Número oficial de atención y pedidos por WhatsApp'),
('store_city', 'Tacna, Perú', 'Ciudad sede de la tienda física'),
('store_address', 'Por configurar', 'Dirección física de atención en Tacna'),
('delivery_notice', 'El costo de envío y la disponibilidad final se confirman por WhatsApp.', 'Aviso legal en checkout')
ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor;
