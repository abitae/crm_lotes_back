<?php

namespace App\Support;

use App\Models\Inmopro\OpenAiCazadorConfig;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class OpenAiCazadorConfigResolver
{
    private const string CACHE_KEY = 'openai_cazador.config';

    public static function applyRuntimeConfig(): void
    {
        if (! Schema::hasTable('openai_cazador_configs')) {
            return;
        }

        try {
            $settings = self::cachedSettings();
        } catch (\Throwable) {
            return;
        }

        if ($settings === null) {
            return;
        }

        config([
            'openai_cazador.enabled' => $settings->enabled,
            'openai_cazador.model' => $settings->model,
            'openai_cazador.max_message_length' => $settings->max_message_length,
            'openai_cazador.rate_limit' => $settings->rate_limit,
            'openai_cazador.knowledge_rate_limit' => $settings->knowledge_rate_limit,
        ]);

        if ($settings->hasStoredApiKey()) {
            config(['ai.providers.openai.key' => $settings->openai_api_key]);
        }
    }

    /**
     * @return 'database'|'env'|'none'
     */
    public static function apiKeySource(?OpenAiCazadorConfig $settings = null): string
    {
        $settings ??= self::cachedSettings();

        if ($settings?->hasStoredApiKey()) {
            return 'database';
        }

        $envKey = config('ai.providers.openai.key');

        return filled($envKey) ? 'env' : 'none';
    }

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private static function cachedSettings(): ?OpenAiCazadorConfig
    {
        $cached = Cache::get(self::CACHE_KEY);

        if ($cached instanceof OpenAiCazadorConfig) {
            return $cached;
        }

        $row = OpenAiCazadorConfig::query()->first();

        if ($row !== null) {
            Cache::forever(self::CACHE_KEY, $row);
        }

        return $row;
    }
}
