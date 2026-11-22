import type { APIRoute } from "astro"
import { getBrandsWithCounts, saveBrand, deleteBrand } from "../../../lib/db"
import { requireAdmin } from "../../../lib/auth/adminSession"
import { validateBrandInput, validatePositiveInt } from "../../../lib/validators/admin"

export const prerender = false

const NO_STORE_JSON = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals)
  if ("response" in auth) return auth.response

  try {
    const brands = await getBrandsWithCounts(locals)
    return new Response(JSON.stringify({ success: true, brands }), {
      status: 200,
      headers: NO_STORE_JSON,
    })
  } catch (error) {
    console.error("[API] Error en GET /api/admin/brands:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error al obtener marcas" }),
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

    const validation = validateBrandInput(body)
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ success: false, message: validation.error }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const saved = await saveBrand(validation.data, locals)
    if (!saved) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo guardar la marca" }),
        { status: 500, headers: NO_STORE_JSON }
      )
    }

    return new Response(
      JSON.stringify({ success: true, brand: saved }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[API] Error en POST /api/admin/brands:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al guardar marca" }),
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
      "ID de marca"
    )
    if (!idCheck.ok) {
      return new Response(
        JSON.stringify({ success: false, message: idCheck.error }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const ok = await deleteBrand(idCheck.data, locals)
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo eliminar la marca" }),
        { status: 404, headers: NO_STORE_JSON }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: `Marca ${idCheck.data} eliminada correctamente` }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[API] Error en DELETE /api/admin/brands:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al eliminar marca" }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}
