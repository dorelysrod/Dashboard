# Pulso — modelo de negocio (diseño v1)

> Producto de suscripción: métricas de Google del negocio del cliente, en MI
> plataforma, fáciles de leer y con mi soporte. Nombre de trabajo: **Pulso**.
> Este documento diseña el negocio problema-primero: qué dolor resuelve, cómo
> se traduce a dinero (del cliente y mío), y por qué es factible y seguro de
> construir para una operación unipersonal.

## 1. El problema (del cliente, en dinero)

La dueña de una clínica de estética en México vive de que la encuentren en
Google y de que le escriban por WhatsApp. Hoy:

- **No sabe cuántos pacientes le trae (o le pierde) Google.** GA4 y Search
  Console son ilegibles para ella; el Perfil de Negocio manda un email mensual
  que nadie interpreta. Decide a ciegas (¿invierto en fotos? ¿en reseñas? ¿en
  la web?).
- **Fugas silenciosas que cuestan citas**: reseñas sin responder (baja el
  ranking local), rating cayendo, horarios/fotos desactualizados, web caída o
  lenta, WhatsApp que no aparece en el perfil. Cada una es dinero perdido que
  NADIE le señala a tiempo.
- **La cita de estética es de ticket alto** (botox/rellenos/paquetes:
  $3,000–15,000+ MXN). Perder 5 contactos al mes por una fuga tonta son
  $15,000–75,000 MXN de facturación potencial. El dolor ES cuantificable.

**Formulación del problema**: *"No pierdas pacientes que ya te están
buscando."* No vendemos un dashboard: vendemos detectar y tapar fugas de
dinero, cada mes, con alguien que responde el WhatsApp.

## 2. La solución (y por qué la mía y no Looker Studio)

Reporte mensual + página viva en mi plataforma (mismo portal con candado que
las propuestas), con TRES bloques, siempre en pesos y en español humano:

1. **Lo que Google te trajo** — llamadas, rutas, clics a WhatsApp/web desde el
   perfil (GBP Performance), visitas web (GA4), búsquedas donde apareces
   (GSC). Traducido: *"63 personas intentaron contactarte desde Google ≈
   $189,000 MXN en citas potenciales (ticket medio $3,000)"*.
2. **Lo que te está costando dinero** — semáforo de fugas: reseñas sin
   responder, rating vs. mes anterior, web caída/lenta (ya tengo el detector
   de tecnología), perfil incompleto. Cada fuga con su costo estimado.
3. **La acción del mes** — UNA recomendación concreta, con mi soporte para
   implementarla incluida en la mensualidad.

Diferenciadores reales (mi moat, no marketing):

- **Benchmark del nicho**: tengo la base scrapeada del gremio (ratings,
  reseñas, webs de cientos de clínicas por ciudad). *"Tu rating 4.6 vs 4.4
  promedio en Guadalajara; estás en el top 20% pero respondes 0% de reseñas
  vs 35% de tus competidoras."* Ninguna herramienta genérica tiene esto.
- **Soporte incluido**: la acción del mes no es un consejo — es "te lo dejo
  implementado o te llevo de la mano por WhatsApp". Looker Studio no contesta
  mensajes.
- **Legible por diseño**: 6 números grandes, 1 semáforo, 1 acción. Nada más.

## 3. Cómo gano dinero YO (tres vías, ordenadas por valor)

1. **Sustancia para la mensualidad existente** ($2–5k MXN/mes de clientes
   web): hoy es "mantenimiento" invisible → churn latente. Pulso la vuelve
   visible cada mes. **Efecto: retención** del ingreso recurrente ya vendido.
2. **Producto de entrada para leads que hoy DESCARTO**: el filtro/inspección
   descalifica Tier C por "web decente/fuerte" — no me comprarán una web,
   pero SÍ tienen el problema de visibilidad/fugas. Pulso standalone
   (~$990–1,490 MXN/mes) **monetiza la base de leads ya pagada** (scraping,
   dossiers) con costo de adquisición ≈ 0.
3. **Cuña de upsell inverso**: un suscriptor de Pulso ve 3 meses seguidos
   *"tu web pierde el 60% de los clics que Google te manda"* → la venta de la
   web ($15–30k) sale de SUS propios datos, no de mi pitch.

### Unit economics (objetivo, a validar en piloto)

- Precio standalone: $1,190 MXN/mes (ancla < un solo paciente perdido).
- Costo marginal por cliente/mes: APIs de Google $0 (cuotas gratuitas de
  sobra), IA para narrativa ~$2–5 MXN (Haiku/Sonnet), infra compartida ~$0.
- **La variable que decide el negocio es MI tiempo**: presupuesto duro de
  ≤30 min/cliente/mes (informe autogenerado + narrativa IA que yo apruebo y
  edito en 5 min + soporte acotado). 20 clientes ≈ $24k MXN/mes recurrentes
  por ~10 h/mes de trabajo. 50 clientes exige automatizar el soporte de nivel
  1 (FAQ, plantillas) antes de crecer.
- Regla de factibilidad unipersonal: **el soporte prometido se define por
  contrato** — respuesta <24 h hábiles + 1 acción implementada/mes. "Siempre
  con mi soporte" ≠ soporte ilimitado.

## 4. Factibilidad técnica (la decisión clave: SIN OAuth propio al inicio)

La ruta ingenua (mi app OAuth pidiendo scopes de GBP/GA4 a cada cliente)
choca con la **verificación de apps de Google**: semanas de proceso, scopes
sensibles, revisión de seguridad. La ruta de agencia lo evita por completo:

- **F0–F1: acceso por rol, no por API-app.** El cliente me agrega como
  **administradora de su Perfil de Negocio** y **lectora de su GA4** (práctica
  estándar de agencias, 5 minutos guiados por WhatsApp — y refuerza el gancho
  de soporte). Con eso YO leo sus datos con MI cuenta: manualmente (F0) o con
  las APIs usando mis propias credenciales (F1). Cero verificación OAuth,
  cero tokens del cliente en mi base.
- **F2 (solo si escala lo exige)**: app OAuth propia con scopes mínimos, para
  que el onboarding no dependa de mí. Recién ahí entra la verificación.

### Fases con puertas de validación

| Fase | Qué construyo | Puerta para avanzar |
|---|---|---|
| **F0** (días) | Página `/m/[numero]` reusando el portal (candado + vistas + modo dueña). Datos pegados a mano del export de GBP. 3 clientes piloto, gratis 1 mes. | ≥2 de 3 lo abren >1 vez y aceptan pagar |
| **F1** (1–2 semanas) | Tabla `metricas` en Supabase + ingesta con MIS credenciales (GBP Performance API primero; GA4/GSC después) + semáforo de fugas + benchmark del nicho + narrativa IA aprobada por mí. Cobro vía factura `suscripcion` (ya existe en el schema). | ≥10 suscriptores pagando y ≤30 min/cliente/mes reales |
| **F2** | Onboarding self-service (OAuth verificado), alertas push/WhatsApp, PDF mensual. | El tiempo de onboarding es el cuello de botella |

Todo reusa lo construido: portal con candado y tracking de vistas, modo
dueña, Supabase con RLS, detector de tecnología, base de benchmark, motor de
facturación con tipo `suscripcion`, pipeline de IA manual-first (fase 1 del
spec se respeta: F0 no llama ninguna API).

## 5. Seguridad y privacidad (diseño, no parche)

- **Principio: agregados, nunca personas.** Se almacenan series mensuales
  (llamadas: 63, clics: 210) — no hay PII de pacientes en mi base. GDPR/LFPDPPP
  amigable por construcción; el benchmark usa datos públicos de Maps.
- **Acceso del cliente**: mismo modelo del portal de propuestas — candado
  email+código, token de capacidad, `noindex`, RLS en Supabase por cliente,
  revocable al instante (cambiar código). El cliente solo VE lo suyo.
- **Acceso mío a sus cuentas**: por rol revocable por el cliente en un clic
  (él manda), con mi cuenta protegida por 2FA. Si en F2 hay tokens OAuth:
  cifrados en reposo (pgsodium), scopes read-only mínimos, borrado al dar de
  baja.
- **Contrato claro**: qué leo (solo métricas), qué guardo (agregados), qué
  pasa al cancelar (borro accesos y series). Una página, no letra chica.

## 6. Riesgos honestos y su mitigación

1. **Churn cuando los números bajan** → el producto es la NARRATIVA + acción
   ("bajó por X, hacemos Y"), no el número. Un mes malo sin explicación mata
   la suscripción; con explicación la refuerza.
2. **Mi tiempo como cuello de botella** → presupuesto de 30 min/cliente
   medido desde el piloto; si se excede, el precio sube o el soporte se
   acota. No firmar 50 clientes con soporte artesanal.
3. **Dependencia de Google** (APIs cambian, acceso por rol podría
   restringirse) → los datos se guardan en MI base desde el día 1 (el
   histórico es mío/del cliente, no de Google) y el valor está en la
   interpretación, portable a cualquier fuente.
4. **"Lo puedo ver gratis en Google"** → cierto y no importa: también puede
   hacer su web gratis. Paga por no tener que mirarlo, entenderlo ni
   arreglarlo sola. El piloto valida si esta hipótesis aguanta.

## 7. Decisiones abiertas (para la dueña)

- Nombre real del producto y si vive en el dominio del panel o en
  `LANDINGS_HOST` (recomendado: mismo host separado del panel, como /p).
- Precio exacto standalone y si el tier con llamada mensual existe desde F1.
- Ticket medio por defecto para la traducción a pesos ($3,000 MXN propuesto,
  ajustable por cliente).
