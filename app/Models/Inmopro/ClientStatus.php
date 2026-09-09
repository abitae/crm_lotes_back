<?php

namespace App\Models\Inmopro;

use Database\Factories\Inmopro\ClientStatusFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientStatus extends Model
{
    /** @use HasFactory<ClientStatusFactory> */
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
     * @return HasMany<Client, $this>
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'client_status_id');
    }

    /**
     * @param  Builder<ClientStatus>  $query
     * @return Builder<ClientStatus>
     */
    public function scopeForAdvisor(Builder $query, int $advisorId): Builder
    {
        return $query->where('advisor_id', $advisorId);
    }
}
