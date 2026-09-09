import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { ProjectFlatViewer } from '@/components/inmopro/project-flat-viewer';
import { Button } from '@/components/ui/button';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatMoney } from '@/lib/crm-format';
import lots from '@/routes/crm/lots';
import projects from '@/routes/crm/projects';
import type { BreadcrumbItem } from '@/types';
import {
    type ProjectFlatMapsCenter,
    type ProjectFlatPolygon,
} from '@/types/project-flat';

type PageProps = {
    project: {
        id: number;
        name: string;
    };
    polygons: ProjectFlatPolygon[];
    mapsCenter: ProjectFlatMapsCenter | null;
    googleMapsApiKey: string | null;
};

export default function CrmProjectFlat({
    project,
    polygons,
    mapsCenter,
    googleMapsApiKey,
}: PageProps) {
    const [selectedPolygonId, setSelectedPolygonId] = useState<number | null>(null);
    const [hoveredPolygonId, setHoveredPolygonId] = useState<number | null>(null);
    const selectedPolygon = polygons.find((polygon) => polygon.id === selectedPolygonId) ?? null;
    const selectedLot = selectedPolygon?.lot ?? null;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Proyectos', href: '/crm/projects' },
        { title: project.name, href: `/crm/projects/${project.id}` },
        { title: 'Vista plana', href: `/crm/projects/${project.id}/flat` },
    ];

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={`Vista plana · ${project.name}`} />

            <CrmPage>
                <CrmPageHeader
                    title={project.name}
                    description="Vista plana del proyecto"
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={projects.index()}>
                                <ArrowLeft className="size-4" />
                                Volver a proyectos
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    {googleMapsApiKey && mapsCenter ? (
                        <ProjectFlatViewer
                            apiKey={googleMapsApiKey}
                            center={mapsCenter}
                            polygons={polygons}
                            selectedPolygonId={selectedPolygonId}
                            hoveredPolygonId={hoveredPolygonId}
                            onHoverPolygon={setHoveredPolygonId}
                            onSelectPolygon={setSelectedPolygonId}
                            className="min-h-[70vh]"
                        />
                    ) : (
                        <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No se puede mostrar la vista plana porque falta el mapa o la clave de Google Maps.
                        </div>
                    )}

                    <div className="rounded-xl border bg-card p-4">
                        {selectedPolygon ? (
                            <div className="space-y-2 text-sm">
                                <p className="font-semibold">{selectedPolygon.title}</p>
                                {selectedPolygon.description ? (
                                    <p className="text-muted-foreground">{selectedPolygon.description}</p>
                                ) : null}
                                {selectedLot ? (
                                    <>
                                        <p>
                                            Mz. {selectedLot.block} · Lote {selectedLot.number}
                                        </p>
                                        <p>Área: {selectedLot.area ?? '—'} m²</p>
                                        <p>Precio: {formatMoney(selectedLot.price)}</p>
                                        {selectedLot.status ? (
                                            <p>Estado: {selectedLot.status.name}</p>
                                        ) : null}
                                        <Button variant="outline" size="sm" className="w-full" asChild>
                                            <Link href={lots.show(selectedLot.id)}>Ver lote</Link>
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Polígono informativo, sin lote ligado.</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Toca un polígono en el mapa para ver el detalle del lote.
                            </p>
                        )}
                    </div>
                </div>
            </CrmPage>
        </CrmLayout>
    );
}
