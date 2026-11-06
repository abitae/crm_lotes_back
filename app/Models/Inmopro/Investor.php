<?php

namespace App\Models\Inmopro;

use Database\Factories\Inmopro\InvestorFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Investor extends Model
{
    /** @use HasFactory<InvestorFactory> */
    use HasFactory;

    public const PERSON_NATURAL = 'NATURAL';

    public const PERSON_JURIDICA = 'JURIDICA';

    /**
     * @var list<string>
     */
    public const PERSON_TYPES = [self::PERSON_NATURAL, self::PERSON_JURIDICA];

    /**
     * @var list<string>
     */
    public const DOCUMENT_TYPES = ['DNI', 'RUC', 'CE', 'PASAPORTE'];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'person_type',
        'name',
        'document_type',
        'document_number',
        'phone',
        'email',
        'address',
        'bank_name',
        'bank_account',
        'bank_cci',
        'client_id',
        'is_active',
        'notes',
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
     * @return HasMany<InvestorContract, $this>
     */
    public function contracts(): HasMany
    {
        return $this->hasMany(InvestorContract::class);
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
