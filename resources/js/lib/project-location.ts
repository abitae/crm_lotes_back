export type ProjectLocationFields = {
    location?: string | null;
    maps_url?: string | null;
    location_label?: string | null;
};

export type ProjectLocationOption = {
    value: string;
    label: string;
};

export function normalizeProjectLocationOptions(
    locations: Array<ProjectLocationOption | string>,
): ProjectLocationOption[] {
    return locations.map((location) => {
        if (typeof location === 'string') {
            return { value: location, label: location };
        }

        return {
            value: String(location.value ?? ''),
            label: String(location.label ?? location.value ?? ''),
        };
    });
}

function isCoordinatePair(value: string): boolean {
    const match = value
        .trim()
        .match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);

    if (!match) {
        return false;
    }

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    return (
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

export function projectLocationLinkLabel(
    project: ProjectLocationFields,
): string {
    if (project.location_label) {
        return project.location_label;
    }

    if (project.location) {
        if (isCoordinatePair(project.location)) {
            return 'Abrir en Google Maps';
        }

        return project.location;
    }

    return 'Abrir en Google Maps';
}
