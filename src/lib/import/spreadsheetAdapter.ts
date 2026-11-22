import readXlsxFile from "read-excel-file/browser"
import writeXlsxFile, { type SheetData } from "write-excel-file/browser"

/**
 * Adaptador aislado para lectura y escritura de hojas de cálculo Excel (.xlsx).
 */
export async function readSpreadsheetBuffer(buffer: ArrayBuffer): Promise<string[][]> {
  const sheets = await readXlsxFile(buffer)
  if (!sheets || sheets.length === 0) return []

  const preferredSheet =
    sheets.find((s) => {
      const lower = s.sheet.toLowerCase()
      return (
        (lower.includes("producto") ||
          lower.includes("catalogo") ||
          lower.includes("catálogo") ||
          lower.includes("magik")) &&
        !lower.includes("guia") &&
        !lower.includes("instruccion")
      )
    }) || sheets[0]

  return (preferredSheet.data || []).map((row) =>
    Array.isArray(row)
      ? row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ""))
      : []
  )
}

export async function writeSpreadsheetMatrix(
  sheetName: string,
  matrix: Array<Array<string | number>>,
  colWidths?: number[]
): Promise<Blob> {
  const sheetData: SheetData = matrix.map((row, rowIdx) =>
    row.map((cell) => ({
      value: cell === "" ? undefined : cell,
      ...(rowIdx === 0 ? { fontWeight: "bold" as const } : {}),
    }))
  )

  return writeXlsxFile(sheetData, {
    sheet: sheetName,
    columns: colWidths?.map((width) => ({ width })),
  }).toBlob()
}
