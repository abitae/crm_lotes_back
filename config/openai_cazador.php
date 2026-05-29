<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Módulo OpenAI para Cazador
    |--------------------------------------------------------------------------
    |
    | Asistente de catálogo (proyectos activos y lotes disponibles) para la
    | app Cazador. Las claves del proveedor OpenAI siguen en config/ai.php.
    |
    */

    'enabled' => env('OPENAI_CAZADOR_ENABLED', true),

    'model' => env('OPENAI_CAZADOR_MODEL'),

    'max_message_length' => (int) env('OPENAI_CAZADOR_MAX_MESSAGE_LENGTH', 2000),

    'rate_limit' => (int) env('OPENAI_CAZADOR_RATE_LIMIT', 8),

    'knowledge_rate_limit' => (int) env('OPENAI_CAZADOR_KNOWLEDGE_RATE_LIMIT', 60),

];
