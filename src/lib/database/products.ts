import type { CategoryItem, Product, ProductStatus } from "../../types/domain"
import type { DbCategory, DbProduct, DbProductImage, DbVariant } from "../../types/database"
import { getDb, mapDbProductToProduct } from "./client"
import {
  ensureBrandId,
  ensureCategoryId,
  generateUniqueProductSlug,
  toCentimos,
  toDbEtiqueta,
} from "./helpers"
import {
  defaultMemoryRepository,
  type ProductQueryOptions,
  type SaveProductInput,
} from "./memoryRepository"

export type { ProductQueryOptions, SaveProductInput }

/**
 * Obtiene productos desde D1 aplicando filtros SQL cuando se especifican
 * (o desde el repositorio en memoria en desarrollo sin D1).
 */
export async function getProducts(
  env?: unknown,
  options: ProductQueryOptions = {}
): Promise<Product[]> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getProducts(options)

  const includeDrafts = Boolean(options.includeDrafts)

  try {
    const conditions: string[] = [includeDrafts ? "p.estado != 'archivado'" : "p.estado = 'publicado'"]
    const bindings: Array<string | number> = []

    if (options.category && options.category !== "Todas las categorías") {
      conditions.push("LOWER(c.nombre) = LOWER(?)")
      bindings.push(options.category.trim())
    }

    if (options.brand && options.brand !== "Todas las marcas") {
      conditions.push("LOWER(m.nombre) = LOWER(?)")
      bindings.push(options.brand.trim())
    }

    if (options.search && options.search.trim().length > 0) {
      const pattern = `%${options.search.trim().toLowerCase()}%`
      conditions.push(
        "(LOWER(p.nombre) LIKE ? OR LOWER(m.nombre) LIKE ? OR LOWER(COALESCE(p.modelo, '')) LIKE ? OR LOWER(COALESCE(p.sku, '')) LIKE ?)"
      )
      bindings.push(pattern, pattern, pattern, pattern)
    }

    if (options.stockOnly) {
      conditions.push("p.stock = 1")
    }

    if (options.offersOnly) {
      conditions.push(
        "(p.etiqueta = 'oferta' OR (p.precio_anterior_centimos IS NOT NULL AND p.precio_anterior_centimos > p.precio_centimos))"
      )
    }

    let orderBy = "p.id ASC"
    if (options.sort === "Menor precio") orderBy = "p.precio_centimos ASC, p.id ASC"
    else if (options.sort === "Mayor precio") orderBy = "p.precio_centimos DESC, p.id ASC"
    else if (options.sort === "Novedades") orderBy = "p.id DESC"

    const query = `
      SELECT
        p.*,
        m.nombre AS marca_nombre,
        c.nombre AS categoria_nombre,
        cp.nombre AS categoria_padre_nombre
      FROM productos p
      JOIN marcas m ON p.marca_id = m.id
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN categorias cp ON c.parent_id = cp.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
    `

    const stmt = bindings.length > 0 ? db.prepare(query).bind(...bindings) : db.prepare(query)
    const { results } = await stmt.all<DbProduct>()
    if (!results || results.length === 0) return []

    const [{ results: allVariants }, { results: allImages }] = await Promise.all([
      db.prepare("SELECT * FROM variantes_producto WHERE activo = 1 ORDER BY orden ASC, id ASC").all<DbVariant>(),
      db.prepare("SELECT * FROM imagenes_producto ORDER BY es_principal DESC, orden ASC, id ASC").all<DbProductImage>(),
    ])

    const variantsByProduct = new Map<number, DbVariant[]>()
    for (const v of allVariants || []) {
      const list = variantsByProduct.get(v.producto_id)
      if (list) list.push(v)
      else variantsByProduct.set(v.producto_id, [v])
    }

    const imagesByProduct = new Map<number, DbProductImage[]>()
    for (const img of allImages || []) {
      const list = imagesByProduct.get(img.producto_id)
      if (list) list.push(img)
      else imagesByProduct.set(img.producto_id, [img])
    }

    return results.map((p) =>
      mapDbProductToProduct(p, variantsByProduct.get(p.id) || [], imagesByProduct.get(p.id) || [])
    )
  } catch (error) {
    console.warn("[D1] Error al obtener productos, usando fallback:", error)
    return defaultMemoryRepository.getProducts(options)
  }
}

/**
 * Obtiene un producto por su ID junto con sus variantes e imágenes
 */
export async function getProductById(
  id: number,
  env?: unknown,
  options: { includeDrafts?: boolean } = {}
): Promise<Product | null> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getProductById(id, options)

  try {
    const whereClause = options.includeDrafts
      ? "p.id = ? AND p.estado != 'archivado'"
      : "p.id = ? AND p.estado = 'publicado'"
    const query = `
      SELECT
        p.*,
        m.nombre AS marca_nombre,
        c.nombre AS categoria_nombre,
        cp.nombre AS categoria_padre_nombre
      FROM productos p
      JOIN marcas m ON p.marca_id = m.id
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN categorias cp ON c.parent_id = cp.id
      WHERE ${whereClause}
      LIMIT 1
    `
    const productRow = await db.prepare(query).bind(id).first<DbProduct>()
    if (!productRow) return null

    const [{ results: variants }, { results: images }] = await Promise.all([
      db
        .prepare("SELECT * FROM variantes_producto WHERE producto_id = ? AND activo = 1 ORDER BY orden ASC, id ASC")
        .bind(id)
        .all<DbVariant>(),
      db
        .prepare("SELECT * FROM imagenes_producto WHERE producto_id = ? ORDER BY es_principal DESC, orden ASC, id ASC")
        .bind(id)
        .all<DbProductImage>(),
    ])

    return mapDbProductToProduct(productRow, variants || [], images || [])
  } catch (error) {
    console.warn(`[D1] Error al obtener producto ${id}, usando fallback:`, error)
    return defaultMemoryRepository.getProductById(id, options)
  }
}

/**
 * Obtiene productos relacionados (manuales en productos_relacionados primero; completa con publicados)
 */
export async function getRelatedProducts(productId: number, env?: unknown, limit = 3): Promise<Product[]> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getRelatedProducts(productId, limit)

  try {
    const { results: manualRows } = await db
      .prepare("SELECT producto_relacionado_id FROM productos_relacionados WHERE producto_origen_id = ? ORDER BY orden ASC LIMIT ?")
      .bind(productId, limit)
      .all<{ producto_relacionado_id: number }>()

    const allPublished = await getProducts(env)
    const mapById = new Map(allPublished.map((p) => [p.id, p]))
    const picked: Product[] = []
    const seen = new Set<number>([productId])

    for (const row of manualRows || []) {
      const prod = mapById.get(row.producto_relacionado_id)
      if (prod && !seen.has(prod.id)) {
        picked.push(prod)
        seen.add(prod.id)
      }
    }

    for (const prod of allPublished) {
      if (picked.length >= limit) break
      if (!seen.has(prod.id)) {
        picked.push(prod)
        seen.add(prod.id)
      }
    }

    return picked.slice(0, limit)
  } catch {
    return defaultMemoryRepository.getRelatedProducts(productId, limit)
  }
}

/**
 * Obtiene las categorías operativas para el Home y listados simples ([nombre, descripción, archivo])
 */
export async function getCategories(env?: unknown): Promise<[string, string, string][]> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getCategories()

  try {
    const { results } = await db
      .prepare("SELECT nombre, descripcion, imagen_key FROM categorias WHERE activo = 1 AND parent_id IS NOT NULL ORDER BY orden ASC")
      .all<DbCategory>()

    if (!results || results.length === 0) return []
    return results.map((c) => [c.nombre, c.descripcion || c.nombre, (c.imagen_key || "").replace("/assets/", "")])
  } catch (error) {
    console.warn("[D1] Error al obtener categorías, usando fallback:", error)
    return defaultMemoryRepository.getCategories()
  }
}

/**
 * Obtiene las categorías agrupadas por línea padre para selectores y admin
 */
export async function getCategoryTree(env?: unknown): Promise<CategoryItem[]> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getCategoryTree()

  try {
    const query = `
      SELECT
        c.id,
        c.parent_id,
        cp.nombre AS parent_nombre,
        c.nombre,
        c.slug,
        c.descripcion,
        c.imagen_key,
        c.orden
      FROM categorias c
      LEFT JOIN categorias cp ON c.parent_id = cp.id
      WHERE c.activo = 1 AND c.parent_id IS NOT NULL
      ORDER BY COALESCE(cp.orden, 999) ASC, c.orden ASC
    `
    const { results } = await db.prepare(query).all<DbCategory>()
    return (results || []).map((c) => ({
      id: c.id,
      parentId: c.parent_id ?? null,
      parentName: c.parent_nombre || "General",
      name: c.nombre,
      slug: c.slug,
      description: c.descripcion || undefined,
      image: c.imagen_key || undefined,
      order: c.orden,
    }))
  } catch (error) {
    console.warn("[D1] Error al obtener árbol de categorías:", error)
    return []
  }
}

/**
 * Actualiza el stock de un producto (1 = disponible, 0 = agotado)
 */
export async function updateProductStock(id: number, stock: boolean, env?: unknown): Promise<boolean> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.updateProductStock(id, stock)

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
 * Guarda o actualiza un producto y su galería múltiple en Cloudflare D1
 */
export async function saveProduct(data: SaveProductInput, env?: unknown): Promise<Product | null> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.saveProduct(data)

  const rawImages = (data.images || [])
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 3)
  if (rawImages.length === 0) {
    rawImages.push(data.image?.trim() || "/assets/a0f2f.png")
  }

  try {
    const marcaId = await ensureBrandId(db, data.brand)
    const catId = await ensureCategoryId(db, data.category)
    const slugBase = `${data.name} ${data.model || ""}`.trim()
    const slug = await generateUniqueProductSlug(db, slugBase, data.id)
    const precioCentimos = toCentimos(data.price)
    const precioAnteriorCentimos = data.oldPrice != null ? toCentimos(data.oldPrice) : null
    const stockInt = data.stock !== false ? 1 : 0
    const etiqueta = toDbEtiqueta(data.badge)
    const estado: ProductStatus = data.status === "borrador" ? "borrador" : "publicado"
    const modelo = data.model?.trim() || null
    const sku = data.sku?.trim() || null
    const descripcion = data.description?.trim() || null
    const caracteristicas = data.technicalSpecs?.trim() || null
    const contenidoCaja = data.boxContents?.trim() || null

    let productId = data.id

    if (productId) {
      await db
        .prepare(`
          UPDATE productos
          SET marca_id = ?, categoria_id = ?, nombre = ?, slug = ?, modelo = ?, sku = ?,
              descripcion = ?, caracteristicas_tecnicas = ?, contenido_caja = ?,
              precio_centimos = ?, precio_anterior_centimos = ?, stock = ?,
              etiqueta = ?, estado = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          marcaId,
          catId,
          data.name,
          slug,
          modelo,
          sku,
          descripcion,
          caracteristicas,
          contenidoCaja,
          precioCentimos,
          precioAnteriorCentimos,
          stockInt,
          etiqueta,
          estado,
          productId
        )
        .run()
    } else {
      await db
        .prepare(`
          INSERT INTO productos (
            marca_id, categoria_id, nombre, slug, modelo, sku,
            descripcion, caracteristicas_tecnicas, contenido_caja,
            precio_centimos, precio_anterior_centimos, stock, etiqueta, estado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          marcaId,
          catId,
          data.name,
          slug,
          modelo,
          sku,
          descripcion,
          caracteristicas,
          contenidoCaja,
          precioCentimos,
          precioAnteriorCentimos,
          stockInt,
          etiqueta,
          estado
        )
        .run()

      const newRow = await db.prepare("SELECT id FROM productos WHERE slug = ? LIMIT 1").bind(slug).first<{ id: number }>()
      productId = newRow?.id
    }

    if (!productId) return null

    const imageStatements = [
      db.prepare("DELETE FROM imagenes_producto WHERE producto_id = ?").bind(productId),
      ...rawImages.map((imgUrl, idx) =>
        db
          .prepare(
            "INSERT INTO imagenes_producto (producto_id, clave_archivo, texto_alternativo, orden, es_principal) VALUES (?, ?, ?, ?, ?)"
          )
          .bind(productId, imgUrl, data.name, idx, idx === 0 ? 1 : 0)
      ),
    ]
    await db.batch(imageStatements)

    return getProductById(productId, env, { includeDrafts: true })
  } catch (error) {
    console.error("[D1] Error al guardar producto:", error)
    return null
  }
}

/**
 * Elimina un producto (archivado lógico en D1 o en repositorio en memoria)
 */
export async function deleteProduct(id: number, env?: unknown): Promise<boolean> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.deleteProduct(id)

  try {
    await db
      .prepare("UPDATE productos SET estado = 'archivado', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(id)
      .run()
    return true
  } catch (error) {
    console.error(`[D1] Error al eliminar producto ${id}:`, error)
    return false
  }
}
