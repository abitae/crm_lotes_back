<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\InmoproAuditLog;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\User;
use App\Services\Inmopro\ClientsIndexQuery;
use App\Support\ClientPhoneGuard;
use App\Support\InmoproPermissionSynchronizer;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;

class InmoproClientPhoneAndAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        ini_set('memory_limit', '512M');
        $this->withoutVite();
        InmoproPermissionSynchronizer::syncFromRoutes();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_user_without_view_phone_does_not_receive_client_phones(): void
    {
        $client = $this->makeClient([
            'name' => 'Cliente Sin Permiso Telefono',
            'phone' => '999111222',
        ]);
        $user = $this->restrictedUser([
            'inmopro.clients.index',
            'inmopro.clients.show',
        ]);

        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $this->actingAs($user)
            ->get(route('inmopro.clients.index', array_merge($defaults, [
                'search' => $client->name,
            ])))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/clients/index')
                ->where('clients.data.0.phone', null));

        $this->actingAs($user)
            ->get(route('inmopro.clients.show', $client))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/clients/show')
                ->where('client.phone', null));
    }

    public function test_user_with_view_phone_receives_client_phones(): void
    {
        $client = $this->makeClient([
            'name' => 'Cliente Con Permiso Telefono',
            'phone' => '999111222',
        ]);
        $user = $this->restrictedUser([
            'inmopro.clients.index',
            'inmopro.clients.show',
            ClientPhoneGuard::PERMISSION,
        ]);

        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $this->actingAs($user)
            ->get(route('inmopro.clients.index', array_merge($defaults, [
                'search' => $client->name,
            ])))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('clients.data.0.phone', '999111222'));

        $this->actingAs($user)
            ->get(route('inmopro.clients.show', $client))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('client.phone', '999111222'));
    }

    public function test_clients_excel_export_hides_phone_without_permission(): void
    {
        $client = $this->makeClient([
            'name' => 'Cliente Telefono Oculto Excel',
            'phone' => '999111222',
        ]);

        $user = $this->restrictedUser([
            'inmopro.clients.export-excel',
        ]);
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $response = $this->actingAs($user)
            ->get(route('inmopro.clients.export-excel', array_merge($defaults, [
                'search' => $client->name,
            ])));

        $response->assertOk()->assertDownload('clientes_vista.xlsx');

        $this->assertSame('', $this->excelPhoneForClientName($response->baseResponse, $client->name));
    }

    public function test_clients_excel_export_includes_phone_with_permission(): void
    {
        $client = $this->makeClient([
            'name' => 'Cliente Telefono Visible Excel',
            'phone' => '999111222',
        ]);

        $user = $this->restrictedUser([
            'inmopro.clients.export-excel',
            ClientPhoneGuard::PERMISSION,
        ]);
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $response = $this->actingAs($user)
            ->get(route('inmopro.clients.export-excel', array_merge($defaults, [
                'search' => $client->name,
            ])));

        $response->assertOk()->assertDownload('clientes_vista.xlsx');

        $this->assertSame('999111222', $this->excelPhoneForClientName($response->baseResponse, $client->name));
    }

    public function test_update_without_view_phone_does_not_overwrite_client_or_lot_phone(): void
    {
        $client = $this->makeClient(['phone' => '999111222']);
        $lotClient = $this->makeClient(['phone' => '988777666']);
        $originalPhone = $client->phone;
        $lotPhone = $lotClient->phone;

        $lot = $this->makeLot($lotClient);
        $statusId = $lot->lot_status_id;

        $user = $this->restrictedUser([
            'inmopro.clients.update',
            'inmopro.lots.update',
        ]);

        $this->actingAs($user)
            ->put(route('inmopro.clients.update', $client), [
                'name' => $client->name,
                'dni' => $client->dni,
                'phone' => '111111111',
                'email' => $client->email,
                'client_type_id' => $client->client_type_id,
                'advisor_id' => $client->advisor_id,
                'city_id' => $client->city_id,
            ])
            ->assertRedirect();

        $this->assertSame($originalPhone, $client->fresh()->phone);

        $this->actingAs($user)
            ->patch(route('inmopro.lots.update', $lot), [
                'lot_status_id' => $statusId,
                'client_id' => $lotClient->id,
                'advisor_id' => $lot->advisor_id,
                'client_name' => $lotClient->name,
                'client_dni' => $lotClient->dni,
                'client_phone' => '',
            ])
            ->assertRedirect();

        $this->assertSame($lotPhone, $lotClient->fresh()->phone);
    }

    public function test_export_and_update_create_audit_log_rows(): void
    {
        $client = $this->makeClient();
        $user = $this->restrictedUser([
            'inmopro.clients.update',
            'inmopro.clients.export-excel',
        ]);
        $defaults = app(ClientsIndexQuery::class)->defaultDateFilters();

        $this->actingAs($user)
            ->get(route('inmopro.clients.export-excel', $defaults))
            ->assertOk();

        $this->assertDatabaseHas('inmopro_audit_logs', [
            'user_id' => $user->id,
            'action' => 'clients.exported',
            'route_name' => 'inmopro.clients.export-excel',
        ]);

        $this->actingAs($user)
            ->put(route('inmopro.clients.update', $client), [
                'name' => $client->name,
                'dni' => $client->dni,
                'phone' => $client->phone,
                'email' => $client->email,
                'client_type_id' => $client->client_type_id,
                'advisor_id' => $client->advisor_id,
                'city_id' => $client->city_id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('inmopro_audit_logs', [
            'user_id' => $user->id,
            'action' => 'clients.updated',
            'route_name' => 'inmopro.clients.update',
        ]);

        $this->assertGreaterThanOrEqual(2, InmoproAuditLog::query()->count());
    }

    public function test_audit_index_requires_permission(): void
    {
        $forbidden = $this->restrictedUser(['inmopro.clients.index']);
        $allowed = $this->restrictedUser(['inmopro.audit.index']);

        $this->actingAs($forbidden)
            ->get(route('inmopro.audit.index'))
            ->assertForbidden();

        $this->actingAs($allowed)
            ->get(route('inmopro.audit.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/audit/index')
                ->has('logs')
                ->has('filters')
                ->has('users')
                ->has('actions'));
    }

    /**
     * @param  list<string>  $permissions
     */
    private function restrictedUser(array $permissions): User
    {
        $user = User::factory()->withoutSuperAdmin()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeClient(array $overrides = []): Client
    {
        $suffix = (string) random_int(100000, 999999);

        return Client::query()->create(array_merge([
            'name' => 'Cliente Test '.$suffix,
            'dni' => (string) random_int(10000000, 99999999),
            'phone' => '999111222',
            'email' => 'cliente-'.$suffix.'@correo.com',
            'client_type_id' => ClientType::query()->firstOrFail()->id,
            'advisor_id' => Advisor::query()->firstOrFail()->id,
            'city_id' => City::query()->firstOrFail()->id,
        ], $overrides));
    }

    private function makeLot(Client $client): Lot
    {
        return Lot::query()->create([
            'project_id' => Project::query()->firstOrFail()->id,
            'block' => 'Z',
            'number' => random_int(100, 999),
            'area' => 100,
            'price' => 35000,
            'lot_status_id' => LotStatus::query()->firstOrFail()->id,
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_dni' => $client->dni,
        ]);
    }

    private function excelPhoneForClientName(mixed $response, string $name): string
    {
        $this->assertInstanceOf(BinaryFileResponse::class, $response);

        $spreadsheet = IOFactory::load($response->getFile()->getPathname());
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

        foreach ($rows as $index => $row) {
            if ($index === 1) {
                continue;
            }

            if (($row['A'] ?? null) === $name) {
                return trim((string) ($row['C'] ?? ''));
            }
        }

        $this->fail('No se encontró la fila del cliente en el Excel exportado.');
    }
}
