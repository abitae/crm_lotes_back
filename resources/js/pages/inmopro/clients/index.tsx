import { Head, Link, router, usePage } from '@inertiajs/react';
import { Download, Eye, FileSpreadsheet, Search, Trash2, Upload, UserPlus, Users, Check, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { formatDate } from '@/lib/date';
import { clientsListingQuerySuffix } from '@/lib/inmopro-listing-query';
import { confirmDelete } from '@/lib/swal';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type Client = {
    id: number;
    name: string;
    dni: string;
    phone: string;
    email?: string;
    created_at?: string;
    lots_count?: number;
    type?: { name: string; color?: string };
    city?: { name: string; department?: string | null };
    advisor?: { name: string; team?: { name: string } | null };
};
type Option = {
    id: number;
    name: string;
};

type ClientFilters = {
    search?: string;
    client_type_id?: string | number;
    city_id?: string | number;
    advisor_id?: string | number;
    created_from?: string;
    created_to?: string;
    last_action_kind?: string;
    last_action_from?: string;
    last_action_to?: string;
};

const CLIENT_FILTER_KEYS = [
    'search',
    'client_type_id',
    'city_id',
    'advisor_id',
    'created_from',
    'created_to',
    'last_action_kind',
    'last_action_from',
    'last_action_to',
] as const;

const LAST_ACTION_KIND_LABELS: Record<string, string> = {
    avisos: 'Avisos (tickets)',
    lotes: 'Lotes',
    recordatorios: 'Recordatorios',
};

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase();
}

function buildClientsFilterQuery(formData: FormData): Record<string, string> {
    const query: Record<string, string> = {};

    for (const key of CLIENT_FILTER_KEYS) {
        const value = (formData.get(key) as string | null)?.trim();

        if (value) {
            query[key] = value;
        }
    }

    return query;
}

function appendClientFiltersToSearchParams(params: URLSearchParams, filters: ClientFilters): void {
    for (const key of CLIENT_FILTER_KEYS) {
        const value = filters[key as keyof ClientFilters];

        if (value !== undefined && value !== null && String(value) !== '') {
            params.set(key, String(value));
        }
    }
}

type ClientImportPreviewRow = {
    excel_row: number;
    name: string | null;
    dni: string | null;
    phone: string | null;
    email: string | null;
    client_type: string | null;
    city: string | null;
    advisor: string | null;
    action: 'create' | 'update';
    errors: string[];
};

type ClientImportPreviewResponse = {
    summary: {
        rows_read: number;
        valid: number;
        invalid: number;
    };
    rows: ClientImportPreviewRow[];
    errors: Array<{ excel_row: number; field: string; message: string }>;
    token: string | null;
    can_import: boolean;
};

export default function ClientsIndex({
    clients,
    filters,
    clientTypes,
    cities,
    advisors,
}: {
    clients: { data: Client[]; links: PaginationLink[]; total?: number };
    filters: ClientFilters;
    clientTypes: Option[];
    cities: Option[];
    advisors: Option[];
}) {
    const totalClients = clients.total ?? clients.data.length;
    const clientsWithLots = clients.data.filter((client) => (client.lots_count ?? 0) > 0).length;
    const clientsWithEmail = clients.data.filter((client) => Boolean(client.email)).length;
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [advisorFilterId, setAdvisorFilterId] = useState(filters.advisor_id ? String(filters.advisor_id) : '');
    const [advisorFilterSearch, setAdvisorFilterSearch] = useState('');
    const [advisorFilterOpen, setAdvisorFilterOpen] = useState(false);
    const advisorFilterRef = useRef<HTMLDivElement>(null);
    const listQs = clientsListingQuerySuffix(usePage().url);

    const selectedFilterAdvisor = advisors.find((advisor) => String(advisor.id) === advisorFilterId);

    const filteredFilterAdvisors = useMemo(() => {
        const search = normalizeSearch(advisorFilterSearch);

        if (!search) {
            return advisors;
        }

        return advisors.filter((advisor) => advisor.name.toLowerCase().includes(search));
    }, [advisorFilterSearch, advisors]);

    useEffect(() => {
        setAdvisorFilterId(filters.advisor_id ? String(filters.advisor_id) : '');
    }, [filters.advisor_id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (advisorFilterRef.current && !advisorFilterRef.current.contains(event.target as Node)) {
                setAdvisorFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Clientes', href: '/inmopro/clients' },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);

        router.get('/inmopro/clients', buildClientsFilterQuery(formData), { preserveState: true });
    };

    const clearAdvisorFilter = () => {
        setAdvisorFilterId('');
        setAdvisorFilterSearch('');
        setAdvisorFilterOpen(false);
    };

    const selectAdvisorFilter = (advisorId: number) => {
        setAdvisorFilterId(String(advisorId));
        setAdvisorFilterOpen(false);
    };

    const exportQuery = new URLSearchParams();
    appendClientFiltersToSearchParams(exportQuery, filters);

    const exportHref = `/inmopro/clients/export-excel${exportQuery.toString() ? `?${exportQuery.toString()}` : ''}`;

    const handleDestroy = async (client: Client) => {
        const lotsCount = client.lots_count ?? 0;
        const warningText =
            lotsCount > 0
                ? `Esta acción no se puede deshacer. Los ${lotsCount} lote(s) asociado(s) quedarán sin cliente vinculado.`
                : undefined;

        if (await confirmDelete(`¿Eliminar al cliente "${client.name}"?`, warningText)) {
            router.delete(`/inmopro/clients/${client.id}${listQs}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1>
                        <p className="mt-1 text-sm text-slate-500">Base de datos de compradores e interesados.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={exportHref}>
                                <Download className="h-4 w-4" />
                                Exportar Excel
                            </a>
                        </Button>
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
                            <Link href={`/inmopro/clients/create${listQs}`}>
                                <UserPlus className="h-4 w-4" />
                                Nuevo cliente
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <SummaryCard label="Clientes totales" value={String(totalClients)} />
                    <SummaryCard label="Con lotes asociados" value={String(clientsWithLots)} tone="emerald" />
                    <SummaryCard label="Con email registrado" value={String(clientsWithEmail)} tone="blue" />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>
                            Busque por nombre, DNI o teléfono; filtre por tipo, ciudad, asesor, fechas de registro y última actividad.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="grid gap-3 lg:grid-cols-4">
                                <div className="relative lg:col-span-2">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input name="search" type="text" placeholder="Nombre, DNI o celular..." className="pl-9" defaultValue={filters.search} />
                                </div>
                                <select
                                    name="client_type_id"
                                    defaultValue={filters.client_type_id ? String(filters.client_type_id) : ''}
                                    className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Todos los tipos</option>
                                    {clientTypes.map((clientType) => (
                                        <option key={clientType.id} value={clientType.id}>{clientType.name}</option>
                                    ))}
                                </select>
                                <select
                                    name="city_id"
                                    defaultValue={filters.city_id ? String(filters.city_id) : ''}
                                    className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Todas las ciudades</option>
                                    {cities.map((city) => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-4">
                                <div ref={advisorFilterRef} className="relative lg:col-span-2">
                                    <input type="hidden" name="advisor_id" value={advisorFilterId} />
                                    <Label htmlFor="clients-advisor-filter" className="sr-only">Asesor</Label>
                                    <div className="flex gap-1">
                                        <div className="relative min-w-0 flex-1">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="clients-advisor-filter"
                                                value={advisorFilterOpen ? advisorFilterSearch : (selectedFilterAdvisor?.name ?? advisorFilterSearch)}
                                                onChange={(event) => {
                                                    setAdvisorFilterSearch(event.target.value);
                                                    setAdvisorFilterOpen(true);
                                                }}
                                                onFocus={() => setAdvisorFilterOpen(true)}
                                                placeholder="Buscar asesor"
                                                className="pl-9"
                                            />
                                        </div>
                                        {advisorFilterId ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="shrink-0"
                                                onClick={clearAdvisorFilter}
                                                title="Quitar asesor"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                    {advisorFilterOpen ? (
                                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                            {filteredFilterAdvisors.length === 0 ? (
                                                <p className="px-3 py-2 text-xs text-slate-500">Sin resultados</p>
                                            ) : (
                                                filteredFilterAdvisors.map((advisor) => {
                                                    const selected = advisorFilterId === String(advisor.id);

                                                    return (
                                                        <button
                                                            key={advisor.id}
                                                            type="button"
                                                            onClick={() => selectAdvisorFilter(advisor.id)}
                                                            className={cn(
                                                                'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                                                                selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50',
                                                            )}
                                                        >
                                                            <span className="truncate font-medium">{advisor.name}</span>
                                                            {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="created_from" className="text-xs text-slate-500">Registro desde</Label>
                                    <Input id="created_from" name="created_from" type="date" defaultValue={filters.created_from} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="created_to" className="text-xs text-slate-500">Registro hasta</Label>
                                    <Input id="created_to" name="created_to" type="date" defaultValue={filters.created_to} />
                                </div>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-4">
                                <div className="space-y-1">
                                    <Label htmlFor="last_action_kind" className="text-xs text-slate-500">Última acción</Label>
                                    <select
                                        id="last_action_kind"
                                        name="last_action_kind"
                                        defaultValue={filters.last_action_kind ?? ''}
                                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="">Cualquier tipo</option>
                                        {Object.entries(LAST_ACTION_KIND_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="last_action_from" className="text-xs text-slate-500">Última acción desde</Label>
                                    <Input id="last_action_from" name="last_action_from" type="date" defaultValue={filters.last_action_from} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="last_action_to" className="text-xs text-slate-500">Última acción hasta</Label>
                                    <Input id="last_action_to" name="last_action_to" type="date" defaultValue={filters.last_action_to} />
                                </div>
                                <div className="flex items-end">
                                    <Button type="submit" variant="secondary" className="w-full">
                                        Buscar
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="px-4 py-3">
                        <CardTitle className="text-base">Directorio</CardTitle>
                        <CardDescription className="text-xs">
                            {clients.data.length} cliente(s) · más recientes primero
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {clients.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="rounded-full bg-slate-100 p-4">
                                    <Users className="h-10 w-10 text-slate-400" />
                                </div>
                                <p className="mt-4 font-medium text-slate-700">Sin coincidencias</p>
                                <p className="mt-1 text-sm text-slate-500">No hay clientes con los criterios de busqueda.</p>
                                <Button className="mt-4" variant="outline" asChild>
                                    <Link href={`/inmopro/clients/create${listQs}`}>Nuevo cliente</Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                                                <th className="px-2 py-1.5 text-left font-semibold">Cliente</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold sm:table-cell">Tipo</th>
                                                <th className="px-2 py-1.5 text-left font-semibold">Contacto</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold lg:table-cell">Ciudad / Asesor</th>
                                                <th className="px-2 py-1.5 text-center font-semibold">Lotes</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold md:table-cell">Registro</th>
                                                <th className="px-2 py-1.5 text-right font-semibold"> </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {clients.data.map((client) => (
                                                <tr key={client.id} className="hover:bg-slate-50/60">
                                                    <td className="max-w-[10rem] px-2 py-1.5 sm:max-w-none">
                                                        <p className="truncate font-medium leading-tight text-slate-900">{client.name}</p>
                                                        <p className="truncate text-[11px] text-slate-500">{client.dni}</p>
                                                    </td>
                                                    <td className="hidden px-2 py-1.5 sm:table-cell">
                                                        <span
                                                            className="inline-flex max-w-[6rem] truncate rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                                                            style={{ backgroundColor: client.type?.color ?? '#475569' }}
                                                            title={client.type?.name ?? 'Sin tipo'}
                                                        >
                                                            {client.type?.name ?? 'Sin tipo'}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-[9rem] px-2 py-1.5 sm:max-w-none">
                                                        <p className="truncate text-slate-700">{client.phone || '—'}</p>
                                                        <p className="truncate text-[11px] text-slate-500">{client.email ?? '—'}</p>
                                                    </td>
                                                    <td className="hidden max-w-[11rem] px-2 py-1.5 lg:table-cell">
                                                        <p className="truncate text-slate-700">
                                                            {client.city?.name ?? 'Sin ciudad'}
                                                            {client.city?.department ? ` · ${client.city.department}` : ''}
                                                        </p>
                                                        <p className="truncate text-[11px] text-slate-500">
                                                            {client.advisor?.name ?? 'Sin asesor'}
                                                            {client.advisor?.team?.name ? ` · ${client.advisor.team.name}` : ''}
                                                        </p>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center tabular-nums text-slate-600">{client.lots_count ?? 0}</td>
                                                    <td className="hidden whitespace-nowrap px-2 py-1.5 text-slate-500 md:table-cell">
                                                        {formatDate(client.created_at)}
                                                    </td>
                                                    <td className="px-1 py-1.5 text-right">
                                                        <div className="flex justify-end gap-0.5">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                                <Link href={`/inmopro/clients/${client.id}${listQs}`} title="Ver">
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                                title="Eliminar"
                                                                onClick={() => void handleDestroy(client)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-slate-100 px-3 py-2">
                                    <Pagination links={clients.links} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ClientsImportModal open={importModalOpen} onOpenChange={setImportModalOpen} listQs={listQs} />
        </AppLayout>
    );
}

function ClientsImportModal({
    open,
    onOpenChange,
    listQs,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listQs: string;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [preview, setPreview] = useState<ClientImportPreviewResponse | null>(null);

    const reset = (): void => {
        setFileName(null);
        setDragActive(false);
        setLoadingPreview(false);
        setConfirming(false);
        setFetchError(null);
        setPreview(null);
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
            setFetchError('No se pudo asignar el archivo. Use el selector manual.');

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

        setLoadingPreview(true);
        setFetchError(null);

        const fd = new FormData();
        fd.append('file', input.files[0]);

        try {
            const res = await fetch('/inmopro/clients/import-preview', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getXsrfTokenFromCookie(),
                },
                body: fd,
                credentials: 'same-origin',
            });

            const body = (await res.json()) as ClientImportPreviewResponse & {
                message?: string;
                errors?: Record<string, string[]>;
            };

            if (!res.ok) {
                const firstFieldError = Object.values(body.errors ?? {}).flat()[0];
                setFetchError(firstFieldError ?? body.message ?? 'No se pudo validar el archivo.');

                return;
            }

            setPreview(body);
        } catch {
            setFetchError('Error de red al validar el archivo. Intente de nuevo.');
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
            `/inmopro/clients/import-confirm${listQs}`,
            { token: preview.token },
            {
                onFinish: () => setConfirming(false),
                onSuccess: () => onOpenChange(false),
            }
        );
    };

    const rows = preview?.rows ?? [];
    const errors = preview?.errors ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[92vh] w-[min(100vw-1.5rem,68rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(100vw-2rem,68rem)]">
                <div className="border-b border-slate-100 px-6 py-4">
                    <DialogHeader className="space-y-1 text-left">
                        <DialogTitle>Importar clientes desde Excel</DialogTitle>
                        <DialogDescription className="text-left">
                            Descargue la plantilla, cargue el archivo, revise la validacion y confirme solo si no hay errores.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" className="sr-only" tabIndex={-1} onChange={(e) => assignFile(e.target.files?.[0])} />

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2 text-sm text-slate-700">
                                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Plantilla oficial</p>
                                <p>Use las columnas: Nombre, DNI, Telefono, Email, Referido por, Tipo cliente, Ciudad y Asesor.</p>
                                <p>La importacion validara referencias, duplicados y filas incompletas antes de confirmar.</p>
                            </div>
                            <Button type="button" asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
                                <a href="/inmopro/clients/excel-template" download>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar plantilla
                                </a>
                            </Button>
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
                                dragActive ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                            )}
                        >
                            <Upload className="h-9 w-9 opacity-70" aria-hidden />
                            <span className="text-sm font-semibold">
                                Arrastre el archivo aqui o <span className="text-emerald-700 underline underline-offset-2">seleccionelo manualmente</span>
                            </span>
                            <span className="text-xs text-slate-500">{fileName ?? 'No hay archivo seleccionado'}</span>
                        </button>
                    </div>

                    {fetchError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{fetchError}</div> : null}

                    {preview ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <ImportMetric label="Filas leidas" value={String(preview.summary.rows_read)} />
                                <ImportMetric label="Validas" value={String(preview.summary.valid)} tone="emerald" />
                                <ImportMetric label="Con error" value={String(preview.summary.invalid)} tone={preview.summary.invalid > 0 ? 'rose' : 'slate'} />
                            </div>

                            {errors.length > 0 ? (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                    <p className="text-sm font-semibold text-rose-800">Errores detectados</p>
                                    <div className="mt-2 space-y-1 text-sm text-rose-700">
                                        {errors.slice(0, 12).map((error, index) => (
                                            <p key={`${error.excel_row}-${index}`}>
                                                Fila {error.excel_row}: {error.message}
                                            </p>
                                        ))}
                                        {errors.length > 12 ? <p>...y {errors.length - 12} error(es) mas.</p> : null}
                                    </div>
                                </div>
                            ) : null}

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-slate-600">
                                            <th className="px-4 py-3">Fila</th>
                                            <th className="px-4 py-3">Nombre</th>
                                            <th className="px-4 py-3">DNI</th>
                                            <th className="px-4 py-3">Telefono</th>
                                            <th className="px-4 py-3">Tipo</th>
                                            <th className="px-4 py-3">Asesor</th>
                                            <th className="px-4 py-3">Accion</th>
                                            <th className="px-4 py-3">Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.map((row) => (
                                            <tr key={row.excel_row} className="align-top">
                                                <td className="px-4 py-3 font-medium text-slate-900">{row.excel_row}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.name ?? '-'}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.dni ?? '-'}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.phone ?? '-'}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.client_type ?? '-'}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.advisor ?? '-'}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.action === 'update' ? 'Actualizar' : 'Crear'}</td>
                                                <td className="px-4 py-3">
                                                    {row.errors.length === 0 ? (
                                                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">OK</span>
                                                    ) : (
                                                        <div className="space-y-1 text-xs text-rose-700">
                                                            {row.errors.map((error) => (
                                                                <p key={error}>{error}</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {!preview.can_import ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                    Corrija los errores del archivo antes de continuar con la importacion.
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                    La validacion termino correctamente. Puede confirmar la importacion.
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="border-t border-slate-100 px-6 py-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void runPreview()} disabled={loadingPreview}>
                        {loadingPreview ? 'Validando...' : 'Validar archivo'}
                    </Button>
                    <Button type="button" onClick={confirmImport} disabled={!preview?.can_import || !preview?.token || confirming}>
                        {confirming ? 'Importando...' : 'Importar clientes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SummaryCard({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: string;
    tone?: 'slate' | 'emerald' | 'blue';
}) {
    return <InmoproMetricCard label={label} value={value} tone={tone} />;
}

function ImportMetric({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: string;
    tone?: 'slate' | 'emerald' | 'rose';
}) {
    return <InmoproMetricCard label={label} value={value} tone={tone} size="md" />;
}

function getXsrfTokenFromCookie(): string {
    const parts = document.cookie.split(';').map((part) => part.trim());
    const xsrfPart = parts.find((part) => part.startsWith('XSRF-TOKEN='));

    return xsrfPart ? decodeURIComponent(xsrfPart.slice('XSRF-TOKEN='.length)) : '';
}
