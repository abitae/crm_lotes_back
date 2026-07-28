<?php

namespace App\Http\Requests\Inmopro;

use App\Models\Inmopro\Client;
use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
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
            'name' => ['required', 'string', 'max:255'],
            'dni' => ['required', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'referred_by' => ['nullable', 'string', 'max:255'],
            'client_type_id' => ['required', 'exists:client_types,id'],
            'city_id' => ['nullable', 'exists:cities,id'],
            'advisor_id' => ['required', 'exists:advisors,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $client = $this->route('client');
            $exceptId = $client instanceof Client ? $client->id : null;

            app(ClientDuplicateRegistrationChecker::class)->addValidationErrors(
                $validator,
                $this->input('dni'),
                $this->input('phone'),
                $exceptId,
            );
        });
    }
}
