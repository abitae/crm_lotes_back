<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Project360ShareLink;
use App\Models\Inmopro\Project360Tour;
use App\Models\Inmopro\ProjectAsset;
use App\Models\User;
use Illuminate\Support\Facades\URL;

class Project360ShareService
{
    public function create(Project360Tour $tour, User $creator, ?string $label): Project360ShareLink
    {
        return $tour->shareLinks()->create([
            'created_by' => $creator->id,
            'label' => filled($label) ? trim((string) $label) : null,
        ]);
    }

    public function tourUrl(Project360ShareLink $shareLink): string
    {
        return URL::signedRoute('public.project-360.show', ['shareLink' => $shareLink]);
    }

    public function panoramaUrl(Project360ShareLink $shareLink, ProjectAsset $panorama): string
    {
        return URL::signedRoute('public.project-360.panoramas.show', [
            'shareLink' => $shareLink,
            'panorama' => $panorama,
        ]);
    }

    public function ensureAccessible(Project360ShareLink $shareLink): void
    {
        $shareLink->loadMissing('tour.project');

        abort_unless(
            $shareLink->revoked_at === null
            && $shareLink->tour?->project?->is_active === true,
            404,
        );
    }

    /** @return array<string, mixed> */
    public function payload(Project360ShareLink $shareLink): array
    {
        $shareLink->loadMissing('creator');

        return [
            'id' => $shareLink->id,
            'label' => $shareLink->label,
            'url' => $this->tourUrl($shareLink),
            'created_by' => $shareLink->creator?->name,
            'last_accessed_at' => $shareLink->last_accessed_at?->toIso8601String(),
            'revoked_at' => $shareLink->revoked_at?->toIso8601String(),
        ];
    }
}
