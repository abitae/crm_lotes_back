<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Datero;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DateroManagementTest extends TestCase
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

    public function test_authenticated_user_can_view_dateros_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.dateros.index'))
            ->assertRedirect();

        $this->actingAs($user)
            ->get(route('inmopro.dateros.index', [
                'created_from' => now()->startOfMonth()->toDateString(),
                'created_to' => now()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/dateros/index')
                ->has('dateros')
                ->has('cities')
                ->has('advisors')
                ->has('filters')
                ->has('perPageOptions'));
    }

    public function test_dateros_index_filters_by_advisor_and_active_status(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->orderBy('id')->firstOrFail();
        $otherAdvisor = Advisor::query()->whereKeyNot($advisor->id)->firstOrFail();
        $city = City::firstOrFail();
        $this->actingAs($user);

        Datero::create([
            'advisor_id' => $advisor->id,
            'name' => 'Datero Activo Filtro',
            'phone' => '911100001',
            'email' => 'activo_filtro@test.com',
            'city_id' => $city->id,
            'dni' => '50110001',
            'username' => 'datero_activo_filtro',
            'pin' => '123456',
            'is_active' => true,
        ]);

        Datero::create([
            'advisor_id' => $otherAdvisor->id,
            'name' => 'Datero Inactivo Otro',
            'phone' => '911100002',
            'email' => 'inactivo_otro@test.com',
            'city_id' => $city->id,
            'dni' => '50110002',
            'username' => 'datero_inactivo_otro',
            'pin' => '123456',
            'is_active' => false,
        ]);

        $this->actingAs($user)
            ->get(route('inmopro.dateros.index', [
                'advisor_id' => $advisor->id,
                'is_active' => '1',
                'created_from' => now()->subYear()->toDateString(),
                'created_to' => now()->addDay()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/dateros/index')
                ->where('dateros.data', function ($data): bool {
                    $names = collect($data)->pluck('name');

                    return $names->contains('Datero Activo Filtro')
                        && ! $names->contains('Datero Inactivo Otro');
                }));
    }

    public function test_store_redirect_preserves_listing_filters(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->orderBy('id')->firstOrFail();
        $city = City::firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.dateros.store', [
                'search' => 'demo',
                'created_from' => now()->startOfMonth()->toDateString(),
                'created_to' => now()->toDateString(),
            ]), [
                'advisor_id' => $advisor->id,
                'name' => 'Datero Demo',
                'phone' => '999888777',
                'email' => 'datero@example.com',
                'city_id' => $city->id,
                'dni' => '40123456',
                'username' => 'datero_demo',
                'pin' => '654321',
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.dateros.index', [
                'search' => 'demo',
                'created_from' => now()->startOfMonth()->toDateString(),
                'created_to' => now()->toDateString(),
            ]))
            ->assertSessionHas('success');
    }

    public function test_authenticated_user_can_create_datero(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->orderBy('id')->firstOrFail();
        $city = City::firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.dateros.store'), [
                'advisor_id' => $advisor->id,
                'name' => 'Datero Demo',
                'phone' => '999888777',
                'email' => 'datero@example.com',
                'city_id' => $city->id,
                'dni' => '40123456',
                'username' => 'datero_demo',
                'pin' => '654321',
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.dateros.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('dateros', [
            'advisor_id' => $advisor->id,
            'name' => 'Datero Demo',
            'dni' => '40123456',
            'username' => 'datero_demo',
            'is_active' => true,
        ]);

        $datero = Datero::query()->where('username', 'datero_demo')->firstOrFail();
        $this->assertNotSame('654321', $datero->getRawOriginal('pin'));
    }

    public function test_store_requires_advisor_id_and_dni(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('inmopro.dateros.store'), [
                'name' => 'X',
                'phone' => '1',
                'email' => 'x@y.com',
                'username' => 'u1',
                'pin' => '123456',
            ])
            ->assertSessionHasErrors(['advisor_id', 'dni', 'city_id']);
    }

    public function test_datero_username_cannot_match_existing_advisor_username(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->whereNotNull('username')->firstOrFail();
        $city = City::firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.dateros.store'), [
                'advisor_id' => $advisor->id,
                'name' => 'Datero',
                'phone' => '911111111',
                'email' => 'd2@example.com',
                'city_id' => $city->id,
                'dni' => '41111111',
                'username' => $advisor->username,
                'pin' => '123456',
                'is_active' => true,
            ])
            ->assertSessionHasErrors('username');
    }

    public function test_update_without_pin_preserves_existing_hash(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->orderBy('id')->firstOrFail();
        $city = City::firstOrFail();

        $this->actingAs($user)
            ->post(route('inmopro.dateros.store'), [
                'advisor_id' => $advisor->id,
                'name' => 'Datero PIN',
                'phone' => '922222222',
                'email' => 'pin@example.com',
                'city_id' => $city->id,
                'dni' => '42222222',
                'username' => 'datero_pin_user',
                'pin' => '111222',
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.dateros.index'));

        $datero = Datero::query()->where('username', 'datero_pin_user')->firstOrFail();
        $hashBefore = $datero->getRawOriginal('pin');

        $this->actingAs($user)
            ->put(route('inmopro.dateros.update', $datero), [
                'advisor_id' => $advisor->id,
                'name' => 'Datero PIN Actualizado',
                'phone' => '922222222',
                'email' => 'pin@example.com',
                'city_id' => $city->id,
                'dni' => '42222222',
                'username' => 'datero_pin_user',
                'pin' => null,
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.dateros.index'));

        $datero->refresh();
        $this->assertSame($hashBefore, $datero->getRawOriginal('pin'));
        $this->assertSame('Datero PIN Actualizado', $datero->name);
    }

    public function test_advisor_has_many_dateros_relation(): void
    {
        $advisor = Advisor::query()->orderBy('id')->firstOrFail();
        $city = City::firstOrFail();
        Datero::create([
            'advisor_id' => $advisor->id,
            'name' => 'Rel Test',
            'phone' => '900000001',
            'email' => 'rel@example.com',
            'city_id' => $city->id,
            'dni' => '43333333',
            'username' => 'datero_rel',
            'pin' => '123456',
            'is_active' => true,
        ]);

        $advisor->load('dateros');
        $this->assertCount(1, $advisor->dateros);
        $this->assertSame('Rel Test', $advisor->dateros->first()->name);
    }
}
