<?php

namespace App\OpenAi\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class PreviewCazadorKnowledgeTool implements Tool
{
    /**
     * @param  array<string, mixed>  $matches
     */
    public function __construct(private array $matches) {}

    public function description(): Stringable|string
    {
        return 'Devuelve el conocimiento comercial recuperado para la prueba de la versión candidata. Debes consultarlo para responder la pregunta de prueba.';
    }

    public function handle(Request $request): Stringable|string
    {
        return json_encode($this->matches, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    public function schema(JsonSchema $schema): array
    {
        return ['query' => $schema->string()->required()];
    }
}
