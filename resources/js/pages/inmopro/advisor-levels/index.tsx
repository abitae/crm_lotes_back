import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Download, Eye, FileSpreadsheet, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type AdvisorLevelRow = { id: number; name: string; code?: string; direct_rate?: string; pyramid_rate?: string; advisors_count?: number };

export default function AdvisorLevelsIndex({ advisorLevels }: { advisorLevels: { data: AdvisorLevelRow[]; links: PaginationLink[] } }) {
    const items = advisorLevels.data;
    const page = usePage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [createOpen, setCreateOpen] = useState(() => page.url.includes('create=1'));
    const createForm = useForm({
        name: '',
        code: '',
        direct_rate: '',
        pyramid_rate: '',
        color: '#10b981',
        sort_order: '0',
    });

    const handleImportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const input = fileInputRef.current;

        if (!input?.files?.length) {
            return;
        }

        setImporting(true);
        const formData = new FormData();
        formData.append('file', input.files[0]);

        router.post('/inmopro/advisor-levels/import-from-excel', formData, {
            forceFormData: true,
            onFinish: () => {
                setImporting(false);
                input.value = '';
            },
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Niveles de asesor', href: '/inmopro/advisor-levels' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`¿Eliminar nivel "${name}"?`)) {
            router.delete('/inmopro/advisor-levels/' + id);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Niveles de asesor - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Niveles de asesor</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Importe primero los niveles y teams, luego los vendedores.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href="/inmopro/advisor-levels/excel-template">
                                <FileSpreadsheet className="h-4 w-4" />
                                Plantilla
                            </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <a href="/inmopro/advisor-levels/export-excel">
                                <Download className="h-4 w-4" />
                                Exportar Excel
                            </a>
                        </Button>
                        <form onSubmit={handleImportSubmit}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.length) {
                                        (e.target.form as HTMLFormElement).requestSubmit();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importing}
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                {importing ? 'Importando...' : 'Importar Excel'}
                            </Button>
                        </form>
                        <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                            <Plus className="h-5 w-5" /> Nuevo
                        </button>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Nombre</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Directa %</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Piramidal %</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((s) => (
                                <tr key={s.id}>
                                    <td className="px-4 py-3 font-medium">{s.name}</td>
                                    <td className="px-4 py-3 text-right">{s.direct_rate ?? '—'}</td>
                                    <td className="px-4 py-3 text-right">{s.pyramid_rate ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link href={'/inmopro/advisor-levels/' + s.id}><Eye className="h-4 w-4" /></Link>
                                            <Link href={'/inmopro/advisor-levels/' + s.id + '/edit'}><Pencil className="h-4 w-4" /></Link>
                                            <button type="button" onClick={() => handleDestroy(s.id, s.name)}><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={advisorLevels.links} />
                        </div>
                    )}
                </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo nivel de asesor</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            createForm.post('/inmopro/advisor-levels', { preserveScroll: true, onSuccess: () => setCreateOpen(false) });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label htmlFor="advisor-level-name">Nombre</Label>
                            <Input id="advisor-level-name" value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} className="mt-1" />
                            <InputError message={createForm.errors.name} />
                        </div>
                        <div>
                            <Label htmlFor="advisor-level-code">Código (opcional)</Label>
                            <Input id="advisor-level-code" value={createForm.data.code} onChange={(e) => createForm.setData('code', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="advisor-level-direct">Comisión directa %</Label>
                            <Input id="advisor-level-direct" type="number" min={0} max={100} value={createForm.data.direct_rate} onChange={(e) => createForm.setData('direct_rate', e.target.value)} className="mt-1" />
                            <InputError message={createForm.errors.direct_rate} />
                        </div>
                        <div>
                            <Label htmlFor="advisor-level-pyramid">Comisión piramidal %</Label>
                            <Input id="advisor-level-pyramid" type="number" min={0} max={100} value={createForm.data.pyramid_rate} onChange={(e) => createForm.setData('pyramid_rate', e.target.value)} className="mt-1" />
                            <InputError message={createForm.errors.pyramid_rate} />
                        </div>
                        <div>
                            <Label htmlFor="advisor-level-color">Color</Label>
                            <Input id="advisor-level-color" value={createForm.data.color} onChange={(e) => createForm.setData('color', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="advisor-level-order">Orden</Label>
                            <Input id="advisor-level-order" type="number" min={0} value={createForm.data.sort_order} onChange={(e) => createForm.setData('sort_order', e.target.value)} className="mt-1" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createForm.processing}>Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
