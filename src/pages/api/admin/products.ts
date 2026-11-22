import type { APIRoute } from "astro"
import { getProducts, saveProduct, deleteProduct } from "../../../lib/db"
import { requireAdmin } from "../../../lib/auth/adminSession"
import { validatePositiveInt, validateProductInput } from "../../../lib/validators/admin"

export const prerender = false

const NO_STORE_JSON = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals)
  if ("response" in auth) return auth.response

  try {
    const products = await getProducts(locals)
    return new Response(JSON.stringify({ success: true, products }), {
      status: 200,
      headers: NO_STORE_JSON,
    })
  } catch (error) {
    console.error("[API] Error en GET /api/admin/products:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error al obtener productos" }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
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

    const validation = validateProductInput(body)
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ success: false, message: validation.error }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const saved = await saveProduct(validation.data, locals)
    if (!saved) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo guardar el producto en la base de datos" }),
        { status: 500, headers: NO_STORE_JSON }
      )
    }

    return new Response(
      JSON.stringify({ success: true, product: saved }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[API] Error en POST /api/admin/products:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al procesar el producto" }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}

export const DELETE: APIRoute = async ({ request, locals }) => {
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

    const idCheck = validatePositiveInt(
      typeof body === "object" && body !== null ? (body as Record<string, unknown>).id : undefined,
      "ID de producto"
    )
    if (!idCheck.ok) {
      return new Response(
        JSON.stringify({ success: false, message: idCheck.error }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const ok = await deleteProduct(idCheck.data, locals)
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, message: "No se encontró el producto o no se pudo eliminar" }),
        { status: 404, headers: NO_STORE_JSON }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: `Producto ${idCheck.data} eliminado correctamente` }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[API] Error en DELETE /api/admin/products:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al eliminar el producto" }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}
