<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\AttentionTicketType;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\Project;
use App\Models\User;
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

class InmoproAttentionTicketsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
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

    public function test_guests_cannot_visit_attention_tickets_index(): void
    {
        $response = $this->get(route('inmopro.attention-tickets.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_attention_tickets_index(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.attention-tickets.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('inmopro/operations/attention-tickets/index')->has('tickets'));
    }

    public function test_authenticated_users_can_manage_attention_ticket_types(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('inmopro.attention-ticket-types.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('inmopro/attention-ticket-types/index')->has('types'));

        $this->post(route('inmopro.attention-ticket-types.store'), [
            'name' => 'Entrega de lote',
            'code' => 'ENTREGA_LOTE',
            'description' => 'Agenda de entregas',
            'color' => '#16a34a',
            'allows_overlap' => false,
            'is_active' => true,
            'sort_order' => 5,
        ])->assertRedirect(route('inmopro.attention-ticket-types.index'));

        $type = AttentionTicketType::where('code', 'ENTREGA_LOTE')->firstOrFail();

        $this->put(route('inmopro.attention-ticket-types.update', $type), [
            'name' => 'Entrega programada',
            'code' => 'ENTREGA_LOTE',
            'description' => 'Agenda de entregas',
            'color' => '#0ea5e9',
            'allows_overlap' => true,
            'is_active' => true,
            'sort_order' => 6,
        ])->assertRedirect(route('inmopro.attention-ticket-types.index'));

        $this->assertDatabaseHas('attention_ticket_types', [
            'id' => $type->id,
            'name' => 'Entrega programada',
            'allows_overlap' => true,
            'sort_order' => 6,
        ]);
    }

    public function test_authenticated_users_can_create_attention_ticket_in_pending_status(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->whereNotNull('advisor_id')->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $type = AttentionTicketType::general();
        $this->actingAs($user);

        $response = $this->post(route('inmopro.attention-tickets.store'), [
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $type->id,
            'notes' => 'Solicitud desde operaciones',
        ]);

        $response->assertRedirect(route('inmopro.attention-tickets.index'));
        $this->assertDatabaseHas('attention_tickets', [
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $type->id,
            'status' => 'pendiente',
        ]);
    }

    public function test_authenticated_users_can_create_attention_ticket_without_project(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->whereNotNull('advisor_id')->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $type = AttentionTicketType::general();
        $this->actingAs($user);

        $response = $this->post(route('inmopro.attention-tickets.store'), [
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => null,
            'attention_ticket_type_id' => $type->id,
            'notes' => 'Solicitud sin proyecto asignado',
        ]);

        $response->assertRedirect(route('inmopro.attention-tickets.index'));
        $this->assertDatabaseHas('attention_tickets', [
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => null,
            'attention_ticket_type_id' => $type->id,
            'status' => 'pendiente',
            'notes' => 'Solicitud sin proyecto asignado',
        ]);
    }

    public function test_authenticated_users_can_schedule_attention_ticket_from_admin(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->whereNotNull('advisor_id')->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $type = AttentionTicketType::general();
        $this->actingAs($user);

        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $type->id,
            'status' => 'pendiente',
            'notes' => 'Pendiente de agenda',
        ]);

        $response = $this->put(route('inmopro.attention-tickets.update', $ticket), [
            'status' => 'agendado',
            'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
            'notes' => 'Visita confirmada',
        ]);

        $response->assertRedirect(route('inmopro.attention-tickets.show', $ticket));
        $this->assertDatabaseHas('attention_tickets', [
            'id' => $ticket->id,
            'status' => 'agendado',
            'notes' => 'Visita confirmada',
        ]);
    }

    public function test_calendar_filters_events_by_ticket_type(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->whereNotNull('advisor_id')->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $typeA = AttentionTicketType::factory()->create(['name' => 'Entrega', 'allows_overlap' => true]);
        $typeB = AttentionTicketType::factory()->create(['name' => 'Postventa', 'allows_overlap' => true]);
        $this->actingAs($user);

        AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $typeA->id,
            'scheduled_at' => now()->addDay(),
            'status' => 'agendado',
        ]);
        AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $typeB->id,
            'scheduled_at' => now()->addDays(2),
            'status' => 'agendado',
        ]);

        $response = $this->get(route('inmopro.attention-tickets.calendar', ['type_id' => $typeB->id]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/operations/attention-tickets/calendar')
            ->has('ticketTypes', 3)
            ->where('filters.type_id', (string) $typeB->id)
            ->has('events', 1)
            ->where('events.0.extendedProps.type', 'Postventa'));
    }

    public function test_ticket_type_without_overlap_rejects_same_type_schedule_conflict(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->whereNotNull('advisor_id')->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $type = AttentionTicketType::factory()->create(['allows_overlap' => false]);
        $scheduledAt = now()->addDay()->setTime(10, 0);
        $this->actingAs($user);

        AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $type->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'agendado',
        ]);

        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $type->id,
            'status' => 'pendiente',
        ]);

        $response = $this->from(route('inmopro.attention-tickets.edit', $ticket))
            ->put(route('inmopro.attention-tickets.update', $ticket), [
                'status' => 'agendado',
                'attention_ticket_type_id' => $type->id,
                'scheduled_at' => $scheduledAt->copy()->addMinutes(30)->format('Y-m-d H:i:s'),
                'notes' => 'Cruce',
            ]);

        $response->assertRedirect(route('inmopro.attention-tickets.edit', $ticket));
        $response->assertSessionHasErrors('scheduled_at');
    }

    public function test_ticket_type_with_overlap_allows_same_type_schedule_conflict(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->whereNotNull('advisor_id')->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $type = AttentionTicketType::factory()->create(['allows_overlap' => true]);
        $scheduledAt = now()->addDay()->setTime(10, 0);
        $this->actingAs($user);

        AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $type->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'agendado',
        ]);

        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $type->id,
            'status' => 'pendiente',
        ]);

        $response = $this->put(route('inmopro.attention-tickets.update', $ticket), [
            'status' => 'agendado',
            'attention_ticket_type_id' => $type->id,
            'scheduled_at' => $scheduledAt->copy()->addMinutes(30)->format('Y-m-d H:i:s'),
            'notes' => 'Permite cruce',
        ]);

        $response->assertRedirect(route('inmopro.attention-tickets.show', $ticket));
        $this->assertDatabaseHas('attention_tickets', [
            'id' => $ticket->id,
            'status' => 'agendado',
            'notes' => 'Permite cruce',
        ]);
    }

    public function test_ticket_type_allows_same_schedule_when_other_type_conflicts(): void
    {
        $user = User::factory()->create();
        $client = Client::query()->whereNotNull('advisor_id')->firstOrFail();
        $advisor = Advisor::findOrFail($client->advisor_id);
        $project = Project::firstOrFail();
        $typeA = AttentionTicketType::factory()->create(['allows_overlap' => false]);
        $typeB = AttentionTicketType::factory()->create(['allows_overlap' => false]);
        $scheduledAt = now()->addDay()->setTime(10, 0);
        $this->actingAs($user);

        AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $typeA->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'agendado',
        ]);

        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $client->id,
            'project_id' => $project->id,
            'attention_ticket_type_id' => $typeB->id,
            'status' => 'pendiente',
        ]);

        $response = $this->put(route('inmopro.attention-tickets.update', $ticket), [
            'status' => 'agendado',
            'attention_ticket_type_id' => $typeB->id,
            'scheduled_at' => $scheduledAt->copy()->addMinutes(30)->format('Y-m-d H:i:s'),
            'notes' => 'Sin cruce por tipo',
        ]);

        $response->assertRedirect(route('inmopro.attention-tickets.show', $ticket));
        $this->assertDatabaseHas('attention_tickets', [
            'id' => $ticket->id,
            'status' => 'agendado',
            'notes' => 'Sin cruce por tipo',
        ]);
    }

    public function test_authenticated_users_can_view_legacy_attention_ticket_and_delivery_deed(): void
    {
        $user = User::factory()->create();
        $lot = Lot::whereNotNull('client_id')->firstOrFail();
        $advisor = Advisor::findOrFail($lot->advisor_id);
        $this->actingAs($user);

        $ticket = AttentionTicket::create([
            'advisor_id' => $advisor->id,
            'client_id' => $lot->client_id,
            'project_id' => $lot->project_id,
            'lot_id' => $lot->id,
            'attention_ticket_type_id' => AttentionTicketType::general()->id,
            'scheduled_at' => now()->addDay(),
            'status' => 'agendado',
        ]);

        $response = $this->get(route('inmopro.attention-tickets.show', $ticket));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('inmopro/operations/attention-tickets/show')->has('ticket'));

        $responseDeed = $this->get(route('inmopro.attention-tickets.delivery-deed', $ticket));
        $responseDeed->assertOk();
        $responseDeed->assertInertia(fn ($page) => $page->component('inmopro/operations/delivery-deed-print')->has('companyName'));
    }
}
