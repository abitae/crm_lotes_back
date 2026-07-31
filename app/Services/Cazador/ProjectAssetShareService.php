<?php

namespace App\Services\Cazador;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

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
            ->where('kind', '!=', ProjectAsset::KIND_PANORAMA)
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
        if ($asset->path === '') {
            return false;
        }

        return Storage::disk($asset->disk)->exists($asset->path);
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
}
