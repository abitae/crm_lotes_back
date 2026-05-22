import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string;
    number: number;
    project?: { name: string } | null;
    status?: { name: string; code: string } | null;
    client?: { name: string; dni?: string | null; phone?: string | null } | null;
    advisor?: { name: string } | null;
};

export default function TransferConfirmationCreate({ lot }: { lot: Lot }) {
    const { data, setData, post, processing, errors } = useForm<{
        evidence_image: File | null;
    }>({
        evidence_image: null,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Transferencias', href: '/inmopro/lot-transfer-confirmations' },
        { title: `Lote ${lot.block}-${lot.number}`, href: `/inmopro/lots/${lot.id}` },
        { title: 'Confirmar transferencia', href: `/inmopro/lots/${lot.id}/transfer-confirmation` },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(`/inmopro/lots/${lot.id}/transfer-confirmation`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Confirmar transferencia ${lot.block}-${lot.number} - Inmopro`} />
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">
                        Confirmar transferencia del lote {lot.block}-{lot.number}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Al registrar la evidencia, el lote pasara a estado transferido y quedara pendiente de aprobacion.
                    </p>
                </div>

                <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-sm">
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm text-slate-500">Proyecto</dt>
                            <dd className="font-medium text-slate-800">{lot.project?.name ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">Estado actual</dt>
                            <dd className="font-medium text-slate-800">{lot.status?.name ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">Cliente</dt>
                            <dd className="font-medium text-slate-800">{lot.client?.name ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">Asesor</dt>
                            <dd className="font-medium text-slate-800">{lot.advisor?.name ?? '—'}</dd>
                        </div>
                    </dl>
                </div>

                <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-sm">
                    <div>
                        <Label htmlFor="evidence_image">Evidencia de transferencia</Label>
                        <input
                            id="evidence_image"
                            type="file"
                            accept="image/*"
                            onChange={(event) => setData('evidence_image', event.target.files?.[0] ?? null)}
                            className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        />
                        <p className="mt-2 text-sm text-slate-500">
                            Adjunte una imagen del voucher o sustento de la transferencia.
                        </p>
                        <InputError message={errors.evidence_image} className="mt-2" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" disabled={processing}>
                            Registrar transferencia
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={`/inmopro/lots/${lot.id}`}>Cancelar</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
