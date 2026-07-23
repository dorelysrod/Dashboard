---
name: inspeccion-critica
description: Inspección ADVERSARIAL de un lead antes de invertir tiempo en él — intenta DESCALIFICARLO con evidencia barata primero (web fuerte, cadena, reputación baja) y solo lo que sobrevive pasa a dossier/maqueta/outreach. Úsalo al inspeccionar leads del pipeline, al revisar por qué un "mejor calificado" salió descalificado, o para auditar un lote antes de gastar suscripción en él.
allowed-tools: Read, Grep, Glob, Write, Bash, WebSearch, WebFetch, Agent
---

# Inspección Crítica de Leads

## Propósito

Decidir con evidencia —y con sesgo DESCALIFICADOR— si un lead merece el tiempo
de la operadora y el gasto de suscripción (dossier OSINT, maqueta con Opus,
mensajes). La regla madre: **el trabajo del inspector es matar el lead; solo
los que sobreviven al intento son prospectos.** Un falso positivo cuesta horas
(maqueta + mensajes + seguimiento a alguien que nunca comprará); un falso
negativo cuesta un lead marginal. En duda → descalificar.

## Por qué el rating engaña (la trampa del 4.9★)

El rating de Google mide **satisfacción de clientes**. El negocio es rehacer
webs: el mejor prospecto tiene **demanda real que su web desperdicia**. Esas
dos señales van en direcciones opuestas con frecuencia — la clínica 4.9★ con
500 reseñas suele tener también una web moderna (por eso le va bien) →
`brechaWeb: fuerte` → descalificada por `calificarLead`. El rating alto es
condición de DEMANDA (eje de 30 pts), nunca veredicto. El veredicto lo da el
score completo de `lib/data/scoring.ts`, con la brecha web como eje #1 (40 pts).

## Orden de inspección: de lo barato a lo caro

Cada nivel puede descalificar; NUNCA pases al siguiente sin agotar el actual.
El coste crece un orden de magnitud por nivel.

### Nivel 0 — Lo que ya está en la base (coste: cero)

Datos de Maps ya importados (`leads`: rating, resenas, sitio_web, tecnologia,
tier, dossier). Descalificadores inmediatos (espejo de `calificarLead`):

- **Web fuerte**: `tecnologia` moderna (Next/Nuxt/a-medida reciente) o
  `brechaWeb: fuerte` en el dossier → C. No nos necesita.
- **Cadena/franquicia**: nombre con sucursales, "(Sucursal X)", marca
  nacional → C. Gatekeepers y agencia propia; venta lenta.
- **Reputación baja con volumen**: rating < 4.0 con ≥ 30 reseñas → C. Su
  problema es de servicio, no de web; una web nueva no le llena la agenda.
- `negocio ilike '%(test)%'` → fuera siempre.

### Nivel 1 — Su web real (coste: un fetch, sin IA)

Si `sitio_web` existe, VERLA (WebFetch / `detectar-tecnologia.mts` ya la
clasifica). Preguntas críticas, no descriptivas:

- ¿Carga en móvil, tiene botón de WhatsApp/reserva, fotos propias, SSL?
  Si TODO eso está bien → es `decente/fuerte`, probablemente C aunque el
  diseño no te guste a TI. El criterio es "¿pierde pacientes por esto?",
  no "¿la haría distinta?".
- Linktree/solo-Instagram/Facebook como "web" → `sin_web` (máxima
  oportunidad, pitch más fácil).
- Web caída / dominio vencido → gancho de dolor #1, sube prioridad.

### Nivel 2 — Presencia pública (coste: 2-4 búsquedas web)

Solo para los que sobreviven 0-1. WebSearch de `"<negocio>" <ciudad>`:

- ¿Instagram activo con >2k seguidores y web débil? → el dinero está en
  redes y la web lo desperdicia: prospecto ideal, anótalo como gancho.
- ¿Es parte de un grupo médico/spa con departamento de marketing? → C.
- ¿Señales premium (ubicación, servicios de ticket alto: Sculptra, hilos,
  cirugía)? → sube `premium`, mejora el eje de pago.
- ¿La dueña opera y responde ella (posts en primera persona, WhatsApp
  personal)? → `ownerOperated: true`, mejora cierre.

### Nivel 3 — Dossier OSINT completo (coste: suscripción)

Solo Tier A/B provisionales tras 0-2. Es lo que hace `dossier-tier-ab.mts` /
el botón ⭐ del panel. El dossier NO es un resumen: debe producir las
`SenalesLead` verificadas + el DOLOR concreto (qué pierde HOY, medible) que
alimentará el mensaje de venta.

## El juez es el código, no la impresión

Toda inspección termina traduciendo lo observado a `SenalesLead` y pasándolo
por `calificarLead` (lib/data/scoring.ts): brechaWeb, rating, resenas,
ownerOperated, cadena, premium. El tier que salga se PERSISTE en `leads.tier`
(con eso el filtro "Mejores calificados" y la ★ dorada excluyen C — spec:
filtros de calidad). Nunca dejes un lead inspeccionado sin tier escrito: un
lead sin veredicto vuelve a consumir inspección la próxima vez.

## Etiquetado de evidencia (anti-alucinación)

- Cada afirmación lleva su fuente: `confirmed` (lo viste: URL, dato de Maps,
  fetch del sitio) o `likely` (inferencia). Los descalificadores requieren
  `confirmed`; nunca mates un lead por una inferencia.
- `brechaWeb: null` (no pudiste ver la web) NO es `debil`: es "desconocido,
  enriquecer antes de puntuar". No inventes la brecha — es el eje de 40 pts.
- Guarda lo observado en el dossier (jsonb) aunque el lead muera: la próxima
  corrida no debe re-pagar la misma investigación.

## Reglas

- En duda, descalifica: el tiempo de la operadora vale más que el lead marginal.
- Sé crítico con el propio filtro: si un patrón nuevo de falso positivo se
  repite (p. ej. franquicias con nombres locales), propón el descalificador
  como código en `scoring.ts` con test, no como regla mental.
- El orden 0→3 es contractual: gastar suscripción (nivel 3) en un lead que el
  nivel 0 ya podía matar es el desperdicio que este skill existe para evitar.
