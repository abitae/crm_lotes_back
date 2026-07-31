<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreProject360ShareLinkRequest;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\Project360ShareLink;
use App\Services\Inmopro\Project360ShareService;
use App\Services\Inmopro\Project360TourService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class Project360ShareLinkController extends Controller
{
    public function __construct(
        private Project360TourService $tourService,
        private Project360ShareService $shareService,
    ) {}

    public function store(StoreProject360ShareLinkRequest $request, Project $project): RedirectResponse
    {
        if (! $project->panoramas()->where('is_active', true)->exists()) {
            throw ValidationException::withMessages([
                'label' => 'Añade al menos un panorama antes de compartir el tour.',
            ]);
        }

        $tour = $this->tourService->tourForProject($project);
        $this->shareService->create($tour, $request->user(), $request->validated('label'));

        return back()->with('success', 'Enlace público creado correctamente.');
    }

    public function revoke(Project $project, Project360ShareLink $shareLink): RedirectResponse
    {
        $shareLink->loadMissing('tour');
        abort_unless($shareLink->tour?->project_id === $project->id, 404);

        if ($shareLink->revoked_at === null) {
            $shareLink->update(['revoked_at' => now()]);
        }

        return back()->with('success', 'Enlace público revocado correctamente.');
    }
}
