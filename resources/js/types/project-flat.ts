export const LOT_STATUS_LIBRE = 'LIBRE';

export type ProjectFlatLotStatus = {
    name: string;
    code: string;
    color: string;
};

export type ProjectFlatLot = {
    id: number;
    block: string;
    number: string;
    area?: string | number | null;
    price?: string | number | null;
    status: ProjectFlatLotStatus | null;
};

export function isLibreLot(lot: ProjectFlatLot | null | undefined): boolean {
    return lot?.status?.code === LOT_STATUS_LIBRE;
}

export type ProjectFlatVertex = {
    lat: number;
    lng: number;
};

export type ProjectFlatPolygon = {
    id: number;
    lot_id: number | null;
    lot: ProjectFlatLot | null;
    title: string;
    description: string | null;
    vertices: ProjectFlatVertex[];
    color: string;
    hover_color: string;
    opacity: number;
};

export type ProjectFlatMapsCenter = {
    lat: number;
    lng: number;
};
