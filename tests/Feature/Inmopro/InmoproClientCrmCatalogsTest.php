<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientStatusSeeder;
use Database\Seeders\Inmopro\ClientTagSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproClientCrmCatalogsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientStatusSeeder::class);
        $this->seed(ClientTagSeeder::class);
    }

    public function test_authenticated_users_can_visit_client_statuses_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.client-statuses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/client-statuses/index')
                ->has('clientStatuses')
                ->where('clientStatuses.data.0.advisor.name', Advisor::query()->orderBy('id')->value('name')));
    }

    public function test_authenticated_users_cannot_create_client_status(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('inmopro.client-statuses.store'), [
                'name' => 'En espera',
                'code' => 'EN_ESPERA',
                'description' => 'Esperando respuesta',
                'color' => '#111111',
                'sort_order' => 9,
                'is_active' => true,
            ])
            ->assertForbidden();
    }

    public function test_authenticated_users_can_visit_client_tags_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.client-tags.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/client-tags/index')->has('clientTags'));
    }

    public function test_authenticated_users_cannot_create_client_tag(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('inmopro.client-tags.store'), [
                'name' => 'Prioridad',
                'code' => 'PRIORIDAD',
                'description' => 'Alta prioridad',
                'color' => '#222222',
                'sort_order' => 9,
                'is_active' => true,
            ])
            ->assertForbidden();
    }

    public function test_authenticated_users_cannot_update_or_delete_seeded_status_and_tag(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::query()->firstOrFail();
        $status = $advisor->clientStatuses()->where('code', 'NUEVO')->firstOrFail();
        $tag = $advisor->clientTags()->where('code', 'FRIO')->firstOrFail();

        $this->actingAs($user)
            ->put(route('inmopro.client-statuses.update', $status), [
                'name' => 'Nuevo actualizado',
                'code' => $status->code,
                'description' => 'Actualizado',
                'color' => '#333333',
                'sort_order' => 1,
                'is_active' => true,
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->put(route('inmopro.client-tags.update', $tag), [
                'name' => 'Frío actualizado',
                'code' => $tag->code,
                'description' => 'Actualizado',
                'color' => '#444444',
                'sort_order' => 4,
                'is_active' => true,
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->delete(route('inmopro.client-statuses.destroy', $status))
            ->assertForbidden();

        $this->actingAs($user)
            ->delete(route('inmopro.client-tags.destroy', $tag))
            ->assertForbidden();
    }
}
