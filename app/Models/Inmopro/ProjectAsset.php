<?php

namespace App\Models\Inmopro;

use App\Support\FileStorage;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAsset extends Model
{
    public const KIND_PANORAMA = 'panorama';

    public const KIND_FLOOR_PLAN = 'floor_plan';

    public const TOUR_KINDS = [
        self::KIND_PANORAMA,
        self::KIND_FLOOR_PLAN,
    ];

    public static function storageDisk(): string
    {
        return FileStorage::disk();
    }

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'kind',
        'title',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'sort_order',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Disco de storage (alias de file_path para servir/descargar).
     */
    protected function disk(): Attribute
    {
        return Attribute::get(fn (): string => static::storageDisk());
    }

    /**
     * Ruta relativa dentro del disco (columna file_path normalizada).
     */
    protected function path(): Attribute
    {
        return Attribute::get(fn (): string => ltrim(str_replace('\\', '/', (string) $this->file_path), '/'));
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}
