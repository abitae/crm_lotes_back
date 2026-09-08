<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\Client;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class MergeClientsByPhoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'keep_client_id' => ['required', 'integer', 'exists:clients,id'],
            'merge_client_ids' => ['required', 'array', 'min:1'],
            'merge_client_ids.*' => ['integer', 'distinct', 'exists:clients,id', 'different:keep_client_id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'keep_client_id.required' => 'Seleccione el cliente principal a conservar.',
            'keep_client_id.exists' => 'El cliente principal no existe.',
            'merge_client_ids.required' => 'Seleccione al menos un cliente a fusionar.',
            'merge_client_ids.min' => 'Seleccione al menos un cliente a fusionar.',
            'merge_client_ids.*.different' => 'El cliente principal no puede estar en la lista a fusionar.',
            'merge_client_ids.*.exists' => 'Uno o más clientes a fusionar no existen.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $keepId = (int) $this->input('keep_client_id');
            /** @var list<int> $mergeIds */
            $mergeIds = array_values(array_map('intval', $this->input('merge_client_ids', [])));

            $keep = Client::query()->find($keepId);
            if ($keep === null) {
                return;
            }

            if ($keep->phone_normalized === null || $keep->phone_normalized === '') {
                $validator->errors()->add(
                    'keep_client_id',
                    'El cliente principal no tiene un teléfono válido para unificar.'
                );

                return;
            }

            $mergeClients = Client::query()->whereIn('id', $mergeIds)->get(['id', 'phone_normalized']);
            foreach ($mergeClients as $client) {
                if ($client->phone_normalized !== $keep->phone_normalized) {
                    $validator->errors()->add(
                        'merge_client_ids',
                        'Todos los clientes a unificar deben compartir el mismo teléfono.'
                    );

                    return;
                }
            }
        });
    }
}
