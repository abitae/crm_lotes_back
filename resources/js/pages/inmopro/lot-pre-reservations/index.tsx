import { Head, router, useForm } from '@inertiajs/react';
import { Check, Eye, ImagePlus, Plus, X } from 'lucide-react';
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
    lot?: { id: number; block: string; number: number; project?: { name: string } | null; status?: { name: string; code: string } | null } | null;
    client?: { name: string; city?: { name: string } | null } | null;
    advisor?: { name: string; team?: { name: string } | null } | null;
    reviewer?: { name: string } | null;
};

export default function LotPreReservationsIndex({
    preReservations,
    filters,
    projects,
    advisors,
    availableLots,
    clients,
}: {
    preReservations: { data: PreReservation[]; links: PaginationLink[] };
    filters: { status?: string; project_id?: number | string; advisor_id?: number | string };
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
    const [selectedPreReservation, setSelectedPreReservation] = useState<PreReservation | null>(null);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [registerPreview, setRegisterPreview] = useState<string | null>(null);
    const registerForm = useForm<{
        project_id: string;
        lot_id: string;
        advisor_id: string;
        client_id: string;
        amount: string;
        payment_reference: string;
        notes: string;
        voucher_image: File | null;
    }>({
        project_id: '',
        lot_id: '',
        advisor_id: '',
        client_id: '',
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

    const filteredLots = useMemo(() => {
        if (!registerForm.data.project_id) {
            return availableLots;
        }

        return availableLots.filter((lot) => String(lot.project_id) === registerForm.data.project_id);
    }, [availableLots, registerForm.data.project_id]);

    const filteredClients = useMemo(() => {
        if (!registerForm.data.advisor_id) {
            return clients;
        }

        return clients.filter((client) => String(client.advisor_id ?? '') === registerForm.data.advisor_id);
    }, [clients, registerForm.data.advisor_id]);

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get('/inmopro/lot-pre-reservations', {
            status: form.data.status || undefined,
            project_id: form.data.project_id || undefined,
            advisor_id: form.data.advisor_id || undefined,
        }, { preserveState: true });
    };

    useEffect(() => {
        return () => {
            if (registerPreview) {
                URL.revokeObjectURL(registerPreview);
            }
        };
    }, [registerPreview]);

    const openRegisterDialog = () => {
        registerForm.reset();
        registerForm.clearErrors();
        setRegisterPreview(null);
        setRegisterOpen(true);
    };

    const handleRegisterImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        registerForm.setData('voucher_image', file);

        if (registerPreview) {
            URL.revokeObjectURL(registerPreview);
        }

        setRegisterPreview(file ? URL.createObjectURL(file) : null);
    };

    const handleAdvisorChange = (advisorId: string) => {
        const selectedClient = clients.find((client) => String(client.id) === registerForm.data.client_id);

        registerForm.setData((data) => ({
            ...data,
            advisor_id: advisorId,
            client_id: !advisorId || String(selectedClient?.advisor_id ?? '') === advisorId ? data.client_id : '',
        }));
    };

    const handleClientChange = (clientId: string) => {
        const client = clients.find((item) => String(item.id) === clientId);

        registerForm.setData((data) => ({
            ...data,
            client_id: clientId,
            advisor_id: client?.advisor_id ? String(client.advisor_id) : data.advisor_id,
        }));
    };

    const register = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        registerForm.post('/inmopro/lot-pre-reservations', {
            forceFormData: true,
            onSuccess: () => {
                setRegisterOpen(false);
                registerForm.reset();
                if (registerPreview) {
                    URL.revokeObjectURL(registerPreview);
                }
                setRegisterPreview(null);
                showSuccessToast('Pre-reserva registrada correctamente');
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

        approveForm.post(`/inmopro/lot-pre-reservations/${selectedPreReservation.id}/approve`, {
            onSuccess: () => {
                setApproveOpen(false);
                setSelectedPreReservation(null);
                approveForm.reset();
                showSuccessToast('Pre-reserva aprobada correctamente');
            },
        });
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

        rejectForm.post(`/inmopro/lot-pre-reservations/${selectedPreReservation.id}/reject`, {
            onSuccess: () => {
                setRejectOpen(false);
                setSelectedPreReservation(null);
                rejectForm.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-reservas - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Pre-reservas de unidades</h2>
                        <p className="text-sm text-slate-500">Registre, revise y resuelva solicitudes desde una sola bandeja operativa.</p>
                    </div>
                    <Button type="button" onClick={openRegisterDialog}>
                        <Plus className="h-4 w-4" />
                        Registrar pre-reserva
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-border bg-card text-card-foreground p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solicitudes visibles</p>
                        <p className="mt-3 text-3xl font-black text-slate-900">{preReservations.data.length}</p>
                    </div>
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pendientes</p>
                        <p className="mt-3 text-3xl font-black text-amber-700">
                            {preReservations.data.filter((preReservation) => preReservation.status === 'PENDIENTE').length}
                        </p>
                    </div>
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Lotes disponibles</p>
                        <p className="mt-3 text-3xl font-black text-emerald-700">
                            {availableLots.length}
                        </p>
                    </div>
                </div>

                <form onSubmit={submitFilters} className="grid gap-4 rounded-2xl border border-border bg-card text-card-foreground p-4 md:grid-cols-4">
                    <select value={form.data.status} onChange={(event) => form.setData('status', event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
                        <option value="">Todos los estados</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="APROBADA">Aprobada</option>
                        <option value="RECHAZADA">Rechazada</option>
                    </select>
                    <select value={form.data.project_id} onChange={(event) => form.setData('project_id', event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
                        <option value="">Todos los proyectos</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>
                    <select value={form.data.advisor_id} onChange={(event) => form.setData('advisor_id', event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
                        <option value="">Todos los vendedores</option>
                        {advisors.map((advisor) => (
                            <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
                        ))}
                    </select>
                    <Button type="submit">Filtrar</Button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Unidad</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Cliente</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Vendedor</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Estado</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Monto</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Fecha</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {preReservations.data.map((preReservation) => (
                                    <tr key={preReservation.id}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{preReservation.lot?.project?.name ?? '-'}</div>
                                            <div className="text-xs text-slate-500">
                                                {preReservation.lot ? `${preReservation.lot.block}-${preReservation.lot.number}` : '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{preReservation.client?.name ?? '-'}</div>
                                            <div className="text-xs text-slate-500">{preReservation.client?.city?.name ?? 'Sin ciudad'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{preReservation.advisor?.name ?? '-'}</div>
                                            <div className="text-xs text-slate-500">{preReservation.advisor?.team?.name ?? '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-700">{preReservation.status}</div>
                                            {preReservation.rejection_reason ? (
                                                <div className="mt-1 text-xs text-red-600">{preReservation.rejection_reason}</div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            S/ {Number(preReservation.amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div>{formatDateTime(preReservation.created_at)}</div>
                                            {preReservation.reviewed_at ? <div className="text-xs text-slate-400">Revisión: {formatDateTime(preReservation.reviewed_at)}</div> : null}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <a href={`/storage/${preReservation.voucher_path}`} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                                {preReservation.status === 'PENDIENTE' ? (
                                                    <>
                                                        <Button type="button" size="sm" onClick={() => openApproveDialog(preReservation)}>
                                                            <Check className="h-4 w-4" />
                                                            Aprobar
                                                        </Button>
                                                        <Button type="button" size="sm" variant="outline" onClick={() => openRejectDialog(preReservation)}>
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
            <Dialog open={registerOpen} onOpenChange={(open) => {
                setRegisterOpen(open);

                if (!open) {
                    registerForm.reset();
                    registerForm.clearErrors();
                    if (registerPreview) {
                        URL.revokeObjectURL(registerPreview);
                    }
                    setRegisterPreview(null);
                }
            }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Registrar pre-reserva</DialogTitle>
                        <DialogDescription>
                            Seleccione la unidad, asocie cliente y asesor, cargue el voucher y deje la solicitud pendiente de aprobación.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={register} className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="register_pre_reservation_project_id" className="text-sm font-medium text-slate-700">
                                    Proyecto
                                </label>
                                <select
                                    id="register_pre_reservation_project_id"
                                    value={registerForm.data.project_id}
                                    onChange={(event) => registerForm.setData((data) => ({
                                        ...data,
                                        project_id: event.target.value,
                                        lot_id: '',
                                    }))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                    <option value="">Seleccione un proyecto</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={registerForm.errors.project_id} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register_pre_reservation_lot_id" className="text-sm font-medium text-slate-700">
                                    Lote
                                </label>
                                <select
                                    id="register_pre_reservation_lot_id"
                                    value={registerForm.data.lot_id}
                                    onChange={(event) => registerForm.setData('lot_id', event.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                    <option value="">Seleccione una unidad</option>
                                    {filteredLots.map((lot) => (
                                        <option key={lot.id} value={lot.id}>
                                            {lot.project?.name ?? 'Proyecto'} · {lot.block}-{lot.number}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={registerForm.errors.lot_id} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register_pre_reservation_advisor_id" className="text-sm font-medium text-slate-700">
                                    Asesor
                                </label>
                                <select
                                    id="register_pre_reservation_advisor_id"
                                    value={registerForm.data.advisor_id}
                                    onChange={(event) => handleAdvisorChange(event.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                    <option value="">Seleccione un asesor</option>
                                    {advisors.map((advisor) => (
                                        <option key={advisor.id} value={advisor.id}>
                                            {advisor.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={registerForm.errors.advisor_id} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register_pre_reservation_client_id" className="text-sm font-medium text-slate-700">
                                    Cliente
                                </label>
                                <select
                                    id="register_pre_reservation_client_id"
                                    value={registerForm.data.client_id}
                                    onChange={(event) => handleClientChange(event.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                    <option value="">Seleccione un cliente</option>
                                    {filteredClients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.dni ? `· ${client.dni}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={registerForm.errors.client_id} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register_pre_reservation_amount" className="text-sm font-medium text-slate-700">
                                    Monto
                                </label>
                                <Input
                                    id="register_pre_reservation_amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={registerForm.data.amount}
                                    onChange={(event) => registerForm.setData('amount', event.target.value)}
                                    placeholder="0.00"
                                />
                                <InputError message={registerForm.errors.amount} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register_pre_reservation_reference" className="text-sm font-medium text-slate-700">
                                    Referencia de pago
                                </label>
                                <Input
                                    id="register_pre_reservation_reference"
                                    value={registerForm.data.payment_reference}
                                    onChange={(event) => registerForm.setData('payment_reference', event.target.value)}
                                    placeholder="Operacion, Yape, deposito, etc."
                                />
                                <InputError message={registerForm.errors.payment_reference} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="register_pre_reservation_notes" className="text-sm font-medium text-slate-700">
                                Observaciones
                            </label>
                            <textarea
                                id="register_pre_reservation_notes"
                                value={registerForm.data.notes}
                                onChange={(event) => registerForm.setData('notes', event.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                                placeholder="Notas internas de la solicitud"
                            />
                            <InputError message={registerForm.errors.notes} />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                            <div className="space-y-3">
                                <label
                                    htmlFor="register_pre_reservation_voucher"
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
                                >
                                    <div className="rounded-full bg-white p-3 shadow-sm">
                                        <ImagePlus className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <p className="mt-4 font-semibold text-slate-800">
                                        {registerForm.data.voucher_image ? 'Cambiar voucher' : 'Seleccionar voucher'}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Formatos permitidos: JPG, PNG, WEBP. Máximo 5 MB.
                                    </p>
                                </label>
                                <input
                                    id="register_pre_reservation_voucher"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleRegisterImageChange}
                                    className="hidden"
                                />
                                <InputError message={registerForm.errors.voucher_image} />
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                {registerPreview ? (
                                    <img
                                        src={registerPreview}
                                        alt="Vista previa del voucher"
                                        className="max-h-[360px] w-full object-contain"
                                    />
                                ) : (
                                    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
                                        <ImagePlus className="h-10 w-10 text-slate-300" />
                                        <p className="mt-3 font-medium text-slate-600">Vista previa del voucher</p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Revise aquí la imagen antes de registrar la pre-reserva.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={registerForm.processing}>
                                Registrar pre-reserva
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={approveOpen} onOpenChange={(open) => {
                setApproveOpen(open);

                if (!open) {
                    setSelectedPreReservation(null);
                    approveForm.reset();
                }
            }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Aprobar pre-reserva</DialogTitle>
                        <DialogDescription>
                            Revise el voucher cargado, registre una reseña y confirme la aprobación.
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
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Unidad</p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {selectedPreReservation.lot ? `${selectedPreReservation.lot.block}-${selectedPreReservation.lot.number}` : 'Unidad'}
                                    </p>
                                    <p>{selectedPreReservation.lot?.project?.name ?? 'Sin proyecto'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cliente</p>
                                    <p className="mt-1 font-semibold text-slate-800">{selectedPreReservation.client?.name ?? 'Sin cliente'}</p>
                                    <p>{selectedPreReservation.client?.city?.name ?? 'Sin ciudad'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Monto</p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        S/ {Number(selectedPreReservation.amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p>{selectedPreReservation.advisor?.name ?? 'Sin vendedor'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="pre_reservation_review_notes" className="text-sm font-medium text-slate-700">
                                    Reseña de aprobación
                                </label>
                                <textarea
                                    id="pre_reservation_review_notes"
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
                                    Aprobar pre-reserva
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={rejectOpen} onOpenChange={(open) => {
                setRejectOpen(open);

                if (!open) {
                    setSelectedPreReservation(null);
                    rejectForm.reset();
                }
            }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Rechazar pre-reserva</DialogTitle>
                        <DialogDescription>
                            Revise el voucher y documente el motivo antes de devolver la solicitud.
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
                                <label htmlFor="pre_reservation_rejection_reason" className="text-sm font-medium text-slate-700">
                                    Motivo del rechazo
                                </label>
                                <textarea
                                    id="pre_reservation_rejection_reason"
                                    value={rejectForm.data.rejection_reason}
                                    onChange={(event) => rejectForm.setData('rejection_reason', event.target.value)}
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                                    placeholder="Detalle por qué la solicitud no procede"
                                />
                                <InputError message={rejectForm.errors.rejection_reason} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="outline" disabled={rejectForm.processing}>
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
