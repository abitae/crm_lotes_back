import { Link } from '@inertiajs/react';
import {
    Building2,
    FileText,
    LandPlot,
    Map,
    MapPin,
    View,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import projects from '@/routes/crm/projects';
import type { CrmProjectCard as ProjectCardData } from '@/types/crm-project';

function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

function ActionButton({
    disabled,
    href,
    external = false,
    onClick,
    icon: Icon,
    label,
}: {
    disabled?: boolean;
    href?: string | null;
    external?: boolean;
    onClick?: () => void;
    icon: typeof MapPin;
    label: string;
}) {
    const className = cn(
        'h-9 w-full justify-start rounded-lg px-2.5 text-xs font-medium',
        disabled && 'opacity-40',
    );

    if (href && !disabled) {
        return (
            <Button variant="outline" size="sm" className={className} asChild>
                {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        <Icon className="size-3.5" />
                        {label}
                    </a>
                ) : (
                    <Link href={href}>
                        <Icon className="size-3.5" />
                        {label}
                    </Link>
                )}
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className={className}
            disabled={disabled}
            onClick={onClick}
        >
            <Icon className="size-3.5" />
            {label}
        </Button>
    );
}

export function projectWhatsAppUrl(project: ProjectCardData): string {
    const lines = [`*${project.name}*`, ''];
    lines.push(`${project.available_lots_count} lotes disponibles de ${project.lots_count}`);

    if (project.view_360_url) {
        lines.push(`Vista 360: ${project.view_360_url}`);
    }

    if (project.view_flat_url) {
        lines.push(`Vista plana: ${project.view_flat_url}`);
    }

    if (project.maps_url) {
        lines.push(`Ubicación: ${project.maps_url}`);
    }

    return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function CrmProjectCard({
    project,
    onOpenMap,
    onOpenDocuments,
}: {
    project: ProjectCardData;
    onOpenMap: (project: ProjectCardData) => void;
    onOpenDocuments: (project: ProjectCardData) => void;
}) {
    const hasMap = Boolean(project.maps_embed_url || project.maps_url);
    const hasDocuments = project.documents_count > 0;

    return (
        <Card className="gap-0 overflow-hidden py-0 shadow-sm transition-shadow hover:shadow-md">
            <Link href={projects.show(project.id)} className="block">
                {project.image_url ? (
                    <img
                        src={project.image_url}
                        alt={project.name}
                        className="h-40 w-full object-cover"
                    />
                ) : (
                    <div className="flex h-40 items-center justify-center bg-muted">
                        <Building2 className="size-10 text-muted-foreground" />
                    </div>
                )}
            </Link>
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div>
                    <Link
                        href={projects.show(project.id)}
                        className="line-clamp-2 text-base font-semibold leading-snug hover:underline"
                    >
                        {project.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {project.place_label ?? (project.maps_url ? 'Ubicación en el mapa' : 'Sin ubicación')}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {project.available_lots_count} disponibles de {project.lots_count} lotes
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <ActionButton
                        icon={View}
                        label="Vista 360"
                        href={project.view_360_url}
                        external
                        disabled={!project.view_360_url}
                    />
                    <ActionButton
                        icon={Map}
                        label="Vista plana"
                        href={project.view_flat_url}
                        disabled={!project.view_flat_url}
                    />
                    <ActionButton
                        icon={MapPin}
                        label="Ubicación"
                        disabled={!hasMap}
                        onClick={() => onOpenMap(project)}
                    />
                    <ActionButton
                        icon={FileText}
                        label="Documentos"
                        disabled={!hasDocuments}
                        onClick={() => onOpenDocuments(project)}
                    />
                    <Button variant="outline" size="sm" className="col-span-2 h-9 rounded-lg text-xs font-medium" asChild>
                        <Link href={projects.show(project.id)}>
                            <LandPlot className="size-3.5" />
                            Ver lotes
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        className="col-span-2 h-9 rounded-lg bg-[#25D366] text-xs font-medium text-white hover:bg-[#1ebe5a]"
                        asChild
                    >
                        <a href={projectWhatsAppUrl(project)} target="_blank" rel="noopener noreferrer">
                            <WhatsAppIcon className="size-3.5" />
                            Compartir por WhatsApp
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export { WhatsAppIcon };
