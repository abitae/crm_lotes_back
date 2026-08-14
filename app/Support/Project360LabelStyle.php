<?php

namespace App\Support;

class Project360LabelStyle
{
    /** @var list<string> */
    public const FONTS = [
        'roboto',
        'exo2bold',
        'kelsonsans',
        'sourcecodepro',
        'monoid',
        'dejavu',
    ];

    /** @var list<string> */
    public const SHAPES = [
        'rounded',
        'rectangle',
        'pill',
        'tag',
        'none',
    ];

    /** @var list<string> */
    public const VISIBILITIES = [
        'always',
        'click',
    ];

    public const DEFAULT_COLOR = '#ffffff';

    public const DEFAULT_BACKGROUND_COLOR = '#0f172a';

    public const DEFAULT_BORDER_COLOR = '#334155';

    public const DEFAULT_BORDER_WIDTH = 0.03;

    public const DEFAULT_FONT = 'roboto';

    public const DEFAULT_SIZE = 1.0;

    public const DEFAULT_WIDTH = 1.2;

    public const DEFAULT_HEIGHT = 0.34;

    public const DEFAULT_ROTATION = 0.0;

    public const DEFAULT_SHAPE = 'rounded';

    public const DEFAULT_VISIBILITY = 'always';

    /**
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = ''): array
    {
        $colorKey = $prefix.'color';
        $backgroundKey = $prefix === '' ? 'background_color' : $prefix.'background_color';
        $borderColorKey = $prefix === '' ? 'border_color' : $prefix.'border_color';
        $borderWidthKey = $prefix === '' ? 'border_width' : $prefix.'border_width';
        $fontKey = $prefix === '' ? 'font' : $prefix.'font';
        $sizeKey = $prefix === '' ? 'size' : $prefix.'size';
        $widthKey = $prefix === '' ? 'width' : $prefix.'width';
        $heightKey = $prefix === '' ? 'height' : $prefix.'height';
        $rotationKey = $prefix === '' ? 'rotation' : $prefix.'rotation';
        $shapeKey = $prefix === '' ? 'shape' : $prefix.'shape';
        $visibilityKey = $prefix === '' ? 'visibility' : $prefix.'visibility';

        return [
            $colorKey => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            $backgroundKey => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            $borderColorKey => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            $borderWidthKey => ['required', 'numeric', 'between:0,0.16'],
            $fontKey => ['required', 'string', 'in:'.implode(',', self::FONTS)],
            $sizeKey => ['required', 'numeric', 'between:0.50,3.00'],
            $widthKey => ['required', 'numeric', 'between:0.50,4.00'],
            $heightKey => ['required', 'numeric', 'between:0.18,1.50'],
            $rotationKey => ['required', 'numeric', 'between:-180,180'],
            $shapeKey => ['required', 'string', 'in:'.implode(',', self::SHAPES)],
            $visibilityKey => ['required', 'string', 'in:'.implode(',', self::VISIBILITIES)],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaults(string $prefix = ''): array
    {
        if ($prefix === '') {
            return [
                'color' => self::DEFAULT_COLOR,
                'background_color' => self::DEFAULT_BACKGROUND_COLOR,
                'border_color' => self::DEFAULT_BORDER_COLOR,
                'border_width' => self::DEFAULT_BORDER_WIDTH,
                'font' => self::DEFAULT_FONT,
                'size' => self::DEFAULT_SIZE,
                'width' => self::DEFAULT_WIDTH,
                'height' => self::DEFAULT_HEIGHT,
                'rotation' => self::DEFAULT_ROTATION,
                'shape' => self::DEFAULT_SHAPE,
                'visibility' => self::DEFAULT_VISIBILITY,
            ];
        }

        return [
            $prefix.'color' => self::DEFAULT_COLOR,
            $prefix.'background_color' => self::DEFAULT_BACKGROUND_COLOR,
            $prefix.'border_color' => self::DEFAULT_BORDER_COLOR,
            $prefix.'border_width' => self::DEFAULT_BORDER_WIDTH,
            $prefix.'font' => self::DEFAULT_FONT,
            $prefix.'size' => self::DEFAULT_SIZE,
            $prefix.'width' => self::DEFAULT_WIDTH,
            $prefix.'height' => self::DEFAULT_HEIGHT,
            $prefix.'rotation' => self::DEFAULT_ROTATION,
            $prefix.'shape' => self::DEFAULT_SHAPE,
            $prefix.'visibility' => self::DEFAULT_VISIBILITY,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function mergeDefaults(array $input, string $prefix = ''): array
    {
        foreach (self::defaults($prefix) as $key => $value) {
            if (! array_key_exists($key, $input) || $input[$key] === null || $input[$key] === '') {
                $input[$key] = $value;
            }
        }

        return $input;
    }
}
