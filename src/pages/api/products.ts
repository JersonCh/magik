import type { APIRoute } from "astro"
import { getProducts } from "../../lib/db"

export const prerender = false

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get("categoria")
    const brand = url.searchParams.get("marca")
    const search = url.searchParams.get("search")
    const stockOnly = url.searchParams.get("disponible") === "true"
    const offersOnly = url.searchParams.get("ofertas") === "true"
    const sort = url.searchParams.get("sort")

    let products = await getProducts(locals)

    if (category && category !== "Todas las categorías") {
      products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    }

    if (brand && brand !== "Todas las marcas") {
      products = products.filter((p) => p.brand.toLowerCase() === brand.toLowerCase())
    }

    if (search) {
      const q = search.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q)
      )
    }

    if (stockOnly) {
      products = products.filter((p) => p.stock)
    }

    if (offersOnly) {
      products = products.filter(
        (p) => p.badge === "Oferta" || (p.oldPrice !== undefined && p.oldPrice > p.price)
      )
    }

    if (sort === "Menor precio") {
      products.sort((a, b) => a.price - b.price)
    } else if (sort === "Mayor precio") {
      products.sort((a, b) => b.price - a.price)
    } else if (sort === "Novedades") {
      products.sort((a, b) => b.id - a.id)
    }

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
