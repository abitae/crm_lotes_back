<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project360Tour extends Model
{
    protected $table = 'project_360_tours';

    /** @var list<string> */
    protected $fillable = [
        'project_id',
        'start_panorama_id',
        'accent_color',
        'hotspot_color',
        'hotspot_hover_color',
        'hotspot_text_color',
        'hotspot_size',
        'hotspot_shape',
        'hotspot_label_visibility',
        'hotspot_pulse_enabled',
    ];

    protected function casts(): array
    {
        return [
            'hotspot_size' => 'float',
            'hotspot_pulse_enabled' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function startPanorama(): BelongsTo
    {
        return $this->belongsTo(ProjectAsset::class, 'start_panorama_id');
    }

    public function hotspots(): HasMany
    {
        return $this->hasMany(Project360Hotspot::class, 'project_360_tour_id');
    }

    public function shareLinks(): HasMany
    {
        return $this->hasMany(Project360ShareLink::class, 'project_360_tour_id');
    }

    public function sceneSettings(): HasMany
    {
        return $this->hasMany(Project360SceneSetting::class, 'project_360_tour_id');
    }
}
