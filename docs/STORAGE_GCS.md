# Almacenamiento en Google Cloud Storage

En local el disco es `public` (`FILESYSTEM_DISK=public`, `php artisan storage:link`). En producción todos los archivos persistentes usan un único disco privado `gcs`; las URLs se firman temporalmente.

## Configuración (producción)

1. Mantener el bucket sin acceso público anónimo, con acceso uniforme y borrado no definitivo.
2. Asignar a la identidad de ejecución permisos de lectura, creación, actualización y eliminación de objetos, además de capacidad para firmar URLs.
3. Preferir Application Default Credentials. Fuera de GCP, inyectar el archivo o sus campos como secretos; nunca incluir credenciales en el repositorio.
4. Variables en producción:

```env
FILESYSTEM_DISK=gcs
CAZADOR_PROJECT_ASSET_DISK=gcs
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto
GOOGLE_CLOUD_STORAGE_BUCKET=tu-bucket
GOOGLE_CLOUD_STORAGE_PATH_PREFIX=lotes
GCS_CATALOG_URL_TTL_MINUTES=60
GCS_SENSITIVE_URL_TTL_MINUTES=10
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
# Verificación independiente o reanudación:
php artisan storage:migrate-to-gcs --verify
# Tras validar y conservar respaldo durante el periodo acordado:
php artisan storage:migrate-to-gcs --delete-local
```

El comando clasifica archivos, copia desde `public` y `local`, compara tamaño y SHA-256 y mantiene un manifiesto reanudable en `storage/app/private/gcs-migration/manifest.json`. Los archivos desconocidos se copian a `legacy-unclassified/`. `--delete-local` solo borra un origen después de verificar su copia.

## Subidas grandes (vídeo)

Ajustar en PHP/servidor web, por ejemplo:

- `upload_max_filesize=128M`
- `post_max_size=128M`

Límite de validación CRM: 100 MB por vídeo (`video_files.*`).

## Entrega de archivos

Las imágenes del catálogo y branding reciben URLs firmadas por 60 minutos. Comprobantes y documentos sensibles usan 10 minutos o controladores autenticados. Las URLs son efímeras y nunca se guardan en la base de datos.

La cuenta de ejecución debe poder firmar blobs (`iam.serviceAccounts.signBlob`) cuando se usen credenciales sin clave privada local.
