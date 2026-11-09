import { atom, computed } from "nanostores"
import type { Product, CartItem } from "../data/products"

const CART_STORAGE_KEY = "magik-cart"
const CUSTOMER_STORAGE_KEY = "magik-customer"

export interface CustomerState {
  name: string
  phone: string
  dni: string
  delivery: "Recojo en tienda" | "Shalom" | "Olva Courier"
  city: string
  agency: string
  address: string
  note: string
}

function getInitialCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function getInitialCustomer(): CustomerState {
  const defaultState: CustomerState = {
    name: "",
    phone: "",
    dni: "",
    delivery: "Recojo en tienda",
    city: "",
    agency: "",
    address: "",
    note: "",
  }
  if (typeof window === "undefined") return defaultState
  try {
    const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY)
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState
  } catch {
    return defaultState
  }
}

// Atom principal para el carrito sincronizado con localStorage
export const $cart = atom<CartItem[]>(getInitialCart())

// Estado del cliente persistido para evitar tener que rellenar datos al volver
export const $customer = atom<CustomerState>(getInitialCustomer())

// Control del drawer lateral
export const $isDrawerOpen = atom<boolean>(false)

// Notificaciones Toast flotantes
export const $toastMessage = atom<string>("")

// Sincronización reactiva con localStorage en el cliente
if (typeof window !== "undefined") {
  $cart.subscribe((items) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignorar errores de cuota en storage
    }
  })

  $customer.subscribe((state) => {
    try {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignorar errores
    }
  })
}

// Computados reactivos
export const $cartCount = computed($cart, (items) =>
  items.reduce((total, item) => total + item.quantity, 0)
)

export const $cartSubtotal = computed($cart, (items) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0)
)

// Helper para notificaciones Toast
let toastTimeout: ReturnType<typeof setTimeout> | null = null
export function showToast(message: string, duration = 3000) {
  $toastMessage.set(message)
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    $toastMessage.set("")
  }, duration)
}

export function hideToast() {
  $toastMessage.set("")
  if (toastTimeout) clearTimeout(toastTimeout)
}

// Acciones del carrito
export function openDrawer() {
  $isDrawerOpen.set(true)
}

export function closeDrawer() {
  $isDrawerOpen.set(false)
}

export function addToCart(product: Product, variant?: string, quantity = 1) {
  if (!product.stock) return

  const items = $cart.get()
  const existingIndex = items.findIndex((i) => i.id === product.id)

  if (existingIndex > -1) {
    const updated = [...items]
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: updated[existingIndex].quantity + quantity,
      selectedVariant: variant || updated[existingIndex].selectedVariant,
    }
    $cart.set(updated)
  } else {
    $cart.set([
      ...items,
      {
        ...product,
        quantity,
        selectedVariant: variant || product.variant,
      },
    ])
  }

  showToast(`¡${product.name} añadido a tu pedido!`)
  $isDrawerOpen.set(true)
}

export function updateQuantity(id: number, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(id)
    return
  }
  const items = $cart.get()
  $cart.set(
    items.map((item) => (item.id === id ? { ...item, quantity } : item))
  )
}

export function removeFromCart(id: number) {
  const items = $cart.get()
  const removed = items.find((item) => item.id === id)
  $cart.set(items.filter((item) => item.id !== id))
  if (removed) {
    showToast(`Eliminado: ${removed.name}`)
  }
}

export function clearCart() {
  $cart.set([])
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // Ignorar errores
    }
  }
}
