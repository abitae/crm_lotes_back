<?php

namespace App\Models;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Datero;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoogleAccount extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'google_sub',
        'email',
        'name',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'scopes',
        'advisor_id',
        'datero_id',
        'calendar_id',
        'calendar_sync_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'token_expires_at' => 'datetime',
            'scopes' => 'array',
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
     * @return BelongsTo<Datero, $this>
     */
    public function datero(): BelongsTo
    {
        return $this->belongsTo(Datero::class);
    }

    public function hasCalendarScope(): bool
    {
        $calendarScope = 'https://www.googleapis.com/auth/calendar.events';

        return in_array($calendarScope, $this->scopes ?? [], true);
    }
}
