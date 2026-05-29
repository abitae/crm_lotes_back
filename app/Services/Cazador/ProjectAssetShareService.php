<?php

namespace App\Services\Cazador;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectAssetShareService
{
    public function ttlHours(): int
    {
        return max(1, (int) config('cazador.asset_share_link_ttl_hours', 48));
    }

    public function maxAssetsPerRequest(): int
    {
        return max(1, (int) config('cazador.asset_share_link_max_assets', 20));
    }

    /**
     * @param  list<int>  $assetIds
     * @return Collection<int, ProjectAsset>
     */
    public function resolveAssetsForProject(Project $project, array $assetIds): Collection
    {
        $uniqueIds = array_values(array_unique($assetIds));

        return ProjectAsset::query()
            ->where('project_id', $project->id)
            ->where('is_active', true)
            ->whereIn('id', $uniqueIds)
            ->get();
    }

    /**
     * @param  Collection<int, ProjectAsset>  $assets
     * @return list<int>
     */
    public function missingFileAssetIds(Collection $assets): array
    {
        $missing = [];

        foreach ($assets as $asset) {
            if (! $this->fileExists($asset)) {
                $missing[] = $asset->id;
            }
        }

        return $missing;
    }

    public function fileExists(ProjectAsset $asset): bool
    {
        $path = $this->normalizedFilePath($asset);

        if ($path === '') {
            return false;
        }

        $disk = Storage::disk(ProjectAsset::storageDisk());

        if ($disk->exists($path)) {
            return true;
        }

        // Respaldo: ruta absoluta en disco public (Windows / symlinks)
        $absolute = storage_path('app/public/'.$path);

        return is_file($absolute);
    }

    /**
     * @return array{id: int, share_url: string, expires_at: string}
     */
    public function buildShareLinkPayload(ProjectAsset $asset, ?CarbonInterface $expiresAt = null): array
    {
        $expiresAt ??= now()->addHours($this->ttlHours());

        $shareUrl = $this->withShareUrlRoot(function () use ($asset, $expiresAt): string {
            return URL::temporarySignedRoute(
                'api.v1.cazador.shared-assets.show',
                $expiresAt,
                ['asset' => $asset->id],
                absolute: true,
            );
        });

        return [
            'id' => $asset->id,
            'share_url' => $shareUrl,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    public function streamSharedAsset(ProjectAsset $asset): StreamedResponse
    {
        abort_unless($asset->is_active, 404, 'Recurso no encontrado.');

        if (! $this->fileExists($asset)) {
            Log::warning('cazador.shared_asset.file_missing', [
                'asset_id' => $asset->id,
                'project_id' => $asset->project_id,
                'file_path' => $asset->file_path,
            ]);

            abort(404, 'Archivo no encontrado.');
        }

        $disk = ProjectAsset::storageDisk();
        $path = $this->normalizedFilePath($asset);
        $disposition = $this->contentDisposition($asset);

        return Storage::disk($disk)->download(
            $path,
            $asset->file_name,
            [
                'Content-Type' => $asset->mime_type,
                'Content-Disposition' => $disposition,
                'Cache-Control' => 'private, max-age=3600',
            ],
        );
    }

    private function normalizedFilePath(ProjectAsset $asset): string
    {
        return ltrim(str_replace('\\', '/', (string) $asset->file_path), '/');
    }

    /**
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    private function withShareUrlRoot(callable $callback): mixed
    {
        $root = config('cazador.asset_share_url_root');

        if (! is_string($root) || trim($root) === '') {
            return $callback();
        }

        $previous = config('app.url');
        URL::forceRootUrl(rtrim($root, '/'));

        try {
            return $callback();
        } finally {
            URL::forceRootUrl($previous);
        }
    }

    private function contentDisposition(ProjectAsset $asset): string
    {
        $filename = addcslashes($asset->file_name, '"\\');
        $mime = strtolower((string) $asset->mime_type);

        $inline = $asset->kind === 'image'
            || str_starts_with($mime, 'image/')
            || $mime === 'application/pdf';

        $type = $inline ? 'inline' : 'attachment';

        return "{$type}; filename=\"{$filename}\"";
    }
}
