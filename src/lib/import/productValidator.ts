import type { BrandWithCount, Product } from "@/types/domain"
import { isSafeImageUrl } from "../validators/admin"
import { parsearLineasCsv } from "./csvParser"
import { readSpreadsheetBuffer } from "./spreadsheetAdapter"

export interface FilaCsvProcesada {
  filaNumero: number
  nombre: string
  marca: string
  modelo: string
  sku?: string
  categoria: string
  precio: number
  precioAnterior?: number
  stock: boolean
  badge?: string
  imagen?: string
  descripcion?: string
  caracteristicasTecnicas?: string
  contenidoCaja?: string

  esValido: boolean
  esDuplicado: boolean
  idProductoExistente?: number
  marcaEsNueva: boolean
  errores: string[]
  advertencias: string[]
}

export interface ResumenCsv {
  total: number
  validos: number
  duplicados: number
  conErrores: number
}

interface ColumnIndices {
  nombre: number
  marca: number
  modelo: number
  sku: number
  categoria: number
  precio: number
  precioAnterior: number
  stock: number
  badge: number
  imagen: number
  descripcion: number
  caracteristicas: number
  contenidoCaja: number
}

/**
 * Parsea importes monetarios tolerando símbolos (S/), separadores de miles y comas decimales.
 * Ejemplos: "950", "S/ 1,250.50" -> 1250.5, "1.250,50" -> 1250.5, "25,50" -> 25.5.
 */
export function parsePriceValue(raw: string): number {
  const cleaned = raw.replace(/[^0-9.,-]/g, "").trim()
  if (!cleaned) return NaN

  const lastComma = cleaned.lastIndexOf(",")
  const lastDot = cleaned.lastIndexOf(".")

  let normalized = cleaned
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".")
    } else {
      normalized = cleaned.replace(/,/g, "")
    }
  } else if (lastComma !== -1) {
    const decimalsLen = cleaned.length - lastComma - 1
    normalized = decimalsLen >= 1 && decimalsLen <= 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "")
  }

  const num = Number(normalized)
  return Number.isFinite(num) ? num : NaN
}

function normalizeHeader(header: string): string {
  return String(header)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .trim()
}

function resolveColumnIndices(headerRow: string[]): ColumnIndices {
  const headers = headerRow.map(normalizeHeader)
  const find = (pred: (h: string) => boolean) => headers.findIndex(pred)

  return {
    nombre: find((c) => c.includes("nombre") || c.includes("producto") || c === "item"),
    marca: find((c) => c.includes("marca") || c.includes("brand")),
    modelo: find((c) => c.includes("modelo") || c.includes("subtitulo") || c === "ref"),
    sku: find((c) => c === "sku" || c.includes("codigo")),
    categoria: find((c) => c.includes("categoria") || c.includes("tipo")),
    precio: find((c) => c === "precio" || c.includes("precio_venta") || c.includes("precio_actual")),
    precioAnterior: find((c) => c.includes("precio_anterior") || c.includes("old") || c.includes("oferta")),
    stock: find((c) => c.includes("stock") || c.includes("disponib")),
    badge: find((c) => c.includes("badge") || c.includes("distintivo") || c.includes("etiqueta")),
    imagen: find((c) => c.includes("imagen") || c.includes("foto") || c.includes("url")),
    descripcion: find((c) => c.includes("descrip") || c.includes("detalle")),
    caracteristicas: find((c) => c.includes("caracteristica") || c.includes("especific")),
    contenidoCaja: find((c) => c.includes("contenido_caja") || c.includes("caja")),
  }
}

function readCell(row: string[], idx: number): string {
  return idx >= 0 && idx < row.length ? (row[idx] || "").trim() : ""
}

function validateSingleRow(
  col: string[],
  filaNumero: number,
  idx: ColumnIndices,
  existingMap: Map<string, number>,
  registeredBrands: Set<string>
): FilaCsvProcesada {
  const errores: string[] = []
  const advertencias: string[] = []

  const nombre = readCell(col, idx.nombre)
  const marca = readCell(col, idx.marca).toUpperCase()
  const modelo = readCell(col, idx.modelo)
  const sku = readCell(col, idx.sku) || undefined
  const categoria = readCell(col, idx.categoria) || "Cortadoras"

  const precio = parsePriceValue(readCell(col, idx.precio))
  const precioAntRaw = readCell(col, idx.precioAnterior)
  const precioAnteriorParsed = precioAntRaw ? parsePriceValue(precioAntRaw) : undefined
  const precioAnterior =
    precioAnteriorParsed !== undefined && Number.isFinite(precioAnteriorParsed) && precioAnteriorParsed > 0
      ? precioAnteriorParsed
      : undefined

  const stockRaw = (readCell(col, idx.stock) || "1").toLowerCase()
  const stock = !["0", "false", "no", "agotado", "sin stock"].includes(stockRaw)

  const badge = readCell(col, idx.badge) || undefined
  const imagen = readCell(col, idx.imagen) || "/assets/a0f2f.png"
  const descripcion = readCell(col, idx.descripcion) || undefined
  const caracteristicasTecnicas = readCell(col, idx.caracteristicas) || undefined
  const contenidoCaja = readCell(col, idx.contenidoCaja) || undefined

  if (!nombre) errores.push("El nombre del producto es obligatorio.")
  if (!marca) errores.push("La marca es obligatoria.")
  if (!Number.isFinite(precio) || precio <= 0) {
    errores.push("El precio debe ser un número mayor a 0.")
  }
  if (!isSafeImageUrl(imagen)) {
    errores.push("La URL de imagen no tiene un formato permitido.")
  }

  const marcaEsNueva = Boolean(marca && !registeredBrands.has(marca))
  if (marcaEsNueva) {
    advertencias.push(`La marca "${marca}" no está registrada; se creará automáticamente.`)
  }

  const claveDuplicado = `${marca}|${nombre.toLowerCase()}`
  const idExistente = existingMap.get(claveDuplicado)
  const esDuplicado = idExistente !== undefined
  if (esDuplicado) {
    advertencias.push(`Ya existe en el catálogo oficial (ID #${idExistente}).`)
  }

  return {
    filaNumero,
    nombre,
    marca,
    modelo,
    sku,
    categoria,
    precio: Number.isFinite(precio) ? precio : 0,
    precioAnterior,
    stock,
    badge,
    imagen,
    descripcion,
    caracteristicasTecnicas,
    contenidoCaja,
    esValido: errores.length === 0,
    esDuplicado,
    idProductoExistente: idExistente,
    marcaEsNueva,
    errores,
    advertencias,
  }
}

export function procesarMatrizFilas(
  matriz: string[][],
  productosActuales: Product[],
  marcasActuales: BrandWithCount[]
): {
  filas: FilaCsvProcesada[]
  resumen: ResumenCsv
} {
  const filasNoVacias = matriz.filter((fila) =>
    fila.some((celda) => celda && String(celda).trim().length > 0)
  )

  if (filasNoVacias.length < 2) {
    return {
      filas: [],
      resumen: { total: 0, validos: 0, duplicados: 0, conErrores: 0 },
    }
  }

  const colIndices = resolveColumnIndices(filasNoVacias[0])
  const existingMap = new Map<string, number>(
    productosActuales.map((p) => [`${p.brand.trim().toUpperCase()}|${p.name.trim().toLowerCase()}`, p.id])
  )
  const registeredBrands = new Set(marcasActuales.map((m) => m.nombre.trim().toUpperCase()))

  const filas: FilaCsvProcesada[] = []
  for (let i = 1; i < filasNoVacias.length; i++) {
    filas.push(validateSingleRow(filasNoVacias[i], i + 1, colIndices, existingMap, registeredBrands))
  }

  const resumen: ResumenCsv = {
    total: filas.length,
    validos: filas.filter((f) => f.esValido).length,
    duplicados: filas.filter((f) => f.esDuplicado).length,
    conErrores: filas.filter((f) => !f.esValido).length,
  }

  return { filas, resumen }
}

export function procesarBufferExcel(
  buffer: ArrayBuffer,
  productosActuales: Product[],
  marcasActuales: BrandWithCount[]
) {
  return procesarMatrizFilas(readSpreadsheetBuffer(buffer), productosActuales, marcasActuales)
}

export function procesarContenidoCsv(
  contenido: string,
  productosActuales: Product[],
  marcasActuales: BrandWithCount[]
) {
  return procesarMatrizFilas(parsearLineasCsv(contenido), productosActuales, marcasActuales)
}
