<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\AttentionTicketType;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Project;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmAttentionTicketsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(ClientSeeder::class);
    }

    public function test_advisor_can_create_and_cancel_own_attention_ticket(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $ticketType = AttentionTicketType::factory()->create(['name' => 'Entrega', 'code' => 'ENTREGA']);

        $this->actingAs($advisor, 'advisor');

        $this->post(route('crm.attention-tickets.store'), [
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $ticketType->id,
            'notes' => 'Cliente solicita visita.',
        ])->assertRedirect(route('crm.attention-tickets.index'));

        $ticket = AttentionTicket::where('client_id', $client->id)->firstOrFail();
        $this->assertSame('pendiente', $ticket->status);

        $this->post(route('crm.attention-tickets.cancel', $ticket), [
            'notes' => 'Cliente canceló la cita.',
        ])->assertRedirect(route('crm.attention-tickets.index'));

        $this->assertSame('cancelado', $ticket->fresh()->status);
    }

    public function test_advisor_cannot_cancel_another_advisors_ticket(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $owner = Advisor::findOrFail($client->advisor_id);
        $otherAdvisor = Advisor::query()->whereKeyNot($owner->id)->firstOrFail();
        $project = Project::firstOrFail();
        $ticketType = AttentionTicketType::factory()->create();

        $ticket = AttentionTicket::create([
            'advisor_id' => $owner->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $ticketType->id,
            'status' => 'pendiente',
        ]);

        $this->actingAs($otherAdvisor, 'advisor');

        $this->post(route('crm.attention-tickets.cancel', $ticket))->assertNotFound();
    }

    public function test_index_paginates_tickets_instead_of_returning_everything(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $ticketType = AttentionTicketType::factory()->create();

        for ($i = 0; $i < 25; $i++) {
            AttentionTicket::create([
                'advisor_id' => $advisor->id,
                'client_id' => $client->id,
                'project_id' => $project->id,
                'attention_ticket_type_id' => $ticketType->id,
                'status' => 'pendiente',
            ]);
        }

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.attention-tickets.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('tickets.data', 20)
                ->has('tickets.links'));
    }

    public function test_index_filters_tickets_by_status(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $ticketType = AttentionTicketType::factory()->create();

        AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $ticketType->id,
            'status' => 'pendiente',
        ]);

        AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $ticketType->id,
            'status' => 'cancelado',
        ]);

        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.attention-tickets.index', ['status' => 'cancelado']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('tickets.data', 1)
                ->where('tickets.data.0.status', 'cancelado'));
    }
}
