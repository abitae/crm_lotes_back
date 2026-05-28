import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/date';

type Project = { id: number; name: string; location?: string };
type Client = { id: number; name: string; dni?: string; phone?: string };
type Advisor = { id: number; name: string };
type Lot = { id: number; block: string; number: string; area?: string; price?: string; project?: Project; client?: Client | null };
type Ticket = {
    id: number;
    scheduled_at: string;
    advisor: Advisor;
    lot: Lot;
};
type Deed = { id: number; printed_at: string | null; signed_at: string | null };

export default function DeliveryDeedPrint({
    ticket,
    deed,
    companyName,
}: {
    ticket: Ticket;
    deed: Deed;
    companyName: string;
}) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <Head title={`Acta de entrega - Ticket #${ticket.id}`} />
            <div className="min-h-screen bg-white p-6">
                <div className="mb-6 flex justify-end print:hidden">
                    <Button onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                        Imprimir acta
                    </Button>
                </div>

                <article className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
                    <header className="border-b border-slate-200 pb-4 text-center">
                        <h1 className="text-xl font-bold uppercase tracking-wide text-slate-800">
                            Acta de entrega de lote
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">{companyName}</p>
                    </header>

                    <section className="mt-6 space-y-4 text-sm">
                        <div>
                            <h2 className="font-semibold text-slate-700">Datos del cliente</h2>
                            <p><span className="text-slate-600">Nombre:</span> {ticket.lot?.client?.name ?? '—'}</p>
                            {ticket.lot?.client?.dni && <p><span className="text-slate-600">DNI:</span> {ticket.lot.client.dni}</p>}
                            {ticket.lot?.client?.phone && <p><span className="text-slate-600">Teléfono:</span> {ticket.lot.client.phone}</p>}
                        </div>

                        <div>
                            <h2 className="font-semibold text-slate-700">Lote y proyecto</h2>
                            <p><span className="text-slate-600">Proyecto:</span> {ticket.lot?.project?.name ?? '—'}</p>
                            {ticket.lot?.project?.location && <p><span className="text-slate-600">Ubicación:</span> {ticket.lot.project.location}</p>}
                            <p><span className="text-slate-600">Lote:</span> Manzana {ticket.lot?.block}, Número {ticket.lot?.number}</p>
                            {ticket.lot?.area != null && <p><span className="text-slate-600">Área:</span> {ticket.lot.area}</p>}
                            {ticket.lot?.price != null && <p><span className="text-slate-600">Precio:</span> {ticket.lot.price}</p>}
                        </div>

                        <div>
                            <h2 className="font-semibold text-slate-700">Fecha y hora de entrega</h2>
                            <p>{formatDateTime(ticket.scheduled_at)}</p>
                        </div>

                        <div>
                            <h2 className="font-semibold text-slate-700">Vendedor</h2>
                            <p>{ticket.advisor?.name ?? '—'}</p>
                        </div>

                        <div className="mt-8 border-t border-slate-200 pt-6">
                            <p className="font-semibold text-slate-700">Firma del cliente</p>
                            <p className="mt-2 text-slate-500">
                                {deed?.signed_at
                                    ? `Firma registrada el ${formatDateTime(deed.signed_at)}`
                                    : '_________________________'}
                            </p>
                        </div>
                    </section>

                    <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
                        Ticket de atención #{ticket.id} · Acta de entrega
                    </footer>
                </article>
            </div>
        </>
    );
}
