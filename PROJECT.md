# PROJECT NOTES

Memoria compartida del equipo: decisiones, convenciones, gotchas.

## Spec
- ## Spec — Filtros de calidad + distintivo "mejor calificado" en Pipeline

**Objetivo (1 frase):** El operador identifica y prioriza de un vistazo, desde la vista Pipeline, los leads más prometedores (mejor calificados en Google Maps, con reseñas, ya inspeccionados) mediante filtros combinables compartibles por URL.

**Usuarios y contexto:** Operador único del panel interno (desktop principalmente); textos de UI en español; los filtros por URL permiten compartir/recargar vistas exactas.

**Criterios de aceptación (14, cada uno verificable por revisor o test):**
1. **URL como estado:** los 3 filtros nuevos viven en searchParams (`calificados=1`, `resenas=1`, `inspeccionados=1`); el param se OMITE cuando el filtro está apagado (mismo patrón que `urlPipeline` actual con nicho/pagina). Cargar esa URL directamente reproduce el estado filtrado exacto.
2. **Chips:** 3 chips nuevos con textos "Mejores calificados", "Con reseñas", "Inspeccionados", con las clases existentes `chip` / `chip on` y `aria-current` cuando activos; cada chip es un toggle (click sobre chip activo lo desactiva).
3. **Combinables entre sí y con nicho:** semántica AND entre los 4 filtros; activar/desactivar cualquiera resetea a página 1 y CONSERVA los demás filtros activos en la URL.
4. **Paginación conserva filtros:** los links Anterior/Siguiente y el conteo "Página X de Y · N leads" reflejan el conjunto filtrado completo, preservando todos los params activos.
5. **'Mejores calificados':** muestra solo leads con `rating` no nulo y ≥ 4.5, ordenados por rating desc con desempate por `resenas` desc; el orden aplica a TODO el conjunto (server-side), no solo a la página visible.
6. **'Con reseñas':** muestra solo leads con `resenas > 0` (null cuenta como 0).
7. **'Inspeccionados':** etapa ∈ {inspeccionado, cotizado, enviado, abierto, aceptado, en_desarrollo, entregado}; `nuevo` y `descartado` quedan FUERA (descartado salió del pipeline).
8. **Propagación de datos:** `Lead` (lib/types/dominio.ts) expone `rating` y `resenas`; `filaALead` (lib/data/mapeo.ts) los mapea desde `LeadRow`; el seed `LEADS` (lib/data/seed.ts, tipo Lead de UI) se actualiza con valores realistas para que el fallback sin Supabase demuestre filtros y distintivo.
9. **Distintivo visual SIEMPRE visible:** en LeadRow, todo lead con rating ≥ 4.5 Y resenas ≥ 10 muestra estrella + rating con 1 decimal en acento dorado (badge coherente con `nicho`/`stage` de globals.css), esté o no activo algún filtro; sin rating o bajo umbral → no se pinta nada.
10. **Regresión cero:** sin filtros nuevos activos, el comportamiento actual es idéntico (orden created_at asc, filtro nicho, paginación de 25); los tests existentes siguen en verde.
11. **Paridad de modos:** filtros y orden se comportan igual con Supabase configurado (filtros/orden en la query, no en memoria post-página) y con seed en memoria; la lógica de predicados/orden es pura y compartida para poder testearla.
12. **Estado vacío:** un combo de filtros sin resultados muestra mensaje en español dentro de `.note` con `role="status"` (ajustar el texto actual, que solo menciona nicho).
13. **Verificación mecánica:** `npm run typecheck`, `npm run lint` y `npm run test:unit` pasan; hay tests unit nuevos (node:test, tests/unit/) para: predicado de umbral calificado, predicado inspeccionado-o-posterior, comparador rating/resenas, y predicado del distintivo.
14. **Accesibilidad mínima:** el distintivo lleva texto accesible (p. ej. aria-label "Calificación 4.9, 85 reseñas"); los chips nuevos son Links navegables por teclado como los actuales.

**Alcance DENTRO:** app/(panel)/pipeline/page.tsx · components/panel/LeadRow.tsx · lib/types/dominio.ts · lib/data/{leads,mapeo,seed}.ts · app/globals.css (solo estilos del distintivo si hace falta) · tests/unit.
**Alcance FUERA (esta versión):** cambios de esquema BD/migraciones (rating/resenas YA existen en `leads`); ordenamiento configurable por el usuario; filtro por rango de rating; cambios en vista Buscar, Resumen o drawer; persistencia de filtros fuera de la URL (cookies/localStorage); tests E2E nuevos; i18n.

**Supuestos (baratos de corregir; declarados, no preguntados):** (a) "rating alto" = ≥ 4.5; (b) "mínimo razonable de reseñas" para el distintivo = ≥ 10; (c) 'Mejores calificados' FILTRA además de ordenar (mismo umbral 4.5); (d) `descartado` no cuenta como inspeccionado; (e) nombres de params `calificados`/`resenas`/`inspeccionados`; (f) umbrales como constantes nombradas exportadas para test y ajuste futuro. **Carga/fiabilidad:** panel interno mono-operador, decenas–cientos de leads; la paginación server-side de 25 existente basta; sin requisitos nuevos de escala ni disponibilidad.

## Convenciones
- T-006 gotcha: en postgrest-js, `.order(col, {ascending:false})` sobre columna NULLABLE emite ORDER BY DESC sin modificador → PostgreSQL usa NULLS FIRST; para paridad con comparadores JS que hacen `?? 0` hay que pasar `nullsFirst: false` (NULLS LAST). Columnas NOT NULL (created_at, numero, fecha) no lo necesitan. El orden de leads vive en `aplicarOrdenLeads` (lib/data/leads.ts), testeable con builder falso (tests/unit/leads-orden.test.ts).
- T-004: Badge `.badge-calificado` usa `background: var(--amber-s)` (#fbf0dd) + `color: #6b3d06` (amber muy oscuro) → contraste 8.1:1, supera WCAG AA y AAA. La estrella lleva aria-hidden; el badge completo lleva aria-label con rating y reseñas. Importa `meritaDistintivoCalificado` de `lib/data/filtros-leads.ts` (predicado puro compartido con filtros de pipeline).
- T-002: obtenerLeadsPagina acepta flags calificados/conResenas/inspeccionados (FiltroLeads extiende FiltrosCalidadLeads de lib/data/leads-consulta.ts — módulo puro que la página puede reusar); con calificados el orden Supabase lleva clave terciaria created_at asc para paginación estable (el seed la respeta por sort estable). Gotcha: tipar el PostgrestFilterBuilder contra una interfaz estructural genérica dispara TS2589 → helper aplicarFiltrosLeads usa type-erasure interno (métodos devuelven this). T-002 incluye los archivos de T-001 byte-idénticos (git checkout del branch T-001) para compilar; al mergear ambos PRs no hay conflicto.
- T-001: Lead (dominio) expone rating: number|null, resenas: number (null de BD → 0) y etapaDb (enum crudo etapa_lead) para filtrar avance de pipeline en modo seed; la lógica pura de filtros/orden/distintivo vive en lib/data/filtros-leads.ts (UMBRAL_RATING_CALIFICADO=4.5, MIN_RESENAS_DISTINTIVO=10, ETAPAS_INSPECCIONADAS lista readonly usable en .in() de Supabase) — la UI y las queries deben importar de ahí, no duplicar umbrales.
