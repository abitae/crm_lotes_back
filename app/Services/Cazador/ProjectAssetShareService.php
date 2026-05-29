<?php

namespace App\Services\Cazador;

use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectAsset;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
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
     * @return array{id: int, share_url: string, expires_at: string}
     */
    public function buildShareLinkPayload(ProjectAsset $asset, ?CarbonInterface $expiresAt = null): array
    {
        $expiresAt ??= now()->addHours($this->ttlHours());

        return [
            'id' => $asset->id,
            'share_url' => URL::temporarySignedRoute(
                'api.v1.cazador.shared-assets.show',
                $expiresAt,
                ['asset' => $asset->id],
                absolute: true,
            ),
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    public function streamSharedAsset(ProjectAsset $asset): StreamedResponse
    {
        abort_unless($asset->is_active, 404);

        $disk = ProjectAsset::storageDisk();

        abort_unless(Storage::disk($disk)->exists($asset->file_path), 404);

        $disposition = $this->contentDisposition($asset);

        return Storage::disk($disk)->response(
            $asset->file_path,
            $asset->file_name,
            [
                'Content-Type' => $asset->mime_type,
                'Content-Disposition' => $disposition,
                'Cache-Control' => 'private, max-age=3600',
            ],
        );
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
