<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;

class OpenAiCazadorConversationMessage extends Model
{
    protected $table = 'openai_cazador_conversation_messages';

    protected $fillable = ['conversation_id', 'role', 'content'];
}
