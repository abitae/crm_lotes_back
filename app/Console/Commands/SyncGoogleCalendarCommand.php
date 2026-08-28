<?php

namespace App\Console\Commands;

use App\Models\GoogleAccount;
use App\Services\Google\GoogleCalendarSyncService;
use Illuminate\Console\Command;
use Throwable;

class SyncGoogleCalendarCommand extends Command
{
    protected $signature = 'google:calendar-sync';

    protected $description = 'Sincroniza recordatorios del CRM con Google Calendar (bidireccional).';

    public function handle(GoogleCalendarSyncService $syncService): int
    {
        $accounts = GoogleAccount::query()
            ->whereNotNull('advisor_id')
            ->whereNotNull('refresh_token')
            ->get()
            ->filter(fn (GoogleAccount $account): bool => $account->hasCalendarScope());

        foreach ($accounts as $account) {
            try {
                $syncService->syncAdvisor($account);
            } catch (Throwable $exception) {
                $this->error("Advisor {$account->advisor_id}: {$exception->getMessage()}");
            }
        }

        return self::SUCCESS;
    }
}
