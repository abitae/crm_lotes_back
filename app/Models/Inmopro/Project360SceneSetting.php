<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project360SceneSetting extends Model
{
    protected $table = 'project_360_scene_settings';

    /** @var list<string> */
    protected $fillable = [
        'project_360_tour_id',
        'panorama_id',
        'floor_plan_id',
        'initial_yaw',
        'initial_pitch',
        'plan_x',
        'plan_y',
    ];

    protected function casts(): array
    {
        return [
            'initial_yaw' => 'float',
            'initial_pitch' => 'float',
            'plan_x' => 'float',
            'plan_y' => 'float',
        ];
    }

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Project360Tour::class, 'project_360_tour_id');
    }

    public function panorama(): BelongsTo
    {
        return $this->belongsTo(ProjectAsset::class, 'panorama_id');
    }

    public function floorPlan(): BelongsTo
    {
        return $this->belongsTo(ProjectAsset::class, 'floor_plan_id');
    }
}
