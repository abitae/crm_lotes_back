<?php

namespace App\Jobs\Meta;

use App\Services\Meta\MetaIngestService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessMetaWebhookJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public array $payload) {}

    public function handle(MetaIngestService $ingestService): void
    {
        $ingestService->ingest($this->payload);
    }
}
