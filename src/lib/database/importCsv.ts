import { products as fallbackProducts, brands as fallbackBrands } from "../../data/products"
import type { ResultadoImportacionCsv } from "../../types/domain"
import { getDb, normalizeSlug } from "./client"

export type { ResultadoImportacionCsv }

const ETQ_MAP: Record<string, string> = {
  destacado: "destacado",
  oferta: "oferta",
  nuevo: "nuevo",
  combo: "combo",
}

function mapEtiqueta(badge?: string): string {
  if (!badge) return "ninguna"
  return ETQ_MAP[badge.trim().toLowerCase()] || "ninguna"
}

function toCentimos(val: number): number {
  return Math.max(0, Math.round(val * 100))
}

/**
 * Importa por lotes productos validados desde archivo Excel / CSV hacia Cloudflare D1 o memoria fallback.
 */
export async function importarProductosCsvEnDb(
  filas: Array<{
    nombre: string
    marca: string
    modelo: string
    categoria: string
    precio: number
    precioAnterior?: number
    stock: boolean
    badge?: string
    imagen?: string
    descripcion?: string
    esValido: boolean
    idProductoExistente?: number
  }>,
  modoDuplicados: "omitir" | "actualizar",
  env?: unknown
): Promise<ResultadoImportacionCsv> {
  const db = getDb(env)
  let creados = 0
  let actualizados = 0
  let omitidos = 0
  const errores: string[] = []

  // Modo local sin Cloudflare D1
  if (!db) {
    for (const f of filas) {
      if (!f.esValido) {
        omitidos++
        continue
      }

      if (f.idProductoExistente) {
        if (modoDuplicados === "omitir") {
          omitidos++
          continue
        } else {
          const idx = fallbackProducts.findIndex((p) => p.id === f.idProductoExistente)
          if (idx > -1) {
            fallbackProducts[idx] = {
              ...fallbackProducts[idx],
              name: f.nombre,
              brand: f.marca,
              model: f.modelo,
              category: f.categoria,
              price: f.precio,
              oldPrice: f.precioAnterior,
              stock: f.stock,
              badge: f.badge,
              description: f.descripcion || fallbackProducts[idx].description,
            }
            actualizados++
          } else {
            omitidos++
          }
          continue
        }
      }

      const maxId = Math.max(...fallbackProducts.map((p) => p.id), 0)
      fallbackProducts.push({
        id: maxId + 1,
        name: f.nombre,
        brand: f.marca,
        model: f.modelo,
        category: f.categoria,
        price: f.precio,
        oldPrice: f.precioAnterior,
        stock: f.stock,
        badge: f.badge,
        description: f.descripcion,
        image: f.imagen || "/assets/a0f2f.png",
        images: [f.imagen || "/assets/a0f2f.png"],
      })
      if (!fallbackBrands.includes(f.marca)) {
        fallbackBrands.push(f.marca)
      }
      creados++
    }

    return { creados, actualizados, omitidos, errores }
  }

  // Modo Cloudflare D1
  for (const f of filas) {
    if (!f.esValido) {
      omitidos++
      continue
    }

    try {
      if (f.idProductoExistente && modoDuplicados === "omitir") {
        omitidos++
        continue
      }

      // Asegurar Marca
      let marcaRow = await db
        .prepare("SELECT id FROM marcas WHERE nombre = ? COLLATE NOCASE LIMIT 1")
        .bind(f.marca)
        .first<{ id: number }>()

      if (!marcaRow) {
        const slugM = normalizeSlug(f.marca) || `marca-${Date.now()}`
        await db.prepare("INSERT INTO marcas (nombre, slug, activo) VALUES (?, ?, 1)").bind(f.marca, slugM).run()
        marcaRow = await db.prepare("SELECT id FROM marcas WHERE slug = ? LIMIT 1").bind(slugM).first<{ id: number }>()
      }

      // Asegurar Categoría
      let catRow = await db
        .prepare("SELECT id FROM categorias WHERE nombre = ? COLLATE NOCASE LIMIT 1")
        .bind(f.categoria)
        .first<{ id: number }>()

      if (!catRow) {
        const slugC = normalizeSlug(f.categoria) || `cat-${Date.now()}`
        await db
          .prepare("INSERT INTO categorias (parent_id, nombre, slug, imagen_key, activo) VALUES (1, ?, ?, ?, 1)")
          .bind(f.categoria, slugC, "/assets/6bf26.png")
          .run()
        catRow = await db.prepare("SELECT id FROM categorias WHERE slug = ? LIMIT 1").bind(slugC).first<{ id: number }>()
      }

      const marcaId = marcaRow?.id || 1
      const catId = catRow?.id || 101
      const stockInt = f.stock ? 1 : 0
      const precioCentimos = toCentimos(f.precio)
      const precioAnteriorCentimos = f.precioAnterior ? toCentimos(f.precioAnterior) : null
      const etiqueta = mapEtiqueta(f.badge)
      const modelo = f.modelo?.trim() || null

      if (f.idProductoExistente && modoDuplicados === "actualizar") {
        await db
          .prepare(`
            UPDATE productos
            SET marca_id = ?, categoria_id = ?, nombre = ?, modelo = ?,
                precio_centimos = ?, precio_anterior_centimos = ?, stock = ?, etiqueta = ?,
                descripcion = COALESCE(?, descripcion), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          .bind(
            marcaId,
            catId,
            f.nombre,
            modelo,
            precioCentimos,
            precioAnteriorCentimos,
            stockInt,
            etiqueta,
            f.descripcion || null,
            f.idProductoExistente
          )
          .run()

        if (f.imagen) {
          await db
            .prepare("UPDATE imagenes_producto SET clave_archivo = ? WHERE producto_id = ? AND es_principal = 1")
            .bind(f.imagen, f.idProductoExistente)
            .run()
        }
        actualizados++
      } else {
        const baseSlug = normalizeSlug(`${f.nombre} ${f.modelo || ""}`) || "producto"
        let slugP = baseSlug
        let counter = 1
        while (await db.prepare("SELECT id FROM productos WHERE slug = ? LIMIT 1").bind(slugP).first()) {
          counter++
          slugP = `${baseSlug}-${counter}`
        }

        await db
          .prepare(`
            INSERT INTO productos (
              marca_id, categoria_id, nombre, slug, modelo,
              precio_centimos, precio_anterior_centimos, stock, etiqueta, descripcion, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'publicado')
          `)
          .bind(
            marcaId,
            catId,
            f.nombre,
            slugP,
            modelo,
            precioCentimos,
            precioAnteriorCentimos,
            stockInt,
            etiqueta,
            f.descripcion || null
          )
          .run()

        const created = await db.prepare("SELECT id FROM productos WHERE slug = ? LIMIT 1").bind(slugP).first<{ id: number }>()
        if (created?.id) {
          await db
            .prepare(
              "INSERT INTO imagenes_producto (producto_id, clave_archivo, texto_alternativo, orden, es_principal) VALUES (?, ?, ?, 0, 1)"
            )
            .bind(created.id, f.imagen || "/assets/a0f2f.png", f.nombre)
            .run()
        }
        creados++
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fallo SQL"
      console.error(`[D1] Error al procesar fila "${f.nombre}":`, err)
      errores.push(`Error en "${f.nombre}": ${msg}`)
    }
  }

  return { creados, actualizados, omitidos, errores }
}
