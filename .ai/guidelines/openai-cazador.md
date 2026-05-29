# Módulo OpenAI Cazador

- Código en `app/OpenAi/` (agentes, tools, servicios, controladores API). **No** mezclar con `app/Ai/Agents/` (web Inmopro, p. ej. seguimiento de lote).
- Configuración: `config/openai_cazador.php` y `.env` (`OPENAI_CAZADOR_*`, `OPENAI_API_KEY` en `config/ai.php`).
- Rutas: `routes/openai-cazador.php`, prefijo `/api/v1/cazador/openai`, middleware `advisor.api` + `openai.cazador`.
- **Catálogo únicamente:** proyectos `is_active`, lotes con filtro `LIBRE` por defecto. Prohibido exponer clientes, asesores, comisiones o pre-reservas en knowledge/chat.
- Capa de datos: `App\OpenAi\Services\ProjectKnowledgeService` — usada por la API HTTP y por las tools del agente.
- Agente: `CazadorCatalogAssistant` con tools `ListActiveProjectsTool`, `GetProjectDetailTool`, `SearchAvailableLotsTool`.
- Rate limits: `throttle:ai-cazador` (chat), `throttle:ai-cazador-knowledge` (lecturas).
- Tests: `tests/Feature/OpenAi/Cazador/`, siempre `CazadorCatalogAssistant::fake()` para el chat.
- Documentación API: `docs/API_CAZADOR.md` sección OpenAI; guía app móvil: `docs/API_CAZADOR_OPENAI.md`.
