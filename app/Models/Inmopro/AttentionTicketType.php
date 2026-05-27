<?php

namespace App\Models\Inmopro;

use Database\Factories\Inmopro\AttentionTicketTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttentionTicketType extends Model
{
    public const CODE_GENERAL = 'GENERAL';

    /** @use HasFactory<AttentionTicketTypeFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'description',
        'color',
        'allows_overlap',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allows_overlap' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<AttentionTicket, $this>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(AttentionTicket::class, 'attention_ticket_type_id');
    }

    public static function general(): self
    {
        return self::query()->firstOrCreate(
            ['code' => self::CODE_GENERAL],
            [
                'name' => 'General',
                'description' => 'Tipo general para tickets de atención.',
                'color' => '#64748b',
                'allows_overlap' => true,
                'is_active' => true,
                'sort_order' => 0,
            ],
        );
    }
}
