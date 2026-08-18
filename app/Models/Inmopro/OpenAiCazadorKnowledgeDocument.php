<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpenAiCazadorKnowledgeDocument extends Model
{
    protected $table = 'openai_cazador_knowledge_documents';

    protected $fillable = ['version', 'expert_name', 'original_name', 'storage_path', 'file_size', 'sha256', 'status', 'is_active', 'error_message', 'uploaded_by', 'indexed_at', 'evaluated_at', 'activated_at'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'indexed_at' => 'datetime', 'evaluated_at' => 'datetime', 'activated_at' => 'datetime'];
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(OpenAiCazadorKnowledgeChunk::class, 'document_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public static function active(): ?self
    {
        return self::activeDocuments()->latest('version')->first();
    }

    /**
     * @return Builder<self>
     */
    public static function activeDocuments(): Builder
    {
        return self::query()->where('is_active', true)->where('status', 'ready');
    }
}
