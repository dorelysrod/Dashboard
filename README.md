# Ai Landing Pro — panel operativo

Panel de una sola persona para un negocio productizado que **rehace webs para clínicas
de medicina estética en México**. Cubre todo el embudo: descubrir prospectos, calificarlos,
armar su dossier, generar una **maqueta** (landing) con su marca real, contactarlos por 3
canales y llevarlos por el portal de propuestas hasta cerrar — más facturación (MX y
Venezuela) y módulo fiscal.

Stack: **Next.js 15** (App Router) · **React 19** · **TypeScript** · **Tailwind** ·
**Supabase** (Postgres + Auth + RLS). La IA vive detrás de un harness con 3 modos
(manual / suscripción / mock), así que la app corre con o sin API.

---

## ▶️ Cómo correrla

```bash
npm install
npm run dev
```

Abre **http://localhost:3000**. Sin configurar nada más, arranca en modo demo (seed
ficticio + IA en modo manual). Para datos reales y IA automática, configura el entorno
(abajo).

### Requisitos
- **Node.js ≥ 18.18** (recomendado 20+; probado en 24).
- Para la **IA automática** (generar maquetas, buscar prospectos): el runtime de
  **Claude Code** presente y una **suscripción autenticada** en el entorno — usa el mismo
  backend que Claude Code, no una API key. Funciona en local; en Vercel serverless estándar
  no (ahí se usa `AI_PROVIDER=manual` o `AI_MOCK=1`).

---

## ⚙️ Configuración (`.env.local`)

Copia el ejemplo y rellena lo que necesites (todo está documentado ahí):

```bash
cp .env.example .env.local
```

Lo esencial, por bloques:

| Bloque | Variables clave | Para qué |
|---|---|---|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Datos reales (leads, maquetas, portal). Sin esto → fallback en memoria/seed. |
| **IA** | `AI_PROVIDER` (`manual`\|`anthropic`), `AI_MOCK=1` | Cómo se generan las cosas con IA (ver abajo). |
| **Modelos de diseño** | `ANTHROPIC_MODEL_DISENO`, `ANTHROPIC_MODEL_REVISOR` | Modelos del equipo de diseño de la maqueta. |
| **Fotos** | `PEXELS_API_KEY` | Fotos royalty-free embebidas en la maqueta (opcional). |
| **Portal** | `LANDINGS_HOST`, `PORTAL_ACCESO_MINUTOS`, `PORTAL_SECRET` | Dominio y candado del portal `/p/[numero]`. |

### Modos de IA
- `AI_PROVIDER=manual` (por defecto): la app te da el **prompt para pegar** en Claude y tú
  pegas la respuesta. Cero llamadas a API. Ideal para arrancar sin cablear nada.
- `AI_PROVIDER=anthropic`: la app llama sola vía **suscripción** (Agent SDK). Habilita
  generar maquetas y buscar prospectos automáticamente.
- `AI_MOCK=1`: respuestas **simuladas** (tests/dev), sin gastar ni tocar API.

---

## 🗺️ Rutas

**Panel** (protegido por login, `app/(panel)/`): `resumen` · `buscar` · `pipeline` ·
`proceso` · `analisis` · `dispo` · `entregas` · `factura` · `fiscal` · `perfil`.

**Público**:
- `/p/[numero]` — **portal de propuestas** del prospecto (candado email + código; registra vistas).
- `/propuestas/[numero]` — **tu** vista de la maqueta (con login, sin candado).
- `/maqueta/[token]` — acceso por token (fallback).
- `/login` · `/recuperar` · `/restablecer` — auth y recuperación de contraseña.

---

## 🎨 Feature: maqueta (equipo de diseño)

Al pulsar **"Generar con esta marca"** en un lead, se corre un pipeline multi-agente que
imita un equipo de diseño real (sobre la suscripción):

```
ux-dev (fundamento: tokens + jerarquía)
   → frontend-dev (construye el HTML)
      → revisor design-system + auditor a11y (WCAG 2.2 AA, en paralelo)
         → frontend-dev (aplica hallazgos)
            → post-proceso: logo real + tipografía real embebida + fotos royalty-free
```

- **Control de marca**: panel para ver/editar colores, tipografía y eslogan detectados antes de generar.
- **Fidelidad real**: se embebe la **fuente real** del cliente (`@font-face` base64) y su **logo**;
  la paleta parte de su marca, no de una plantilla genérica.
- **Fotos** (opcional, solo el mock): el modelo deja marcadores `⟦FOTO:slug⟧` que se sustituyen
  por fotos **royalty-free** (Pexels) embebidas — nunca como "antes/después" ni testimonios (guardarraíl ético).
- **Self-contained**: HTML sin recursos externos → portable y bloqueable a capturas en el portal.
- **Tracking**: el panel muestra si el prospecto **abrió** su propuesta (cuántas veces y cuándo) —
  señal de intención de compra.

---

## 🗄️ Base de datos

Migraciones en `supabase/migrations/` (SQL versionado). Con Supabase CLI:

```bash
supabase db push        # aplica las migraciones al proyecto enlazado
```

> Nota de entorno: el host directo `db.<ref>.supabase.co` es IPv6-only y puede no resolver
> desde algunas redes; usar el **pooler** (`aws-1-…pooler.supabase.com:5432`) para DDL manual.

**GDPR**: los datos reales de prospectos (PII) viven SOLO en Supabase, nunca en el repo.
Los seeds del repo usan nombres ficticios.

---

## 📜 Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (http://localhost:3000) |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Tests unitarios (`node --test`) |

---

## 📁 Estructura

```
app/            Rutas (App Router): panel + portal público + auth
components/     UI (panel/, maqueta/)
lib/
  ai/           Harness IA: proveedores, prompts, esquemas, pipeline de maqueta
  maquetas/     Generación de maqueta: marca, fuentes, fotos, store, portal
  data/         Lógica de dominio: leads, scoring, dossier, facturas, fiscal
  supabase/     Clientes server/browser + middleware
supabase/migrations/   Esquema versionado
tests/unit/     Pruebas
```
