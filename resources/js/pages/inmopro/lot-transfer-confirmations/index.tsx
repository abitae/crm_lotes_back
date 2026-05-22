import { Head, router, useForm } from '@inertiajs/react';
import { Check, Eye, ImagePlus, Search, Upload, X } from 'lucide-react';
import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';
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
import { showSuccessToast } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type Project = { id: number; name: string };
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
    number: number;
    status?: { name: string; code: string; color?: string | null } | null;
    project?: { name: string } | null;
    client?: { name: string; dni?: string | null; phone?: string | null } | null;
    advisor?: { name: string } | null;
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

export default function LotTransferConfirmationsIndex({
    lots,
    filters,
    projects,
    lotStatuses,
}: {
    lots: { data: LotRow[]; links: PaginationLink[]; total: number };
    filters: { project_id?: string; lot_status_id?: string; search?: string; advisor_search?: string; pending_review?: string };
    projects: Project[];
    lotStatuses: LotStatusOption[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Transferencias', href: '/inmopro/lot-transfer-confirmations' },
    ];
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

    const submitFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get('/inmopro/lot-transfer-confirmations', {
            project_id: (formData.get('project_id') as string) || undefined,
            lot_status_id: (formData.get('lot_status_id') as string) || undefined,
            search: (formData.get('search') as string) || undefined,
            advisor_search: (formData.get('advisor_search') as string) || undefined,
            pending_review: formData.get('pending_review') ? '1' : undefined,
        }, { preserveState: true });
    };

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
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Confirmacion de transferencias</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Gestione el registro y la revision de transferencias desde una sola bandeja operativa.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lotes totales</p>
                        <p className="mt-3 text-3xl font-black text-slate-900">{lots.total}</p>
                    </div>
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pendientes de revision</p>
                        <p className="mt-3 text-3xl font-black text-amber-700">
                            {lots.data.filter((lot) => lot.latest_transfer_confirmation?.status === 'PENDIENTE').length}
                        </p>
                    </div>
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Listos para registrar</p>
                        <p className="mt-3 text-3xl font-black text-emerald-700">
                            {lots.data.filter((lot) => lot.status?.code === 'RESERVADO' && lot.latest_transfer_confirmation?.status !== 'PENDIENTE').length}
                        </p>
                    </div>
                </div>

                <form onSubmit={submitFilters} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 xl:grid-cols-[220px_220px_1fr_1fr_180px_160px]">
                    <select
                        name="project_id"
                        defaultValue={filters.project_id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                    >
                        <option value="">Todos los proyectos</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <select
                        name="lot_status_id"
                        defaultValue={filters.lot_status_id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                    >
                        <option value="">Todos los estados</option>
                        {lotStatuses.map((status) => (
                            <option key={status.id} value={status.id}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Buscar lote, cliente, DNI o telefono"
                            className="bg-slate-50 pl-10"
                        />
                    </div>
                    <Input
                        name="advisor_search"
                        defaultValue={filters.advisor_search}
                        placeholder="Buscar por asesor"
                        className="bg-slate-50"
                    />
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            name="pending_review"
                            value="1"
                            defaultChecked={filters.pending_review === '1'}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Solo pendientes de revision
                    </label>
                    <Button type="submit">Filtrar</Button>
                </form>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Lote</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Proyecto</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Cliente</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Asesor</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Estado lote</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Revision</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Registro</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lots.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                                            No se encontraron lotes para los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    lots.data.map((lot) => {
                                        const transfer = lot.latest_transfer_confirmation;
                                        const canRegister = lot.status?.code === 'RESERVADO' && transfer?.status !== 'PENDIENTE';
                                        const isPending = transfer?.status === 'PENDIENTE';

                                        return (
                                            <tr key={lot.id} className="align-top">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-slate-800">{lot.block}-{lot.number}</div>
                                                    <div className="text-xs text-slate-500">ID #{lot.id}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {lot.project?.name ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800">{lot.client?.name ?? 'Sin cliente'}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {[lot.client?.dni, lot.client?.phone].filter(Boolean).join(' · ') || 'Sin DNI / telefono'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {lot.advisor?.name ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${lot.status?.color ? '' : 'bg-slate-100 text-slate-700'}`}
                                                        style={lotStatusBadgeStyle(lot.status?.color)}
                                                    >
                                                        {lot.status?.name ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {transfer ? (
                                                        <>
                                                            <div className="font-medium text-slate-800">{transfer.status}</div>
                                                            <div className="text-xs text-slate-500">
                                                                Solicitado: {transfer.requester?.name ?? '—'}
                                                            </div>
                                                            {transfer.reviewer ? (
                                                                <div className="text-xs text-slate-500">
                                                                    Reviso: {transfer.reviewer.name}
                                                                </div>
                                                            ) : null}
                                                            {transfer.rejection_reason ? (
                                                                <div className="mt-1 text-xs text-red-600">{transfer.rejection_reason}</div>
                                                            ) : null}
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-slate-500">Sin transferencia registrada</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {transfer ? (
                                                        <>
                                                            <div>{formatDateTime(transfer.created_at)}</div>
                                                            {transfer.reviewed_at ? (
                                                                <div className="text-xs text-slate-400">
                                                                    Revision: {formatDateTime(transfer.reviewed_at)}
                                                                </div>
                                                            ) : null}
                                                        </>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        {transfer ? (
                                                            <a
                                                                href={`/storage/${transfer.evidence_path}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                                title="Ver evidencia"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </a>
                                                        ) : null}
                                                        {canRegister ? (
                                                            <Button type="button" size="sm" onClick={() => openRegisterDialog(lot)}>
                                                                <Upload className="h-4 w-4" />
                                                                Registrar
                                                            </Button>
                                                        ) : null}
                                                        {isPending && transfer ? (
                                                            <>
                                                                <Button type="button" size="sm" onClick={() => openApproveDialog(transfer)}>
                                                                    <Check className="h-4 w-4" />
                                                                    Aprobar
                                                                </Button>
                                                                <Button type="button" size="sm" variant="outline" onClick={() => openRejectDialog(transfer)}>
                                                                    <X className="h-4 w-4" />
                                                                    Rechazar
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
                    <div className="border-t border-slate-100 px-4 py-3">
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
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Registrar transferencia</DialogTitle>
                        <DialogDescription>
                            Suba la evidencia desde este modal para marcar el lote como transferido y dejarlo pendiente de revisión.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLot ? (
                        <form onSubmit={submitRegister} className="space-y-5">
                            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Lote</p>
                                    <p className="mt-1 text-base font-semibold text-slate-800">
                                        {selectedLot.block}-{selectedLot.number}
                                    </p>
                                    <p className="text-sm text-slate-500">{selectedLot.project?.name ?? 'Sin proyecto'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cliente y asesor</p>
                                    <p className="mt-1 text-base font-semibold text-slate-800">
                                        {selectedLot.client?.name ?? 'Sin cliente'}
                                    </p>
                                    <p className="text-sm text-slate-500">{selectedLot.advisor?.name ?? 'Sin asesor'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label
                                    htmlFor="register_transfer_image"
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
                                >
                                    <div className="rounded-full bg-white p-3 shadow-sm">
                                        <ImagePlus className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <p className="mt-4 font-semibold text-slate-800">
                                        {registerForm.data.evidence_image ? 'Cambiar evidencia' : 'Seleccionar evidencia de transferencia'}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Formatos permitidos: JPG, PNG, WEBP. Máximo 5 MB.
                                    </p>
                                </label>
                                <input
                                    id="register_transfer_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleRegisterImageChange}
                                    className="hidden"
                                />
                                <InputError message={registerForm.errors.evidence_image} />
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                {registerPreview ? (
                                    <img
                                        src={registerPreview}
                                        alt="Vista previa de la evidencia"
                                        className="max-h-[420px] w-full object-contain"
                                    />
                                ) : (
                                    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
                                        <ImagePlus className="h-10 w-10 text-slate-300" />
                                        <p className="mt-3 font-medium text-slate-600">Vista previa de la imagen</p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            La imagen seleccionada aparecerá aquí antes de registrar la transferencia.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={registerForm.processing}>
                                    Registrar transferencia
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
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Aprobar transferencia</DialogTitle>
                        <DialogDescription>
                            Revise la evidencia cargada, registre una reseña y confirme la aprobación.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTransfer ? (
                        <form onSubmit={approve} className="space-y-4">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                <img
                                    src={`/storage/${selectedTransfer.evidence_path}`}
                                    alt={`Evidencia transferencia ${selectedTransfer.id}`}
                                    className="max-h-[420px] w-full object-contain"
                                />
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Objetivo de la revisión</p>
                                <p className="mt-1 text-sm text-slate-600">
                                    Confirme que la evidencia coincide con la operación antes de aprobar y dejar las comisiones generadas.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="transfer_review_notes" className="text-sm font-medium text-slate-700">
                                    Reseña de aprobación
                                </label>
                                <textarea
                                    id="transfer_review_notes"
                                    value={approveForm.data.review_notes}
                                    onChange={(event) => approveForm.setData('review_notes', event.target.value)}
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                                    placeholder="Detalle breve de la validación realizada"
                                />
                                <InputError message={approveForm.errors.review_notes} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setApproveOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={approveForm.processing}>
                                    Aprobar transferencia
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rechazar transferencia</DialogTitle>
                        <DialogDescription>
                            Indique el motivo del rechazo para devolver el lote al estado reservado.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReject} className="space-y-4">
                        {selectedTransfer ? (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                <img
                                    src={`/storage/${selectedTransfer.evidence_path}`}
                                    alt={`Evidencia transferencia ${selectedTransfer.id}`}
                                    className="max-h-[260px] w-full object-contain"
                                />
                            </div>
                        ) : null}
                        <textarea
                            value={rejectForm.data.rejection_reason}
                            onChange={(event) => rejectForm.setData('rejection_reason', event.target.value)}
                            rows={4}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                            placeholder="Motivo del rechazo"
                        />
                        <InputError message={rejectForm.errors.rejection_reason} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={rejectForm.processing}>
                                Confirmar rechazo
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
