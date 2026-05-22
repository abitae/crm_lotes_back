import { Head, Link, router } from '@inertiajs/react';
import { Download, Eye, FileSpreadsheet, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import Pagination, { type PaginationLink } from '@/components/pagination';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

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
                        <Link href="/inmopro/teams/create" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                            <Plus className="h-5 w-5" /> Nuevo
                        </Link>
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
        </AppLayout>
    );
}
