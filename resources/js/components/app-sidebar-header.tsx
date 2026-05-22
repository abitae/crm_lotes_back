import { Link } from '@inertiajs/react';
import {
    FileCheck,
    MapPin,
    Moon,
    Sun,
    UserCheck,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useAppearance } from '@/hooks/use-appearance';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType, NavItem } from '@/types';

const quickAccessItems: NavItem[] = [
    { title: 'Ticket de atencion', href: '/inmopro/attention-tickets', icon: FileCheck },
    { title: 'Pre-reservas', href: '/inmopro/lot-pre-reservations', icon: FileCheck },
    { title: 'Transferencias', href: '/inmopro/lot-transfer-confirmations', icon: FileCheck },
    { title: 'Vendedores', href: '/inmopro/advisors', icon: UserCheck },
    { title: 'Inventario de lotes', href: '/inmopro/lots', icon: MapPin },
];

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const toggleAppearance = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    return (
        <>
            <header className="sticky top-0 z-30 shrink-0 border-b border-sidebar-border/70 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
                <div className="flex min-h-16 items-center gap-3 transition-[min-height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-12">
                    <SidebarTrigger className="-ml-1" />
                    <div className="min-w-0 flex-1">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleAppearance}
                        className="ml-auto shrink-0 rounded-full px-3"
                        title={resolvedAppearance === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                    >
                        {resolvedAppearance === 'dark' ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                            {resolvedAppearance === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                        </span>
                    </Button>
                </div>

                <div className="hidden border-t border-sidebar-border/50 py-3 lg:block">
                    <div className="flex flex-wrap items-center gap-2">
                        {quickAccessItems.map((item) => {
                            const isActive = isCurrentUrl(item.href);

                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    prefetch
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                                        isActive
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200',
                                    )}
                                >
                                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
                                    <span>{item.title}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>
        </>
    );
}
