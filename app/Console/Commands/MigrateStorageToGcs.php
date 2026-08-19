<?php

namespace App\Console\Commands;

use App\Models\AppBranding;
use App\Models\Inmopro\AdvisorProfileDocument;
use App\Models\Inmopro\LotPreReservation;
use App\Models\Inmopro\LotTransferConfirmation;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use App\Support\FileStorage;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class MigrateStorageToGcs extends Command
{
    protected $signature = 'storage:migrate-to-gcs
                            {--dry-run : Simular sin copiar ni actualizar BD}
                            {--verify : Verificar en GCS sin volver a copiar}
                            {--delete-local : Eliminar originales solo después de verificar}
                            {--manifest=gcs-migration/manifest.json : Manifiesto en disco local}';

    protected $description = 'Migra archivos persistentes al disco único GCS con manifiesto y verificación SHA-256';

    /** @var array<string, array<string, int|string>> */
    private array $manifest = [];

    public function handle(): int
    {
        if (! filled(config('filesystems.disks.gcs.bucket'))) {
            $this->error('Defina GOOGLE_CLOUD_STORAGE_BUCKET antes de migrar.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $verifyOnly = (bool) $this->option('verify');
        $deleteLocal = (bool) $this->option('delete-local');
        $this->loadManifest();
        $copied = 0;
        $verified = 0;
        $failed = 0;
        $pathChanges = [];

        foreach (['public', 'local'] as $sourceDisk) {
            $files = Storage::disk($sourceDisk)->allFiles();
            $this->info(sprintf('Disco %s: %d archivos.', $sourceDisk, count($files)));

            foreach ($files as $sourcePath) {
                if ($sourceDisk === 'local' && $sourcePath === $this->manifestPath()) {
                    continue;
                }

                $destinationPath = $this->destinationPath($sourceDisk, $sourcePath);
                $key = $sourceDisk.':'.$sourcePath;

                try {
                    if ($dryRun) {
                        $this->line("[dry-run] {$sourceDisk}:{$sourcePath} → gcs:{$destinationPath}");
                        $copied++;

                        continue;
                    }

                    $sourceHash = $this->checksum($sourceDisk, $sourcePath);
                    $sourceSize = Storage::disk($sourceDisk)->size($sourcePath);
                    $alreadyVerified = $this->matchesDestination($destinationPath, $sourceHash, $sourceSize);

                    if (! $alreadyVerified && ! $verifyOnly) {
                        $this->copy($sourceDisk, $sourcePath, $destinationPath);
                        $copied++;
                    }

                    if (! $this->matchesDestination($destinationPath, $sourceHash, $sourceSize)) {
                        throw new RuntimeException('La verificación de integridad no coincide.');
                    }

                    $verified++;
                    $pathChanges[$sourcePath] = $destinationPath;
                    $this->manifest[$key] = [
                        'source_disk' => $sourceDisk,
                        'source_path' => $sourcePath,
                        'destination_path' => $destinationPath,
                        'sha256' => $sourceHash,
                        'size' => $sourceSize,
                        'status' => 'verified',
                    ];
                    $this->saveManifest();

                    if ($deleteLocal) {
                        Storage::disk($sourceDisk)->delete($sourcePath);
                    }
                } catch (\Throwable $exception) {
                    $failed++;
                    $this->manifest[$key] = [
                        'source_disk' => $sourceDisk,
                        'source_path' => $sourcePath,
                        'destination_path' => $destinationPath,
                        'sha256' => '',
                        'size' => 0,
                        'status' => 'failed: '.mb_substr($exception->getMessage(), 0, 300),
                    ];
                    $this->saveManifest();
                    $this->warn("Fallo {$sourceDisk}/{$sourcePath}: {$exception->getMessage()}");
                }
            }
        }

        $updatedRecords = $dryRun ? 0 : $this->updateStoredPaths($pathChanges);

        $this->newLine();
        $this->info("Archivos copiados: {$copied}");
        $this->info("Archivos verificados: {$verified}");
        $this->info("Registros normalizados: {$updatedRecords}");

        if ($failed > 0) {
            $this->warn("Archivos con error: {$failed}");

            return self::FAILURE;
        }

        $this->info($dryRun
            ? 'Ejecución en modo dry-run: no se aplicaron cambios.'
            : 'Migración completada y verificada. Configure FILESYSTEM_DISK=gcs en producción.');

        return self::SUCCESS;
    }

    private function destinationPath(string $sourceDisk, string $path): string
    {
        $path = FileStorage::normalizePath($path);

        return match (true) {
            str_starts_with($path, 'openai-cazador/knowledge/') => 'knowledge/openai-cazador/'.basename($path),
            str_starts_with($path, 'cazador/pre-reservations/') => 'pre-reservations/cazador/'.basename($path),
            str_starts_with($path, 'inmopro/lot-pre-reservations/') => 'pre-reservations/inmopro/'.basename($path),
            str_starts_with($path, 'inmopro/lot-transfer-confirmations/') => 'transfer-confirmations/'.basename($path),
            $this->isKnownPersistentPath($path) => $path,
            default => 'legacy-unclassified/'.$sourceDisk.'/'.$path,
        };
    }

    private function isKnownPersistentPath(string $path): bool
    {
        foreach (['projects/', 'branding/', 'advisors/', 'knowledge/', 'pre-reservations/', 'transfer-confirmations/'] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function copy(string $sourceDisk, string $sourcePath, string $destinationPath): void
    {
        $stream = Storage::disk($sourceDisk)->readStream($sourcePath);
        if ($stream === false) {
            throw new RuntimeException('No se pudo leer el archivo de origen.');
        }

        try {
            if (! Storage::disk('gcs')->writeStream($destinationPath, $stream)) {
                throw new RuntimeException('No se pudo escribir en GCS.');
            }
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    private function matchesDestination(string $path, string $hash, int $size): bool
    {
        return Storage::disk('gcs')->exists($path)
            && Storage::disk('gcs')->size($path) === $size
            && $this->checksum('gcs', $path) === $hash;
    }

    private function checksum(string $disk, string $path): string
    {
        $stream = Storage::disk($disk)->readStream($path);
        if ($stream === false) {
            throw new RuntimeException('No se pudo leer el archivo para verificarlo.');
        }

        try {
            $hash = hash_init('sha256');
            hash_update_stream($hash, $stream);

            return hash_final($hash);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    /** @param array<string, string> $pathChanges */
    private function updateStoredPaths(array $pathChanges): int
    {
        return $this->normalizeModelPaths(Project::class, 'image_portada', $pathChanges)
            + $this->normalizeModelPaths(ProjectAsset::class, 'file_path', $pathChanges)
            + $this->normalizeModelPaths(AppBranding::class, 'logo_path', $pathChanges)
            + $this->normalizeModelPaths(AppBranding::class, 'favicon_path', $pathChanges)
            + $this->normalizeModelPaths(AdvisorProfileDocument::class, 'file_path', $pathChanges)
            + $this->normalizeModelPaths(LotPreReservation::class, 'voucher_path', $pathChanges)
            + $this->normalizeModelPaths(LotTransferConfirmation::class, 'evidence_path', $pathChanges)
            + $this->normalizeModelPaths(OpenAiCazadorKnowledgeDocument::class, 'storage_path', $pathChanges);
    }

    /**
     * @param  class-string<Model>  $model
     * @param  array<string, string>  $pathChanges
     */
    private function normalizeModelPaths(string $model, string $column, array $pathChanges): int
    {
        $updated = 0;

        $model::query()
            ->whereNotNull($column)
            ->eachById(function (Model $record) use ($column, $pathChanges, &$updated): void {
                $stored = (string) $record->getAttribute($column);
                $normalized = FileStorage::pathFromStored($stored);
                if ($normalized === null) {
                    return;
                }

                $destination = $pathChanges[$normalized] ?? $normalized;
                if ($stored === $destination) {
                    return;
                }

                $record->forceFill([$column => $destination])->save();
                $updated++;
            });

        return $updated;
    }

    private function manifestPath(): string
    {
        return FileStorage::normalizePath((string) $this->option('manifest'));
    }

    private function loadManifest(): void
    {
        $disk = Storage::disk('local');
        if (! $disk->exists($this->manifestPath())) {
            return;
        }

        $decoded = json_decode((string) $disk->get($this->manifestPath()), true);
        if (is_array($decoded)) {
            $this->manifest = $decoded;
        }
    }

    private function saveManifest(): void
    {
        Storage::disk('local')->put(
            $this->manifestPath(),
            json_encode($this->manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        );
    }
}
