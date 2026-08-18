<?php

namespace App\OpenAi\Services;

use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use Laravel\Ai\Embeddings;

class MarkdownKnowledgeSearch
{
    /**
     * @return array{version: ?int, results: list<array{heading: ?string, content: string, score: float}>}
     */
    public function search(string $query, int $limit = 6, ?OpenAiCazadorKnowledgeDocument $document = null): array
    {
        $document ??= OpenAiCazadorKnowledgeDocument::active();
        if ($document === null || trim($query) === '') {
            return ['version' => null, 'results' => []];
        }

        $queryVector = Embeddings::for([trim($query)])
            ->dimensions(1536)
            ->cache(3600)
            ->timeout(15)
            ->generate(provider: 'openai', model: 'text-embedding-3-small')
            ->embeddings[0];

        $results = $document->chunks()
            ->get()
            ->map(fn ($chunk) => [
                'heading' => $chunk->heading,
                'content' => $chunk->content,
                'score' => $this->cosineSimilarity($queryVector, $chunk->embedding ?? []),
            ])
            ->sortByDesc('score')
            ->take(max(1, min($limit, 6)))
            ->values()
            ->all();

        return ['version' => $document->version, 'results' => $results];
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
