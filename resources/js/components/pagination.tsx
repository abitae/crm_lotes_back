import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

function decodePaginationLabel(label: string): string {
    return label.replace(/&laquo;/gi, '«').replace(/&raquo;/gi, '»').replace(/&amp;/g, '&');
}

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginationProps = {
    links: PaginationLink[];
    className?: string;
};

function normalizeLabel(raw: string): string {
    return raw
        .replace(/&laquo;/gi, '«')
        .replace(/&raquo;/gi, '»')
        .trim()
        .toLowerCase();
}

function paginationLinkContent(label: string): ReactNode {
    const key = label.trim();
    const norm = normalizeLabel(label);

    if (
        key === 'pagination.previous' ||
        norm === '« previous' ||
        norm.endsWith(' anterior') ||
        norm === '« anterior' ||
        norm === 'anterior'
    ) {
        return <ChevronLeft className="h-4 w-4" aria-hidden />;
    }

    if (
        key === 'pagination.next' ||
        norm === 'next »' ||
        norm.startsWith('siguiente') ||
        norm === 'siguiente »' ||
        norm === 'siguiente'
    ) {
        return <ChevronRight className="h-4 w-4" aria-hidden />;
    }

    return decodePaginationLabel(label);
}

/**
 * Muestra los enlaces de paginación de Laravel (array links del paginator).
 * Oculta el contenedor si solo hay una página (prev, 1, next sin otras opciones).
 */
export default function Pagination({ links, className = '' }: PaginationProps) {
    const canGoElsewhere = links.some((link) => link.url !== null && !link.active);

    if (!canGoElsewhere) {
        return null;
    }

    return (
        <nav
            role="navigation"
            aria-label="Paginación"
            className={`flex flex-wrap items-center justify-center gap-1 ${className}`}
        >
            {links.map((link, i) => {
                const content = paginationLinkContent(link.label);
                const a11yLabel = paginationAriaLabel(link.label);

                if (link.url === null) {
                    return (
                        <span
                            key={i}
                            aria-label={a11yLabel}
                            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium ${
                                link.active
                                    ? 'bg-slate-900 text-white'
                                    : 'cursor-default text-slate-400'
                            }`}
                        >
                            {content}
                        </span>
                    );
                }
                return (
                    <Link
                        key={i}
                        href={link.url}
                        preserveState
                        aria-label={a11yLabel}
                        aria-current={link.active ? 'page' : undefined}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${
                            link.active
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        {content}
                    </Link>
                );
            })}
        </nav>
    );
}

function paginationAriaLabel(label: string): string | undefined {
    const key = label.trim();
    const norm = normalizeLabel(label);

    if (
        key === 'pagination.previous' ||
        norm === '« previous' ||
        norm.endsWith(' anterior') ||
        norm === '« anterior' ||
        norm === 'anterior'
    ) {
        return 'Página anterior';
    }

    if (
        key === 'pagination.next' ||
        norm === 'next »' ||
        norm.startsWith('siguiente') ||
        norm === 'siguiente »' ||
        norm === 'siguiente'
    ) {
        return 'Página siguiente';
    }

    return `Página ${decodePaginationLabel(label)}`;
}
