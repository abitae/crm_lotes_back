<?php

namespace App\Jobs\OpenAi;

use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use App\OpenAi\Services\MarkdownKnowledgeIndexer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;

class IndexCazadorKnowledge implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public int $tries = 2;

    public function __construct(public int $documentId) {}

    /**
     * Execute the job.
     */
    public function handle(MarkdownKnowledgeIndexer $indexer): void
    {
        $document = OpenAiCazadorKnowledgeDocument::query()->find($this->documentId);
        if ($document === null) {
            return;
        }

        try {
            $markdown = (string) Storage::disk('local')->get($document->storage_path);
            $indexer->index($document, $markdown);
        } catch (\Throwable $exception) {
            $document->update([
                'status' => 'failed',
                'is_active' => false,
                'error_message' => mb_substr($exception->getMessage(), 0, 1000),
            ]);
            throw $exception;
        }
    }
}
