import { Link } from '@inertiajs/react';
import {
    FileCheck,
    MapPin,
    UserCheck,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
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

    return (
        <header className="sticky top-0 z-30 shrink-0 border-b border-sidebar-border/70 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
            <div className="flex min-h-16 items-center gap-2 transition-[min-height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-12">
                <SidebarTrigger className="-ml-1" />
                <div className="min-w-0 flex-1">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
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
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
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
    );
}
