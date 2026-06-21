# CLAUDE.md — Ai Landing Pro (panel operativo)

Instrucciones que se cargan en cada sesión de Claude Code en este repo.

## 0. Qué es este proyecto

Panel operativo de un negocio web productizado, operado por **una sola persona** (Dorelys).
Recorrido del registro único **lead → cliente**: buscar → inspeccionar → cotizar/correo →
seguir → aceptar (factura + intake) → entregar → fiscal.

La generación con IA (inspección, segmento, correo, cotización, reporte) vive **detrás de
una interfaz** (el harness `AIProvider`, §5 del spec).

- **Fase 1 (actual): NINGUNA llamada a API externa.** Datos sembrados + Supabase + adaptador
  manual (`ManualProvider`: copiar prompt → Claude chat → pegar respuesta).
- **Fase 2 (después):** se implementa `AnthropicProvider` y se cablean las integraciones.
  Activar = cambiar el flag `AI_PROVIDER`. Cero cambios en la app.

La fuente de verdad funcional es el spec del proyecto; la fuente de verdad visual es
`panel-operativo-mockup.html` (tema claro).

## 1. Stack y convenciones (vinculantes)

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind**, deploy en **Vercel**.
- **Supabase** (Postgres + Auth + RLS) como **dato único**.
- **Tema claro únicamente.** Tokens del mockup (usar siempre design tokens, **sin hardcodes**):
  `--bg:#F6F5FB; --card:#FFF; --ink:#23223A; --violet:#6C5CE7; --pink:#FF5C8A;
  --mint:#11B886; --amber:#E5972B`. Tipografías Space Grotesk + Inter.
- **Identificadores de dominio en español** (leads, etapa, cotizaciones, facturas, etc.).
- **GDPR-friendly**; **sin `localStorage`** para datos de negocio.
- La UI **nunca** llama a una API ni a una integración directo: siempre pasa por un
  **servicio de dominio**, y este por el **harness** (`AIProvider`) o un **stub** de integración.

## 2. Las dos capas "harness" — no confundir

1. **Andamiaje de ingeniería** (`.claude/`, `harness/design-system/`, `.github/`, `tests/`,
   `security/`): agentes, skills, commands y CI reutilizados (y podados) del repo `hackathon-os`.
   Es proceso/tooling, no código de app.
2. **Harness IA `AIProvider`** (§5 del spec): código TypeScript de la app. **Se construye nuevo**
   en M4 — no viene de `hackathon-os`. Interfaz + `ManualProvider` + `AnthropicProvider` + flag.

## 3. Milestones (construir en orden)

- **M0** Scaffold: Next 15 + TS + Tailwind (tokens claros) + cliente Supabase + tabla `config`.
- **M1** Modelo de datos + migraciones + **seed** (leads reales).
- **M2** Shell del panel + nav (10 vistas) leyendo del seed, tema claro del mockup.
- **M3** Pipeline + Detalle (drawer) con CRUD a Supabase.
- **M4** Harness IA: `AIProvider` + `ManualProvider` (copiar prompt / pegar respuesta) + flag.
- **M5** Motores: Fiscal (MXN→€, BTW, IB), Proceso (horas/ETA), Análisis (pérdidas),
  Entregas/Disponibilidad (fechas).
- **M6** Stubs de integraciones (Places · Brevo · Stripe · GA4/GSC/GBP · PDF) con interfaz
  lista para fase 2.

**Criterio de aceptación fase 1:** corre en Vercel, tema claro, **sin una sola llamada a API
externa**, operable de punta a punta con el adaptador manual; la API se activa después con un flag.

## 4. Cómo usar el andamiaje (`.claude/`)

- **Skills** (`.claude/skills/`): herramientas de ingeniería project-agnósticas
  (code-review, test-generation, domain-model-designer, adr-generator, secret-scanner,
  auth-review, authorization-review…). Úsalas durante desarrollo y `/pr-review`.
- **Agentes** (`.claude/agents/`): `architect`, `frontend`, `backend`, `testing`, `ux`, `security`.
- **Commands** (`.claude/commands/`): `/new-feature`, `/new-bug`, `/pr-review`.

⚠️ Estos archivos vienen de un harness de **hackathon** y aún arrastran lenguaje de ese contexto
("Hour 0", jueces, presupuesto de tokens). Adáptalos a este proyecto a medida que los toques;
no asumas reglas de hackathon (no hay jueces, no hay demo, fase 1 no gasta API).

## 5. Trabajo concurrente y git

El usuario corre **sesiones de Claude Code en paralelo**. Antes de cualquier commit:
- `git status --short` justo antes de stage y de commit.
- Stagear **solo los archivos de tu tarea** (`git add <path>`, nunca `git add -A` / `git add .`).
- No `git reset --hard` / `git checkout -- <file>` / `git stash` amplio sin confirmar autoría.
- Commitear/pushear solo cuando el usuario lo pida.
