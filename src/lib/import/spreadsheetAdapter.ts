import * as XLSX from "xlsx"

/**
 * Adaptador aislado para lectura y escritura de hojas de cálculo Excel (.xlsx / .xls).
 */
export function readSpreadsheetBuffer(buffer: ArrayBuffer): string[][] {
  const data = new Uint8Array(buffer)
  const wb = XLSX.read(data, { type: "array" })
  if (!wb.SheetNames.length) return []

  const preferredSheet =
    wb.SheetNames.find((name) => {
      const lower = name.toLowerCase()
      return (
        (lower.includes("producto") ||
          lower.includes("catalogo") ||
          lower.includes("catálogo") ||
          lower.includes("magik")) &&
        !lower.includes("guia") &&
        !lower.includes("instruccion")
      )
    }) || wb.SheetNames[0]

  const ws = wb.Sheets[preferredSheet]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][]

  return rows.map((row) =>
    Array.isArray(row)
      ? row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ""))
      : []
  )
}

export function writeSpreadsheetMatrix(
  sheetName: string,
  matrix: Array<Array<string | number>>,
  colWidths?: number[]
): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(matrix)
  if (colWidths && colWidths.length > 0) {
    ws["!cols"] = colWidths.map((wch) => ({ wch }))
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Uint8Array(buffer)
}
