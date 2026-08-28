<?php

namespace App\Jobs\Meta;

use App\Models\Meta\MetaBroadcast;
use App\Models\Meta\MetaBroadcastRecipient;
use App\Models\Meta\MetaConnection;
use App\Services\Meta\MetaSendService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessBroadcastBatchJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $broadcastId) {}

    public function handle(MetaSendService $sendService): void
    {
        $broadcast = MetaBroadcast::query()->with(['messageTemplate', 'metaConnection'])->find($this->broadcastId);

        if (! $broadcast || ! $broadcast->messageTemplate || ! $broadcast->metaConnection) {
            return;
        }

        /** @var MetaConnection $connection */
        $connection = $broadcast->metaConnection;

        $recipients = MetaBroadcastRecipient::query()
            ->where('broadcast_id', $broadcast->id)
            ->where('status', 'pending')
            ->limit(50)
            ->get();

        foreach ($recipients as $recipient) {
            try {
                $externalId = $sendService->sendTemplate(
                    $connection,
                    (string) $recipient->phone,
                    $broadcast->messageTemplate,
                );

                $recipient->update([
                    'status' => 'sent',
                    'external_message_id' => $externalId,
                ]);

                $broadcast->increment('sent_count');
            } catch (\Throwable $exception) {
                $recipient->update([
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                ]);

                $broadcast->increment('failed_count');
            }
        }

        if (MetaBroadcastRecipient::query()->where('broadcast_id', $broadcast->id)->where('status', 'pending')->exists()) {
            self::dispatch($broadcast->id)->delay(now()->addSeconds(2));
        } else {
            $broadcast->update(['status' => 'completed', 'sent_at' => now()]);
        }
    }
}
