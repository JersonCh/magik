import type { BrandWithCount } from "../../types/domain"
import type { DbBrand } from "../../types/database"
import { getDb } from "./client"
import { generateUniqueSlug } from "./helpers"
import { defaultMemoryRepository } from "./memoryRepository"

export type { BrandWithCount }

const BRAND_WITH_COUNT_SELECT = `
  SELECT m.id, m.nombre, m.slug, m.activo, COUNT(p.id) AS total_productos
  FROM marcas m
  LEFT JOIN productos p ON p.marca_id = m.id AND p.estado != 'archivado'
`

interface DbBrandCountRow {
  id: number
  nombre: string
  slug: string
  activo: number
  total_productos: number
}

function mapBrandRow(r: DbBrandCountRow): BrandWithCount {
  return {
    id: r.id,
    nombre: r.nombre,
    slug: r.slug,
    totalProductos: Number(r.total_productos) || 0,
    activo: Boolean(r.activo),
  }
}

/**
 * Obtiene la lista simple de marcas activas
 */
export async function getBrands(env?: unknown): Promise<string[]> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getBrands()

  try {
    const { results } = await db
      .prepare("SELECT nombre FROM marcas WHERE activo = 1 ORDER BY nombre ASC")
      .all<DbBrand>()

    if (!results || results.length === 0) return []
    return results.map((m) => m.nombre)
  } catch (error) {
    console.warn("[D1] Error al obtener marcas, usando fallback:", error)
    return defaultMemoryRepository.getBrands()
  }
}

/**
 * Obtiene las marcas activas con el total de productos asociados (no archivados)
 */
export async function getBrandsWithCounts(env?: unknown): Promise<BrandWithCount[]> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getBrandsWithCounts()

  try {
    const query = `
      ${BRAND_WITH_COUNT_SELECT}
      WHERE m.activo = 1
      GROUP BY m.id, m.nombre, m.slug, m.activo
      ORDER BY m.nombre ASC
    `
    const { results } = await db.prepare(query).all<DbBrandCountRow>()
    if (!results || results.length === 0) return []
    return results.map(mapBrandRow)
  } catch (error) {
    console.warn("[D1] Error al obtener marcas con conteo:", error)
    return defaultMemoryRepository.getBrandsWithCounts()
  }
}

/**
 * Guarda o actualiza una marca (evita colisiones de slug y reactiva soft-deleted)
 */
export async function saveBrand(
  data: { id?: number; nombre: string },
  env?: unknown
): Promise<BrandWithCount | null> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.saveBrand(data)

  const cleanName = data.nombre.trim()
  if (!cleanName) return null

  try {
    let targetId = data.id

    if (targetId) {
      const slug = await generateUniqueSlug(db, "marcas", cleanName, "marca", targetId)
      await db
        .prepare("UPDATE marcas SET nombre = ?, slug = ?, activo = 1 WHERE id = ?")
        .bind(cleanName, slug, targetId)
        .run()
    } else {
      const existing = await db
        .prepare("SELECT id FROM marcas WHERE nombre = ? COLLATE NOCASE LIMIT 1")
        .bind(cleanName)
        .first<{ id: number }>()

      if (existing) {
        targetId = existing.id
        const slug = await generateUniqueSlug(db, "marcas", cleanName, "marca", targetId)
        await db
          .prepare("UPDATE marcas SET nombre = ?, slug = ?, activo = 1 WHERE id = ?")
          .bind(cleanName, slug, targetId)
          .run()
      } else {
        const slug = await generateUniqueSlug(db, "marcas", cleanName, "marca")
        await db
          .prepare("INSERT INTO marcas (nombre, slug, activo) VALUES (?, ?, 1)")
          .bind(cleanName, slug)
          .run()
        const created = await db
          .prepare("SELECT id FROM marcas WHERE slug = ? LIMIT 1")
          .bind(slug)
          .first<{ id: number }>()
        targetId = created?.id
      }
    }

    if (!targetId) return null

    const row = await db
      .prepare(`
        ${BRAND_WITH_COUNT_SELECT}
        WHERE m.id = ?
        GROUP BY m.id, m.nombre, m.slug, m.activo
        LIMIT 1
      `)
      .bind(targetId)
      .first<DbBrandCountRow>()

    return row ? mapBrandRow(row) : null
  } catch (error) {
    console.error("[D1] Error al guardar marca:", error)
    return null
  }
}

/**
 * Elimina una marca (soft-delete)
 */
export async function deleteBrand(id: number, env?: unknown): Promise<boolean> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.deleteBrand(id)

  try {
    await db.prepare("UPDATE marcas SET activo = 0 WHERE id = ?").bind(id).run()
    return true
  } catch (error) {
    console.error(`[D1] Error al eliminar marca ${id}:`, error)
    return false
  }
}
