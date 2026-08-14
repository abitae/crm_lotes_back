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
            'panorama_files.*.image' => 'Cada panorama debe ser una imagen JPG, PNG o WebP.',
            'panorama_files.*.file' => self::uploadFailedMessage(),
            'panorama_files.*.uploaded' => self::uploadFailedMessage(),
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
                if (! $file instanceof UploadedFile) {
                    continue;
                }

                if (! $file->isValid()) {
                    continue;
                }

                $details = self::describeFileViolations($file);
                if ($details === []) {
                    continue;
                }

                $validator->errors()->forget("panorama_files.{$index}");
                foreach ($details as $detail) {
                    $validator->errors()->add("panorama_files.{$index}", $detail);
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

    public static function uploadFailedMessage(): string
    {
        $upload = (string) (ini_get('upload_max_filesize') ?: '2M');
        $post = (string) (ini_get('post_max_size') ?: '8M');

        return 'No se pudo subir el panorama. El archivo supera el límite del servidor '
            ."(máx. archivo {$upload}, máx. POST {$post}) "
            .'o la transferencia se interrumpió. Usa un JPG, PNG o WebP de hasta 20 MB.';
    }

    /**
     * @return list<string>
     */
    public static function describeFileViolations(UploadedFile $file): array
    {
        $violations = [];
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $mime = strtolower((string) ($file->getMimeType() ?: $file->getClientMimeType()));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        $unknownMimes = ['', 'application/octet-stream'];
        $extensionAllowed = in_array($extension, $allowedExtensions, true);
        $mimeIsImage = in_array($mime, $allowedMimes, true);
        $formatOk = $mimeIsImage
            ? ($extensionAllowed || $extension === '')
            : (in_array($mime, $unknownMimes, true) && $extensionAllowed);

        if (! $formatOk) {
            $violations[] = sprintf(
                'Formato: detectado %s (%s). Debe ser JPG, PNG o WebP.',
                $extension !== '' ? strtoupper($extension) : 'sin extensión',
                $mime !== '' ? $mime : 'tipo desconocido',
            );
        }

        $bytes = (int) $file->getSize();
        $maxBytes = 20 * 1024 * 1024;
        if ($bytes > $maxBytes) {
            $violations[] = sprintf(
                'Peso: %s supera el máximo de 20 MB.',
                self::formatBytes($bytes),
            );
        }

        $size = @getimagesize($file->getPathname());
        if ($size === false) {
            $violations[] = 'Lectura: no se pudo abrir la imagen para medir resolución y proporción.';

            return $violations;
        }

        $width = (int) $size[0];
        $height = (int) $size[1];

        if ($width < self::MIN_WIDTH || $height < self::MIN_HEIGHT) {
            $violations[] = sprintf(
                'Resolución mínima: mide %d×%d. Mínimo %d×%d.',
                $width,
                $height,
                self::MIN_WIDTH,
                self::MIN_HEIGHT,
            );
        }

        if ($width > self::MAX_WIDTH || $height > self::MAX_HEIGHT) {
            $violations[] = sprintf(
                'Resolución máxima: mide %d×%d. Máximo %d×%d.',
                $width,
                $height,
                self::MAX_WIDTH,
                self::MAX_HEIGHT,
            );
        }

        if (! self::hasAcceptableEquirectangularRatio($width, $height)) {
            $ratio = $height > 0 ? $width / $height : 0;
            $minRatio = 2 * (1 - self::RATIO_TOLERANCE);
            $maxRatio = 2 * (1 + self::RATIO_TOLERANCE);
            $violations[] = sprintf(
                'Proporción 2:1: mide %d×%d (%.2f:1). Se requiere ~2:1, rango %.2f:1 a %.2f:1 (±5 %%).',
                $width,
                $height,
                $ratio,
                $minRatio,
                $maxRatio,
            );
        }

        return $violations;
    }

    public static function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return number_format($bytes / 1024, 1).' KB';
        }

        return number_format($bytes / (1024 * 1024), 1).' MB';
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
