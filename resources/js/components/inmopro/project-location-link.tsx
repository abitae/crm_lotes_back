import { MapPin } from 'lucide-react';
import { projectLocationLinkLabel, type ProjectLocationFields } from '@/lib/project-location';
import { cn } from '@/lib/utils';

type ProjectLocationLinkProps = ProjectLocationFields & {
    className?: string;
    iconClassName?: string;
};

export function ProjectLocationLink({
    location,
    maps_url,
    location_label,
    className,
    iconClassName,
}: ProjectLocationLinkProps) {
    if (!maps_url) {
        if (!location) {
            return null;
        }

        return (
            <span className={cn('inline-flex items-center gap-1.5 text-sm text-slate-500', className)}>
                <MapPin className={cn('h-4 w-4 text-slate-400', iconClassName)} />
                {location}
            </span>
        );
    }

    return (
        <a
            href={maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-emerald-700',
                className,
            )}
        >
            <MapPin className={cn('h-4 w-4 text-slate-400', iconClassName)} />
            {projectLocationLinkLabel({ location, maps_url, location_label })}
        </a>
    );
}
