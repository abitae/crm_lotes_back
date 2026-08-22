<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\User;
use Database\Seeders\Inmopro\ClientStatusSeeder;
use Database\Seeders\Inmopro\ClientTagSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproClientCrmCatalogsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(ClientStatusSeeder::class);
        $this->seed(ClientTagSeeder::class);
    }

    public function test_authenticated_users_can_visit_client_statuses_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.client-statuses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/client-statuses/index')->has('clientStatuses'));
    }

    public function test_authenticated_users_can_create_client_status(): void
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
            ->assertRedirect(route('inmopro.client-statuses.index'));

        $this->assertDatabaseHas('client_statuses', [
            'name' => 'En espera',
            'code' => 'EN_ESPERA',
        ]);
    }

    public function test_authenticated_users_can_visit_client_tags_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.client-tags.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/client-tags/index')->has('clientTags'));
    }

    public function test_authenticated_users_can_create_client_tag(): void
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
            ->assertRedirect(route('inmopro.client-tags.index'));

        $this->assertDatabaseHas('client_tags', [
            'name' => 'Prioridad',
            'code' => 'PRIORIDAD',
        ]);
    }

    public function test_authenticated_users_can_update_seeded_status_and_tag(): void
    {
        $user = User::factory()->create();
        $status = ClientStatus::query()->where('code', 'NUEVO')->firstOrFail();
        $tag = ClientTag::query()->where('code', 'FRIO')->firstOrFail();

        $this->actingAs($user)
            ->put(route('inmopro.client-statuses.update', $status), [
                'name' => 'Nuevo actualizado',
                'code' => $status->code,
                'description' => 'Actualizado',
                'color' => '#333333',
                'sort_order' => 1,
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.client-statuses.index'));

        $this->actingAs($user)
            ->put(route('inmopro.client-tags.update', $tag), [
                'name' => 'Frío actualizado',
                'code' => $tag->code,
                'description' => 'Actualizado',
                'color' => '#444444',
                'sort_order' => 4,
                'is_active' => true,
            ])
            ->assertRedirect(route('inmopro.client-tags.index'));

        $this->assertDatabaseHas('client_statuses', [
            'id' => $status->id,
            'name' => 'Nuevo actualizado',
        ]);
        $this->assertDatabaseHas('client_tags', [
            'id' => $tag->id,
            'name' => 'Frío actualizado',
        ]);
    }
}
