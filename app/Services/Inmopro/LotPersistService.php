<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Support\ClientPhoneGuard;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;

class LotPersistService
{
    public function __construct(
        private CommissionService $commissionService,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function prepareForStore(array $validated): array
    {
        $validated = $this->normalizeLotDateFields($validated);
        $this->guardTransferStatusChange($validated);
        $validated = $this->normalizeLotFields($validated);

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function update(Lot $lot, array $validated): void
    {
        $originalSalePrice = $lot->sale_price;
        $validated = $this->normalizeLotDateFields($validated);
        $this->guardTransferStatusChange($validated, $lot);
        $this->validateTransferToTransferred($validated, $lot);
        $transitionedToTransferred = $this->isTransitioningToTransferred($validated, $lot);
        $validated = $this->normalizeLotFields($validated, $lot);
        if (! ClientPhoneGuard::canView(auth()->user())) {
            unset($validated['client_phone']);
        }
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

        if ($lot->wasChanged('sale_price') && $originalSalePrice !== null && $lot->commissions()->exists()) {
            $this->commissionService->recalculateForLot($lot);
        }

        if ($transitionedToTransferred && ! $lot->commissions()->exists()) {
            $this->commissionService->createCommissionsForTransferredLot($lot->fresh());
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function normalizeLotFields(array $validated, ?Lot $lot = null): array
    {
        if (array_key_exists('list_price', $validated)) {
            $validated['price'] = $validated['list_price'];
        } elseif (array_key_exists('price', $validated)) {
            $validated['list_price'] = $validated['price'];
        }

        if (array_key_exists('number', $validated) && $validated['number'] !== null) {
            $validated['number'] = mb_strtoupper(trim((string) $validated['number']));
        }

        if ($this->willBeTransferredStatus($validated, $lot)) {
            return $this->applyTransferredFinancialSettlement($validated, $lot);
        }

        $price = array_key_exists('sale_price', $validated) && $validated['sale_price'] !== null
            ? (float) $validated['sale_price']
            : ($lot?->sale_price !== null
                ? (float) $lot->sale_price
                : (array_key_exists('price', $validated) && $validated['price'] !== null
                    ? (float) $validated['price']
                    : ($lot?->price !== null ? (float) $lot->price : null)));
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
    private function guardTransferStatusChange(array $validated, ?Lot $lot = null): void
    {
        if (! array_key_exists('lot_status_id', $validated)) {
            return;
        }

        $transferredStatusId = $this->transferredStatusId();

        if (! $transferredStatusId) {
            return;
        }

        $requestedStatusId = (int) $validated['lot_status_id'];

        if ($lot === null && $requestedStatusId === $transferredStatusId) {
            throw new HttpResponseException(
                back()->withErrors(['lot_status_id' => 'No puede crear un lote directamente en estado TRANSFERIDO.'])
            );
        }

        if ($lot !== null
            && (int) $lot->lot_status_id === $transferredStatusId
            && $requestedStatusId !== $transferredStatusId) {
            throw new HttpResponseException(
                back()->withErrors(['lot_status_id' => 'No puede cambiar el estado de un lote ya transferido.'])
            );
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function validateTransferToTransferred(array $validated, Lot $lot): void
    {
        if (! $this->isTransitioningToTransferred($validated, $lot)) {
            return;
        }

        $reservedStatusId = LotStatus::query()->where('code', LotStatus::CODE_RESERVADO)->value('id');

        if (! $reservedStatusId || (int) $lot->lot_status_id !== (int) $reservedStatusId) {
            throw new HttpResponseException(
                back()->withErrors(['lot_status_id' => 'Solo los lotes en estado RESERVADO pueden pasar a TRANSFERIDO.'])
            );
        }

        $transferDate = $validated['notarial_transfer_date'] ?? $lot->notarial_transfer_date?->toDateString();

        if (empty($transferDate)) {
            throw new HttpResponseException(
                back()->withErrors(['notarial_transfer_date' => 'La fecha de escritura es obligatoria al transferir el lote.'])
            );
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function isTransitioningToTransferred(array $validated, Lot $lot): bool
    {
        $transferredStatusId = $this->transferredStatusId();

        if (! $transferredStatusId || ! array_key_exists('lot_status_id', $validated)) {
            return false;
        }

        return (int) $validated['lot_status_id'] === $transferredStatusId
            && (int) $lot->lot_status_id !== $transferredStatusId;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function willBeTransferredStatus(array $validated, ?Lot $lot): bool
    {
        $transferredStatusId = $this->transferredStatusId();

        if (! $transferredStatusId) {
            return false;
        }

        if (array_key_exists('lot_status_id', $validated)) {
            return (int) $validated['lot_status_id'] === $transferredStatusId;
        }

        return $lot !== null && (int) $lot->lot_status_id === $transferredStatusId;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function applyTransferredFinancialSettlement(array $validated, ?Lot $lot = null): array
    {
        $price = array_key_exists('sale_price', $validated) && $validated['sale_price'] !== null
            ? (float) $validated['sale_price']
            : ($lot !== null && ($lot->sale_price !== null || $lot->price !== null)
                ? (float) ($lot->sale_price ?? $lot->price)
                : null);

        if ($price === null) {
            $validated['remaining_balance'] = null;

            return $validated;
        }

        $validated['sale_price'] = $price;
        $validated['advance'] = $price;
        $validated['remaining_balance'] = 0.0;

        return $validated;
    }

    private function transferredStatusId(): ?int
    {
        $id = LotStatus::query()->where('code', LotStatus::CODE_TRANSFERIDO)->value('id');

        return $id !== null ? (int) $id : null;
    }
}
