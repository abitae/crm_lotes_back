<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpenAiCazadorConversation extends Model
{
    use HasUuids;

    protected $table = 'openai_cazador_conversations';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'advisor_id', 'last_active_at'];

    protected function casts(): array
    {
        return ['last_active_at' => 'datetime'];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(OpenAiCazadorConversationMessage::class, 'conversation_id');
    }
}
