import type { APIRoute } from "astro"
import { getBucket } from "../../../lib/database/client"

export const prerender = false

function isSafeImagePath(path: string): boolean {
  if (!path || path.includes("..") || /[\r\n\0\\]/.test(path)) return false
  return (
    path.startsWith("productos/") ||
    path.startsWith("categorias/") ||
    path.startsWith("marcas/")
  )
}

/**
 * GET /api/images/[...path]
 * Sirve imágenes almacenadas en Cloudflare R2 con caché inmutable y ETag.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const path = params.path?.replace(/^\/+/, "") || ""
  if (!path) {
    return new Response("Ruta de imagen no especificada", { status: 400 })
  }

  if (!isSafeImagePath(path)) {
    return new Response("Ruta de imagen no autorizada", { status: 403 })
  }

  const bucket = getBucket(locals)
  if (!bucket) {
    return new Response("Almacenamiento R2 no disponible", { status: 503 })
  }

  try {
    const object = await bucket.get(path)
    if (!object) {
      return new Response("Imagen no encontrada", { status: 404 })
    }

    const headers = new Headers()
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/webp")
    if (object.httpEtag) {
      headers.set("ETag", object.httpEtag)
    }
    headers.set("Cache-Control", "public, max-age=31536000, immutable")

    return new Response(await object.arrayBuffer(), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("[R2] Error al recuperar imagen:", path, error)
    return new Response("Error al recuperar la imagen", { status: 500 })
  }
}
