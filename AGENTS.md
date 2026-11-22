# Magik Barber Supply - Astro 5 + React 19 + Cloudflare D1/R2

Aplicación SSR en **Astro 5** (`output: "server"`) con islas interactivas **React 19**, persistencia en **Cloudflare D1** y almacenamiento de imágenes en **Cloudflare R2**, preservando el 100% de la fidelidad visual, tokens y microinteracciones del diseño original.

## Pila Tecnológica

- **Framework**: Astro 5 (`astro@^5.18.2`) en modo SSR (`@astrojs/cloudflare`)
- **Interactividad**: React 19 (`react@^19.0.0`, `@astrojs/react@^4.4.2`) mediante Arquitectura de Islas
- **Estado de Islas**: Nano Stores (`nanostores`, `@nanostores/react`) para carrito y notificaciones
- **Base de datos y media**: Cloudflare D1 (`DB` binding + `migrations/`) y Cloudflare R2 (`BUCKET` binding + compresión WebP)
- **Estilos**: Sistema modular de CSS tokens (`src/styles/tokens.css`, `pages.css`, `admin.css`, `responsive.css`) + Tailwind CSS v4 (`@tailwindcss/vite`)
- **Despliegue Cloudflare**: `wrangler.jsonc` con `nodejs_compat` y alias condicional `react-dom/server` -> `react-dom/server.edge` en producción

## Arquitectura del Proyecto

```
migrations/                      # Esquema D1 (0001_initial_schema.sql, 0002_seed_products.sql)
src/
├── components/
│   ├── astro/                   # Componentes nativos Astro (0 KB JavaScript)
│   │   ├── BrandsStrip.astro
│   │   ├── CategoryCard.astro
│   │   ├── FloatingWhatsApp.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── HowToBuy.astro
│   │   ├── ProductCard.astro
│   │   ├── PromoStrip.astro
│   │   └── TrustStrip.astro
│   └── react/                   # Islas reactivas (React 19)
│       ├── admin/               # Pestañas, modales, galería R2 e importador Excel/CSV
│       ├── AddToCartButton.tsx
│       ├── AdminDashboard.tsx
│       ├── BrandDirectory.tsx
│       ├── CartDrawer.tsx
│       ├── CartOrderSummary.tsx
│       ├── CartTrigger.tsx
│       ├── CatalogFilters.tsx
│       ├── CategoryDirectory.tsx
│       ├── CsvImportModal.tsx
│       ├── HeaderSearch.tsx
│       ├── Icon.tsx
│       ├── ProductCard.tsx
│       ├── ProductDetailInteractive.tsx
│       ├── ProductGallery.tsx
│       ├── ShippingCourierTabs.tsx
│       └── ToastNotification.tsx
├── data/                        # Datos semilla de desarrollo (usados solo por memoryRepository)
│   └── products.ts
├── layouts/
│   └── Layout.astro             # Layout maestro SSR (carga storeConfig y catálogo para buscador)
├── lib/
│   ├── auth/adminSession.ts     # Cookie HttpOnly firmada con HMAC-SHA256
│   ├── database/                # Repositorio D1 + memoryRepository instanciable + batch import
│   ├── import/                  # Parser CSV RFC 4180, read/write-excel-file, validador y exportador
│   ├── validators/admin.ts      # Validación estricta de payloads API
│   ├── db.ts                    # Fachada pública de acceso a datos
│   ├── download.ts              # Descarga segura de Blobs
│   ├── imageOptimization.ts     # Redimensionado/conversión WebP en cliente antes de subir a R2
│   └── whatsapp.ts              # Normalización de teléfono y formato de pedido WhatsApp
├── pages/
│   ├── api/                     # Endpoints públicos, R2 (/api/images/*) y admin (/api/admin/*)
│   ├── producto/[id].astro      # Ficha de producto (2 o 3 columnas condicionales)
│   ├── admin.astro              # /admin - Panel administrativo
│   ├── carrito.astro            # /carrito - Carrito y envío a WhatsApp
│   ├── catalogo.astro           # /catalogo - Catálogo SSR + filtros reactivos
│   ├── categorias.astro         # /categorias - Directorio de categorías
│   ├── contacto.astro           # /contacto - Información y WhatsApp
│   ├── index.astro              # / - Inicio (Hero, Destacados, Ofertas)
│   ├── marcas.astro             # /marcas - Directorio de marcas
│   └── pedido.astro             # /pedido - Redirección 301 hacia /carrito
├── services/adminApi.ts         # Cliente HTTP tipado del panel administrativo
├── stores/cart.ts               # Store global con clave compuesta (id, selectedVariant)
├── styles/                      # Hojas modulares (tokens, base, header, components, pages, admin, drawer, responsive)
└── types/                       # Tipos de dominio, env.d.ts y D1/R2
```

## Comandos

- `npm run dev` - Inicia el servidor de desarrollo de Astro con D1/R2 locales (`platformProxy`)
- `npm run typecheck` - Verifica tipos TypeScript (`tsc --noEmit`)
- `npm run build` - Compila la aplicación para producción / Cloudflare
- `npm run preview` - Vista previa del build local

## Preparación Cloudflare Workers / Pages

- **Alias condicional**: Configurado en `astro.config.mjs` para evitar `MessageChannel is not defined` con React 19 en Cloudflare Workers: `'react-dom/server': 'react-dom/server.edge'` (activo durante el build de producción).
- **Configuración única**: `wrangler.jsonc` con `compatibility_flags = ["nodejs_compat"]`, binding `DB` (D1) y `BUCKET` (R2).
- **Agnóstico de plataforma**: Sin binarios específicos de SO.
