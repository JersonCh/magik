import { useState, useRef } from "react"
import type { Product } from "../../data/products"
import type { BrandWithCount } from "../../lib/db"
import {
  procesarContenidoCsv,
  procesarBufferExcel,
  generarPlantillaCsv,
  generarPlantillaExcel,
  type FilaCsvProcesada,
  type ResumenCsv,
} from "../../lib/csvHelper"
import Icon from "./Icon"

interface CsvImportModalProps {
  isOpen: boolean
  productos: Product[]
  marcas: BrandWithCount[]
  onClose: () => void
  onSuccess: () => void
}

export default function CsvImportModal({
  isOpen,
  productos,
  marcas,
  onClose,
  onSuccess,
}: CsvImportModalProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [nombreArchivo, setNombreArchivo] = useState("")
  const [tamanoArchivo, setTamanoArchivo] = useState("")
  const [tipoArchivo, setTipoArchivo] = useState<"excel" | "csv">("excel")
  const [filas, setFilas] = useState<FilaCsvProcesada[]>([])
  const [resumen, setResumen] = useState<ResumenCsv>({ total: 0, validos: 0, duplicados: 0, conErrores: 0 })
  const [modoDuplicados, setModoDuplicados] = useState<"omitir" | "actualizar">("actualizar")
  const [filtroVista, setFiltroVista] = useState<"todos" | "validos" | "duplicados" | "errores">("todos")
  const [importando, setImportando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)

  // Resultado final de la API
  const [resultadoFinal, setResultadoFinal] = useState<{
    creados: number
    actualizados: number
    omitidos: number
    errores: string[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Procesar archivo Excel (.xlsx / .xls) o CSV (.csv)
  const procesarArchivo = (file: File) => {
    const ext = file.name.toLowerCase()
    const esExcel = ext.endsWith(".xlsx") || ext.endsWith(".xls")
    const esCsv = ext.endsWith(".csv")

    if (!esExcel && !esCsv) {
      setErrorGlobal("Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv) válido.")
      return
    }

    setErrorGlobal(null)
    setNombreArchivo(file.name)
    setTamanoArchivo(`${(file.size / 1024).toFixed(1)} KB`)
    setTipoArchivo(esExcel ? "excel" : "csv")

    if (esExcel) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer
          const resultado = procesarBufferExcel(buffer, productos, marcas)

          if (resultado.filas.length === 0) {
            setErrorGlobal("El archivo Excel no contiene filas válidas o las cabeceras no coinciden.")
            return
          }

          setFilas(resultado.filas)
          setResumen(resultado.resumen)
          setPaso(2)
        } catch (err: any) {
          setErrorGlobal(err?.message || "Error al procesar la hoja de cálculo de Excel.")
        }
      }
      reader.onerror = () => {
        setErrorGlobal("Error al leer el archivo Excel desde el dispositivo.")
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const contenido = (e.target?.result as string) || ""
          const resultado = procesarContenidoCsv(contenido, productos, marcas)

          if (resultado.filas.length === 0) {
            setErrorGlobal("El archivo CSV está vacío o el formato de columnas no coincide.")
            return
          }

          setFilas(resultado.filas)
          setResumen(resultado.resumen)
          setPaso(2)
        } catch (err: any) {
          setErrorGlobal(err?.message || "Error al procesar el archivo CSV.")
        }
      }
      reader.onerror = () => {
        setErrorGlobal("Error al leer el archivo desde el dispositivo.")
      }
      reader.readAsText(file, "UTF-8")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) procesarArchivo(file)
  }

  // Descarga de plantilla Excel (.xlsx)
  const handleDownloadExcelTemplate = () => {
    const uint8 = generarPlantillaExcel()
    const blob = new Blob([uint8], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "plantilla_catalogo_magik.xlsx")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Descarga de plantilla CSV (.csv)
  const handleDownloadCsvTemplate = () => {
    const csvContent = generarPlantillaCsv()
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "plantilla_catalogo_magik.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Enviar a la API /api/admin/import-csv
  const handleConfirmImport = async () => {
    setImportando(true)
    setErrorGlobal(null)

    const filasAEnviar = filas.filter((f) => f.esValido)

    try {
      const res = await fetch("/api/admin/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: filasAEnviar,
          modoDuplicados,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResultadoFinal(data.resultado)
        setPaso(3)
      } else {
        setErrorGlobal(data.message || "Error al importar productos.")
      }
    } catch {
      setErrorGlobal("Fallo en la conexión al importar lote.")
    } finally {
      setImportando(false)
    }
  }

  const handleFinish = () => {
    onSuccess()
    onClose()
  }

  // Filtrado de la tabla de vista previa
  const filasFiltradas = filas.filter((f) => {
    if (filtroVista === "validos") return f.esValido && !f.esDuplicado
    if (filtroVista === "duplicados") return f.esDuplicado
    if (filtroVista === "errores") return !f.esValido
    return true
  })

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{ width: "min(980px, 95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <p className="eyebrow">HERRAMIENTAS ADMINISTRATIVAS · MAISON COMPATIBLE</p>
            <h3 style={{ margin: 0, fontSize: "22px" }}>
              {paso === 1 && "Importación Masiva de Catálogo (Excel / CSV)"}
              {paso === 2 && `Vista Previa: ${nombreArchivo} (${tamanoArchivo}) · ${tipoArchivo.toUpperCase()}`}
              {paso === 3 && "Resultado de la Importación"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ background: "none", border: 0, color: "#888", cursor: "pointer", padding: "4px" }}
          >
            <Icon name="close" />
          </button>
        </div>

        {errorGlobal && (
          <div
            style={{
              background: "rgba(180, 35, 24, 0.15)",
              border: "1px solid var(--danger)",
              color: "#ff8c82",
              padding: "10px 14px",
              borderRadius: "4px",
              fontSize: "12px",
              marginBottom: "14px",
            }}
          >
            {errorGlobal}
          </div>
        )}

        {/* ================= PASO 1: CARGA DE ARCHIVO ================= */}
        {paso === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <p className="desc" style={{ margin: 0 }}>
              Carga tu catálogo completo de máquinas de corte, trimmers, repuestos, cuchillas y pomadas en lote.
              Admite tanto hojas de cálculo <strong>Microsoft Excel (.xlsx, .xls)</strong> como archivos <strong>CSV (.csv)</strong>.
            </p>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #444",
                borderRadius: "var(--radius)",
                background: "rgba(255,255,255,0.02)",
                padding: "45px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border .2s ease",
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
              />
              <div style={{ fontSize: "28px", color: "var(--yellow)", marginBottom: "12px" }}>
                <Icon name="filter" />
              </div>
              <strong style={{ fontSize: "14px", display: "block", marginBottom: "6px" }}>
                Arrastra tu archivo Excel (.xlsx) o CSV (.csv) aquí o haz clic para seleccionarlo
              </strong>
              <small style={{ color: "#888", fontSize: "11px" }}>
                Formatos compatibles: Microsoft Excel (.xlsx, .xls) y valores separados por comas (.csv)
              </small>
            </div>

            <div
              style={{
                background: "rgba(255, 224, 0, 0.05)",
                border: "1px solid rgba(255, 224, 0, 0.2)",
                padding: "16px 20px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ color: "var(--yellow)", fontSize: "12px", display: "block" }}>
                  ¿Necesitas la plantilla oficial preformateada?
                </strong>
                <span style={{ color: "#aaa", fontSize: "11px" }}>
                  Incluye las columnas estándar (`nombre`, `marca`, `modelo`, `categoria`, `precio`, `precio_anterior`, `stock`, `badge`).
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleDownloadExcelTemplate}
                  style={{ padding: "8px 14px", fontSize: "11px", whiteSpace: "nowrap" }}
                >
                  Descargar Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  style={{
                    padding: "8px 14px",
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                    background: "transparent",
                    border: "1px solid #555",
                    color: "white",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Descargar CSV (.csv)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PASO 2: VISTA PREVIA Y VALIDACIÓN ================= */}
        {paso === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: 0, flex: 1 }}>
            {/* Métricas del archivo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #333", padding: "10px 14px", borderRadius: "4px" }}>
                <span style={{ fontSize: "10px", color: "#888", display: "block" }}>TOTAL REGISTROS</span>
                <b style={{ fontSize: "18px", color: "white" }}>{resumen.total}</b>
              </div>
              <div style={{ background: "rgba(21, 128, 61, 0.1)", border: "1px solid rgba(21, 128, 61, 0.3)", padding: "10px 14px", borderRadius: "4px" }}>
                <span style={{ fontSize: "10px", color: "#4ade80", display: "block" }}>VÁLIDOS NUEVOS</span>
                <b style={{ fontSize: "18px", color: "#4ade80" }}>{resumen.validos - resumen.duplicados}</b>
              </div>
              <div style={{ background: "rgba(255, 224, 0, 0.08)", border: "1px solid rgba(255, 224, 0, 0.25)", padding: "10px 14px", borderRadius: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--yellow)", display: "block" }}>YA EN CATÁLOGO</span>
                <b style={{ fontSize: "18px", color: "var(--yellow)" }}>{resumen.duplicados}</b>
              </div>
              <div style={{ background: "rgba(180, 35, 24, 0.1)", border: "1px solid rgba(180, 35, 24, 0.3)", padding: "10px 14px", borderRadius: "4px" }}>
                <span style={{ fontSize: "10px", color: "#f87171", display: "block" }}>CON ERRORES</span>
                <b style={{ fontSize: "18px", color: "#f87171" }}>{resumen.conErrores}</b>
              </div>
            </div>

            {/* Selector de modo ante duplicados */}
            <div
              style={{
                background: "var(--carbon-deep)",
                border: "1px solid #333",
                padding: "12px 16px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "12px", color: "#ccc" }}>
                <strong>Comportamiento si el producto ya existe en catálogo:</strong>
              </span>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="modoDuplicados"
                    value="actualizar"
                    checked={modoDuplicados === "actualizar"}
                    onChange={() => setModoDuplicados("actualizar")}
                  />
                  <span>Actualizar precio y stock</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="modoDuplicados"
                    value="omitir"
                    checked={modoDuplicados === "omitir"}
                    onChange={() => setModoDuplicados("omitir")}
                  />
                  <span>Omitir existentes</span>
                </label>
              </div>
            </div>

            {/* Pestañas de filtro de vista previa */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #333", paddingBottom: "8px" }}>
              <button
                type="button"
                onClick={() => setFiltroVista("todos")}
                style={{
                  background: filtroVista === "todos" ? "var(--yellow)" : "transparent",
                  color: filtroVista === "todos" ? "var(--ink)" : "#aaa",
                  border: 0,
                  padding: "4px 10px",
                  fontSize: "11px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontWeight: filtroVista === "todos" ? "bold" : "normal",
                }}
              >
                Todos ({filas.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroVista("validos")}
                style={{
                  background: filtroVista === "validos" ? "var(--yellow)" : "transparent",
                  color: filtroVista === "validos" ? "var(--ink)" : "#aaa",
                  border: 0,
                  padding: "4px 10px",
                  fontSize: "11px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontWeight: filtroVista === "validos" ? "bold" : "normal",
                }}
              >
                Nuevos ({resumen.validos - resumen.duplicados})
              </button>
              <button
                type="button"
                onClick={() => setFiltroVista("duplicados")}
                style={{
                  background: filtroVista === "duplicados" ? "var(--yellow)" : "transparent",
                  color: filtroVista === "duplicados" ? "var(--ink)" : "#aaa",
                  border: 0,
                  padding: "4px 10px",
                  fontSize: "11px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontWeight: filtroVista === "duplicados" ? "bold" : "normal",
                }}
              >
                Existentes ({resumen.duplicados})
              </button>
              <button
                type="button"
                onClick={() => setFiltroVista("errores")}
                style={{
                  background: filtroVista === "errores" ? "var(--yellow)" : "transparent",
                  color: filtroVista === "errores" ? "var(--ink)" : "#aaa",
                  border: 0,
                  padding: "4px 10px",
                  fontSize: "11px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontWeight: filtroVista === "errores" ? "bold" : "normal",
                }}
              >
                Errores ({resumen.conErrores})
              </button>
            </div>

            {/* Tabla de registros con scroll */}
            <div style={{ overflowY: "auto", maxHeight: "280px", border: "1px solid #333", borderRadius: "4px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid #333", color: "#888" }}>
                    <th style={{ padding: "8px 10px" }}>FILA</th>
                    <th style={{ padding: "8px 10px" }}>ESTADO</th>
                    <th style={{ padding: "8px 10px" }}>PRODUCTO</th>
                    <th style={{ padding: "8px 10px" }}>MARCA</th>
                    <th style={{ padding: "8px 10px" }}>CATEGORÍA</th>
                    <th style={{ padding: "8px 10px" }}>PRECIO</th>
                    <th style={{ padding: "8px 10px" }}>STOCK</th>
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.map((f) => (
                    <tr
                      key={f.filaNumero}
                      style={{
                        borderBottom: "1px solid #222",
                        background: !f.esValido
                          ? "rgba(180, 35, 24, 0.08)"
                          : f.esDuplicado
                          ? "rgba(255, 224, 0, 0.04)"
                          : "transparent",
                      }}
                    >
                      <td style={{ padding: "8px 10px", color: "#666" }}>#{f.filaNumero}</td>
                      <td style={{ padding: "8px 10px" }}>
                        {!f.esValido ? (
                          <span style={{ color: "#f87171", fontWeight: "bold" }}>Error</span>
                        ) : f.esDuplicado ? (
                          <span style={{ color: "var(--yellow)" }}>Existente</span>
                        ) : (
                          <span style={{ color: "#4ade80" }}>Listo</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <strong>{f.nombre}</strong>
                        {f.modelo && f.modelo !== f.nombre && (
                          <small style={{ display: "block", color: "#888" }}>{f.modelo}</small>
                        )}
                        {f.errores.length > 0 && (
                          <span style={{ display: "block", color: "#f87171", fontSize: "10px" }}>
                            {f.errores.join(", ")}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: "#222", padding: "2px 6px", borderRadius: "3px" }}>
                          {f.marca}
                        </span>
                        {f.marcaEsNueva && (
                          <small style={{ display: "block", color: "var(--yellow)", fontSize: "9px" }}>+ Nueva</small>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#bbb" }}>{f.categoria}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <strong>S/{f.precio}</strong>
                        {f.precioAnterior && (
                          <small style={{ display: "block", color: "#666", textDecoration: "line-through" }}>
                            S/{f.precioAnterior}
                          </small>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ color: f.stock ? "#4ade80" : "#f87171" }}>
                          {f.stock ? "Disponible" : "Agotado"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botones de acción del paso 2 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setPaso(1)}
                style={{ padding: "8px 16px" }}
              >
                Cambiar archivo
              </button>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  style={{ padding: "8px 16px" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleConfirmImport}
                  disabled={importando || resumen.validos === 0}
                  style={{ padding: "9px 20px" }}
                >
                  {importando ? "Importando lote..." : `Confirmar e Importar (${resumen.validos} registros)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PASO 3: REPORTE FINAL ================= */}
        {paso === 3 && resultadoFinal && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "40px", color: "var(--yellow)" }}>
              <Icon name="check" />
            </div>

            <div>
              <h4 style={{ fontSize: "20px", margin: "0 0 8px", color: "white" }}>
                ¡Catálogo actualizado correctamente!
              </h4>
              <p style={{ color: "#aaa", fontSize: "13px", margin: 0 }}>
                El procesamiento por lotes se ejecutó con éxito en la base de datos.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", textAlign: "left" }}>
              <div style={{ background: "rgba(21, 128, 61, 0.15)", border: "1px solid rgba(21, 128, 61, 0.4)", padding: "14px", borderRadius: "6px" }}>
                <span style={{ fontSize: "11px", color: "#4ade80", display: "block" }}>CREADOS</span>
                <b style={{ fontSize: "24px", color: "white" }}>{resultadoFinal.creados}</b>
                <small style={{ color: "#888", display: "block", fontSize: "10px" }}>Nuevas máquinas o repuestos</small>
              </div>

              <div style={{ background: "rgba(255, 224, 0, 0.1)", border: "1px solid rgba(255, 224, 0, 0.3)", padding: "14px", borderRadius: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--yellow)", display: "block" }}>ACTUALIZADOS</span>
                <b style={{ fontSize: "24px", color: "white" }}>{resultadoFinal.actualizados}</b>
                <small style={{ color: "#888", display: "block", fontSize: "10px" }}>Precios y stock sincronizados</small>
              </div>

              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #333", padding: "14px", borderRadius: "6px" }}>
                <span style={{ fontSize: "11px", color: "#aaa", display: "block" }}>OMITIDOS</span>
                <b style={{ fontSize: "24px", color: "white" }}>{resultadoFinal.omitidos}</b>
                <small style={{ color: "#888", display: "block", fontSize: "10px" }}>Duplicados o filas con error</small>
              </div>
            </div>

            {resultadoFinal.errores.length > 0 && (
              <div style={{ background: "rgba(180, 35, 24, 0.1)", border: "1px solid var(--danger)", padding: "12px", borderRadius: "4px", textAlign: "left" }}>
                <strong style={{ color: "#f87171", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                  Advertencias encontradas:
                </strong>
                <ul style={{ margin: 0, paddingLeft: "18px", color: "#ff8c82", fontSize: "11px" }}>
                  {resultadoFinal.errores.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="button button--primary"
              onClick={handleFinish}
              style={{ padding: "12px 24px", fontSize: "13px", margin: "10px auto 0" }}
            >
              Cerrar y ver catálogo actualizado
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
