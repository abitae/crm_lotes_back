/**
 * Contrato JSON exacto del API público GET /api/v1/web/*
 * @see docs/API_WEB.md
 * @see App\Http\Controllers\Api\v1\Web\WebController
 */

/** Base path del API (sin dominio). */
export const WEB_API_V1_BASE_PATH = '/api/v1/web' as const;

/** Metadatos de paginación en GET /api/v1/web/projects */
export type WebProjectsIndexMeta = {
    tipo_web: 'lotesenremate.pe' | 'inviertexpress.pe';
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
};

/** Query params para GET /api/v1/web/projects */
export type WebProjectsIndexQuery = {
    /** Sitio consumidor (obligatorio en el API). */
    tipo_web: 'lotesenremate.pe' | 'inviertexpress.pe';
    page?: number;
    per_page?: number;
    search?: string;
    location?: string;
    project_type_id?: number;
    has_free_lots?: boolean;
    has_images?: boolean;
    has_videos?: boolean;
    order?: 'name' | 'name_desc' | 'lots_desc' | 'free_lots_desc';
};

/** Ciudad embebida en el catálogo web */
export type WebProjectCity = {
    id: number;
    name: string;
    department: string | null;
};

/** Resumen global en GET /api/v1/web/projects */
export type WebCatalogSummary = {
    projects_count: number;
    lots_total: number;
    lots_free: number;
    images_total: number;
    videos_total: number;
};

/** Tipo de proyecto embebido en cada proyecto */
export type WebProjectType = {
    id: number;
    name: string;
    code: string;
};

/**
 * Activo multimedia (imagen o vídeo) en listados del catálogo web.
 * `url` es la URL pública absoluta bajo /storage/...
 */
export type WebProjectAsset = {
    id: number;
    kind: string;
    title: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    url: string;
};

/** Proyecto en listado o detalle (misma forma en ambos endpoints) */
export type WebProject = {
    id: number;
    name: string;
    /** Coordenadas `lat,lng` o URL de Google Maps (no es ciudad/distrito). */
    location: string | null;
    maps_url: string | null;
    location_label: string | null;
    blocks: string[];
    total_lots: number | null;
    lots_count: number;
    free_lots_count: number;
    project_type: WebProjectType | null;
    image_portada: string | null;
    tipo_web: string | null;
    city: WebProjectCity | null;
    province: string | null;
    district: string | null;
    project_zone: string | null;
    registry_status: string | null;
    descripcion: string | null;
    precio_web: number | null;
    images: WebProjectAsset[];
    videos: WebProjectAsset[];
    images_count: number;
    videos_count: number;
};

/** Respuesta exacta: GET /api/v1/web/projects */
export type WebProjectsIndexResponse = {
    summary: WebCatalogSummary;
    meta: WebProjectsIndexMeta;
    data: WebProject[];
};

/** Respuesta exacta: GET /api/v1/web/projects/{id} */
export type WebProjectShowResponse = {
    data: WebProject;
};

/**
 * Props para la página web del catálogo (listado).
 * Usar tras `fetchWebProjectsCatalog()` o equivalente.
 */
export type WebProjectsCatalogPageProps = WebProjectsIndexResponse;

/**
 * Props para la página web de detalle de un proyecto.
 * Usar tras `fetchWebProject()` o equivalente.
 */
export type WebProjectDetailPageProps = WebProjectShowResponse;
