import { Head, Link, router } from '@inertiajs/react';
import { MapPin, Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type City = {
    id: number;
    name: string;
    code: string;
    department?: string | null;
    is_active: boolean;
    clients_count?: number;
};

export default function CitiesIndex({
    cities,
    filters,
}: {
    cities: { data: City[]; links: PaginationLink[] };
    filters: { search?: string };
}) {
    const items = cities.data;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Ciudades', href: '/inmopro/cities' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`Eliminar ciudad "${name}"?`)) {
            router.delete(`/inmopro/cities/${id}`);
        }
    };

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const search = formData.get('search');
        router.get('/inmopro/cities', { search: search || undefined }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ciudades - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Ciudades de procedencia</h2>
                        <p className="text-sm text-slate-500">Catálogo de ciudades para la base de clientes.</p>
                    </div>
                    <Link href="/inmopro/cities/create" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">
                        <Plus className="h-5 w-5" /> Nueva
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Buscar ciudad</CardTitle>
                        <CardDescription>Por nombre, código o departamento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input name="search" defaultValue={filters.search} className="pl-9" placeholder="Lima, Cusco, LIM..." />
                            </div>
                            <Button type="submit" variant="secondary">Buscar</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Ciudad</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Código</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Departamento</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Clientes</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Estado</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((city) => (
                                <tr key={city.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800">{city.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{city.code}</td>
                                    <td className="px-4 py-3 text-slate-600">{city.department ?? '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{city.clients_count ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${city.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {city.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/inmopro/cities/${city.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></Link>
                                            <Link href={`/inmopro/cities/${city.id}/edit`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>
                                            <button type="button" onClick={() => handleDestroy(city.id, city.name)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <MapPin className="mx-auto mb-2 h-10 w-10" />
                            <p>No hay ciudades registradas.</p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={cities.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
