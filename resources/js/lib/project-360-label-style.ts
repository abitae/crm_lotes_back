export const PROJECT_360_LABEL_FONTS = [
    ['roboto', 'Roboto'],
    ['exo2bold', 'Exo 2 Bold'],
    ['kelsonsans', 'Kelson Sans'],
    ['sourcecodepro', 'Source Code Pro'],
    ['monoid', 'Monoid'],
    ['dejavu', 'DejaVu'],
] as const;

export const PROJECT_360_LABEL_SHAPES = [
    ['rounded', 'Redondeada'],
    ['rectangle', 'Rectangular'],
    ['pill', 'Cápsula'],
    ['tag', 'Pin'],
    ['none', 'Solo texto'],
] as const;

export const PROJECT_360_LABEL_VISIBILITIES = [
    ['always', 'Siempre visible'],
    ['click', 'Al hacer clic'],
] as const;

export type Project360LabelFont = (typeof PROJECT_360_LABEL_FONTS)[number][0];
export type Project360LabelShape = (typeof PROJECT_360_LABEL_SHAPES)[number][0];
export type Project360BadgeVisibility =
    (typeof PROJECT_360_LABEL_VISIBILITIES)[number][0];

export type Project360LabelStyle = {
    color: string;
    background_color: string;
    border_color: string;
    border_width: number;
    font: Project360LabelFont;
    size: number;
    width: number;
    height: number;
    rotation: number;
    shape: Project360LabelShape;
    visibility: Project360BadgeVisibility;
};

export const PROJECT_360_LABEL_STYLE_DEFAULTS: Project360LabelStyle = {
    color: '#ffffff',
    background_color: '#0f172a',
    border_color: '#334155',
    border_width: 0.03,
    font: 'roboto',
    size: 1,
    width: 1.2,
    height: 0.34,
    rotation: 0,
    shape: 'rounded',
    visibility: 'always',
};

export function isProject360LabelFont(
    value: string,
): value is Project360LabelFont {
    return PROJECT_360_LABEL_FONTS.some(([id]) => id === value);
}

export function isProject360LabelShape(
    value: string,
): value is Project360LabelShape {
    return PROJECT_360_LABEL_SHAPES.some(([id]) => id === value);
}

export function isProject360BadgeVisibility(
    value: string,
): value is Project360BadgeVisibility {
    return PROJECT_360_LABEL_VISIBILITIES.some(([id]) => id === value);
}

export function resolveProject360LabelFont(
    value: string | null | undefined,
): Project360LabelFont {
    return value && isProject360LabelFont(value)
        ? value
        : PROJECT_360_LABEL_STYLE_DEFAULTS.font;
}

export function resolveProject360LabelShape(
    value: string | null | undefined,
): Project360LabelShape {
    return value && isProject360LabelShape(value)
        ? value
        : PROJECT_360_LABEL_STYLE_DEFAULTS.shape;
}

export function resolveProject360BadgeVisibility(
    value: string | null | undefined,
): Project360BadgeVisibility {
    return value && isProject360BadgeVisibility(value)
        ? value
        : PROJECT_360_LABEL_STYLE_DEFAULTS.visibility;
}

export function resolvePolygonLabelPosition(polygon: {
    vertices: Array<{ yaw: number; pitch: number }>;
    label_yaw: number | null;
    label_pitch: number | null;
    centroid: { yaw: number; pitch: number };
}): { yaw: number; pitch: number } {
    if (polygon.label_yaw !== null && polygon.label_pitch !== null) {
        return {
            yaw: polygon.label_yaw,
            pitch: polygon.label_pitch,
        };
    }

    return polygon.centroid;
}

export function project360LabelBoxLayout(
    text: string,
    style: Pick<Project360LabelStyle, 'width' | 'height'>,
): {
    displayLabel: string;
    width: number;
    height: number;
    textWidth: number;
} {
    const displayLabel = text.trim() || 'Etiqueta';
    const width = Number(
        Math.min(4, Math.max(0.5, style.width || 1.2)).toFixed(3),
    );
    const height = Number(
        Math.min(1.5, Math.max(0.18, style.height || 0.34)).toFixed(3),
    );

    return {
        displayLabel,
        width,
        height,
        textWidth: Number(Math.max(3.2, width * 3.3).toFixed(3)),
    };
}

export function project360LabelBadgePreviewStyle(style: Project360LabelStyle): {
    color: string;
    backgroundColor: string;
    border: string;
    borderRadius: string;
    transform: string;
    fontSize: string;
    minWidth: string;
    minHeight: string;
    padding: string;
    fontWeight: number;
    letterSpacing: string;
    display: string;
    alignItems: string;
    justifyContent: string;
    boxSizing: string;
} {
    const borderPx =
        style.shape === 'none' || style.border_width <= 0
            ? 0
            : Math.max(1, Math.round(style.border_width * 48));
    const radius = {
        rounded: '12px',
        rectangle: '2px',
        pill: '999px',
        tag: '4px 14px 14px 4px',
        none: '0',
    }[style.shape];
    const box = project360LabelBoxLayout('preview', style);

    return {
        color: style.color,
        backgroundColor:
            style.shape === 'none' ? 'transparent' : style.background_color,
        border:
            borderPx === 0
                ? 'none'
                : `${borderPx}px solid ${style.border_color}`,
        borderRadius: radius,
        transform: `rotate(${style.rotation}deg)`,
        fontSize: `${11 + style.size * 5}px`,
        minWidth: `${Math.round(box.width * 72)}px`,
        minHeight: `${Math.round(box.height * 72)}px`,
        padding: style.shape === 'none' ? '0' : '4px 10px',
        fontWeight: 700,
        letterSpacing: '0.01em',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
    };
}
