import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Download,
    Eye,
    FileSpreadsheet,
    MapPin,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import { ProjectLocationFieldHelp } from '@/components/inmopro/project-location-field-help';
import { ProjectLocationLink } from '@/components/inmopro/project-location-link';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete, confirmToggleProjectActive } from '@/lib/swal';
import type { ProjectLocationOption } from '@/lib/project-location';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type Project = {
    id: number;
    is_active: boolean;
    name: string;
    project_type_id?: number | null;
    project_type?: { id: number; name: string; code: string } | null;
    location?: string | null;
    maps_url?: string | null;
    location_label?: string | null;
    total_lots?: number | null;
    lots_count?: number;
    free_lots_count?: number;
    reserved_lots_count?: number;
    transferred_lots_count?: number;
    installments_lots_count?: number;
    portfolio_value?: number;
    receivable_balance?: number;
    occupancy_rate?: number;
    consistency_gap?: number;
    is_consistent?: boolean;
    blocks_count?: number;
};

type ProjectTypeOption = { id: number; name: string; code: string };

type ImportFieldError = {
    excel_row: number;
    field: string;
    field_label: string;
    message: string;
    received_value: string | null;
};

type ImportPreviewRow = {
    excel_row: number;
    item: string | null;
    block: string | null;
    number: string | null;
    area: number | null;
    price: number | null;
    client_name: string | null;
    client_phone: string | null;
    client_dni: string | null;
    status: string;
    errors: string[];
    field_errors?: ImportFieldError[];
};

type ImportPreviewResponse = {
    project: {
        sheet_name: string;
        name: string;
        location: string;
        project_type_id: number;
        blocks: string[];
        total_lots: number;
        existing_project_id?: number | null;
    };
    summary: {
        rows_read: number;
        valid: number;
        invalid: number;
    };
    rows: ImportPreviewRow[];
    errors: ImportFieldError[];
    error_summary: {
        total: number;
        by_field: Record<string, number>;
        affected_rows: number;
    };
    validation: {
        required_columns: string[];
        missing_columns: string[];
        recognized_columns: string[];
        valid_lot_statuses: string[];
    };
    import_blocked_reason: string | null;
    token: string | null;
    can_import: boolean;
};

type PageProps = {
    projects: { data: Project[]; links: PaginationLink[]; total?: number };
    filters: {
        search?: string;
        project_type_id?: string | number;
        location?: string;
        health?: string;
        order?: string;
        is_active?: string;
    };
    projectTypes: ProjectTypeOption[];
    locations: ProjectLocationOption[];
    summary: {
        totalProjects: number;
        totalLots: number;
        totalFreeLots: number;
        totalBalance: number;
        inconsistentProjects: number;
    };
};

export default function ProjectsIndex({
    projects,
    filters,
    projectTypes,
    locations,
    summary,
}: PageProps) {
    const items = projects.data;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Proyectos', href: '/inmopro/projects' },
    ];
    const [importModalOpen, setImportModalOpen] = useState(false);

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`Eliminar el proyecto "${name}"?`)) {
            router.delete(`/inmopro/projects/${id}`);
        }
    };

    const handleToggleActive = async (project: Project) => {
        const activating = !project.is_active;
        if (!(await confirmToggleProjectActive(project.name, activating))) {
            return;
        }
        router.patch(
            `/inmopro/projects/${project.id}/toggle-active`,
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        router.get(
            '/inmopro/projects',
            {
                search: formData.get('search') || undefined,
                project_type_id: formData.get('project_type_id') || undefined,
                location: formData.get('location') || undefined,
                health: formData.get('health') || undefined,
                order: formData.get('order') || undefined,
                is_active: formData.get('is_active') || undefined,
            },
            { preserveState: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proyectos - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Portafolio de proyectos
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Control de stock, consistencia, cartera y avance
                            comercial por proyecto.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            onClick={() => setImportModalOpen(true)}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Importar Excel
                        </Button>
                        <Button size="sm" asChild>
                            <Link href="/inmopro/projects/create">
                                <Plus className="h-4 w-4" />
                                Nuevo proyecto
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-5">
                    <ProjectMetric
                        label="Proyectos"
                        value={String(summary.totalProjects)}
                    />
                    <ProjectMetric
                        label="Lotes visibles"
                        value={String(summary.totalLots)}
                        tone="emerald"
                    />
                    <ProjectMetric
                        label="Stock libre"
                        value={String(summary.totalFreeLots)}
                        tone="blue"
                    />
                    <ProjectMetric
                        label="Saldo por cobrar"
                        value={`S/ ${summary.totalBalance.toLocaleString('es-PE')}`}
                        tone="amber"
                    />
                    <ProjectMetric
                        label="Inconsistencias"
                        value={String(summary.inconsistentProjects)}
                        tone="rose"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros de gestion</CardTitle>
                        <CardDescription>
                            Busque por proyecto, sectorice por ubicacion y
                            priorice riesgos de inventario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleFilter}
                            className="grid gap-3 lg:grid-cols-6"
                        >
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    name="search"
                                    placeholder="Nombre o ubicacion..."
                                    defaultValue={filters.search}
                                    className="pl-9"
                                />
                            </div>
                            <select
                                name="location"
                                defaultValue={filters.location ?? ''}
                                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Todas las ubicaciones</option>
                                {locations.map((location) => (
                                    <option
                                        key={location.value}
                                        value={location.value}
                                    >
                                        {location.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                name="project_type_id"
                                defaultValue={
                                    filters.project_type_id != null
                                        ? String(filters.project_type_id)
                                        : ''
                                }
                                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Todos los tipos</option>
                                {projectTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                name="health"
                                defaultValue={filters.health ?? ''}
                                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Todos los estados</option>
                                <option value="with_stock">
                                    Con stock libre
                                </option>
                                <option value="sold_out">
                                    Sin stock libre
                                </option>
                                <option value="inconsistent">
                                    Inconsistentes
                                </option>
                            </select>
                            <select
                                name="is_active"
                                defaultValue={filters.is_active ?? ''}
                                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Activos e inactivos</option>
                                <option value="1">Solo activos</option>
                                <option value="0">Solo inactivos</option>
                            </select>
                            <div className="flex gap-2 lg:col-span-2">
                                <select
                                    name="order"
                                    defaultValue={filters.order ?? ''}
                                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Orden alfabetico</option>
                                    <option value="lots_desc">Mas lotes</option>
                                    <option value="availability_desc">
                                        Mas stock libre
                                    </option>
                                    <option value="balance_desc">
                                        Mayor saldo por cobrar
                                    </option>
                                    <option value="value_desc">
                                        Mayor valor de cartera
                                    </option>
                                </select>
                                <Button type="submit" variant="secondary">
                                    Aplicar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tablero del portafolio</CardTitle>
                        <CardDescription>
                            Comparativo de stock, ocupacion y consistencia
                            operativa por proyecto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="rounded-full bg-slate-100 p-4">
                                    <MapPin className="h-10 w-10 text-slate-400" />
                                </div>
                                <p className="mt-4 font-medium text-slate-700">
                                    No hay proyectos
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Cree uno manualmente o importe desde Excel.
                                </p>
                                <Button className="mt-4" asChild>
                                    <Link href="/inmopro/projects/create">
                                        <Plus className="h-4 w-4" />
                                        Crear proyecto
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/80">
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">
                                                    Proyecto
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">
                                                    Estado
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">
                                                    Tipo
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">
                                                    Stock
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">
                                                    Avance
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">
                                                    Cartera
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-600">
                                                    Consistencia
                                                </th>
                                                <th className="px-4 py-3 text-right font-medium text-slate-600">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map((project) => (
                                                <tr
                                                    key={project.id}
                                                    className="align-top hover:bg-slate-50/50"
                                                >
                                                    <td className="px-4 py-4">
                                                        <div>
                                                            <p className="font-semibold text-slate-900">
                                                                {project.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {project.maps_url ||
                                                                project.location ? (
                                                                    <ProjectLocationLink
                                                                        location={
                                                                            project.location
                                                                        }
                                                                        maps_url={
                                                                            project.maps_url
                                                                        }
                                                                        location_label={
                                                                            project.location_label
                                                                        }
                                                                        className="text-xs"
                                                                    />
                                                                ) : (
                                                                    'Sin ubicacion'
                                                                )}{' '}
                                                                ·{' '}
                                                                {project.blocks_count ??
                                                                    0}{' '}
                                                                manzana(s)
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                                                project.is_active
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {project.is_active
                                                                ? 'Activo'
                                                                : 'Inactivo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                                            {project
                                                                .project_type
                                                                ?.name ??
                                                                'Sin tipo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1 text-xs text-slate-600">
                                                            <p>
                                                                Planificado:{' '}
                                                                <span className="font-semibold text-slate-900">
                                                                    {project.total_lots ??
                                                                        0}
                                                                </span>
                                                            </p>
                                                            <p>
                                                                Real:{' '}
                                                                <span className="font-semibold text-slate-900">
                                                                    {project.lots_count ??
                                                                        0}
                                                                </span>
                                                            </p>
                                                            <p>
                                                                Libres:{' '}
                                                                <span className="font-semibold text-emerald-700">
                                                                    {project.free_lots_count ??
                                                                        0}
                                                                </span>
                                                            </p>
                                                            <p>
                                                                Reservados/colocados:{' '}
                                                                <span className="font-semibold text-slate-900">
                                                                    {(project.reserved_lots_count ??
                                                                        0) +
                                                                        (project.transferred_lots_count ??
                                                                            0) +
                                                                        (project.installments_lots_count ??
                                                                            0)}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {project.occupancy_rate ??
                                                                    0}
                                                                % ocupado
                                                            </p>
                                                            <div className="h-2 w-40 rounded-full bg-slate-100">
                                                                <div
                                                                    className="h-2 rounded-full bg-emerald-500"
                                                                    style={{
                                                                        width: `${Math.min(project.occupancy_rate ?? 0, 100)}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 text-[11px]">
                                                                <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">
                                                                    Reservado:{' '}
                                                                    {project.reserved_lots_count ??
                                                                        0}
                                                                </span>
                                                                <span className="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-700">
                                                                    Transferido:{' '}
                                                                    {project.transferred_lots_count ??
                                                                        0}
                                                                </span>
                                                                <span className="rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
                                                                    Cuotas:{' '}
                                                                    {project.installments_lots_count ??
                                                                        0}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1 text-xs text-slate-600">
                                                            <p>
                                                                Valor cartera:{' '}
                                                                <span className="font-semibold text-slate-900">
                                                                    S/{' '}
                                                                    {(
                                                                        project.portfolio_value ??
                                                                        0
                                                                    ).toLocaleString(
                                                                        'es-PE',
                                                                    )}
                                                                </span>
                                                            </p>
                                                            <p>
                                                                Saldo pendiente:{' '}
                                                                <span className="font-semibold text-amber-700">
                                                                    S/{' '}
                                                                    {(
                                                                        project.receivable_balance ??
                                                                        0
                                                                    ).toLocaleString(
                                                                        'es-PE',
                                                                    )}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {project.is_consistent ? (
                                                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                                                Consistente
                                                            </span>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                                    Inconsistente
                                                                </span>
                                                                <p className="text-xs text-slate-500">
                                                                    Brecha:{' '}
                                                                    {project.consistency_gap ??
                                                                        0}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={`/inmopro/projects/${project.id}`}
                                                                    title="Ver"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={`/inmopro/projects/${project.id}/edit`}
                                                                    title="Editar"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    'h-8 w-8',
                                                                    project.is_active
                                                                        ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                                                        : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700',
                                                                )}
                                                                onClick={() =>
                                                                    handleToggleActive(
                                                                        project,
                                                                    )
                                                                }
                                                                title={
                                                                    project.is_active
                                                                        ? 'Desactivar'
                                                                        : 'Activar'
                                                                }
                                                            >
                                                                {project.is_active ? (
                                                                    <PowerOff className="h-4 w-4" />
                                                                ) : (
                                                                    <Power className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                                onClick={() =>
                                                                    handleDestroy(
                                                                        project.id,
                                                                        project.name,
                                                                    )
                                                                }
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-slate-100 px-4 py-3">
                                    <Pagination links={projects.links} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ProjectExcelImportModal
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
                projectTypes={projectTypes}
            />
        </AppLayout>
    );
}

function ProjectExcelImportModal({
    open,
    onOpenChange,
    projectTypes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectTypes: ProjectTypeOption[];
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);
    const [form, setForm] = useState({
        name: '',
        location: '',
        project_type_id: '',
    });

    const reset = (): void => {
        setDragActive(false);
        setFileName(null);
        setLoadingPreview(false);
        setConfirming(false);
        setFetchError(null);
        setPreview(null);
        setShowOnlyErrors(false);
        setForm({
            name: '',
            location: '',
            project_type_id: '',
        });
        if (fileRef.current) {
            fileRef.current.value = '';
        }
    };

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open]);

    const assignFile = (file: File | undefined): void => {
        if (!file) {
            setFileName(null);
            setPreview(null);

            return;
        }

        const lower = file.name.toLowerCase();
        if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
            setFetchError('Solo se aceptan archivos Excel (.xlsx o .xls).');

            return;
        }

        const input = fileRef.current;
        if (!input) {
            return;
        }

        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
        } catch {
            setFetchError(
                'No se pudo asignar el archivo. Use el selector manual.',
            );

            return;
        }

        setFetchError(null);
        setPreview(null);
        setFileName(file.name);
    };

    const runPreview = async (): Promise<void> => {
        const input = fileRef.current;

        if (!input?.files?.length) {
            setFetchError('Seleccione un archivo Excel antes de validar.');

            return;
        }

        if (form.project_type_id === '' || form.location.trim() === '') {
            setFetchError(
                'Complete ubicacion y tipo de proyecto antes de validar.',
            );

            return;
        }

        setLoadingPreview(true);
        setFetchError(null);

        const fd = new FormData();
        fd.append('file', input.files[0]);
        fd.append('project_type_id', form.project_type_id);
        fd.append('location', form.location);
        if (form.name.trim() !== '') {
            fd.append('name', form.name.trim());
        }

        try {
            const res = await fetch('/inmopro/projects/import-preview', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getXsrfTokenFromCookie(),
                },
                body: fd,
                credentials: 'same-origin',
            });

            const body = (await res.json()) as ImportPreviewResponse & {
                message?: string;
                errors?: Record<string, string[]>;
            };

            if (!res.ok) {
                const firstFieldError = Object.values(
                    body.errors ?? {},
                ).flat()[0];
                const serverMessage = body.message?.trim();
                setFetchError(
                    serverMessage ??
                        firstFieldError ??
                        (res.status >= 500
                            ? 'Error del servidor al validar el archivo. Revise el Excel o contacte al administrador.'
                            : 'No se pudo validar el archivo.'),
                );
                setPreview(null);

                return;
            }

            setPreview(body);
            setForm((current) => ({
                ...current,
                name: body.project.name,
            }));
        } catch {
            setFetchError(
                'Error de red al validar el archivo. Intente de nuevo.',
            );
        } finally {
            setLoadingPreview(false);
        }
    };

    const confirmImport = (): void => {
        if (!preview?.token || !preview.can_import) {
            return;
        }

        setConfirming(true);
        router.post(
            '/inmopro/projects/import-confirm',
            { token: preview.token },
            {
                onFinish: () => setConfirming(false),
                onSuccess: () => onOpenChange(false),
            },
        );
    };

    const updateField = (
        field: 'name' | 'location' | 'project_type_id',
        value: string,
    ): void => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
        setPreview(null);
        setFetchError(null);
    };

    const rows = preview?.rows ?? [];
    const errors = preview?.errors ?? [];
    const displayedRows = showOnlyErrors
        ? rows.filter((row) => row.errors.length > 0)
        : rows;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[92vh] w-[min(100vw-1.5rem,72rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(100vw-2rem,72rem)]">
                <div className="border-b border-slate-100 px-6 py-4">
                    <DialogHeader className="space-y-1 text-left">
                        <DialogTitle>
                            Importar proyectos desde Excel
                        </DialogTitle>
                        <DialogDescription className="text-left">
                            Todo el flujo ocurre en este modal: descargue la
                            plantilla, cargue el Excel, revise la validacion y
                            confirme solo si no hay errores.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="sr-only"
                        aria-hidden
                        tabIndex={-1}
                        onChange={(e) => assignFile(e.target.files?.[0])}
                    />

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2 text-sm text-slate-700">
                                <p className="text-[11px] font-black tracking-widest text-emerald-700 uppercase">
                                    Plantilla oficial
                                </p>
                                <p>
                                    La columna <strong>PROYECTO</strong> va al{' '}
                                    <strong>final</strong> de la hoja (mismo
                                    nombre en todas las filas). Los clientes se
                                    registran con{' '}
                                    <strong>NOMBRE CLIENTE</strong>,{' '}
                                    <strong>DNI CLIENTE</strong> y{' '}
                                    <strong>TELEFONO</strong>; si el DNI ya
                                    existe en el sistema, solo se actualizan
                                    nombre y teléfono.
                                </p>
                                <p className="font-semibold text-slate-800">
                                    Campos obligatorios del modal
                                </p>
                                <p>
                                    Ubicacion y tipo de proyecto deben
                                    completarse antes de validar el Excel.
                                </p>
                            </div>
                            <Button
                                type="button"
                                asChild
                                className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                            >
                                <a
                                    href="/inmopro/projects/excel-template"
                                    download
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar plantilla
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="project-import-name">
                                Nombre del proyecto
                            </Label>
                            <Input
                                id="project-import-name"
                                value={form.name}
                                onChange={(e) =>
                                    updateField('name', e.target.value)
                                }
                                placeholder="Se detectara desde la hoja al validar"
                            />
                        </div>
                        <div className="space-y-2">
                            <ProjectLocationFieldHelp htmlFor="project-import-location" />
                            <Input
                                id="project-import-location"
                                type="text"
                                value={form.location}
                                onChange={(e) =>
                                    updateField('location', e.target.value)
                                }
                                placeholder="-12.046374,-77.042793"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project-import-type">
                                Tipo de proyecto
                            </Label>
                            <select
                                id="project-import-type"
                                value={form.project_type_id}
                                onChange={(e) =>
                                    updateField(
                                        'project_type_id',
                                        e.target.value,
                                    )
                                }
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Seleccione un tipo</option>
                                {projectTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label>Archivo Excel</Label>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                if (e.currentTarget === e.target) {
                                    setDragActive(false);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragActive(false);
                                assignFile(e.dataTransfer.files?.[0]);
                            }}
                            className={cn(
                                'mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                                dragActive
                                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900'
                                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                            )}
                        >
                            <Upload
                                className="h-9 w-9 opacity-70"
                                aria-hidden
                            />
                            <span className="text-sm font-semibold">
                                Arrastre el archivo aqui o{' '}
                                <span className="text-emerald-700 underline underline-offset-2">
                                    seleccionelo manualmente
                                </span>
                            </span>
                            <span className="text-xs text-slate-500">
                                {fileName ?? 'No hay archivo seleccionado'}
                            </span>
                        </button>
                    </div>

                    {fetchError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {fetchError}
                        </div>
                    ) : null}

                    {preview ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-4">
                                <PreviewMetric
                                    label="Hoja detectada"
                                    value={preview.project.sheet_name}
                                />
                                <PreviewMetric
                                    label="Filas leidas"
                                    value={String(preview.summary.rows_read)}
                                />
                                <PreviewMetric
                                    label="Validas"
                                    value={String(preview.summary.valid)}
                                    tone="emerald"
                                />
                                <PreviewMetric
                                    label="Con error"
                                    value={String(preview.summary.invalid)}
                                    tone={
                                        preview.summary.invalid > 0
                                            ? 'rose'
                                            : 'slate'
                                    }
                                />
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
                                <div className="flex flex-col gap-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {preview.project.name}
                                        </p>
                                        <p>
                                            Manzanas detectadas:{' '}
                                            {preview.project.blocks.length > 0
                                                ? preview.project.blocks.join(
                                                      ', ',
                                                  )
                                                : 'Sin manzanas validas'}
                                        </p>
                                    </div>
                                    {preview.project.existing_project_id ? (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Se actualizara un proyecto existente
                                        </span>
                                    ) : (
                                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                            Se creara un proyecto nuevo
                                        </span>
                                    )}
                                </div>
                            </div>

                            {preview.import_blocked_reason &&
                            !preview.can_import ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    <p className="font-semibold">
                                        Importacion bloqueada
                                    </p>
                                    <p className="mt-1">
                                        {preview.import_blocked_reason}
                                    </p>
                                </div>
                            ) : null}

                            {errors.length > 0 ? (
                                <ProjectImportValidationErrors
                                    errors={errors}
                                    errorSummary={preview.error_summary}
                                    validation={preview.validation}
                                />
                            ) : null}

                            {preview.can_import ? (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                    Validacion correcta: puede confirmar la
                                    importacion de {preview.summary.valid}{' '}
                                    lote(s).
                                </div>
                            ) : null}

                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800">
                                    Detalle por fila
                                </p>
                                {preview.summary.invalid > 0 ? (
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={showOnlyErrors}
                                            onChange={(e) =>
                                                setShowOnlyErrors(
                                                    e.target.checked,
                                                )
                                            }
                                            className="rounded border-slate-300"
                                        />
                                        Solo filas con error (
                                        {preview.summary.invalid})
                                    </label>
                                ) : null}
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-slate-600">
                                            <th className="px-4 py-3">Fila</th>
                                            <th className="px-4 py-3">MZ</th>
                                            <th className="px-4 py-3">Lote</th>
                                            <th className="px-4 py-3">Area</th>
                                            <th className="px-4 py-3">Monto</th>
                                            <th className="px-4 py-3">
                                                Cliente
                                            </th>
                                            <th className="px-4 py-3">
                                                Teléfono
                                            </th>
                                            <th className="px-4 py-3">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3">
                                                Resultado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayedRows.map((row) => (
                                            <tr
                                                key={row.excel_row}
                                                className={cn(
                                                    'align-top',
                                                    row.errors.length > 0 &&
                                                        'bg-rose-50/60',
                                                )}
                                            >
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {row.excel_row}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {row.block ?? '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {row.number ?? '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {row.area ?? '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {row.price ?? '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {row.client_name ?? '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {row.client_phone ?? '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {row.status}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.errors.length === 0 ? (
                                                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                                            OK
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-1 text-xs text-rose-700">
                                                            {row.errors.map(
                                                                (error) => (
                                                                    <p
                                                                        key={
                                                                            error
                                                                        }
                                                                    >
                                                                        {error}
                                                                    </p>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="border-t border-slate-100 px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void runPreview()}
                        disabled={loadingPreview}
                    >
                        {loadingPreview ? 'Validando...' : 'Validar archivo'}
                    </Button>
                    <Button
                        type="button"
                        onClick={confirmImport}
                        disabled={
                            !preview?.can_import ||
                            !preview?.token ||
                            confirming
                        }
                    >
                        {confirming ? 'Importando...' : 'Importar proyecto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ProjectImportValidationErrors({
    errors,
    errorSummary,
    validation,
}: {
    errors: ImportFieldError[];
    errorSummary: ImportPreviewResponse['error_summary'];
    validation: ImportPreviewResponse['validation'];
}) {
    const groupedByRow = errors.reduce<Record<number, ImportFieldError[]>>(
        (acc, error) => {
            if (!acc[error.excel_row]) {
                acc[error.excel_row] = [];
            }
            acc[error.excel_row].push(error);

            return acc;
        },
        {},
    );

    const sortedRows = Object.keys(groupedByRow)
        .map(Number)
        .sort((a, b) => a - b);

    return (
        <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div>
                <p className="text-sm font-semibold text-rose-900">
                    {errorSummary.total} error(es) en{' '}
                    {errorSummary.affected_rows} fila(s)
                </p>
                <p className="mt-1 text-sm text-rose-700">
                    Revise columna, mensaje y valor recibido. Corrija el Excel y
                    pulse Validar archivo de nuevo.
                </p>
            </div>

            {validation.missing_columns.length > 0 ? (
                <div className="rounded-xl border border-rose-300/60 bg-white/80 p-3 text-sm text-rose-800">
                    <p className="font-semibold">
                        Columnas obligatorias faltantes
                    </p>
                    <p className="mt-1">
                        {validation.missing_columns.join(' · ')}
                    </p>
                    <p className="mt-2 text-xs text-rose-600">
                        Requeridas: {validation.required_columns.join(', ')}
                    </p>
                </div>
            ) : null}

            {Object.keys(errorSummary.by_field).length > 0 ? (
                <div>
                    <p className="text-xs font-bold tracking-wider text-rose-700 uppercase">
                        Errores por columna
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(errorSummary.by_field).map(
                            ([column, count]) => (
                                <span
                                    key={column}
                                    className="inline-flex rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-800"
                                >
                                    {column}: {count}
                                </span>
                            ),
                        )}
                    </div>
                </div>
            ) : null}

            <div className="max-h-64 overflow-y-auto rounded-xl border border-rose-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-rose-100/90 text-xs tracking-wide text-rose-800 uppercase">
                        <tr>
                            <th className="px-3 py-2">Fila</th>
                            <th className="px-3 py-2">Columna</th>
                            <th className="px-3 py-2">Detalle</th>
                            <th className="px-3 py-2">Valor en celda</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                        {errors.map((error, index) => (
                            <tr
                                key={`${error.excel_row}-${error.field}-${index}`}
                                className="text-rose-900"
                            >
                                <td className="px-3 py-2 font-semibold">
                                    {error.excel_row}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    {error.field_label}
                                </td>
                                <td className="px-3 py-2">{error.message}</td>
                                <td className="px-3 py-2 text-rose-600">
                                    {error.received_value ?? '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {validation.valid_lot_statuses.length > 0 ? (
                <p className="text-xs text-rose-700">
                    <span className="font-semibold">
                        Estados de lote validos:
                    </span>{' '}
                    {validation.valid_lot_statuses.join(', ')}
                </p>
            ) : null}

            {sortedRows.length > 0 && sortedRows.length <= 8 ? (
                <div className="space-y-2">
                    <p className="text-xs font-bold tracking-wider text-rose-700 uppercase">
                        Resumen por fila
                    </p>
                    {sortedRows.map((rowNumber) => (
                        <div
                            key={rowNumber}
                            className="rounded-lg border border-rose-200 bg-white/90 px-3 py-2 text-sm text-rose-800"
                        >
                            <p className="font-semibold">Fila {rowNumber}</p>
                            <ul className="mt-1 list-inside list-disc space-y-0.5">
                                {groupedByRow[rowNumber].map((error, index) => (
                                    <li key={`${error.field}-${index}`}>
                                        <span className="font-medium">
                                            {error.field_label}:
                                        </span>{' '}
                                        {error.message}
                                        {error.received_value ? (
                                            <span className="text-rose-600">
                                                {' '}
                                                (valor: &quot;
                                                {error.received_value}&quot;)
                                            </span>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function PreviewMetric({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: string;
    tone?: 'slate' | 'emerald' | 'rose';
}) {
    return (
        <InmoproMetricCard label={label} value={value} tone={tone} size="md" />
    );
}

function ProjectMetric({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: string;
    tone?: 'slate' | 'emerald' | 'blue' | 'amber' | 'rose';
}) {
    return <InmoproMetricCard label={label} value={value} tone={tone} />;
}

function getXsrfTokenFromCookie(): string {
    const parts = document.cookie.split(';').map((part) => part.trim());
    const xsrfPart = parts.find((part) => part.startsWith('XSRF-TOKEN='));

    return xsrfPart
        ? decodeURIComponent(xsrfPart.slice('XSRF-TOKEN='.length))
        : '';
}
