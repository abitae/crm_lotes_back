<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Client;
use App\Models\Meta\MetaBroadcastRecipient;
use App\Models\Meta\MetaConversation;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class ClientDuplicateMergeService
{
    public const FIELD_PHONE = 'phone';

    public const FIELD_DNI = 'dni';

    /**
     * @return list<array{
     *     key: string,
     *     display: string,
     *     clients: list<array<string, mixed>>
     * }>
     */
    public function duplicateGroups(string $field): array
    {
        $column = $this->normalizedColumn($field);
        $displayAttribute = $field === self::FIELD_DNI ? 'dni' : 'phone';

        $duplicateKeys = Client::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->select($column)
            ->groupBy($column)
            ->havingRaw('COUNT(*) >= 2')
            ->orderBy($column)
            ->pluck($column);

        if ($duplicateKeys->isEmpty()) {
            return [];
        }

        $clients = Client::query()
            ->with(['advisor:id,name', 'type:id,name,color', 'status:id,name,color'])
            ->withCount(['lots', 'attentionTickets'])
            ->whereIn($column, $duplicateKeys)
            ->orderBy($column)
            ->orderBy('id')
            ->get([
                'id',
                'name',
                'dni',
                'phone',
                'email',
                'phone_normalized',
                'dni_normalized',
                'client_type_id',
                'client_status_id',
                'advisor_id',
                'created_at',
            ]);

        /** @var array<string, list<Client>> $grouped */
        $grouped = [];
        foreach ($clients as $client) {
            $key = (string) $client->getAttribute($column);
            if ($key === '') {
                continue;
            }
            $grouped[$key] ??= [];
            $grouped[$key][] = $client;
        }

        $result = [];
        foreach ($grouped as $normalizedKey => $groupClients) {
            if (count($groupClients) < 2) {
                continue;
            }

            $displayRaw = (string) ($groupClients[0]->getAttribute($displayAttribute) ?: $normalizedKey);

            $result[] = [
                'key' => (string) $normalizedKey,
                'display' => $displayRaw,
                'clients' => array_map(
                    static fn (Client $client): array => [
                        'id' => $client->id,
                        'name' => $client->name,
                        'dni' => $client->dni,
                        'phone' => $client->phone,
                        'email' => $client->email,
                        'created_at' => $client->created_at?->toIso8601String(),
                        'lots_count' => (int) $client->lots_count,
                        'attention_tickets_count' => (int) $client->attention_tickets_count,
                        'type' => $client->type
                            ? ['id' => $client->type->id, 'name' => $client->type->name, 'color' => $client->type->color]
                            : null,
                        'status' => $client->status
                            ? ['id' => $client->status->id, 'name' => $client->status->name, 'color' => $client->status->color]
                            : null,
                        'advisor' => $client->advisor
                            ? ['id' => $client->advisor->id, 'name' => $client->advisor->name]
                            : null,
                    ],
                    $groupClients
                ),
            ];
        }

        return $result;
    }

    /**
     * @param  list<int>  $mergeClientIds
     */
    public function merge(int $keepClientId, array $mergeClientIds, string $field): Client
    {
        $column = $this->normalizedColumn($field);
        $label = $field === self::FIELD_DNI ? 'DNI' : 'teléfono';

        $mergeClientIds = array_values(array_unique(array_map('intval', $mergeClientIds)));
        $mergeClientIds = array_values(array_filter(
            $mergeClientIds,
            static fn (int $id): bool => $id !== $keepClientId
        ));

        if ($mergeClientIds === []) {
            throw new InvalidArgumentException('Debe indicar al menos un cliente a fusionar.');
        }

        return DB::transaction(function () use ($keepClientId, $mergeClientIds, $column, $label): Client {
            /** @var Client|null $keep */
            $keep = Client::query()->lockForUpdate()->find($keepClientId);
            if ($keep === null) {
                throw new InvalidArgumentException('El cliente principal no existe.');
            }

            $normalized = $keep->getAttribute($column);
            if ($normalized === null || $normalized === '') {
                throw new InvalidArgumentException("El cliente principal no tiene {$label} normalizado.");
            }

            $mergeClients = Client::query()
                ->lockForUpdate()
                ->whereIn('id', $mergeClientIds)
                ->get();

            if ($mergeClients->count() !== count($mergeClientIds)) {
                throw new InvalidArgumentException('Uno o más clientes a fusionar no existen.');
            }

            foreach ($mergeClients as $duplicate) {
                if ($duplicate->getAttribute($column) !== $normalized) {
                    throw new InvalidArgumentException(
                        "Todos los clientes a unificar deben compartir el mismo {$label}."
                    );
                }
            }

            $this->mergeTags($keep, $mergeClients);
            $this->reassignRelations($keep->id, $mergeClientIds);

            Client::query()->whereIn('id', $mergeClientIds)->delete();

            $keep->refresh();

            if ($keep->exists === false) {
                throw new RuntimeException('El cliente principal se eliminó de forma inesperada.');
            }

            return $keep;
        });
    }

    private function normalizedColumn(string $field): string
    {
        return match ($field) {
            self::FIELD_PHONE => 'phone_normalized',
            self::FIELD_DNI => 'dni_normalized',
            default => throw new InvalidArgumentException('Campo de unificación no válido.'),
        };
    }

    /**
     * @param  Collection<int, Client>  $mergeClients
     */
    private function mergeTags(Client $keep, $mergeClients): void
    {
        $existingTagIds = $keep->tags()->pluck('client_tags.id')->map(fn ($id) => (int) $id)->all();
        $tagIdsToAttach = [];

        foreach ($mergeClients as $duplicate) {
            foreach ($duplicate->tags()->pluck('client_tags.id') as $tagId) {
                $tagId = (int) $tagId;
                if (! in_array($tagId, $existingTagIds, true) && ! in_array($tagId, $tagIdsToAttach, true)) {
                    $tagIdsToAttach[] = $tagId;
                }
            }
        }

        if ($tagIdsToAttach !== []) {
            $keep->tags()->attach($tagIdsToAttach);
        }
    }

    /**
     * @param  list<int>  $mergeClientIds
     */
    private function reassignRelations(int $keepClientId, array $mergeClientIds): void
    {
        $tables = [
            'lots',
            'lot_pre_reservations',
            'attention_tickets',
            'advisor_reminders',
            'advisor_agenda_events',
            'client_status_changes',
            'client_crm_events',
        ];

        foreach ($tables as $table) {
            DB::table($table)
                ->whereIn('client_id', $mergeClientIds)
                ->update(['client_id' => $keepClientId]);
        }

        MetaConversation::query()
            ->whereIn('client_id', $mergeClientIds)
            ->update(['client_id' => $keepClientId]);

        MetaBroadcastRecipient::query()
            ->whereIn('client_id', $mergeClientIds)
            ->update(['client_id' => $keepClientId]);
    }
}
