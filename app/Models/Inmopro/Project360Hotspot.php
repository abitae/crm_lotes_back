<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project360Hotspot extends Model
{
    protected $table = 'project_360_hotspots';

    /** @var list<string> */
    protected $fillable = [
        'project_360_tour_id',
        'source_panorama_id',
        'target_panorama_id',
        'label',
        'yaw',
        'pitch',
        'color',
        'hover_color',
        'text_color',
        'size',
        'shape',
        'label_visibility',
        'pulse_enabled',
    ];

    protected function casts(): array
    {
        return [
            'yaw' => 'float',
            'pitch' => 'float',
            'size' => 'float',
            'pulse_enabled' => 'boolean',
        ];
    }

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Project360Tour::class, 'project_360_tour_id');
    }

    public function sourcePanorama(): BelongsTo
    {
        return $this->belongsTo(ProjectAsset::class, 'source_panorama_id');
    }

    public function targetPanorama(): BelongsTo
    {
        return $this->belongsTo(ProjectAsset::class, 'target_panorama_id');
    }
}
