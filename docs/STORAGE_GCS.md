# Almacenamiento en Google Cloud Storage

## Configuración

1. Crear bucket GCS con acceso público de lectura (o CDN delante).
2. Crear cuenta de servicio con rol **Storage Object Admin**.
3. Descargar JSON de credenciales y guardarlo fuera del repositorio (por ejemplo `storage/app/gcs-key.json`).
4. Variables en `.env`:

```env
FILESYSTEM_DISK=gcs
CAZADOR_PROJECT_ASSET_DISK=gcs
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto
GOOGLE_CLOUD_STORAGE_BUCKET=tu-bucket
GOOGLE_CLOUD_KEY_FILE=/ruta/absoluta/gcs-key.json
# Opcional: CDN o dominio custom
# GOOGLE_CLOUD_STORAGE_API_URI=https://cdn.ejemplo.com
```

En local puede usarse `FILESYSTEM_DISK=public` sin credenciales GCP.

## Migración desde disco local

```bash
php artisan storage:migrate-to-gcs --dry-run
php artisan storage:migrate-to-gcs
# Tras validar:
php artisan storage:migrate-to-gcs --delete-local
```

El comando copia archivos de `public` y `local` al bucket y normaliza `projects.image_portada` a ruta relativa.

## Subidas grandes (vídeo)

Ajustar en PHP/servidor web, por ejemplo:

- `upload_max_filesize=128M`
- `post_max_size=128M`

Límite de validación CRM: 100 MB por vídeo (`video_files.*`).

## CORS

Si el front del catálogo consume URLs directas del bucket desde otro dominio, configurar CORS en GCS para método `GET`.
