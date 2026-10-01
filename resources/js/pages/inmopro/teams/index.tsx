import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Download, Eye, FileSpreadsheet, Pencil, Plus, Trash2, Users } from 'lucide-react';
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

type Team = {
    id: number;
    name: string;
    code: string;
    color?: string | null;
    sort_order?: number;
    is_active: boolean;
    advisors_count?: number;
};

export default function TeamsIndex({ teams }: { teams: { data: Team[]; links: PaginationLink[]; total?: number } }) {
    const items = teams.data;
    const page = usePage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [createOpen, setCreateOpen] = useState(() => page.url.includes('create=1'));
    const createForm = useForm({
        name: '',
        code: '',
        description: '',
        color: '#0f766e',
        sort_order: 0,
        is_active: true,
        group_sales_goal: 0,
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

        router.post('/inmopro/teams/import-from-excel', formData, {
            forceFormData: true,
            onFinish: () => {
                setImporting(false);
                input.value = '';
            },
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Teams comerciales', href: '/inmopro/teams' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`Eliminar team "${name}"?`)) {
            router.delete(`/inmopro/teams/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teams - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Teams comerciales</h2>
                        <p className="text-sm text-slate-500">Organice vendedores por equipos de trabajo.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href="/inmopro/teams/excel-template">
                                <FileSpreadsheet className="h-4 w-4" />
                                Plantilla
                            </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <a href="/inmopro/teams/export-excel">
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
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Team</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Codigo</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Vendedores</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Estado</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((team) => (
                                <tr key={team.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: team.color ?? '#0f172a' }} />
                                            {team.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{team.code}</td>
                                    <td className="px-4 py-3 text-slate-600">{team.advisors_count ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${team.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {team.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/inmopro/teams/${team.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></Link>
                                            <Link href={`/inmopro/teams/${team.id}/edit`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>
                                            <button type="button" onClick={() => handleDestroy(team.id, team.name)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Users className="mx-auto mb-2 h-10 w-10" />
                            <p>No hay teams registrados.</p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={teams.links} />
                        </div>
                    )}
                </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo team</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            createForm.post('/inmopro/teams', { preserveScroll: true, onSuccess: () => setCreateOpen(false) });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label htmlFor="team-name">Nombre</Label>
                            <Input id="team-name" value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} className="mt-1" />
                            <InputError message={createForm.errors.name} />
                        </div>
                        <div>
                            <Label htmlFor="team-code">Código</Label>
                            <Input id="team-code" value={createForm.data.code} onChange={(e) => createForm.setData('code', e.target.value.toUpperCase())} className="mt-1" />
                            <InputError message={createForm.errors.code} />
                        </div>
                        <div>
                            <Label htmlFor="team-description">Descripción</Label>
                            <Input id="team-description" value={createForm.data.description} onChange={(e) => createForm.setData('description', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="team-color">Color</Label>
                            <Input id="team-color" value={createForm.data.color} onChange={(e) => createForm.setData('color', e.target.value)} className="mt-1" />
                            <InputError message={createForm.errors.color} />
                        </div>
                        <div>
                            <Label htmlFor="team-order">Orden</Label>
                            <Input id="team-order" type="number" min={0} value={createForm.data.sort_order} onChange={(e) => createForm.setData('sort_order', Number(e.target.value))} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="team-goal">Meta grupal (S/)</Label>
                            <Input id="team-goal" type="number" min={0} step="0.01" value={createForm.data.group_sales_goal} onChange={(e) => createForm.setData('group_sales_goal', Number(e.target.value))} className="mt-1" />
                            <InputError message={createForm.errors.group_sales_goal} />
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input type="checkbox" checked={createForm.data.is_active} onChange={(e) => createForm.setData('is_active', e.target.checked)} />
                            Team activo
                        </label>
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
