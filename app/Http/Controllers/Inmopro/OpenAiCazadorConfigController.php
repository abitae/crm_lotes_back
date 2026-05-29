<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\UpdateOpenAiCazadorConfigRequest;
use App\Models\Inmopro\OpenAiCazadorConfig;
use App\Support\OpenAiCazadorConfigResolver;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class OpenAiCazadorConfigController extends Controller
{
    public function edit(): Response
    {
        $config = OpenAiCazadorConfig::current();

        return Inertia::render('inmopro/openai-cazador-settings', [
            'config' => [
                'enabled' => $config->enabled,
                'model' => $config->model,
                'max_message_length' => $config->max_message_length,
                'rate_limit' => $config->rate_limit,
                'knowledge_rate_limit' => $config->knowledge_rate_limit,
                'has_openai_api_key' => OpenAiCazadorConfigResolver::apiKeySource($config) !== 'none',
                'openai_api_key_source' => OpenAiCazadorConfigResolver::apiKeySource($config),
            ],
        ]);
    }

    public function update(UpdateOpenAiCazadorConfigRequest $request): RedirectResponse
    {
        $config = OpenAiCazadorConfig::current();
        $validated = $request->validated();

        if ($request->boolean('remove_openai_api_key')) {
            $validated['openai_api_key'] = null;
        } elseif (! filled($request->input('openai_api_key'))) {
            unset($validated['openai_api_key']);
        }

        unset($validated['remove_openai_api_key']);

        $config->update($validated);

        OpenAiCazadorConfigResolver::forgetCache();
        OpenAiCazadorConfigResolver::applyRuntimeConfig();

        return redirect()->route('inmopro.openai-cazador.edit')
            ->with('success', 'Configuración de OpenAI Cazador actualizada.');
    }
}
