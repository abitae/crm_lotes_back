<?php

namespace App\Jobs;

use App\Models\Inmopro\AdvisorReminder;
use App\Services\Google\GoogleCalendarSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncReminderToGoogleCalendarJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $reminderId,
        public string $action = 'push',
        public ?string $googleEventId = null,
        public ?int $advisorId = null,
    ) {}

    public function handle(GoogleCalendarSyncService $syncService): void
    {
        if ($this->action === 'delete') {
            if ($this->googleEventId && $this->advisorId) {
                $reminder = new AdvisorReminder([
                    'advisor_id' => $this->advisorId,
                    'google_event_id' => $this->googleEventId,
                ]);
                $syncService->deleteReminderEvent($reminder);
            }

            return;
        }

        $reminder = AdvisorReminder::query()->find($this->reminderId);

        if ($reminder) {
            $syncService->pushReminder($reminder);
        }
    }
}
