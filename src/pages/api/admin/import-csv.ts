import type { APIRoute } from "astro"
import { importarProductosCsvEnDb } from "../../../lib/db"

export const prerender = false

/**
 * POST /api/admin/import-csv
 * Importa por lotes productos validados desde el archivo CSV hacia Cloudflare D1.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json()
    const productos = body?.productos
    const modoDuplicados: "omitir" | "actualizar" =
      body?.modoDuplicados === "actualizar" ? "actualizar" : "omitir"

    if (!Array.isArray(productos) || productos.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No se proporcionó ningún producto válido para importar." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const resultado = await importarProductosCsvEnDb(productos, modoDuplicados, locals)

    return new Response(
      JSON.stringify({
        success: true,
        resultado,
        message: `Importación completada: ${resultado.creados} creados, ${resultado.actualizados} actualizados, ${resultado.omitidos} omitidos.`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    console.error("[API] Error en importación CSV:", error)
    return new Response(
      JSON.stringify({
        success: false,
        message: error?.message || "Error interno al procesar el archivo CSV.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
