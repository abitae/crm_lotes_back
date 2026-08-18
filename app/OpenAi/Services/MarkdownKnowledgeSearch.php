<?php

namespace App\OpenAi\Services;

use App\Models\Inmopro\OpenAiCazadorKnowledgeChunk;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use Laravel\Ai\Embeddings;

class MarkdownKnowledgeSearch
{
    /**
     * @return array{version: ?int, versions: list<int>, documents_count: int, results: list<array{document_id: int, expert_name: string, version: int, heading: ?string, content: string, score: float}>}
     */
    public function search(string $query, int $limit = 6, ?OpenAiCazadorKnowledgeDocument $document = null): array
    {
        $documents = $document !== null
            ? collect([$document])
            : OpenAiCazadorKnowledgeDocument::activeDocuments()->get();

        if ($documents->isEmpty() || trim($query) === '') {
            return ['version' => null, 'versions' => [], 'documents_count' => 0, 'results' => []];
        }

        $queryVector = Embeddings::for([trim($query)])
            ->dimensions(1536)
            ->cache(3600)
            ->timeout(15)
            ->generate(provider: 'openai', model: 'text-embedding-3-small')
            ->embeddings[0];

        $results = OpenAiCazadorKnowledgeChunk::query()
            ->with('document:id,expert_name,version')
            ->whereIn('document_id', $documents->pluck('id'))
            ->get()
            ->map(fn ($chunk) => [
                'document_id' => $chunk->document_id,
                'expert_name' => $chunk->document->expert_name,
                'version' => $chunk->document->version,
                'heading' => $chunk->heading,
                'content' => $chunk->content,
                'score' => $this->cosineSimilarity($queryVector, $chunk->embedding ?? []),
            ])
            ->sortByDesc('score')
            ->take(max(1, min($limit, 6)))
            ->values()
            ->all();

        $versions = $documents->pluck('version')->sort()->values()->all();

        return [
            'version' => $documents->max('version'),
            'versions' => $versions,
            'documents_count' => $documents->count(),
            'results' => $results,
        ];
    }

    /**
     * @param  list<float|int>  $left
     * @param  list<float|int>  $right
     */
    public function cosineSimilarity(array $left, array $right): float
    {
        if ($left === [] || count($left) !== count($right)) {
            return 0.0;
        }
        $dot = $leftMagnitude = $rightMagnitude = 0.0;
        foreach ($left as $index => $value) {
            $other = (float) $right[$index];
            $value = (float) $value;
            $dot += $value * $other;
            $leftMagnitude += $value * $value;
            $rightMagnitude += $other * $other;
        }
        $denominator = sqrt($leftMagnitude) * sqrt($rightMagnitude);

        return $denominator > 0 ? $dot / $denominator : 0.0;
    }
}
