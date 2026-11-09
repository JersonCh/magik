import type { APIRoute } from "astro"

export const prerender = false

const ADMIN_EMAIL = "admin@magikbarber.pe"
const DEFAULT_PASSWORD = "magik"

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "").trim()

    // En producción puede leer process.env.ADMIN_PASSWORD
    const validPassword = typeof process !== "undefined" && process.env.ADMIN_PASSWORD
      ? process.env.ADMIN_PASSWORD
      : DEFAULT_PASSWORD

    if ((email === ADMIN_EMAIL || email === "admin@ejemplo.pe") && password === validPassword) {
      // Retornar token simulado para almacenamiento en localStorage del cliente
      const token = `magik_session_${Date.now()}`
      return new Response(
        JSON.stringify({
          success: true,
          token,
          user: { email, role: "admin", name: "Administrador Magik" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: "Credenciales incorrectas. (Contraseña por defecto: magik)" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[API] Error en /api/admin/auth:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno en autenticación" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
