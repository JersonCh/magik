-- =============================================================================
-- MAGIK BARBER SUPPLY - ESQUEMA DE BASE DE DATOS INICIAL
-- Motor: SQLite / Cloudflare D1
-- Migración: 0001_initial_schema.sql
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
    activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 2. CATEGORÍAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    imagen_url TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 3. PRODUCTOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marca_id INTEGER NOT NULL REFERENCES marcas(id) ON DELETE RESTRICT,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    modelo TEXT NOT NULL,
    descripcion TEXT,
    precio REAL NOT NULL CHECK(precio >= 0),
    precio_anterior REAL CHECK(precio_anterior IS NULL OR precio_anterior >= 0),
    imagen_principal TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 1 CHECK(stock IN (0, 1)),
    badge TEXT, -- 'Destacado', 'Oferta', 'Nuevo', 'Combo'
    es_destacado INTEGER NOT NULL DEFAULT 0 CHECK(es_destacado IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 4. VARIANTES DE PRODUCTO (Colores, Voltaje, Presentaciones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variantes_producto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre_variante TEXT NOT NULL,
    sku TEXT UNIQUE,
    precio_ajuste REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 1 CHECK(stock IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -----------------------------------------------------------------------------
-- 5. PEDIDOS Y COORDINACIONES DE WHATSAPP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    modalidad_entrega TEXT NOT NULL CHECK(modalidad_entrega IN ('Recojo en tienda', 'Envío a domicilio', 'Shalom', 'Olva Courier')),
    direccion_entrega TEXT,
    observaciones TEXT,
    subtotal REAL NOT NULL CHECK(subtotal >= 0),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmado', 'entregado', 'cancelado')),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS detalles_pedido (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    nombre_producto TEXT NOT NULL,
    variante TEXT,
    cantidad INTEGER NOT NULL CHECK(cantidad > 0),
    precio_unitario REAL NOT NULL CHECK(precio_unitario >= 0)
);

-- -----------------------------------------------------------------------------
-- 6. CONFIGURACIÓN DE LA TIENDA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
