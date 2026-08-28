<?php

namespace App\Services\Google;

use App\Models\GoogleAccount;
use App\Models\Inmopro\AdvisorReminder;
use Google\Client as GoogleClient;
use Google\Service\Calendar;
use Google\Service\Calendar\Event;
use Google\Service\Calendar\EventDateTime;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class GoogleCalendarClientFactory
{
    public function make(GoogleAccount $account): Calendar
    {
        $client = new GoogleClient;
        $client->setClientId((string) config('google.client_id'));
        $client->setClientSecret((string) config('google.client_secret'));
        $client->setAccessType('offline');

        if ($account->access_token) {
            $client->setAccessToken([
                'access_token' => $account->access_token,
                'refresh_token' => $account->refresh_token,
                'expires_in' => max(0, now()->diffInSeconds($account->token_expires_at ?? now(), false)),
                'created' => now()->subHour()->timestamp,
            ]);
        }

        if ($client->isAccessTokenExpired() && $account->refresh_token) {
            $newToken = $client->fetchAccessTokenWithRefreshToken($account->refresh_token);

            if (isset($newToken['error'])) {
                throw new RuntimeException('No se pudo renovar el acceso a Google Calendar.');
            }

            $account->forceFill([
                'access_token' => $newToken['access_token'] ?? $account->access_token,
                'token_expires_at' => now()->addSeconds((int) ($newToken['expires_in'] ?? 3600)),
            ])->save();
        }

        return new Calendar($client);
    }
}

class GoogleCalendarSyncService
{
    public function __construct(
        private GoogleCalendarClientFactory $clientFactory,
    ) {}

    public function pushReminder(AdvisorReminder $reminder): void
    {
        if (! config('google.calendar_enabled')) {
            return;
        }

        $account = GoogleAccount::query()
            ->where('advisor_id', $reminder->advisor_id)
            ->first();

        if (! $account?->hasCalendarScope() || ! $account->refresh_token) {
            return;
        }

        try {
            $calendar = $this->clientFactory->make($account);

            if ($reminder->google_event_id) {
                $event = $calendar->events->get($account->calendar_id, $reminder->google_event_id);
                $this->fillEventFromReminder($event, $reminder);
                $calendar->events->update($account->calendar_id, $reminder->google_event_id, $event);

                return;
            }

            if ($reminder->completed_at !== null) {
                return;
            }

            $event = $this->fillEventFromReminder(new Event, $reminder);
            $created = $calendar->events->insert($account->calendar_id, $event);

            if ($created->getId()) {
                AdvisorReminder::withoutEvents(function () use ($reminder, $created): void {
                    $reminder->forceFill([
                        'google_event_id' => $created->getId(),
                        'source' => $reminder->source ?: 'crm',
                        'google_updated_at' => now(),
                    ])->saveQuietly();
                });
            }
        } catch (Throwable $exception) {
            Log::warning('Google Calendar push failed.', [
                'reminder_id' => $reminder->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    public function deleteReminderEvent(AdvisorReminder $reminder): void
    {
        if (! $reminder->google_event_id) {
            return;
        }

        $account = GoogleAccount::query()->where('advisor_id', $reminder->advisor_id)->first();

        if (! $account?->hasCalendarScope()) {
            return;
        }

        try {
            $calendar = $this->clientFactory->make($account);
            $calendar->events->delete($account->calendar_id, $reminder->google_event_id);
        } catch (Throwable $exception) {
            Log::warning('Google Calendar delete failed.', [
                'reminder_id' => $reminder->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    public function syncAdvisor(GoogleAccount $account): void
    {
        if (! config('google.calendar_enabled') || ! $account->hasCalendarScope() || ! $account->refresh_token) {
            return;
        }

        $calendar = $this->clientFactory->make($account);

        $this->pushPendingReminders($account, $calendar);
        $this->pullChanges($account, $calendar);
    }

    private function pushPendingReminders(GoogleAccount $account, Calendar $calendar): void
    {
        AdvisorReminder::query()
            ->where('advisor_id', $account->advisor_id)
            ->whereNull('google_event_id')
            ->whereNull('completed_at')
            ->where('remind_at', '>=', now()->subDay())
            ->each(function (AdvisorReminder $reminder): void {
                $this->pushReminder($reminder);
            });
    }

    private function pullChanges(GoogleAccount $account, Calendar $calendar): void
    {
        $options = [
            'singleEvents' => true,
            'showDeleted' => true,
        ];

        if ($account->calendar_sync_token) {
            $options['syncToken'] = $account->calendar_sync_token;
        } else {
            $options['timeMin'] = now()->subMonths(3)->toRfc3339String();
        }

        try {
            $events = $calendar->events->listEvents($account->calendar_id, $options);
        } catch (Throwable $exception) {
            if (str_contains($exception->getMessage(), '410')) {
                $account->forceFill(['calendar_sync_token' => null])->save();

                return;
            }

            throw $exception;
        }

        foreach ($events->getItems() as $event) {
            $this->applyInboundEvent($account, $event);
        }

        if ($events->getNextSyncToken()) {
            $account->forceFill(['calendar_sync_token' => $events->getNextSyncToken()])->save();
        }
    }

    private function applyInboundEvent(GoogleAccount $account, Event $event): void
    {
        $reminderId = $this->extractReminderId($event);

        if ($event->getStatus() === 'cancelled') {
            if ($reminderId) {
                AdvisorReminder::query()
                    ->where('advisor_id', $account->advisor_id)
                    ->whereKey($reminderId)
                    ->delete();
            } elseif ($event->getId()) {
                AdvisorReminder::query()
                    ->where('advisor_id', $account->advisor_id)
                    ->where('google_event_id', $event->getId())
                    ->delete();
            }

            return;
        }

        $start = $event->getStart()?->getDateTime() ?? $event->getStart()?->getDate();

        if (! $start) {
            return;
        }

        $remindAt = Carbon::parse($start);

        if ($reminderId) {
            $reminder = AdvisorReminder::query()
                ->where('advisor_id', $account->advisor_id)
                ->whereKey($reminderId)
                ->first();

            if ($reminder) {
                AdvisorReminder::withoutEvents(function () use ($reminder, $event, $remindAt): void {
                    $reminder->forceFill([
                        'title' => $event->getSummary() ?: $reminder->title,
                        'notes' => $event->getDescription(),
                        'remind_at' => $remindAt,
                        'google_event_id' => $event->getId(),
                        'google_updated_at' => now(),
                    ])->saveQuietly();
                });
            }

            return;
        }

        if (! $event->getId()) {
            return;
        }

        $existing = AdvisorReminder::query()
            ->where('advisor_id', $account->advisor_id)
            ->where('google_event_id', $event->getId())
            ->first();

        if ($existing) {
            AdvisorReminder::withoutEvents(function () use ($existing, $event, $remindAt): void {
                $existing->forceFill([
                    'title' => $event->getSummary() ?: 'Evento Google',
                    'notes' => $event->getDescription(),
                    'remind_at' => $remindAt,
                    'google_updated_at' => now(),
                ])->saveQuietly();
            });

            return;
        }

        AdvisorReminder::withoutEvents(function () use ($account, $event, $remindAt): void {
            AdvisorReminder::create([
                'advisor_id' => $account->advisor_id,
                'client_id' => null,
                'title' => $event->getSummary() ?: 'Evento Google',
                'notes' => $event->getDescription(),
                'remind_at' => $remindAt,
                'google_event_id' => $event->getId(),
                'source' => 'google',
                'google_updated_at' => now(),
            ]);
        });
    }

    private function fillEventFromReminder(Event $event, AdvisorReminder $reminder): Event
    {
        $start = $reminder->remind_at->copy();
        $end = $start->copy()->addMinutes(30);
        $completed = $reminder->completed_at !== null;

        $event->setSummary(($completed ? '✓ ' : '').$reminder->title);
        $event->setDescription($reminder->notes);
        $event->setStart(new EventDateTime([
            'dateTime' => $start->toRfc3339String(),
            'timeZone' => config('app.timezone'),
        ]));
        $event->setEnd(new EventDateTime([
            'dateTime' => $end->toRfc3339String(),
            'timeZone' => config('app.timezone'),
        ]));
        $event->setExtendedProperties([
            'private' => [
                config('google.reminder_private_property') => (string) $reminder->id,
            ],
        ]);

        return $event;
    }

    private function extractReminderId(Event $event): ?int
    {
        $property = config('google.reminder_private_property');
        $value = $event->getExtendedProperties()?->getPrivate()[$property] ?? null;

        return is_numeric($value) ? (int) $value : null;
    }
}
