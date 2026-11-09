import type { APIRoute } from "astro"
import { saveProduct, deleteProduct } from "../../../lib/db"

export const prerender = false

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json()

    if (!body.name || !body.brand || !body.price) {
      return new Response(
        JSON.stringify({ success: false, message: "Nombre, marca y precio son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const saved = await saveProduct(
      {
        id: body.id ? Number(body.id) : undefined,
        name: String(body.name),
        brand: String(body.brand),
        model: String(body.model || body.name),
        category: String(body.category || "Cortadoras"),
        price: Number(body.price),
        oldPrice: body.oldPrice ? Number(body.oldPrice) : undefined,
        image: body.image || "/assets/a0f2f.png",
        stock: body.stock !== undefined ? Boolean(body.stock) : true,
        description: body.description ? String(body.description) : undefined,
        badge: body.badge ? String(body.badge) : undefined,
      },
      locals
    )

    if (!saved) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo guardar el producto en la base de datos" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, product: saved }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[API] Error en POST /api/admin/products:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al procesar el producto" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json()
    const id = Number(body?.id)

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "ID de producto inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const ok = await deleteProduct(id, locals)
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, message: "No se encontró el producto o no se pudo eliminar" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: `Producto ${id} eliminado correctamente` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[API] Error en DELETE /api/admin/products:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al eliminar el producto" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
