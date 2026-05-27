<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\AttentionTicket;
use App\Models\Inmopro\AttentionTicketType;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

class AttentionTicketScheduleValidator
{
    public function ensureCanSchedule(int $attentionTicketTypeId, CarbonInterface $scheduledAt, ?int $ignoreTicketId = null): void
    {
        $type = AttentionTicketType::query()->find($attentionTicketTypeId);

        if (! $type || $type->allows_overlap) {
            return;
        }

        $windowStart = $scheduledAt->copy()->subHour();
        $windowEnd = $scheduledAt->copy()->addHour();

        $hasOverlap = AttentionTicket::query()
            ->where('attention_ticket_type_id', $type->id)
            ->where('status', '!=', 'cancelado')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>', $windowStart)
            ->where('scheduled_at', '<', $windowEnd)
            ->when($ignoreTicketId !== null, fn ($query) => $query->whereKeyNot($ignoreTicketId))
            ->exists();

        if ($hasOverlap) {
            throw ValidationException::withMessages([
                'scheduled_at' => 'El horario seleccionado se superpone con otro ticket del mismo tipo.',
            ]);
        }
    }
}
