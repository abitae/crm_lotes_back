<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\AttentionTicketType;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\Project;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Recordatorios y tickets de atención de demostración para el asesor Cazador `asesor1`.
 *
 * Requiere un cliente PROPIO de ese asesor (p. ej. el creado por FunctionalTestingSeeder: DNI 40001111).
 */
class Asesor1RemindersAndTicketsSeeder extends Seeder
{
    public const REMINDER_TITLE = '[Seed] Recordatorio demo asesor1';

    public const REMINDER_TITLE_COMPLETED = '[Seed] Recordatorio completado demo asesor1';

    public const TICKET_NOTES = '[Seed] Ticket atención demo asesor1';

    public function run(): void
    {
        $advisor = Advisor::query()->where('username', 'asesor1')->first();
        if ($advisor === null) {
            throw new RuntimeException('Asesor1RemindersAndTicketsSeeder: no existe el asesor con username asesor1. Ejecute AdvisorSeeder.');
        }

        $client = Client::query()
            ->where('advisor_id', $advisor->id)
            ->where('dni', '40001111')
            ->first();

        if ($client === null) {
            $client = Client::query()
                ->where('advisor_id', $advisor->id)
                ->whereHas('type', fn ($q) => $q->where('code', 'PROPIO'))
                ->orderBy('id')
                ->first();
        }

        if ($client === null) {
            throw new RuntimeException(
                'Asesor1RemindersAndTicketsSeeder: el asesor asesor1 no tiene cliente PROPIO. Ejecute FunctionalTestingSeeder o asigne un cliente PROPIO.'
            );
        }

        $project = Project::query()->orderBy('id')->firstOrFail();
        $ticketType = AttentionTicketType::general();

        AdvisorReminder::query()->updateOrCreate(
            [
                'advisor_id' => $advisor->id,
                'title' => self::REMINDER_TITLE,
            ],
            [
                'client_id' => $client->id,
                'notes' => 'Seguimiento post-visita (datos de seed).',
                'remind_at' => now()->addDay()->setTime(10, 0),
                'completed_at' => null,
            ],
        );

        AdvisorReminder::query()->updateOrCreate(
            [
                'advisor_id' => $advisor->id,
                'title' => self::REMINDER_TITLE_COMPLETED,
            ],
            [
                'client_id' => $client->id,
                'notes' => 'Recordatorio ya atendido (seed).',
                'remind_at' => now()->subDay(),
                'completed_at' => now()->subHours(2),
            ],
        );

        AttentionTicket::query()->updateOrCreate(
            [
                'advisor_id' => $advisor->id,
                'client_id' => $client->id,
                'project_id' => $project->id,
                'notes' => self::TICKET_NOTES,
            ],
            [
                'lot_id' => null,
                'attention_ticket_type_id' => $ticketType->id,
                'scheduled_at' => null,
                'status' => 'pendiente',
            ],
        );
    }
}
