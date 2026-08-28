<?php

namespace App\Services\Meta\Normalizers;

class InstagramNormalizer extends MessengerNormalizer
{
    /**
     * @param  array<string, mixed>  $entry
     * @return list<array<string, mixed>>
     */
    public function normalizeInstagram(array $entry): array
    {
        return $this->normalize($entry, 'instagram');
    }
}
