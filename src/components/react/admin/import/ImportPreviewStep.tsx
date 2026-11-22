import type { FilaCsvProcesada, ResumenCsv } from "@/lib/import/productValidator"

export type CsvFilterView = "todos" | "validos" | "duplicados" | "errores"

interface ImportPreviewStepProps {
  filas: FilaCsvProcesada[]
  resumen: ResumenCsv
  modoDuplicados: "omitir" | "actualizar"
  filtroVista: CsvFilterView
  importando: boolean
  onChangeModoDuplicados: (modo: "omitir" | "actualizar") => void
  onChangeFiltroVista: (vista: CsvFilterView) => void
  onChangeFile: () => void
  onCancel: () => void
  onConfirm: () => void
}

export default function ImportPreviewStep({
  filas,
  resumen,
  modoDuplicados,
  filtroVista,
  importando,
  onChangeModoDuplicados,
  onChangeFiltroVista,
  onChangeFile,
  onCancel,
  onConfirm,
}: ImportPreviewStepProps) {
  const filasFiltradas = filas.filter((f) => {
    if (filtroVista === "validos") return f.esValido && !f.esDuplicado
    if (filtroVista === "duplicados") return f.esDuplicado
    if (filtroVista === "errores") return !f.esValido
    return true
  })

  const nuevosCount = resumen.validos - resumen.duplicados

  return (
    <div className="csv-preview-root">
      <div className="csv-metrics-grid">
        <div className="csv-metric">
          <span>TOTAL REGISTROS</span>
          <b>{resumen.total}</b>
        </div>
        <div className="csv-metric csv-metric--ok">
          <span>VÁLIDOS NUEVOS</span>
          <b>{nuevosCount}</b>
        </div>
        <div className="csv-metric csv-metric--warn">
          <span>YA EN CATÁLOGO</span>
          <b>{resumen.duplicados}</b>
        </div>
        <div className="csv-metric csv-metric--err">
          <span>CON ERRORES</span>
          <b>{resumen.conErrores}</b>
        </div>
      </div>

      <div className="csv-duplicate-bar">
        <span>
          <strong>Si el producto ya existe en el catálogo:</strong>
        </span>
        <div className="csv-duplicate-options">
          <label>
            <input
              type="radio"
              name="modoDuplicados"
              value="actualizar"
              checked={modoDuplicados === "actualizar"}
              onChange={() => onChangeModoDuplicados("actualizar")}
            />
            <span>Actualizar precio y stock</span>
          </label>
          <label>
            <input
              type="radio"
              name="modoDuplicados"
              value="omitir"
              checked={modoDuplicados === "omitir"}
              onChange={() => onChangeModoDuplicados("omitir")}
            />
            <span>Omitir existentes</span>
          </label>
        </div>
      </div>

      <div className="csv-filter-tabs" role="tablist">
        {(
          [
            ["todos", `Todos (${filas.length})`],
            ["validos", `Nuevos (${nuevosCount})`],
            ["duplicados", `Existentes (${resumen.duplicados})`],
            ["errores", `Errores (${resumen.conErrores})`],
          ] as Array<[CsvFilterView, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filtroVista === key}
            className={filtroVista === key ? "active" : ""}
            onClick={() => onChangeFiltroVista(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="csv-table-wrap">
        <table className="csv-preview-table">
          <thead>
            <tr>
              <th>FILA</th>
              <th>ESTADO</th>
              <th>PRODUCTO</th>
              <th>MARCA</th>
              <th>CATEGORÍA</th>
              <th>PRECIO</th>
              <th>STOCK</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((f) => (
              <tr
                key={f.filaNumero}
                className={
                  !f.esValido ? "is-error" : f.esDuplicado ? "is-dup" : ""
                }
              >
                <td className="col-num">#{f.filaNumero}</td>
                <td>
                  {!f.esValido ? (
                    <span className="tag-err">Error</span>
                  ) : f.esDuplicado ? (
                    <span className="tag-dup">Existente</span>
                  ) : (
                    <span className="tag-ok">Listo</span>
                  )}
                </td>
                <td>
                  <strong>{f.nombre}</strong>
                  {f.modelo && f.modelo !== f.nombre && (
                    <small className="cell-sub">{f.modelo}</small>
                  )}
                  {f.errores.length > 0 && (
                    <span className="cell-err">{f.errores.join(", ")}</span>
                  )}
                </td>
                <td>
                  <span className="csv-brand-pill">{f.marca}</span>
                  {f.marcaEsNueva && <small className="cell-new-brand">+ Nueva</small>}
                </td>
                <td className="col-cat">{f.categoria}</td>
                <td>
                  <strong>S/{f.precio}</strong>
                  {f.precioAnterior && (
                    <small className="cell-old-price">S/{f.precioAnterior}</small>
                  )}
                </td>
                <td>
                  <span className={f.stock ? "stock-ok" : "stock-out"}>
                    {f.stock ? "Disponible" : "Agotado"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="csv-step-footer">
        <button
          type="button"
          className="btn-cancel csv-btn-pad"
          onClick={onChangeFile}
          disabled={importando}
        >
          Cambiar archivo
        </button>

        <div className="csv-footer-actions">
          <button
            type="button"
            className="btn-cancel csv-btn-pad"
            onClick={onCancel}
            disabled={importando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button--primary csv-btn-pad"
            onClick={onConfirm}
            disabled={importando || resumen.validos === 0}
          >
            {importando
              ? "Importando lote..."
              : `Confirmar e Importar (${resumen.validos} registros)`}
          </button>
        </div>
      </div>
    </div>
  )
}
