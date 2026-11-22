import type { APIRoute } from "astro"
import { getAllStoreConfig, updateStoreConfig } from "../../../lib/db"
import { requireAdmin } from "../../../lib/auth/adminSession"
import { validateStoreConfigInput } from "../../../lib/validators/admin"

export const prerender = false

const NO_STORE_JSON = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals)
  if ("response" in auth) return auth.response

  try {
    const config = await getAllStoreConfig(locals)
    return new Response(JSON.stringify({ success: true, config }), {
      status: 200,
      headers: NO_STORE_JSON,
    })
  } catch (error) {
    console.error("[API] Error en GET /api/admin/config:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error al obtener configuración" }),
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

    const validation = validateStoreConfigInput(body)
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ success: false, message: validation.error }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const ok = await updateStoreConfig(validation.data, locals)
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo actualizar la configuración" }),
        { status: 500, headers: NO_STORE_JSON }
      )
    }

    const updated = await getAllStoreConfig(locals)
    return new Response(
      JSON.stringify({ success: true, config: updated }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[API] Error en POST /api/admin/config:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al guardar configuración" }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}
