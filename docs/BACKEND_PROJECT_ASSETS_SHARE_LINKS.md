# Backend: enlaces temporales para compartir assets de proyecto (Opción A)

Documento de especificación para implementar en el API **Laravel / Cazador** la capacidad de generar URLs **públicas y temporales** que permitan a un **cliente final** (sin cuenta de asesor) **ver o descargar** imágenes y documentos de un proyecto cuando el asesor los comparte por WhatsApp u otro canal.

Este documento describe únicamente la **Opción A**: endpoint autenticado que genera enlaces firmados + ruta pública de descarga/visualización.

---

## 1. Problema actual

### 1.1 Flujo en la app móvil

La app móvil **Cazador** (React Native / Expo) consume el API con:

| Concepto | Valor |
|----------|--------|
| Base URL (env) | `EXPO_PUBLIC_API_BASE_URL` — ej. `https://inmopro.laravel.cloud` |
| Prefijo API | `/api/v1/cazador` |
| Autenticación asesores | Laravel Sanctum — header `Authorization: Bearer {token}` |

Los proyectos incluyen assets en `GET /projects` y `GET /projects/{id}` bajo `images` y `documents`:

```json
{
  "id": 9,
  "kind": "image",
  "title": "Fachada",
  "file_name": "fachada.jpg",
  "mime_type": "image/jpeg",
  "file_size": 204800,
  "download_url": "projects/3/assets/9/download"
}
```

La app convierte `download_url` relativa en URL absoluta:

```
https://inmopro.laravel.cloud/api/v1/cazador/projects/3/assets/9/download
```

### 1.2 Por qué falla al compartir por WhatsApp

Esa ruta de descarga **requiere** el header `Authorization: Bearer`. Si el asesor pega el enlace en WhatsApp y el **cliente** lo abre en el navegador del teléfono, **no hay token** y el API responde:

```json
{
  "message": "No autenticado."
}
```

HTTP **401**.

### 1.3 Qué NO hacer

| Enfoque | Por qué no sirve |
|---------|------------------|
| `?token={sanctum_token}` en la URL | Sanctum no autentica por query string; el token del asesor no debe exponerse en enlaces compartidos |
| Hacer público `GET projects/{id}/assets/{id}/download` sin más | Cualquiera con el ID podría acceder a archivos de cualquier proyecto |
| Token Sanctum de larga duración en el enlace | Riesgo de seguridad: acceso total a la cuenta del asesor |

---

## 2. Objetivo de la Opción A

Implementar un flujo de **dos pasos**:

1. **Generación (autenticada):** el asesor, con su sesión Sanctum, solicita enlaces temporales para uno o más assets de un proyecto.
2. **Consumo (público):** el cliente final abre `share_url` en el navegador **sin** Bearer; el servidor valida la **firma** y la **expiración** y sirve el archivo.

La app móvil ya está preparada para llamar este endpoint. Si existe y devuelve URLs válidas, envía **un solo mensaje de WhatsApp con enlaces**. Si no existe (404/405), hace fallback descargando con Bearer y adjuntando archivos uno a uno (peor experiencia).

---

## 3. Contrato de API

### 3.1 Generar enlaces compartibles

```
POST /api/v1/cazador/projects/{project}/assets/share-links
```

| Aspecto | Detalle |
|---------|---------|
| Autenticación | **Requerida** — `Authorization: Bearer {sanctum_token}` |
| Content-Type | `application/json` |
| `{project}` | ID numérico del proyecto |

#### Cuerpo de la petición

```json
{
  "asset_ids": [9, 10, 11]
}
```

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `asset_ids` | `integer[]` | Sí | No vacío; cada ID debe existir y pertenecer al `{project}`; máximo recomendado **20** por request |

#### Respuesta exitosa — HTTP 200

Envelope estándar del API Cazador (`data` como array):

```json
{
  "data": [
    {
      "id": 9,
      "share_url": "https://inmopro.laravel.cloud/api/v1/cazador/shared/assets/9?expires=1717000000&signature=a1b2c3...",
      "expires_at": "2026-05-29T12:00:00Z"
    },
    {
      "id": 10,
      "share_url": "https://inmopro.laravel.cloud/api/v1/cazador/shared/assets/10?expires=1717000000&signature=d4e5f6...",
      "expires_at": "2026-05-29T12:00:00Z"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `integer` | ID del asset (mismo que en `asset_ids`) |
| `share_url` | `string` | URL absoluta HTTPS, abrible sin autenticación |
| `expires_at` | `string` (ISO 8601) | Opcional pero recomendado; misma expiración que la firma |

**Orden:** puede coincidir con `asset_ids` o no; la app móvil hace match por `id`.

**URLs faltantes:** si un `asset_id` no existe o no pertenece al proyecto, devolver **422** con el listado de errores (no devolver 200 omitiendo IDs silenciosamente).

#### Errores

| HTTP | Cuándo | Cuerpo ejemplo |
|------|--------|----------------|
| 401 | Sin token o token inválido | `{ "message": "No autenticado." }` |
| 403 | Asesor sin permiso para ver el proyecto | `{ "message": "No autorizado." }` |
| 404 | Proyecto no existe | `{ "message": "No encontrado." }` |
| 422 | Validación (`asset_ids` vacío, IDs inválidos, > límite) | `{ "message": "...", "errors": { "asset_ids": ["..."] } }` |
| 405 | Método no permitido | Solo si no se implementa POST |

La app móvil trata **404** y **405** en este endpoint como “no implementado” y usa el fallback de adjuntos; cualquier otro error se propaga al usuario.

---

### 3.2 Descargar o ver el archivo (ruta pública firmada)

La `share_url` debe apuntar a una ruta **sin middleware `auth:sanctum`**, protegida solo por **firma + expiración**.

#### Variante recomendada: URL firmada de Laravel

```
GET /api/v1/cazador/shared/assets/{asset}
    ?expires={unix_timestamp}
    &signature={hmac}
```

Ejemplo completo:

```
https://inmopro.laravel.cloud/api/v1/cazador/shared/assets/9?expires=1717000000&signature=7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

Implementación sugerida en Laravel:

```php
URL::temporarySignedRoute(
    'cazador.shared-assets.show',
    now()->addHours(48),
    ['asset' => $asset->id]
);
```

El controlador debe:

1. Laravel valida automáticamente `signature` y `expires` (middleware `signed` o validación manual).
2. Cargar el `ProjectAsset` por ID.
3. Opcional: comprobar que el asset sigue activo / no fue eliminado.
4. Servir el archivo desde disco o storage (S3, etc.).

#### Respuesta exitosa — HTTP 200

Headers recomendados:

| Tipo de asset | `Content-Type` | `Content-Disposition` |
|---------------|----------------|------------------------|
| Imagen (`image/jpeg`, `image/png`, `image/webp`) | MIME real | `inline; filename="fachada.jpg"` |
| PDF | `application/pdf` | `inline; filename="plano.pdf"` (o `attachment` si se prefiere forzar descarga) |
| Otros documentos | MIME real | `attachment; filename="contrato.docx"` |

Incluir si aplica:

- `Content-Length`
- `Cache-Control: private, max-age=3600` (no cache público agresivo en CDN sin considerar expiración de firma)

#### Errores de la ruta pública

| HTTP | Cuándo |
|------|--------|
| 403 | Firma inválida o manipulada |
| 404 | Asset no existe o archivo físico no encontrado |
| 410 | Enlace expirado (opcional; 403 también es aceptable) |

---

## 4. Reglas de seguridad

### 4.1 Principios

1. **Separación de rutas:** `download` (asesor, Bearer) vs `shared/assets` (cliente, firma).
2. **Principio de mínimo privilegio:** el enlace solo autoriza **un asset** (o un payload firmado acotado a `project_id` + `asset_id`).
3. **Expiración obligatoria:** TTL recomendado **24–72 horas** (WhatsApp; el cliente puede abrir el enlace días después).
4. **HTTPS obligatorio** en producción.
5. **No reutilizar** el token Sanctum del asesor en URLs compartidas.

### 4.2 Validaciones en `POST share-links`

- Usuario autenticado y activo.
- Policy / permiso: el asesor puede ver el proyecto `{project}`.
- Cada `asset_id`:
  - Existe en BD.
  - `project_id` del asset === `{project}` de la URL.
  - No pertenece a otro proyecto (rechazar con 422).
- Rate limiting sugerido: p. ej. 60 requests / minuto por usuario para evitar abuso de generación de enlaces.

### 4.3 Validaciones en `GET shared/assets`

- Verificar firma HMAC con `APP_KEY` (comportamiento estándar de `signed` routes).
- Rechazar si `expires` < `now()`.
- No aceptar parámetros extra que cambien el asset sin invalidar la firma.
- Opcional: invalidar enlaces si el asset se elimina (404 aunque la firma sea válida).

### 4.4 Auditoría (recomendado)

Registrar en log o tabla:

| Campo | Ejemplo |
|-------|---------|
| `user_id` | ID del asesor |
| `project_id` | 3 |
| `asset_ids` | [9, 10, 11] |
| `expires_at` | timestamp |
| `ip` | IP del request |
| `created_at` | datetime |

Útil para soporte y detección de abuso.

### 4.5 Almacenamiento en S3 (si aplica)

Alternativa a servir desde Laravel:

```php
Storage::disk('s3')->temporaryUrl($path, now()->addHours(48));
```

La `share_url` devuelta tendría host distinto al API (p. ej. `bucket.s3.amazonaws.com`). La app móvil lo trata como **enlace público** automáticamente (host ≠ host del API).

Asegurar que la URL temporal de S3 incluya parámetros de firma (`X-Amz-Signature`, `X-Amz-Algorithm`, etc.) — la app también los reconoce como públicos.

---

## 5. Integración con la app móvil

### 5.1 Código cliente existente

**Endpoint:**

```typescript
// src/api/endpoints/catalog.ts
POST projects/${projectId}/assets/share-links
body: { asset_ids: assetIds }
```

**Flujo WhatsApp:**

```typescript
// src/lib/shareProjectAssetsWhatsApp.ts
1. resolveAssetShareItems() → llama share-links
2. Si hay data → usa share_url de cada item
3. canShareAssetsAsPublicLinks() → todas las URLs deben ser "públicas"
4. Si sí → un mensaje WhatsApp con enlaces
5. Si no → fallback: descarga con Bearer + Share nativo por archivo
```

### 5.2 Criterio “URL pública” en la app

La función `isPublicShareUrl(url)` considera el enlace **abrible sin login** si:

| Condición | Ejemplo |
|-----------|---------|
| Host distinto al de `EXPO_PUBLIC_API_BASE_URL` | CDN, S3 |
| Mismo host + query `signature` **y** `expires` | Ruta firmada Laravel |
| Mismo host + firma AWS | `X-Amz-Signature`, `X-Amz-Algorithm` |

**Inválido para WhatsApp** (sigue el fallback):

```
https://inmopro.laravel.cloud/api/v1/cazador/projects/3/assets/9/download
```

(sin `signature` ni `expires`)

### 5.3 Formato exacto esperado de `share_url`

Para que la app use **enlaces en un solo mensaje**, cada `share_url` del POST debe cumplir `isPublicShareUrl()`.

**Ejemplo válido (mismo host, firmado):**

```
https://inmopro.laravel.cloud/api/v1/cazador/shared/assets/9?expires=1717000000&signature=...
```

**Ejemplo válido (S3):**

```
https://my-bucket.s3.amazonaws.com/projects/3/fachada.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...
```

---

## 6. Modelo de datos (referencia)

Ajustar nombres a tu esquema real. Conceptualmente:

```
projects
  id, name, ...

project_assets  (o tabla equivalente)
  id
  project_id  → FK projects
  kind        → 'image' | 'document'
  title
  file_name
  mime_type
  file_size
  disk / path  → ruta en storage
  deleted_at   → opcional soft delete
```

El endpoint `share-links` no debe exponer `disk` ni `path` internos en la respuesta JSON.

---

## 7. Implementación sugerida en Laravel

### 7.1 Rutas (`routes/api.php` o grupo `cazador`)

```php
// Autenticadas (Sanctum)
Route::middleware('auth:sanctum')->prefix('v1/cazador')->group(function () {
    Route::post(
        'projects/{project}/assets/share-links',
        [ProjectAssetShareLinkController::class, 'store']
    )->name('cazador.projects.assets.share-links');
});

// Públicas (solo firma)
Route::prefix('v1/cazador')->group(function () {
    Route::get(
        'shared/assets/{asset}',
        [SharedProjectAssetController::class, 'show']
    )
        ->middleware('signed')
        ->name('cazador.shared-assets.show');
});
```

### 7.2 Controlador `ProjectAssetShareLinkController@store`

Pseudológica:

```
1. Resolver Project $project (404 si no existe)
2. authorize('view', $project)
3. Validar request: asset_ids required, array, min:1, max:20
4. Cargar assets where id in asset_ids and project_id = $project->id
5. Si count(assets) != count(asset_ids) → 422
6. Para cada asset:
     share_url = URL::temporarySignedRoute('cazador.shared-assets.show', $ttl, ['asset' => $asset->id])
     expires_at = now()->add($ttl)
7. return response()->json(['data' => [...]])
```

### 7.3 Controlador `SharedProjectAssetController@show`

Pseudológica:

```
1. (middleware signed ya validó firma y expires)
2. $asset = ProjectAsset::findOrFail($assetId)
3. if (!Storage::exists($asset->path)) abort(404)
4. return Storage::response($asset->path, $asset->file_name, [
     'Content-Type' => $asset->mime_type,
     'Content-Disposition' => inline vs attachment según kind/mime,
   ])
```

### 7.4 Policy

```php
// ProjectPolicy
public function view(User $user, Project $project): bool
{
    // Regla de negocio: asesor asignado al proyecto, mismo tenant, etc.
}
```

### 7.5 TTL configurable

```php
// config/cazador.php
'asset_share_link_ttl_hours' => env('CAZADOR_ASSET_SHARE_TTL_HOURS', 48),
```

---

## 8. Criterios de aceptación (checklist)

### 8.1 Generación (`POST share-links`)

- [ ] Con Bearer válido y `asset_ids` correctos → **200** y un `share_url` por ID.
- [ ] Sin Bearer → **401** `{ "message": "No autenticado." }`.
- [ ] Proyecto inexistente → **404**.
- [ ] `asset_ids` vacío → **422**.
- [ ] Asset de otro proyecto en la lista → **422** (no 200 parcial).
- [ ] Asesor sin permiso → **403**.
- [ ] Más de N assets (límite) → **422**.

### 8.2 Consumo (`GET shared/assets`)

- [ ] Abrir `share_url` en navegador incógnito **sin** Bearer → archivo visible o descargable.
- [ ] Imagen JPEG/PNG se muestra inline en el navegador móvil.
- [ ] Enlace expirado → **403** o **410** (no 200).
- [ ] Cambiar un carácter de `signature` → **403**.
- [ ] Cambiar `asset` en la path sin regenerar firma → **403**.
- [ ] Asset eliminado después de generar enlace → **404** (comportamiento documentado).

### 8.3 Integración WhatsApp / app móvil

- [ ] App llama POST y recibe `share_url` firmadas.
- [ ] Al compartir por WhatsApp, **un solo mensaje** con lista de enlaces (sin fallback de adjuntos múltiples).
- [ ] Cliente abre enlace desde WhatsApp en Android/iOS → ve imagen o descarga documento.
- [ ] `GET projects/{id}/assets/.../download` sigue requiriendo Bearer (sin regresión).

### 8.4 Seguridad

- [ ] No se acepta `?token=` Sanctum en rutas públicas.
- [ ] No se listan assets de otros proyectos por enumeración de ID sin firma.
- [ ] Enlaces expiran en el TTL configurado.

---

## 9. Ejemplos de prueba manual

### 9.1 Generar enlaces (curl)

```bash
curl -X POST "https://inmopro.laravel.cloud/api/v1/cazador/projects/3/assets/share-links" \
  -H "Authorization: Bearer YOUR_SANCTUM_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"asset_ids":[9,10]}'
```

### 9.2 Abrir enlace compartido (sin auth)

```bash
curl -I "https://inmopro.laravel.cloud/api/v1/cazador/shared/assets/9?expires=1717000000&signature=..."
```

Esperado: `HTTP/2 200` y `Content-Type: image/jpeg` (o el MIME correspondiente).

### 9.3 Enlace expirado

Repetir curl con la misma URL después del TTL → `403` o `410`.

---

## 10. Preguntas frecuentes

### ¿Debemos cambiar `download_url` en `GET /projects/{id}`?

No es obligatorio para la Opción A. `download_url` puede seguir siendo la ruta protegida para la app del asesor. Solo el flujo `share-links` devuelve `share_url` públicas.

Opcionalmente, en el futuro, se puede añadir `share_url` en el serializador de `ProjectAsset` regenerando la misma lógica firmada (Opción B); la app ya lee ese campo si existe.

### ¿Un solo enlace para varios archivos?

No. Un `share_url` por asset. La app arma un mensaje con varias líneas (título + URL por archivo).

### ¿Revocar enlaces antes de expirar?

Laravel signed URLs no se revocan por defecto. Opciones: soft-delete del asset (404 en GET), tabla de tokens revocados, o TTL corto (24 h).

### ¿CORS en la ruta pública?

Si solo se abre en navegador/WhatsApp, CORS no suele ser crítico. Si hay visor web embebido, configurar `Access-Control-Allow-Origin` según necesidad.

---

## 11. Resumen ejecutivo

| Qué | Detalle |
|-----|---------|
| **Problema** | `download_url` requiere Bearer; WhatsApp muestra "No autenticado." |
| **Solución** | `POST .../share-links` (asesor) + `GET .../shared/assets/{id}` firmado (cliente) |
| **TTL** | 24–72 h recomendado |
| **App móvil** | Ya implementada; al existir el endpoint mejora UX de compartir por WhatsApp |
| **Seguridad** | Firma + expiración; sin tokens Sanctum en URL; policy por proyecto |

---

## 12. Referencias en el repo móvil

| Archivo | Rol |
|---------|-----|
| `src/api/endpoints/catalog.ts` | `createProjectAssetShareLinks()` |
| `src/lib/shareProjectAssetsWhatsApp.ts` | Orquestación WhatsApp |
| `src/lib/projectAssetLinks.ts` | `isPublicShareUrl()`, mensaje con enlaces |
| `src/types/api.ts` | `ProjectAsset`, `share_url?` |
| `src/features/catalog/ProjectAssetSharePanel.tsx` | UI compartir imágenes/documentos |

---

*Documento generado para alinear backend Laravel con la app móvil Cazador. Versión: Opción A únicamente.*
