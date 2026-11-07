export interface DbBrand {
  id: number
  nombre: string
  slug: string
  descripcion?: string | null
  activo: number
  created_at: string
}

export interface DbCategory {
  id: number
  nombre: string
  slug: string
  descripcion?: string | null
  imagen_url?: string | null
  orden: number
  activo: number
  created_at: string
}

export interface DbProduct {
  id: number
  marca_id: number
  categoria_id: number
  nombre: string
  slug: string
  modelo: string
  descripcion?: string | null
  precio: number
  precio_anterior?: number | null
  imagen_principal: string
  stock: number
  badge?: string | null
  es_destacado: number
  activo: number
  created_at: string
  updated_at: string
  // Joins
  marca_nombre?: string
  categoria_nombre?: string
}

export interface DbVariant {
  id: number
  producto_id: number
  nombre_variante: string
  sku?: string | null
  precio_ajuste: number
  stock: number
  activo: number
  created_at: string
}

export interface DbOrder {
  id: number
  codigo: string
  cliente_nombre: string
  cliente_telefono?: string | null
  modalidad_entrega: "Recojo en tienda" | "Envío a domicilio" | "Shalom" | "Olva Courier"
  direccion_entrega?: string | null
  observaciones?: string | null
  subtotal: number
  estado: "pendiente" | "confirmado" | "entregado" | "cancelado"
  created_at: string
}

export interface DbConfig {
  clave: string
  valor: string
  descripcion?: string | null
  updated_at: string
}
