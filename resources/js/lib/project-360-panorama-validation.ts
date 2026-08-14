export const PROJECT_360_PANORAMA_RULES = {
    maxFiles: 5,
    maxBytes: 20 * 1024 * 1024,
    minWidth: 1920,
    minHeight: 960,
    maxWidth: 8192,
    maxHeight: 4200,
    targetRatio: 2,
    ratioTolerance: 0.05,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'] as const,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,
};

export type PanoramaCheckId =
    | 'format'
    | 'size'
    | 'readable'
    | 'min_resolution'
    | 'max_resolution'
    | 'ratio';

export type PanoramaCheck = {
    id: PanoramaCheckId;
    ok: boolean;
    label: string;
    detail: string;
};

export type PanoramaInspection = {
    name: string;
    type: string;
    size: number;
    width: number | null;
    height: number | null;
    readable: boolean;
};

export type PanoramaFileReport = {
    fileName: string;
    inspection: PanoramaInspection;
    checks: PanoramaCheck[];
    errors: string[];
    ok: boolean;
};

export type PanoramaSelectionAnalysis = {
    reports: PanoramaFileReport[];
    batchErrors: string[];
    ok: boolean;
};

export function minAcceptedRatio(): number {
    return (
        PROJECT_360_PANORAMA_RULES.targetRatio *
        (1 - PROJECT_360_PANORAMA_RULES.ratioTolerance)
    );
}

export function maxAcceptedRatio(): number {
    return (
        PROJECT_360_PANORAMA_RULES.targetRatio *
        (1 + PROJECT_360_PANORAMA_RULES.ratioTolerance)
    );
}

export function hasAcceptableEquirectangularRatio(
    width: number,
    height: number,
): boolean {
    if (height <= 0) {
        return false;
    }

    const ratio = width / height;

    return ratio >= minAcceptedRatio() && ratio <= maxAcceptedRatio();
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

export function formatRatio(width: number, height: number): string {
    if (height <= 0) {
        return '—';
    }

    return `${(width / height).toFixed(2)}:1`;
}

export function fileExtension(name: string): string {
    const parts = name.split('.');

    if (parts.length < 2) {
        return '';
    }

    return parts.pop()?.toLowerCase() ?? '';
}

export function isAllowedPanoramaFormat(file: {
    name: string;
    type: string;
}): boolean {
    const extension = fileExtension(file.name);
    const mime = file.type.toLowerCase();
    const allowedExtensions: readonly string[] =
        PROJECT_360_PANORAMA_RULES.allowedExtensions;
    const allowedMimes: readonly string[] =
        PROJECT_360_PANORAMA_RULES.allowedMimeTypes;

    if (allowedMimes.includes(mime)) {
        return allowedExtensions.includes(extension) || extension === '';
    }

    if (mime === '' || mime === 'application/octet-stream') {
        return allowedExtensions.includes(extension);
    }

    return false;
}

export function inspectPanoramaFile(
    inspection: PanoramaInspection,
): PanoramaFileReport {
    const rules = PROJECT_360_PANORAMA_RULES;
    const checks: PanoramaCheck[] = [];
    const formatOk = isAllowedPanoramaFormat(inspection);

    checks.push({
        id: 'format',
        ok: formatOk,
        label: 'Formato',
        detail: formatOk
            ? `Válido (${describeFormat(inspection)})`
            : `Detectado ${describeFormat(inspection)}. Debe ser JPG, PNG o WebP.`,
    });

    const sizeOk = inspection.size > 0 && inspection.size <= rules.maxBytes;
    checks.push({
        id: 'size',
        ok: sizeOk,
        label: 'Peso',
        detail: sizeOk
            ? `${formatBytes(inspection.size)} (máximo ${formatBytes(rules.maxBytes)})`
            : `${formatBytes(inspection.size)} supera el máximo de ${formatBytes(rules.maxBytes)}.`,
    });

    checks.push({
        id: 'readable',
        ok: inspection.readable,
        label: 'Lectura',
        detail: inspection.readable
            ? 'La imagen se pudo abrir y medir.'
            : 'No se pudo leer la imagen. El archivo está dañado o no es un panorama compatible.',
    });

    const width = inspection.width;
    const height = inspection.height;
    const hasSize =
        inspection.readable &&
        width !== null &&
        height !== null &&
        width > 0 &&
        height > 0;

    const minOk =
        hasSize && width >= rules.minWidth && height >= rules.minHeight;
    checks.push({
        id: 'min_resolution',
        ok: minOk,
        label: 'Resolución mínima',
        detail: hasSize
            ? minOk
                ? `${width}×${height} (mínimo ${rules.minWidth}×${rules.minHeight})`
                : `${width}×${height} es insuficiente. Mínimo ${rules.minWidth}×${rules.minHeight}.`
            : `No se pudo comprobar. Mínimo ${rules.minWidth}×${rules.minHeight}.`,
    });

    const maxOk =
        hasSize && width <= rules.maxWidth && height <= rules.maxHeight;
    checks.push({
        id: 'max_resolution',
        ok: maxOk,
        label: 'Resolución máxima',
        detail: hasSize
            ? maxOk
                ? `${width}×${height} (máximo ${rules.maxWidth}×${rules.maxHeight})`
                : `${width}×${height} excede el máximo ${rules.maxWidth}×${rules.maxHeight}.`
            : `No se pudo comprobar. Máximo ${rules.maxWidth}×${rules.maxHeight}.`,
    });

    const ratioOk =
        hasSize && hasAcceptableEquirectangularRatio(width, height);
    const ratioRange = `${minAcceptedRatio().toFixed(2)}:1 a ${maxAcceptedRatio().toFixed(2)}:1`;
    checks.push({
        id: 'ratio',
        ok: ratioOk,
        label: 'Proporción 2:1',
        detail: hasSize
            ? ratioOk
                ? `${formatRatio(width, height)} (rango ${ratioRange})`
                : `${formatRatio(width, height)} (${width}×${height}). Se requiere ~2:1, rango ${ratioRange}.`
            : `No se pudo comprobar. Se requiere ~2:1, rango ${ratioRange}.`,
    });

    const errors = checks.filter((check) => !check.ok).map((check) => `${check.label}: ${check.detail}`);

    return {
        fileName: inspection.name,
        inspection,
        checks,
        errors,
        ok: errors.length === 0,
    };
}

export function inspectPanoramaSelection(
    inspections: PanoramaInspection[],
): PanoramaSelectionAnalysis {
    const reports = inspections.map((inspection) =>
        inspectPanoramaFile(inspection),
    );
    const batchErrors: string[] = [];

    if (inspections.length > PROJECT_360_PANORAMA_RULES.maxFiles) {
        batchErrors.push(
            `Seleccionaste ${inspections.length} archivos. Puedes subir hasta ${PROJECT_360_PANORAMA_RULES.maxFiles} panoramas por vez.`,
        );
    }

    return {
        reports,
        batchErrors,
        ok:
            batchErrors.length === 0 &&
            reports.length > 0 &&
            reports.every((report) => report.ok),
    };
}

export async function readPanoramaImageSize(
    file: File,
): Promise<{ width: number; height: number } | null> {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file);
            const size = { width: bitmap.width, height: bitmap.height };
            bitmap.close();

            return size;
        } catch {
            // Fallback to HTMLImageElement.
        }
    }

    return readPanoramaImageSizeFromElement(file);
}

export async function analyzePanoramaFiles(
    files: File[],
): Promise<PanoramaSelectionAnalysis> {
    const inspections = await Promise.all(
        files.map(async (file): Promise<PanoramaInspection> => {
            const size = await readPanoramaImageSize(file);

            return {
                name: file.name,
                type: file.type,
                size: file.size,
                width: size?.width ?? null,
                height: size?.height ?? null,
                readable: size !== null,
            };
        }),
    );

    return inspectPanoramaSelection(inspections);
}

function describeFormat(inspection: Pick<PanoramaInspection, 'name' | 'type'>): string {
    const extension = fileExtension(inspection.name) || 'sin extensión';
    const mime = inspection.type || 'tipo desconocido';

    return `${extension.toUpperCase()} · ${mime}`;
}

function readPanoramaImageSizeFromElement(
    file: File,
): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            URL.revokeObjectURL(url);
            resolve(width > 0 && height > 0 ? { width, height } : null);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
        image.src = url;
    });
}
