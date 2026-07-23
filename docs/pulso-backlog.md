# Pulso — backlog ejecutable (para construir después)

> Tickets listos para trabajar cuando se decida arrancar la F1 de Pulso
> (modelo de negocio: `docs/pulso-modelo-negocio.md`). Cada ticket tiene
> criterios de aceptación verificables. El **Definition of Done global** aplica
> a TODOS: un ticket no está terminado por compilar — está terminado cuando
> acerca ganancia medible al cliente y a la operadora.

## Definition of Done global (todo ticket lo cumple)

1. **Ganancia del cliente visible**: lo construido muestra o protege dinero
   del cliente en lenguaje humano (pesos, citas, pacientes) — nunca métricas
   crudas sin traducción.
2. **Ganancia mía medible**: el ticket reduce mi tiempo por cliente, sube
   retención de la mensualidad, o abre ingreso nuevo — y puedo decir cuál de
   las tres.
3. **Automatizado por defecto**: cero pasos manuales recurrentes; lo humano
   solo donde es diseño (onboarding de acceso, botón de aprobar narrativa).
4. `npm run typecheck` + `npm run lint` + `npm run test:unit` verdes; lógica
   de negocio nueva como módulo puro con tests (patrón del repo).
5. Seguridad del diseño respetada: solo agregados (sin PII de pacientes), RLS
   por cliente, portal con candado + `noindex`, accesos revocables.
6. Textos de UI en español; identificadores de dominio en español; tokens de
   diseño del mockup (sin hardcodes).

## Épica P0 — Trámites previos (sin código; días de espera, hacer primero)

- **P-001 · Proyecto Google Cloud + acceso Business Profile API**
  AC: proyecto creado; formulario de acceso a la Business Profile API
  enviado y aprobado; APIs habilitadas (Business Profile Performance, GA4
  Data, Search Console). DoD-ganancia: desbloquea toda la ingesta.
- **P-002 · App OAuth en modo producción (sin verificar)**
  AC: pantalla de consentimiento configurada, app en "producción"; refresh
  token de MI cuenta obtenido y probado >7 días sin caducar (el modo testing
  caduca a los 7 días — inaceptable). Token guardado cifrado, fuera del repo.
- **P-003 · Guía de onboarding de acceso**
  AC: página pública con capturas: cómo agregarme como administradora del
  Perfil de Negocio y lectora de GA4; probada con 1 cliente real por
  WhatsApp en ≤10 min. DoD-ganancia: el onboarding ES el gancho de soporte.

## Épica P1 — Producto mínimo con piloto (1–2 semanas de construcción)

- **P-010 · Modelo de datos `metricas`**
  AC: migración con tabla de series mensuales por cliente y fuente
  (gbp/ga4/gsc), clave (cliente, fuente, metrica, mes) única — reingestas
  idempotentes; RLS solo service role; tests del módulo puro de agregación.
- **P-011 · Ingesta GBP Performance (la primera, la que importa)**
  AC: etapa nueva del flujo diario (launchd) que lee llamadas, rutas, clics
  web/WhatsApp y vistas de perfil de TODOS los clientes conectados con MI
  token; reintentos ante límites; un fallo por cliente no tumba la corrida
  (patrón del flujo diario); series en `metricas`.
- **P-012 · Semáforo de fugas**
  AC: módulo puro que evalúa por cliente: reseñas sin responder, rating vs
  mes anterior, web caída/lenta (reusa detector de tecnología), perfil
  incompleto; cada fuga con costo estimado en MXN (ticket medio configurable,
  default $3,000); tests con casos borde. DoD-ganancia: la fuga en pesos ES
  el argumento de retención.
- **P-013 · Página `/m/[numero]` (portal del cliente)**
  AC: reusa el portal de propuestas: candado email+código, `noindex`, modo
  dueña (mis vistas no cuentan), tracking de vistas; 6 números grandes + 
  semáforo + acción del mes; legible en móvil; tokens de diseño del mockup.
- **P-014 · Narrativa mensual con aprobación**
  AC: la IA redacta la narrativa y la acción del mes desde las series y el
  semáforo (modelo barato); cola de aprobación en el panel (botón aprobar/
  editar); NUNCA se publica sin aprobar; costo IA por cliente registrado.
- **P-015 · Benchmark del nicho**
  AC: módulo puro que compara rating/reseñas/respuesta-a-reseñas del cliente
  contra la base scrapeada de su ciudad+nicho; aparece como una línea del
  reporte ("estás en el top X% de tu ciudad"); tests. DoD-ganancia: es el
  diferenciador que ninguna herramienta genérica tiene.
- **P-016 · Cobro**
  AC: alta de suscripción Pulso = cliente con `suscripcion_activa` + factura
  mensual tipo `suscripcion` (ya existen en el schema); el resumen del panel
  muestra MRR de Pulso separado del de webs.
- **P-017 · Piloto con 3 clientes**
  AC: 3 clientes reales conectados y recibiendo reporte 1 mes gratis;
  medición objetiva con el tracking de vistas. **Puerta de F2**: ≥2 de 3 lo
  abren >1 vez y aceptan pagar; mi tiempo real ≤30 min/cliente/mes.

## Épica P2 — Escala (solo si el piloto pasa la puerta)

- **P-020 · GA4 + Search Console** (mismo patrón que P-011).
- **P-021 · Alertas** (fuga crítica → WhatsApp/email a la operadora primero;
  al cliente cuando la narrativa esté en auto-envío).
- **P-022 · Auto-envío de narrativa** (cuando la tasa de edición manual sea
  <20% dos meses seguidos).
- **P-023 · PDF/WhatsApp mensual** (el reporte viaja al cliente, no solo
  espera visitas).
- **P-024 · OAuth verificado self-service** (solo si el onboarding manual es
  el cuello de botella: >~30 clientes).

## Fuera de alcance (decidido, no olvidado)

- Nada de dashboards en tiempo real: el producto es mensual + alertas.
- Nada de PII de pacientes, nunca — solo agregados.
- Sin apps móviles; el portal responsive basta.
