<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;

class OpenAiCazadorRun extends Model
{
    protected $table = 'openai_cazador_runs';

    protected $fillable = ['advisor_id', 'conversation_id', 'invocation_id', 'status', 'model', 'duration_ms', 'prompt_tokens', 'completion_tokens', 'cache_read_tokens', 'reasoning_tokens', 'tool_calls_count', 'knowledge_version', 'error_code'];
}
