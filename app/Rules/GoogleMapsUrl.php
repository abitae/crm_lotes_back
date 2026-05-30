<?php

namespace App\Rules;

use App\Services\Inmopro\ProjectLocationMapsResolver;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class GoogleMapsUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || trim($value) === '') {
            return;
        }

        $resolver = app(ProjectLocationMapsResolver::class);

        if (! $resolver->isGoogleMapsUrl($value) && ! $resolver->isCoordinatePair($value)) {
            $fail('Ingrese un enlace válido de Google Maps o coordenadas en formato latitud,longitud.');
        }
    }
}
