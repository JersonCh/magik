export interface Product {
  id: number
  name: string
  brand: string
  model: string
  price: number
  oldPrice?: number
  image: string
  category: string
  stock: boolean
  badge?: string
  variant?: string
}

export interface CartItem extends Product {
  quantity: number
  selectedVariant?: string
}

const A = "/assets/"

export const products: Product[] = [
  {
    id: 1,
    name: "Cortadora Saber II",
    brand: "STYLECRAFT",
    model: "Saber II",
    price: 950,
    image: `${A}a0f2f.png`,
    category: "Cortadoras",
    stock: true,
    badge: "Destacado",
    variant: "Blanca",
  },
  {
    id: 2,
    name: "Polvo de textura",
    brand: "VASSO",
    model: "35 g",
    price: 25,
    oldPrice: 30,
    image: `${A}2031c.png`,
    category: "Cuidado",
    stock: true,
    badge: "Oferta",
  },
  {
    id: 3,
    name: "Trimmer Saber",
    brand: "STYLECRAFT",
    model: "Saber",
    price: 720,
    image: `${A}7e195.png`,
    category: "Trimmers",
    stock: true,
    badge: "Nuevo",
    variant: "Negro / dorado",
  },
  {
    id: 4,
    name: "Secadora Forte Pro",
    brand: "JRL",
    model: "Forte Pro",
    price: 690,
    image: `${A}acd8a.png`,
    category: "Secadoras",
    stock: true,
  },
  {
    id: 5,
    name: "Shaver profesional",
    brand: "STYLECRAFT",
    model: "Foil",
    price: 410,
    image: `${A}16698.png`,
    category: "Shavers",
    stock: false,
  },
  {
    id: 6,
    name: "Plancha profesional",
    brand: "JRL",
    model: "Ceramic",
    price: 280,
    image: `${A}c25e4.png`,
    category: "Planchas",
    stock: true,
  },
  {
    id: 7,
    name: "Kit de cuidado",
    brand: "MAGIK SELECT",
    model: "Hair & Beard",
    price: 89,
    oldPrice: 110,
    image: `${A}682ff.png`,
    category: "Cuidado",
    stock: true,
    badge: "Combo",
  },
  {
    id: 8,
    name: "Kit de rociador y brocha",
    brand: "GENÉRICO",
    model: "Studio",
    price: 48,
    image: `${A}71f4e.png`,
    category: "Accesorios",
    stock: true,
  },
]

export const categories: [string, string, string][] = [
  ["Cortadoras", "Cortadoras de cabello", "6bf26.png"],
  ["Trimmers", "Trimmers y patilleras", "51ea8.png"],
  ["Shavers", "Shavers y afeitadoras", "16698.png"],
  ["Secadoras", "Secadoras", "9e02f.png"],
  ["Planchas", "Planchas y rizadoras", "c25e4.png"],
  ["Cuidado", "Cuidado del cabello y barba", "682ff.png"],
  ["Accesorios", "Accesorios y repuestos", "71f4e.png"],
]

export const brands = [
  "STYLECRAFT",
  "JRL",
  "VASSO",
  "MAGIK SELECT",
  "GENÉRICO",
]

export const WHATSAPP_NUMBER = "51900000000"

