-- =============================================================================
-- MAGIK BARBER SUPPLY - DATOS SEMILLA INICIALES
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
(5, 'GENÉRICO', 'generico', 'Accesorios esenciales y repuestos para salón y barbería.')
ON CONFLICT(id) DO UPDATE SET nombre = excluded.nombre;

-- -----------------------------------------------------------------------------
-- 2. CATEGORÍAS (5 líneas padre -> 12 categorías operativas)
-- -----------------------------------------------------------------------------
INSERT INTO categorias (id, parent_id, nombre, slug, descripcion, imagen_key, orden) VALUES
-- Líneas padre (nivel 1)
(1, NULL, 'Barbería', 'barberia', 'Equipos profesionales de corte y acabado para barbería', '/assets/6bf26.png', 1),
(2, NULL, 'Peluquería y Calor', 'peluqueria-y-calor', 'Secadoras, planchadoras y rizadoras profesionales', '/assets/9e02f.png', 2),
(3, NULL, 'Uñas y Manicure', 'unas-y-manicure', 'Equipos eléctricos y cabinas para manicure y pedicure', '/assets/71f4e.png', 3),
(4, NULL, 'Repuestos y Accesorios', 'repuestos-y-accesorios', 'Cuchillas, láminas, repuestos originales y herramientas de apoyo', '/assets/71f4e.png', 4),
(5, NULL, 'Bienestar y Cuidado', 'bienestar-y-cuidado', 'Masajeadores profesionales y productos de cuidado personal', '/assets/682ff.png', 5),
-- Categorías hijas (nivel 2 - visibles en catálogo y selector agrupado)
(101, 1, 'Cortadoras', 'cortadoras', 'Cortadoras de cabello profesionales', '/assets/6bf26.png', 1),
(102, 1, 'Trimmers', 'trimmers', 'Trimmers y patilleras de precisión', '/assets/51ea8.png', 2),
(103, 1, 'Shavers', 'shavers', 'Shavers y afeitadoras al ras', '/assets/16698.png', 3),
(104, 2, 'Secadoras', 'secadoras', 'Secadoras profesionales de alto flujo', '/assets/9e02f.png', 4),
(105, 2, 'Planchadoras', 'planchadoras', 'Planchadoras profesionales para salón', '/assets/c25e4.png', 5),
(106, 2, 'Rizadoras', 'rizadoras', 'Rizadoras y tenazas térmicas profesionales', '/assets/c25e4.png', 6),
(107, 3, 'Pulidores de uñas', 'pulidores-de-unas', 'Tornos y pulidores eléctricos para manicure', '/assets/71f4e.png', 7),
(108, 3, 'Secadoras de uñas', 'secadoras-de-unas', 'Lámparas LED/UV para secado de uñas', '/assets/71f4e.png', 8),
(109, 4, 'Repuestos', 'repuestos', 'Cuchillas, láminas, baterías y repuestos técnicos', '/assets/71f4e.png', 9),
(110, 4, 'Accesorios', 'accesorios', 'Rociadores, brochas y accesorios de estación', '/assets/71f4e.png', 10),
(111, 5, 'Masajeadores', 'masajeadores', 'Masajeadores profesionales para barbería y spa', '/assets/682ff.png', 11),
(112, 5, 'Cuidado', 'cuidado', 'Cuidado del cabello, textura y barba', '/assets/682ff.png', 12)
ON CONFLICT(id) DO UPDATE SET
  parent_id = excluded.parent_id,
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  imagen_key = excluded.imagen_key,
  orden = excluded.orden;

-- -----------------------------------------------------------------------------
-- 3. PRODUCTOS (precios en céntimos; bloque contenido_caja opcional)
-- -----------------------------------------------------------------------------
INSERT INTO productos (
  id, marca_id, categoria_id, nombre, slug, modelo, descripcion,
  caracteristicas_tecnicas, contenido_caja,
  precio_centimos, precio_anterior_centimos, stock, etiqueta, estado
) VALUES
(
  1, 1, 101, 'Cortadora Saber II', 'cortadora-saber-ii', 'Saber II',
  'Cortadora profesional inalámbrica con cuerpo metálico de alta resistencia para trabajo continuo en barbería.',
  'Motor rotativo magnético de alto torque (7,200 RPM)
Cuchilla Black Diamond Carbon DLC fija con ajuste zero-gap
Uso inalámbrico con batería recargable de ion-litio
Cuerpo metálico ergonómico y silencioso',
  'Cortadora Saber II
Base de carga y cable USB-C
Juego de peines guía magnéticos
Cepillo de limpieza y aceite lubricante',
  95000, NULL, 1, 'destacado', 'publicado'
),
(
  2, 2, 112, 'Polvo de textura', 'polvo-de-textura-vasso', '35 g',
  'Polvo fijador mate profesional diseñado para aportar volumen inmediato y textura natural sin apelmazar.',
  'Contenido neto de 35 gramos
Acabado mate natural sin brillo ni residuos grasos
Fijación modulable ideal para peinados texturizados',
  NULL,
  2500, 3000, 1, 'oferta', 'publicado'
),
(
  3, 1, 102, 'Trimmer Saber', 'trimmer-saber', 'Saber',
  'Trimmer inalámbrico de precisión con cuchilla expuesta 360° para contornos, diseños y líneas limpias.',
  'Motor brushless digital de bajo nivel de ruido
Cuchilla en T de titanio dorado e interior DLC
Cuerpo integral de aluminio anodizado',
  'Trimmer Saber
Base de carga pesada
Cable de alimentación y protector de cuchilla
Kit básico de limpieza y mantenimiento',
  72000, NULL, 1, 'nuevo', 'publicado'
),
(
  4, 3, 104, 'Secadora Forte Pro', 'secadora-forte-pro', 'Forte Pro',
  'Secadora profesional ultraligera de alto flujo de aire y motor digital optimizado para jornadas intensivas.',
  'Motor brushless de alta eficiencia y larga duración
Control independiente de temperatura y velocidad
Generador de iones negativos anti-frizz',
  'Secadora Forte Pro
2 boquillas concentradoras
1 difusor profesional',
  69000, NULL, 1, 'destacado', 'publicado'
),
(
  5, 1, 103, 'Shaver profesional', 'shaver-profesional-stylecraft', 'Foil',
  'Afeitadora de doble lámina escalonada para acabados al ras, desvanecidos y limpieza facial sin irritación.',
  'Doble lámina dorada hipoalergénica ultra delgada
Cortadores internos independientes de acero inoxidable
Uso con cable o inalámbrico',
  NULL,
  41000, NULL, 0, 'ninguna', 'publicado'
),
(
  6, 3, 105, 'Plancha profesional', 'plancha-profesional-jrl', 'Ceramic',
  'Planchadora profesional con calentamiento rápido e infraestructura térmica uniforme para alisados y sellados.',
  'Placas cerámicas flotantes de deslizamiento suave
Control digital de temperatura ajustable
Cable giratorio 360° de grado profesional',
  NULL,
  28000, NULL, 1, 'ninguna', 'publicado'
),
(
  7, 4, 112, 'Kit de cuidado', 'kit-cuidado-magik', 'Hair & Beard',
  'Combo seleccionado para el cuidado diario del cabello y barba, ideal tanto para uso personal como regalo profesional.',
  'Incluye aceites hidratantes y bálsamo suavizante
Fórmulas compatibles con uso diario en barbería',
  'Aceite hidratante para barba
Bálsamo modelador de fijación ligera',
  8900, 11000, 1, 'combo', 'publicado'
),
(
  8, 5, 110, 'Kit de rociador y brocha', 'kit-rociador-brocha', 'Studio',
  'Dúo esencial para estación de barbería compuesto por rociador de bruma fina continua y brocha quitapelo suave.',
  'Rociador microdifusor de pulverización uniforme
Brocha de cerdas suaves densas y mango ergonómico',
  '1 Rociador microdifusor Studio
1 Brocha de limpieza cervical',
  4800, NULL, 1, 'ninguna', 'publicado'
)
ON CONFLICT(id) DO UPDATE SET
  categoria_id = excluded.categoria_id,
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  caracteristicas_tecnicas = excluded.caracteristicas_tecnicas,
  contenido_caja = excluded.contenido_caja,
  precio_centimos = excluded.precio_centimos,
  precio_anterior_centimos = excluded.precio_anterior_centimos,
  stock = excluded.stock,
  etiqueta = excluded.etiqueta;

-- -----------------------------------------------------------------------------
-- 4. IMÁGENES DE PRODUCTO
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO imagenes_producto (id, producto_id, clave_archivo, texto_alternativo, orden, es_principal) VALUES
(1, 1, '/assets/a0f2f.png', 'Cortadora Saber II', 0, 1),
(2, 2, '/assets/2031c.png', 'Polvo de textura', 0, 1),
(3, 3, '/assets/7e195.png', 'Trimmer Saber', 0, 1),
(4, 4, '/assets/acd8a.png', 'Secadora Forte Pro', 0, 1),
(5, 5, '/assets/16698.png', 'Shaver profesional', 0, 1),
(6, 6, '/assets/c25e4.png', 'Plancha profesional', 0, 1),
(7, 7, '/assets/682ff.png', 'Kit de cuidado', 0, 1),
(8, 8, '/assets/71f4e.png', 'Kit de rociador y brocha', 0, 1);

-- -----------------------------------------------------------------------------
-- 5. VARIANTES DE PRODUCTO (opcionales; NULL hereda precio del producto)
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO variantes_producto (id, producto_id, nombre_variante, precio_centimos, stock, orden) VALUES
(1, 1, 'Blanca', NULL, 1, 0),
(2, 1, 'Negro', NULL, 1, 1),
(3, 2, '35 g', NULL, 1, 0),
(4, 3, 'Negro / dorado', NULL, 1, 0);

-- -----------------------------------------------------------------------------
-- 6. CONFIGURACIÓN OFICIAL DE LA TIENDA
-- -----------------------------------------------------------------------------
INSERT INTO configuracion (clave, valor, descripcion, categoria) VALUES
('whatsapp_number', '51900000000', 'Número oficial de atención y coordinación por WhatsApp', 'contacto'),
('store_address', 'Av. Coronel Mendoza 1420, Galería Magik, Tacna - Perú', 'Dirección física de atención en Tacna', 'ubicacion'),
('opening_hours', 'Lunes a Sábado: 9:00 am - 8:30 pm', 'Horario comercial de atención', 'contacto'),
('announcement_bar', 'Envíos diarios por Shalom y Olva Courier a todo el Perú', 'Texto de la barra superior de anuncios', 'anuncios'),
('shipping_base_price', '0', 'Tarifa base de flete (0 para pago en destino)', 'envios')
ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, categoria = excluded.categoria;
