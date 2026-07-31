<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project360Label extends Model
{
    protected $table = 'project_360_labels';

    /** @var list<string> */
    protected $fillable = [
        'project_360_tour_id',
        'source_panorama_id',
        'text',
        'yaw',
        'pitch',
        'color',
        'size',
    ];

    protected function casts(): array
    {
        return [
            'yaw' => 'float',
            'pitch' => 'float',
            'size' => 'float',
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
}
