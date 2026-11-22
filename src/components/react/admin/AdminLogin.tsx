import { useState } from "react"
import { adminApi } from "@/services/adminApi"

interface AdminLoginProps {
  onLoginSuccess: () => void
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [emailInput, setEmailInput] = useState("admin@magikbarber.pe")
  const [passwordInput, setPasswordInput] = useState("")
  const [loginError, setLoginError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setLoginError("")
    setSubmitting(true)

    try {
      await adminApi.login(emailInput, passwordInput)
      onLoginSuccess()
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor de autenticación."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <div>
        <span className="logo-crop">
          <img src="/assets/logobg.jpg" alt="Magik Barber Supply" width="88" height="88" />
        </span>
        <p>ACCESO ADMINISTRATIVO</p>
        <h1>Gestor de Tienda</h1>
        <form onSubmit={handleLogin}>
          <label className="field">
            <span>Correo de Administrador</span>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              required
            />
          </label>

          {loginError && (
            <div style={{ color: "var(--danger)", fontSize: "11px", marginBottom: "15px" }} role="alert">
              {loginError}
            </div>
          )}

          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? "Verificando acceso..." : "Ingresar al gestor"}
          </button>
        </form>
        <small>Acceso restringido al equipo autorizado de Magik Barber Supply.</small>
      </div>
    </main>
  )
}
