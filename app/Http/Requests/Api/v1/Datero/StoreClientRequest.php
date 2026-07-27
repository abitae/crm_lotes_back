<?php

namespace App\Http\Requests\Api\v1\Datero;

use App\Http\Requests\Concerns\FormatsDuplicateClientValidationResponse;
use App\Http\Requests\Concerns\ValidatesDateroCapturedClient;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    use FormatsDuplicateClientValidationResponse;
    use ValidatesDateroCapturedClient;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->dateroCapturedClientRules();
    }

    public function withValidator(Validator $validator): void
    {
        $this->withDateroCapturedClientDuplicateCheck($validator, null);
    }
}
