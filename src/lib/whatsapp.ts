import type { CartItem } from "../data/products"
import { WHATSAPP_NUMBER } from "../data/products"

/**
 * Normaliza y formatea números de teléfono para Perú.
 * Si es un celular peruano de 9 dígitos que empieza con 9, antepone el código de país '51'.
 */
export function normalizePeruPhone(phone?: string | null): string {
  if (!phone) return WHATSAPP_NUMBER
  const digits = phone.replace(/\D/g, "")
  if (!digits) return WHATSAPP_NUMBER
  if (digits.length === 9 && digits.startsWith("9")) {
    return `51${digits}`
  }
  return digits
}

export interface CustomerOrderData {
  name: string
  phone?: string
  dni?: string
  delivery: "Recojo en tienda" | "Shalom" | "Olva Courier"
  city?: string
  agency?: string
  address?: string
  note?: string
}

/**
 * Construye el mensaje formateado para enviar a WhatsApp con alta fidelidad y claridad comercial.
 */
export function buildWhatsAppOrderMessage(
  items: CartItem[],
  subtotal: number,
  customer: CustomerOrderData
): string {
  const lines: string[] = [
    "💈 *PEDIDO - MAGIK BARBER SUPPLY* 💈",
    "Hola, deseo coordinar el siguiente pedido:",
    "",
    "📦 *PRODUCTOS:*",
    ...items.map(
      (item, index) =>
        `${index + 1}. *${item.name}* (${item.brand} ${item.model})${
          item.selectedVariant ? ` · _${item.selectedVariant}_` : ""
        }\n   ${item.quantity} × S/${item.price} = *S/${item.quantity * item.price}*`
    ),
    "",
    `💰 *SUBTOTAL:* S/${subtotal}`,
    "",
    "👤 *DATOS DEL CLIENTE:*",
    `• Nombre: ${customer.name}`,
    customer.dni ? `• DNI / RUC: ${customer.dni}` : "",
    customer.phone ? `• Teléfono: ${customer.phone}` : "",
    "",
    "🚚 *MODALIDAD DE ENTREGA:*",
    `• Tipo: ${customer.delivery}`,
  ]

  if (customer.delivery === "Recojo en tienda") {
    lines.push("• Sede: Tienda física en Tacna, Perú (Coordinación sin costo de flete)")
  } else if (customer.delivery === "Shalom") {
    lines.push(`• Destino: ${customer.city || "Por coordinar"}`)
    if (customer.agency) lines.push(`• Agencia Shalom: ${customer.agency}`)
    lines.push("• Flete: Pago en destino (se cancela al recoger en agencia)")
  } else if (customer.delivery === "Olva Courier") {
    lines.push(`• Destino: ${customer.city || "Por coordinar"}`)
    if (customer.address) lines.push(`• Dirección exacta: ${customer.address}`)
    lines.push("• Modalidad: Puerta a puerta (flete cotizado previamente)")
  }

  if (customer.note && customer.note.trim()) {
    lines.push("", `📝 *OBSERVACIONES:* ${customer.note.trim()}`)
  }

  lines.push(
    "",
    "✓ _Entiendo que el stock final y los detalles de entrega serán confirmados por el equipo de Magik Barber Supply._"
  )

  return lines.filter((l) => l !== "").join("\n")
}

/**
 * Genera el enlace oficial a WhatsApp
 */
export function buildWhatsAppUrl(
  items: CartItem[],
  subtotal: number,
  customer: CustomerOrderData,
  businessPhone?: string
): string {
  const phone = normalizePeruPhone(businessPhone || WHATSAPP_NUMBER)
  const message = buildWhatsAppOrderMessage(items, subtotal, customer)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
