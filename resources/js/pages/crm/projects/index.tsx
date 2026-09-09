import { Head } from '@inertiajs/react';
import { Building2, Download, ExternalLink, FileText, MapPin } from 'lucide-react';
import { useState } from 'react';
import { CrmProjectCard, WhatsAppIcon } from '@/components/crm/crm-project-card';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import CrmLayout from '@/layouts/crm/crm-layout';
import type { CrmProjectCard as ProjectCardData, CrmProjectDocument } from '@/types/crm-project';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Proyectos', href: '/crm/projects' }];

function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes <= 0) {
        return '';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
    }

    return `${size < 10 && unit > 0 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
}

function documentWhatsAppUrl(projectName: string, document: CrmProjectDocument): string {
    const text = `*${projectName}*\n${document.title}\n${document.share_url}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function CrmProjectsIndex({ projects: projectList }: { projects: ProjectCardData[] }) {
    const [mapsProject, setMapsProject] = useState<ProjectCardData | null>(null);
    const [docsProject, setDocsProject] = useState<ProjectCardData | null>(null);

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Proyectos" />

            {projectList.length === 0 ? (
                <CrmPage>
                    <CrmPageHeader
                        title="Proyectos"
                        description="Fichas para compartir ubicación, tour 360, plano y documentos."
                    />
                    <EmptyState
                        icon={Building2}
                        title="No hay proyectos activos"
                        description="Cuando se activen proyectos, aparecerán aquí para compartirlos con tus clientes."
                    />
                </CrmPage>
            ) : (
                <CrmPage>
                    <CrmPageHeader
                        title="Proyectos"
                        description="Fichas para compartir ubicación, tour 360, plano y documentos."
                    />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {projectList.map((project) => (
                            <CrmProjectCard
                                key={project.id}
                                project={project}
                                onOpenMap={setMapsProject}
                                onOpenDocuments={setDocsProject}
                            />
                        ))}
                    </div>
                </CrmPage>
            )}

            <Dialog open={mapsProject !== null} onOpenChange={(open) => !open && setMapsProject(null)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            {mapsProject?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Ubicación del proyecto en Google Maps.
                        </DialogDescription>
                    </DialogHeader>
                    {mapsProject?.maps_embed_url ? (
                        <iframe
                            title={`Mapa de ${mapsProject.name}`}
                            src={mapsProject.maps_embed_url}
                            className="h-[360px] w-full rounded-lg border-0 bg-muted"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">No hay mapa disponible para este proyecto.</p>
                    )}
                    {mapsProject?.maps_url ? (
                        <Button variant="outline" asChild>
                            <a href={mapsProject.maps_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="size-4" />
                                Abrir en Google Maps
                            </a>
                        </Button>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={docsProject !== null} onOpenChange={(open) => !open && setDocsProject(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="size-4" />
                            Documentos
                        </DialogTitle>
                        <DialogDescription>
                            {docsProject
                                ? `Archivos de ${docsProject.name} para ver, descargar o compartir.`
                                : 'Documentos del proyecto.'}
                        </DialogDescription>
                    </DialogHeader>
                    {docsProject && docsProject.documents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Este proyecto no tiene documentos.</p>
                    ) : (
                        <ul className="max-h-[360px] space-y-2 overflow-y-auto">
                            {docsProject?.documents.map((document) => (
                                <li
                                    key={document.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{document.title}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {document.file_name}
                                            {document.file_size
                                                ? ` · ${formatFileSize(document.file_size)}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button variant="outline" size="icon" className="size-8" asChild>
                                            <a
                                                href={document.download_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Descargar"
                                            >
                                                <Download className="size-3.5" />
                                                <span className="sr-only">Descargar</span>
                                            </a>
                                        </Button>
                                        <Button
                                            size="icon"
                                            className="size-8 bg-[#25D366] text-white hover:bg-[#1ebe5a]"
                                            asChild
                                        >
                                            <a
                                                href={documentWhatsAppUrl(docsProject.name, document)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Compartir por WhatsApp"
                                            >
                                                <WhatsAppIcon className="size-3.5" />
                                                <span className="sr-only">Compartir por WhatsApp</span>
                                            </a>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </DialogContent>
            </Dialog>
        </CrmLayout>
    );
}
