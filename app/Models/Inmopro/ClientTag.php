<?php

namespace App\Models\Inmopro;

use Database\Factories\Inmopro\ClientTagFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ClientTag extends Model
{
    /** @use HasFactory<ClientTagFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'advisor_id',
        'name',
        'code',
        'description',
        'color',
        'sort_order',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Advisor, $this>
     */
    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    /**
     * @return BelongsToMany<Client, $this>
     */
    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class, 'client_client_tag')
            ->withTimestamps();
    }

    /**
     * @param  Builder<ClientTag>  $query
     * @return Builder<ClientTag>
     */
    public function scopeForAdvisor(Builder $query, int $advisorId): Builder
    {
        return $query->where('advisor_id', $advisorId);
    }
}
