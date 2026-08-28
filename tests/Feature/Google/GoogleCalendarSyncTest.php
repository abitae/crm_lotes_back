<?php

namespace Tests\Feature\Google;

use App\Jobs\SyncReminderToGoogleCalendarJob;
use App\Models\GoogleAccount;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class GoogleCalendarSyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(CitySeeder::class);
        Queue::fake();
    }

    public function test_creating_reminder_dispatches_google_sync_job(): void
    {
        $advisor = Advisor::firstOrFail();
        GoogleAccount::create([
            'google_sub' => 'sub-calendar',
            'email' => strtolower((string) $advisor->email),
            'advisor_id' => $advisor->id,
            'refresh_token' => 'refresh-token',
            'scopes' => array_merge(config('google.scopes.login'), config('google.scopes.calendar')),
        ]);

        $clientType = ClientType::query()->where('code', 'PROPIO')->firstOrFail();

        $client = Client::create([
            'name' => 'Cliente test',
            'phone' => '999000111',
            'email' => 'cliente@test.com',
            'dni' => '12345678',
            'client_type_id' => $clientType->id,
            'city_id' => $advisor->city_id,
            'advisor_id' => $advisor->id,
        ]);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Llamar cliente',
            'remind_at' => now()->addDay(),
            'source' => 'crm',
        ]);

        Queue::assertPushed(SyncReminderToGoogleCalendarJob::class);
    }

    public function test_google_imported_reminder_can_exist_without_client(): void
    {
        $advisor = Advisor::firstOrFail();

        $reminder = AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => null,
            'title' => 'Evento Google',
            'remind_at' => now()->addDay(),
            'source' => 'google',
            'google_event_id' => 'evt_123',
        ]);

        $this->assertNull($reminder->client_id);
        $this->assertSame('google', $reminder->source);
    }
}
