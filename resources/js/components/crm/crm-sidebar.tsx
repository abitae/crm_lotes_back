import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Calendar,
    ChevronRight,
    FileCheck,
    LandPlot,
    LayoutGrid,
    LifeBuoy,
    MapPin,
    Megaphone,
    MessageSquare,
    Percent,
    Tags,
    Users,
    Workflow,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { CrmNavUser } from '@/components/crm/crm-nav-user';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import crm from '@/routes/crm';
import agenda from '@/routes/crm/agenda';
import attentionTickets from '@/routes/crm/attention-tickets';
import clients from '@/routes/crm/clients';
import commissions from '@/routes/crm/commissions';
import { mine as myLots } from '@/routes/crm/lots';
import pipeline from '@/routes/crm/pipeline';
import preReservations from '@/routes/crm/pre-reservations';
import projects from '@/routes/crm/projects';
import reminders from '@/routes/crm/reminders';
import type { NavItem } from '@/types';

type NavSection = {
    label: string;
    icon: NonNullable<NavItem['icon']>;
    items: NavItem[];
};

const principalSection: NavSection = {
    label: 'Principal',
    icon: LayoutGrid,
    items: [
        { title: 'Dashboard', href: crm.dashboard(), icon: LayoutGrid },
        { title: 'Clientes', href: clients.index(), icon: Users },
    ],
};

const inventorySection: NavSection = {
    label: 'Inventario',
    icon: MapPin,
    items: [
        { title: 'Proyectos', href: projects.index(), icon: MapPin },
        { title: 'Mis lotes', href: myLots(), icon: LandPlot },
    ],
};

const followUpSection: NavSection = {
    label: 'Seguimiento',
    icon: Bell,
    items: [
        { title: 'Pre-reservas', href: preReservations.index(), icon: FileCheck },
        { title: 'Tickets', href: attentionTickets.index(), icon: LifeBuoy },
        { title: 'Recordatorios', href: reminders.index(), icon: Bell },
        { title: 'Agenda', href: agenda.index(), icon: Calendar },
    ],
};

const moreSection: NavSection = {
    label: 'Más',
    icon: Tags,
    items: [
        { title: 'Estados y etiquetas', href: pipeline.index(), icon: Tags },
        { title: 'Comisiones', href: commissions.index(), icon: Percent },
    ],
};

const metaSection: NavSection = {
    label: 'Comunicación',
    icon: MessageSquare,
    items: [
        { title: 'Inbox', href: '/crm/inbox', icon: MessageSquare },
        { title: 'Automatizaciones', href: '/crm/automations', icon: Workflow },
        { title: 'Broadcasts', href: '/crm/broadcasts', icon: Megaphone },
    ],
};

function NavGroup({ section }: { section: NavSection }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { state } = useSidebar();
    const hasActiveItem = section.items.some((item) => isCurrentUrl(item.href));
    const [open, setOpen] = useState(hasActiveItem);
    const iconCollapsed = state === 'collapsed';

    useEffect(() => {
        if (hasActiveItem) {
            setOpen(true);
        }
    }, [hasActiveItem]);

    if (section.items.length === 0) {
        return null;
    }

    return (
        <Collapsible
            open={iconCollapsed ? true : open}
            onOpenChange={setOpen}
            className="group/collapsible"
        >
            <SidebarGroup className="px-2 py-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                tooltip={{ children: section.label }}
                                className="h-8 font-medium text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden"
                            >
                                <section.icon />
                                <span>{section.label}</span>
                                <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                </SidebarMenu>
                <CollapsibleContent>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {section.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl(item.href)}
                                        tooltip={{ children: item.title }}
                                        className="rounded-xl"
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon ? <item.icon /> : null}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

export function CrmSidebar() {
    const { meta, auth } = usePage<{ meta?: { connected?: boolean } }>().props;
    const firstName = auth.advisor?.name?.trim().split(/\s+/)[0];

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={crm.dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                {firstName ? (
                    <p className="px-2 pb-1 text-sm text-sidebar-foreground/75 group-data-[collapsible=icon]:hidden">
                        Hola,{' '}
                        <span className="font-semibold text-sidebar-foreground">{firstName}</span>
                    </p>
                ) : null}
            </SidebarHeader>

            <SidebarContent>
                <NavGroup section={principalSection} />
                {meta?.connected ? <NavGroup section={metaSection} /> : null}
                <NavGroup section={inventorySection} />
                <NavGroup section={followUpSection} />
                <NavGroup section={moreSection} />
            </SidebarContent>

            <SidebarFooter>
                <CrmNavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
