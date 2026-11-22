export interface ProductVariant {
  id?: number
  name: string
  sku?: string
  price?: number
  stock: boolean
}

export type ProductStatus = "borrador" | "publicado" | "archivado"

export interface Product {
  id: number
  name: string
  brand: string
  model: string
  sku?: string
  price: number
  oldPrice?: number
  image: string
  images?: string[]
  category: string
  categoryGroup?: string
  stock: boolean
  badge?: string
  variant?: string
  description?: string
  technicalSpecs?: string
  boxContents?: string
  status?: ProductStatus
  variants?: ProductVariant[]
}

export interface CategoryItem {
  id: number
  parentId: number | null
  parentName?: string
  name: string
  slug: string
  description?: string
  image?: string
  order: number
}

export interface CartItem extends Product {
  quantity: number
  selectedVariant?: string
}

export interface BrandWithCount {
  id: number
  nombre: string
  slug: string
  totalProductos: number
  activo: boolean
}

export const STORE_CONFIG_KEYS = [
  "whatsapp_number",
  "store_address",
  "opening_hours",
  "announcement_bar",
  "shipping_base_price",
] as const

export type StoreConfigKey = (typeof STORE_CONFIG_KEYS)[number]

export type StoreConfigMap = Record<StoreConfigKey, string>

export const DEFAULT_WHATSAPP_NUMBER = "51900000000"

export const DEFAULT_STORE_CONFIG: Readonly<StoreConfigMap> = Object.freeze({
  whatsapp_number: DEFAULT_WHATSAPP_NUMBER,
  store_address: "Av. Coronel Mendoza 1420, Galería Magik, Tacna - Perú",
  opening_hours: "Lunes a Sábado: 9:00 am - 8:30 pm",
  announcement_bar: "Envíos diarios por Shalom y Olva Courier a todo el Perú",
  shipping_base_price: "0",
})

export function getDefaultStoreConfig(): StoreConfigMap {
  return { ...DEFAULT_STORE_CONFIG }
}

export interface ResultadoImportacionCsv {
  creados: number
  actualizados: number
  omitidos: number
  errores: string[]
}
