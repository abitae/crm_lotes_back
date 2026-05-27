<?php

namespace Tests\Feature\Api\Cazador;

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

class CazadorAttentionTicketsTest extends TestCase
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

    public function test_advisor_can_create_attention_ticket_for_own_client(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $ticketType = AttentionTicketType::factory()->create(['name' => 'Entrega', 'code' => 'ENTREGA']);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.attention-tickets.store'), [
                'client_id' => $client->id,
                'project_id' => $project->id,
                'attention_ticket_type_id' => $ticketType->id,
                'notes' => 'Cliente solicita visita.',
            ])
            ->assertCreated()
            ->assertJsonFragment(['status' => 'pendiente'])
            ->assertJsonPath('data.type.id', $ticketType->id);

        $this->assertDatabaseHas('attention_tickets', [
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $ticketType->id,
            'status' => 'pendiente',
        ]);
    }

    public function test_advisor_can_create_attention_ticket_for_owned_datero_client(): void
    {
        $dateroType = ClientType::where('code', 'DATERO')->firstOrFail();
        $client = Client::where('client_type_id', $dateroType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $generalType = AttentionTicketType::general();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.attention-tickets.store'), [
                'client_id' => $client->id,
                'project_id' => $project->id,
            ])
            ->assertCreated()
            ->assertJsonFragment(['status' => 'pendiente'])
            ->assertJsonPath('data.type.id', $generalType->id);

        $this->assertDatabaseHas('attention_tickets', [
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $generalType->id,
            'status' => 'pendiente',
        ]);
    }

    public function test_advisor_cannot_create_attention_ticket_for_client_of_another_advisor(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $advisor = Advisor::firstOrFail();
        $foreignClient = Client::where('client_type_id', $ownType->id)
            ->where('advisor_id', '!=', $advisor->id)
            ->firstOrFail();
        $project = Project::firstOrFail();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.attention-tickets.store'), [
                'client_id' => $foreignClient->id,
                'project_id' => $project->id,
            ])
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'El cliente debe pertenecer al vendedor y ser PROPIO o DATERO.']);
    }

    public function test_advisor_can_cancel_owned_attention_ticket(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => AttentionTicketType::general()->id,
            'status' => 'pendiente',
            'notes' => 'Pendiente de revisión',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.attention-tickets.cancel', $ticket), [
                'notes' => 'El cliente pidió cancelar la solicitud.',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'cancelado']);

        $this->assertDatabaseHas('attention_tickets', [
            'id' => $ticket->id,
            'status' => 'cancelado',
        ]);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->json('token');
    }
}
