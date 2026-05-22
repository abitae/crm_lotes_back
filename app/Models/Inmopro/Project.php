<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'project_type_id',
        'location',
        'total_lots',
        'blocks',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'blocks' => 'array',
            'total_lots' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @param  Builder<Project>  $query
     * @return Builder<Project>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * @return BelongsTo<ProjectType, $this>
     */
    public function projectType(): BelongsTo
    {
        return $this->belongsTo(ProjectType::class, 'project_type_id');
    }

    /**
     * @return HasMany<Lot, $this>
     */
    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class, 'project_id');
    }

    /**
     * @return HasMany<AttentionTicket, $this>
     */
    public function attentionTickets(): HasMany
    {
        return $this->hasMany(AttentionTicket::class, 'project_id');
    }

    /**
     * @return HasMany<ProjectAsset, $this>
     */
    public function assets(): HasMany
    {
        return $this->hasMany(ProjectAsset::class, 'project_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * @return HasMany<ProjectAsset, $this>
     */
    public function images(): HasMany
    {
        return $this->assets()->where('kind', 'image');
    }

    /**
     * @return HasMany<ProjectAsset, $this>
     */
    public function documents(): HasMany
    {
        return $this->assets()->where('kind', 'document');
    }
}
