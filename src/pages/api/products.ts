import type { APIRoute } from "astro"
import { getProducts } from "../../lib/db"

export const prerender = false

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url)
    const products = await getProducts(locals, {
      category: url.searchParams.get("categoria") || undefined,
      brand: url.searchParams.get("marca") || undefined,
      search: url.searchParams.get("search") || undefined,
      stockOnly: url.searchParams.get("disponible") === "true",
      offersOnly: url.searchParams.get("ofertas") === "true",
      sort: url.searchParams.get("sort") || undefined,
    })

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch (error) {
    console.error("[API] Error en /api/products:", error)
    return new Response(
      JSON.stringify({ error: "Error interno al consultar productos" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
