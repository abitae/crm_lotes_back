<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectFlatPolygon extends Model
{
    protected $table = 'project_flat_polygons';

    /** @var list<string> */
    protected $fillable = [
        'project_id',
        'lot_id',
        'title',
        'description',
        'vertices',
        'color',
        'hover_color',
        'opacity',
    ];

    protected function casts(): array
    {
        return [
            'vertices' => 'array',
            'opacity' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<Lot, $this>
     */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }
}
