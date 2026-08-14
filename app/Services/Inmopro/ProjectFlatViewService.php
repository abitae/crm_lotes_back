<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Models\Inmopro\ProjectFlatPolygon;
use Illuminate\Validation\ValidationException;

class ProjectFlatViewService
{
    public function __construct(
        private ProjectLocationMapsResolver $locationResolver,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function payload(Project $project): array
    {
        $polygons = $project->flatPolygons()
            ->with(['lot.status'])
            ->orderBy('id')
            ->get();

        return [
            'polygons' => $polygons
                ->map(fn (ProjectFlatPolygon $polygon): array => $this->polygonPayload($polygon))
                ->values()
                ->all(),
            'maps_center' => $this->locationResolver->resolveCoordinates($project->location),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function polygonPayload(ProjectFlatPolygon $polygon): array
    {
        $polygon->loadMissing('lot.status');
        $lot = $polygon->lot;

        return [
            'id' => $polygon->id,
            'lot_id' => $lot?->id,
            'lot' => $lot ? [
                'id' => $lot->id,
                'block' => $lot->block,
                'number' => (string) $lot->number,
                'area' => $lot->area,
                'price' => $lot->price,
                'status' => $lot->status ? [
                    'name' => $lot->status->name,
                    'code' => $lot->status->code,
                    'color' => $lot->status->color ?: '#94a3b8',
                ] : null,
            ] : null,
            'title' => $polygon->title,
            'description' => $polygon->description,
            'vertices' => $polygon->vertices,
            'color' => $polygon->color,
            'hover_color' => $polygon->hover_color,
            'opacity' => $polygon->opacity,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function polygonLot(
        Project $project,
        array $data,
        ?ProjectFlatPolygon $currentPolygon = null,
    ): ?Lot {
        $lotId = $data['lot_id'] ?? null;

        if ($lotId === null || $lotId === '') {
            return null;
        }

        $lot = $project->lots()->with('status')->find((int) $lotId);

        if (! $lot) {
            throw ValidationException::withMessages([
                'lot_id' => 'El lote seleccionado no pertenece al proyecto.',
            ]);
        }

        $alreadyLinked = $project->flatPolygons()
            ->where('lot_id', $lot->id)
            ->when(
                $currentPolygon,
                fn ($query) => $query->whereKeyNot($currentPolygon->id),
            )
            ->exists();

        if ($alreadyLinked) {
            throw ValidationException::withMessages([
                'lot_id' => 'Este lote ya está ligado a otro polígono de la vista plana.',
            ]);
        }

        return $lot;
    }

    public function ensurePolygonForProject(Project $project, ProjectFlatPolygon $polygon): void
    {
        abort_unless($polygon->project_id === $project->id, 404);
    }

    public function polygonTitle(?Lot $lot, mixed $submitted): string
    {
        $title = trim((string) $submitted);

        if ($title !== '') {
            return $title;
        }

        if ($lot) {
            return 'Lote '.$lot->number;
        }

        return '';
    }
}
