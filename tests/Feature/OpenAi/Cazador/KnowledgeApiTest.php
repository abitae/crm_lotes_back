<?php

namespace Tests\Feature\OpenAi\Cazador;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KnowledgeApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['openai_cazador.enabled' => true]);
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
        $this->seed(LotSeeder::class);
    }

    public function test_knowledge_projects_index_requires_authentication(): void
    {
        $this->getJson(route('api.v1.cazador.openai.knowledge.projects.index'))
            ->assertUnauthorized();
    }

    public function test_advisor_can_list_active_projects_via_knowledge_api(): void
    {
        $advisor = Advisor::firstOrFail();
        $inactive = Project::query()->firstOrFail();
        $inactive->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.openai.knowledge.projects.index'))
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($inactive->id, $ids);
        $this->assertGreaterThan(0, count($ids));
    }

    public function test_inactive_project_returns_not_found_on_knowledge_show(): void
    {
        $advisor = Advisor::firstOrFail();
        $project = Project::query()->firstOrFail();
        $project->update(['is_active' => false]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.openai.knowledge.projects.show', $project))
            ->assertNotFound();
    }

    public function test_knowledge_lots_do_not_expose_client_or_advisor(): void
    {
        $advisor = Advisor::firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.openai.knowledge.lots.index'))
            ->assertOk();

        foreach ($response->json('data') as $row) {
            $this->assertArrayNotHasKey('client', $row);
            $this->assertArrayNotHasKey('advisor', $row);
            $this->assertSame('LIBRE', $row['status']['code'] ?? null);
        }
    }

    public function test_knowledge_lots_exclude_non_available_by_default(): void
    {
        $advisor = Advisor::firstOrFail();
        $nonFreeLot = Lot::query()
            ->whereHas('status', fn ($query) => $query->where('code', '!=', 'LIBRE'))
            ->first();

        if ($nonFreeLot === null) {
            $nonFreeLot = Lot::query()->firstOrFail();
            $reservedStatus = LotStatus::query()->where('code', 'RESERVADO')->firstOrFail();
            $nonFreeLot->update(['lot_status_id' => $reservedStatus->id]);
            $nonFreeLot->refresh();
        }

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.openai.knowledge.lots.index'))
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($nonFreeLot->id, $ids);
    }

    public function test_knowledge_lots_can_include_non_available_when_disabled(): void
    {
        $advisor = Advisor::firstOrFail();
        $total = Lot::query()->whereHas('project', fn ($q) => $q->active())->count();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.openai.knowledge.lots.index', ['available_only' => false]))
            ->assertOk();

        $this->assertCount($total, $response->json('data'));
    }

    public function test_knowledge_returns_service_unavailable_when_module_disabled(): void
    {
        config(['openai_cazador.enabled' => false]);
        $advisor = Advisor::firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.openai.knowledge.projects.index'))
            ->assertStatus(503);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->assertOk()->json('token');
    }
}
