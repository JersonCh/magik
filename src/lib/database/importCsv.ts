import type { D1Database, D1PreparedStatement } from "../../types/database"
import type { ResultadoImportacionCsv } from "../../types/domain"
import type { ValidatedImportRow } from "../validators/admin"
import { getDb, normalizeSlug } from "./client"
import { toCentimos, toDbEtiqueta } from "./helpers"
import { defaultMemoryRepository } from "./memoryRepository"

export type { ResultadoImportacionCsv }

const BATCH_CHUNK_SIZE = 40

async function runInBatches(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += BATCH_CHUNK_SIZE) {
    const chunk = statements.slice(i, i + BATCH_CHUNK_SIZE)
    if (chunk.length > 0) {
      await db.batch(chunk)
    }
  }
}

function allocateUniqueSlug(
  baseText: string,
  usedSlugs: Set<string>,
  fallbackPrefix = "producto"
): string {
  const baseSlug = normalizeSlug(baseText) || fallbackPrefix
  let candidate = baseSlug
  let counter = 1
  while (usedSlugs.has(candidate)) {
    counter++
    candidate = `${baseSlug}-${counter}`
  }
  usedSlugs.add(candidate)
  return candidate
}

/**
 * Importa por lotes productos validados hacia Cloudflare D1 usando mapas pre-cargados
 * y `db.batch()` (sin consultas N+1 por fila).
 */
export async function importarProductosCsvEnDb(
  filas: ValidatedImportRow[],
  modoDuplicados: "omitir" | "actualizar",
  env?: unknown
): Promise<ResultadoImportacionCsv> {
  const db = getDb(env)
  if (!db) {
    return defaultMemoryRepository.importProducts(filas, modoDuplicados)
  }

  let creados = 0
  let actualizados = 0
  let omitidos = 0
  const errores: string[] = []

  // 1. Pre-cargar marcas, categorías y slugs existentes en 3 consultas globales
  const [{ results: brandRows }, { results: catRows }, { results: slugRows }] = await Promise.all([
    db.prepare("SELECT id, nombre, slug, activo FROM marcas").all<{ id: number; nombre: string; slug: string; activo: number }>(),
    db.prepare("SELECT id, nombre, slug, activo FROM categorias").all<{ id: number; nombre: string; slug: string; activo: number }>(),
    db.prepare("SELECT slug FROM productos").all<{ slug: string }>(),
  ])

  const brandMap = new Map<string, { id: number; activo: number }>()
  const usedBrandSlugs = new Set<string>()
  for (const b of brandRows || []) {
    brandMap.set(b.nombre.trim().toUpperCase(), { id: b.id, activo: b.activo })
    usedBrandSlugs.add(b.slug)
  }

  const catMap = new Map<string, { id: number; activo: number }>()
  const usedCatSlugs = new Set<string>()
  for (const c of catRows || []) {
    catMap.set(c.nombre.trim().toUpperCase(), { id: c.id, activo: c.activo })
    usedCatSlugs.add(c.slug)
  }

  const usedSlugs = new Set<string>((slugRows || []).map((s) => s.slug))

  // 2. Asegurar / reactivar marcas y categorías faltantes una sola vez por nombre único
  const brandIdsToActivate: number[] = []
  const missingBrands = new Map<string, { nombre: string; slug: string }>()
  const catIdsToActivate: number[] = []
  const missingCats = new Map<string, { nombre: string; slug: string }>()

  for (const f of filas) {
    if (!f.esValido) continue
    if (f.idProductoExistente && modoDuplicados === "omitir") continue

    const bKey = f.marca.trim().toUpperCase()
    const existingB = brandMap.get(bKey)
    if (existingB) {
      if (!existingB.activo) {
        brandIdsToActivate.push(existingB.id)
        existingB.activo = 1
      }
    } else if (!missingBrands.has(bKey)) {
      missingBrands.set(bKey, {
        nombre: f.marca.trim(),
        slug: allocateUniqueSlug(f.marca, usedBrandSlugs, "marca"),
      })
    }

    const cKey = f.categoria.trim().toUpperCase()
    const existingC = catMap.get(cKey)
    if (existingC) {
      if (!existingC.activo) {
        catIdsToActivate.push(existingC.id)
        existingC.activo = 1
      }
    } else if (!missingCats.has(cKey)) {
      missingCats.set(cKey, {
        nombre: f.categoria.trim(),
        slug: allocateUniqueSlug(f.categoria, usedCatSlugs, "categoria"),
      })
    }
  }

  const taxonomyPrepStmts: D1PreparedStatement[] = [
    ...brandIdsToActivate.map((id) => db.prepare("UPDATE marcas SET activo = 1 WHERE id = ?").bind(id)),
    ...catIdsToActivate.map((id) => db.prepare("UPDATE categorias SET activo = 1 WHERE id = ?").bind(id)),
    ...Array.from(missingBrands.values()).map((b) =>
      db.prepare("INSERT OR IGNORE INTO marcas (nombre, slug, activo) VALUES (?, ?, 1)").bind(b.nombre, b.slug)
    ),
    ...Array.from(missingCats.values()).map((c) =>
      db
        .prepare("INSERT OR IGNORE INTO categorias (parent_id, nombre, slug, imagen_key, activo) VALUES (1, ?, ?, ?, 1)")
        .bind(c.nombre, c.slug, "/assets/6bf26.png")
    ),
  ]

  if (taxonomyPrepStmts.length > 0) {
    await runInBatches(db, taxonomyPrepStmts)
    if (missingBrands.size > 0) {
      const { results: refreshedBrands } = await db
        .prepare("SELECT id, nombre, activo FROM marcas")
        .all<{ id: number; nombre: string; activo: number }>()
      for (const b of refreshedBrands || []) {
        brandMap.set(b.nombre.trim().toUpperCase(), { id: b.id, activo: b.activo })
      }
    }
    if (missingCats.size > 0) {
      const { results: refreshedCats } = await db
        .prepare("SELECT id, nombre, activo FROM categorias")
        .all<{ id: number; nombre: string; activo: number }>()
      for (const c of refreshedCats || []) {
        catMap.set(c.nombre.trim().toUpperCase(), { id: c.id, activo: c.activo })
      }
    }
  }

  // 3. Construir sentencias batch separando actualizaciones e inserciones
  const updateStmts: D1PreparedStatement[] = []
  const insertProductStmts: D1PreparedStatement[] = []
  const pendingInserts: Array<{ slug: string; nombre: string; imagen: string }> = []

  for (const f of filas) {
    if (!f.esValido) {
      omitidos++
      continue
    }

    if (f.idProductoExistente && modoDuplicados === "omitir") {
      omitidos++
      continue
    }

    const marcaId = brandMap.get(f.marca.trim().toUpperCase())?.id || 1
    const catId = catMap.get(f.categoria.trim().toUpperCase())?.id || 101
    const stockInt = f.stock ? 1 : 0
    const precioCentimos = toCentimos(f.precio)
    const precioAnteriorCentimos = f.precioAnterior ? toCentimos(f.precioAnterior) : null
    const etiqueta = toDbEtiqueta(f.badge)
    const modelo = f.modelo?.trim() || null
    const sku = f.sku?.trim() || null

    if (f.idProductoExistente && modoDuplicados === "actualizar") {
      updateStmts.push(
        db
          .prepare(`
            UPDATE productos
            SET marca_id = ?, categoria_id = ?, nombre = ?, modelo = ?,
                sku = COALESCE(?, sku),
                precio_centimos = ?, precio_anterior_centimos = ?, stock = ?, etiqueta = ?,
                descripcion = COALESCE(?, descripcion),
                caracteristicas_tecnicas = COALESCE(?, caracteristicas_tecnicas),
                contenido_caja = COALESCE(?, contenido_caja),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          .bind(
            marcaId,
            catId,
            f.nombre,
            modelo,
            sku,
            precioCentimos,
            precioAnteriorCentimos,
            stockInt,
            etiqueta,
            f.descripcion || null,
            f.caracteristicasTecnicas || null,
            f.contenidoCaja || null,
            f.idProductoExistente
          )
      )

      if (f.imagen) {
        updateStmts.push(
          db
            .prepare("UPDATE imagenes_producto SET clave_archivo = ? WHERE producto_id = ? AND es_principal = 1")
            .bind(f.imagen, f.idProductoExistente)
        )
      }
      actualizados++
    } else {
      const slugP = allocateUniqueSlug(`${f.nombre} ${modelo || ""}`, usedSlugs)
      insertProductStmts.push(
        db
          .prepare(`
            INSERT INTO productos (
              marca_id, categoria_id, nombre, slug, modelo, sku,
              precio_centimos, precio_anterior_centimos, stock, etiqueta,
              descripcion, caracteristicas_tecnicas, contenido_caja, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'publicado')
          `)
          .bind(
            marcaId,
            catId,
            f.nombre,
            slugP,
            modelo,
            sku,
            precioCentimos,
            precioAnteriorCentimos,
            stockInt,
            etiqueta,
            f.descripcion || null,
            f.caracteristicasTecnicas || null,
            f.contenidoCaja || null
          )
      )
      pendingInserts.push({
        slug: slugP,
        nombre: f.nombre,
        imagen: f.imagen || "/assets/a0f2f.png",
      })
      creados++
    }
  }

  // 4. Ejecutar lotes de actualización e inserción
  try {
    if (updateStmts.length > 0) {
      await runInBatches(db, updateStmts)
    }

    if (insertProductStmts.length > 0) {
      await runInBatches(db, insertProductStmts)

      // Resolver IDs recién insertados por lotes de slug y registrar su imagen principal
      const idBySlug = new Map<string, number>()
      for (let i = 0; i < pendingInserts.length; i += BATCH_CHUNK_SIZE) {
        const chunk = pendingInserts.slice(i, i + BATCH_CHUNK_SIZE)
        const placeholders = chunk.map(() => "?").join(",")
        const { results: insertedRows } = await db
          .prepare(`SELECT id, slug FROM productos WHERE slug IN (${placeholders})`)
          .bind(...chunk.map((item) => item.slug))
          .all<{ id: number; slug: string }>()
        for (const r of insertedRows || []) {
          idBySlug.set(r.slug, r.id)
        }
      }

      const insertImageStmts: D1PreparedStatement[] = []
      for (const item of pendingInserts) {
        const newId = idBySlug.get(item.slug)
        if (newId) {
          insertImageStmts.push(
            db
              .prepare(
                "INSERT INTO imagenes_producto (producto_id, clave_archivo, texto_alternativo, orden, es_principal) VALUES (?, ?, ?, 0, 1)"
              )
              .bind(newId, item.imagen, item.nombre)
          )
        }
      }
      if (insertImageStmts.length > 0) {
        await runInBatches(db, insertImageStmts)
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Fallo SQL en lote"
    console.error("[D1] Error en importación batch:", err)
    errores.push(`Error en ejecución de lote SQL: ${msg}`)
  }

  return { creados, actualizados, omitidos, errores }
}
