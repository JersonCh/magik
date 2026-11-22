import { STORE_CONFIG_KEYS, type ProductStatus, type StoreConfigKey } from "../../types/domain"

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const MAX_IMPORT_ROWS = 500

const ALLOWED_BADGES = new Set(["Destacado", "Oferta", "Nuevo", "Combo"])
const ALLOWED_STATUSES = new Set<ProductStatus>(["publicado", "borrador"])
const ALLOWED_CONFIG_KEYS = new Set<string>(STORE_CONFIG_KEYS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isSafeImageUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 500) return false
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !trimmed.includes("..") && !/[\r\n\0]/.test(trimmed)
  }
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

export function validatePositiveInt(value: unknown, fieldName = "ID"): ValidationResult<number> {
  const num = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN
  if (!Number.isInteger(num) || num <= 0) {
    return { ok: false, error: `${fieldName} inválido.` }
  }
  return { ok: true, data: num }
}

export interface ValidatedProductInput {
  id?: number
  name: string
  brand: string
  model: string
  sku?: string
  category: string
  price: number
  oldPrice?: number
  image: string
  images: string[]
  stock: boolean
  description?: string
  technicalSpecs?: string
  boxContents?: string
  badge?: string
  status: ProductStatus
}

export function validateProductInput(body: unknown): ValidationResult<ValidatedProductInput> {
  if (!isRecord(body)) {
    return { ok: false, error: "Cuerpo de solicitud inválido." }
  }

  let id: number | undefined
  if (body.id !== undefined && body.id !== null && body.id !== "") {
    const idCheck = validatePositiveInt(body.id, "ID de producto")
    if (!idCheck.ok) return idCheck
    id = idCheck.data
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (name.length < 2 || name.length > 160) {
    return { ok: false, error: "El nombre del producto debe tener entre 2 y 160 caracteres." }
  }

  const brand = typeof body.brand === "string" ? body.brand.trim() : ""
  if (brand.length < 2 || brand.length > 80) {
    return { ok: false, error: "La marca debe tener entre 2 y 80 caracteres." }
  }

  const modelRaw = typeof body.model === "string" ? body.model.trim() : ""
  const model = modelRaw.slice(0, 120)

  const skuRaw = typeof body.sku === "string" ? body.sku.trim() : ""
  const sku = skuRaw ? skuRaw.slice(0, 60) : undefined

  const categoryRaw = typeof body.category === "string" ? body.category.trim() : ""
  const category = (categoryRaw || "Cortadoras").slice(0, 80)

  const price = typeof body.price === "number" ? body.price : Number(body.price)
  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    return { ok: false, error: "El precio debe ser un número mayor a 0." }
  }

  let oldPrice: number | undefined
  if (body.oldPrice !== undefined && body.oldPrice !== null && body.oldPrice !== "") {
    const parsedOld = typeof body.oldPrice === "number" ? body.oldPrice : Number(body.oldPrice)
    if (!Number.isFinite(parsedOld) || parsedOld <= 0 || parsedOld > 100000) {
      return { ok: false, error: "El precio anterior debe ser un número mayor a 0." }
    }
    oldPrice = parsedOld
  }

  let stock = true
  if (body.stock !== undefined) {
    if (typeof body.stock === "boolean") {
      stock = body.stock
    } else if (body.stock === 1 || body.stock === 0) {
      stock = body.stock === 1
    } else {
      return { ok: false, error: "El campo stock debe ser booleano." }
    }
  }

  const images: string[] = []
  if (Array.isArray(body.images)) {
    for (const entry of body.images.slice(0, 3)) {
      if (typeof entry === "string" && entry.trim()) {
        const cleanUrl = entry.trim()
        if (!isSafeImageUrl(cleanUrl)) {
          return { ok: false, error: "Una de las URLs de imagen no tiene un formato seguro permitido." }
        }
        images.push(cleanUrl)
      }
    }
  }

  if (images.length === 0) {
    const imageRaw = typeof body.image === "string" && body.image.trim() ? body.image.trim() : "/assets/a0f2f.png"
    if (!isSafeImageUrl(imageRaw)) {
      return { ok: false, error: "La URL de imagen no tiene un formato seguro permitido." }
    }
    images.push(imageRaw)
  }

  let badge: string | undefined
  if (body.badge !== undefined && body.badge !== null && body.badge !== "") {
    const badgeStr = typeof body.badge === "string" ? body.badge.trim() : ""
    if (badgeStr && badgeStr !== "Ninguno") {
      if (!ALLOWED_BADGES.has(badgeStr)) {
        return { ok: false, error: `Distintivo no permitido: "${badgeStr}".` }
      }
      badge = badgeStr
    }
  }

  const statusRaw = typeof body.status === "string" ? (body.status.trim().toLowerCase() as ProductStatus) : "publicado"
  const status: ProductStatus = ALLOWED_STATUSES.has(statusRaw) ? statusRaw : "publicado"

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 2000)
      : undefined

  const technicalSpecs =
    typeof body.technicalSpecs === "string" && body.technicalSpecs.trim()
      ? body.technicalSpecs.trim().slice(0, 3000)
      : undefined

  const boxContents =
    typeof body.boxContents === "string" && body.boxContents.trim()
      ? body.boxContents.trim().slice(0, 2000)
      : undefined

  return {
    ok: true,
    data: {
      id,
      name,
      brand,
      model,
      sku,
      category,
      price,
      oldPrice,
      image: images[0],
      images,
      stock,
      description,
      technicalSpecs,
      boxContents,
      badge,
      status,
    },
  }
}

export function validateStockInput(body: unknown): ValidationResult<{ id: number; stock: boolean }> {
  if (!isRecord(body)) {
    return { ok: false, error: "Cuerpo de solicitud inválido." }
  }
  const idCheck = validatePositiveInt(body.id, "ID de producto")
  if (!idCheck.ok) return idCheck

  if (typeof body.stock !== "boolean") {
    return { ok: false, error: "El campo stock es obligatorio y debe ser booleano." }
  }

  return { ok: true, data: { id: idCheck.data, stock: body.stock } }
}

export function validateBrandInput(body: unknown): ValidationResult<{ id?: number; nombre: string }> {
  if (!isRecord(body)) {
    return { ok: false, error: "Cuerpo de solicitud inválido." }
  }

  let id: number | undefined
  if (body.id !== undefined && body.id !== null && body.id !== "") {
    const idCheck = validatePositiveInt(body.id, "ID de marca")
    if (!idCheck.ok) return idCheck
    id = idCheck.data
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : ""
  if (nombre.length < 2 || nombre.length > 80) {
    return { ok: false, error: "El nombre de la marca debe tener entre 2 y 80 caracteres." }
  }

  return { ok: true, data: { id, nombre } }
}

export function validateStoreConfigInput(body: unknown): ValidationResult<Partial<Record<StoreConfigKey, string>>> {
  if (!isRecord(body)) {
    return { ok: false, error: "Datos de configuración inválidos." }
  }

  const sanitized: Partial<Record<StoreConfigKey, string>> = {}
  let validKeysCount = 0

  for (const [key, rawValue] of Object.entries(body)) {
    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      return { ok: false, error: `Clave de configuración no permitida: "${key}".` }
    }
    if (typeof rawValue !== "string") {
      return { ok: false, error: `El valor para "${key}" debe ser texto.` }
    }
    const val = rawValue.trim()
    if (val.length > 300) {
      return { ok: false, error: `El valor para "${key}" excede los 300 caracteres.` }
    }

    if (key === "whatsapp_number") {
      const digits = val.replace(/\D/g, "")
      if (digits.length < 9 || digits.length > 15) {
        return { ok: false, error: "El número de WhatsApp debe contener entre 9 y 15 dígitos." }
      }
      sanitized.whatsapp_number = digits
    } else if (key === "shipping_base_price") {
      const num = val === "" ? 0 : Number(val)
      if (!Number.isFinite(num) || num < 0 || num > 10000) {
        return { ok: false, error: "La tarifa base de flete debe ser un número mayor o igual a 0." }
      }
      sanitized.shipping_base_price = String(num)
    } else {
      sanitized[key as StoreConfigKey] = val
    }
    validKeysCount++
  }

  if (validKeysCount === 0) {
    return { ok: false, error: "Debe enviar al menos un parámetro de configuración válido." }
  }

  return { ok: true, data: sanitized }
}

export interface ValidatedImportRow {
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
}

export function validateImportCsvInput(body: unknown): ValidationResult<{
  productos: ValidatedImportRow[]
  modoDuplicados: "omitir" | "actualizar"
  filasRechazadas: number
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "Cuerpo de solicitud inválido." }
  }

  const rawRows = body.productos
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { ok: false, error: "No se proporcionó ningún producto para importar." }
  }

  if (rawRows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `El lote excede el límite máximo permitido de ${MAX_IMPORT_ROWS} filas por importación.`,
    }
  }

  const modoDuplicados: "omitir" | "actualizar" =
    body.modoDuplicados === "actualizar" ? "actualizar" : "omitir"

  const productos: ValidatedImportRow[] = []
  let filasRechazadas = 0

  for (const row of rawRows) {
    if (!isRecord(row)) {
      filasRechazadas++
      continue
    }

    const check = validateProductInput({
      name: row.nombre,
      brand: row.marca,
      model: row.modelo,
      category: row.categoria,
      price: row.precio,
      oldPrice: row.precioAnterior,
      stock: row.stock,
      badge: row.badge,
      image: row.imagen,
      description: row.descripcion,
    })

    if (!check.ok) {
      filasRechazadas++
      continue
    }

    let idProductoExistente: number | undefined
    if (row.idProductoExistente !== undefined && row.idProductoExistente !== null && row.idProductoExistente !== "") {
      const idCheck = validatePositiveInt(row.idProductoExistente, "ID existente")
      if (!idCheck.ok) {
        filasRechazadas++
        continue
      }
      idProductoExistente = idCheck.data
    }

    productos.push({
      nombre: check.data.name,
      marca: check.data.brand.toUpperCase(),
      modelo: check.data.model,
      categoria: check.data.category,
      precio: check.data.price,
      precioAnterior: check.data.oldPrice,
      stock: check.data.stock,
      badge: check.data.badge,
      imagen: check.data.image,
      descripcion: check.data.description,
      esValido: true,
      idProductoExistente,
    })
  }

  if (productos.length === 0) {
    return {
      ok: false,
      error: "Ninguna fila superó la validación del servidor.",
    }
  }

  return {
    ok: true,
    data: { productos, modoDuplicados, filasRechazadas },
  }
}
