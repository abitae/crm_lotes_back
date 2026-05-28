<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;

class LotPersistService
{
    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function prepareForStore(array $validated): array
    {
        $validated = $this->normalizeLotFields($validated);
        $this->guardManualTransferStatusChange($validated);

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function update(Lot $lot, array $validated): void
    {
        $validated = $this->normalizeLotFields($validated);
        $this->guardManualTransferStatusChange($validated, $lot);
        $clientName = isset($validated['client_name']) ? trim((string) $validated['client_name']) : null;
        $clientDni = isset($validated['client_dni']) ? trim((string) $validated['client_dni']) : null;
        $clientPhone = array_key_exists('client_phone', $validated)
            ? trim((string) ($validated['client_phone'] ?? ''))
            : null;
        $hasClientPhoneKey = array_key_exists('client_phone', $validated);

        $clientId = isset($validated['client_id']) ? (int) $validated['client_id'] : null;
        $linkedClient = $clientId > 0 ? Client::find($clientId) : null;

        if (($clientName === '' || $clientName === null) && $linkedClient !== null) {
            $clientName = $linkedClient->name;
            $clientDni = $clientDni !== '' && $clientDni !== null ? $clientDni : $linkedClient->dni;
        }

        if ($clientName === '' || $clientName === null) {
            $validated['client_id'] = null;
            $validated['client_name'] = null;
            $validated['client_dni'] = null;
        } else {
            $client = $linkedClient;

            if ($client === null && $clientDni !== '' && $clientDni !== null) {
                $client = Client::where('dni', $clientDni)->first();
            }
            if ($client === null && $clientName !== '') {
                $client = Client::where('name', $clientName)->first();
            }

            $resolvedPhone = $hasClientPhoneKey
                ? ($clientPhone !== '' ? $clientPhone : null)
                : ($client?->phone);

            if ($client) {
                $client->update([
                    'name' => $clientName,
                    'dni' => $clientDni !== '' && $clientDni !== null ? $clientDni : $client->dni,
                    'phone' => $resolvedPhone,
                    'advisor_id' => $validated['advisor_id'] ?? $lot->advisor_id ?? $client->advisor_id ?? Advisor::query()->value('id'),
                ]);
                $validated['client_id'] = $client->id;
            } else {
                $defaultClientTypeId = ClientType::query()->where('code', 'PROSPECTO')->value('id')
                    ?? ClientType::query()->orderBy('sort_order')->value('id');
                $client = Client::create([
                    'name' => $clientName,
                    'dni' => $clientDni !== '' && $clientDni !== null ? $clientDni : null,
                    'phone' => $resolvedPhone,
                    'client_type_id' => $defaultClientTypeId,
                    'advisor_id' => $validated['advisor_id'] ?? $lot->advisor_id ?? Advisor::query()->value('id'),
                ]);
                $validated['client_id'] = $client->id;
            }
            $validated['client_name'] = $clientName;
            $validated['client_dni'] = $clientDni !== '' && $clientDni !== null ? $clientDni : null;
        }

        unset($validated['client_phone']);

        $lot->fill($validated);
        $lot->save();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function normalizeLotFields(array $validated): array
    {
        if (array_key_exists('number', $validated) && $validated['number'] !== null) {
            $validated['number'] = mb_strtoupper(trim((string) $validated['number']));
        }

        $validated = $this->normalizeLotDateFields($validated);

        $price = array_key_exists('price', $validated) && $validated['price'] !== null
            ? (float) $validated['price']
            : null;
        $advance = array_key_exists('advance', $validated) && $validated['advance'] !== null
            ? (float) $validated['advance']
            : null;

        if ($price === null) {
            $validated['remaining_balance'] = null;

            return $validated;
        }

        $remainingBalance = round($price - ($advance ?? 0), 2);

        if ($remainingBalance < 0) {
            throw new HttpResponseException(
                back()->withErrors(['advance' => 'El adelanto no puede ser mayor al precio del lote.'])
            );
        }

        $validated['remaining_balance'] = $remainingBalance;

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function normalizeLotDateFields(array $validated): array
    {
        foreach (['payment_limit_date', 'contract_date', 'notarial_transfer_date'] as $field) {
            if (! array_key_exists($field, $validated) || empty($validated[$field])) {
                $validated[$field] = null;

                continue;
            }

            $validated[$field] = Carbon::parse((string) $validated[$field])->toDateString();
        }

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function guardManualTransferStatusChange(array $validated, ?Lot $lot = null): void
    {
        if (! array_key_exists('lot_status_id', $validated)) {
            return;
        }

        $transferredStatusId = LotStatus::query()->where('code', LotStatus::CODE_TRANSFERIDO)->value('id');

        if (! $transferredStatusId) {
            return;
        }

        $requestedStatusId = (int) $validated['lot_status_id'];

        if ($lot === null && $requestedStatusId === (int) $transferredStatusId) {
            throw new HttpResponseException(
                back()->withErrors(['lot_status_id' => 'Use la confirmacion de transferencia para registrar lotes transferidos.'])
            );
        }

        if ($lot !== null && $requestedStatusId !== (int) $lot->lot_status_id
            && ($requestedStatusId === (int) $transferredStatusId || (int) $lot->lot_status_id === (int) $transferredStatusId)) {
            throw new HttpResponseException(
                back()->withErrors(['lot_status_id' => 'El estado TRANSFERIDO solo puede cambiarse desde el flujo de confirmacion de transferencia.'])
            );
        }
    }
}
