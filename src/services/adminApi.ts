import type {
  BrandWithCount,
  CategoryItem,
  Product,
  ResultadoImportacionCsv,
  StoreConfigMap,
} from "@/types/domain"

export class AdminApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AdminApiError"
    this.status = status
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok) {
    const message =
      typeof data.message === "string" && data.message
        ? data.message
        : `Error HTTP ${res.status}`
    throw new AdminApiError(message, res.status)
  }

  return data as T
}

export const adminApi = {
  async checkSession(): Promise<{ authenticated: boolean }> {
    const res = await fetch("/api/admin/auth", {
      method: "GET",
      credentials: "same-origin",
    })
    if (res.status === 401) return { authenticated: false }
    if (!res.ok) throw new AdminApiError("Error al verificar sesión", res.status)
    const data = (await res.json().catch(() => ({}))) as { authenticated?: boolean }
    return { authenticated: Boolean(data.authenticated) }
  },

  async login(email: string, password: string): Promise<void> {
    await requestJson<{ success: boolean }>("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  },

  async logout(): Promise<void> {
    await requestJson<{ success: boolean }>("/api/admin/logout", {
      method: "POST",
    })
  },

  async fetchProductsAndCategories(): Promise<{
    products: Product[]
    categories: CategoryItem[]
  }> {
    const data = await requestJson<{
      products?: Product[]
      categories?: CategoryItem[]
    }>("/api/admin/products")
    return {
      products: Array.isArray(data.products) ? data.products : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
    }
  },

  async saveProduct(payload: Record<string, unknown>): Promise<Product> {
    const data = await requestJson<{ product?: Product }>("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!data.product) {
      throw new AdminApiError("El servidor no devolvió el producto guardado.", 500)
    }
    return data.product
  },

  async deleteProduct(id: number): Promise<void> {
    await requestJson("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  },

  async updateStock(id: number, stock: boolean): Promise<void> {
    await requestJson("/api/admin/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock }),
    })
  },

  async fetchBrands(): Promise<BrandWithCount[]> {
    const data = await requestJson<{ brands?: BrandWithCount[] }>("/api/admin/brands")
    return Array.isArray(data.brands) ? data.brands : []
  },

  async saveBrand(nombre: string, id?: number): Promise<BrandWithCount> {
    const data = await requestJson<{ brand?: BrandWithCount }>("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nombre }),
    })
    if (!data.brand) {
      throw new AdminApiError("El servidor no devolvió la marca guardada.", 500)
    }
    return data.brand
  },

  async deleteBrand(id: number): Promise<void> {
    await requestJson("/api/admin/brands", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  },

  async fetchConfig(): Promise<StoreConfigMap | null> {
    const data = await requestJson<{ config?: StoreConfigMap }>("/api/admin/config")
    return data.config || null
  },

  async saveConfig(config: StoreConfigMap): Promise<StoreConfigMap | null> {
    const data = await requestJson<{ config?: StoreConfigMap }>("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    return data.config || null
  },

  async importProducts(
    productos: unknown[],
    modoDuplicados: "omitir" | "actualizar"
  ): Promise<ResultadoImportacionCsv> {
    const data = await requestJson<{ resultado?: ResultadoImportacionCsv }>(
      "/api/admin/import-csv",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos, modoDuplicados }),
      }
    )
    if (!data.resultado) {
      throw new AdminApiError("Respuesta incompleta al importar lote.", 500)
    }
    return data.resultado
  },

  async uploadImage(
    file: File,
    meta: { nombre?: string; slot?: string; carpeta?: string }
  ): Promise<{ url: string; key: string }> {
    const formData = new FormData()
    formData.append("file", file)
    if (meta.nombre) formData.append("nombre", meta.nombre)
    if (meta.slot) formData.append("slot", meta.slot)
    formData.append("carpeta", meta.carpeta || "productos")

    const data = await requestJson<{ url?: string; key?: string }>("/api/admin/upload", {
      method: "POST",
      body: formData,
    })
    if (!data.url) {
      throw new AdminApiError("El servidor no devolvió la URL de imagen.", 500)
    }
    return { url: data.url, key: data.key || "" }
  },

  async deleteImage(url: string): Promise<void> {
    await requestJson("/api/admin/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
  },
}
