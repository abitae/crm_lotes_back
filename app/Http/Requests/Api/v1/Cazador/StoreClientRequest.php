<?php

namespace App\Http\Requests\Api\v1\Cazador;

use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $cityId = $this->input('city_id');

        if (is_array($cityId) && array_key_exists('id', $cityId)) {
            $this->merge(['city_id' => $cityId['id']]);

            return;
        }

        if (! $this->filled('city_id')) {
            $city = $this->input('city');
            if (is_array($city) && array_key_exists('id', $city)) {
                $this->merge(['city_id' => $city['id']]);
            }
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'dni' => ['nullable', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'referred_by' => ['nullable', 'string', 'max:255'],
            'city_id' => ['nullable', 'exists:cities,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'dni' => 'DNI',
            'phone' => 'teléfono',
            'email' => 'correo',
            'referred_by' => 'referido por',
            'city_id' => 'ciudad',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $checker = app(ClientDuplicateRegistrationChecker::class);
            $conflict = $checker->findConflict(
                $this->input('dni'),
                $this->input('phone'),
                null,
            );

            if ($conflict !== null) {
                $validator->errors()->add('duplicate_registration', $checker->message($conflict));
            }
        });
    }
}
