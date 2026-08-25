export type LotStatus = {
    id: number;
    name: string;
    code: string;
    color?: string;
};
export type Client = { id: number; name: string; dni?: string; phone?: string };
export type Advisor = { id: number; name: string };
export type ProjectAsset = {
    id: number;
    kind: 'image' | 'document';
    title?: string | null;
    file_name: string;
    mime_type?: string;
    file_size?: number;
    download_url: string;
    preview_url?: string | null;
};

export type Lot = {
    id: number;
    block: string;
    number: string;
    area?: string | number;
    price?: string | number;
    status?: LotStatus | null;
    client?: Client | null;
    advisor?: Advisor | null;
    client_name?: string | null;
    client_dni?: string | null;
    client_phone?: string | null;
    advance?: string | number | null;
    remaining_balance?: string | number | null;
    payment_limit_date?: string | null;
    operation_number?: string | null;
    contract_date?: string | null;
    contract_number?: string | null;
    notarial_transfer_date?: string | null;
    observations?: string | null;
};

export type Project = {
    id: number;
    is_active: boolean;
    name: string;
    location?: string;
    maps_url?: string | null;
    location_label?: string | null;
    total_lots?: number;
    blocks?: string[];
    assets?: ProjectAsset[];
    images?: ProjectAsset[];
    documents?: ProjectAsset[];
    lots?: Lot[];
    tour_360_url?: string | null;
    view_flat_url?: string | null;
};

export type LotPayload = {
    lot_status_id: number;
    client_id: number | null;
    advisor_id: number | null;
    client_name?: string | null;
    client_dni?: string | null;
    client_phone?: string | null;
    advance?: number | null;
    remaining_balance?: number | null;
    payment_limit_date?: string | null;
    operation_number?: string | null;
    contract_date?: string | null;
    contract_number?: string | null;
    notarial_transfer_date?: string | null;
    observations?: string | null;
    block?: string;
    number?: string;
    area?: number | null;
    price?: number | null;
};

export type PageProps = {
    project: Project;
    lotStatuses: LotStatus[];
    errors?: Record<string, string>;
};
