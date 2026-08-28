<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Notifications\Crm\ReminderDueNotification;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotifyDueRemindersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_command_notifies_exactly_once_per_due_and_unnotified_reminder(): void
    {
        Notification::fake();

        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        $due = AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Vencido',
            'remind_at' => now()->subHour(),
        ]);

        $notYetDue = AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Futuro',
            'remind_at' => now()->addHour(),
        ]);

        $alreadyCompleted = AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Completado',
            'remind_at' => now()->subHour(),
            'completed_at' => now(),
        ]);

        $this->artisan('reminders:notify-due')->assertExitCode(0);

        Notification::assertSentTo($advisor, ReminderDueNotification::class, function ($notification) use ($advisor, $due) {
            return $notification->toMail($advisor)->subject === 'Recordatorio pendiente: '.$due->title;
        });
        Notification::assertCount(1);

        $this->assertNotNull($due->fresh()->notified_at);
        $this->assertNull($notYetDue->fresh()->notified_at);
        $this->assertNull($alreadyCompleted->fresh()->notified_at);
    }

    public function test_command_does_not_notify_the_same_reminder_twice(): void
    {
        Notification::fake();

        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Vencido',
            'remind_at' => now()->subHour(),
        ]);

        $this->artisan('reminders:notify-due')->assertExitCode(0);
        $this->artisan('reminders:notify-due')->assertExitCode(0);

        Notification::assertCount(1);
    }

    private function createClientForAdvisor(Advisor $advisor): Client
    {
        $type = ClientType::query()->where('code', 'PROPIO')->firstOrFail();
        $city = City::firstOrFail();

        return Client::create([
            'name' => 'Cliente notify test',
            'dni' => (string) (83000000 + $advisor->id),
            'phone' => '966666666',
            'email' => 'notify'.$advisor->id.'@test.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
    }
}
