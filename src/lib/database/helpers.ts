import type { D1Database, DbProduct } from "../../types/database"
import { normalizeSlug } from "./client"

const ALLOWED_BADGE_MAP: Record<string, DbProduct["etiqueta"]> = {
  destacado: "destacado",
  oferta: "oferta",
  nuevo: "nuevo",
  combo: "combo",
}

type SlugTable = "productos" | "marcas" | "categorias"

const SLUG_TABLE_SQL: Record<SlugTable, string> = {
  productos: "productos",
  marcas: "marcas",
  categorias: "categorias",
}

export function toDbEtiqueta(badge?: string): DbProduct["etiqueta"] {
  if (!badge) return "ninguna"
  return ALLOWED_BADGE_MAP[badge.trim().toLowerCase()] || "ninguna"
}

export function toCentimos(price: number): number {
  return Math.max(0, Math.round(price * 100))
}

/**
 * Genera un slug único para `productos`, `marcas` o `categorias` evitando colisiones
 * con registros existentes (incluidos los soft-deleted o archivados).
 */
export async function generateUniqueSlug(
  db: D1Database,
  table: SlugTable,
  baseText: string,
  fallbackPrefix: string,
  excludeId?: number
): Promise<string> {
  const safeTable = SLUG_TABLE_SQL[table]
  const baseSlug = normalizeSlug(baseText) || fallbackPrefix
  let candidate = baseSlug
  let counter = 1

  while (true) {
    const query = excludeId
      ? `SELECT id FROM ${safeTable} WHERE slug = ? AND id != ? LIMIT 1`
      : `SELECT id FROM ${safeTable} WHERE slug = ? LIMIT 1`
    const stmt = excludeId
      ? db.prepare(query).bind(candidate, excludeId)
      : db.prepare(query).bind(candidate)
    const existing = await stmt.first<{ id: number }>()
    if (!existing) return candidate
    counter++
    candidate = `${baseSlug}-${counter}`
  }
}

export async function generateUniqueProductSlug(
  db: D1Database,
  baseText: string,
  excludeId?: number
): Promise<string> {
  return generateUniqueSlug(db, "productos", baseText, "producto", excludeId)
}

export async function ensureBrandId(db: D1Database, brandName: string): Promise<number> {
  const cleanName = brandName.trim()
  const existing = await db
    .prepare("SELECT id, activo FROM marcas WHERE nombre = ? COLLATE NOCASE LIMIT 1")
    .bind(cleanName)
    .first<{ id: number; activo: number }>()

  if (existing) {
    if (!existing.activo) {
      await db.prepare("UPDATE marcas SET activo = 1 WHERE id = ?").bind(existing.id).run()
    }
    return existing.id
  }

  const slug = await generateUniqueSlug(db, "marcas", cleanName, "marca")
  await db.prepare("INSERT INTO marcas (nombre, slug, activo) VALUES (?, ?, 1)").bind(cleanName, slug).run()
  const created = await db
    .prepare("SELECT id FROM marcas WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<{ id: number }>()
  return created?.id || 1
}

export async function ensureCategoryId(db: D1Database, categoryName: string): Promise<number> {
  const cleanName = categoryName.trim()
  const existing = await db
    .prepare("SELECT id, activo FROM categorias WHERE nombre = ? COLLATE NOCASE LIMIT 1")
    .bind(cleanName)
    .first<{ id: number; activo: number }>()

  if (existing) {
    if (!existing.activo) {
      await db.prepare("UPDATE categorias SET activo = 1 WHERE id = ?").bind(existing.id).run()
    }
    return existing.id
  }

  const slug = await generateUniqueSlug(db, "categorias", cleanName, "categoria")
  await db
    .prepare("INSERT INTO categorias (parent_id, nombre, slug, imagen_key, activo) VALUES (1, ?, ?, ?, 1)")
    .bind(cleanName, slug, "/assets/6bf26.png")
    .run()

  const created = await db
    .prepare("SELECT id FROM categorias WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<{ id: number }>()
  return created?.id || 101
}
