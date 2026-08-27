import { Head, Link } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import projects from '@/routes/crm/projects';
import type { BreadcrumbItem } from '@/types';

type ProjectRow = {
    id: number;
    name: string;
    location: string | null;
    total_lots: number | null;
    lots_count: number;
    available_lots_count: number;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Proyectos', href: '/crm/projects' }];

export default function CrmProjectsIndex({ projects: projectList }: { projects: ProjectRow[] }) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Proyectos" />

            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {projectList.map((project) => (
                    <Link key={project.id} href={projects.show(project.id)}>
                        <Card className="h-full transition-colors hover:border-primary">
                            <CardHeader className="flex flex-row items-center gap-3">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-base">{project.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1 text-sm text-muted-foreground">
                                <p>{project.location ?? 'Sin ubicación'}</p>
                                <p>
                                    {project.available_lots_count} disponibles de {project.lots_count} lotes
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                {projectList.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay proyectos activos.</p>
                )}
            </div>
        </CrmLayout>
    );
}
