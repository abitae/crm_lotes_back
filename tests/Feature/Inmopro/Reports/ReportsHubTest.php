<?php

namespace Tests\Feature\Inmopro\Reports;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsHubTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_view_reports_hub(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/reports/index')
                ->has('reports', 10)
                ->has('reportSettingsUrl'));
    }
}
