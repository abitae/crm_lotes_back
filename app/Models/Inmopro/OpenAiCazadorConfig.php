<?php

namespace App\Models\Inmopro;

use App\Support\OpenAiCazadorConfigResolver;
use Illuminate\Database\Eloquent\Model;

class OpenAiCazadorConfig extends Model
{
    /**
     * @var string
     */
    protected $table = 'openai_cazador_configs';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'enabled',
        'model',
        'max_message_length',
        'rate_limit',
        'knowledge_rate_limit',
        'openai_api_key',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'max_message_length' => 'integer',
            'rate_limit' => 'integer',
            'knowledge_rate_limit' => 'integer',
            'openai_api_key' => 'encrypted',
        ];
    }

    public static function current(): self
    {
        $config = self::query()->first();

        if ($config === null) {
            $config = self::query()->create([
                'enabled' => (bool) config('openai_cazador.enabled', true),
                'model' => 'gpt-5.4',
                'max_message_length' => (int) config('openai_cazador.max_message_length', 2000),
                'rate_limit' => (int) config('openai_cazador.rate_limit', 8),
                'knowledge_rate_limit' => (int) config('openai_cazador.knowledge_rate_limit', 60),
            ]);

            OpenAiCazadorConfigResolver::forgetCache();
        }

        return $config;
    }

    public function hasStoredApiKey(): bool
    {
        return array_key_exists('openai_api_key', $this->attributes)
            && filled($this->attributes['openai_api_key']);
    }
}
