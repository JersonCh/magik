import type { APIRoute } from "astro"
import { updateProductStock } from "../../../lib/db"

export const prerender = false

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json()

    if (body.id === undefined || body.stock === undefined) {
      return new Response(
        JSON.stringify({ success: false, message: "ID y stock son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const success = await updateProductStock(Number(body.id), Boolean(body.stock), locals)

    return new Response(
      JSON.stringify({ success, id: body.id, stock: body.stock }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[API] Error en PATCH /api/admin/stock:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al actualizar stock" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
