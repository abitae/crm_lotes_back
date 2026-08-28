<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmRemindersTest extends TestCase
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
        $this->seed(ClientSeeder::class);
    }

    public function test_advisor_can_create_and_complete_own_reminder(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.reminders.store'), [
            'client_id' => $client->id,
            'title' => 'Llamar al cliente',
            'remind_at' => '2026-03-20T09:00:00',
        ])->assertRedirect(route('crm.reminders.index'));

        $reminder = AdvisorReminder::where('client_id', $client->id)->firstOrFail();

        $this->post(route('crm.reminders.complete', $reminder))->assertRedirect(route('crm.reminders.index'));

        $this->assertNotNull($reminder->fresh()->completed_at);
    }

    public function test_advisor_cannot_complete_another_advisors_reminder(): void
    {
        $advisor1 = Advisor::firstOrFail();
        $advisor2 = Advisor::skip(1)->firstOrFail();
        $client2 = $this->createClientForAdvisor($advisor2);

        $reminder = AdvisorReminder::create([
            'advisor_id' => $advisor2->id,
            'client_id' => $client2->id,
            'title' => 'Recordatorio de otro',
            'remind_at' => now(),
        ]);

        $this->actingAs($advisor1, 'advisor');

        $this->post(route('crm.reminders.complete', $reminder))->assertNotFound();
    }

    public function test_advisor_can_delete_own_reminder(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $reminder = AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Recordatorio a eliminar',
            'remind_at' => now(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->delete(route('crm.reminders.destroy', $reminder))->assertRedirect(route('crm.reminders.index'));

        $this->assertModelMissing($reminder);
    }

    public function test_index_paginates_reminders_instead_of_returning_everything(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        for ($i = 0; $i < 25; $i++) {
            AdvisorReminder::create([
                'advisor_id' => $advisor->id,
                'client_id' => $client->id,
                'title' => 'Recordatorio '.$i,
                'remind_at' => now()->addDays($i),
            ]);
        }

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('reminders.data', 20)
                ->has('reminders.links'));
    }

    private function createClientForAdvisor(Advisor $advisor, string $typeCode = 'PROPIO'): Client
    {
        $type = ClientType::query()->where('code', $typeCode)->firstOrFail();
        $city = City::firstOrFail();

        return Client::create([
            'name' => 'Cliente test',
            'dni' => (string) (80000000 + $advisor->id),
            'phone' => '999999999',
            'email' => 'test'.$advisor->id.'@test.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
    }
}
