import type { APIRoute } from "astro"
import { requireAdmin } from "../../../lib/auth/adminSession"
import { getBucket, normalizeSlug } from "../../../lib/database/client"

export const prerender = false

const NO_STORE_JSON = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const MAX_FILE_SIZE = 1.5 * 1024 * 1024 // 1.5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
])
const ALLOWED_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}
const ALLOWED_FOLDERS = new Set(["productos", "categorias", "marcas"])

function isAuthorizedR2Key(key: string): boolean {
  if (!key || key.includes("..") || /[\r\n\0\\]/.test(key)) return false
  return (
    key.startsWith("productos/") ||
    key.startsWith("categorias/") ||
    key.startsWith("marcas/")
  )
}

/**
 * POST /api/admin/upload
 * Sube imágenes optimizadas directamente a Cloudflare R2.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals)
  if ("response" in auth) return auth.response

  const bucket = getBucket(locals)
  if (!bucket) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "El almacenamiento de imágenes R2 no está disponible en este entorno.",
      }),
      { status: 503, headers: NO_STORE_JSON }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, message: "No se proporcionó un archivo de imagen válido." }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Formato (${file.type || "desconocido"}) no permitido. Usa WebP, JPG, PNG o AVIF.`,
        }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "La imagen excede el límite permitido de 1.5 MB.",
        }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const folderRaw = String(formData.get("carpeta") || "productos").trim().toLowerCase()
    const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "productos"

    const nombreRaw = String(formData.get("nombre") || "").trim()
    const slotRaw = String(formData.get("slot") || "").trim()

    let baseSlug = normalizeSlug(nombreRaw)
    if (!baseSlug || baseSlug === "nuevo-producto") {
      const origBase = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name
      baseSlug = normalizeSlug(origBase) || "imagen"
    }

    const slotSlug = slotRaw ? `-${normalizeSlug(slotRaw)}` : ""
    const shortId = Math.random().toString(36).slice(2, 7)
    const ext = ALLOWED_EXT_BY_MIME[file.type] || "webp"
    const key = `${folder}/${baseSlug}${slotSlug}-${shortId}.${ext}`

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        url: `/api/images/${key}`,
        key,
        size: file.size,
        contentType: file.type,
      }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[R2] Error al subir imagen:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al subir la imagen a R2." }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}

/**
 * DELETE /api/admin/upload
 * Elimina un archivo de Cloudflare R2 a partir de su URL /api/images/... o key.
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals)
  if ("response" in auth) return auth.response

  const bucket = getBucket(locals)
  if (!bucket) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "El almacenamiento de imágenes R2 no está disponible.",
      }),
      { status: 503, headers: NO_STORE_JSON }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const rawTarget = String((body as Record<string, unknown>)?.url || (body as Record<string, unknown>)?.key || "").trim()

    if (!rawTarget) {
      return new Response(
        JSON.stringify({ success: false, message: "No se especificó la imagen a eliminar." }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    let key = rawTarget
    if (key.includes("/api/images/")) {
      key = key.split("/api/images/")[1]
    }
    key = key.replace(/^\/+/, "")

    if (!isAuthorizedR2Key(key)) {
      return new Response(
        JSON.stringify({ success: false, message: "Ruta de archivo no autorizada." }),
        { status: 403, headers: NO_STORE_JSON }
      )
    }

    await bucket.delete(key)

    return new Response(
      JSON.stringify({ success: true, message: "Imagen eliminada de R2." }),
      { status: 200, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[R2] Error al eliminar imagen:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno al eliminar la imagen." }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}
