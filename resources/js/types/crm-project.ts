export type CrmProjectDocument = {
    id: number;
    title: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
    download_url: string;
    share_url: string;
};

export type CrmProjectCard = {
    id: number;
    name: string;
    place_label: string | null;
    image_url: string | null;
    total_lots: number | null;
    lots_count: number;
    available_lots_count: number;
    view_360_url: string | null;
    view_flat_url: string | null;
    maps_url: string | null;
    maps_embed_url: string | null;
    documents_count: number;
    documents: CrmProjectDocument[];
};
