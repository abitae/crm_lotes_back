<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\AttentionTicketType;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\User;
use App\Services\Inmopro\ClientsIndexQuery;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\AttentionTicketTypeSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class InmoproClientsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
    }

    public function test_guests_cannot_visit_clients_index(): void
    {
        $response = $this->get(route('inmopro.clients.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_clients_index(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $this->get(route('inmopro.clients.index'))
            ->assertRedirect(route('inmopro.clients.index', $defaults));

        $response = $this->get(route('inmopro.clients.index', $defaults));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/clients/index')
            ->where('filters.created_from', $defaults['created_from'])
            ->where('filters.created_to', $defaults['created_to'])
            ->where('filters.last_action_from', $defaults['last_action_from'])
            ->where('filters.last_action_to', $defaults['last_action_to'])
            ->where('filters.per_page', (string) ClientsIndexQuery::DEFAULT_PER_PAGE)
            ->has('clients')
            ->has('perPageOptions'));
    }

    public function test_clients_index_respects_per_page_parameter(): void
    {
        $user = User::factory()->create();
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();
        $this->actingAs($user);

        $this->get(route('inmopro.clients.index', array_merge($defaults, ['per_page' => 10])))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/clients/index')
                ->where('filters.per_page', '10')
                ->where('clients.per_page', 10)
                ->count('clients.data', 10));

        $this->get(route('inmopro.clients.index', array_merge($defaults, ['per_page' => 999])))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.per_page', (string) ClientsIndexQuery::DEFAULT_PER_PAGE)
                ->where('clients.per_page', ClientsIndexQuery::DEFAULT_PER_PAGE));
    }

    public function test_clients_index_does_not_redirect_when_date_filters_are_explicitly_cleared(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('inmopro.clients.index', [
            'created_from' => '',
            'created_to' => '',
            'last_action_from' => '',
            'last_action_to' => '',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/clients/index'));
    }

    public function test_authenticated_users_can_create_client(): void
    {
        $user = User::factory()->create();
        $type = ClientType::first();
        $advisor = Advisor::first();
        $city = City::first();
        $this->actingAs($user);

        $response = $this->post(route('inmopro.clients.store'), [
            'name' => 'Nuevo Cliente Test',
            'dni' => '12345678',
            'phone' => '999888777',
            'email' => 'test@example.com',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city?->id,
        ]);

        $response->assertRedirect(route('inmopro.clients.index', [
            'client_type_id' => (string) $type->id,
            'city_id' => (string) $city?->id,
            'advisor_id' => (string) $advisor->id,
        ]));
        $this->assertDatabaseHas('clients', [
            'name' => 'Nuevo Cliente Test',
            'dni' => '12345678',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
        ]);
    }

    public function test_authenticated_users_can_create_client_without_dni(): void
    {
        $user = User::factory()->create();
        $type = ClientType::first();
        $advisor = Advisor::first();
        $city = City::first();
        $this->actingAs($user);

        $this->post(route('inmopro.clients.store'), [
            'name' => 'Cliente Sin DNI',
            'dni' => '',
            'phone' => '900111222',
            'email' => null,
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city?->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente Sin DNI',
            'dni' => null,
            'phone' => '900111222',
        ]);
    }

    public function test_store_client_redirect_preserves_listing_query_string(): void
    {
        $user = User::factory()->create();
        $type = ClientType::first();
        $advisor = Advisor::first();
        $city = City::first();
        $this->actingAs($user);

        $response = $this->post(route('inmopro.clients.store', ['page' => '2', 'search' => 'Juan']), [
            'name' => 'Cliente Paginado',
            'dni' => '87654321',
            'phone' => '911222333',
            'email' => 'pag@test.com',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city?->id,
        ]);

        $response->assertRedirect(route('inmopro.clients.index', [
            'page' => '2',
            'search' => 'Juan',
            'client_type_id' => (string) $type->id,
            'city_id' => (string) $city?->id,
            'advisor_id' => (string) $advisor->id,
        ]));
    }

    public function test_authenticated_users_cannot_create_client_with_duplicate_dni_or_phone(): void
    {
        $user = User::factory()->create();
        $existing = Client::query()->with('advisor')->firstOrFail();
        $type = ClientType::first();
        $advisor = Advisor::first();
        $city = City::first();
        $this->actingAs($user);

        $this->post(route('inmopro.clients.store'), [
            'name' => 'Cliente Duplicado',
            'dni' => $existing->dni,
            'phone' => '888777666',
            'email' => 'dup@example.com',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city?->id,
        ])->assertSessionHasErrors(['duplicate_registration']);

        $this->post(route('inmopro.clients.store'), [
            'name' => 'Cliente Duplicado 2',
            'dni' => '33445566',
            'phone' => $existing->phone,
            'email' => 'dup2@example.com',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city?->id,
        ])->assertSessionHasErrors(['duplicate_registration']);
    }

    public function test_authenticated_users_cannot_update_client_to_duplicate_phone(): void
    {
        $user = User::factory()->create();
        $clients = Client::query()->orderBy('id')->take(2)->get();
        $client = $clients->first();
        $other = $clients->last();
        $this->assertNotSame($client->id, $other->id);
        $this->actingAs($user);

        $this->put(route('inmopro.clients.update', $client), [
            'name' => $client->name,
            'dni' => $client->dni,
            'phone' => $other->phone,
            'email' => $client->email,
            'client_type_id' => $client->client_type_id,
            'advisor_id' => $client->advisor_id,
            'city_id' => $client->city_id,
        ])->assertSessionHasErrors(['duplicate_registration']);
    }

    public function test_authenticated_users_can_update_client(): void
    {
        $user = User::factory()->create();
        $client = Client::first();
        $this->actingAs($user);

        $response = $this->put(route('inmopro.clients.update', $client), [
            'name' => 'Cliente Actualizado',
            'dni' => $client->dni,
            'phone' => $client->phone,
            'email' => $client->email,
            'client_type_id' => $client->client_type_id,
            'advisor_id' => $client->advisor_id,
            'city_id' => $client->city_id,
        ]);

        $response->assertRedirect(route('inmopro.clients.index', [
            'client_type_id' => (string) $client->client_type_id,
            'city_id' => (string) $client->city_id,
            'advisor_id' => (string) $client->advisor_id,
        ]));
        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'name' => 'Cliente Actualizado',
        ]);
    }

    public function test_clients_search_returns_json_with_like_match(): void
    {
        $user = User::factory()->create();
        $typeId = ClientType::first()->id;
        $advisorId = Advisor::first()->id;
        $this->actingAs($user);

        Client::create(['name' => 'Juan Perez', 'dni' => '11111111', 'phone' => '', 'client_type_id' => $typeId, 'advisor_id' => $advisorId]);
        Client::create(['name' => 'Maria Garcia', 'dni' => '22222222', 'phone' => '', 'client_type_id' => $typeId, 'advisor_id' => $advisorId]);

        $response = $this->getJson(route('inmopro.clients.search', ['q' => 'Juan']));
        $response->assertOk();
        $response->assertJsonFragment(['name' => 'Juan Perez']);

        $response2 = $this->getJson(route('inmopro.clients.search', ['q' => '2222']));
        $response2->assertOk();
        $response2->assertJsonFragment(['dni' => '22222222']);
    }

    public function test_clients_index_filters_by_advisor(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $type = ClientType::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();
        $this->actingAs($user);

        Client::create([
            'name' => 'Cliente Del Asesor Filtrado',
            'dni' => '66778899',
            'phone' => '966778899',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
            'created_at' => now(),
        ]);

        Client::create([
            'name' => 'Cliente De Otro Asesor',
            'dni' => '66778800',
            'phone' => '966778800',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $otherAdvisor->id,
            'created_at' => now(),
        ]);

        $response = $this->get(route('inmopro.clients.index', array_merge($defaults, [
            'advisor_id' => $advisor->id,
        ])));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/clients/index')
            ->where('filters.advisor_id', (string) $advisor->id)
            ->has('clients.data')
        );

        $clientAdvisorIds = collect($response->viewData('page')['props']['clients']['data'])
            ->pluck('advisor.id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $this->assertSame([$advisor->id], $clientAdvisorIds);
        $this->assertNotContains($otherAdvisor->id, $clientAdvisorIds);
    }

    public function test_clients_index_includes_advisor_name_for_table_column(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->with('team')->firstOrFail();
        $type = ClientType::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $client = Client::create([
            'name' => 'Cliente Columna Asesor',
            'dni' => '55667788',
            'phone' => '955667788',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
            'created_at' => now(),
        ]);

        $this->actingAs($user);

        $response = $this->get(route('inmopro.clients.index', array_merge($defaults, [
            'advisor_id' => $advisor->id,
            'search' => 'Cliente Columna Asesor',
        ])));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/clients/index')
            ->has('clients.data', 1)
            ->where('clients.data.0.id', $client->id)
            ->where('clients.data.0.advisor.id', $advisor->id)
            ->where('clients.data.0.advisor.name', $advisor->name)
        );
    }

    public function test_clients_index_orders_by_created_at_descending(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $older = Client::create([
            'name' => 'Orden Cliente Antiguo',
            'dni' => '10101010',
            'phone' => '910101010',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
            'created_at' => now()->subDay(),
        ]);

        $newer = Client::create([
            'name' => 'Orden Cliente Reciente',
            'dni' => '20202020',
            'phone' => '920202020',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
            'created_at' => now(),
        ]);

        $this->actingAs($user);

        $response = $this->get(route('inmopro.clients.index', array_merge($defaults, [
            'search' => 'Orden Cliente',
        ])));

        $response->assertOk();

        $ids = collect($response->viewData('page')['props']['clients']['data'])->pluck('id')->all();
        $this->assertSame([$newer->id, $older->id], $ids);
    }

    public function test_clients_index_filters_by_created_date_range(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->firstOrFail();
        $client->forceFill(['created_at' => '2024-03-10 12:00:00'])->save();
        $this->actingAs($user);

        $this->get(route('inmopro.clients.index', [
            'search' => $client->dni,
            'created_from' => '2024-03-01',
            'created_to' => '2024-03-31',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/clients/index')
                ->where('filters.created_from', '2024-03-01')
                ->where('filters.created_to', '2024-03-31')
                ->has('clients.data', 1)
                ->where('clients.data.0.id', $client->id));

        $this->get(route('inmopro.clients.index', [
            'search' => $client->dni,
            'created_from' => '2024-01-01',
            'created_to' => '2024-01-31',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('clients.data', 0));
    }

    public function test_clients_index_filters_by_last_action_on_attention_tickets(): void
    {
        $this->seed(AttentionTicketTypeSeeder::class);
        $this->seed(LotSeeder::class);

        $user = User::factory()->create();
        $client = Client::query()->firstOrFail();
        $lot = Lot::query()->firstOrFail();
        $lot->update(['client_id' => $client->id]);

        $ticket = AttentionTicket::query()->create([
            'advisor_id' => $client->advisor_id,
            'client_id' => $client->id,
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'attention_ticket_type_id' => AttentionTicketType::query()->firstOrFail()->id,
            'scheduled_at' => now(),
            'status' => 'pendiente',
        ]);
        $ticket->forceFill(['updated_at' => '2025-06-15 10:00:00'])->save();

        $this->actingAs($user);

        $this->get(route('inmopro.clients.index', [
            'search' => $client->dni,
            'last_action_kind' => 'avisos',
            'last_action_from' => '2025-06-01',
            'last_action_to' => '2025-06-30',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.last_action_kind', 'avisos')
                ->has('clients.data', 1)
                ->where('clients.data.0.id', $client->id));

        $this->get(route('inmopro.clients.index', [
            'search' => $client->dni,
            'last_action_kind' => 'avisos',
            'last_action_from' => '2025-01-01',
            'last_action_to' => '2025-01-31',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('clients.data', 0));
    }

    public function test_clients_index_filters_by_last_action_on_lots(): void
    {
        $this->seed(LotSeeder::class);

        $user = User::factory()->create();
        $client = Client::query()->firstOrFail();
        $lot = Lot::query()->firstOrFail();

        Lot::query()->where('client_id', $client->id)->update(['client_id' => null]);

        $lot->update(['client_id' => $client->id]);
        $lot->forceFill(['updated_at' => '2025-07-20 08:00:00'])->save();

        $this->actingAs($user);

        $this->get(route('inmopro.clients.index', [
            'search' => $client->dni,
            'last_action_kind' => 'lotes',
            'last_action_from' => '2025-07-01',
            'last_action_to' => '2025-07-31',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.last_action_kind', 'lotes')
                ->has('clients.data', 1)
                ->where('clients.data.0.id', $client->id));
    }

    public function test_clients_index_filters_by_last_action_on_reminders(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->firstOrFail();

        $reminder = AdvisorReminder::query()->create([
            'advisor_id' => $client->advisor_id,
            'client_id' => $client->id,
            'title' => 'Seguimiento test',
            'remind_at' => now()->addDay(),
        ]);
        $reminder->forceFill(['updated_at' => '2025-08-05 15:00:00'])->save();

        $this->actingAs($user);

        $this->get(route('inmopro.clients.index', [
            'search' => $client->dni,
            'last_action_kind' => 'recordatorios',
            'last_action_from' => '2025-08-01',
            'last_action_to' => '2025-08-31',
        ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.last_action_kind', 'recordatorios')
                ->has('clients.data', 1)
                ->where('clients.data.0.id', $client->id));
    }

    public function test_authenticated_users_can_export_clients_excel(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $response = $this->get(route('inmopro.clients.export-excel', $defaults));

        $response->assertOk();
        $response->assertDownload('clientes_vista.xlsx');
    }

    public function test_clients_export_excel_respects_same_filters_as_index(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->firstOrFail();
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();
        $this->actingAs($user);

        $indexResponse = $this->get(route('inmopro.clients.index', array_merge($defaults, [
            'advisor_id' => $advisor->id,
        ])));

        $indexResponse->assertOk();
        $expectedTotal = $indexResponse->viewData('page')['props']['clients']['total'];

        $exportResponse = $this->get(route('inmopro.clients.export-excel', array_merge($defaults, [
            'advisor_id' => $advisor->id,
        ])));

        $exportResponse->assertOk();
        $exportResponse->assertDownload('clientes_vista.xlsx');

        $this->assertNotNull($expectedTotal);
    }

    public function test_clients_export_excel_applies_default_date_filters_when_missing(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('inmopro.clients.export-excel'))
            ->assertOk()
            ->assertDownload('clientes_vista.xlsx');
    }

    public function test_authenticated_users_can_download_clients_excel_template(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('inmopro.clients.excel-template'))
            ->assertOk()
            ->assertDownload('plantilla_clientes.xlsx');
    }

    public function test_authenticated_users_can_preview_and_confirm_clients_import_from_excel(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $this->actingAs($user);

        $file = $this->makeClientsExcelFile([
            ['Nombre (*)', 'DNI', 'Telefono (*)', 'Email', 'Referido por', 'Tipo cliente (*)', 'Ciudad', 'Asesor (*)', 'Fecha registro (DD/MM/AAAA HH:MM)'],
            ['Cliente Excel', '44556677', '987654321', 'excel@test.com', 'Campana digital', $type->name, $city->name, $advisor->name, '28/01/2026 15:23'],
        ]);

        $previewResponse = $this->post(route('inmopro.clients.import-preview'), [
            'file' => $file,
        ]);

        $previewResponse
            ->assertOk()
            ->assertJsonPath('summary.valid', 1)
            ->assertJsonPath('summary.invalid', 0)
            ->assertJsonPath('can_import', true)
            ->assertJsonPath('rows.0.registered_at', '2026-01-28 15:23:00')
            ->assertJsonPath('rows.0.city', mb_strtoupper($city->name))
            ->assertJsonPath('rows.0.client_type', $type->name);

        $token = $previewResponse->json('token');
        $this->assertIsString($token);

        $this->post(route('inmopro.clients.import-confirm'), [
            'token' => $token,
        ])->assertRedirect(route('inmopro.clients.index'));

        $client = Client::query()->where('dni', '44556677')->firstOrFail();
        $this->assertSame('Cliente Excel', $client->name);
        $this->assertSame('987654321', $client->phone);
        $this->assertSame($advisor->id, $client->advisor_id);
        $this->assertSame($type->id, $client->client_type_id);
        $this->assertSame($city->id, $client->city_id);
        $this->assertSame('2026-01-28 15:23:00', $client->created_at?->format('Y-m-d H:i:s'));
    }

    public function test_clients_import_accepts_legacy_headers_without_fecha_registro(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $this->actingAs($user);

        $file = $this->makeClientsExcelFile([
            ['Nombre', 'DNI', 'Telefono', 'Email', 'Referido por', 'Tipo cliente', 'Ciudad', 'Asesor'],
            ['Cliente Legacy', '55667788', '912345678', 'legacy@test.com', null, $type->name, $city->name, $advisor->name],
        ]);

        $this->post(route('inmopro.clients.import-preview'), [
            'file' => $file,
        ])
            ->assertOk()
            ->assertJsonPath('can_import', true)
            ->assertJsonPath('rows.0.registered_at', null);
    }

    public function test_clients_import_allows_rows_without_dni(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $this->actingAs($user);

        $file = $this->makeClientsExcelFile([
            ['Nombre (*)', 'DNI', 'Telefono (*)', 'Email', 'Referido por', 'Tipo cliente (*)', 'Ciudad', 'Asesor (*)', 'Fecha registro (DD/MM/AAAA)'],
            ['Cliente Sin Dni', '', '955667788', null, null, $type->name, $city->name, $advisor->name, null],
        ]);

        $previewResponse = $this->post(route('inmopro.clients.import-preview'), [
            'file' => $file,
        ]);

        $previewResponse
            ->assertOk()
            ->assertJsonPath('can_import', true)
            ->assertJsonPath('rows.0.dni', null)
            ->assertJsonPath('rows.0.action', 'create');

        $token = $previewResponse->json('token');
        $this->assertIsString($token);

        $this->post(route('inmopro.clients.import-confirm'), [
            'token' => $token,
        ])->assertRedirect(route('inmopro.clients.index'));

        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente Sin Dni',
            'dni' => null,
            'phone' => '955667788',
        ]);
    }

    public function test_clients_import_preview_reports_missing_required_fields(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $file = $this->makeClientsExcelFile([
            ['Nombre (*)', 'DNI', 'Telefono (*)', 'Email', 'Referido por', 'Tipo cliente (*)', 'Ciudad', 'Asesor (*)', 'Fecha registro (DD/MM/AAAA)'],
            ['Cliente Invalido', '', '', 'correo-invalido', '', '', '', '', '32/13/2024'],
        ]);

        $this->post(route('inmopro.clients.import-preview'), [
            'file' => $file,
        ])
            ->assertOk()
            ->assertJsonPath('summary.valid', 0)
            ->assertJsonPath('summary.invalid', 1)
            ->assertJsonPath('can_import', false);
    }

    public function test_clients_import_uppercases_and_creates_missing_city(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $this->actingAs($user);

        $this->assertDatabaseMissing('cities', ['name' => 'TARAPOTO']);

        $file = $this->makeClientsExcelFile([
            ['Nombre (*)', 'DNI', 'Telefono (*)', 'Email', 'Referido por', 'Tipo cliente (*)', 'Ciudad', 'Asesor (*)', 'Fecha registro (DD/MM/AAAA)'],
            ['Cliente Ciudad Nueva', '66778899', '944332211', null, null, $type->name, 'tarapoto', $advisor->name, null],
        ]);

        $previewResponse = $this->post(route('inmopro.clients.import-preview'), [
            'file' => $file,
        ]);

        $previewResponse
            ->assertOk()
            ->assertJsonPath('can_import', true)
            ->assertJsonPath('rows.0.city', 'TARAPOTO')
            ->assertJsonPath('rows.0.action', 'create');

        $token = $previewResponse->json('token');
        $this->assertIsString($token);

        $this->post(route('inmopro.clients.import-confirm'), [
            'token' => $token,
        ])->assertRedirect(route('inmopro.clients.index'));

        $city = City::query()->where('name', 'TARAPOTO')->firstOrFail();
        $this->assertTrue($city->is_active);
        $this->assertDatabaseHas('clients', [
            'dni' => '66778899',
            'city_id' => $city->id,
            'name' => 'Cliente Ciudad Nueva',
        ]);
    }

    public function test_clients_import_skips_rows_with_existing_phone(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $this->actingAs($user);

        Client::query()->create([
            'name' => 'Cliente Existente',
            'dni' => '33445566',
            'phone' => '977111222',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $file = $this->makeClientsExcelFile([
            ['Nombre (*)', 'DNI', 'Telefono (*)', 'Email', 'Referido por', 'Tipo cliente (*)', 'Ciudad', 'Asesor (*)', 'Fecha registro (DD/MM/AAAA)'],
            ['Cliente Duplicado Telefono', '77889900', '977111222', null, null, $type->name, $city->name, $advisor->name, null],
            ['Cliente Nuevo', '88990011', '966555444', null, null, $type->name, $city->name, $advisor->name, null],
        ]);

        $previewResponse = $this->post(route('inmopro.clients.import-preview'), [
            'file' => $file,
        ]);

        $previewResponse
            ->assertOk()
            ->assertJsonPath('can_import', true)
            ->assertJsonPath('summary.valid', 1)
            ->assertJsonPath('summary.skipped', 1)
            ->assertJsonPath('summary.invalid', 0)
            ->assertJsonPath('rows.0.action', 'skip')
            ->assertJsonPath('rows.1.action', 'create');

        $token = $previewResponse->json('token');
        $this->assertIsString($token);

        $this->post(route('inmopro.clients.import-confirm'), [
            'token' => $token,
        ])->assertRedirect(route('inmopro.clients.index'));

        $this->assertDatabaseMissing('clients', [
            'dni' => '77889900',
        ]);
        $this->assertDatabaseHas('clients', [
            'dni' => '88990011',
            'phone' => '966555444',
            'name' => 'Cliente Nuevo',
        ]);
        $this->assertSame(1, Client::query()->where('phone', '977111222')->count());
        $this->assertSame('Cliente Existente', Client::query()->where('phone', '977111222')->value('name'));
    }

    public function test_authenticated_users_can_delete_client(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->firstOrFail();
        $this->actingAs($user);

        $this->delete(route('inmopro.clients.destroy', $client))
            ->assertRedirect(route('inmopro.clients.index'));

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    public function test_destroy_client_redirect_preserves_listing_query_string(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->firstOrFail();
        $this->actingAs($user);

        $this->delete(route('inmopro.clients.destroy', [
            'client' => $client,
            'page' => '2',
            'search' => 'Juan',
        ]))
            ->assertRedirect(route('inmopro.clients.index', [
                'page' => '2',
                'search' => 'Juan',
            ]));

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    private function makeClientsExcelFile(array $rows): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        foreach ($rows as $rowIndex => $row) {
            foreach ($row as $columnIndex => $value) {
                $sheet->setCellValueByColumnAndRow($columnIndex + 1, $rowIndex + 1, $value);
            }
        }

        $path = tempnam(sys_get_temp_dir(), 'clients_excel_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($path);

        return new UploadedFile(
            $path,
            'clientes.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );
    }
}
