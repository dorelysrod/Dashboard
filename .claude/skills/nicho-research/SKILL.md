---
name: nicho-research
description: Evalúa y rankea nichos candidatos (¿a qué vertical vender webs?) con el método del estudio de jul 2026 — teoría por agentes con búsqueda web real + validación empírica con scraper de Maps + juez con calificarNicho. Úsalo cuando se considere entrar a un nicho nuevo, expandir a una segunda vertical, o re-validar el nicho actual.
allowed-tools: Read, Grep, Glob, Write, Bash, WebSearch, Agent
---

# Nicho Research

## Propósito

Decidir con evidencia —no con opinión— a qué vertical vender webs. Un nicho
bueno cumple 6 criterios; el método los verifica en tres fases: investigación
teórica en paralelo, validación empírica contra Google Maps, y un juez que
rankea con `calificarNicho` (lib/data/nichos.ts).

## Los 6 criterios (los ejes de calificarNicho)

1. **Necesidad estructural** (peso 30): la web debe ser sí-o-sí con un
   MECANISMO ECONÓMICO medible — comisiones de plataforma recuperables
   (Booking 15-25%, OTAs de tours 20-30%), o decisión de compra a distancia /
   de ticket alto donde la web ES la conversión (turismo dental, bodas).
   "Se vería más profesional" NO es mecanismo. Ser honesto con los sustitutos:
   si un Google Business Profile bien llevado basta, la necesidad es "fuerte",
   no "estructural"; si la web es solo imagen, es "debil".
2. **Brecha empírica** (peso 25): % del nicho SIN web propia decente,
   verificado con el scraper (fase 2) — nunca solo con estudios genéricos.
3. **Ticket** (peso 20): ¿pagan $15-30 mil MXN sin dolor? Ojo con nichos
   bimodales (veterinarias: el hospital 24h paga, la vet de barrio no).
4. **Cierre** (peso 15): owner-operated, decisor único, WhatsApp natural,
   ciclo corto.
5. **Prospectable por Maps** (descalificador): el universo completo debe
   salir de búsquedas de Maps, porque así prospecta el sistema.
6. **Recurrencia** (peso 10): ¿la mensualidad de $2-5 mil es venta natural
   (SEO local, reseñas, temporadas) o forzada?

## Fase 1 — Investigación teórica (agentes en paralelo)

- Generar 4-8 nichos candidatos con hipótesis del mecanismo económico.
- Lanzar UN agente por nicho (Agent tool, `general-purpose`, en background)
  con WebSearch real. El prompt de cada agente debe incluir:
  - El contexto del negocio: agencia unipersonal, paquete ~$14,900-30,000 MXN
    + mensualidad $2-5 mil, cierre por WhatsApp, prospección por Maps, nicho
    actual como benchmark.
  - La orden de ser HONESTO sobre matices y sustitutos (¿basta GBP?, ¿el
    software del gremio ya incluye web?, ¿el segmento que paga ya tiene web?).
  - Salida en JSON con: `nicho, necesidadWeb, ticket, brechaSinWeb, cierre,
    prospectableMaps, recurrencia, riesgos, veredicto (vs nicho actual),
    score 0-100`.
- Cada afirmación de brecha sin verificar se marca para la fase 2.

## Fase 2 — Validación empírica (scraper de Maps)

- Una consulta representativa por nicho (`"<rubro> en <ciudad media>"`) en un
  scraper de Google Maps (p. ej. google-maps-scraper) → CSV con `input_id,
  title, category, website, ...`.
- Analizar con el helper:
  `node --import tsx analizar-nicho.mts <gap.csv> [consultas.txt]`
  que clasifica cada ficha con `clasificarWebMaps` (sin_web / débil / decente)
  y saca la tabla de brecha por consulta.
- Regla dura: **brecha < 10% descalifica el nicho** aunque la teoría sea
  perfecta (ej. real: hoteles boutique — la teoría de comisiones era sólida,
  pero los 20 primeros de Maps ya tenían web: mercado capturado hace años).
- Matiz: la brecha de los top-resultados subestima la del segmento largo;
  si el agente teórico señala un sub-segmento sin web (cabañas 5-15 hab),
  scrapear ESA consulta antes de descartar.

## Fase 3 — Juez y ranking

- Traducir cada informe de agente + su brecha empírica a `SenalesNicho` y
  puntuar con `calificarNicho` (lib/data/nichos.ts) — mismos umbrales que el
  scoring de leads: A ≥75, B ≥55.
- El ranking final cruza teoría y datos; ante conflicto, ganan los datos del
  scraper. Comparar siempre contra el nicho actual como línea base.
- Entregable: tabla ranking (nicho, score, tier, brecha, mecanismo económico,
  riesgo principal) + recomendación de a cuál entrar y con qué consulta de
  Maps arrancar la prospección.

## Reglas

- Cero cifras inventadas: toda brecha citada es del scraper o lleva fuente.
- Los agentes teóricos deben declarar cuándo hablan de conocimiento general
  vs búsqueda verificada.
- Guardar los JSON de agentes y el gap.csv del estudio (evidencia
  re-analizable) — no solo las conclusiones.
