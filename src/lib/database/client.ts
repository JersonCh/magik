import type { Product } from "../../types/domain"
import type { D1Database, D1PreparedStatement, DbProduct, DbProductImage, DbVariant, R2Bucket } from "../../types/database"

export type { D1Database, D1PreparedStatement, R2Bucket }

let missingDbWarned = false

const BADGE_LABELS: Record<string, string> = {
  destacado: "Destacado",
  oferta: "Oferta",
  nuevo: "Nuevo",
  combo: "Combo",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isD1Database(value: unknown): value is D1Database {
  return isRecord(value) && typeof value.prepare === "function"
}

function isR2Bucket(value: unknown): value is R2Bucket {
  return (
    isRecord(value) &&
    typeof value.get === "function" &&
    typeof value.put === "function" &&
    typeof value.delete === "function"
  )
}

/**
 * Normaliza texto a slug SEO-friendly removiendo tildes y símbolos.
 */
export function normalizeSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
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
 * Obtiene el binding de Cloudflare R2 (`BUCKET`) desde el contexto del runtime.
 */
export function getBucket(source?: unknown): R2Bucket | null {
  const runtimeEnv = getRuntimeEnv(source)
  if (runtimeEnv && isR2Bucket(runtimeEnv.BUCKET)) {
    return runtimeEnv.BUCKET
  }
  if (isRecord(source) && isR2Bucket(source.BUCKET)) {
    return source.BUCKET
  }
  return null
}

/**
 * Mapea una fila de producto SQLite (DbProduct) al modelo Product de la interfaz
 */
export function mapDbProductToProduct(
  row: DbProduct,
  variants: DbVariant[] = [],
  images: DbProductImage[] = []
): Product {
  const orderedImages = [...images].sort((a, b) => {
    if (a.es_principal !== b.es_principal) return b.es_principal - a.es_principal
    if (a.orden !== b.orden) return a.orden - b.orden
    return a.id - b.id
  })
  const imageList = orderedImages.map((img) => img.clave_archivo)
  const mainImage = imageList[0] || "/assets/a0f2f.png"
  const defaultVariant = variants.find((v) => v.stock > 0)?.nombre_variante || variants[0]?.nombre_variante
  const badge = row.etiqueta && row.etiqueta !== "ninguna" ? BADGE_LABELS[row.etiqueta] || row.etiqueta : undefined

  return {
    id: row.id,
    name: row.nombre,
    brand: row.marca_nombre || "GENÉRICO",
    model: row.modelo || "",
    sku: row.sku || undefined,
    price: Math.round(Number(row.precio_centimos)) / 100,
    oldPrice:
      row.precio_anterior_centimos != null && Number(row.precio_anterior_centimos) > 0
        ? Math.round(Number(row.precio_anterior_centimos)) / 100
        : undefined,
    image: mainImage,
    images: imageList.length > 0 ? imageList : [mainImage],
    category: row.categoria_nombre || "General",
    categoryGroup: row.categoria_padre_nombre || undefined,
    stock: Boolean(row.stock),
    badge,
    variant: defaultVariant,
    description: row.descripcion || undefined,
    technicalSpecs: row.caracteristicas_tecnicas || undefined,
    boxContents: row.contenido_caja || undefined,
    status: row.estado,
    variants:
      variants.length > 0
        ? variants.map((v) => ({
            id: v.id,
            name: v.nombre_variante,
            sku: v.sku || undefined,
            price: v.precio_centimos != null ? Math.round(Number(v.precio_centimos)) / 100 : undefined,
            stock: Boolean(v.stock),
          }))
        : undefined,
  }
}
