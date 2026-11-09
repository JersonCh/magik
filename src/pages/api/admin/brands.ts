import type { APIRoute } from "astro"
import { getBrandsWithCounts, saveBrand, deleteBrand } from "../../../lib/db"

export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  try {
    const brands = await getBrandsWithCounts(locals)
    return new Response(JSON.stringify({ success: true, brands }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[API] Error en GET /api/admin/brands:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error al obtener marcas" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json()
    const nombre = String(body?.nombre || "").trim()

    if (!nombre) {
      return new Response(
        JSON.stringify({ success: false, message: "El nombre de la marca es obligatorio" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const saved = await saveBrand(
      {
        id: body.id ? Number(body.id) : undefined,
        nombre,
      },
      locals
    )

    if (!saved) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo guardar la marca" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, brand: saved }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[API] Error en POST /api/admin/brands:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al guardar marca" }),
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
        JSON.stringify({ success: false, message: "ID de marca inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const ok = await deleteBrand(id, locals)
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, message: "No se pudo eliminar la marca" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: `Marca ${id} eliminada correctamente` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[API] Error en DELETE /api/admin/brands:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al eliminar marca" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
