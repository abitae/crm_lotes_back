import { Head, router, useForm } from '@inertiajs/react';
import { Check, Eye, ImagePlus, Search, Upload, X } from 'lucide-react';
import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
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
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/date';
import { formatPen } from '@/lib/report-utils';
import { showSuccessToast } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type Project = { id: number; name: string };
type AdvisorOption = { id: number; name: string };
type LotStatusOption = { id: number; name: string; code: string; color?: string | null };
type TransferConfirmation = {
    id: number;
    status: string;
    evidence_path: string;
    created_at: string;
    reviewed_at?: string | null;
    review_notes?: string | null;
    rejection_reason?: string | null;
    requester?: { name: string } | null;
    reviewer?: { name: string } | null;
} | null;
type LotRow = {
    id: number;
    block: string;
    number: string;
    price?: string | number | null;
    advance?: string | number | null;
    remaining_balance?: string | number | null;
    status?: { name: string; code: string; color?: string | null } | null;
    project?: { name: string } | null;
    client?: { name: string; dni?: string | null; phone?: string | null } | null;
    advisor?: { id?: number; name: string } | null;
    latest_transfer_confirmation?: TransferConfirmation;
};

function lotStatusBadgeStyle(color?: string | null): CSSProperties | undefined {
    if (!color) {
        return undefined;
    }

    return {
        backgroundColor: color,
        color: '#ffffff',
    };
}

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase();
}

function formatLotMoney(value?: string | number | null): string {
    if (value == null || value === '') {
        return '—';
    }

    return formatPen(Number(value));
}

export default function LotTransferConfirmationsIndex({
    lots,
    filters,
    projects,
    advisors,
    lotStatuses,
}: {
    lots: { data: LotRow[]; links: PaginationLink[]; total: number };
    filters: {
        project_id?: string;
        lot_status_id?: string;
        search?: string;
        advisor_id?: string;
        pending_review?: string;
    };
    projects: Project[];
    advisors: AdvisorOption[];
    lotStatuses: LotStatusOption[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Transferencias', href: '/inmopro/lot-transfer-confirmations' },
    ];
    const filterForm = useForm({
        project_id: filters.project_id ?? '',
        lot_status_id: filters.lot_status_id ?? '',
        search: filters.search ?? '',
        advisor_id: filters.advisor_id ?? '',
        pending_review: filters.pending_review === '1',
    });
    const [advisorFilterSearch, setAdvisorFilterSearch] = useState('');
    const [advisorFilterOpen, setAdvisorFilterOpen] = useState(false);
    const advisorFilterRef = useRef<HTMLDivElement>(null);
    const [selectedLot, setSelectedLot] = useState<LotRow | null>(null);
    const [selectedTransfer, setSelectedTransfer] = useState<Exclude<TransferConfirmation, null> | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [registerPreview, setRegisterPreview] = useState<string | null>(null);
    const registerForm = useForm<{
        evidence_image: File | null;
    }>({
        evidence_image: null,
    });
    const approveForm = useForm({
        review_notes: '',
    });
    const rejectForm = useForm({
        rejection_reason: '',
    });

    const selectedAdvisor = advisors.find(
        (advisor) => String(advisor.id) === filterForm.data.advisor_id,
    );

    const filteredAdvisors = useMemo(() => {
        const search = normalizeSearch(advisorFilterSearch);

        if (!search) {
            return advisors;
        }

        return advisors.filter((advisor) => advisor.name.toLowerCase().includes(search));
    }, [advisorFilterSearch, advisors]);

    const submitFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get('/inmopro/lot-transfer-confirmations', {
            project_id: filterForm.data.project_id || undefined,
            lot_status_id: filterForm.data.lot_status_id || undefined,
            search: filterForm.data.search || undefined,
            advisor_id: filterForm.data.advisor_id || undefined,
            pending_review: filterForm.data.pending_review ? '1' : undefined,
        }, { preserveState: true });
    };

    const clearAdvisorFilter = () => {
        filterForm.setData('advisor_id', '');
        setAdvisorFilterSearch('');
        setAdvisorFilterOpen(false);
    };

    const selectAdvisorFilter = (advisorId: number) => {
        filterForm.setData('advisor_id', String(advisorId));
        setAdvisorFilterOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                advisorFilterRef.current &&
                !advisorFilterRef.current.contains(event.target as Node)
            ) {
                setAdvisorFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (registerPreview) {
                URL.revokeObjectURL(registerPreview);
            }
        };
    }, [registerPreview]);

    const openRegisterDialog = (lot: LotRow) => {
        registerForm.reset();
        registerForm.clearErrors();
        setSelectedLot(lot);
        setRegisterPreview(null);
        setRegisterOpen(true);
    };

    const handleRegisterImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        registerForm.setData('evidence_image', file);

        if (registerPreview) {
            URL.revokeObjectURL(registerPreview);
        }

        setRegisterPreview(file ? URL.createObjectURL(file) : null);
    };

    const submitRegister = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedLot) {
            return;
        }

        registerForm.post(`/inmopro/lots/${selectedLot.id}/transfer-confirmation`, {
            forceFormData: true,
            onSuccess: () => {
                setRegisterOpen(false);
                setSelectedLot(null);
                registerForm.reset();
                if (registerPreview) {
                    URL.revokeObjectURL(registerPreview);
                }
                setRegisterPreview(null);
                showSuccessToast('Transferencia registrada correctamente');
            },
        });
    };

    const openApproveDialog = (transfer: Exclude<TransferConfirmation, null>) => {
        approveForm.reset();
        approveForm.clearErrors();
        setSelectedTransfer(transfer);
        setApproveOpen(true);
    };

    const approve = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedTransfer) {
            return;
        }

        approveForm.post(`/inmopro/lot-transfer-confirmations/${selectedTransfer.id}/approve`, {
            onSuccess: () => {
                setApproveOpen(false);
                setSelectedTransfer(null);
                approveForm.reset();
                showSuccessToast('Transferencia aprobada correctamente');
            },
        });
    };

    const openRejectDialog = (transfer: Exclude<TransferConfirmation, null>) => {
        rejectForm.reset();
        rejectForm.clearErrors();
        setSelectedTransfer(transfer);
        setRejectOpen(true);
    };

    const submitReject = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedTransfer) {
            return;
        }

        rejectForm.post(`/inmopro/lot-transfer-confirmations/${selectedTransfer.id}/reject`, {
            onSuccess: () => {
                setRejectOpen(false);
                setSelectedTransfer(null);
                rejectForm.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transferencias - Inmopro" />
            <div className="space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
                <div>
                    <h2 className="text-xl font-black text-slate-800 sm:text-2xl">Confirmacion de transferencias</h2>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        Gestione el registro y la revision de transferencias desde una sola bandeja operativa.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                    <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:rounded-3xl sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lotes totales</p>
                        <p className="mt-2 text-2xl font-black text-slate-900 sm:mt-3 sm:text-3xl">{lots.total}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:rounded-3xl sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pendientes de revision</p>
                        <p className="mt-2 text-2xl font-black text-amber-700 sm:mt-3 sm:text-3xl">
                            {lots.data.filter((lot) => lot.latest_transfer_confirmation?.status === 'PENDIENTE').length}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:rounded-3xl sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Listos para registrar</p>
                        <p className="mt-2 text-2xl font-black text-emerald-700 sm:mt-3 sm:text-3xl">
                            {lots.data.filter((lot) => lot.status?.code === 'RESERVADO' && lot.latest_transfer_confirmation?.status !== 'PENDIENTE').length}
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={submitFilters}
                    className="space-y-3 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm sm:rounded-3xl sm:p-4"
                >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <select
                            value={filterForm.data.project_id}
                            onChange={(event) => filterForm.setData('project_id', event.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                        >
                            <option value="">Todos los proyectos</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filterForm.data.lot_status_id}
                            onChange={(event) => filterForm.setData('lot_status_id', event.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                        >
                            <option value="">Todos los estados</option>
                            {lotStatuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                    {status.name}
                                </option>
                            ))}
                        </select>
                        <div className="relative sm:col-span-2 lg:col-span-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={filterForm.data.search}
                                onChange={(event) => filterForm.setData('search', event.target.value)}
                                placeholder="Lote, cliente, DNI o telefono"
                                className="h-9 bg-slate-50 pl-9 text-sm"
                            />
                        </div>
                        <div ref={advisorFilterRef} className="relative sm:col-span-2 lg:col-span-1">
                            <div className="flex gap-1">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={advisorFilterOpen ? advisorFilterSearch : (selectedAdvisor?.name ?? advisorFilterSearch)}
                                        onChange={(event) => {
                                            setAdvisorFilterSearch(event.target.value);
                                            setAdvisorFilterOpen(true);
                                        }}
                                        onFocus={() => setAdvisorFilterOpen(true)}
                                        placeholder="Buscar asesor"
                                        className="h-9 bg-slate-50 pl-9 text-sm"
                                    />
                                </div>
                                {filterForm.data.advisor_id ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        onClick={clearAdvisorFilter}
                                        title="Quitar asesor"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                ) : null}
                            </div>
                            {advisorFilterOpen ? (
                                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                    {filteredAdvisors.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-slate-500">Sin resultados</p>
                                    ) : (
                                        filteredAdvisors.map((advisor) => {
                                            const selected = filterForm.data.advisor_id === String(advisor.id);

                                            return (
                                                <button
                                                    key={advisor.id}
                                                    type="button"
                                                    onClick={() => selectAdvisorFilter(advisor.id)}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'}`}
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 sm:text-sm">
                            <input
                                type="checkbox"
                                checked={filterForm.data.pending_review}
                                onChange={(event) => filterForm.setData('pending_review', event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Solo pendientes de revision
                        </label>
                        <Button type="submit" className="h-9 w-full sm:w-auto">
                            Filtrar
                        </Button>
                    </div>
                </form>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm sm:rounded-3xl">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-2 py-2 text-left">Lote</th>
                                    <th className="px-2 py-2 text-left">Cliente</th>
                                    <th className="px-2 py-2 text-left">Asesor</th>
                                    <th className="px-2 py-2 text-right">Montos</th>
                                    <th className="px-2 py-2 text-left">Estado</th>
                                    <th className="px-2 py-2 text-left">Revision</th>
                                    <th className="px-2 py-2 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lots.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-2 py-6 text-center text-xs text-slate-500">
                                            No se encontraron lotes para los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    lots.data.map((lot) => {
                                        const transfer = lot.latest_transfer_confirmation;
                                        const canRegister = lot.status?.code === 'RESERVADO' && transfer?.status !== 'PENDIENTE';
                                        const isPending = transfer?.status === 'PENDIENTE';

                                        return (
                                            <tr key={lot.id} className="align-top hover:bg-slate-50/60">
                                                <td className="px-2 py-1.5">
                                                    <div className="font-semibold text-slate-800">
                                                        {lot.block}-{lot.number}
                                                    </div>
                                                    <div className="truncate text-[10px] text-slate-500">
                                                        {lot.project?.name ?? '—'}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <div className="max-w-[140px] truncate font-medium text-slate-800">
                                                        {lot.client?.name ?? 'Sin cliente'}
                                                    </div>
                                                    <div className="truncate text-[10px] text-slate-500">
                                                        {[lot.client?.dni, lot.client?.phone].filter(Boolean).join(' · ') || '—'}
                                                    </div>
                                                </td>
                                                <td className="max-w-[110px] truncate px-2 py-1.5 text-slate-700">
                                                    {lot.advisor?.name ?? '—'}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    <div className="text-slate-800">{formatLotMoney(lot.price)}</div>
                                                    <div className="text-[10px] text-emerald-700">
                                                        Sep. {formatLotMoney(lot.advance)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        Rest. {formatLotMoney(lot.remaining_balance)}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${lot.status?.color ? '' : 'bg-slate-100 text-slate-700'}`}
                                                        style={lotStatusBadgeStyle(lot.status?.color)}
                                                    >
                                                        {lot.status?.name ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {transfer ? (
                                                        <>
                                                            <div className="font-medium text-slate-800">{transfer.status}</div>
                                                            <div className="text-[10px] text-slate-500">
                                                                {transfer.requester?.name ?? '—'}
                                                            </div>
                                                            {transfer.reviewer ? (
                                                                <div className="text-[10px] text-slate-500">
                                                                    {transfer.reviewer.name}
                                                                </div>
                                                            ) : null}
                                                            <div className="text-[10px] text-slate-400">
                                                                {formatDateTime(transfer.created_at)}
                                                            </div>
                                                            {transfer.rejection_reason ? (
                                                                <div className="mt-0.5 text-[10px] text-red-600">{transfer.rejection_reason}</div>
                                                            ) : null}
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-500">Sin registro</span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <div className="flex flex-wrap justify-end gap-1">
                                                        {transfer ? (
                                                            <a
                                                                href={`/storage/${transfer.evidence_path}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                                title="Ver evidencia"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </a>
                                                        ) : null}
                                                        {canRegister ? (
                                                            <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => openRegisterDialog(lot)}>
                                                                <Upload className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline">Registrar</span>
                                                            </Button>
                                                        ) : null}
                                                        {isPending && transfer ? (
                                                            <>
                                                                <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => openApproveDialog(transfer)}>
                                                                    <Check className="h-3.5 w-3.5" />
                                                                    <span className="hidden sm:inline">Aprobar</span>
                                                                </Button>
                                                                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openRejectDialog(transfer)}>
                                                                    <X className="h-3.5 w-3.5" />
                                                                    <span className="hidden sm:inline">Rechazar</span>
                                                                </Button>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-slate-100 px-3 py-2">
                        <Pagination links={lots.links} />
                    </div>
                </div>
            </div>

            <Dialog open={registerOpen} onOpenChange={(open) => {
                setRegisterOpen(open);

                if (!open) {
                    setSelectedLot(null);
                    registerForm.reset();
                    registerForm.clearErrors();
                    if (registerPreview) {
                        URL.revokeObjectURL(registerPreview);
                    }
                    setRegisterPreview(null);
                }
            }}>
                <DialogContent className="flex max-h-[min(90vh,34rem)] w-[calc(100vw-1.5rem)] flex-col gap-2 overflow-hidden p-3 sm:max-w-lg">
                    <DialogHeader className="shrink-0 gap-1">
                        <DialogTitle className="text-base">Registrar transferencia</DialogTitle>
                        <DialogDescription className="text-xs">
                            Adjunte el voucher para marcar el lote como transferido.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLot ? (
                        <form onSubmit={submitRegister} className="flex min-h-0 flex-1 flex-col gap-2">
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                                    <p className="font-semibold text-slate-800">
                                        {selectedLot.block}-{selectedLot.number}
                                        <span className="font-normal text-slate-500">
                                            {' · '}{selectedLot.project?.name ?? 'Sin proyecto'}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 truncate text-slate-500">
                                        {selectedLot.client?.name ?? 'Sin cliente'}
                                        {' · '}{selectedLot.advisor?.name ?? 'Sin asesor'}
                                        {' · Sep. '}{formatLotMoney(selectedLot.advance)}
                                        {' · Rest. '}{formatLotMoney(selectedLot.remaining_balance)}
                                    </p>
                                </div>

                                <label
                                    htmlFor="register_transfer_image"
                                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 transition hover:border-emerald-400 hover:bg-emerald-50"
                                >
                                    <div className="rounded-full bg-white p-1.5 shadow-sm">
                                        <ImagePlus className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="text-xs font-semibold text-slate-800">
                                            {registerForm.data.evidence_image ? 'Cambiar evidencia' : 'Seleccionar evidencia'}
                                        </p>
                                        <p className="text-[11px] text-slate-500">JPG, PNG, WEBP · máx. 5 MB</p>
                                    </div>
                                </label>
                                <input
                                    id="register_transfer_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleRegisterImageChange}
                                    className="hidden"
                                />
                                <InputError message={registerForm.errors.evidence_image} />

                                {registerPreview ? (
                                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                        <img
                                            src={registerPreview}
                                            alt="Vista previa de la evidencia"
                                            className="max-h-36 w-full object-contain sm:max-h-44"
                                        />
                                    </div>
                                ) : null}
                            </div>

                            <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setRegisterOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" size="sm" disabled={registerForm.processing}>
                                    Registrar
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={approveOpen} onOpenChange={(open) => {
                setApproveOpen(open);

                if (!open) {
                    setSelectedTransfer(null);
                    approveForm.reset();
                }
            }}>
                <DialogContent className="flex max-h-[min(90vh,32rem)] w-[calc(100vw-1.5rem)] flex-col gap-2 overflow-hidden p-3 sm:max-w-lg">
                    <DialogHeader className="shrink-0 gap-1">
                        <DialogTitle className="text-base">Aprobar transferencia</DialogTitle>
                        <DialogDescription className="text-xs">
                            Revise la evidencia y confirme la aprobación.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTransfer ? (
                        <form onSubmit={approve} className="flex min-h-0 flex-1 flex-col gap-2">
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                    <img
                                        src={`/storage/${selectedTransfer.evidence_path}`}
                                        alt={`Evidencia transferencia ${selectedTransfer.id}`}
                                        className="max-h-36 w-full object-contain sm:max-h-44"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="transfer_review_notes" className="text-xs font-medium text-slate-700">
                                        Reseña de aprobación
                                    </label>
                                    <textarea
                                        id="transfer_review_notes"
                                        value={approveForm.data.review_notes}
                                        onChange={(event) => approveForm.setData('review_notes', event.target.value)}
                                        rows={2}
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        placeholder="Detalle breve de la validación"
                                    />
                                    <InputError message={approveForm.errors.review_notes} />
                                </div>
                            </div>
                            <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setApproveOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" size="sm" disabled={approveForm.processing}>
                                    Aprobar
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={rejectOpen} onOpenChange={(open) => {
                setRejectOpen(open);

                if (!open) {
                    setSelectedTransfer(null);
                    rejectForm.reset();
                }
            }}>
                <DialogContent className="flex max-h-[min(90vh,28rem)] w-[calc(100vw-1.5rem)] flex-col gap-2 overflow-hidden p-3 sm:max-w-md">
                    <DialogHeader className="shrink-0 gap-1">
                        <DialogTitle className="text-base">Rechazar transferencia</DialogTitle>
                        <DialogDescription className="text-xs">
                            Indique el motivo para devolver el lote a reservado.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReject} className="flex min-h-0 flex-1 flex-col gap-2">
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                            {selectedTransfer ? (
                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                    <img
                                        src={`/storage/${selectedTransfer.evidence_path}`}
                                        alt={`Evidencia transferencia ${selectedTransfer.id}`}
                                        className="max-h-28 w-full object-contain sm:max-h-36"
                                    />
                                </div>
                            ) : null}
                            <textarea
                                value={rejectForm.data.rejection_reason}
                                onChange={(event) => rejectForm.setData('rejection_reason', event.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                placeholder="Motivo del rechazo"
                            />
                            <InputError message={rejectForm.errors.rejection_reason} />
                        </div>
                        <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" size="sm" disabled={rejectForm.processing}>
                                Rechazar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
