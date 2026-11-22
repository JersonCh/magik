import { products as fallbackProducts, categories as fallbackCategories } from "../../data/products"
import type { Product } from "../../data/products"
import type { DbProduct, DbVariant, DbCategory } from "../../types/database"
import { getDb, mapDbProductToProduct } from "./client"

/**
 * Obtiene todos los productos (desde D1 o fallback en memoria)
 */
export async function getProducts(env?: unknown): Promise<Product[]> {
  const db = getDb(env)
  if (!db) return fallbackProducts

  try {
    const query = `
      SELECT p.*, m.nombre AS marca_nombre, c.nombre AS categoria_nombre
      FROM productos p
      JOIN marcas m ON p.marca_id = m.id
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1
      ORDER BY p.id ASC
    `
    const { results } = await db.prepare(query).all<DbProduct>()
    if (!results || results.length === 0) return []

    const { results: allVariants } = await db
      .prepare("SELECT * FROM variantes_producto WHERE activo = 1")
      .all<DbVariant>()

    const variantsByProduct = new Map<number, DbVariant[]>()
    for (const v of allVariants || []) {
      const list = variantsByProduct.get(v.producto_id)
      if (list) list.push(v)
      else variantsByProduct.set(v.producto_id, [v])
    }

    return results.map((p) => mapDbProductToProduct(p, variantsByProduct.get(p.id) || []))
  } catch (error) {
    console.warn("[D1] Error al obtener productos, usando fallback:", error)
    return fallbackProducts
  }
}

/**
 * Obtiene un producto por su ID
 */
export async function getProductById(id: number, env?: unknown): Promise<Product | null> {
  const db = getDb(env)
  if (!db) {
    return fallbackProducts.find((p) => p.id === id) || null
  }

  try {
    const query = `
      SELECT p.*, m.nombre AS marca_nombre, c.nombre AS categoria_nombre
      FROM productos p
      JOIN marcas m ON p.marca_id = m.id
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ? AND p.activo = 1
      LIMIT 1
    `
    const productRow = await db.prepare(query).bind(id).first<DbProduct>()
    if (!productRow) return null

    const { results: variants } = await db
      .prepare("SELECT * FROM variantes_producto WHERE producto_id = ? AND activo = 1")
      .bind(id)
      .all<DbVariant>()

    return mapDbProductToProduct(productRow, variants || [])
  } catch (error) {
    console.warn(`[D1] Error al obtener producto ${id}, usando fallback:`, error)
    return fallbackProducts.find((p) => p.id === id) || null
  }
}

/**
 * Obtiene las categorías
 */
export async function getCategories(env?: unknown): Promise<[string, string, string][]> {
  const db = getDb(env)
  if (!db) return fallbackCategories

  try {
    const { results } = await db
      .prepare("SELECT nombre, descripcion, imagen_url FROM categorias WHERE activo = 1 ORDER BY orden ASC")
      .all<DbCategory>()

    if (!results || results.length === 0) return []

    return results.map((c) => [c.nombre, c.descripcion || c.nombre, (c.imagen_url || "").replace("/assets/", "")])
  } catch (error) {
    console.warn("[D1] Error al obtener categorías, usando fallback:", error)
    return fallbackCategories
  }
}

/**
 * Actualiza el stock de un producto (1 = disponible, 0 = agotado)
 */
export async function updateProductStock(id: number, stock: boolean, env?: unknown): Promise<boolean> {
  const db = getDb(env)
  if (!db) {
    const item = fallbackProducts.find((p) => p.id === id)
    if (item) item.stock = stock
    return true
  }

  try {
    await db
      .prepare("UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(stock ? 1 : 0, id)
      .run()
    return true
  } catch (error) {
    console.error("[D1] Error al actualizar stock:", error)
    return false
  }
}

/**
 * Guarda o actualiza un producto en Cloudflare D1
 */
export async function saveProduct(
  data: {
    id?: number
    name: string
    brand: string
    model: string
    category: string
    price: number
    oldPrice?: number
    image?: string
    stock?: boolean
    description?: string
    badge?: string
  },
  env?: unknown
): Promise<Product | null> {
  const db = getDb(env)

  // Fallback si no hay conexión a D1
  if (!db) {
    if (data.id) {
      const index = fallbackProducts.findIndex((p) => p.id === data.id)
      if (index > -1) {
        fallbackProducts[index] = {
          ...fallbackProducts[index],
          name: data.name,
          brand: data.brand,
          model: data.model,
          category: data.category,
          price: data.price,
          oldPrice: data.oldPrice,
          image: data.image || fallbackProducts[index].image,
          stock: data.stock !== undefined ? data.stock : fallbackProducts[index].stock,
          badge: data.badge,
          description: data.description,
        }
        return fallbackProducts[index]
      }
      return null
    } else {
      const newProduct: Product = {
        id: Math.max(...fallbackProducts.map((p) => p.id), 0) + 1,
        name: data.name,
        brand: data.brand,
        model: data.model,
        category: data.category,
        price: data.price,
        oldPrice: data.oldPrice,
        image: data.image || "/assets/a0f2f.png",
        stock: data.stock !== undefined ? data.stock : true,
        badge: data.badge,
        description: data.description,
      }
      fallbackProducts.push(newProduct)
      return newProduct
    }
  }

  try {
    let marcaRow = await db.prepare("SELECT id FROM marcas WHERE nombre = ? COLLATE NOCASE LIMIT 1").bind(data.brand).first<{ id: number }>()
    if (!marcaRow) {
      const slug = data.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      await db.prepare("INSERT INTO marcas (nombre, slug) VALUES (?, ?)").bind(data.brand, slug).run()
      marcaRow = await db.prepare("SELECT id FROM marcas WHERE nombre = ? LIMIT 1").bind(data.brand).first<{ id: number }>()
    }

    let catRow = await db.prepare("SELECT id FROM categorias WHERE nombre = ? COLLATE NOCASE LIMIT 1").bind(data.category).first<{ id: number }>()
    if (!catRow) {
      const slug = data.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      await db.prepare("INSERT INTO categorias (nombre, slug, imagen_url) VALUES (?, ?, ?)").bind(data.category, slug, "/assets/6bf26.png").run()
      catRow = await db.prepare("SELECT id FROM categorias WHERE nombre = ? LIMIT 1").bind(data.category).first<{ id: number }>()
    }

    const marcaId = marcaRow?.id || 1
    const catId = catRow?.id || 1
    const slug = `${data.name}-${data.model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const image = data.image || "/assets/a0f2f.png"
    const stockInt = data.stock !== false ? 1 : 0

    if (data.id) {
      await db
        .prepare(`
          UPDATE productos
          SET marca_id = ?, categoria_id = ?, nombre = ?, slug = ?, modelo = ?,
              precio = ?, precio_anterior = ?, imagen_principal = ?, stock = ?,
              badge = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(marcaId, catId, data.name, slug, data.model, data.price, data.oldPrice || null, image, stockInt, data.badge || null, data.description || null, data.id)
        .run()

      return getProductById(data.id, env)
    } else {
      await db
        .prepare(`
          INSERT INTO productos (marca_id, categoria_id, nombre, slug, modelo, precio, precio_anterior, imagen_principal, stock, badge, descripcion)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(marcaId, catId, data.name, slug, data.model, data.price, data.oldPrice || null, image, stockInt, data.badge || null, data.description || null)
        .run()

      const newRow = await db.prepare("SELECT id FROM productos WHERE slug = ? ORDER BY id DESC LIMIT 1").bind(slug).first<{ id: number }>()
      if (newRow?.id) {
        return getProductById(newRow.id, env)
      }
    }
  } catch (error) {
    console.error("[D1] Error al guardar producto:", error)
  }

  return null
}

/**
 * Elimina un producto (soft-delete en D1 o eliminación en memoria)
 */
export async function deleteProduct(id: number, env?: unknown): Promise<boolean> {
  const db = getDb(env)
  if (!db) {
    const idx = fallbackProducts.findIndex((p) => p.id === id)
    if (idx > -1) {
      fallbackProducts.splice(idx, 1)
      return true
    }
    return false
  }

  try {
    await db
      .prepare("UPDATE productos SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(id)
      .run()
    return true
  } catch (error) {
    console.error(`[D1] Error al eliminar producto ${id}:`, error)
    return false
  }
}
