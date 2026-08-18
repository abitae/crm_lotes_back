<?php

namespace App\OpenAi\Services;

use App\Models\Inmopro\OpenAiCazadorKnowledgeChunk;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Embeddings;

class MarkdownKnowledgeIndexer
{
    private const int MAX_WORDS = 450;

    private const int OVERLAP_WORDS = 60;

    public function index(OpenAiCazadorKnowledgeDocument $document, string $markdown): void
    {
        $chunks = $this->split($markdown);

        foreach (array_chunk($chunks, 20, true) as $batch) {
            $response = Embeddings::for(array_values(array_map(
                fn (array $chunk): string => trim(($chunk['heading'] ? $chunk['heading']."\n" : '').$chunk['content']),
                $batch,
            )))->dimensions(1536)->timeout(30)->generate(provider: 'openai', model: 'text-embedding-3-small');

            foreach (array_values($batch) as $offset => $chunk) {
                $chunks[array_key_first($batch) + $offset]['embedding'] = $response->embeddings[$offset];
            }
        }

        DB::transaction(function () use ($document, $chunks): void {
            $hasActiveDocument = OpenAiCazadorKnowledgeDocument::query()
                ->whereKeyNot($document->id)
                ->where('is_active', true)
                ->exists();

            $document->chunks()->delete();

            foreach ($chunks as $position => $chunk) {
                OpenAiCazadorKnowledgeChunk::query()->create([
                    'document_id' => $document->id,
                    'position' => $position,
                    'heading' => $chunk['heading'],
                    'content' => $chunk['content'],
                    'embedding' => $chunk['embedding'],
                ]);
            }

            $document->update([
                'status' => 'ready',
                'is_active' => ! $hasActiveDocument,
                'error_message' => null,
                'indexed_at' => now(),
                'activated_at' => $hasActiveDocument ? null : now(),
            ]);
        });
    }

    /**
     * @return list<array{heading: ?string, content: string}>
     */
    public function split(string $markdown): array
    {
        $markdown = trim(str_replace(["\r\n", "\r"], "\n", $markdown));
        if ($markdown === '' || preg_match('/^#{1,6}\s+\S+/m', $markdown) !== 1) {
            throw new \InvalidArgumentException('El archivo debe contener contenido Markdown con al menos un título.');
        }

        $sections = [];
        $heading = null;
        $body = [];
        foreach (explode("\n", $markdown) as $line) {
            if (preg_match('/^#{1,6}\s+(.+)$/', trim($line), $match) === 1) {
                if ($body !== []) {
                    $sections[] = ['heading' => $heading, 'content' => trim(implode("\n", $body))];
                }
                $heading = trim($match[1]);
                $body = [];

                continue;
            }
            $body[] = $line;
        }
        if ($body !== [] || $heading !== null) {
            $sections[] = ['heading' => $heading, 'content' => trim(implode("\n", $body))];
        }

        $chunks = [];
        foreach ($sections as $section) {
            $words = preg_split('/\s+/u', $section['content'], -1, PREG_SPLIT_NO_EMPTY) ?: [];
            if ($words === []) {
                continue;
            }
            $start = 0;
            while ($start < count($words)) {
                $slice = array_slice($words, $start, self::MAX_WORDS);
                $chunks[] = ['heading' => $section['heading'], 'content' => implode(' ', $slice)];
                if ($start + self::MAX_WORDS >= count($words)) {
                    break;
                }
                $start += self::MAX_WORDS - self::OVERLAP_WORDS;
            }
        }

        if ($chunks === []) {
            throw new \InvalidArgumentException('El archivo Markdown no contiene texto indexable.');
        }

        return $chunks;
    }
}
