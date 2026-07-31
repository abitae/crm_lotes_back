export type Project360HotspotShape = 'sphere' | 'ring' | 'pin';
export type Project360LabelVisibility = 'always' | 'hover' | 'hidden';

export type Project360TourSettings = {
    accent_color: string;
    hotspot_color: string;
    hotspot_hover_color: string;
    hotspot_text_color: string;
    hotspot_size: number;
    hotspot_shape: Project360HotspotShape;
    hotspot_label_visibility: Project360LabelVisibility;
    hotspot_pulse_enabled: boolean;
};

export type Project360Panorama = {
    id: number;
    title: string;
    sort_order: number;
    viewer_url: string;
    is_starting: boolean;
    initial_yaw: number;
    initial_pitch: number;
    floor_plan_id: number | null;
    plan_x: number | null;
    plan_y: number | null;
};

export type Project360HotspotStyle = {
    color: string;
    hover_color: string;
    text_color: string;
    size: number;
    shape: Project360HotspotShape;
    label_visibility: Project360LabelVisibility;
    pulse_enabled: boolean;
};

export type Project360Hotspot = {
    id: number;
    source_panorama_id: number;
    target_panorama_id: number;
    label: string;
    yaw: number;
    pitch: number;
    style: Project360HotspotStyle;
    overrides: {
        color: string | null;
        hover_color: string | null;
        text_color: string | null;
        size: number | null;
        shape: Project360HotspotShape | null;
        label_visibility: Project360LabelVisibility | null;
        pulse_enabled: boolean | null;
    };
};

export type Project360FloorPlan = {
    id: number;
    title: string;
    sort_order: number;
    image_url: string;
    markers: {
        panorama_id: number;
        x: number;
        y: number;
    }[];
};

export type Project360ShareLink = {
    id: string;
    label: string | null;
    url: string;
    created_by: string | null;
    last_accessed_at: string | null;
    revoked_at: string | null;
};

export type Project360Tour = {
    start_panorama_id: number | null;
    settings: Project360TourSettings;
    panoramas: Project360Panorama[];
    hotspots: Project360Hotspot[];
    floor_plans: Project360FloorPlan[];
    share_links?: Project360ShareLink[];
};
