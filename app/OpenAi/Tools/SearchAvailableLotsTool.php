<?php

namespace App\OpenAi\Tools;

use App\OpenAi\Services\ProjectKnowledgeService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class SearchAvailableLotsTool implements Tool
{
    public function __construct(
        private ProjectKnowledgeService $knowledge,
    ) {}

    public function description(): Stringable|string
    {
        return 'Busca lotes del catálogo en proyectos activos. Por defecto solo lotes disponibles (estado LIBRE). Filtros opcionales: project_id y search (manzana o número).';
    }

    public function handle(Request $request): Stringable|string
    {
        $arguments = $request->all();
        $projectId = array_key_exists('project_id', $arguments) ? (int) $request->integer('project_id') : null;
        $search = array_key_exists('search', $arguments) ? (string) ($arguments['search'] ?? '') : null;
        $availableOnly = array_key_exists('available_only', $arguments)
            ? filter_var($arguments['available_only'], FILTER_VALIDATE_BOOLEAN)
            : true;

        return $this->knowledge->encodeForTool(
            $this->knowledge->searchLotsPayload($projectId, $search, $availableOnly)
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema->integer()->min(1),
            'search' => $schema->string(),
            'available_only' => $schema->boolean(),
        ];
    }
}
