import type { APIRoute } from "astro"
import { getAllStoreConfig, updateStoreConfig } from "../../../lib/db"

export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  try {
    const config = await getAllStoreConfig(locals)
    return new Response(JSON.stringify({ success: true, config }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[API] Error en GET /api/admin/config:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error al obtener configuración" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json()
    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ success: false, message: "Datos inválidos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const ok = await updateStoreConfig(body, locals)
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo actualizar la configuración" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const updated = await getAllStoreConfig(locals)
    return new Response(
      JSON.stringify({ success: true, config: updated }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[API] Error en POST /api/admin/config:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al guardar configuración" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
