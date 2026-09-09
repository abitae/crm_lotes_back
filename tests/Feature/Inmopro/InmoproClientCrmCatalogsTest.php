<?php

namespace Tests\Feature\Inmopro;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproClientCrmCatalogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_status_and_tag_admin_pages_are_removed(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/inmopro/client-statuses')
            ->assertNotFound();

        $this->actingAs($user)
            ->get('/inmopro/client-tags')
            ->assertNotFound();

        $this->actingAs($user)
            ->post('/inmopro/client-statuses', ['name' => 'En espera'])
            ->assertNotFound();

        $this->actingAs($user)
            ->post('/inmopro/client-tags', ['name' => 'Prioridad'])
            ->assertNotFound();
    }
}
