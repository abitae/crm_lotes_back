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
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CrmAgendaTest extends TestCase
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

    public function test_agenda_only_shows_own_reminders(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $client = $this->createClientForAdvisor($advisor);
        $otherClient = $this->createClientForAdvisor($otherAdvisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Recordatorio propio',
            'remind_at' => now()->addDay(),
        ]);

        AdvisorReminder::create([
            'advisor_id' => $otherAdvisor->id,
            'client_id' => $otherClient->id,
            'title' => 'Recordatorio ajeno',
            'remind_at' => now()->addDay(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.agenda.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('events', 1)
                ->where('events.0.extendedProps.client', $client->name));
    }

    public function test_agenda_excludes_reminders_outside_the_visible_window(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Dentro de la ventana',
            'remind_at' => now()->addMonths(2),
        ]);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Muy en el pasado',
            'remind_at' => now()->subYears(2),
        ]);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Muy en el futuro',
            'remind_at' => now()->addYears(3),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.agenda.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('events', 1)
                ->where('events.0.extendedProps.title', 'Dentro de la ventana'));
    }

    private function createClientForAdvisor(Advisor $advisor, string $typeCode = 'PROPIO'): Client
    {
        $type = ClientType::query()->where('code', $typeCode)->firstOrFail();
        $city = City::firstOrFail();

        return Client::create([
            'name' => 'Cliente agenda test',
            'dni' => (string) (82000000 + $advisor->id),
            'phone' => '977777777',
            'email' => 'agenda'.$advisor->id.'@test.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
    }
}
