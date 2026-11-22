import type { Product } from "../../types/domain"
import type { D1Database, D1PreparedStatement, DbProduct, DbVariant } from "../../types/database"

export type { D1Database, D1PreparedStatement }

let missingDbWarned = false

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isD1Database(value: unknown): value is D1Database {
  return isRecord(value) && typeof value.prepare === "function"
}

/**
 * Extrae el objeto `env` del runtime de Cloudflare desde Astro.locals (`locals.runtime.env`),
 * un wrapper `{ env }` o un objeto `env` pasado directamente.
 */
export function getRuntimeEnv(source?: unknown): Record<string, unknown> | null {
  if (!isRecord(source)) return null

  if ("runtime" in source && isRecord(source.runtime) && "env" in source.runtime && isRecord(source.runtime.env)) {
    return source.runtime.env
  }

  if ("env" in source && isRecord(source.env)) {
    return source.env
  }

  return source
}

/**
 * Obtiene el binding de Cloudflare D1 desde Astro.locals (`locals.runtime.env.DB`),
 * desde `env.DB` directo o desde `globalThis.DB` si existiera.
 */
export function getDb(source?: unknown): D1Database | null {
  const runtimeEnv = getRuntimeEnv(source)
  if (runtimeEnv && isD1Database(runtimeEnv.DB)) {
    return runtimeEnv.DB
  }

  if (isRecord(source) && isD1Database(source.DB)) {
    return source.DB
  }

  const globalRecord = typeof globalThis !== "undefined" ? (globalThis as Record<string, unknown>) : null
  if (globalRecord && isD1Database(globalRecord.DB)) {
    return globalRecord.DB
  }

  if (!missingDbWarned) {
    missingDbWarned = true
    console.warn("[D1] Binding DB no disponible en el contexto actual; operando en modo fallback en memoria.")
  }

  return null
}

/**
 * Mapea una fila de producto SQLite (DbProduct) al modelo Product de la interfaz
 */
export function mapDbProductToProduct(row: DbProduct, variants: DbVariant[] = []): Product {
  const defaultVariant = variants.find((v) => v.stock > 0)?.nombre_variante || variants[0]?.nombre_variante

  return {
    id: row.id,
    name: row.nombre,
    brand: row.marca_nombre || "GENÉRICO",
    model: row.modelo,
    price: Number(row.precio),
    oldPrice: row.precio_anterior ? Number(row.precio_anterior) : undefined,
    image: row.imagen_principal,
    category: row.categoria_nombre || "General",
    stock: Boolean(row.stock),
    badge: row.badge || undefined,
    variant: defaultVariant,
    description: row.descripcion || undefined,
    variants:
      variants.length > 0
        ? variants.map((v) => ({
            id: v.id,
            name: v.nombre_variante,
            sku: v.sku || undefined,
            priceAdjustment: Number(v.precio_ajuste) || 0,
            stock: Boolean(v.stock),
          }))
        : undefined,
  }
}
