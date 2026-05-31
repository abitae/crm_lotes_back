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
use Illuminate\Testing\TestResponse;
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
        $ticketType = AttentionTicketType::general();

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson(route('api.v1.cazador.attention-tickets.store'), [
                'client_id' => $client->id,
                'project_id' => $project->id,
                'attention_ticket_type_id' => $ticketType->id,
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

    public function test_advisor_can_list_active_attention_ticket_types(): void
    {
        $advisor = Advisor::firstOrFail();
        $activeType = AttentionTicketType::factory()->create([
            'name' => 'Visita',
            'code' => 'VISITA',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        AttentionTicketType::factory()->create([
            'name' => 'Inactivo',
            'code' => 'INACTIVO',
            'is_active' => false,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->getJson(route('api.v1.cazador.attention-ticket-types.index'))
            ->assertOk()
            ->assertJsonPath('data.0.id', AttentionTicketType::general()->id)
            ->assertJsonFragment([
                'id' => $activeType->id,
                'name' => 'Visita',
                'code' => 'VISITA',
            ])
            ->assertJsonMissing(['code' => 'INACTIVO']);
    }

    public function test_store_requires_attention_ticket_type_id(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();

        $this->authenticatedPost($advisor, route('api.v1.cazador.attention-tickets.store'), [
            'client_id' => $client->id,
            'project_id' => $project->id,
            'notes' => 'Sin tipo.',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attention_ticket_type_id']);
    }

    public function test_store_rejects_inactive_attention_ticket_type(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $client = Client::where('client_type_id', $ownType->id)->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $inactiveType = AttentionTicketType::factory()->create(['is_active' => false]);

        $this->authenticatedPost($advisor, route('api.v1.cazador.attention-tickets.store'), [
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $inactiveType->id,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attention_ticket_type_id']);
    }

    public function test_advisor_cannot_create_attention_ticket_for_client_of_another_advisor(): void
    {
        $ownType = ClientType::where('code', 'PROPIO')->firstOrFail();
        $advisor = Advisor::firstOrFail();
        $foreignClient = Client::where('client_type_id', $ownType->id)
            ->where('advisor_id', '!=', $advisor->id)
            ->firstOrFail();
        $project = Project::firstOrFail();

        $this->authenticatedPost($advisor, route('api.v1.cazador.attention-tickets.store'), [
            'client_id' => $foreignClient->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => AttentionTicketType::general()->id,
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

    /**
     * @param  array<string, mixed>  $payload
     */
    private function authenticatedPost(Advisor $advisor, string $uri, array $payload): TestResponse
    {
        return $this->withHeader('Authorization', 'Bearer '.$this->loginToken($advisor))
            ->postJson($uri, $payload);
    }

    private function loginToken(Advisor $advisor): string
    {
        return $this->postJson(route('api.v1.cazador.auth.login'), [
            'username' => $advisor->username,
            'pin' => '123456',
        ])->json('token');
    }
}
