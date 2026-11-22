import { products as fallbackProducts, brands as fallbackBrands } from "../../data/products"
import type { ResultadoImportacionCsv } from "../../types/domain"
import { getDb } from "./client"

export type { ResultadoImportacionCsv }

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
            }
            actualizados++
          } else {
            omitidos++
          }
          continue
        }
      }

      // Nuevo producto en fallback
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
        image: f.imagen || "/assets/a0f2f.png",
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
        const slugM = f.marca.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        await db.prepare("INSERT INTO marcas (nombre, slug, activo) VALUES (?, ?, 1)").bind(f.marca, slugM).run()
        marcaRow = await db.prepare("SELECT id FROM marcas WHERE nombre = ? LIMIT 1").bind(f.marca).first<{ id: number }>()
      }

      // Asegurar Categoría
      let catRow = await db
        .prepare("SELECT id FROM categorias WHERE nombre = ? COLLATE NOCASE LIMIT 1")
        .bind(f.categoria)
        .first<{ id: number }>()

      if (!catRow) {
        const slugC = f.categoria.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        await db
          .prepare("INSERT INTO categorias (nombre, slug, imagen_url, activo) VALUES (?, ?, ?, 1)")
          .bind(f.categoria, slugC, "/assets/6bf26.png")
          .run()
        catRow = await db.prepare("SELECT id FROM categorias WHERE nombre = ? LIMIT 1").bind(f.categoria).first<{ id: number }>()
      }

      const marcaId = marcaRow?.id || 1
      const catId = catRow?.id || 1
      const stockInt = f.stock ? 1 : 0
      const slugP = `${f.nombre}-${f.modelo}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")

      if (f.idProductoExistente && modoDuplicados === "actualizar") {
        await db
          .prepare(`
            UPDATE productos
            SET marca_id = ?, categoria_id = ?, nombre = ?, modelo = ?,
                precio = ?, precio_anterior = ?, stock = ?, badge = ?,
                descripcion = COALESCE(?, descripcion), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          .bind(
            marcaId,
            catId,
            f.nombre,
            f.modelo,
            f.precio,
            f.precioAnterior || null,
            stockInt,
            f.badge || null,
            f.descripcion || null,
            f.idProductoExistente
          )
          .run()
        actualizados++
      } else {
        await db
          .prepare(`
            INSERT INTO productos (
              marca_id, categoria_id, nombre, slug, modelo, precio, precio_anterior, imagen_principal, stock, badge, descripcion, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `)
          .bind(
            marcaId,
            catId,
            f.nombre,
            slugP,
            f.modelo,
            f.precio,
            f.precioAnterior || null,
            f.imagen || "/assets/a0f2f.png",
            stockInt,
            f.badge || null,
            f.descripcion || null
          )
          .run()
        creados++
      }
    } catch (err: any) {
      console.error(`[D1] Error al procesar fila "${f.nombre}":`, err)
      errores.push(`Error en "${f.nombre}": ${err.message || "Fallo SQL"}`)
    }
  }

  return { creados, actualizados, omitidos, errores }
}
