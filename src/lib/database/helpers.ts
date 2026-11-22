import type { D1Database, DbProduct } from "../../types/database"
import { normalizeSlug } from "./client"

const ALLOWED_BADGE_MAP: Record<string, DbProduct["etiqueta"]> = {
  destacado: "destacado",
  oferta: "oferta",
  nuevo: "nuevo",
  combo: "combo",
}

export function toDbEtiqueta(badge?: string): DbProduct["etiqueta"] {
  if (!badge) return "ninguna"
  return ALLOWED_BADGE_MAP[badge.trim().toLowerCase()] || "ninguna"
}

export function toCentimos(price: number): number {
  return Math.max(0, Math.round(price * 100))
}

export async function generateUniqueProductSlug(
  db: D1Database,
  baseText: string,
  excludeId?: number
): Promise<string> {
  const baseSlug = normalizeSlug(baseText) || "producto"
  let candidate = baseSlug
  let counter = 1

  while (true) {
    const query = excludeId
      ? "SELECT id FROM productos WHERE slug = ? AND id != ? LIMIT 1"
      : "SELECT id FROM productos WHERE slug = ? LIMIT 1"
    const stmt = excludeId
      ? db.prepare(query).bind(candidate, excludeId)
      : db.prepare(query).bind(candidate)
    const existing = await stmt.first<{ id: number }>()
    if (!existing) return candidate
    counter++
    candidate = `${baseSlug}-${counter}`
  }
}

export async function ensureBrandId(db: D1Database, brandName: string): Promise<number> {
  const existing = await db
    .prepare("SELECT id, activo FROM marcas WHERE nombre = ? COLLATE NOCASE LIMIT 1")
    .bind(brandName)
    .first<{ id: number; activo: number }>()

  if (existing) {
    if (!existing.activo) {
      await db.prepare("UPDATE marcas SET activo = 1 WHERE id = ?").bind(existing.id).run()
    }
    return existing.id
  }

  const slug = normalizeSlug(brandName) || `marca-${Date.now()}`
  await db.prepare("INSERT INTO marcas (nombre, slug, activo) VALUES (?, ?, 1)").bind(brandName, slug).run()
  const created = await db
    .prepare("SELECT id FROM marcas WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<{ id: number }>()
  return created?.id || 1
}

export async function ensureCategoryId(db: D1Database, categoryName: string): Promise<number> {
  const existing = await db
    .prepare("SELECT id, activo FROM categorias WHERE nombre = ? COLLATE NOCASE LIMIT 1")
    .bind(categoryName)
    .first<{ id: number; activo: number }>()

  if (existing) {
    if (!existing.activo) {
      await db.prepare("UPDATE categorias SET activo = 1 WHERE id = ?").bind(existing.id).run()
    }
    return existing.id
  }

  const slug = normalizeSlug(categoryName) || `categoria-${Date.now()}`
  await db
    .prepare("INSERT INTO categorias (parent_id, nombre, slug, imagen_key, activo) VALUES (1, ?, ?, ?, 1)")
    .bind(categoryName, slug, "/assets/6bf26.png")
    .run()

  const created = await db
    .prepare("SELECT id FROM categorias WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<{ id: number }>()
  return created?.id || 101
}
