<?php

namespace App\Console\Commands;

use App\Models\Inmopro\AdvisorReminder;
use App\Notifications\Crm\ReminderDueNotification;
use Illuminate\Console\Command;

class NotifyDueReminders extends Command
{
    protected $signature = 'reminders:notify-due';

    protected $description = 'Envía una notificación por cada recordatorio de asesor vencido y aún no notificado.';

    public function handle(): int
    {
        $notified = 0;

        AdvisorReminder::query()
            ->whereNull('completed_at')
            ->whereNull('notified_at')
            ->where('remind_at', '<=', now())
            ->with(['advisor', 'client'])
            ->chunkById(100, function ($reminders) use (&$notified): void {
                foreach ($reminders as $reminder) {
                    if ($reminder->advisor === null) {
                        continue;
                    }

                    $reminder->advisor->notify(new ReminderDueNotification($reminder));
                    $reminder->update(['notified_at' => now()]);
                    $notified++;
                }
            });

        $this->info("Recordatorios notificados: {$notified}");

        return self::SUCCESS;
    }
}
