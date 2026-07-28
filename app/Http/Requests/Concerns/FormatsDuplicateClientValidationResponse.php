<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

trait FormatsDuplicateClientValidationResponse
{
    /**
     * Si hay duplicado de cliente, el `message` top-level queda limpio
     * (sin el sufijo "(and N more error)") para que la app móvil lo muestre.
     */
    protected function failedValidation(Validator $validator): void
    {
        $errors = $validator->errors();
        $duplicateMessage = $errors->first('duplicate_registration');

        if (! is_string($duplicateMessage) || $duplicateMessage === '') {
            parent::failedValidation($validator);

            return;
        }

        throw new ValidationException($validator, new JsonResponse([
            'message' => $duplicateMessage,
            'errors' => $errors->messages(),
        ], 422));
    }
}
