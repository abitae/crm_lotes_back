import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Contact, Copy, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import InputError from '@/components/input-error';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatDateTime } from '@/lib/date';
import { daterosListingQuerySuffix } from '@/lib/inmopro-listing-query';
import { confirmDelete } from '@/lib/swal';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type CityOption = { id: number; name: string; department?: string | null };
type AdvisorOption = { id: number; name: string };
type AdvisorRef = { id: number; name: string };

type CityRef = { id: number; name: string; department?: string | null };

type DateroRow = {
    id: number;
    advisor_id: number;
    name: string;
    phone: string;
    email: string;
    dni: string;
    username: string;
    city_id: number;
    is_active: boolean;
    created_at?: string;
    registration_url?: string | null;
    assigned_advisor?: AdvisorRef | null;
    city?: CityRef | null;
};

type DateroFilters = {
    search?: string;
    advisor_id?: string | number;
    city_id?: string | number;
    is_active?: string;
    created_from?: string;
    created_to?: string;
    per_page?: string | number;
};

const DATERO_FILTER_KEYS = [
    'search',
    'advisor_id',
    'city_id',
    'is_active',
    'created_from',
    'created_to',
    'per_page',
] as const;

const FILTER_LABEL_CLASS = 'mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400';
const FILTER_FIELD_CLASS =
    'h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none ring-emerald-500/30 focus:ring-2';
const FILTER_SEARCH_CLASS = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 text-sm outline-none ring-emerald-500/30 focus:ring-2';

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase();
}

function isoLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;
}

function defaultDateroDateFilterValues(): { createdFrom: string; createdTo: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
        createdFrom: isoLocalDate(monthStart),
        createdTo: isoLocalDate(today),
    };
}

function buildDaterosFilterQuery(formData: FormData): Record<string, string> {
    const query: Record<string, string> = {};

    for (const key of DATERO_FILTER_KEYS) {
        const value = (formData.get(key) as string | null)?.trim();

        if (value) {
            query[key] = value;
        }
    }

    return query;
}

function buildDaterosListingQuery(
    filters: DateroFilters,
    dates: { createdFrom: string; createdTo: string },
    overrides?: Partial<Record<string, string>>,
): Record<string, string> {
    const query: Record<string, string> = {
        created_from: dates.createdFrom,
        created_to: dates.createdTo,
    };

    for (const key of DATERO_FILTER_KEYS) {
        if (key === 'created_from' || key === 'created_to') {
            continue;
        }

        const value = overrides?.[key] ?? filters[key as keyof DateroFilters];

        if (value !== undefined && value !== null && String(value) !== '') {
            query[key] = String(value);
        }
    }

    if (overrides) {
        for (const [key, value] of Object.entries(overrides)) {
            if (value === '') {
                delete query[key];
            } else if (value !== undefined) {
                query[key] = value;
            }
        }
    }

    return query;
}

export default function DaterosIndex({
    dateros,
    cities,
    advisors,
    dateroForModal,
    openModal,
    filters,
    perPageOptions,
}: {
    dateros: { data: DateroRow[]; links: PaginationLink[]; total?: number; per_page?: number };
    cities: CityOption[];
    advisors: AdvisorOption[];
    dateroForModal: DateroRow | null;
    openModal: string | null;
    filters: DateroFilters;
    perPageOptions: number[];
}) {
    const items = dateros.data;
    const totalDateros = dateros.total ?? items.length;
    const activeCount = items.filter((row) => row.is_active).length;
    const inactiveCount = items.filter((row) => !row.is_active).length;
    const [modalCreate, setModalCreate] = useState(false);
    const [modalEdit, setModalEdit] = useState<DateroRow | null>(null);
    const [advisorFilterId, setAdvisorFilterId] = useState(filters.advisor_id ? String(filters.advisor_id) : '');
    const [advisorFilterSearch, setAdvisorFilterSearch] = useState('');
    const [advisorFilterOpen, setAdvisorFilterOpen] = useState(false);
    const advisorFilterRef = useRef<HTMLDivElement>(null);
    const listQs = daterosListingQuerySuffix(usePage().url);
    const defaultDateFilters = useMemo(() => defaultDateroDateFilterValues(), []);

    const createdFromValue = filters.created_from ?? defaultDateFilters.createdFrom;
    const createdToValue = filters.created_to ?? defaultDateFilters.createdTo;
    const currentPerPage = String(filters.per_page ?? dateros.per_page ?? perPageOptions[1] ?? 15);

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

    const createModalOpen = openModal === 'create_datero' || modalCreate;
    const editTarget = modalEdit ?? (openModal === 'edit_datero' ? dateroForModal : null);
    const editModalOpen = editTarget !== null;

    const clearModalQuery = () => {
        router.get(
            '/inmopro/dateros',
            buildDaterosListingQuery(filters, {
                createdFrom: createdFromValue,
                createdTo: createdToValue,
            }),
            { replace: true, preserveState: true },
        );
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

    const hasActiveFilters = Boolean(
        filters.search
        || filters.advisor_id
        || filters.city_id
        || (filters.is_active !== undefined && filters.is_active !== ''),
    );

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const query = buildDaterosFilterQuery(formData);

        if (currentPerPage) {
            query.per_page = currentPerPage;
        }

        router.get('/inmopro/dateros', query, { preserveState: true });
    };

    const handlePerPageChange = (perPage: string) => {
        router.get(
            '/inmopro/dateros',
            buildDaterosListingQuery(
                filters,
                { createdFrom: createdFromValue, createdTo: createdToValue },
                { per_page: perPage },
            ),
            { preserveState: true, preserveScroll: true },
        );
    };

    const clearFilters = () => {
        clearAdvisorFilter();
        router.get(
            '/inmopro/dateros',
            {
                created_from: '',
                created_to: '',
                per_page: currentPerPage,
            },
            { preserveState: true },
        );
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Dateros', href: '/inmopro/dateros' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`Eliminar datero "${name}"?`)) {
            router.delete(`/inmopro/dateros/${id}${listQs}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dateros - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dateros</h1>
                        <p className="mt-1 text-sm text-slate-500">Personal de campo asignado a un vendedor. Ciudad obligatoria.</p>
                    </div>
                    <Button onClick={() => setModalCreate(true)} className="flex items-center gap-2">
                        <Plus className="h-5 w-5" /> Nuevo datero
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <InmoproMetricCard label="Total en vista" value={String(totalDateros)} />
                    <InmoproMetricCard label="Activos (página)" value={String(activeCount)} tone="emerald" />
                    <InmoproMetricCard label="Inactivos (página)" value={String(inactiveCount)} tone="blue" />
                </div>

                <Card className="overflow-hidden">
                    <CardHeader className="border-b border-slate-100 px-4 py-3">
                        <CardTitle className="text-base">Filtros</CardTitle>
                        <CardDescription className="text-xs">
                            Refine el listado por datos del datero, vendedor, ciudad, estado o fecha de registro.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Búsqueda y criterios</p>
                                <div className="grid gap-2 lg:grid-cols-12">
                                    <div className="relative lg:col-span-4">
                                        <Label htmlFor="dateros-search" className={FILTER_LABEL_CLASS}>Datero</Label>
                                        <Search className="pointer-events-none absolute left-3 top-[1.65rem] h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            id="dateros-search"
                                            name="search"
                                            type="text"
                                            placeholder="Nombre, email, DNI, usuario o teléfono..."
                                            defaultValue={filters.search}
                                            className={FILTER_SEARCH_CLASS}
                                        />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <Label htmlFor="city_id" className={FILTER_LABEL_CLASS}>Ciudad</Label>
                                        <select
                                            id="city_id"
                                            name="city_id"
                                            defaultValue={filters.city_id ? String(filters.city_id) : ''}
                                            className={FILTER_FIELD_CLASS}
                                        >
                                            <option value="">Todas</option>
                                            {cities.map((city) => (
                                                <option key={city.id} value={city.id}>
                                                    {city.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <Label htmlFor="is_active" className={FILTER_LABEL_CLASS}>Estado</Label>
                                        <select
                                            id="is_active"
                                            name="is_active"
                                            defaultValue={filters.is_active ?? ''}
                                            className={FILTER_FIELD_CLASS}
                                        >
                                            <option value="">Todos</option>
                                            <option value="1">Activos</option>
                                            <option value="0">Inactivos</option>
                                        </select>
                                    </div>
                                    <div ref={advisorFilterRef} className="relative lg:col-span-4">
                                        <input type="hidden" name="advisor_id" value={advisorFilterId} />
                                        <Label htmlFor="dateros-advisor-filter" className={FILTER_LABEL_CLASS}>Vendedor</Label>
                                        <div className="flex gap-1">
                                            <div className="relative min-w-0 flex-1">
                                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    id="dateros-advisor-filter"
                                                    value={advisorFilterOpen ? advisorFilterSearch : (selectedFilterAdvisor?.name ?? advisorFilterSearch)}
                                                    onChange={(event) => {
                                                        setAdvisorFilterSearch(event.target.value);
                                                        setAdvisorFilterOpen(true);
                                                    }}
                                                    onFocus={() => setAdvisorFilterOpen(true)}
                                                    placeholder="Buscar vendedor..."
                                                    className={`${FILTER_FIELD_CLASS} pl-8`}
                                                />
                                            </div>
                                            {advisorFilterId ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={clearAdvisorFilter}
                                                    title="Quitar vendedor"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            ) : null}
                                        </div>
                                        {advisorFilterOpen ? (
                                            <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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
                                                                    'flex w-full items-center justify-between px-3 py-2 text-left text-xs',
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
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 lg:max-w-md">
                                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha de registro</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label htmlFor="created_from" className={FILTER_LABEL_CLASS}>Desde</Label>
                                        <input
                                            id="created_from"
                                            name="created_from"
                                            type="date"
                                            defaultValue={createdFromValue}
                                            className={FILTER_FIELD_CLASS}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="created_to" className={FILTER_LABEL_CLASS}>Hasta</Label>
                                        <input
                                            id="created_to"
                                            name="created_to"
                                            type="date"
                                            defaultValue={createdToValue}
                                            className={FILTER_FIELD_CLASS}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-slate-500">
                                    {dateros.total != null
                                        ? `${dateros.total} datero(s) con los criterios actuales`
                                        : 'Ajuste los criterios y aplique para actualizar el listado'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5 text-xs"
                                        onClick={clearFilters}
                                        disabled={!hasActiveFilters}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Limpiar criterios
                                    </Button>
                                    <Button type="submit" size="sm" className="h-8 gap-1.5 text-xs">
                                        <Search className="h-3.5 w-3.5" />
                                        Aplicar filtros
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
                            {items.length} datero(s) · más recientes primero
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="rounded-full bg-slate-100 p-4">
                                    <Contact className="h-10 w-10 text-slate-400" />
                                </div>
                                <p className="mt-4 font-medium text-slate-700">Sin coincidencias</p>
                                <p className="mt-1 text-sm text-slate-500">No hay dateros con los criterios de búsqueda.</p>
                                <Button className="mt-4" variant="outline" onClick={() => setModalCreate(true)}>
                                    Nuevo datero
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                                                <th className="px-2 py-1.5 text-left font-semibold">Datero</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold sm:table-cell">DNI</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold md:table-cell">Usuario</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold lg:table-cell">Ciudad</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold md:table-cell">Vendedor</th>
                                                <th className="hidden px-2 py-1.5 text-left font-semibold xl:table-cell">Registro</th>
                                                <th className="px-2 py-1.5 text-left font-semibold">Estado</th>
                                                <th className="px-2 py-1.5 text-right font-semibold"> </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50/60">
                                                    <td className="max-w-[10rem] px-2 py-1.5 sm:max-w-none">
                                                        <p className="truncate font-medium leading-tight text-slate-900">{row.name}</p>
                                                        <p className="truncate text-[11px] text-slate-500">{row.email}</p>
                                                    </td>
                                                    <td className="hidden px-2 py-1.5 text-slate-600 sm:table-cell">{row.dni}</td>
                                                    <td className="hidden px-2 py-1.5 font-mono text-slate-600 md:table-cell">{row.username}</td>
                                                    <td className="hidden max-w-[9rem] px-2 py-1.5 lg:table-cell">
                                                        <p className="truncate text-slate-700">{row.city?.name ?? '—'}</p>
                                                        {row.city?.department ? (
                                                            <p className="truncate text-[11px] text-slate-500">{row.city.department}</p>
                                                        ) : null}
                                                    </td>
                                                    <td className="hidden max-w-[9rem] px-2 py-1.5 md:table-cell">
                                                        <p className="truncate text-slate-700">{row.assigned_advisor?.name ?? '—'}</p>
                                                    </td>
                                                    <td className="hidden whitespace-nowrap px-2 py-1.5 text-slate-500 xl:table-cell">
                                                        {row.created_at ? formatDateTime(row.created_at) : '—'}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                                                        >
                                                            {row.is_active ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-1 py-1.5 text-right">
                                                        <div className="flex justify-end gap-0.5">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => setModalEdit(row)}
                                                                title="Editar"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                                onClick={() => handleDestroy(row.id, row.name)}
                                                                title="Eliminar"
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
                                <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>Ver</span>
                                        <select
                                            value={currentPerPage}
                                            onChange={(event) => handlePerPageChange(event.target.value)}
                                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none ring-emerald-500/30 focus:ring-2"
                                            aria-label="Registros por página"
                                        >
                                            {perPageOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <span>por página</span>
                                        {dateros.total != null ? (
                                            <span className="hidden text-slate-400 sm:inline">· {dateros.total} total</span>
                                        ) : null}
                                    </div>
                                    <Pagination links={dateros.links} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <CreateDateroModal
                    open={createModalOpen}
                    onOpenChange={(open) => {
                        setModalCreate(open);
                        if (!open && openModal === 'create_datero') {
                            clearModalQuery();
                        }
                    }}
                    cities={cities}
                    advisors={advisors}
                    listQs={listQs}
                />

                {editTarget && (
                    <EditDateroModal
                        open={editModalOpen}
                        onOpenChange={(open) => {
                            if (!open) {
                                setModalEdit(null);
                                if (openModal === 'edit_datero') {
                                    clearModalQuery();
                                }
                            }
                        }}
                        datero={editTarget}
                        cities={cities}
                        advisors={advisors}
                        listQs={listQs}
                    />
                )}
            </div>
        </AppLayout>
    );
}

function CreateDateroModal({
    open,
    onOpenChange,
    cities,
    advisors,
    listQs,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cities: CityOption[];
    advisors: AdvisorOption[];
    listQs: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        advisor_id: advisors[0]?.id ?? 0,
        name: '',
        phone: '',
        email: '',
        city_id: cities[0]?.id ?? 0,
        dni: '',
        username: '',
        pin: '',
        is_active: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/inmopro/dateros${listQs}`, {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo datero</DialogTitle>
                    <DialogDescription>Ciudad obligatoria. Usuario único (no igual a un vendedor).</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="d-advisor">Vendedor asignado</Label>
                        <select
                            id="d-advisor"
                            value={data.advisor_id}
                            onChange={(e) => setData('advisor_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {advisors.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.advisor_id} />
                    </div>
                    <div>
                        <Label htmlFor="d-city">Ciudad</Label>
                        <select
                            id="d-city"
                            value={data.city_id}
                            onChange={(e) => setData('city_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.department ? ` · ${c.department}` : ''}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.city_id} />
                    </div>
                    <div>
                        <Label htmlFor="d-name">Nombre completo</Label>
                        <Input id="d-name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="d-dni">DNI</Label>
                            <Input id="d-dni" value={data.dni} onChange={(e) => setData('dni', e.target.value)} className="mt-1" />
                            <InputError message={errors.dni} />
                        </div>
                        <div>
                            <Label htmlFor="d-phone">Teléfono</Label>
                            <Input id="d-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-1" />
                            <InputError message={errors.phone} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="d-email">Correo</Label>
                        <Input id="d-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="mt-1" />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="d-user">Usuario</Label>
                            <Input id="d-user" value={data.username} onChange={(e) => setData('username', e.target.value)} className="mt-1" />
                            <InputError message={errors.username} />
                        </div>
                        <div>
                            <Label htmlFor="d-pin">PIN (6 dígitos)</Label>
                            <Input
                                id="d-pin"
                                type="password"
                                inputMode="numeric"
                                autoComplete="new-password"
                                maxLength={6}
                                value={data.pin}
                                onChange={(e) => setData('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="mt-1"
                            />
                            <InputError message={errors.pin} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Activo
                    </label>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditDateroModal({
    open,
    onOpenChange,
    datero,
    cities,
    advisors,
    listQs,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    datero: DateroRow;
    cities: CityOption[];
    advisors: AdvisorOption[];
    listQs: string;
}) {
    const { data, setData, put, processing, errors } = useForm({
        advisor_id: datero.advisor_id,
        name: datero.name,
        phone: datero.phone,
        email: datero.email,
        city_id: datero.city_id,
        dni: datero.dni,
        username: datero.username,
        pin: '',
        is_active: datero.is_active,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/dateros/${datero.id}${listQs}`, { onSuccess: () => onOpenChange(false) });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar datero</DialogTitle>
                    <DialogDescription>Deje el PIN en blanco si no desea cambiarlo.</DialogDescription>
                </DialogHeader>
                {datero.registration_url ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                        <p className="font-medium text-slate-700 dark:text-slate-200">Enlace de registro de clientes (QR)</p>
                        <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{datero.registration_url}</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-1"
                            onClick={() => void navigator.clipboard.writeText(datero.registration_url ?? '')}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar enlace
                        </Button>
                    </div>
                ) : null}
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="de-advisor">Vendedor asignado</Label>
                        <select
                            id="de-advisor"
                            value={data.advisor_id}
                            onChange={(e) => setData('advisor_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {advisors.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.advisor_id} />
                    </div>
                    <div>
                        <Label htmlFor="de-city">Ciudad</Label>
                        <select
                            id="de-city"
                            value={data.city_id}
                            onChange={(e) => setData('city_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.department ? ` · ${c.department}` : ''}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.city_id} />
                    </div>
                    <div>
                        <Label htmlFor="de-name">Nombre completo</Label>
                        <Input id="de-name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="de-dni">DNI</Label>
                            <Input id="de-dni" value={data.dni} onChange={(e) => setData('dni', e.target.value)} className="mt-1" />
                            <InputError message={errors.dni} />
                        </div>
                        <div>
                            <Label htmlFor="de-phone">Teléfono</Label>
                            <Input id="de-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-1" />
                            <InputError message={errors.phone} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="de-email">Correo</Label>
                        <Input id="de-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="mt-1" />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="de-user">Usuario</Label>
                            <Input id="de-user" value={data.username} onChange={(e) => setData('username', e.target.value)} className="mt-1" />
                            <InputError message={errors.username} />
                        </div>
                        <div>
                            <Label htmlFor="de-pin">Nuevo PIN</Label>
                            <Input
                                id="de-pin"
                                type="password"
                                inputMode="numeric"
                                autoComplete="new-password"
                                maxLength={6}
                                value={data.pin}
                                onChange={(e) => setData('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="mt-1"
                                placeholder="Opcional"
                            />
                            <InputError message={errors.pin} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Activo
                    </label>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Actualizar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
