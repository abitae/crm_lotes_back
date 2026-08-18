<?php

namespace App\OpenAi\Tools;

use App\OpenAi\Services\MarkdownKnowledgeSearch;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class SearchCazadorKnowledgeTool implements Tool
{
    public function __construct(private MarkdownKnowledgeSearch $search) {}

    public function description(): Stringable|string
    {
        return 'Busca conocimiento comercial e institucional, preguntas frecuentes, procesos, beneficios y manejo de objeciones en el documento oficial de Cazador.';
    }

    public function handle(Request $request): Stringable|string
    {
        return json_encode(
            $this->search->search((string) $request->string('query'), 6),
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return ['query' => $schema->string()->required()];
    }
}
