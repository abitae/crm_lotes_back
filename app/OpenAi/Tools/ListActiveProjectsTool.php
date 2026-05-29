<?php

namespace App\OpenAi\Tools;

use App\OpenAi\Services\ProjectKnowledgeService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ListActiveProjectsTool implements Tool
{
    public function __construct(
        private ProjectKnowledgeService $knowledge,
    ) {}

    public function description(): Stringable|string
    {
        return 'Lista todos los proyectos inmobiliarios activos con nombre, ubicación y conteos de lotes, imágenes y documentos.';
    }

    public function handle(Request $request): Stringable|string
    {
        return $this->knowledge->encodeForTool($this->knowledge->listActiveProjectsPayload());
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
