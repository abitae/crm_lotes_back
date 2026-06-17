<?php

namespace Tests\Feature\Inmopro;

use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproReportsPdfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(LotStatusSeeder::class);
    }

    public function test_guests_cannot_access_reports_pdf(): void
    {
        $response = $this->get(route('inmopro.reports.pdf'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_receive_report_pdf(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        foreach (['projects', 'teams'] as $view) {
            $response = $this->get(route('inmopro.reports.pdf', ['view' => $view]));
            $response->assertOk();
            $response->assertHeader('Content-Type', 'application/pdf');
        }
    }

    public function test_report_pdf_can_be_served_as_attachment(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $url = route('inmopro.reports.pdf').'?'.http_build_query([
            'view' => 'projects',
            'disposition' => 'attachment',
        ]);
        $response = $this->get($url);

        $response->assertOk();
        $this->assertStringContainsString('attachment', (string) $response->headers->get('Content-Disposition'));
    }
}
