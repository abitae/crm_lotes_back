export type ProjectLocationFields = {
    location?: string | null;
    maps_url?: string | null;
    location_label?: string | null;
};

export type ProjectLocationOption = {
    value: string;
    label: string;
};

export function projectLocationLinkLabel(project: ProjectLocationFields): string {
    if (project.location_label) {
        return project.location_label;
    }

    if (project.location) {
        return project.location;
    }

    return 'Ver en Google Maps';
}
