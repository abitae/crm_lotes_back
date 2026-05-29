<?php

namespace App\OpenAi\Tools;

use App\OpenAi\Services\ProjectKnowledgeService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetProjectDetailTool implements Tool
{
    public function __construct(
        private ProjectKnowledgeService $knowledge,
    ) {}

    public function description(): Stringable|string
    {
        return 'Obtiene el detalle de un proyecto activo por ID: ubicación, manzanas (blocks), imágenes y documentos con URLs de descarga.';
    }

    public function handle(Request $request): Stringable|string
    {
        $projectId = (int) $request->integer('project_id');

        return $this->knowledge->encodeForTool($this->knowledge->activeProjectDetailPayload($projectId));
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema->integer()->min(1)->required(),
        ];
    }
}
