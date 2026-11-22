/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { Runtime } from "@astrojs/cloudflare"
import type { D1Database } from "./types/database"

export interface CloudflareEnv {
  DB?: D1Database
  ADMIN_EMAIL?: string
  ADMIN_PASSWORD?: string
  ADMIN_SESSION_SECRET?: string
}

declare namespace App {
  interface Locals extends Runtime<CloudflareEnv> {}
}
