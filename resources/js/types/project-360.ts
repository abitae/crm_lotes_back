export type Project360Panorama = {
    id: number;
    title: string;
    sort_order: number;
    viewer_url: string;
    is_starting: boolean;
};

export type Project360Hotspot = {
    id: number;
    source_panorama_id: number;
    target_panorama_id: number;
    label: string;
    yaw: number;
    pitch: number;
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
    panoramas: Project360Panorama[];
    hotspots: Project360Hotspot[];
    share_links?: Project360ShareLink[];
};
