<?php

namespace App\Models\Inmopro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpenAiCazadorKnowledgeChunk extends Model
{
    protected $table = 'openai_cazador_knowledge_chunks';

    protected $fillable = ['document_id', 'position', 'heading', 'content', 'embedding'];

    protected function casts(): array
    {
        return ['embedding' => 'array'];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(OpenAiCazadorKnowledgeDocument::class, 'document_id');
    }
}
