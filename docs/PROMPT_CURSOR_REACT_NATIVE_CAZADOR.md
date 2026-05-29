# Prompt maestro para Cursor: aplicación React Native (API Cazador)

**Uso:** copia este archivo completo (o por secciones) en el chat de Cursor al crear un **nuevo repositorio o carpeta** de app móvil. La fuente de verdad del contrato HTTP es [API_CAZADOR.md](./API_CAZADOR.md); el módulo **OpenAI** (asistente de catálogo) está en [API_CAZADOR_OPENAI.md](./API_CAZADOR_OPENAI.md). El contexto de arquitectura backend está en [ANALISIS_API_CAZADOR.md](./ANALISIS_API_CAZADOR.md).

**Ajustes del equipo:** los valores de stack (Expo, NativeWind, etc.) son **recomendados por defecto**. Sustitúyelos al inicio del proyecto si estándar interno es otro.

---

## 1. Meta-instrucciones para el agente (Cursor)

Eres un desarrollador senior en **React Native** y **TypeScript**. Debes:

- Implementar una app para **asesores comerciales** que consume únicamente el **API REST Cazador** documentado en este repositorio (`docs/API_CAZADOR.md`). **No inventes** rutas, parámetros ni códigos HTTP que no estén documentados o en la tabla de endpoints de la sección 4.
- Priorizar **HTTPS** en producción; nunca loguear el **token** en claro en consola en builds de producción.
- Comentarios y textos de UI en **español** salvo nombres técnicos estándar (`token`, `Bearer`, etc.).
- Si falta información (p. ej. listado de ciudades para `city_id`), implementa un **TODO** claro y una solución provisional (sección 3.1), o pregunta al usuario; no asumas endpoints no documentados.
- Respeta **reglas de negocio** de la sección 5 (cliente PROPIO, unicidad DNI/teléfono, pre-reserva multipart, rate limit de login).

---

## 2. Contexto del producto

- **Usuarios:** vendedores (`Advisor`) con **usuario + PIN de 6 dígitos**.
- **Autenticación:** no es Laravel Sanctum sobre usuarios web; el login devuelve un **token opaco** que se envía como `Authorization: Bearer <token>`.
- **URL base del API:**  
  `{{EXPO_PUBLIC_API_BASE_URL}}/api/v1/cazador`  
  Ejemplo local con Herd: `https://crm-lotes.test/api/v1/cazador` (sustituir host por el del entorno).
- **Flujo operativo esperado** (orden lógico de pantallas / features):
  1. Login  
  2. Perfil (ver / editar / cambiar PIN)  
  3. Clientes propios (listar, crear, editar, detalle con lotes)  
  4. Recordatorios (cliente **PROPIO** obligatorio)  
  5. Tickets de atención (crear, listar, cancelar)  
  6. Catálogo: proyectos y lotes; **mis lotes** por estado (`GET my-lots`)  
  7. Pre-reserva con **imagen** del voucher (multipart)  
  8. **Asistente OpenAI** de catálogo (`POST openai/chat`; ver [API_CAZADOR_OPENAI.md](./API_CAZADOR_OPENAI.md))  
  9. Logout  

La **aprobación** de pre-reservas y la **agenda** de tickets se gestionan en el panel web Inmopro; la app solo refleja estados devueltos por el API.

---

## 3. Configuración del proyecto

### 3.1 Variables de entorno

- `EXPO_PUBLIC_API_BASE_URL` — origen **sin** barra final (ej. `https://crm-lotes.test`).
- Validar al arrancar que está definida y sea URL `https` en release.

### 3.2 Cabeceras HTTP

- Siempre enviar `Accept: application/json`.
- Rutas protegidas: `Authorization: Bearer <token_almacenado>`.
- JSON: `Content-Type: application/json` en POST/PUT que lleven cuerpo JSON.
- **Pre-reserva:** no establecer `Content-Type` manualmente en multipart; dejar que el cliente forme el boundary (`FormData`).

### 3.3 Tiempos y reintentos

- Timeout razonable (ej. 30 s) en peticiones.
- **Login:** si la respuesta es **429**, mostrar mensaje claro (demasiados intentos) y no spamear reintentos; backoff o espera al usuario.

### 3.4 Almacenamiento del token

- Guardar el token en almacenamiento **seguro** (p. ej. `expo-secure-store`), no en `AsyncStorage` plano si la política de seguridad lo exige.
- Tras **401**, borrar token y navegar a login.

### 3.5 Ciudades (`city_id`)

El API acepta `city_id` **opcional** en alta/edición de cliente, pero **no** expone en el grupo Cazador un `GET` de ciudades documentado. Opciones para la app:

- Dejar `city_id` sin selector (omitir o campo avanzado numérico), **o**
- Cargar ciudades desde otra fuente acordada con backend, **o**
- Abrir tarea para añadir endpoint público de ciudades para asesores.

---

## 4. Tabla maestra de endpoints

Prefijo real: **`/api/v1/cazador`** (Laravel monta `api.php` bajo `/api`).

| Método | Ruta (relativa al prefijo) | Auth | Query / notas | Cuerpo |
|--------|----------------------------|------|-----------------|--------|
| POST | `auth/login` | No | Throttle: 10/min por IP (`cazador-login`) → **429** | JSON: `username` (req), `pin` (req, **6 dígitos**), `device_name` (opt) |
| POST | `auth/logout` | Bearer | — | vacío |
| GET | `me` | Bearer | — | — |
| PUT | `me` | Bearer | — | JSON perfil (ver 6.1) |
| PUT | `me/pin` | Bearer | — | JSON PIN (ver 6.2) |
| GET | `dateros` | Bearer | `search` opcional | — |
| POST | `dateros` | Bearer | — | JSON datero (ver 6.3.1) |
| PUT | `dateros/{id}` | Bearer | — | JSON datero; `pin` opcional (ver 6.3.1) |
| GET | `clients` | Bearer | `search` opcional | — |
| POST | `clients` | Bearer | — | JSON cliente (ver 6.3) |
| GET | `clients/{id}` | Bearer | — | — |
| PUT | `clients/{id}` | Bearer | — | JSON cliente (mismos campos que alta) |
| GET | `attention-tickets` | Bearer | — | — |
| POST | `attention-tickets` | Bearer | — | JSON ticket (ver 6.4) |
| POST | `attention-tickets/{id}/cancel` | Bearer | — | JSON opcional `notes` |
| GET | `reminders` | Bearer | `pending_only`: `1` o `true` opcional | — |
| POST | `reminders` | Bearer | — | JSON recordatorio (ver 6.5) |
| GET | `reminders/{id}` | Bearer | — | — |
| PUT | `reminders/{id}` | Bearer | — | JSON como POST (incluye `client_id`) |
| DELETE | `reminders/{id}` | Bearer | — | — |
| POST | `reminders/{id}/complete` | Bearer | — | vacío |
| GET | `projects` | Bearer | — | — |
| GET | `projects/{id}` | Bearer | — | — |
| GET | `my-lots` | Bearer | `status` (código `LIBRE`/`PRERESERVA`/…), `project_id`, `search` opcionales | — |
| GET | `lots` | Bearer | `project_id`, `search`, `available_only` (default **true**) | — |
| GET | `lots/{id}` | Bearer | — | — |
| POST | `lots/{id}/pre-reservations` | Bearer | `id` en URL = lote | **multipart** (ver 6.6) |
| GET | `openai/knowledge/projects` | Bearer | Catálogo IA — ver [API_CAZADOR_OPENAI.md](./API_CAZADOR_OPENAI.md) | — |
| GET | `openai/knowledge/projects/{id}` | Bearer | Detalle proyecto (sin PII) | — |
| GET | `openai/knowledge/lots` | Bearer | `project_id`, `search`, `available_only` (default true) | — |
| GET | `openai/knowledge/lots/{id}` | Bearer | Detalle lote catálogo | — |
| POST | `openai/chat` | Bearer | Throttle 8/min; 503 si IA deshabilitada | JSON: `message` (req), `conversation_id` (opt UUID) |

---

## 5. Reglas de negocio obligatorias

### 5.1 Clientes (API Cazador)

- Se listan / muestran / editan clientes del asesor con tipo **PROPIO** o **DATERO** (los DATERO son captados por dateros de ese vendedor). El **alta** (`POST /clients`) solo crea tipo **PROPIO**; no se crean DATERO desde este API.
- La respuesta incluye `client_type` (`code`, `name`) para distinguir en la UI.
- **Unicidad global:** no puede haber otro cliente con el mismo **DNI** (si se envía y no vacío) ni el mismo **teléfono** (no vacío). Respuesta **422** con error de validación:
  - Clave: `duplicate_registration`
  - Mensaje ejemplo: `Cliente ya registrado por Juan Perez` (nombre del asesor que tiene el cliente en CRM).
- En **PUT**, el cliente editado se excluye de la comprobación de duplicados.

### 5.2 Recordatorios

- Solo clientes **PROPIO** del asesor. Si no: **422** con mensaje fijo (según API): *El cliente debe pertenecer al vendedor y ser de tipo PROPIO.* u otra validación documentada; **404** si el recurso no pertenece o el cliente vinculado no es PROPIO en operaciones por id.

### 5.3 Tickets de atención

- Cliente del asesor y tipo **PROPIO**. Ticket asociado a **proyecto**, no a lote. Estado inicial **pendiente**.
- Cancelación: no permitida si ya **realizado** o **cancelado** (manejar error según respuesta del API).

### 5.4 Pre-reservas

- Cliente **PROPIO** del asesor.
- `lot_id` del body debe coincidir con el **id del lote en la URL**.
- `project_id` debe coincidir con el proyecto del lote.
- Lote en estado **LIBRE**; sin pre-reserva activa previa (PENDIENTE/APROBADA).
- `amount` obligatorio, numérico, **> 0** (validación típica `min:0.01` en backend).
- `voucher_image`: archivo **imagen**, máx. **5120** KB en validación Laravel.
- Errores frecuentes **422** (mensajes en español en `message`) y **500** si falta estado PRERESERVA en sistema.

### 5.5 Login

- Credenciales inválidas: **422**, mensaje tipo *Credenciales inválidas.*
- **429** por demasiados intentos desde la misma IP en `auth/login`.

### 5.6 Autenticación

- Sin Bearer o token inválido: **401**, `{"message":"No autenticado."}`

---

## 6. Contratos de cuerpo y respuestas (detalle)

### 6.1 PUT `/me` — validación (alineada a backend)

- `name`: requerido, string, max 255  
- `phone`: requerido, string, max 50  
- `email`: requerido, email, max 255  
- `username`: requerido, string, max 255, único en `advisors` excepto el propio  

Respuesta exitosa incluye `message` y `data` con payload de asesor (estructura análoga a GET `me`).

### 6.2 PUT `/me/pin`

- `current_pin`: requerido, 6 dígitos  
- `pin`: requerido, 6 dígitos, con `pin_confirmation` igual (regla `confirmed`)  

Si PIN actual incorrecto: **422**, `message`: *El PIN actual no es válido.*

### 6.3 POST/PUT `/clients`

- `name`: requerido  
- `dni`: opcional (nullable), max 20  
- `phone`: requerido, max 50  
- `email`: opcional  
- `referred_by`: opcional  
- `city_id`: opcional, existe en `cities`  

Respuesta **201** en POST con `data` que incluye `client_type` (siempre **PROPIO** en alta), `city` anidado y `lots` (vacío en alta). PUT/listado/detalle pueden incluir `client_type` **PROPIO** o **DATERO**. Ver [API_CAZADOR.md](./API_CAZADOR.md) sección clientes.

### 6.3.1 GET/POST/PUT `/dateros`

- Solo dateros del asesor autenticado; **404** `Datero no encontrado.` si el id es de otro asesor (PUT).
- `username` único en `dateros` y no puede repetir `username` de ningún `advisor`.
- **POST:** `name`, `phone`, `email`, `city_id` (ciudad activa), `dni`, `username`, `pin` (6 dígitos), `is_active` opcional.
- **PUT:** mismos campos; `pin` opcional (omitir o vacío = no cambiar PIN). Respuestas con `data` (sin exponer `pin`).

### 6.4 POST `/attention-tickets`

- `client_id`: requerido, existe en `clients`  
- `project_id`: requerido, existe en `projects`  
- `notes`: opcional, max 1000  

### 6.5 POST/PUT `/reminders`

- `client_id`: requerido  
- `title`: requerido, max 255  
- `notes`: opcional, max 2000  
- `remind_at`: requerido, fecha (formato interpretable por Laravel, ej. ISO 8601)  

### 6.6 POST `/lots/{lot}/pre-reservations` — `multipart/form-data`

Campos:

| Campo | Obligatorio | Notas |
|-------|-------------|--------|
| `client_id` | Sí | entero |
| `project_id` | Sí | entero |
| `lot_id` | Sí | **debe ser igual** al id del lote en la URL |
| `amount` | Sí | numérico > 0 |
| `voucher_image` | Sí | archivo imagen |
| `payment_reference` | No | string max 255 |
| `notes` | No | string max 1000 |

Respuesta **201** incluye `voucher_url` absoluta al comprobante en `storage`.

---

## 7. Modelo de errores en la app

- **401:** limpiar sesión, ir a login; mostrar `message` si útil.
- **404:** algunos recursos por id ajeno al asesor (ej. PUT `/dateros/{id}`): usar `message` del JSON.
- **422:**  
  - Mostrar `message` raíz si existe (muchas rutas de negocio).  
  - Si existe `errors` (validación Laravel), mapear por campo en formularios; tratar `duplicate_registration` como mensaje global destacado.  
- **429:** en login, mensaje de “demasiados intentos, espera un minuto” (o similar).  
- **500:** mensaje genérico al usuario; log técnico en desarrollo.  
- Red sin respuesta: mensaje de conectividad.

---

## 8. Stack recomendado (por defecto)

| Área | Elección por defecto | Alternativa |
|------|----------------------|-------------|
| Toolchain | **Expo** (SDK actual LTS) | React Native CLI (documentar linking nativo) |
| Lenguaje | **TypeScript** estricto | — |
| Navegación | **Expo Router** | React Navigation manual |
| Datos remotos | **TanStack Query** (cache, estados loading/error) | Solo fetch + contexto |
| HTTP | **fetch** envuelto en cliente tipado | axios |
| Token | **expo-secure-store** | react-native-keychain en bare |
| Estilos | **NativeWind** (Tailwind) | `StyleSheet` / componentes base |

---

## 9. Arquitectura de carpetas sugerida

```
src/
  api/
    client.ts          # baseURL, headers, parse JSON, lanzar ApiError
    endpoints/         # una función por recurso (auth, clients, reminders, ...)
  types/
    api.ts             # tipos/interfaces alineados a JSON del API
  hooks/               # useAuth, useClients, wrappers de TanStack Query
  app/                 # Expo Router: (auth)/login, (tabs)/...
  components/
  lib/                 # formatos fecha, money, validación PIN 6 dígitos
```

Separar **capa HTTP** de **UI**; no mezclar `fetch` directo en pantallas salvo prototipos.

---

## 10. Pantallas y navegación mínimas

- **Login** (`username`, `pin`, botón entrar, manejo 422/429).
- **Tabs o drawer:** Inicio / Clientes / Recordatorios / Tickets / Catálogo / Perfil.
- **Perfil:** ver datos GET `me`, formulario PUT `me`, formulario cambio PIN.
- **Clientes:** lista con búsqueda (`search`), alta, edición, detalle (lotes asociados).
- **Recordatorios:** lista con filtro pendientes (`pending_only`), CRUD, botón completar.
- **Tickets:** lista, crear (elegir cliente PROPIO y proyecto), cancelar con nota opcional.
- **Catálogo:** lista proyectos, detalle proyecto, lista lotes (filtros `project_id`, `available_only`, `search`), detalle lote (`can_pre_reserve`).
- **Pre-reserva:** elegir cliente PROPIO, importe, referencia/notas, **cámara o galería** → preview → envío multipart → confirmación con `voucher_url` o enlace.

Incluir **logout** en perfil o menú.

---

## 11. Checklist de aceptación (QA manual / E2E)

- [ ] Login OK con credenciales válidas; token persistido de forma segura.  
- [ ] Login fallido 422 muestra mensaje del backend.  
- [ ] Tras varios intentos fallidos, 429 en login manejado sin crashear.  
- [ ] GET `me` con Bearer OK; sin Bearer → 401 y redirección a login.  
- [ ] PUT perfil y PUT PIN (éxito y error PIN actual inválido).  
- [ ] CRUD clientes; duplicar DNI o teléfono existente → 422 y mensaje `duplicate_registration` visible.  
- [ ] Recordatorio solo con cliente PROPIO; error de negocio comprensible.  
- [ ] Ticket crear y listar; cancelar ticket en estado cancelable.  
- [ ] Proyectos y lotes; `available_only` por defecto respeta solo LIBRE.  
- [ ] Pre-reserva multipart con imagen real &lt; 5 MB; errores 422 del API mostrados.  
- [ ] Logout invalida sesión en servidor y borra token local.  

---

## 12. Referencias en este repositorio

- Contrato y ejemplos cURL: [API_CAZADOR.md](./API_CAZADOR.md)  
- Análisis técnico (middleware, reglas, pruebas): [ANALISIS_API_CAZADOR.md](./ANALISIS_API_CAZADOR.md)  
- Colección HTTP de ejemplo: [bruno-cazador.postman_collection.json](./bruno-cazador.postman_collection.json)  
- Cuerpos de ejemplo: [bruno-cazador-bodies.json](./bruno-cazador-bodies.json)  

Rutas Laravel: `routes/api.php`, grupo `v1/cazador`.

---

## 13. Anexo: cómo usar este archivo en Cursor

1. Crea una carpeta nueva para la app Expo y ábrela en Cursor (o monorepo con workspace).  
2. En el chat, escribe: *Implementa la app según el documento adjunto* y adjunta **`@docs/PROMPT_CURSOR_REACT_NATIVE_CAZADOR.md`** (si trabajas dentro del repo CRM) o pega las secciones 1–11.  
3. Si el contexto es largo, divide en dos mensajes: **(A)** secciones 1–6 + tabla endpoints; **(B)** secciones 7–11 + checklist.  
4. Pide explícitamente al agente: primero **tipos TypeScript** + **cliente HTTP** + **auth**, luego pantallas.  
5. Para contrastar respuestas reales, ejecuta los cURL de [API_CAZADOR.md](./API_CAZADOR.md) contra tu `EXPO_PUBLIC_API_BASE_URL`.

---

## 14. Nota sobre formas de JSON reales

El backend puede devolver decimales como strings en algunos campos (p. ej. montos en pre-reserva). El cliente debe **tipar de forma tolerante** (`string | number`) o normalizar al parsear. Los objetos `team` / `level` en **GET `me`** pueden diferir ligeramente del payload de **login** (p. ej. ausencia de `is_active` o `color` en perfil); usa tipos opcionales.

---

*Documento generado para alinear implementación móvil con el API Cazador del CRM Lotes. Actualizar este prompt si cambia `API_CAZADOR.md`.*
