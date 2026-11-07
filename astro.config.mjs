import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"

const isProduction = process.env.NODE_ENV === "production"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  integrations: [react()],
  server: {
    host: true,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4321,
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: isProduction
        ? {
            // Mitiga error 'MessageChannel is not defined' en Cloudflare Workers / Pages con React 19
            "react-dom/server": "react-dom/server.edge",
          }
        : {},
    },
    ssr: {
      noExternal: ["nanostores", "@nanostores/react"],
    },
  },
})
