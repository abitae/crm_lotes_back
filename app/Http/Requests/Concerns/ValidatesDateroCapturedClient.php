<?php

namespace App\Http\Requests\Concerns;

use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;

trait ValidatesDateroCapturedClient
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function dateroCapturedClientRules(): array
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

    public function withDateroCapturedClientDuplicateCheck(Validator $validator, ?int $exceptClientId = null): void
    {
        $validator->after(function (Validator $validator) use ($exceptClientId): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            app(ClientDuplicateRegistrationChecker::class)->addValidationErrors(
                $validator,
                $this->input('dni'),
                $this->input('phone'),
                $exceptClientId,
            );
        });
    }
}
