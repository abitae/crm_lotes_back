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

    'model' => 'gpt-5.4',

    'embedding_model' => 'text-embedding-3-small',

    'conversation_ttl_minutes' => 120,

    'max_conversation_messages' => 12,

    'timeout_seconds' => 30,

    'max_message_length' => (int) env('OPENAI_CAZADOR_MAX_MESSAGE_LENGTH', 2000),

    'rate_limit' => (int) env('OPENAI_CAZADOR_RATE_LIMIT', 8),

    'knowledge_rate_limit' => (int) env('OPENAI_CAZADOR_KNOWLEDGE_RATE_LIMIT', 60),

];
