import {
  DEFAULT_STORE_CONFIG,
  STORE_CONFIG_KEYS,
  getDefaultStoreConfig,
  type StoreConfigKey,
  type StoreConfigMap,
} from "../../types/domain"
import type { DbConfig } from "../../types/database"
import { getDb } from "./client"
import { defaultMemoryRepository } from "./memoryRepository"

export type { StoreConfigKey, StoreConfigMap }
export const defaultStoreConfig: Readonly<StoreConfigMap> = DEFAULT_STORE_CONFIG

const ALLOWED_KEYS = new Set<string>(STORE_CONFIG_KEYS)

/**
 * Obtiene toda la configuración de la tienda como un objeto clave-valor tipado
 */
export async function getAllStoreConfig(env?: unknown): Promise<StoreConfigMap> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getAllStoreConfig()

  try {
    const { results } = await db
      .prepare("SELECT clave, valor FROM configuracion")
      .all<{ clave: string; valor: string }>()

    const map = getDefaultStoreConfig()
    for (const r of results || []) {
      if (ALLOWED_KEYS.has(r.clave)) {
        map[r.clave as StoreConfigKey] = r.valor
      }
    }
    return map
  } catch (error) {
    console.warn("[D1] Error al obtener configuraciones:", error)
    return defaultMemoryRepository.getAllStoreConfig()
  }
}

/**
 * Actualiza únicamente claves permitidas de configuración
 */
export async function updateStoreConfig(
  config: Partial<Record<StoreConfigKey, string>>,
  env?: unknown
): Promise<boolean> {
  const entries = Object.entries(config).filter(
    ([clave, valor]) => ALLOWED_KEYS.has(clave) && typeof valor === "string"
  ) as Array<[StoreConfigKey, string]>

  if (entries.length === 0) return false

  const db = getDb(env)
  if (!db) return defaultMemoryRepository.updateStoreConfig(config)

  try {
    await db.batch(
      entries.map(([clave, valor]) =>
        db
          .prepare(`
            INSERT INTO configuracion (clave, valor, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = CURRENT_TIMESTAMP
          `)
          .bind(clave, valor)
      )
    )
    return true
  } catch (error) {
    console.error("[D1] Error al actualizar configuración:", error)
    return false
  }
}

/**
 * Obtiene un valor de configuración de la tienda
 */
export async function getStoreConfig(key: StoreConfigKey, defaultValue = "", env?: unknown): Promise<string> {
  const db = getDb(env)
  if (!db) return defaultMemoryRepository.getStoreConfig(key, defaultValue)

  try {
    const row = await db
      .prepare("SELECT valor FROM configuracion WHERE clave = ? LIMIT 1")
      .bind(key)
      .first<DbConfig>()
    return row?.valor || DEFAULT_STORE_CONFIG[key] || defaultValue
  } catch {
    return defaultMemoryRepository.getStoreConfig(key, defaultValue)
  }
}
