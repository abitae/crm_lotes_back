# API Cazador

## Resumen
`Cazador` es el API para vendedores. El acceso es solo para `advisors` y usa autenticacion por token propio.

Catálogo público de proyectos (sin token, para web): [API_WEB.md](./API_WEB.md). Prompt Cursor (React): [PROMPT_CURSOR_REACT_WEB_API.md](./PROMPT_CURSOR_REACT_WEB_API.md).

Análisis de arquitectura y reglas de negocio: [ANALISIS_API_CAZADOR.md](./ANALISIS_API_CAZADOR.md).

Prompt maestro para Cursor (app **React Native** contra este API): [PROMPT_CURSOR_REACT_NATIVE_CAZADOR.md](./PROMPT_CURSOR_REACT_NATIVE_CAZADOR.md).

API y prompt para la app móvil de **dateros** (captadores): [API_DATERO.md](./API_DATERO.md) y [PROMPT_CURSOR_REACT_NATIVE_DATERO.md](./PROMPT_CURSOR_REACT_NATIVE_DATERO.md).

Base path:

`/api/v1/cazador`

Autenticacion:

- Login con `username` y `pin` de 6 digitos.
- Las rutas protegidas requieren header `Authorization: Bearer {token}`.

Seeders utiles para pruebas:

- Los vendedores seeded usan PIN por defecto: `123456`
- Ejemplos de usuarios: `director1`, `gerente1`, `senior1`, `asesor1`

## Flujo principal
1. El vendedor hace login.
2. Opcional: `GET /dashboard` para métricas de inicio (clientes, pre-reservas, lotes por estado, pendientes).
3. Consulta o actualiza su perfil.
4. Gestiona los **dateros** a su cargo (alta y edicion; mismo alcance que en el panel Inmopro para su `advisor_id`).
5. Lista y edita clientes **PROPIO** y **DATERO** (captados por sus dateros); el alta desde la API solo crea tipo **PROPIO**.
6. Opcional: crea recordatorios ligados a esos clientes **PROPIO**.
7. Registra tickets de atencion por proyecto para sus clientes propios.
8. Consulta proyectos, lotes disponibles y **sus lotes asignados** (`GET /my-lots`, opcionalmente por estado).
9. Registra una pre-reserva subiendo una imagen del voucher.
10. El lote pasa a `PRERESERVA`.
11. Un administrador revisa la solicitud desde el backend web y aprueba o rechaza.

## Endpoints

### POST `/auth/login`
Login del vendedor.

Request:

```json
{
  "username": "asesor1",
  "pin": "123456",
  "device_name": "Android"
}
```

Response `200`:

```json
{
  "token": "plain-text-token",
  "advisor": {
    "id": 1,
    "name": "ASESOR NIVEL 1 - 1",
    "phone": "900100001",
    "email": "asesor1@inmopro.com",
    "username": "asesor1",
    "is_active": true,
    "team": {
      "id": 1,
      "name": "Team Norte",
      "color": "#0f766e"
    },
    "level": {
      "id": 1,
      "name": "NIVEL 1",
      "code": "NIVEL_1"
    }
  }
}
```

Errores tipicos:

- `422` credenciales invalidas
- `429` demasiados intentos de login desde la misma IP (limite: 10 por minuto; limitador `cazador-login`)

### POST `/auth/logout`
Invalida el token actual.

Response `200`:

```json
{
  "message": "Sesion cerrada correctamente."
}
```

### GET `/me`
Devuelve el perfil autenticado.

### PUT `/me`
Actualiza perfil del vendedor.

Request:

```json
{
  "name": "Asesor API",
  "phone": "999111222",
  "email": "asesor1@inmopro.com",
  "username": "asesor1"
}
```

### PUT `/me/pin`
Actualiza el PIN del vendedor.

Request:

```json
{
  "current_pin": "123456",
  "pin": "654321",
  "pin_confirmation": "654321"
}
```

### GET `/dashboard`
Resumen para la pantalla de inicio: conteos del vendedor autenticado.

Response `200`:

```json
{
  "data": {
    "clients_count": 12,
    "pre_reservations": {
      "active": 2,
      "pending": 1,
      "approved": 1,
      "rejected": 0
    },
    "lots": {
      "pre_reservation": 1,
      "reserved": 2,
      "transferred": 3,
      "installments": 0
    },
    "attention_tickets_pending": 1,
    "reminders_pending": 4
  }
}
```

Notas:

- `clients_count`: clientes **PROPIO** con `advisor_id` del token.
- `pre_reservations`: filas en `lot_pre_reservations` del asesor; `active` = `pending` + `approved`.
- `lots`: unidades donde el lote tiene `advisor_id` del asesor, agrupadas por código de estado (`PRERESERVA`, `RESERVADO`, `TRANSFERIDO`, `CUOTAS`).
- `attention_tickets_pending`: tickets con estado `pendiente`.
- `reminders_pending`: recordatorios sin `completed_at`, solo con clientes PROPIO del asesor (misma regla que el listado de recordatorios).

### GET `/cities`
Lista ciudades **activas** (`is_active = true`) para selects en el formulario de clientes. Orden: `sort_order`, luego `name`.

Query opcional:

- `search`: filtra por coincidencia parcial en `name` o `department`.

Response `200`:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Lima",
      "department": "Lima",
      "code": "LIM"
    }
  ]
}
```

## Dateros

Reglas:

- Solo se listan y modifican dateros con `advisor_id` igual al vendedor del token.
- El `username` del datero debe ser unico entre `dateros` y no puede coincidir con el `username` de ningun `advisor`.
- El PIN del datero (6 digitos) no se devuelve en las respuestas JSON.
- `city_id` debe ser una ciudad **activa** (misma regla que en Inmopro).

### GET `/dateros`

Lista dateros del vendedor autenticado.

Query opcional:

- `search`: coincidencia parcial en nombre, correo, DNI o usuario.

Cada elemento incluye **`registration_url`** (formulario web) y **`registration_qr_url`** (PNG del mismo enlace en QR, servido por el CRM en `…/registro-datero/{token}/qr.png`).

Response `200`:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Datero QA",
      "phone": "987000999",
      "email": "datero.qa@crm-lotes.test",
      "dni": "45987654",
      "username": "datero_funcional",
      "is_active": true,
      "last_login_at": null,
      "registration_url": "https://tu-dominio.test/registro-datero/550e8400-e29b-41d4-a716-446655440000",
      "registration_qr_url": "https://tu-dominio.test/registro-datero/550e8400-e29b-41d4-a716-446655440000/qr.png",
      "city": {
        "id": 1,
        "name": "Lima",
        "department": "Lima"
      }
    }
  ]
}
```

### POST `/dateros`

Crea un datero asignado al vendedor autenticado.

Request:

```json
{
  "name": "Datero movil",
  "phone": "987654321",
  "email": "datero@app.com",
  "city_id": 1,
  "dni": "40123456",
  "username": "datero_movil_01",
  "pin": "123456",
  "is_active": true
}
```

`is_active` es opcional (por defecto en base de datos: `true`).

Response `201`:

```json
{
  "message": "Datero registrado.",
  "data": { "...": "mismo shape que en el listado" }
}
```

### PUT `/dateros/{datero}`

Actualiza un datero propio. Si el `id` no existe o pertenece a otro asesor: **`404`** con `message`: `Datero no encontrado.`

Request: mismos campos que en alta, excepto:

- `pin`: opcional; si se omite o va vacio, se conserva el PIN actual.

Response `200`:

```json
{
  "message": "Datero actualizado.",
  "data": { "...": "mismo shape que en el listado" }
}
```

## Clientes propios

Reglas:

- El vendedor solo ve clientes con `advisor_id` propio y tipo **`PROPIO`** o **`DATERO`** (clientes captados por los dateros de ese asesor se listan y se pueden ver/editar en detalle).
- Los clientes **creados** con `POST /clients` se guardan siempre con tipo **`PROPIO`**. No se puede dar de alta un cliente **DATERO** desde este API (eso lo hace la app Datero).

### GET `/clients`
Lista clientes propios y clientes tipo DATERO del asesor.

Query params opcionales:

- `search`

### POST `/clients`
Crea un cliente propio.

Request:

```json
{
  "name": "Cliente Cazador",
  "dni": "76543210",
  "phone": "987654321",
  "email": "cliente@demo.com",
  "referred_by": "Campana digital",
  "city_id": 1
}
```

Response `201`:

```json
{
  "message": "Cliente registrado.",
  "data": {
    "id": 101,
    "name": "Cliente Cazador",
    "dni": "76543210",
    "phone": "987654321",
    "email": "cliente@demo.com",
    "referred_by": "Campana digital",
    "client_type": {
      "code": "PROPIO",
      "name": "Propio"
    },
    "city": {
      "id": 1,
      "name": "Lima",
      "department": "Lima"
    },
    "lots": []
  }
}
```

Cada elemento incluye `client_type` con `code` y `name` (`PROPIO`, `DATERO`, etc.) para distinguir en la app.

**Unicidad DNI y telefono:** no puede existir otro cliente en el sistema con el mismo DNI (si se envia) ni el mismo telefono. Si ya estan registrados, respuesta **`422`** con error de validacion en la clave `duplicate_registration` y mensaje del tipo: `Cliente ya registrado por {nombre del vendedor}` (el asesor que tiene ese cliente en el CRM).

### GET `/clients/{client}`
Detalle de cliente propio con lotes asociados.

### PUT `/clients/{client}`
Actualiza cliente propio (misma regla de unicidad; el cliente que se edita se excluye de la comprobacion).

## Tickets de atencion

### GET `/attention-tickets`
Lista los tickets del vendedor autenticado.

Response por item:

```json
{
  "id": 1,
  "status": "pendiente",
  "scheduled_at": null,
  "notes": "Cliente solicita visita.",
  "created_at": "2026-03-13T20:10:00-05:00",
  "client": {
    "id": 25,
    "name": "Cliente Cazador",
    "dni": "76543210"
  },
  "project": {
    "id": 1,
    "name": "Villa Norte - Mito",
    "location": "Junin"
  }
}
```

### POST `/attention-tickets`
Crea un ticket de atencion.

Reglas:

- El cliente debe pertenecer al vendedor autenticado.
- El cliente debe ser de tipo `PROPIO`.
- El ticket se registra por `proyecto`, no por `lote`.
- El estado inicial siempre es `pendiente`.
- La agenda se define luego desde el backend administrativo.

Request:

```json
{
  "client_id": 25,
  "project_id": 1,
  "notes": "Cliente solicita visita de informacion."
}
```

Response `201`:

```json
{
  "message": "Ticket de atencion registrado.",
  "data": {
    "id": 1,
    "status": "pendiente",
    "scheduled_at": null,
    "notes": "Cliente solicita visita de informacion.",
    "created_at": "2026-03-13T20:10:00-05:00",
    "client": {
      "id": 25,
      "name": "Cliente Cazador",
      "dni": "76543210"
    },
    "project": {
      "id": 1,
      "name": "Villa Norte - Mito",
      "location": "Junin"
    }
  }
}
```

### POST `/attention-tickets/{attentionTicket}/cancel`
Cancela un ticket propio del vendedor.

Reglas:

- Solo se puede cancelar tickets del vendedor autenticado.
- No se puede cancelar un ticket ya `realizado` o `cancelado`.
- Se puede enviar una observacion opcional.

Request:

```json
{
  "notes": "El cliente pidio cancelar la solicitud."
}
```

Response `200`:

```json
{
  "message": "Ticket cancelado correctamente."
}
```

## Recordatorios

Recordatorios puntuales ligados a **clientes propios** del vendedor (tipo de cliente **`PROPIO`**, igual que en tickets de atención y pre-reservas).

Reglas:

- Solo se listan y gestionan recordatorios cuyo `client_id` apunta a un cliente con `advisor_id` del token y tipo **`PROPIO`**.
- Al crear (`POST`) o actualizar (`PUT`) un recordatorio, el `client_id` debe cumplir lo mismo; si el cliente es de otro tipo (p. ej. `PROSPECTO`) o de otro asesor, la API responde `422`.
- `GET`, `PUT`, `DELETE` y `POST .../complete` sobre un recordatorio concreto exigen que el recordatorio sea del asesor **y** que el cliente vinculado sea **PROPIO** (si no, `404`).

Los **eventos de agenda** (calendario con rango de fechas) no se exponen en esta API; se gestionan desde el panel web Inmopro (`/inmopro/agenda`).

### GET `/reminders`
Lista recordatorios del vendedor (solo los asociados a clientes **PROPIO**).

Query params opcionales:

- `pending_only` — si es `1` o `true`, solo devuelve recordatorios no completados (`completed_at` null).

Response por recordatorio:

```json
{
  "id": 1,
  "client_id": 25,
  "client": { "id": 25, "name": "Cliente Ejemplo" },
  "title": "Llamar para cita",
  "notes": null,
  "remind_at": "2026-03-20T09:00:00-05:00",
  "completed_at": null,
  "created_at": "2026-03-19T12:00:00-05:00"
}
```

### POST `/reminders`
Crea un recordatorio.

Request:

```json
{
  "client_id": 25,
  "title": "Llamar para cita",
  "notes": "Oferta vigente hasta viernes",
  "remind_at": "2026-03-20T09:00:00"
}
```

El cliente debe pertenecer al vendedor autenticado y ser de tipo **`PROPIO`**.

Response `201`: mismo objeto que en listado, con `message`: "Recordatorio creado."

### GET `/reminders/{reminder}`
Detalle de un recordatorio propio (cliente **PROPIO**).

### PUT `/reminders/{reminder}`
Actualiza un recordatorio propio. Body igual que en POST (incluye `client_id` que debe ser **PROPIO** del asesor).

### DELETE `/reminders/{reminder}`
Elimina un recordatorio propio.

### POST `/reminders/{reminder}/complete`
Marca el recordatorio como realizado (`completed_at` = ahora).

Response `200`: objeto del recordatorio actualizado, con `message`: "Recordatorio marcado como realizado."

Errores tipicos (recordatorios):

- `404` recordatorio no encontrado, de otro vendedor o cuyo cliente no es **PROPIO**
- `422` con mensaje: `El cliente debe pertenecer al vendedor y ser de tipo PROPIO.`

## Proyectos

### GET `/projects`
Lista proyectos.

### GET `/projects/{project}`
Detalle de proyecto.

## Lotes

### GET `/my-lots`
Lista las unidades donde el lote tiene `advisor_id` del vendedor autenticado (misma regla que los conteos `lots` en `GET /dashboard`).

Query params opcionales:

- `status` — codigo de estado del lote: `LIBRE`, `PRERESERVA`, `RESERVADO`, `TRANSFERIDO`, `CUOTAS` (debe ser un codigo de sistema valido).
- `project_id` — filtra por proyecto.
- `search` — coincidencia parcial en `block` o `number`.

Si no se envia `status`, se devuelven todos los lotes del asesor sin filtrar por estado.

Cada elemento usa el mismo formato enriquecido que `GET /lots/{lot}` (incluye `client`, `advisor` y `pre_reservations` con historial reciente).

Response `200`:

```json
{
  "data": [
    {
      "id": 10,
      "block": "A",
      "number": 5,
      "area": "105.00",
      "price": "30000.00",
      "project": { "id": 1, "name": "Villa Norte - Mito" },
      "status": {
        "id": 3,
        "name": "Reservado",
        "code": "RESERVADO",
        "color": "#f59e0b"
      },
      "can_pre_reserve": false,
      "client": { "id": 25, "name": "Cliente Ejemplo" },
      "advisor": { "id": 4, "name": "Asesor Demo" },
      "pre_reservations": [
        {
          "id": 2,
          "status": "APROBADA",
          "created_at": "2026-03-18 10:00:00"
        }
      ]
    }
  ]
}
```

Errores tipicos:

- `422` si `status` no es un codigo de estado de sistema valido.

### GET `/lots`
Lista lotes (catalogo; no filtra por asesor).

Query params opcionales:

- `project_id`
- `search`
- `available_only` (`true` por defecto)

Response por lote:

```json
{
  "id": 1,
  "block": "A",
  "number": 1,
  "area": "105.00",
  "price": "30000.00",
  "project": {
    "id": 1,
    "name": "Villa Norte - Mito"
  },
  "status": {
    "id": 1,
    "name": "Libre",
    "code": "LIBRE",
    "color": "#10b981"
  },
  "can_pre_reserve": true,
  "client": null,
  "advisor": null,
  "pre_reservations": []
}
```

### GET `/lots/{lot}`
Detalle de lote.

## OpenAI (catálogo y chat)

Módulo separado bajo el prefijo `/openai`. Requiere el mismo `Authorization: Bearer {token}` que el resto del API.

Configuración en el servidor: `config/openai_cazador.php` y variables `OPENAI_*` en `.env` (ver `.env.example`). Si `OPENAI_CAZADOR_ENABLED=false`, las rutas responden `503`.

### API de conocimiento (prefetch / contexto)

Base: `/openai/knowledge` — throttle `ai-cazador-knowledge` (por defecto 60 req/min por asesor).

Solo expone **proyectos activos** y **lotes de catálogo** sin datos de clientes ni asesores.

#### GET `/openai/knowledge/projects`
Lista resumida de proyectos activos (`id`, `name`, `location`, `total_lots`, `lots_count`, `images_count`, `documents_count`).

#### GET `/openai/knowledge/projects/{project}`
Detalle: `blocks`, `assets`, `images`, `documents` con `download_url` absoluta (misma descarga que `GET /projects/{project}/assets/{asset}/download`).

#### GET `/openai/knowledge/lots`
Query opcionales: `project_id`, `search`, `available_only` (default `true` → solo estado `LIBRE`).

Payload de lote (sin `client` ni `advisor`):

```json
{
  "id": 1,
  "block": "A",
  "number": 1,
  "area": "105.00",
  "price": "30000.00",
  "project": {
    "id": 1,
    "name": "Villa Norte - Mito",
    "location": "Mito"
  },
  "status": {
    "id": 1,
    "name": "Libre",
    "code": "LIBRE"
  },
  "can_pre_reserve": true
}
```

#### GET `/openai/knowledge/lots/{lot}`
Detalle de un lote del catálogo (mismas reglas: proyecto activo; por defecto solo `LIBRE`).

### POST `/openai/chat`
Asistente de catálogo (OpenAI vía Laravel AI). Throttle `ai-cazador` (por defecto 8 req/min por asesor).

Request:

```json
{
  "message": "¿Qué proyectos hay en Huancayo y lotes libres?",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

- `message` — obligatorio, máx. `OPENAI_CAZADOR_MAX_MESSAGE_LENGTH` (default 2000).
- `conversation_id` — opcional UUID; si se omite, el servidor genera uno y lo devuelve.

Response `200`:

```json
{
  "reply": "Texto del asistente en español.",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

El agente consulta el catálogo mediante tools internas (proyectos y lotes disponibles). No envía datos de clientes a OpenAI.

Errores:

- `401` sin token.
- `422` validación del mensaje.
- `429` rate limit.
- `503` módulo deshabilitado.

## Pre-reservas

### POST `/lots/{lot}/pre-reservations`
Registra una pre-reserva para un lote libre.

Reglas:

- El cliente debe pertenecer al vendedor autenticado.
- El `lot_id` enviado debe coincidir con el lote de la ruta.
- El proyecto enviado debe coincidir con el lote enviado.
- El cliente debe ser de tipo `PROPIO`.
- El lote debe estar en estado `LIBRE`.
- No puede existir una pre-reserva activa previa para el lote.
- El monto es obligatorio y debe ser mayor a cero.
- El voucher se sube como archivo de imagen.

Request `multipart/form-data`:

- `client_id`
- `project_id`
- `lot_id`
- `amount`
- `voucher_image`
- `payment_reference` opcional
- `notes` opcional

Ejemplo esperado:

```text
client_id=25
project_id=1
lot_id=10
amount=1500.00
voucher_image=(archivo)
payment_reference=OP-12345
notes=Abono inicial
```

Response `201`:

```json
{
  "message": "Pre-reserva registrada y pendiente de aprobacion.",
  "data": {
    "id": 1,
    "status": "PENDIENTE",
    "amount": "1500.00",
    "project": {
      "id": 1,
      "name": "Villa Norte - Mito"
    },
    "lot": {
      "id": 10,
      "block": "A",
      "number": 5
    },
    "voucher_url": "https://crm-lotes.test/storage/cazador/pre-reservations/archivo.png"
  }
}
```

Errores tipicos:

- `422` cliente no pertenece al vendedor
- `422` lote enviado no coincide con la ruta
- `422` lote no pertenece al proyecto enviado
- `422` unidad no disponible para pre-reserva
- `422` unidad ya con pre-reserva activa
- `500` estado `PRERESERVA` no configurado

## Estados del lote en este flujo

- `LIBRE`: disponible para pre-reserva
- `PRERESERVA`: solicitud registrada y pendiente de revision
- `RESERVADO`: aprobado desde backend administrativo
- `TRANSFERIDO`: venta cerrada
- `CUOTAS`: operacion financiada

## Aprobacion administrativa
La aprobacion no ocurre en el API.

Se gestiona en backend web:

- ruta web: `/inmopro/lot-pre-reservations`
- acciones:
  - aprobar
  - rechazar

Al aprobar:

- la solicitud pasa a `APROBADA`
- el lote pasa a `RESERVADO`

Al rechazar:

- la solicitud pasa a `RECHAZADA`
- el lote vuelve a `LIBRE`

En tickets de atencion:

- el vendedor crea el ticket en `pendiente`
- administracion agenda desde `/inmopro/attention-tickets`
- el vendedor puede cancelar desde Cazador mientras no este `realizado` o `cancelado`

## Ejemplos detallados de uso (cURL)

Sustituye `BASE` por la URL de tu entorno (p. ej. `https://crm-lotes.test`) y guarda el token devuelto en una variable de shell.

### 1. Autenticacion

```bash
curl -s -X POST "$BASE/api/v1/cazador/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"username":"asesor1","pin":"123456","device_name":"CLI"}'
```

Respuesta esperada: `token` en JSON. Exporta por ejemplo:

```bash
export TOKEN="pega_aqui_el_token_plano"
```

### 2. Perfil

```bash
curl -s "$BASE/api/v1/cazador/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Cliente PROPIO (alta desde API)

Los clientes creados con `POST /clients` quedan como **PROPIO** automaticamente.

```bash
curl -s -X POST "$BASE/api/v1/cazador/clients" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Cliente Demo API",
    "dni": "87654321",
    "phone": "987000111",
    "email": "demo@example.com",
    "referred_by": "Referido prueba",
    "city_id": 1
  }'
```

Anota `data.id` del cliente (ej. `CLIENT_ID=25`).

### 4. Recordatorios (requiere cliente PROPIO)

Listar pendientes:

```bash
curl -s "$BASE/api/v1/cazador/reminders?pending_only=1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

Crear (usa un `CLIENT_ID` de un cliente **PROPIO** del asesor):

```bash
curl -s -X POST "$BASE/api/v1/cazador/reminders" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"client_id\": $CLIENT_ID,
    \"title\": \"Seguimiento oferta\",
    \"notes\": \"Llamar antes del viernes\",
    \"remind_at\": \"2026-03-25T10:00:00\"
  }"
```

Si `client_id` es de tipo distinto de **PROPIO** (p. ej. prospecto cargado solo en backoffice), la API responde **422** con el mensaje de reglas de negocio.

Marcar como realizado (sustituye `REMINDER_ID`):

```bash
curl -s -X POST "$BASE/api/v1/cazador/reminders/REMINDER_ID/complete" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Ticket de atencion (cliente PROPIO + proyecto)

```bash
curl -s -X POST "$BASE/api/v1/cazador/attention-tickets" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"client_id\": $CLIENT_ID,
    \"project_id\": 1,
    \"notes\": \"Solicita visita al proyecto\"
  }"
```

### 6. Pre-reserva (multipart)

El voucher debe ser un archivo de imagen real; ejemplo con `curl` desde archivo:

```bash
curl -s -X POST "$BASE/api/v1/cazador/lots/LOT_ID/pre-reservations" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -F "client_id=$CLIENT_ID" \
  -F "project_id=1" \
  -F "lot_id=LOT_ID" \
  -F "amount=1500" \
  -F "payment_reference=OP-999" \
  -F "notes=Abono inicial" \
  -F "voucher_image=@/ruta/local/comprobante.png"
```

`lot_id` en el cuerpo debe coincidir con `LOT_ID` en la URL; el lote debe estar **LIBRE**.

### 7. Cerrar sesion

```bash
curl -s -X POST "$BASE/api/v1/cazador/auth/logout" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

## Seeders relacionados
Para un entorno de prueba consistente, `DatabaseSeeder` ahora carga:

- teams
- niveles de asesor
- estados de lote
- estados de comision
- proyectos
- tipos de cliente
- ciudades
- vendedores con credenciales Cazador
- clientes vinculados a vendedor y ciudad
- lotes
- pre-reservas de ejemplo

## Verificacion recomendada
1. `php artisan migrate:fresh --seed`
2. `npm run build`
3. Probar login con `asesor1 / 123456`
4. Consultar `/api/v1/cazador/projects`
5. Crear un cliente propio
6. Crear un ticket de atencion
7. Listar y crear un recordatorio con un cliente **PROPIO**
8. Registrar una pre-reserva con voucher
