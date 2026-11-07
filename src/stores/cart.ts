import { atom, computed } from "nanostores"
import type { Product, CartItem } from "../data/products"

// Atom principal para el carrito (persistente en memoria durante la sesión)
export const $cart = atom<CartItem[]>([])

// Control del drawer lateral
export const $isDrawerOpen = atom<boolean>(false)

// Estado del cliente para checkout rápido
export const $customer = atom({
  name: "",
  delivery: "Recojo en tienda",
  address: "",
  note: "",
})

// Computados reactivos
export const $cartCount = computed($cart, (items) =>
  items.reduce((total, item) => total + item.quantity, 0)
)

export const $cartSubtotal = computed($cart, (items) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0)
)

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
  $cart.set(items.filter((item) => item.id !== id))
}

export function clearCart() {
  $cart.set([])
}

