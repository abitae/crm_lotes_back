import { Head, router, useForm } from '@inertiajs/react';
import { Check, Eye, ImagePlus, Plus, Search, X } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/date';
import { showSuccessToast } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type ProjectOption = { id: number; name: string };
type AdvisorOption = { id: number; name: string };
type AvailableLot = {
    id: number;
    block: string;
    number: number;
    project_id: number;
    project?: { name: string } | null;
    status?: { name: string; code: string } | null;
};
type ClientOption = {
    id: number;
    name: string;
    dni?: string | null;
    phone?: string | null;
    advisor_id?: number | null;
    advisor?: { id: number; name: string } | null;
    city?: { name: string } | null;
};
type PreReservation = {
    id: number;
    status: string;
    amount: string;
    payment_reference?: string | null;
    notes?: string | null;
    rejection_reason?: string | null;
    voucher_path: string;
    created_at: string;
    reviewed_at?: string | null;
    lot?: {
        id: number;
        block: string;
        number: number;
        project?: { name: string } | null;
        status?: { name: string; code: string } | null;
    } | null;
    client?: { name: string; city?: { name: string } | null } | null;
    advisor?: { name: string; team?: { name: string } | null } | null;
    reviewer?: { name: string } | null;
};

type RegisterFormData = {
    lot_ids: number[];
    advisor_id: string;
    client_id: string;
    new_client: {
        name: string;
        dni: string;
        phone: string;
    };
    amount: string;
    payment_reference: string;
    notes: string;
    voucher_image: File | null;
};

const moneyFormatter = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase();
}

function includesSearch(
    value: string | number | null | undefined,
    search: string,
): boolean {
    return String(value ?? '')
        .toLowerCase()
        .includes(search);
}

function distributeAmounts(total: string, count: number): string[] {
    const totalNumber = Number(total);

    if (!Number.isFinite(totalNumber) || count <= 0) {
        return [];
    }

    const totalCents = Math.round(totalNumber * 100);
    const baseCents = Math.floor(totalCents / count);
    const remainderCents = totalCents - baseCents * count;

    return Array.from({ length: count }, (_, index) => {
        const cents = baseCents + (index === count - 1 ? remainderCents : 0);

        return moneyFormatter.format(cents / 100);
    });
}

export default function LotPreReservationsIndex({
    preReservations,
    filters,
    projects,
    advisors,
    availableLots,
    clients,
}: {
    preReservations: { data: PreReservation[]; links: PaginationLink[] };
    filters: {
        status?: string;
        project_id?: number | string;
        advisor_id?: number | string;
    };
    projects: ProjectOption[];
    advisors: AdvisorOption[];
    availableLots: AvailableLot[];
    clients: ClientOption[];
}) {
    const form = useForm({
        status: filters.status ?? '',
        project_id: filters.project_id ? String(filters.project_id) : '',
        advisor_id: filters.advisor_id ? String(filters.advisor_id) : '',
    });
    const [registerOpen, setRegisterOpen] = useState(false);
    const [selectedPreReservation, setSelectedPreReservation] =
        useState<PreReservation | null>(null);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [registerPreview, setRegisterPreview] = useState<string | null>(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [lotSearch, setLotSearch] = useState('');
    const [advisorSearch, setAdvisorSearch] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
    const [clientMode, setClientMode] = useState<'existing' | 'new'>(
        'existing',
    );
    const registerForm = useForm<RegisterFormData>({
        lot_ids: [],
        advisor_id: '',
        client_id: '',
        new_client: {
            name: '',
            dni: '',
            phone: '',
        },
        amount: '',
        payment_reference: '',
        notes: '',
        voucher_image: null,
    });
    const approveForm = useForm({
        review_notes: '',
    });
    const rejectForm = useForm({
        rejection_reason: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Pre-reservas', href: '/inmopro/lot-pre-reservations' },
    ];

    const filteredProjects = useMemo(() => {
        const search = normalizeSearch(projectSearch);

        return projects.filter((project) =>
            includesSearch(project.name, search),
        );
    }, [projectSearch, projects]);

    const filteredLots = useMemo(() => {
        const search = normalizeSearch(lotSearch);

        if (selectedProjectIds.length === 0) {
            return [];
        }

        return availableLots.filter((lot) => {
            const matchesProject = selectedProjectIds.includes(lot.project_id);
            const label = `${lot.project?.name ?? ''} ${lot.block}-${lot.number}`;

            return matchesProject && includesSearch(label, search);
        });
    }, [availableLots, lotSearch, selectedProjectIds]);

    const filteredAdvisors = useMemo(() => {
        const search = normalizeSearch(advisorSearch);

        return advisors.filter((advisor) =>
            includesSearch(advisor.name, search),
        );
    }, [advisorSearch, advisors]);

    const filteredClients = useMemo(() => {
        const search = normalizeSearch(clientSearch);

        return clients.filter((client) => {
            const matchesAdvisor =
                !registerForm.data.advisor_id ||
                String(client.advisor_id ?? '') ===
                    registerForm.data.advisor_id;
            const label = `${client.name} ${client.dni ?? ''} ${client.phone ?? ''}`;

            return matchesAdvisor && includesSearch(label, search);
        });
    }, [clientSearch, clients, registerForm.data.advisor_id]);

    const selectedLots = useMemo(
        () =>
            registerForm.data.lot_ids
                .map((id) => availableLots.find((lot) => lot.id === id))
                .filter((lot): lot is AvailableLot => lot !== undefined),
        [availableLots, registerForm.data.lot_ids],
    );
    const distributedAmounts = useMemo(
        () => distributeAmounts(registerForm.data.amount, selectedLots.length),
        [registerForm.data.amount, selectedLots.length],
    );
    const selectedAdvisor = advisors.find(
        (advisor) => String(advisor.id) === registerForm.data.advisor_id,
    );
    const selectedClient = clients.find(
        (client) => String(client.id) === registerForm.data.client_id,
    );
    const registerErrors = registerForm.errors as Record<
        string,
        string | undefined
    >;

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/inmopro/lot-pre-reservations',
            {
                status: form.data.status || undefined,
                project_id: form.data.project_id || undefined,
                advisor_id: form.data.advisor_id || undefined,
            },
            { preserveState: true },
        );
    };

    useEffect(() => {
        return () => {
            if (registerPreview) {
                URL.revokeObjectURL(registerPreview);
            }
        };
    }, [registerPreview]);

    const resetRegisterState = () => {
        registerForm.reset();
        registerForm.clearErrors();
        setProjectSearch('');
        setLotSearch('');
        setAdvisorSearch('');
        setClientSearch('');
        setSelectedProjectIds([]);
        setClientMode('existing');

        if (registerPreview) {
            URL.revokeObjectURL(registerPreview);
        }

        setRegisterPreview(null);
    };

    const openRegisterDialog = () => {
        resetRegisterState();
        setRegisterOpen(true);
    };

    const handleRegisterImageChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0] ?? null;
        registerForm.setData('voucher_image', file);

        if (registerPreview) {
            URL.revokeObjectURL(registerPreview);
        }

        setRegisterPreview(file ? URL.createObjectURL(file) : null);
    };

    const toggleProject = (projectId: number) => {
        setSelectedProjectIds((current) => {
            const next = current.includes(projectId)
                ? current.filter((id) => id !== projectId)
                : [...current, projectId];

            registerForm.setData(
                'lot_ids',
                registerForm.data.lot_ids.filter((lotId) => {
                    const lot = availableLots.find((item) => item.id === lotId);

                    return lot !== undefined && next.includes(lot.project_id);
                }),
            );

            return next;
        });
    };

    const toggleLot = (lotId: number) => {
        registerForm.setData(
            'lot_ids',
            registerForm.data.lot_ids.includes(lotId)
                ? registerForm.data.lot_ids.filter((id) => id !== lotId)
                : [...registerForm.data.lot_ids, lotId],
        );
    };

    const handleAdvisorSelect = (advisorId: string) => {
        const selected = clients.find(
            (client) => String(client.id) === registerForm.data.client_id,
        );

        registerForm.setData((data) => ({
            ...data,
            advisor_id: advisorId,
            client_id:
                !advisorId || String(selected?.advisor_id ?? '') === advisorId
                    ? data.client_id
                    : '',
        }));
    };

    const handleClientSelect = (client: ClientOption) => {
        registerForm.setData((data) => ({
            ...data,
            client_id: String(client.id),
            advisor_id: client.advisor_id
                ? String(client.advisor_id)
                : data.advisor_id,
        }));
        setClientSearch(
            `${client.name}${client.dni ? ` - ${client.dni}` : ''}`,
        );
    };

    const switchClientMode = (mode: 'existing' | 'new') => {
        setClientMode(mode);
        registerForm.clearErrors();
        registerForm.setData((data) => ({
            ...data,
            client_id: '',
            new_client: {
                name: '',
                dni: '',
                phone: '',
            },
        }));
        setClientSearch('');
    };

    const register = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        registerForm.post('/inmopro/lot-pre-reservations', {
            forceFormData: true,
            onSuccess: () => {
                setRegisterOpen(false);
                resetRegisterState();
                showSuccessToast('Pre-reservas registradas correctamente');
            },
        });
    };

    const openApproveDialog = (preReservation: PreReservation) => {
        approveForm.reset();
        approveForm.clearErrors();
        setSelectedPreReservation(preReservation);
        setApproveOpen(true);
    };

    const approve = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedPreReservation) {
            return;
        }

        approveForm.post(
            `/inmopro/lot-pre-reservations/${selectedPreReservation.id}/approve`,
            {
                onSuccess: () => {
                    setApproveOpen(false);
                    setSelectedPreReservation(null);
                    approveForm.reset();
                    showSuccessToast('Pre-reserva aprobada correctamente');
                },
            },
        );
    };

    const openRejectDialog = (preReservation: PreReservation) => {
        rejectForm.reset();
        rejectForm.clearErrors();
        setSelectedPreReservation(preReservation);
        setRejectOpen(true);
    };

    const reject = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedPreReservation) {
            return;
        }

        rejectForm.post(
            `/inmopro/lot-pre-reservations/${selectedPreReservation.id}/reject`,
            {
                onSuccess: () => {
                    setRejectOpen(false);
                    setSelectedPreReservation(null);
                    rejectForm.reset();
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-reservas - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">
                            Pre-reservas de unidades
                        </h2>
                        <p className="text-sm text-slate-500">
                            Registre, revise y resuelva solicitudes desde una
                            sola bandeja operativa.
                        </p>
                    </div>
                    <Button type="button" onClick={openRegisterDialog}>
                        <Plus className="h-4 w-4" />
                        Registrar pre-reserva
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase">
                            Solicitudes visibles
                        </p>
                        <p className="mt-3 text-3xl font-black text-slate-900">
                            {preReservations.data.length}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <p className="text-[10px] font-black text-amber-500 uppercase">
                            Pendientes
                        </p>
                        <p className="mt-3 text-3xl font-black text-amber-700">
                            {
                                preReservations.data.filter(
                                    (preReservation) =>
                                        preReservation.status === 'PENDIENTE',
                                ).length
                            }
                        </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                        <p className="text-[10px] font-black text-emerald-500 uppercase">
                            Lotes disponibles
                        </p>
                        <p className="mt-3 text-3xl font-black text-emerald-700">
                            {availableLots.length}
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={submitFilters}
                    className="grid gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground md:grid-cols-4"
                >
                    <select
                        value={form.data.status}
                        onChange={(event) =>
                            form.setData('status', event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                        <option value="">Todos los estados</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="APROBADA">Aprobada</option>
                        <option value="RECHAZADA">Rechazada</option>
                    </select>
                    <select
                        value={form.data.project_id}
                        onChange={(event) =>
                            form.setData('project_id', event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                        <option value="">Todos los proyectos</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={form.data.advisor_id}
                        onChange={(event) =>
                            form.setData('advisor_id', event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                        <option value="">Todos los vendedores</option>
                        {advisors.map((advisor) => (
                            <option key={advisor.id} value={advisor.id}>
                                {advisor.name}
                            </option>
                        ))}
                    </select>
                    <Button type="submit">Filtrar</Button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">
                                        Unidad
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">
                                        Cliente
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">
                                        Vendedor
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">
                                        Estado
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">
                                        Monto
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">
                                        Fecha
                                    </th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {preReservations.data.map((preReservation) => (
                                    <tr key={preReservation.id}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">
                                                {preReservation.lot?.project
                                                    ?.name ?? '-'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {preReservation.lot
                                                    ? `${preReservation.lot.block}-${preReservation.lot.number}`
                                                    : '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">
                                                {preReservation.client?.name ??
                                                    '-'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {preReservation.client?.city
                                                    ?.name ?? 'Sin ciudad'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">
                                                {preReservation.advisor?.name ??
                                                    '-'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {preReservation.advisor?.team
                                                    ?.name ?? '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-700">
                                                {preReservation.status}
                                            </div>
                                            {preReservation.rejection_reason ? (
                                                <div className="mt-1 text-xs text-red-600">
                                                    {
                                                        preReservation.rejection_reason
                                                    }
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            S/{' '}
                                            {moneyFormatter.format(
                                                Number(preReservation.amount),
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div>
                                                {formatDateTime(
                                                    preReservation.created_at,
                                                )}
                                            </div>
                                            {preReservation.reviewed_at ? (
                                                <div className="text-xs text-slate-400">
                                                    Revision:{' '}
                                                    {formatDateTime(
                                                        preReservation.reviewed_at,
                                                    )}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <a
                                                    href={`/storage/${preReservation.voucher_path}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                                {preReservation.status ===
                                                'PENDIENTE' ? (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() =>
                                                                openApproveDialog(
                                                                    preReservation,
                                                                )
                                                            }
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            Aprobar
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                openRejectDialog(
                                                                    preReservation,
                                                                )
                                                            }
                                                        >
                                                            <X className="h-4 w-4" />
                                                            Rechazar
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3">
                        <Pagination links={preReservations.links} />
                    </div>
                </div>
            </div>

            <Dialog
                open={registerOpen}
                onOpenChange={(open) => {
                    setRegisterOpen(open);

                    if (!open) {
                        resetRegisterState();
                    }
                }}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto p-4 sm:max-w-5xl sm:p-5">
                    <DialogHeader>
                        <DialogTitle>Registrar pre-reserva</DialogTitle>
                        <DialogDescription>
                            Seleccione lotes libres, vincule asesor y cliente,
                            cargue el voucher y registre una pre-reserva por
                            lote.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={register} className="space-y-3">
                        <div className="grid gap-3 lg:grid-cols-[0.9fr_1.35fr]">
                            <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">
                                        Proyectos activos
                                    </label>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {selectedProjectIds.length}{' '}
                                        seleccionado(s)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <Input
                                        value={projectSearch}
                                        onChange={(event) =>
                                            setProjectSearch(event.target.value)
                                        }
                                        placeholder="Buscar proyecto"
                                        className="h-9"
                                    />
                                </div>
                                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                                    {filteredProjects.map((project) => {
                                        const checked =
                                            selectedProjectIds.includes(
                                                project.id,
                                            );

                                        return (
                                            <label
                                                key={project.id}
                                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        toggleProject(
                                                            project.id,
                                                        )
                                                    }
                                                    className="h-4 w-4"
                                                />
                                                <span className="min-w-0 truncate font-medium">
                                                    {project.name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">
                                        Lotes libres
                                    </label>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {registerForm.data.lot_ids.length}{' '}
                                        seleccionado(s)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <Input
                                        value={lotSearch}
                                        onChange={(event) =>
                                            setLotSearch(event.target.value)
                                        }
                                        placeholder="Buscar lote por manzana o numero"
                                        className="h-9"
                                        disabled={
                                            selectedProjectIds.length === 0
                                        }
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100">
                                    {selectedProjectIds.length === 0 ? (
                                        <div className="px-3 py-8 text-center text-sm text-slate-500">
                                            Seleccione uno o mas proyectos para
                                            ver lotes libres.
                                        </div>
                                    ) : filteredLots.length === 0 ? (
                                        <div className="px-3 py-8 text-center text-sm text-slate-500">
                                            No hay lotes libres con esos
                                            filtros.
                                        </div>
                                    ) : (
                                        <div className="grid gap-1.5 p-2 sm:grid-cols-2">
                                            {filteredLots.map((lot) => {
                                                const checked =
                                                    registerForm.data.lot_ids.includes(
                                                        lot.id,
                                                    );

                                                return (
                                                    <label
                                                        key={lot.id}
                                                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:bg-slate-50'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                toggleLot(
                                                                    lot.id,
                                                                )
                                                            }
                                                            className="h-4 w-4 shrink-0"
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="font-semibold">
                                                                {lot.block}-
                                                                {lot.number}
                                                            </span>
                                                            <span className="ml-1 text-xs text-slate-500">
                                                                {lot.project
                                                                    ?.name ??
                                                                    'Proyecto'}
                                                            </span>
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <InputError
                                    message={registerForm.errors.lot_ids}
                                />
                            </section>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                            <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">
                                    Asesor
                                </label>
                                <Input
                                    value={advisorSearch}
                                    onChange={(event) =>
                                        setAdvisorSearch(event.target.value)
                                    }
                                    placeholder="Buscar asesor"
                                    className="h-9"
                                />
                                <div className="max-h-36 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                                    {filteredAdvisors.map((advisor) => {
                                        const selected =
                                            registerForm.data.advisor_id ===
                                            String(advisor.id);

                                        return (
                                            <button
                                                key={advisor.id}
                                                type="button"
                                                onClick={() =>
                                                    handleAdvisorSelect(
                                                        String(advisor.id),
                                                    )
                                                }
                                                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'}`}
                                            >
                                                <span className="font-medium">
                                                    {advisor.name}
                                                </span>
                                                {selected ? (
                                                    <Check className="h-4 w-4" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                                <InputError
                                    message={registerForm.errors.advisor_id}
                                />
                            </section>

                            <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">
                                        Cliente
                                    </label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                clientMode === 'existing'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                switchClientMode('existing')
                                            }
                                        >
                                            Cliente existente
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                clientMode === 'new'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                switchClientMode('new')
                                            }
                                        >
                                            Crear cliente
                                        </Button>
                                    </div>
                                </div>

                                {clientMode === 'existing' ? (
                                    <div className="space-y-2">
                                        <Input
                                            value={clientSearch}
                                            onChange={(event) =>
                                                setClientSearch(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Buscar cliente por nombre, DNI o telefono"
                                            className="h-9"
                                        />
                                        <div className="max-h-36 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                                            {filteredClients.map((client) => {
                                                const selected =
                                                    registerForm.data
                                                        .client_id ===
                                                    String(client.id);

                                                return (
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onClick={() =>
                                                            handleClientSelect(
                                                                client,
                                                            )
                                                        }
                                                        className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'}`}
                                                    >
                                                        <span className="min-w-0 truncate">
                                                            <span className="font-medium">
                                                                {client.name}
                                                            </span>
                                                            <span className="ml-2 text-slate-500">
                                                                {client.dni ??
                                                                    'Sin DNI'}
                                                            </span>
                                                        </span>
                                                        {selected ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <InputError
                                            message={
                                                registerForm.errors.client_id
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        <div>
                                            <Input
                                                value={
                                                    registerForm.data.new_client
                                                        .name
                                                }
                                                onChange={(event) =>
                                                    registerForm.setData(
                                                        'new_client',
                                                        {
                                                            ...registerForm.data
                                                                .new_client,
                                                            name: event.target
                                                                .value,
                                                        },
                                                    )
                                                }
                                                placeholder="Nombre"
                                                className="h-9"
                                            />
                                            <InputError
                                                message={
                                                    registerErrors[
                                                        'new_client.name'
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Input
                                                value={
                                                    registerForm.data.new_client
                                                        .dni
                                                }
                                                onChange={(event) =>
                                                    registerForm.setData(
                                                        'new_client',
                                                        {
                                                            ...registerForm.data
                                                                .new_client,
                                                            dni: event.target
                                                                .value,
                                                        },
                                                    )
                                                }
                                                placeholder="DNI"
                                                className="h-9"
                                            />
                                            <InputError
                                                message={
                                                    registerErrors[
                                                        'new_client.dni'
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Input
                                                value={
                                                    registerForm.data.new_client
                                                        .phone
                                                }
                                                onChange={(event) =>
                                                    registerForm.setData(
                                                        'new_client',
                                                        {
                                                            ...registerForm.data
                                                                .new_client,
                                                            phone: event.target
                                                                .value,
                                                        },
                                                    )
                                                }
                                                placeholder="Telefono"
                                                className="h-9"
                                            />
                                            <InputError
                                                message={
                                                    registerErrors[
                                                        'new_client.phone'
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="sm:col-span-3">
                                            <InputError
                                                message={
                                                    registerErrors.duplicate_registration
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor="register_pre_reservation_amount"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Monto total
                                </label>
                                <Input
                                    id="register_pre_reservation_amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={registerForm.data.amount}
                                    onChange={(event) =>
                                        registerForm.setData(
                                            'amount',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="0.00"
                                    className="h-9"
                                />
                                <InputError
                                    message={registerForm.errors.amount}
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="register_pre_reservation_reference"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Referencia de pago
                                </label>
                                <Input
                                    id="register_pre_reservation_reference"
                                    value={registerForm.data.payment_reference}
                                    onChange={(event) =>
                                        registerForm.setData(
                                            'payment_reference',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Operacion, Yape, deposito, etc."
                                    className="h-9"
                                />
                                <InputError
                                    message={
                                        registerForm.errors.payment_reference
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="register_pre_reservation_notes"
                                className="text-sm font-medium text-slate-700"
                            >
                                Observaciones
                            </label>
                            <textarea
                                id="register_pre_reservation_notes"
                                value={registerForm.data.notes}
                                onChange={(event) =>
                                    registerForm.setData(
                                        'notes',
                                        event.target.value,
                                    )
                                }
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                                placeholder="Notas internas de la solicitud"
                            />
                            <InputError message={registerForm.errors.notes} />
                        </div>

                        <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                            <div className="space-y-2">
                                <label
                                    htmlFor="register_pre_reservation_voucher"
                                    className="flex min-h-28 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-50"
                                >
                                    <div className="rounded-full bg-white p-2 shadow-sm">
                                        <ImagePlus className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">
                                            {registerForm.data.voucher_image
                                                ? 'Cambiar voucher'
                                                : 'Seleccionar voucher'}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            JPG, PNG, WEBP. Maximo 5 MB.
                                        </p>
                                        {registerForm.data.voucher_image ? (
                                            <p className="mt-1 truncate text-xs font-semibold text-emerald-700">
                                                {
                                                    registerForm.data
                                                        .voucher_image.name
                                                }
                                            </p>
                                        ) : null}
                                    </div>
                                </label>
                                <input
                                    id="register_pre_reservation_voucher"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleRegisterImageChange}
                                    className="hidden"
                                />
                                <InputError
                                    message={registerForm.errors.voucher_image}
                                />
                            </div>

                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                {registerPreview ? (
                                    <img
                                        src={registerPreview}
                                        alt="Vista previa del voucher"
                                        className="max-h-44 w-full object-contain"
                                    />
                                ) : (
                                    <div className="flex min-h-28 flex-col items-center justify-center px-4 py-5 text-center">
                                        <ImagePlus className="h-7 w-7 text-slate-300" />
                                        <p className="mt-2 text-sm font-medium text-slate-600">
                                            Vista previa del voucher
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                <div>
                                    <p className="text-xs font-bold text-emerald-700 uppercase">
                                        Lotes
                                    </p>
                                    <p className="text-lg font-black">
                                        {selectedLots.length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-700 uppercase">
                                        Monto total
                                    </p>
                                    <p className="text-lg font-black">
                                        S/{' '}
                                        {registerForm.data.amount
                                            ? moneyFormatter.format(
                                                  Number(
                                                      registerForm.data.amount,
                                                  ),
                                              )
                                            : '0.00'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-700 uppercase">
                                        Asesor
                                    </p>
                                    <p className="font-semibold">
                                        {selectedAdvisor?.name ??
                                            'Sin seleccionar'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-700 uppercase">
                                        Cliente
                                    </p>
                                    <p className="font-semibold">
                                        {clientMode === 'existing'
                                            ? (selectedClient?.name ??
                                              'Sin seleccionar')
                                            : registerForm.data.new_client
                                                  .name || 'Nuevo cliente'}
                                    </p>
                                </div>
                            </div>
                            {selectedLots.length > 0 ? (
                                <div className="mt-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                                    {selectedLots.map((lot, index) => (
                                        <span
                                            key={lot.id}
                                            className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-emerald-800"
                                        >
                                            {lot.project?.name ?? 'Proyecto'}{' '}
                                            {lot.block}-{lot.number}: S/{' '}
                                            {distributedAmounts[index] ??
                                                '0.00'}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRegisterOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={registerForm.processing}
                            >
                                Registrar pre-reservas
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={approveOpen}
                onOpenChange={(open) => {
                    setApproveOpen(open);

                    if (!open) {
                        setSelectedPreReservation(null);
                        approveForm.reset();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Aprobar pre-reserva</DialogTitle>
                        <DialogDescription>
                            Revise el voucher cargado, registre una resena y
                            confirme la aprobacion.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPreReservation ? (
                        <form onSubmit={approve} className="space-y-4">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                <img
                                    src={`/storage/${selectedPreReservation.voucher_path}`}
                                    alt={`Voucher pre-reserva ${selectedPreReservation.id}`}
                                    className="max-h-[420px] w-full object-contain"
                                />
                            </div>
                            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">
                                        Unidad
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {selectedPreReservation.lot
                                            ? `${selectedPreReservation.lot.block}-${selectedPreReservation.lot.number}`
                                            : 'Unidad'}
                                    </p>
                                    <p>
                                        {selectedPreReservation.lot?.project
                                            ?.name ?? 'Sin proyecto'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">
                                        Cliente
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {selectedPreReservation.client?.name ??
                                            'Sin cliente'}
                                    </p>
                                    <p>
                                        {selectedPreReservation.client?.city
                                            ?.name ?? 'Sin ciudad'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">
                                        Monto
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        S/{' '}
                                        {moneyFormatter.format(
                                            Number(
                                                selectedPreReservation.amount,
                                            ),
                                        )}
                                    </p>
                                    <p>
                                        {selectedPreReservation.advisor?.name ??
                                            'Sin vendedor'}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="pre_reservation_review_notes"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Resena de aprobacion
                                </label>
                                <textarea
                                    id="pre_reservation_review_notes"
                                    value={approveForm.data.review_notes}
                                    onChange={(event) =>
                                        approveForm.setData(
                                            'review_notes',
                                            event.target.value,
                                        )
                                    }
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                                    placeholder="Detalle breve de la validacion realizada"
                                />
                                <InputError
                                    message={approveForm.errors.review_notes}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setApproveOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={approveForm.processing}
                                >
                                    Aprobar pre-reserva
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog
                open={rejectOpen}
                onOpenChange={(open) => {
                    setRejectOpen(open);

                    if (!open) {
                        setSelectedPreReservation(null);
                        rejectForm.reset();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Rechazar pre-reserva</DialogTitle>
                        <DialogDescription>
                            Revise el voucher y documente el motivo antes de
                            devolver la solicitud.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPreReservation ? (
                        <form onSubmit={reject} className="space-y-4">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                <img
                                    src={`/storage/${selectedPreReservation.voucher_path}`}
                                    alt={`Voucher pre-reserva ${selectedPreReservation.id}`}
                                    className="max-h-[320px] w-full object-contain"
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="pre_reservation_rejection_reason"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Motivo del rechazo
                                </label>
                                <textarea
                                    id="pre_reservation_rejection_reason"
                                    value={rejectForm.data.rejection_reason}
                                    onChange={(event) =>
                                        rejectForm.setData(
                                            'rejection_reason',
                                            event.target.value,
                                        )
                                    }
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                                    placeholder="Detalle por que la solicitud no procede"
                                />
                                <InputError
                                    message={rejectForm.errors.rejection_reason}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRejectOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={rejectForm.processing}
                                >
                                    Confirmar rechazo
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : null}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
