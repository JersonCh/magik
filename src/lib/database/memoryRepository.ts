import {
  brands as seedBrands,
  categories as seedCategories,
  products as seedProducts,
} from "../../data/products"
import {
  STORE_CONFIG_KEYS,
  getDefaultStoreConfig,
  type BrandWithCount,
  type CategoryItem,
  type Product,
  type ProductStatus,
  type ResultadoImportacionCsv,
  type StoreConfigKey,
  type StoreConfigMap,
} from "../../types/domain"
import type { ValidatedImportRow } from "../validators/admin"
import { normalizeSlug } from "./client"

export interface ProductQueryOptions {
  includeDrafts?: boolean
  category?: string
  brand?: string
  search?: string
  stockOnly?: boolean
  offersOnly?: boolean
  sort?: string
}

export interface SaveProductInput {
  id?: number
  name: string
  brand: string
  model?: string
  sku?: string
  category: string
  price: number
  oldPrice?: number
  image?: string
  images?: string[]
  stock?: boolean
  description?: string
  technicalSpecs?: string
  boxContents?: string
  badge?: string
  status?: ProductStatus
}

interface MemoryBrandRecord {
  id: number
  nombre: string
  slug: string
  activo: boolean
}

interface MemoryProductRecord extends Product {
  status: ProductStatus
}

export interface MemorySeedData {
  products?: Product[]
  brands?: string[]
  categories?: [string, string, string][]
  config?: Partial<StoreConfigMap>
}

const ALLOWED_CONFIG_KEYS = new Set<string>(STORE_CONFIG_KEYS)

function cloneProduct(product: Product): MemoryProductRecord {
  return {
    ...product,
    images: product.images ? [...product.images] : [product.image],
    variants: product.variants ? product.variants.map((v) => ({ ...v })) : undefined,
    status: product.status || "publicado",
  }
}

export function applyProductFilters(items: Product[], options: ProductQueryOptions = {}): Product[] {
  let result = items

  if (options.category && options.category !== "Todas las categorías") {
    const target = options.category.trim().toLowerCase()
    result = result.filter((p) => p.category.toLowerCase() === target)
  }

  if (options.brand && options.brand !== "Todas las marcas") {
    const target = options.brand.trim().toLowerCase()
    result = result.filter((p) => p.brand.toLowerCase() === target)
  }

  if (options.search && options.search.trim().length > 0) {
    const q = options.search.trim().toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.sku ? p.sku.toLowerCase().includes(q) : false)
    )
  }

  if (options.stockOnly) {
    result = result.filter((p) => p.stock)
  }

  if (options.offersOnly) {
    result = result.filter(
      (p) => p.badge === "Oferta" || (p.oldPrice !== undefined && p.oldPrice > p.price)
    )
  }

  const sorted = [...result]
  if (options.sort === "Menor precio") {
    sorted.sort((a, b) => a.price - b.price)
  } else if (options.sort === "Mayor precio") {
    sorted.sort((a, b) => b.price - a.price)
  } else if (options.sort === "Novedades") {
    sorted.sort((a, b) => b.id - a.id)
  } else {
    sorted.sort((a, b) => a.id - b.id)
  }

  return sorted
}

/**
 * Repositorio en memoria instanciable que replica el contrato de Cloudflare D1
 * (cumple LSP para fallback local en desarrollo y aislamiento completo en tests).
 */
export function createMemoryCatalogRepository(seed: MemorySeedData = {}) {
  const products: MemoryProductRecord[] = (seed.products || seedProducts).map(cloneProduct)
  const categories: [string, string, string][] = (seed.categories || seedCategories).map(
    (c) => [c[0], c[1], c[2]]
  )
  const brands: MemoryBrandRecord[] = (seed.brands || seedBrands).map((name, idx) => ({
    id: idx + 1,
    nombre: name,
    slug: normalizeSlug(name) || `marca-${idx + 1}`,
    activo: true,
  }))
  const config: StoreConfigMap = {
    ...getDefaultStoreConfig(),
    ...(seed.config || {}),
  }

  function nextUniqueBrandSlug(baseName: string, excludeId?: number): string {
    const base = normalizeSlug(baseName) || "marca"
    let candidate = base
    let counter = 1
    while (brands.some((b) => b.slug === candidate && b.id !== excludeId)) {
      counter++
      candidate = `${base}-${counter}`
    }
    return candidate
  }

  function ensureBrand(name: string): void {
    const clean = name.trim()
    const existing = brands.find((b) => b.nombre.toLowerCase() === clean.toLowerCase())
    if (existing) {
      existing.activo = true
      return
    }
    const nextId = Math.max(...brands.map((b) => b.id), 0) + 1
    brands.push({
      id: nextId,
      nombre: clean,
      slug: nextUniqueBrandSlug(clean),
      activo: true,
    })
  }

  function buildBrandWithCount(b: MemoryBrandRecord): BrandWithCount {
    const totalProductos = products.filter(
      (p) => p.status !== "archivado" && p.brand.toUpperCase() === b.nombre.toUpperCase()
    ).length
    return {
      id: b.id,
      nombre: b.nombre,
      slug: b.slug,
      totalProductos,
      activo: b.activo,
    }
  }

  return {
    getProducts(options: ProductQueryOptions = {}): Product[] {
      const visible = products.filter((p) =>
        options.includeDrafts ? p.status !== "archivado" : p.status === "publicado"
      )
      return applyProductFilters(visible, options).map(cloneProduct)
    },

    getProductById(id: number, options: { includeDrafts?: boolean } = {}): Product | null {
      const found = products.find(
        (p) =>
          p.id === id &&
          (options.includeDrafts ? p.status !== "archivado" : p.status === "publicado")
      )
      return found ? cloneProduct(found) : null
    },

    getRelatedProducts(productId: number, limit = 3): Product[] {
      return products
        .filter((p) => p.status === "publicado" && p.id !== productId)
        .slice(0, limit)
        .map(cloneProduct)
    },

    getCategories(): [string, string, string][] {
      return categories.map((c) => [c[0], c[1], c[2]])
    },

    getCategoryTree(): CategoryItem[] {
      return categories.map(([name, description, image], idx) => ({
        id: idx + 1,
        parentId: 1,
        parentName: "Catálogo",
        name,
        slug: normalizeSlug(name) || `categoria-${idx + 1}`,
        description,
        image: `/assets/${image}`,
        order: idx + 1,
      }))
    },

    updateProductStock(id: number, stock: boolean): boolean {
      const item = products.find((p) => p.id === id && p.status !== "archivado")
      if (!item) return false
      item.stock = stock
      return true
    },

    saveProduct(data: SaveProductInput): Product | null {
      const rawImages = (data.images || [])
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 3)
      if (rawImages.length === 0) {
        rawImages.push(data.image?.trim() || "/assets/a0f2f.png")
      }
      const mainImage = rawImages[0]
      ensureBrand(data.brand)

      if (data.id) {
        const index = products.findIndex((p) => p.id === data.id && p.status !== "archivado")
        if (index === -1) return null
        products[index] = {
          ...products[index],
          name: data.name,
          brand: data.brand,
          model: data.model || "",
          sku: data.sku,
          category: data.category,
          price: data.price,
          oldPrice: data.oldPrice,
          image: mainImage,
          images: rawImages,
          stock: data.stock !== undefined ? data.stock : products[index].stock,
          badge: data.badge,
          description: data.description,
          technicalSpecs: data.technicalSpecs,
          boxContents: data.boxContents,
          status: data.status === "borrador" ? "borrador" : "publicado",
        }
        return cloneProduct(products[index])
      }

      const newProduct: MemoryProductRecord = {
        id: Math.max(...products.map((p) => p.id), 0) + 1,
        name: data.name,
        brand: data.brand,
        model: data.model || "",
        sku: data.sku,
        category: data.category,
        price: data.price,
        oldPrice: data.oldPrice,
        image: mainImage,
        images: rawImages,
        stock: data.stock !== undefined ? data.stock : true,
        badge: data.badge,
        description: data.description,
        technicalSpecs: data.technicalSpecs,
        boxContents: data.boxContents,
        status: data.status === "borrador" ? "borrador" : "publicado",
      }
      products.push(newProduct)
      return cloneProduct(newProduct)
    },

    deleteProduct(id: number): boolean {
      const item = products.find((p) => p.id === id && p.status !== "archivado")
      if (!item) return false
      item.status = "archivado"
      return true
    },

    getBrands(): string[] {
      return brands
        .filter((b) => b.activo)
        .map((b) => b.nombre)
        .sort((a, b) => a.localeCompare(b))
    },

    getBrandsWithCounts(): BrandWithCount[] {
      return brands
        .filter((b) => b.activo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(buildBrandWithCount)
    },

    saveBrand(data: { id?: number; nombre: string }): BrandWithCount | null {
      const cleanName = data.nombre.trim()
      if (!cleanName) return null

      if (data.id) {
        const target = brands.find((b) => b.id === data.id)
        if (!target) return null
        target.nombre = cleanName
        target.slug = nextUniqueBrandSlug(cleanName, target.id)
        target.activo = true
        return buildBrandWithCount(target)
      }

      const existing = brands.find((b) => b.nombre.toLowerCase() === cleanName.toLowerCase())
      if (existing) {
        existing.nombre = cleanName
        existing.activo = true
        return buildBrandWithCount(existing)
      }

      const created: MemoryBrandRecord = {
        id: Math.max(...brands.map((b) => b.id), 0) + 1,
        nombre: cleanName,
        slug: nextUniqueBrandSlug(cleanName),
        activo: true,
      }
      brands.push(created)
      return buildBrandWithCount(created)
    },

    deleteBrand(id: number): boolean {
      const target = brands.find((b) => b.id === id && b.activo)
      if (!target) return false
      target.activo = false
      return true
    },

    getAllStoreConfig(): StoreConfigMap {
      return { ...config }
    },

    updateStoreConfig(updates: Partial<Record<StoreConfigKey, string>>): boolean {
      const entries = Object.entries(updates).filter(
        ([clave, valor]) => ALLOWED_CONFIG_KEYS.has(clave) && typeof valor === "string"
      ) as Array<[StoreConfigKey, string]>
      if (entries.length === 0) return false
      for (const [clave, valor] of entries) {
        config[clave] = valor
      }
      return true
    },

    getStoreConfig(key: StoreConfigKey, defaultValue = ""): string {
      return config[key] || defaultValue
    },

    importProducts(
      filas: ValidatedImportRow[],
      modoDuplicados: "omitir" | "actualizar"
    ): ResultadoImportacionCsv {
      let creados = 0
      let actualizados = 0
      let omitidos = 0

      for (const f of filas) {
        if (!f.esValido) {
          omitidos++
          continue
        }

        if (f.idProductoExistente) {
          if (modoDuplicados === "omitir") {
            omitidos++
            continue
          }
          const idx = products.findIndex(
            (p) => p.id === f.idProductoExistente && p.status !== "archivado"
          )
          if (idx > -1) {
            ensureBrand(f.marca)
            products[idx] = {
              ...products[idx],
              name: f.nombre,
              brand: f.marca,
              model: f.modelo,
              sku: f.sku || products[idx].sku,
              category: f.categoria,
              price: f.precio,
              oldPrice: f.precioAnterior,
              stock: f.stock,
              badge: f.badge,
              description: f.descripcion || products[idx].description,
              technicalSpecs: f.caracteristicasTecnicas || products[idx].technicalSpecs,
              boxContents: f.contenidoCaja || products[idx].boxContents,
            }
            actualizados++
          } else {
            omitidos++
          }
          continue
        }

        ensureBrand(f.marca)
        const maxId = Math.max(...products.map((p) => p.id), 0)
        products.push({
          id: maxId + 1,
          name: f.nombre,
          brand: f.marca,
          model: f.modelo,
          sku: f.sku,
          category: f.categoria,
          price: f.precio,
          oldPrice: f.precioAnterior,
          stock: f.stock,
          badge: f.badge,
          description: f.descripcion,
          technicalSpecs: f.caracteristicasTecnicas,
          boxContents: f.contenidoCaja,
          image: f.imagen || "/assets/a0f2f.png",
          images: [f.imagen || "/assets/a0f2f.png"],
          status: "publicado",
        })
        creados++
      }

      return { creados, actualizados, omitidos, errores: [] }
    },
  }
}

export const defaultMemoryRepository = createMemoryCatalogRepository()
