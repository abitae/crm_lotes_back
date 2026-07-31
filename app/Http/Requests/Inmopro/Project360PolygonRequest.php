<?php

namespace App\Http\Requests\Inmopro;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

abstract class Project360PolygonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'source_panorama_id' => ['required', 'integer', 'exists:project_assets,id'],
            'title' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'vertices' => ['required', 'array', 'min:3', 'max:32'],
            'vertices.*.yaw' => ['required', 'numeric', 'between:-180,180'],
            'vertices.*.pitch' => ['required', 'numeric', 'between:-85,85'],
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'hover_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'opacity' => ['required', 'numeric', 'between:0.10,0.70'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $vertices = $this->input('vertices');

            if (! is_array($vertices) || count($vertices) < 3 || $validator->errors()->isNotEmpty()) {
                return;
            }

            $points = $this->unwrapVertices($vertices);

            if ($this->hasDuplicateAdjacentVertices($points)) {
                $validator->errors()->add('vertices', 'El polígono no puede tener vértices consecutivos repetidos.');

                return;
            }

            if ($this->hasSelfIntersection($points)) {
                $validator->errors()->add('vertices', 'Los lados del polígono no pueden cruzarse.');
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.required' => 'El título del polígono es obligatorio.',
            'title.max' => 'El título no puede superar 100 caracteres.',
            'description.max' => 'La descripción no puede superar 500 caracteres.',
            'vertices.min' => 'Dibuja al menos tres vértices.',
            'vertices.max' => 'El polígono no puede superar 32 vértices.',
            'vertices.*.yaw.between' => 'El giro horizontal debe estar entre -180 y 180 grados.',
            'vertices.*.pitch.between' => 'El giro vertical debe estar entre -85 y 85 grados.',
            '*.regex' => 'Los colores deben usar el formato hexadecimal #RRGGBB.',
            'opacity.between' => 'La opacidad debe estar entre 0.10 y 0.70.',
        ];
    }

    /**
     * @param  array<int, mixed>  $vertices
     * @return list<array{x: float, y: float}>
     */
    private function unwrapVertices(array $vertices): array
    {
        $points = [];
        $previousYaw = null;

        foreach ($vertices as $vertex) {
            if (! is_array($vertex) || ! is_numeric($vertex['yaw'] ?? null) || ! is_numeric($vertex['pitch'] ?? null)) {
                continue;
            }

            $yaw = (float) $vertex['yaw'];

            if ($previousYaw !== null) {
                while ($yaw - $previousYaw > 180) {
                    $yaw -= 360;
                }

                while ($yaw - $previousYaw < -180) {
                    $yaw += 360;
                }
            }

            $points[] = ['x' => $yaw, 'y' => (float) $vertex['pitch']];
            $previousYaw = $yaw;
        }

        return $points;
    }

    /** @param list<array{x: float, y: float}> $points */
    private function hasDuplicateAdjacentVertices(array $points): bool
    {
        $count = count($points);

        for ($index = 0; $index < $count; $index++) {
            $current = $points[$index];
            $next = $points[($index + 1) % $count];

            if (abs($current['x'] - $next['x']) < 0.0001 && abs($current['y'] - $next['y']) < 0.0001) {
                return true;
            }
        }

        return false;
    }

    /** @param list<array{x: float, y: float}> $points */
    private function hasSelfIntersection(array $points): bool
    {
        $count = count($points);

        for ($first = 0; $first < $count; $first++) {
            $firstNext = ($first + 1) % $count;

            for ($second = $first + 1; $second < $count; $second++) {
                $secondNext = ($second + 1) % $count;

                if ($first === $second || $firstNext === $second || $secondNext === $first) {
                    continue;
                }

                if ($this->segmentsIntersect(
                    $points[$first],
                    $points[$firstNext],
                    $points[$second],
                    $points[$secondNext],
                )) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param  array{x: float, y: float}  $first
     * @param  array{x: float, y: float}  $second
     * @param  array{x: float, y: float}  $third
     * @param  array{x: float, y: float}  $fourth
     */
    private function segmentsIntersect(array $first, array $second, array $third, array $fourth): bool
    {
        $orientationOne = $this->orientation($first, $second, $third);
        $orientationTwo = $this->orientation($first, $second, $fourth);
        $orientationThree = $this->orientation($third, $fourth, $first);
        $orientationFour = $this->orientation($third, $fourth, $second);

        if (abs($orientationOne) < 0.000001 && $this->isOnSegment($first, $third, $second)) {
            return true;
        }

        if (abs($orientationTwo) < 0.000001 && $this->isOnSegment($first, $fourth, $second)) {
            return true;
        }

        if (abs($orientationThree) < 0.000001 && $this->isOnSegment($third, $first, $fourth)) {
            return true;
        }

        if (abs($orientationFour) < 0.000001 && $this->isOnSegment($third, $second, $fourth)) {
            return true;
        }

        return $orientationOne * $orientationTwo < 0 && $orientationThree * $orientationFour < 0;
    }

    /**
     * @param  array{x: float, y: float}  $start
     * @param  array{x: float, y: float}  $point
     * @param  array{x: float, y: float}  $end
     */
    private function isOnSegment(array $start, array $point, array $end): bool
    {
        return $point['x'] >= min($start['x'], $end['x']) - 0.000001
            && $point['x'] <= max($start['x'], $end['x']) + 0.000001
            && $point['y'] >= min($start['y'], $end['y']) - 0.000001
            && $point['y'] <= max($start['y'], $end['y']) + 0.000001;
    }

    /**
     * @param  array{x: float, y: float}  $first
     * @param  array{x: float, y: float}  $second
     * @param  array{x: float, y: float}  $third
     */
    private function orientation(array $first, array $second, array $third): float
    {
        return ($second['x'] - $first['x']) * ($third['y'] - $first['y'])
            - ($second['y'] - $first['y']) * ($third['x'] - $first['x']);
    }
}
