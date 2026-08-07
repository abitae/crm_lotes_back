<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class StoreProject360PanoramasRequest extends FormRequest
{
    /**
     * Tolerancia relativa sobre la proporción 2:1 (p. ej. 0.05 = ±5 %).
     */
    public const RATIO_TOLERANCE = 0.05;

    public const MIN_WIDTH = 1920;

    public const MIN_HEIGHT = 960;

    public const MAX_WIDTH = 8192;

    public const MAX_HEIGHT = 4200;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'panorama_files' => ['required', 'array', 'min:1', 'max:5'],
            'panorama_files.*' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:20480',
                'dimensions:min_width='.self::MIN_WIDTH.',min_height='.self::MIN_HEIGHT.',max_width='.self::MAX_WIDTH.',max_height='.self::MAX_HEIGHT,
            ],
            'panorama_titles' => ['required', 'array', 'min:1', 'max:5'],
            'panorama_titles.*' => ['required', 'string', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'panorama_files.required' => 'Selecciona al menos una imagen panorámica.',
            'panorama_files.max' => 'Puedes subir hasta 5 panoramas por vez.',
            'panorama_files.*.mimes' => 'Cada panorama debe ser JPG, PNG o WebP.',
            'panorama_files.*.max' => 'Cada panorama puede pesar como máximo 20 MB.',
            'panorama_files.*.dimensions' => sprintf(
                'Cada panorama debe medir entre %d×%d y %d×%d píxeles.',
                self::MIN_WIDTH,
                self::MIN_HEIGHT,
                self::MAX_WIDTH,
                self::MAX_HEIGHT,
            ),
            'panorama_titles.*.required' => 'Indica un título para cada panorama.',
            'panorama_titles.*.max' => 'El título no puede superar 100 caracteres.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var list<UploadedFile|null> $files */
            $files = $this->file('panorama_files') ?? [];
            $titles = $this->input('panorama_titles') ?? [];

            foreach ($files as $index => $file) {
                if (! $file instanceof UploadedFile || $validator->errors()->has("panorama_files.{$index}")) {
                    continue;
                }

                $size = @getimagesize($file->getPathname());
                if ($size === false) {
                    continue;
                }

                [$width, $height] = $size;
                if (! self::hasAcceptableEquirectangularRatio((int) $width, (int) $height)) {
                    $validator->errors()->add(
                        "panorama_files.{$index}",
                        'Cada panorama debe ser aproximadamente 2:1 (equirectangular), con hasta ±5 % de tolerancia.',
                    );
                }
            }

            if ($validator->errors()->isEmpty() && count($files) !== count($titles)) {
                $validator->errors()->add('panorama_titles', 'Indica un título para cada panorama subido.');
            }

            $this->bubbleIndexedErrors($validator, 'panorama_files');
        });
    }

    public static function hasAcceptableEquirectangularRatio(int $width, int $height): bool
    {
        if ($height <= 0) {
            return false;
        }

        $ratio = $width / $height;
        $min = 2 * (1 - self::RATIO_TOLERANCE);
        $max = 2 * (1 + self::RATIO_TOLERANCE);

        return $ratio >= $min && $ratio <= $max;
    }

    private function bubbleIndexedErrors(Validator $validator, string $field): void
    {
        $bag = $validator->errors();
        $messagesToAdd = [];

        foreach ($bag->getMessages() as $key => $messages) {
            if (! preg_match('/^'.preg_quote($field, '/').'\.\d+$/', $key)) {
                continue;
            }

            foreach ($messages as $message) {
                $messagesToAdd[] = $message;
            }
        }

        foreach (array_unique($messagesToAdd) as $message) {
            if (! in_array($message, $bag->get($field), true)) {
                $bag->add($field, $message);
            }
        }
    }
}
