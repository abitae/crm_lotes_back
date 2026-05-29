<?php

namespace App\OpenAi\Agents;

use App\OpenAi\Tools\GetProjectDetailTool;
use App\OpenAi\Tools\ListActiveProjectsTool;
use App\OpenAi\Tools\SearchAvailableLotsTool;
use Laravel\Ai\Attributes\UseCheapestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Promptable;
use Stringable;

#[UseCheapestModel]
class CazadorCatalogAssistant implements Agent, HasTools
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'TXT'
Eres un asistente de catálogo inmobiliario para asesores que usan la app Cazador (Inmopro).
Solo respondes con información de proyectos activos y lotes del catálogo obtenida mediante las herramientas disponibles.
No inventes ubicaciones, precios, disponibilidad ni documentos. Si no tienes el dato, indícalo claramente.
No menciones ni supongas datos de clientes, asesores asignados, comisiones ni pre-reservas.
Responde en español, de forma clara y concisa, orientada a la venta consultiva del catálogo.
TXT;
    }

    /**
     * @return Tool[]
     */
    public function tools(): iterable
    {
        return [
            app(ListActiveProjectsTool::class),
            app(GetProjectDetailTool::class),
            app(SearchAvailableLotsTool::class),
        ];
    }
}
