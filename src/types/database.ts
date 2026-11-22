export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>
  run(): Promise<{ success: boolean; meta: unknown }>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<{ results: T[]; success: boolean }>>
}

export interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>
  httpEtag: string
  httpMetadata?: {
    contentType?: string
  }
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    options?: {
      httpMetadata?: {
        contentType?: string
      }
    }
  ): Promise<unknown>
  delete(key: string): Promise<void>
}

export interface DbBrand {
  id: number
  nombre: string
  slug: string
  descripcion?: string | null
  logo_key?: string | null
  activo: number
  created_at: string
  updated_at: string
}

export interface DbCategory {
  id: number
  parent_id?: number | null
  parent_nombre?: string | null
  nombre: string
  slug: string
  descripcion?: string | null
  imagen_key?: string | null
  orden: number
  activo: number
  created_at: string
  updated_at: string
}

export interface DbProduct {
  id: number
  marca_id: number
  categoria_id: number
  nombre: string
  slug: string
  modelo?: string | null
  sku?: string | null
  descripcion?: string | null
  caracteristicas_tecnicas?: string | null
  contenido_caja?: string | null
  precio_centimos: number
  precio_anterior_centimos?: number | null
  stock: number
  etiqueta: "ninguna" | "destacado" | "oferta" | "nuevo" | "combo"
  estado: "borrador" | "publicado" | "archivado"
  created_at: string
  updated_at: string
  // Joins
  marca_nombre?: string
  categoria_nombre?: string
  categoria_padre_nombre?: string | null
}

export interface DbProductImage {
  id: number
  producto_id: number
  variante_id?: number | null
  clave_archivo: string
  texto_alternativo?: string | null
  orden: number
  es_principal: number
  created_at: string
}

export interface DbVariant {
  id: number
  producto_id: number
  nombre_variante: string
  sku?: string | null
  precio_centimos?: number | null
  stock: number
  orden: number
  activo: number
  created_at: string
  updated_at: string
}

export interface DbConfig {
  clave: string
  valor: string
  descripcion?: string | null
  categoria?: string
  updated_at: string
}
