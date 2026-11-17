<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotTransferVoucher extends Model
{
    public const BANK_OTHER = 'OTRO';

    /**
     * @var array<string, string>
     */
    public const BANKS = [
        'BCP' => 'BCP',
        'BBVA' => 'BBVA',
        'INTERBANK' => 'Interbank',
        'SCOTIABANK' => 'Scotiabank',
        'BANCO_NACION' => 'Banco de la Nación',
        'BANBIF' => 'BanBif',
        'PICHINCHA' => 'Banco Pichincha',
        'CAJA_AREQUIPA' => 'Caja Arequipa',
        'CAJA_HUANCAYO' => 'Caja Huancayo',
        'YAPE' => 'Yape',
        'PLIN' => 'Plin',
        self::BANK_OTHER => 'Otro',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'lot_transfer_confirmation_id',
        'bank',
        'bank_other',
        'amount',
        'operation_number',
        'image_path',
    ];

    /**
     * @var list<string>
     */
    protected $appends = ['bank_label'];

    /**
     * @var list<string>
     */
    protected $hidden = ['image_path'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<LotTransferConfirmation, $this>
     */
    public function confirmation(): BelongsTo
    {
        return $this->belongsTo(LotTransferConfirmation::class, 'lot_transfer_confirmation_id');
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function bankLabel(): Attribute
    {
        return Attribute::get(function (): ?string {
            if ($this->bank === null) {
                return null;
            }

            if ($this->bank === self::BANK_OTHER) {
                return $this->bank_other ?: self::BANKS[self::BANK_OTHER];
            }

            return self::BANKS[$this->bank] ?? $this->bank;
        });
    }
}
