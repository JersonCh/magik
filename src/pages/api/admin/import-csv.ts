import type { APIRoute } from "astro"
import { importarProductosCsvEnDb } from "../../../lib/db"
import { requireAdmin } from "../../../lib/auth/adminSession"
import { validateImportCsvInput } from "../../../lib/validators/admin"

export const prerender = false

const NO_STORE_JSON = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

/**
 * POST /api/admin/import-csv
 * Revalida en servidor e importa por lotes productos desde Excel / CSV hacia Cloudflare D1.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals)
  if ("response" in auth) return auth.response

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "JSON inválido." }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const validation = validateImportCsvInput(body)
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ success: false, message: validation.error }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const resultado = await importarProductosCsvEnDb(
      validation.data.productos,
      validation.data.modoDuplicados,
      locals
    )

    resultado.omitidos += validation.data.filasRechazadas

    return new Response(
      JSON.stringify({
        success: true,
        resultado,
        message: `Importación completada: ${resultado.creados} creados, ${resultado.actualizados} actualizados, ${resultado.omitidos} omitidos.`,
      }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error: unknown) {
    console.error("[API] Error en importación CSV:", error)
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error interno al procesar la importación.",
      }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}
