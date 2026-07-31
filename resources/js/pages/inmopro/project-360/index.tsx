import { Head, Link, router } from '@inertiajs/react';
import { Eye, MapPin, Search, Settings2, View } from 'lucide-react';
import { useState } from 'react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import project360 from '@/routes/inmopro/project-360';
import type { BreadcrumbItem } from '@/types';

type ProjectRow = {
    id: number;
    name: string;
    location: string | null;
    is_active: boolean;
    panoramas_count: number;
};

type PageProps = {
    projects: {
        data: ProjectRow[];
        links: PaginationLink[];
    };
    filters: {
        search?: string | null;
        status?: string | null;
    };
    canManage: boolean;
};

export default function Project360Index({
    projects,
    filters,
    canManage,
}: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vista 360', href: project360.index().url },
    ];

    const applyFilters = (event: React.FormEvent) => {
        event.preventDefault();
        router.get(
            project360.index().url,
            {
                search: search.trim() || undefined,
                status: status || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vista 360 - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        <View className="h-7 w-7 text-orange-500" />
                        Vista 360
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Recorridos inmersivos y enlaces públicos de los
                        proyectos.
                    </p>
                </div>

                <form
                    onSubmit={applyFilters}
                    className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px_auto]"
                >
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar proyecto o ubicación"
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                        <option value="">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                    <Button type="submit">Filtrar</Button>
                </form>

                {projects.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-white p-12 text-center text-slate-500">
                        No se encontraron proyectos con esos filtros.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {projects.data.map((project) => (
                            <Card key={project.id} className="gap-4 py-5">
                                <CardContent className="space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="truncate font-semibold text-slate-900">
                                                {project.name}
                                            </h2>
                                            <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                {project.location ||
                                                    'Sin ubicación'}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={
                                                project.is_active
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {project.is_active
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </Badge>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                        <strong className="text-slate-900">
                                            {project.panoramas_count}
                                        </strong>{' '}
                                        panorama(s) registrado(s)
                                    </div>

                                    <Button asChild className="w-full">
                                        <Link
                                            href={project360.show(project.id)}
                                            prefetch
                                        >
                                            {canManage ? (
                                                <Settings2 className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                            {canManage
                                                ? 'Administrar tour'
                                                : 'Ver tour'}
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Pagination links={projects.links} />
            </div>
        </AppLayout>
    );
}
