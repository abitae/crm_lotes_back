<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class ProjectAssetStorageService
{
    /**
     * @return array{file_path: string, file_name: string}
     */
    public function store(Project $project, UploadedFile $file, string $kind): array
    {
        $directory = $this->directoryFor($project->id, $kind);
        $extension = $this->resolveExtension($file);
        $disks = array_values(array_unique([ProjectAsset::storageDisk(), 'public']));
        $lastError = null;

        foreach ($disks as $disk) {
            try {
                $fileName = $this->generateUniqueFileName($project->id, $kind, $extension, $directory, $disk);
                $storedPath = $file->storeAs($directory, $fileName, $disk);

                if ($storedPath !== false) {
                    return [
                        'file_path' => $storedPath,
                        'file_name' => $fileName,
                    ];
                }
            } catch (\Throwable $exception) {
                $lastError = $exception;
            }
        }

        throw new RuntimeException('No se pudo guardar el archivo del proyecto.', 0, $lastError);
    }

    public function generateStoredFileName(int $projectId, string $kind, string $extension): string
    {
        $prefix = match ($kind) {
            'document' => 'document',
            'video' => 'video',
            ProjectAsset::KIND_PANORAMA => 'panorama',
            ProjectAsset::KIND_FLOOR_PLAN => 'floor_plan',
            default => 'image',
        };
        $digits = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        return "{$prefix}_{$projectId}_{$digits}.{$extension}";
    }

    public function directoryFor(int $projectId, string $kind): string
    {
        if ($kind === ProjectAsset::KIND_FLOOR_PLAN) {
            return "projects/{$projectId}/floor-plans";
        }

        return sprintf('projects/%d/%ss', $projectId, $kind);
    }

    private function resolveExtension(UploadedFile $file): string
    {
        $extension = strtolower((string) ($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin'));

        return preg_replace('/[^a-z0-9]+/', '', $extension) ?: 'bin';
    }

    private function generateUniqueFileName(
        int $projectId,
        string $kind,
        string $extension,
        string $directory,
        string $disk,
    ): string {
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $fileName = $this->generateStoredFileName($projectId, $kind, $extension);

            if (! Storage::disk($disk)->exists($directory.'/'.$fileName)) {
                return $fileName;
            }
        }

        throw new RuntimeException('No se pudo generar un nombre de archivo único para el asset.');
    }
}
