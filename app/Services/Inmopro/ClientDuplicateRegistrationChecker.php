<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Client;
use Illuminate\Contracts\Validation\Validator;

class ClientDuplicateRegistrationChecker
{
    public function findPhoneConflict(?string $phone, ?int $exceptClientId = null): ?Client
    {
        $phoneNormalized = $this->normalizePhone($phone);

        if ($phoneNormalized === '') {
            return null;
        }

        return Client::query()
            ->with('advisor')
            ->where(function ($query) use ($phoneNormalized): void {
                $query->where('phone', $phoneNormalized)
                    ->orWhereRaw(
                        "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ?",
                        [$phoneNormalized]
                    );
            })
            ->when($exceptClientId !== null, fn ($query) => $query->where('id', '!=', $exceptClientId))
            ->orderBy('id')
            ->first();
    }

    /**
     * Busca un cliente existente con el mismo DNI (si no está vacío) o el mismo teléfono (si no está vacío).
     */
    public function findConflict(?string $dni, ?string $phone, ?int $exceptClientId = null): ?Client
    {
        $phoneNormalized = $this->normalizePhone($phone);
        $dniTrimmed = $this->normalizeDni($dni);

        if ($phoneNormalized === '' && $dniTrimmed === '') {
            return null;
        }

        return Client::query()
            ->with('advisor')
            ->where(function ($query) use ($dniTrimmed, $phoneNormalized) {
                $first = true;
                if ($phoneNormalized !== '') {
                    $query->where(function ($phoneQuery) use ($phoneNormalized): void {
                        $phoneQuery->where('phone', $phoneNormalized)
                            ->orWhereRaw(
                                "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ?",
                                [$phoneNormalized]
                            );
                    });
                    $first = false;
                }
                if ($dniTrimmed !== '') {
                    if ($first) {
                        $query->where('dni', $dniTrimmed);
                    } else {
                        $query->orWhere('dni', $dniTrimmed);
                    }
                }
            })
            ->when($exceptClientId !== null, fn ($query) => $query->where('id', '!=', $exceptClientId))
            ->orderBy('id')
            ->first();
    }

    public function message(Client $existing): string
    {
        $advisorName = $existing->advisor?->name ?? 'otro vendedor';

        return 'Cliente ya registrado por '.$advisorName;
    }

    public function messageWithRegistrationDate(Client $existing): string
    {
        $registrationDate = $existing->created_at
            ->timezone(config('app.timezone'))
            ->format('d/m/Y');

        return $this->message($existing).' el '.$registrationDate;
    }

    public function addPhoneValidationErrors(
        Validator $validator,
        ?string $phone,
        ?int $exceptClientId = null,
        string $fieldPrefix = '',
    ): void {
        $conflict = $this->findPhoneConflict($phone, $exceptClientId);

        if ($conflict === null) {
            return;
        }

        $message = $this->messageWithRegistrationDate($conflict);
        $validator->errors()->add('duplicate_registration', $message);
        $validator->errors()->add($fieldPrefix.'phone', $message);
    }

    /**
     * Agrega el mensaje de duplicado en `duplicate_registration` y en los campos
     * de formulario afectados (`phone` / `dni`) para que la app móvil lo muestre.
     */
    public function addValidationErrors(
        Validator $validator,
        ?string $dni,
        ?string $phone,
        ?int $exceptClientId = null,
        string $fieldPrefix = '',
    ): void {
        $conflict = $this->findConflict($dni, $phone, $exceptClientId);

        if ($conflict === null) {
            return;
        }

        $message = $this->message($conflict);
        $validator->errors()->add('duplicate_registration', $message);

        foreach ($this->matchingFields($conflict, $dni, $phone) as $field) {
            $validator->errors()->add($fieldPrefix.$field, $message);
        }
    }

    /**
     * @return list<string>
     */
    public function matchingFields(Client $existing, ?string $dni, ?string $phone): array
    {
        $fields = [];
        $phoneNormalized = $this->normalizePhone($phone);
        $dniTrimmed = $this->normalizeDni($dni);

        if ($phoneNormalized !== '' && $this->normalizePhone($existing->phone) === $phoneNormalized) {
            $fields[] = 'phone';
        }

        if ($dniTrimmed !== '' && $this->normalizeDni($existing->dni) === $dniTrimmed) {
            $fields[] = 'dni';
        }

        if ($fields === []) {
            $fields[] = 'phone';
        }

        return $fields;
    }

    public function normalizePhone(?string $phone): string
    {
        return preg_replace('/\D+/', '', trim((string) $phone)) ?? '';
    }

    public function normalizeDni(?string $dni): string
    {
        return trim((string) $dni);
    }
}
