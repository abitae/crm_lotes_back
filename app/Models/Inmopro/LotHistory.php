<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotHistory extends Model
{
    public const EVENT_CREATED = 'CREADO';

    public const EVENT_PRE_RESERVED = 'PRERESERVADO';

    public const EVENT_PRE_RESERVATION_RELEASED = 'PRERESERVA_LIBERADA';

    public const EVENT_RESERVED = 'RESERVADO';

    public const EVENT_INSTALLMENTS = 'CUOTAS';

    public const EVENT_TRANSFERRED = 'TRANSFERIDO';

    public const EVENT_TRANSFER_REJECTED = 'TRANSFERENCIA_RECHAZADA';

    public const EVENT_RELEASED = 'LIBERADO';

    public const EVENT_SALE_FALLEN = 'VENTA_CAIDA';

    public const EVENT_CLIENT_CHANGED = 'CAMBIO_CLIENTE';

    public const EVENT_STATUS_CHANGED = 'CAMBIO_ESTADO';

    /**
     * @var array<string, string>
     */
    public const EVENT_LABELS = [
        self::EVENT_CREATED => 'Lote creado',
        self::EVENT_PRE_RESERVED => 'Pre-reservado',
        self::EVENT_PRE_RESERVATION_RELEASED => 'Pre-reserva rechazada / expirada',
        self::EVENT_RESERVED => 'Reservado',
        self::EVENT_INSTALLMENTS => 'Pasó a cuotas',
        self::EVENT_TRANSFERRED => 'Transferencia registrada',
        self::EVENT_TRANSFER_REJECTED => 'Transferencia rechazada',
        self::EVENT_RELEASED => 'Liberado',
        self::EVENT_SALE_FALLEN => 'Venta caída',
        self::EVENT_CLIENT_CHANGED => 'Cambio de cliente / asesor',
        self::EVENT_STATUS_CHANGED => 'Cambio de estado',
    ];

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'lot_id',
        'event',
        'from_status_id',
        'to_status_id',
        'client_id',
        'client_name',
        'client_dni',
        'advisor_id',
        'advisor_name',
        'user_id',
        'user_name',
        'reason',
        'notes',
        'meta',
        'created_at',
    ];

    /**
     * @var list<string>
     */
    protected $appends = ['event_label'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Lot, $this>
     */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    /**
     * @return BelongsTo<LotStatus, $this>
     */
    public function fromStatus(): BelongsTo
    {
        return $this->belongsTo(LotStatus::class, 'from_status_id');
    }

    /**
     * @return BelongsTo<LotStatus, $this>
     */
    public function toStatus(): BelongsTo
    {
        return $this->belongsTo(LotStatus::class, 'to_status_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return Attribute<string, never>
     */
    protected function eventLabel(): Attribute
    {
        return Attribute::get(fn (): string => self::EVENT_LABELS[$this->event] ?? $this->event);
    }
}
