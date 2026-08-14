<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project360Polygon extends Model
{
    protected $table = 'project_360_polygons';

    /** @var list<string> */
    protected $fillable = [
        'project_360_tour_id',
        'source_panorama_id',
        'lot_id',
        'title',
        'description',
        'label_text',
        'label_color',
        'label_background_color',
        'label_border_color',
        'label_border_width',
        'label_font',
        'label_size',
        'label_width',
        'label_height',
        'label_rotation',
        'label_shape',
        'label_visibility',
        'label_yaw',
        'label_pitch',
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
            'label_size' => 'float',
            'label_width' => 'float',
            'label_height' => 'float',
            'label_rotation' => 'float',
            'label_border_width' => 'float',
            'label_yaw' => 'float',
            'label_pitch' => 'float',
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

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }
}
