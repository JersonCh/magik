import type { APIRoute } from "astro"
import { updateProductStock } from "../../../lib/db"
import { requireAdmin } from "../../../lib/auth/adminSession"
import { validateStockInput } from "../../../lib/validators/admin"

export const prerender = false

const NO_STORE_JSON = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

export const PATCH: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals)
  if ("response" in auth) return auth.response

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "JSON inválido" }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const validation = validateStockInput(body)
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ success: false, message: validation.error }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const success = await updateProductStock(validation.data.id, validation.data.stock, locals)
    if (!success) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo actualizar el stock" }),
        { status: 500, headers: NO_STORE_JSON }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: validation.data.id, stock: validation.data.stock }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[API] Error en PATCH /api/admin/stock:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al actualizar stock" }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}
