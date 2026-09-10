<?php

namespace App\Support;

use App\Models\Inmopro\Client;
use App\Models\User;

final class ClientPhoneGuard
{
    public const PERMISSION = 'inmopro.clients.view-phone';

    public static function canView(?User $user = null): bool
    {
        $user ??= auth()->user();

        return $user instanceof User && $user->can(self::PERMISSION);
    }

    public static function visible(?string $phone, ?User $user = null): ?string
    {
        if (! self::canView($user)) {
            return null;
        }

        $trimmed = trim((string) $phone);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function redactArray(array $payload, ?User $user = null): array
    {
        if (self::canView($user)) {
            return $payload;
        }

        foreach (['phone', 'phone_normalized', 'client_phone'] as $key) {
            if (array_key_exists($key, $payload)) {
                $payload[$key] = null;
            }
        }

        foreach (['client', 'lot'] as $nested) {
            if (isset($payload[$nested]) && is_array($payload[$nested])) {
                $payload[$nested] = self::redactArray($payload[$nested], $user);
            }
        }

        if (isset($payload['lots']) && is_array($payload['lots'])) {
            $payload['lots'] = array_map(
                static fn (mixed $lot): mixed => is_array($lot) ? self::redactArray($lot, $user) : $lot,
                $payload['lots'],
            );
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public static function clientPayload(Client $client, ?User $user = null): array
    {
        return self::redactArray($client->toArray(), $user);
    }

    /**
     * @param  list<array{key: string, display: string, clients: list<array<string, mixed>>}>  $groups
     * @return list<array{key: string, display: string, clients: list<array<string, mixed>>}>
     */
    public static function redactDuplicateGroups(array $groups, string $field = 'phone', ?User $user = null): array
    {
        if (self::canView($user)) {
            return $groups;
        }

        return array_map(static function (array $group) use ($field): array {
            if ($field === 'phone') {
                $group['display'] = '••••••••';
            }
            $group['clients'] = array_map(
                static fn (array $client): array => self::redactArray($client),
                $group['clients'],
            );

            return $group;
        }, $groups);
    }
}
