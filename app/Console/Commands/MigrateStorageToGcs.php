<?php

namespace App\Console\Commands;

use App\Models\Inmopro\Project;
use App\Support\FileStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateStorageToGcs extends Command
{
    protected $signature = 'storage:migrate-to-gcs
                            {--dry-run : Simular sin copiar ni actualizar BD}
                            {--delete-local : Eliminar archivos locales tras migrar (solo con disco destino gcs)}';

    protected $description = 'Copia archivos de discos public/local a GCS y normaliza rutas en la base de datos';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $deleteLocal = (bool) $this->option('delete-local');
        $targetDisk = 'gcs';

        if (! array_key_exists($targetDisk, config('filesystems.disks', []))) {
            $this->error('El disco gcs no está configurado en config/filesystems.php.');

            return self::FAILURE;
        }

        $bucket = config('filesystems.disks.gcs.bucket');
        if (! filled($bucket)) {
            $this->error('Defina GOOGLE_CLOUD_STORAGE_BUCKET antes de migrar.');

            return self::FAILURE;
        }

        $sourceDisks = ['public', 'local'];
        $copied = 0;
        $failed = 0;

        foreach ($sourceDisks as $sourceDisk) {
            if (! Storage::disk($sourceDisk)->exists('.')) {
                continue;
            }

            $files = Storage::disk($sourceDisk)->allFiles();

            $this->info(sprintf('Disco %s: %d archivos.', $sourceDisk, count($files)));

            foreach ($files as $path) {
                if ($dryRun) {
                    $this->line("[dry-run] {$sourceDisk} → gcs: {$path}");
                    $copied++;

                    continue;
                }

                try {
                    $stream = Storage::disk($sourceDisk)->readStream($path);

                    if ($stream === false) {
                        throw new \RuntimeException('No se pudo leer el archivo.');
                    }

                    $written = Storage::disk($targetDisk)->writeStream($path, $stream);

                    if (is_resource($stream)) {
                        fclose($stream);
                    }

                    if ($written === false) {
                        throw new \RuntimeException('No se pudo escribir en GCS.');
                    }

                    if ($deleteLocal) {
                        Storage::disk($sourceDisk)->delete($path);
                    }

                    $copied++;
                } catch (\Throwable $e) {
                    $failed++;
                    $this->warn("Fallo {$sourceDisk}/{$path}: {$e->getMessage()}");
                }
            }
        }

        $updatedProjects = $this->normalizeProjectPortadas($dryRun);

        $this->newLine();
        $this->info("Archivos copiados: {$copied}");
        $this->info("Proyectos con portada normalizada: {$updatedProjects}");

        if ($failed > 0) {
            $this->warn("Archivos con error: {$failed}");

            return self::FAILURE;
        }

        if ($dryRun) {
            $this->comment('Ejecución en modo dry-run: no se aplicaron cambios.');
        } else {
            $this->info('Migración completada. Configure FILESYSTEM_DISK=gcs y CAZADOR_PROJECT_ASSET_DISK=gcs en .env.');
        }

        return self::SUCCESS;
    }

    private function normalizeProjectPortadas(bool $dryRun): int
    {
        $updated = 0;

        Project::query()
            ->whereNotNull('image_portada')
            ->orderBy('id')
            ->each(function (Project $project) use ($dryRun, &$updated): void {
                $stored = (string) $project->image_portada;
                $path = FileStorage::pathFromStored($stored);

                if ($path === null || $path === $stored) {
                    return;
                }

                if ($dryRun) {
                    $this->line("[dry-run] project {$project->id} portada: {$stored} → {$path}");
                    $updated++;

                    return;
                }

                $project->update(['image_portada' => $path]);
                $updated++;
            });

        return $updated;
    }
}
