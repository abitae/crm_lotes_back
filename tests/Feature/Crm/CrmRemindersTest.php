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
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CrmRemindersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
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
                'remind_at' => now()->startOfDay()->addMinutes($i + 1),
            ]);
        }

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 20)
                ->has('reminders.links')
                ->where('filters.period', 'hoy'));
    }

    public function test_index_defaults_to_today_and_excludes_yesterday_and_tomorrow(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Ayer',
            'remind_at' => now()->subDay(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Hoy',
            'remind_at' => now(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Mañana',
            'remind_at' => now()->addDay(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 1)
                ->where('reminders.data.0.title', 'Hoy')
                ->where('filters.period', 'hoy'));
    }

    public function test_index_past_period_only_includes_before_today(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Hace dos días',
            'remind_at' => now()->subDays(2),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Ayer',
            'remind_at' => now()->subDay(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Hoy',
            'remind_at' => now(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index', ['period' => 'pasados']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 2)
                ->where('reminders.data.0.title', 'Ayer')
                ->where('reminders.data.1.title', 'Hace dos días')
                ->where('filters.period', 'pasados'));
    }

    public function test_index_upcoming_period_only_includes_after_today(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Hoy',
            'remind_at' => now(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Mañana',
            'remind_at' => now()->addDay(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index', ['period' => 'proximos']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 1)
                ->where('reminders.data.0.title', 'Mañana')
                ->where('filters.period', 'proximos'));
    }

    public function test_pendientes_period_lists_incomplete_reminders_across_days(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Ayer',
            'remind_at' => now()->subDay(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Hoy',
            'remind_at' => now(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Mañana',
            'remind_at' => now()->addDay(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Hecho',
            'remind_at' => now()->subHour(),
            'completed_at' => now(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index', ['period' => 'pendientes']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 3)
                ->where('filters.period', 'pendientes')
                ->where('reminders.data', fn ($rows) => collect($rows)->pluck('title')->sort()->values()->all() === ['Ayer', 'Hoy', 'Mañana']));
    }

    public function test_index_search_matches_title_and_client_name(): void
    {
        $advisor = Advisor::firstOrFail();
        $ana = $this->createClientForAdvisor($advisor, 'PROPIO', ['name' => 'Ana Torres']);
        $bruno = $this->createClientForAdvisor($advisor, 'PROPIO', ['name' => 'Bruno Diaz']);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $ana->id,
            'title' => 'Llamar a Ana',
            'remind_at' => now(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $bruno->id,
            'title' => 'Visita de lote',
            'remind_at' => now(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index', ['search' => 'Ana']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 1)
                ->where('reminders.data.0.title', 'Llamar a Ana'));

        $this->get(route('crm.reminders.index', ['search' => 'Bruno']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 1)
                ->where('reminders.data.0.client.name', 'Bruno Diaz'));
    }

    public function test_index_filters_by_client_and_hides_other_advisors_clients(): void
    {
        $advisor = Advisor::firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $ownClient = $this->createClientForAdvisor($advisor, 'PROPIO', ['name' => 'Cliente propio filtro']);
        $otherOwnClient = $this->createClientForAdvisor($advisor, 'PROPIO', ['name' => 'Otro cliente propio']);
        $foreignClient = $this->createClientForAdvisor($otherAdvisor, 'PROPIO', ['name' => 'Cliente ajeno']);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $ownClient->id,
            'title' => 'Propio',
            'remind_at' => now(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $otherOwnClient->id,
            'title' => 'Otro propio',
            'remind_at' => now(),
        ]);
        AdvisorReminder::create([
            'advisor_id' => $otherAdvisor->id,
            'client_id' => $foreignClient->id,
            'title' => 'Ajeno',
            'remind_at' => now(),
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index', ['client_id' => $ownClient->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reminders.data', 1)
                ->where('reminders.data.0.title', 'Propio')
                ->where('filters.client_id', (string) $ownClient->id));

        $this->get(route('crm.reminders.index', ['client_id' => $foreignClient->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('reminders.data', 0));
    }

    public function test_index_includes_google_event_id_when_synced(): void
    {
        $advisor = Advisor::firstOrFail();
        $client = $this->createClientForAdvisor($advisor);

        AdvisorReminder::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'title' => 'Sincronizado',
            'remind_at' => now(),
            'google_event_id' => 'evt_abc',
            'source' => 'crm',
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.reminders.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reminders.data.0.google_event_id', 'evt_abc')
                ->where('reminders.data.0.source', 'crm'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createClientForAdvisor(Advisor $advisor, string $typeCode = 'PROPIO', array $overrides = []): Client
    {
        $type = ClientType::query()->where('code', $typeCode)->firstOrFail();
        $city = City::firstOrFail();
        $suffix = (string) (81000000 + Client::query()->count() + $advisor->id);

        return Client::create(array_merge([
            'name' => 'Cliente test '.$suffix,
            'dni' => $suffix,
            'phone' => '9'.$suffix,
            'email' => 'test-reminder-'.$suffix.'@test.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ], $overrides));
    }
}
