# Almacenamiento en Google Cloud Storage

En local el disco es `public` (`FILESYSTEM_DISK=public`, `php artisan storage:link`), sin credenciales GCP. En producción usar `gcs`.

## Configuración (producción)

1. Crear bucket GCS con acceso público de lectura (o CDN delante).
2. Crear cuenta de servicio con rol **Storage Object Admin**.
3. Copiar los campos del JSON de la cuenta de servicio a variables de entorno (no subir el JSON al repositorio).
4. Variables en producción:

```env
FILESYSTEM_DISK=gcs
CAZADOR_PROJECT_ASSET_DISK=gcs
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto
GOOGLE_CLOUD_STORAGE_BUCKET=tu-bucket
GOOGLE_CLOUD_STORAGE_PATH_PREFIX=lotes
GOOGLE_CLOUD_ACCOUNT_TYPE=service_account
GOOGLE_CLOUD_PRIVATE_KEY_ID=
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=
GOOGLE_CLOUD_CLIENT_CERT_URL=
```

`GOOGLE_CLOUD_PRIVATE_KEY` debe usar `\n` literales entre comillas en `.env`. En GitHub Actions / Laravel Cloud, define cada valor como secret. `CAZADOR_PROJECT_ASSET_DISK` puede omitirse: hereda `FILESYSTEM_DISK`.

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
