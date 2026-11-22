import { products as fallbackProducts, brands as fallbackBrands } from "../../data/products"
import type { BrandWithCount } from "../../types/domain"
import type { DbBrand } from "../../types/database"
import { getDb } from "./client"

export type { BrandWithCount }

function normalizeSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getFallbackBrandsWithCounts(): BrandWithCount[] {
  return fallbackBrands.map((b, idx) => ({
    id: idx + 1,
    nombre: b,
    slug: normalizeSlug(b),
    totalProductos: fallbackProducts.filter((p) => p.brand.toUpperCase() === b.toUpperCase()).length,
    activo: true,
  }))
}

/**
 * Obtiene la lista simple de marcas
 */
export async function getBrands(env?: unknown): Promise<string[]> {
  const db = getDb(env)
  if (!db) return fallbackBrands

  try {
    const { results } = await db
      .prepare("SELECT nombre FROM marcas WHERE activo = 1 ORDER BY nombre ASC")
      .all<DbBrand>()

    if (!results || results.length === 0) return []
    return results.map((m) => m.nombre)
  } catch (error) {
    console.warn("[D1] Error al obtener marcas, usando fallback:", error)
    return fallbackBrands
  }
}

/**
 * Obtiene las marcas con el total de productos asociados
 */
export async function getBrandsWithCounts(env?: unknown): Promise<BrandWithCount[]> {
  const db = getDb(env)
  if (!db) {
    return getFallbackBrandsWithCounts()
  }

  try {
    const query = `
      SELECT m.id, m.nombre, m.slug, m.activo, COUNT(p.id) AS total_productos
      FROM marcas m
      LEFT JOIN productos p ON p.marca_id = m.id AND p.activo = 1
      WHERE m.activo = 1
      GROUP BY m.id, m.nombre, m.slug, m.activo
      ORDER BY m.nombre ASC
    `
    const { results } = await db.prepare(query).all<{
      id: number
      nombre: string
      slug: string
      activo: number
      total_productos: number
    }>()

    if (!results || results.length === 0) {
      return []
    }

    return results.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      slug: r.slug,
      totalProductos: Number(r.total_productos) || 0,
      activo: Boolean(r.activo),
    }))
  } catch (error) {
    console.warn("[D1] Error al obtener marcas con conteo:", error)
    return getFallbackBrandsWithCounts()
  }
}

/**
 * Guarda o actualiza una marca (reactiva si existía como soft-deleted)
 */
export async function saveBrand(
  data: { id?: number; nombre: string },
  env?: unknown
): Promise<BrandWithCount | null> {
  const db = getDb(env)
  const slug = normalizeSlug(data.nombre)

  if (!db) {
    if (!fallbackBrands.some((b) => b.toUpperCase() === data.nombre.toUpperCase())) {
      fallbackBrands.push(data.nombre)
    }
    return {
      id: data.id || fallbackBrands.length,
      nombre: data.nombre,
      slug,
      totalProductos: fallbackProducts.filter((p) => p.brand.toUpperCase() === data.nombre.toUpperCase()).length,
      activo: true,
    }
  }

  try {
    if (data.id) {
      await db
        .prepare("UPDATE marcas SET nombre = ?, slug = ? WHERE id = ?")
        .bind(data.nombre, slug, data.id)
        .run()
    } else {
      const existing = await db
        .prepare("SELECT id FROM marcas WHERE slug = ? OR nombre = ? COLLATE NOCASE LIMIT 1")
        .bind(slug, data.nombre)
        .first<{ id: number }>()

      if (existing) {
        await db
          .prepare("UPDATE marcas SET nombre = ?, slug = ?, activo = 1 WHERE id = ?")
          .bind(data.nombre, slug, existing.id)
          .run()
      } else {
        await db
          .prepare("INSERT INTO marcas (nombre, slug, activo) VALUES (?, ?, 1)")
          .bind(data.nombre, slug)
          .run()
      }
    }

    const row = await db
      .prepare(`
        SELECT m.id, m.nombre, m.slug, m.activo, COUNT(p.id) AS total_productos
        FROM marcas m
        LEFT JOIN productos p ON p.marca_id = m.id AND p.activo = 1
        WHERE m.slug = ?
        GROUP BY m.id, m.nombre, m.slug, m.activo
        LIMIT 1
      `)
      .bind(slug)
      .first<{
        id: number
        nombre: string
        slug: string
        activo: number
        total_productos: number
      }>()

    if (!row) return null

    return {
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      totalProductos: Number(row.total_productos) || 0,
      activo: Boolean(row.activo),
    }
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
  if (!db) {
    if (id > 0 && id <= fallbackBrands.length) {
      fallbackBrands.splice(id - 1, 1)
      return true
    }
    return false
  }

  try {
    await db.prepare("UPDATE marcas SET activo = 0 WHERE id = ?").bind(id).run()
    return true
  } catch (error) {
    console.error(`[D1] Error al eliminar marca ${id}:`, error)
    return false
  }
}
