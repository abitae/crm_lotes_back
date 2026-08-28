<?php

namespace App\Models\Meta;

use App\Models\Inmopro\Advisor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaContactIdentity extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'meta_connection_id',
        'advisor_id',
        'channel',
        'external_user_id',
        'phone',
        'phone_normalized',
        'profile_name',
    ];

    public function metaConnection(): BelongsTo
    {
        return $this->belongsTo(MetaConnection::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Advisor::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(MetaConversation::class, 'contact_identity_id');
    }
}
