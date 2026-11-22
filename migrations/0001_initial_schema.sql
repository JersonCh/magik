-- =============================================================================
-- MAGIK BARBER SUPPLY - ESQUEMA DE BASE DE DATOS DEFINITIVO (D1 / SQLITE)
-- Migración: 0001_initial_schema.sql
-- Propósito: Catálogo modular con galería múltiple R2, categorías jerárquicas,
--            variantes opcionales, precios en céntimos y preparación limpia
--            para futuros módulos de Usuarios y Pedidos.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- 1. MARCAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marcas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    logo_key TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 2. CATEGORÍAS (2 niveles vía parent_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    imagen_key TEXT,
    orden INTEGER NOT NULL DEFAULT 0 CHECK(orden >= 0),
    activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 3. PRODUCTOS (precios en céntimos INTEGER, 3 bloques Figma, sin imagen incrustada)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marca_id INTEGER NOT NULL REFERENCES marcas(id) ON DELETE RESTRICT,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    modelo TEXT,                                  -- Opcional
    sku TEXT UNIQUE,                              -- Opcional (útil para repuestos/inventarios)
    descripcion TEXT,                             -- Columna 1 Figma
    caracteristicas_tecnicas TEXT,                -- Columna 2 Figma (1 viñeta por línea)
    contenido_caja TEXT,                          -- Columna 3 Figma (opcional; si NULL se oculta)
    precio_centimos INTEGER NOT NULL CHECK(precio_centimos >= 0),
    precio_anterior_centimos INTEGER CHECK(precio_anterior_centimos IS NULL OR precio_anterior_centimos >= 0),
    stock INTEGER NOT NULL DEFAULT 1 CHECK(stock IN (0, 1)),
    etiqueta TEXT NOT NULL DEFAULT 'ninguna'
        CHECK(etiqueta IN ('ninguna', 'destacado', 'oferta', 'nuevo', 'combo')),
    estado TEXT NOT NULL DEFAULT 'publicado'
        CHECK(estado IN ('borrador', 'publicado', 'archivado')),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 4. VARIANTES DE PRODUCTO (opcional; precio_centimos NULL hereda del producto)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variantes_producto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre_variante TEXT NOT NULL,
    sku TEXT UNIQUE,
    precio_centimos INTEGER CHECK(precio_centimos IS NULL OR precio_centimos >= 0),
    stock INTEGER NOT NULL DEFAULT 1 CHECK(stock IN (0, 1)),
    orden INTEGER NOT NULL DEFAULT 0 CHECK(orden >= 0),
    activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 5. IMÁGENES MÚLTIPLES POR PRODUCTO (Cloudflare R2 o /assets/)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS imagenes_producto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    variante_id INTEGER REFERENCES variantes_producto(id) ON DELETE SET NULL,
    clave_archivo TEXT NOT NULL,
    texto_alternativo TEXT,
    orden INTEGER NOT NULL DEFAULT 0 CHECK(orden >= 0),
    es_principal INTEGER NOT NULL DEFAULT 0 CHECK(es_principal IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 6. PRODUCTOS RELACIONADOS (repuestos / cuchillas / combos compatibles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos_relacionados (
    producto_origen_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    producto_relacionado_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL DEFAULT 0 CHECK(orden >= 0),
    PRIMARY KEY (producto_origen_id, producto_relacionado_id),
    CHECK (producto_origen_id <> producto_relacionado_id)
);

-- -----------------------------------------------------------------------------
-- 7. CONFIGURACIÓN DE LA TIENDA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL DEFAULT 'general',
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 8. ÍNDICES DE RENDIMIENTO E INTEGRIDAD
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_categorias_parent ON categorias(parent_id, orden);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON productos(marca_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado, stock);
CREATE INDEX IF NOT EXISTS idx_variantes_producto ON variantes_producto(producto_id, activo, orden);
CREATE INDEX IF NOT EXISTS idx_imagenes_producto ON imagenes_producto(producto_id, orden);
CREATE UNIQUE INDEX IF NOT EXISTS idx_imagen_principal_unica
    ON imagenes_producto(producto_id) WHERE es_principal = 1;
CREATE INDEX IF NOT EXISTS idx_productos_relacionados_rel ON productos_relacionados(producto_relacionado_id);

-- -----------------------------------------------------------------------------
-- 9. TRIGGERS AUTOMÁTICOS DE updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_marcas_updated_at AFTER UPDATE ON marcas
BEGIN
    UPDATE marcas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_categorias_updated_at AFTER UPDATE ON categorias
BEGIN
    UPDATE categorias SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_productos_updated_at AFTER UPDATE ON productos
BEGIN
    UPDATE productos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_variantes_updated_at AFTER UPDATE ON variantes_producto
BEGIN
    UPDATE variantes_producto SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_configuracion_updated_at AFTER UPDATE ON configuracion
BEGIN
    UPDATE configuracion SET updated_at = CURRENT_TIMESTAMP WHERE clave = NEW.clave;
END;
