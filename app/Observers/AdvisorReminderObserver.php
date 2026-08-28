<?php

namespace App\Observers;

use App\Jobs\SyncReminderToGoogleCalendarJob;
use App\Models\Inmopro\AdvisorReminder;

class AdvisorReminderObserver
{
    public function created(AdvisorReminder $reminder): void
    {
        SyncReminderToGoogleCalendarJob::dispatch($reminder->id, 'push');
    }

    public function updated(AdvisorReminder $reminder): void
    {
        SyncReminderToGoogleCalendarJob::dispatch($reminder->id, 'push');
    }

    public function deleted(AdvisorReminder $reminder): void
    {
        SyncReminderToGoogleCalendarJob::dispatch($reminder->id, 'delete', $reminder->google_event_id, $reminder->advisor_id);
    }
}
