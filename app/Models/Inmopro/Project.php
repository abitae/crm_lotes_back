<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Project extends Model
{
    public const TIPO_WEB_SITES = [
        'lotesenremate.pe',
        'inviertexpress.pe',
    ];

    protected $fillable = [
        'name',
        'project_type_id',
        'city_id',
        'province',
        'district',
        'project_zone',
        'registry_status',
        'descripcion',
        'precio_web',
        'location',
        'total_lots',
        'blocks',
        'is_active',
        'image_portada',
        'is_web',
        'tipo_web',
        'tour_360_url',
    ];

    protected function casts(): array
    {
        return [
            'blocks' => 'array',
            'total_lots' => 'integer',
            'is_active' => 'boolean',
            'is_web' => 'boolean',
            'precio_web' => 'decimal:2',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeVisibleOnWeb(Builder $query): Builder
    {
        return $query->where('is_active', true)->where('is_web', true);
    }

    public function projectType(): BelongsTo
    {
        return $this->belongsTo(ProjectType::class, 'project_type_id');
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class, 'project_id');
    }

    public function attentionTickets(): HasMany
    {
        return $this->hasMany(AttentionTicket::class, 'project_id');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(ProjectAsset::class, 'project_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function images(): HasMany
    {
        return $this->assets()->where('kind', 'image');
    }

    public function documents(): HasMany
    {
        return $this->assets()->where('kind', 'document');
    }

    public function panoramas(): HasMany
    {
        return $this->assets()->where('kind', ProjectAsset::KIND_PANORAMA);
    }

    public function floorPlans(): HasMany
    {
        return $this->assets()->where('kind', ProjectAsset::KIND_FLOOR_PLAN);
    }

    public function tour360(): HasOne
    {
        return $this->hasOne(Project360Tour::class);
    }

    /**
     * @return HasMany<ProjectFlatPolygon, $this>
     */
    public function flatPolygons(): HasMany
    {
        return $this->hasMany(ProjectFlatPolygon::class);
    }

    /**
     * URL absoluta a la vista plana del CRM cuando el proyecto tiene polígonos.
     */
    public function resolveViewFlatUrl(): ?string
    {
        $hasPolygons = array_key_exists('flat_polygons_count', $this->attributes)
            ? (int) $this->attributes['flat_polygons_count'] > 0
            : $this->flatPolygons()->exists();

        if (! $hasPolygons) {
            return null;
        }

        return route('inmopro.project-flat.show', $this);
    }
}
